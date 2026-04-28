'use strict';

let allData = [];
let filteredData = [];

async function init() {
  try {
    const resp = await fetch('index.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    allData = data.data || [];
  } catch (e) {
    document.getElementById('tool-grid').innerHTML =
      `<div class="empty">failed to load index: ${esc(e.message)}</div>`;
    return;
  }
  populateFilters();
  render();
}

function render() {
  const query = document.getElementById('search').value.toLowerCase().trim();
  const formatFilter = document.getElementById('format-filter').value;
  const actionFilter = document.getElementById('action-filter').value;

  filteredData = allData.filter(d => {
    if (d.deprecated) return false;
    if (formatFilter && d.format !== formatFilter) return false;
    if (actionFilter && d.post_download_action !== actionFilter) return false;
    if (!query) return true;
    return (
      d.id.includes(query) ||
      (d.description || '').toLowerCase().includes(query) ||
      (d.format || '').toLowerCase().includes(query) ||
      (d.license || '').toLowerCase().includes(query)
    );
  });

  filteredData.sort((a, b) => a.id.localeCompare(b.id));

  const countEl = document.getElementById('results-count');
  countEl.textContent = `${filteredData.length} source${filteredData.length !== 1 ? 's' : ''}`;

  const grid = document.getElementById('tool-grid');
  if (filteredData.length === 0) {
    grid.innerHTML = '<div class="empty">no data sources match.</div>';
    return;
  }

  grid.innerHTML = filteredData.map(dataCard).join('');

  grid.querySelectorAll('.tool-card').forEach((card, i) => {
    card.addEventListener('click', () => openModal(filteredData[i]));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') openModal(filteredData[i]);
    });
  });
}

function dataCard(d) {
  const fmt = d.format ? `<span class="chip">${esc(d.format)}</span>` : '';
  const sz  = d.size_bytes ? `<span class="chip">${esc(formatSize(d.size_bytes))}</span>` : '';

  return `<div class="tool-card" tabindex="0">
    <div class="card-top">
      <span class="card-name">${esc(d.id)}</span>
      <span class="card-ver">${esc(d.version)}</span>
    </div>
    <div class="card-desc">${esc(d.description || '')}</div>
    <div class="card-io">${fmt}${sz}</div>
  </div>`;
}

function openModal(d) {
  document.getElementById('modal-title').textContent = d.id;

  const meta = [d.version, d.format, formatSize(d.size_bytes), d.license].filter(Boolean).join(' · ');
  document.getElementById('modal-meta').textContent = meta;

  const fetchCmd = `bv data fetch ${d.id}@${d.version}`;
  document.getElementById('modal-bv-add').textContent = fetchCmd;

  const copyBtn = document.getElementById('copy-btn');
  copyBtn.innerHTML = '<i class="fi fi-rr-copy"></i>';
  copyBtn.classList.remove('copied');
  copyBtn.onclick = () => copyToClipboard(fetchCmd, copyBtn);

  const descEl = document.getElementById('modal-desc');
  const descSec = document.getElementById('modal-desc-section');
  if (d.description) {
    descEl.textContent = d.description;
    descSec.style.display = '';
  } else {
    descSec.style.display = 'none';
  }

  document.getElementById('modal-sources').innerHTML =
    (d.source_urls || []).map(u =>
      `<div class="io-row"><a href="${esc(u)}" target="_blank" rel="noopener" style="font-size:13px; word-break:break-all;">${esc(u)}</a></div>`
    ).join('') || '<div class="io-empty">none listed</div>';

  document.getElementById('modal-versions').innerHTML =
    [...(d.versions || [d.version])].reverse()
      .map(v => `<span class="vpill">${esc(v)}</span>`).join('');

  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function copyToClipboard(text, btn) {
  const onSuccess = () => {
    btn.innerHTML = '<i class="fi fi-rr-check"></i>';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = '<i class="fi fi-rr-copy"></i>';
      btn.classList.remove('copied');
    }, 1800);
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => fallbackCopy(text, onSuccess));
  } else {
    fallbackCopy(text, onSuccess);
  }
}

function fallbackCopy(text, onSuccess) {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand('copy');
    onSuccess();
  } catch {}
  document.body.removeChild(el);
}

function populateFilters() {
  const formats = new Set();
  const actions = new Set();
  allData.forEach(d => {
    if (d.format) formats.add(d.format);
    if (d.post_download_action) actions.add(d.post_download_action);
  });

  const fSel = document.getElementById('format-filter');
  [...formats].sort().forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    fSel.appendChild(opt);
  });

  const aSel = document.getElementById('action-filter');
  [...actions].sort().forEach(a => {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a;
    aSel.appendChild(opt);
  });
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
  const rounded = n >= 100 ? Math.round(n) : n >= 10 ? n.toFixed(0) : n.toFixed(1);
  return `${rounded} ${units[i]}`;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.getElementById('search').addEventListener('input', render);
document.getElementById('format-filter').addEventListener('change', render);
document.getElementById('action-filter').addEventListener('change', render);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

init();
