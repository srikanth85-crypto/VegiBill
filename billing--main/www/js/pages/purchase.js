// ═══════════════════════════════════════════════════
//  VegiBill TN — pages/purchase.js
// ═══════════════════════════════════════════════════

let _purFilter = 'all';
let _purSearch = '';
let _purDate = '';
let _bulkPurSelected = new Set();

function renderPurchase(container) {
  setHeaderTitle('Purchases', 'All purchase records');
  _bulkPurSelected.clear();

  const purchases = DB.getPurchases();
  const filtered = _applyPurFilters(purchases);
  const totalAmt = filtered.reduce((s, b) => s + Number(b.grandTotal || 0), 0);

  container.innerHTML = `
    <div class="filter-bar" style="padding-top:10px;">
      ${['all','today','week','month','year'].map(f => `
        <button class="filter-chip ${_purFilter===f?'active':''}"
          onclick="_purFilter='${f}';_purDate='';renderPurchase(document.getElementById('page-container'))">${_purChipLabel(f)}</button>`).join('')}
      <input type="date" id="pur-date-filter" value="${_purDate}"
        onchange="_purDate=this.value;_purFilter='custom';renderPurchase(document.getElementById('page-container'))"
        style="background:var(--bg2);border:1px solid var(--border2);border-radius:20px;padding:6px 12px;font-size:12px;color:var(--text);width:auto;" />
    </div>

    <div class="search-wrap">
      <div class="search-input">
        <input type="text" placeholder="Search purchase no, supplier..." value="${_purSearch}"
          oninput="_purSearch=this.value;renderPurchase(document.getElementById('page-container'))" />
      </div>
    </div>

    <div style="display:flex;gap:10px;padding:0 12px 10px;">
      <div class="stat-card flex-1" style="padding:10px 12px;">
        <div class="stat-label">Purchases</div>
        <div class="stat-value text-amber" style="font-size:18px;">${filtered.length}</div>
      </div>
      <div class="stat-card flex-1" style="padding:10px 12px;">
        <div class="stat-label">Total Amount</div>
        <div class="stat-value text-amber" style="font-size:18px;">${fmtCurrency(totalAmt)}</div>
      </div>
    </div>

    <div style="padding:0 12px 8px;display:flex;gap:8px;align-items:center;">
      <button class="btn btn-secondary btn-sm" onclick="_toggleAllPur()">☑ Select All</button>
      <button class="btn btn-blue btn-sm" onclick="_bulkPrintPur()">🖨 Bulk Print</button>
      <button class="btn btn-amber btn-sm" style="margin-left:auto;" onclick="pushPage('add-purchase')">+ New Purchase</button>
    </div>

    <div id="pur-list" style="padding:0 12px;">
      ${filtered.length === 0 ? `<div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">No purchases found</div></div>` : ''}
      ${_renderGroupedPurchases(filtered)}
    </div>`;
}

function _renderGroupedPurchases(bills) {
  const groups = groupByDate(bills);
  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  return dates.map(date => {
    const dayTotal = groups[date].reduce((s, b) => s + Number(b.grandTotal || 0), 0);
    return `
      <div class="date-group-header">${fmtDateKey(date)} · ${fmtCurrency(dayTotal)}</div>
      ${groups[date].map(b => `
        <div class="list-item">
          <input type="checkbox" style="width:18px;height:18px;accent-color:var(--amber);flex-shrink:0;"
            ${_bulkPurSelected.has(b.id)?'checked':''}
            onchange="_togglePurSelect('${b.id}',this.checked)" />
          <div class="list-avatar" style="background:var(--amber-bg);cursor:pointer;" onclick="pushPage('purchase-detail',{id:'${b.id}'})">📦</div>
          <div class="list-info" style="cursor:pointer;" onclick="pushPage('purchase-detail',{id:'${b.id}'})">
            <div class="list-title">${esc(b.id)}</div>
            <div class="list-sub">${b.partyName ? esc(b.partyName)+' · ' : ''}${b.items?.length||0} items · ${esc(b.paymentMethod||'Cash')}</div>
          </div>
          <div class="list-right">
            <div class="list-amount text-amber">${fmtCurrency(b.grandTotal)}</div>
            <div class="list-date">${fmtTime(b.createdAt)}</div>
            <button class="btn btn-secondary btn-sm" style="margin-top:4px;" onclick="printSingleBill('${b.id}','purchase')">🖨</button>
          </div>
        </div>`).join('')}`;
  }).join('');
}

function _applyPurFilters(purchases) {
  let arr = _purDate ? filterByCustomDate(purchases, _purDate) : filterByPeriod(purchases, _purFilter);
  if (_purSearch) {
    const q = _purSearch.toLowerCase();
    arr = arr.filter(b => b.id?.toLowerCase().includes(q) || b.partyName?.toLowerCase().includes(q) || b.mobile?.includes(q));
  }
  return arr;
}
function _purChipLabel(f) { return { all:'All', today:'Today', week:'This Week', month:'This Month', year:'This Year' }[f] || f; }
function _togglePurSelect(id, checked) { if (checked) _bulkPurSelected.add(id); else _bulkPurSelected.delete(id); }
function _toggleAllPur() {
  const purs = _applyPurFilters(DB.getPurchases());
  if (_bulkPurSelected.size === purs.length) _bulkPurSelected.clear();
  else purs.forEach(b => _bulkPurSelected.add(b.id));
  renderPurchase(document.getElementById('page-container'));
}
function _bulkPrintPur() {
  if (_bulkPurSelected.size === 0) { showToast('Select bills first!'); return; }
  bulkPrintBills([..._bulkPurSelected], 'purchase');
}

// ── PURCHASE DETAIL ────────────────────────────────────
function renderPurchaseDetail(container, params) {
  const bill = DB.getPurchaseById(params.id);
  if (!bill) { container.innerHTML = '<div class="page empty-state"><div class="empty-icon">❌</div><div class="empty-title">Not found</div></div>'; return; }

  setHeaderTitle(bill.id, fmtDate(bill.createdAt));
  document.getElementById('header-actions').innerHTML = `
    <button class="btn btn-secondary btn-sm" onclick="shareBill(buildShareText(DB.getPurchaseById('${bill.id}'),'purchase'))">📤 Share</button>
    <button class="btn btn-primary btn-sm" onclick="printSingleBill('${bill.id}','purchase')">🖨️ Print</button>`;

  const sungam = Number(bill.sungam || 0);
  const sub = Number(bill.subTotal || 0);
  const grand = Number(bill.grandTotal || 0);
  const paid = Number(bill.amountPaid || grand);
  const balance = paid - grand;

  container.innerHTML = `
    <div class="card" style="border-radius:0;border-left:none;border-right:none;margin-bottom:0;">
      <div class="bill-meta-row"><span>Purchase No</span><span class="bill-meta-val font-bold">${esc(bill.id)}</span></div>
      <div class="bill-meta-row"><span>Date</span><span class="bill-meta-val">${fmtDate(bill.createdAt)} ${fmtTime(bill.createdAt)}</span></div>
      ${bill.partyName ? `<div class="bill-meta-row"><span>Supplier</span><span class="bill-meta-val">${esc(bill.partyName)}</span></div>` : ''}
      ${bill.mobile ? `<div class="bill-meta-row"><span>Mobile</span><span class="bill-meta-val">${esc(bill.mobile)}</span></div>` : ''}
      <div class="bill-meta-row"><span>Payment</span><span class="bill-meta-val"><span class="badge badge-amber">${esc(bill.paymentMethod||'Cash')}</span></span></div>
    </div>

    <div style="padding:12px;">
      <div class="bill-view-row header">
        <span>Item</span><span>Bags</span><span>Qty</span><span style="text-align:right;">Amount</span>
      </div>
      ${(bill.items||[]).map(item => `
        <div class="bill-view-row">
          <div>
            <div style="font-weight:700;font-size:13px;">${esc(item.itemName)}</div>
            <div style="font-size:11px;color:var(--text3);">${fmtNum(item.quantity)} ${esc(item.unit)} × ₹${fmtNum(item.pricePerUnit)}</div>
          </div>
          <span style="font-size:13px;color:var(--text2);">${esc(item.bags||'-')}</span>
          <span style="font-size:13px;">${fmtNum(item.quantity)} ${esc(item.unit)}</span>
          <span style="text-align:right;font-weight:700;color:var(--amber);">₹${fmtNum(item.totalPrice)}</span>
        </div>`).join('')}

      <div class="summary-box">
        <div class="summary-row"><span>Sub Total</span><span>${fmtCurrency(sub)}</span></div>
        ${sungam > 0 ? `<div class="summary-row"><span>Sungam</span><span class="text-amber">${fmtCurrency(sungam)}</span></div>` : ''}
        <div class="summary-row total"><span>Grand Total</span><span>${fmtCurrency(grand)}</span></div>
        <div class="summary-row"><span>Amount Paid</span><span>${fmtCurrency(paid)}</span></div>
        <div class="summary-row" style="font-weight:700;color:${balance>=0?'var(--green)':'var(--red)'};">
          <span>${balance>=0?'Balance Return':'Balance Due'}</span>
          <span>${fmtCurrency(Math.abs(balance))}</span>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
        <button class="btn btn-primary flex-1" onclick="printSingleBill('${bill.id}','purchase')">🖨️ A4 Invoice</button>
        <button class="btn btn-secondary flex-1" onclick="printThermalBill('${bill.id}','purchase')">🧾 Thermal</button>
        <button class="btn btn-secondary flex-1" onclick="shareBill(buildShareText(DB.getPurchaseById('${bill.id}'),'purchase'))">📤 Share</button>
        <button class="btn btn-amber flex-1" onclick="pushPage('add-purchase',{editId:'${bill.id}'})">✏️ Edit</button>
        <button class="btn btn-danger" style="width:40px;padding:0;" onclick="confirmModal('Delete ${esc(bill.id)}?',function(){DB.deletePurchase('${bill.id}');showToast('Deleted','success');navigateTo('purchase');})">🗑️</button>
      </div>
    </div>`;
}
