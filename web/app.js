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
      `<p class="empty">Failed to load index: ${e.message}</p>`;
    return;
  }
  render();
  populateTypeFilters();
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
      if (!types.some(ty => ty.startsWith(typeFilter))) return false;
    }
    if (!query) return true;
    return (
      t.id.includes(query) ||
      (t.description || '').toLowerCase().includes(query) ||
      (t.input_types || []).some(ty => ty.includes(query)) ||
      (t.output_types || []).some(ty => ty.includes(query))
    );
  });

  filteredTools.sort((a, b) => {
    const tierOrder = { core: 0, community: 1, experimental: 2 };
    const ta = tierOrder[a.tier] ?? 2;
    const tb = tierOrder[b.tier] ?? 2;
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });

  const count = document.getElementById('results-count');
  count.textContent = `${filteredTools.length} tool${filteredTools.length !== 1 ? 's' : ''}`;

  const grid = document.getElementById('tool-grid');
  if (filteredTools.length === 0) {
    grid.innerHTML = '<p class="empty">No tools match your filters.</p>';
    return;
  }
  grid.innerHTML = filteredTools.map(toolCard).join('');
  grid.querySelectorAll('.tool-card').forEach((card, i) => {
    card.addEventListener('click', () => openModal(filteredTools[i]));
  });
}

function toolCard(t) {
  const inputs = (t.input_types || []).map(ty => `<span class="chip input">${ty}</span>`).join('');
  const outputs = (t.output_types || []).map(ty => `<span class="chip output">${ty}</span>`).join('');
  return `
    <div class="tool-card">
      <div class="tool-card-header">
        <span class="tool-name">${esc(t.id)}</span>
        <span class="tool-version">${esc(t.version)}</span>
        <span class="tier-badge tier-${t.tier}">${t.tier}</span>
      </div>
      <p class="tool-desc">${esc(t.description || '')}</p>
      <div class="io-chips">${inputs}${outputs}</div>
    </div>`;
}

function openModal(t) {
  const m = document.getElementById('modal');
  document.getElementById('modal-title').textContent = t.id;

  const maintainers = (t.maintainers || [])
    .map(h => {
      const login = h.replace('github:', '');
      return `<a href="https://github.com/${login}" target="_blank">@${login}</a>`;
    }).join(', ') || 'none listed';

  document.getElementById('modal-meta').innerHTML =
    `${esc(t.version)} &nbsp;|&nbsp; ${t.tier} &nbsp;|&nbsp; ${esc(t.license || 'unknown license')} &nbsp;|&nbsp; maintainers: ${maintainers}`;

  document.getElementById('modal-desc').textContent = t.description || '';

  document.getElementById('modal-homepage').innerHTML =
    t.homepage ? `<a href="${esc(t.homepage)}" target="_blank">${esc(t.homepage)}</a>` : 'n/a';

  const inputRows = (t.input_types || []).map((ty, i) => `<tr><td class="type-cell">${esc(ty)}</td></tr>`).join('');
  document.getElementById('modal-inputs').innerHTML =
    inputRows || '<tr><td style="color:var(--text-dim)">none declared</td></tr>';

  const outputRows = (t.output_types || []).map((ty, i) => `<tr><td class="type-cell">${esc(ty)}</td></tr>`).join('');
  document.getElementById('modal-outputs').innerHTML =
    outputRows || '<tr><td style="color:var(--text-dim)">none declared</td></tr>';

  document.getElementById('modal-versions').innerHTML =
    (t.versions || [t.version]).slice().reverse()
      .map(v => `<span class="version-tag">${esc(v)}</span>`).join('');

  m.classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function populateTypeFilters() {
  const types = new Set();
  allTools.forEach(t => {
    (t.input_types || []).forEach(ty => types.add(ty.split('[')[0]));
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
  return String(s)
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
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

init();
