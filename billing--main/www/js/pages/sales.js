// ═══════════════════════════════════════════════════
//  VegiBill TN — pages/sales.js
// ═══════════════════════════════════════════════════

let _salesFilter = 'all';
let _salesSearch = '';
let _salesDate = '';
let _bulkSelected = new Set();

// ── SALES LIST ────────────────────────────────────────
function renderSales(container) {
  setHeaderTitle('Sales', 'All sale bills');
  _bulkSelected.clear();

  const sales = DB.getSales();
  const filtered = _applyFilters(sales);
  const totalAmt = filtered.reduce((s, b) => s + Number(b.grandTotal || 0), 0);

  container.innerHTML = `
    <!-- FILTER BAR -->
    <div class="filter-bar" style="padding-top:10px;">
      ${['all','today','week','month','year'].map(f => `
        <button class="filter-chip ${_salesFilter===f?'active':''}"
          onclick="_salesFilter='${f}';_salesDate='';renderSales(document.getElementById('page-container'))">${_chipLabel(f)}</button>`).join('')}
      <input type="date" id="sales-date-filter" value="${_salesDate}"
        onchange="_salesDate=this.value;_salesFilter='custom';renderSales(document.getElementById('page-container'))"
        style="background:var(--bg2);border:1px solid var(--border2);border-radius:20px;padding:6px 12px;font-size:12px;color:var(--text);width:auto;" />
    </div>

    <!-- SEARCH -->
    <div class="search-wrap">
      <div class="search-input">
        <input type="text" placeholder="Search bill no, customer, mobile..." value="${_salesSearch}"
          oninput="_salesSearch=this.value;renderSales(document.getElementById('page-container'))" />
      </div>
    </div>

    <!-- SUMMARY ROW -->
    <div style="display:flex;gap:10px;padding:0 12px 10px;">
      <div class="stat-card flex-1" style="padding:10px 12px;">
        <div class="stat-label">Bills</div>
        <div class="stat-value text-green" style="font-size:18px;">${filtered.length}</div>
      </div>
      <div class="stat-card flex-1" style="padding:10px 12px;">
        <div class="stat-label">Revenue</div>
        <div class="stat-value text-green" style="font-size:18px;">${fmtCurrency(totalAmt)}</div>
      </div>
    </div>

    <!-- BULK ACTIONS -->
    <div style="padding:0 12px 8px;display:flex;gap:8px;align-items:center;">
      <button class="btn btn-secondary btn-sm" onclick="_toggleAllSales()">☑ Select All</button>
      <button class="btn btn-blue btn-sm" onclick="_bulkPrint()">🖨 Bulk Print</button>
      <button class="btn btn-primary btn-sm" style="margin-left:auto;" onclick="pushPage('add-sale')">+ New Sale</button>
    </div>

    <!-- LIST -->
    <div id="sales-list" style="padding:0 12px;">
      ${filtered.length === 0 ? `<div class="empty-state"><div class="empty-icon">🧾</div><div class="empty-title">No bills found</div><div class="empty-sub">Try a different filter</div></div>` : ''}
      ${_renderGroupedSales(filtered)}
    </div>`;
}

function _renderGroupedSales(bills) {
  const groups = groupByDate(bills);
  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  return dates.map(date => {
    const dayTotal = groups[date].reduce((s, b) => s + Number(b.grandTotal || 0), 0);
    return `
      <div class="date-group-header">${fmtDateKey(date)} · ${fmtCurrency(dayTotal)}</div>
      ${groups[date].map(b => `
        <div class="list-item" style="position:relative;">
          <input type="checkbox" style="width:18px;height:18px;accent-color:var(--green);flex-shrink:0;"
            ${_bulkSelected.has(b.id)?'checked':''}
            onchange="_toggleBillSelect('${b.id}',this.checked)" />
          <div class="list-avatar" style="background:var(--green-bg);cursor:pointer;" onclick="pushPage('sale-detail',{id:'${b.id}'})">🧾</div>
          <div class="list-info" style="cursor:pointer;" onclick="pushPage('sale-detail',{id:'${b.id}'})">
            <div class="list-title">${b.partyName ? `<strong>${esc(b.partyName)}</strong>` : esc(b.id)}</div>
            <div class="list-sub">${b.partyName ? `Invoice: ${esc(b.id)} · ` : ''}${b.items?.length||0} items · ${esc(b.paymentMethod||'Cash')}</div>
          </div>
          <div class="list-right">
            <div class="list-amount text-green">${fmtCurrency(b.grandTotal)}</div>
            <div class="list-date">${fmtTime(b.createdAt)}</div>
            <button class="btn btn-secondary btn-sm" style="margin-top:4px;" onclick="printSingleBill('${b.id}','sale')">🖨</button>
          </div>
        </div>`).join('')}
    `;
  }).join('');
}

