'use strict';

let allTools = [];
let filteredTools = [];

async function init() {
  try {
    const resp = await fetch('index.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    allTools = data.tools || [];
  } catch (e) {
    document.getElementById('tool-grid').innerHTML =
      `<div class="empty">failed to load index: ${esc(e.message)}</div>`;
    return;
  }
  populateTypeFilter();
  render();
}

function render() {
  const query = document.getElementById('search').value.toLowerCase().trim();
  const tierFilter = document.getElementById('tier-filter').value;
  const typeFilter = document.getElementById('type-filter').value;

  filteredTools = allTools.filter(t => {
    if (t.deprecated) return false;
    if (tierFilter !== 'all' && t.tier !== tierFilter) return false;
    if (typeFilter) {
      const types = [...(t.input_types || []), ...(t.output_types || [])];
      if (!types.some(ty => ty.split('[')[0] === typeFilter)) return false;
    }
    if (!query) return true;
    return (
      t.id.includes(query) ||
      (t.description || '').toLowerCase().includes(query) ||
      (t.input_types  || []).some(ty => ty.includes(query)) ||
      (t.output_types || []).some(ty => ty.includes(query))
    );
  });

  filteredTools.sort((a, b) => {
    const order = { core: 0, community: 1, experimental: 2 };
    const diff = (order[a.tier] ?? 2) - (order[b.tier] ?? 2);
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });

  const countEl = document.getElementById('results-count');
  countEl.textContent = `${filteredTools.length} tool${filteredTools.length !== 1 ? 's' : ''}`;

  const grid = document.getElementById('tool-grid');
  if (filteredTools.length === 0) {
    grid.innerHTML = '<div class="empty">no tools match.</div>';
    return;
  }

  grid.innerHTML = filteredTools.map((t, i) => toolCard(t, i)).join('');

  grid.querySelectorAll('.tool-card').forEach((card, i) => {
    card.addEventListener('click', () => openModal(filteredTools[i]));
  });
}

function toolCard(t) {
  const inputs  = (t.input_types  || []).map(ty => `<span class="chip">${esc(ty)}</span>`).join('');
  const outputs = (t.output_types || []).map(ty => `<span class="chip">${esc(ty)}</span>`).join('');
  const arrow   = inputs && outputs ? `<span class="chip chip-arrow">&#8594;</span>` : '';

  return `<div class="tool-card" tabindex="0">
    <div class="card-top">
      <span class="card-name">${esc(t.id)}</span>
      <span class="card-ver">${esc(t.version)}</span>
      <span class="tier-badge">${esc(t.tier)}</span>
    </div>
    <div class="card-desc">${esc(t.description || '')}</div>
    <div class="card-io">${inputs}${arrow}${outputs}</div>
  </div>`;
}

function openModal(t) {
  document.getElementById('modal-title').textContent = t.id;

  const meta = [t.version, t.tier, t.license].filter(Boolean).join(' · ');
  document.getElementById('modal-meta').textContent = meta;

  document.getElementById('modal-desc').textContent = t.description || '';

  const homeSec = document.getElementById('modal-homepage-section');
  const homeEl  = document.getElementById('modal-homepage');
  if (t.homepage) {
    homeEl.innerHTML = `<a href="${esc(t.homepage)}" target="_blank" rel="noopener">${esc(t.homepage)}</a>`;
    homeSec.style.display = '';
  } else {
    homeSec.style.display = 'none';
  }

  document.getElementById('modal-inputs').innerHTML =
    (t.input_types || []).map(ty =>
      `<div class="io-row"><span class="io-type">${esc(ty)}</span></div>`
    ).join('') || '<div class="io-row io-card">none declared</div>';

  document.getElementById('modal-outputs').innerHTML =
    (t.output_types || []).map(ty =>
      `<div class="io-row"><span class="io-type">${esc(ty)}</span></div>`
    ).join('') || '<div class="io-row io-card">none declared</div>';

  document.getElementById('modal-maintainers').innerHTML =
    (t.maintainers || []).map(h => {
      const login = h.replace('github:', '');
      return `<div class="io-row"><a href="https://github.com/${esc(login)}" target="_blank" rel="noopener">@${esc(login)}</a></div>`;
    }).join('') || '<div class="io-row io-card">none listed</div>';

  document.getElementById('modal-versions').innerHTML =
    [...(t.versions || [t.version])].reverse()
      .map(v => `<span class="vpill">${esc(v)}</span>`).join('');

  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function populateTypeFilter() {
  const types = new Set();
  allTools.forEach(t => {
    (t.input_types  || []).forEach(ty => types.add(ty.split('[')[0]));
    (t.output_types || []).forEach(ty => types.add(ty.split('[')[0]));
  });
  const sel = document.getElementById('type-filter');
  [...types].sort().forEach(ty => {
    const opt = document.createElement('option');
    opt.value = ty;
    opt.textContent = ty;
    sel.appendChild(opt);
  });
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.getElementById('search').addEventListener('input', render);
document.getElementById('tier-filter').addEventListener('change', render);
document.getElementById('type-filter').addEventListener('change', render);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
document.querySelectorAll('.tool-card').forEach(card => {
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') card.click();
  });
});

init();
