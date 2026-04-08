// ═══════════════════════════════════════════════════
//  VegiBill TN — utils.js
// ═══════════════════════════════════════════════════

// ── ESCAPE HTML ──────────────────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── CURRENCY ─────────────────────────────────────────
function fmtCurrency(n) {
  if (isNaN(n) || n === '' || n === null) return '₹0.00';
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNum(n) { return Number(n || 0).toFixed(2); }

// ── DATE ─────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function fmtDateTime(iso) { return fmtDate(iso) + ' ' + fmtTime(iso); }
function todayISO() { return new Date().toISOString().split('T')[0]; }
function toDateKey(iso) { return (iso || '').split('T')[0]; } // "2025-07-10"
function fmtDateKey(key) {
  if (!key) return '';
  const [y, m, d] = key.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(m,10)-1]} ${y}`;
}

// ── MODAL ────────────────────────────────────────────
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-box').classList.add('hidden');
}

// ── TOAST ────────────────────────────────────────────
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ── FILTER BY PERIOD ─────────────────────────────────
function filterByPeriod(records, period, dateField='createdAt') {
  const now = new Date();
  return records.filter(r => {
    const d = new Date(r[dateField]);
    switch(period) {
      case 'today':  return d.toDateString() === now.toDateString();
      case 'week':   return (now - d) < 7 * 86400000;
      case 'month':  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      case 'year':   return d.getFullYear() === now.getFullYear();
      default: return true;
    }
  });
}
function filterByCustomDate(records, dateStr, dateField='createdAt') {
  if (!dateStr) return records;
  return records.filter(r => toDateKey(r[dateField]) === dateStr);
}

// ── TOAST ─────────────────────────────────────────────
let _toastTimer;
function showToast(msg, duration=2200) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.add('hidden'), duration);
}

// ── MODAL ─────────────────────────────────────────────
function openModal(html) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-box').classList.remove('hidden');
  document.getElementById('modal-box').innerHTML = html;
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-box').classList.add('hidden');
  document.getElementById('modal-box').innerHTML = '';
}

// ── CONFIRM ───────────────────────────────────────────
function confirmModal(msg, onYes) {
  openModal(`
    <div class="modal-title">${msg}</div>
    <div style="display:flex;gap:10px;margin-top:8px;">
      <button class="btn btn-secondary flex-1" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger flex-1" onclick="closeModal();(${onYes.toString()})()">Delete</button>
    </div>
  `);
}

// ── GROUP BY DATE ─────────────────────────────────────
function groupByDate(records, dateField='createdAt') {
  const groups = {};
  records.forEach(r => {
    const key = toDateKey(r[dateField]);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return groups; // { "2025-07-10": [...], ... }
}

// ── TOTALS ────────────────────────────────────────────
function calcBillTotal(items) {
  return items.reduce((s, i) => s + (Number(i.totalPrice) || 0), 0);
}

// ── SHARE (Web Share API) ─────────────────────────────
function shareBill(textContent) {
  if (navigator.share) {
    navigator.share({ title: 'VegiBill TN', text: textContent }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(textContent).then(() => showToast('Copied to clipboard!')).catch(() => showToast('Share not supported'));
  }
}

// ── SANITIZE ──────────────────────────────────────────
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