function _applyFilters(sales) {
  let arr = _salesDate ? filterByCustomDate(sales, _salesDate) : filterByPeriod(sales, _salesFilter);
  if (_salesSearch) {
    const q = _salesSearch.toLowerCase();
    arr = arr.filter(b =>
      b.id?.toLowerCase().includes(q) ||
      b.partyName?.toLowerCase().includes(q) ||
      b.mobile?.includes(q) ||
      toDateKey(b.createdAt)?.includes(q)
    );
  }
  return arr;
}

function _chipLabel(f) {
  return { all:'All', today:'Today', week:'This Week', month:'This Month', year:'This Year' }[f] || f;
}

function _toggleBillSelect(id, checked) {
  if (checked) _bulkSelected.add(id); else _bulkSelected.delete(id);
}
function _toggleAllSales() {
  const sales = _applyFilters(DB.getSales());
  if (_bulkSelected.size === sales.length) { _bulkSelected.clear(); }
  else { sales.forEach(b => _bulkSelected.add(b.id)); }
  renderSales(document.getElementById('page-container'));
}
function _bulkPrint() {
  if (_bulkSelected.size === 0) { showToast('Select bills first!'); return; }
  bulkPrintBills([..._bulkSelected], 'sale');
}

// ── SALE DETAIL ───────────────────────────────────────
function renderSaleDetail(container, params) {
  const bill = DB.getSaleById(params.id);
  if (!bill) { container.innerHTML = '<div class="page"><div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Bill not found</div></div></div>'; return; }

  setHeaderTitle(bill.id, fmtDate(bill.createdAt));

  // Header actions
  document.getElementById('header-actions').innerHTML = `
    <button class="btn btn-secondary btn-sm" onclick="shareBill(buildShareText(DB.getSaleById('${bill.id}'),'sale'))">📤 Share</button>
    <button class="btn btn-primary btn-sm" onclick="printSingleBill('${bill.id}','sale')">🖨️ Print</button>`;

  const sungam = Number(bill.sungam || 0);
  const sub = Number(bill.subTotal || 0);
  const grand = Number(bill.grandTotal || 0);
  const paid = Number(bill.amountPaid || grand);
  const balance = paid - grand;

  container.innerHTML = `
    <!-- BILL HEADER INFO -->
    <div class="card" style="border-radius:0;border-left:none;border-right:none;margin-bottom:0;">
      ${bill.partyName ? `<div class="bill-meta-row"><span>Customer</span><span class="bill-meta-val font-bold">${esc(bill.partyName)}</span></div>` : ''}
      <div class="bill-meta-row"><span>Bill No</span><span class="bill-meta-val">${esc(bill.id)}</span></div>
      <div class="bill-meta-row"><span>Date</span><span class="bill-meta-val">${fmtDate(bill.createdAt)} ${fmtTime(bill.createdAt)}</span></div>
      ${bill.mobile ? `<div class="bill-meta-row"><span>Mobile</span><span class="bill-meta-val">${esc(bill.mobile)}</span></div>` : ''}
      <div class="bill-meta-row"><span>Payment</span><span class="bill-meta-val"><span class="badge badge-green">${esc(bill.paymentMethod||'Cash')}</span></span></div>
    </div>

    <!-- ITEMS TABLE -->
    <div style="padding:12px;">
      <div class="bill-view-row header">
        <span>Item / பொருள்</span><span>Bags</span><span>Qty</span><span style="text-align:right;">Amount</span>
      </div>
      ${(bill.items||[]).map(item => `
        <div class="bill-view-row">
          <div>
            <div style="font-weight:700;font-size:13px;">${esc(item.itemName)}</div>
            <div style="font-size:11px;color:var(--text3);">${fmtNum(item.quantity)} ${esc(item.unit)} × ₹${fmtNum(item.pricePerUnit)}</div>
          </div>
          <span style="color:var(--text2);font-size:13px;">${esc(item.bags||'-')}</span>
          <span style="font-size:13px;">${fmtNum(item.quantity)} ${esc(item.unit)}</span>
          <span style="text-align:right;font-weight:700;color:var(--green);">₹${fmtNum(item.totalPrice)}</span>
        </div>`).join('')}

      <!-- TOTALS -->
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

      <!-- ACTIONS -->
      <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
        <button class="btn btn-primary flex-1" onclick="printSingleBill('${bill.id}','sale')">🖨️ A4 Invoice</button>
        <button class="btn btn-secondary flex-1" onclick="printThermalBill('${bill.id}','sale')">🧾 Thermal</button>
        <button class="btn btn-secondary flex-1" onclick="shareBill(buildShareText(DB.getSaleById('${bill.id}'),'sale'))">📤 Share</button>
        <button class="btn btn-amber flex-1" onclick="pushPage('add-sale',{editId:'${bill.id}'})">✏️ Edit</button>
        <button class="btn btn-danger" style="width:40px;padding:0;" onclick="confirmModal('Delete bill ${esc(bill.id)}?',function(){DB.deleteSale('${bill.id}');showToast('Deleted','success');navigateTo('sales');})">🗑️</button>
      </div>
    </div>`;
}
