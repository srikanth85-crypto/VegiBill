// ═══════════════════════════════════════════════════
//  VegiBill TN — pages/parties.js
// ═══════════════════════════════════════════════════

// ── PARTIES LIST ──────────────────────────────────────
function renderParties(container) {
  setHeaderTitle('Parties', 'Customer & Supplier ledger');

  const sales = DB.getSales();
  const purchases = DB.getPurchases();

  const partyMap = {};
  sales.forEach(s => {
    if (s.partyName) {
      if (!partyMap[s.partyName]) partyMap[s.partyName] = { salesTotal: 0, purchasesTotal: 0, salesCount: 0, purchasesCount: 0 };
      partyMap[s.partyName].salesTotal += Number(s.grandTotal || 0);
      partyMap[s.partyName].salesCount++;
    }
  });
  purchases.forEach(p => {
    if (p.partyName) {
      if (!partyMap[p.partyName]) partyMap[p.partyName] = { salesTotal: 0, purchasesTotal: 0, salesCount: 0, purchasesCount: 0 };
      partyMap[p.partyName].purchasesTotal += Number(p.grandTotal || 0);
      partyMap[p.partyName].purchasesCount++;
    }
  });

  const partyNames = Object.keys(partyMap).sort();

  container.innerHTML = `
    <div class="search-wrap" style="padding-top:12px;">
      <div class="search-input">
        <input type="text" id="party-search" placeholder="Search party name..." oninput="_filterParties()" />
      </div>
    </div>

    <div style="padding:0 12px 10px;display:flex;gap:8px;">
      <button class="btn btn-primary btn-sm" style="margin-left:auto;" onclick="_openAddPartyModal()">+ Add Party</button>
    </div>

    <div id="parties-list" style="padding:0 12px;">
      ${partyNames.length === 0
        ? `<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">No parties yet</div><div class="empty-sub">Add your first party</div><button class="btn btn-primary btn-sm" style="margin-top:12px;" onclick="_openAddPartyModal()">+ Add Party</button></div>`
        : partyNames.map(name => {
          const data = partyMap[name];
          const balance = data.salesTotal - data.purchasesTotal;
          return `
          <div class="list-item" onclick="pushPage('party-detail',{partyName:'${esc(name)}'})" id="party-card-${esc(name).replace(/\s+/g,'-')}">
            <div class="list-avatar" style="background:var(--blue-bg);">👤</div>
            <div class="list-info">
              <div class="list-title">${esc(name)}</div>
              <div class="list-sub">Sales: ${data.salesCount} | Purchases: ${data.purchasesCount}</div>
            </div>
            <div class="list-right">
              <div class="list-amount ${balance >= 0 ? 'text-green' : 'text-red'}">${fmtCurrency(Math.abs(balance))}</div>
              <div class="list-date">${balance >= 0 ? 'Receivable' : 'Payable'}</div>
              <div style="color:var(--text3);font-size:11px;margin-top:2px;">→</div>
            </div>
          </div>`;
        }).join('')
      }
    </div>`;
}

function _filterParties() {
  const q = document.getElementById('party-search')?.value?.toLowerCase() || '';
  document.querySelectorAll('[id^="party-card-"]').forEach(el => {
    const name = el.id.replace('party-card-', '').replace(/-/g,' ');
    el.style.display = name.toLowerCase().includes(q) ? '' : 'none';
  });
}

function _openAddPartyModal(editId = null) {
  const party = editId ? DB.getPartyById(editId) : null;
  openModal(`
    <div class="modal-title">
      ${party ? 'Edit Party' : 'Add New Party'}
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Party / Supplier Name *</label>
      <input type="text" id="m-party-name" placeholder="e.g. Rajan Vegetables" value="${party ? esc(party.name) : ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">Mobile Number</label>
      <input type="tel" id="m-party-mobile" placeholder="10-digit mobile" maxlength="10" value="${party ? esc(party.mobile||'') : ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">Address</label>
      <input type="text" id="m-party-address" placeholder="Market / Town" value="${party ? esc(party.address||'') : ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">GSTIN (Optional)</label>
      <input type="text" id="m-party-gstin" placeholder="33XXXXX..." value="${party ? esc(party.gstin||'') : ''}" />
    </div>
    <div style="display:flex;gap:10px;margin-top:4px;">
      <button class="btn btn-secondary flex-1" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary flex-1" onclick="_saveParty('${editId||''}')">💾 Save Party</button>
    </div>
  `);
  setTimeout(() => document.getElementById('m-party-name')?.focus(), 100);
}

function _saveParty(editId) {
  const name = document.getElementById('m-party-name')?.value?.trim();
  if (!name) { showToast('⚠️ Party name required!'); return; }
  const party = {
    id: editId || undefined,
    name,
    mobile: document.getElementById('m-party-mobile')?.value?.trim(),
    address: document.getElementById('m-party-address')?.value?.trim(),
    gstin: document.getElementById('m-party-gstin')?.value?.trim(),
  };
  DB.saveParty(party);
  closeModal();
  showToast('✅ Party saved!');
  renderParties(document.getElementById('page-container'));
}

// ── PARTY DETAIL ──────────────────────────────────────
function renderPartyDetail(container, params) {
  const partyName = params.partyName;
  if (!partyName) { container.innerHTML = '<div class="page empty-state"><div class="empty-icon">❌</div><div class="empty-title">Party not found</div></div>'; return; }

  setHeaderTitle(partyName, 'Customer & Supplier');

  const sales = DB.getSales().filter(s => s.partyName === partyName);
  const purchases = DB.getPurchases().filter(p => p.partyName === partyName);
  const totalSales = sales.reduce((s, b) => s + Number(b.grandTotal || 0), 0);
  const totalPurchases = purchases.reduce((s, b) => s + Number(b.grandTotal || 0), 0);
  const balance = totalSales - totalPurchases;
  
  // Determine active tab from params
  const activeTab = params.tab || 'overview';

  // Group sales by date
  const salesGroups = groupByDate(sales);
  const salesDates = Object.keys(salesGroups).sort((a, b) => b.localeCompare(a));

  // Group purchases by date
  const purGroups = groupByDate(purchases);
  const purDates = Object.keys(purGroups).sort((a, b) => b.localeCompare(a));

  const salesRows = salesDates.map(date => {
    const dayBills = salesGroups[date];
    const dayTotal = dayBills.reduce((s, b) => s + Number(b.grandTotal || 0), 0);
    return `
      <div class="party-date-row" onclick="pushPage('party-date',{partyName:'${esc(partyName)}',date:'${date}',type:'sale'})">
        <div>
          <div style="font-weight:700;font-size:14px;">${fmtDateKey(date)} (Sale)</div>
          <div style="font-size:12px;color:var(--text3);">${dayBills.length} sale${dayBills.length>1?'s':''}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:15px;font-weight:800;color:var(--green);">${fmtCurrency(dayTotal)}</div>
          <div style="font-size:11px;color:var(--text3);">→</div>
        </div>
      </div>`;
  }).join('');

  const purRows = purDates.map(date => {
    const dayBills = purGroups[date];
    const dayTotal = dayBills.reduce((s, b) => s + Number(b.grandTotal || 0), 0);
    return `
      <div class="party-date-row" onclick="pushPage('party-date',{partyName:'${esc(partyName)}',date:'${date}',type:'purchase'})">
        <div>
          <div style="font-weight:700;font-size:14px;">${fmtDateKey(date)} (Purchase)</div>
          <div style="font-size:12px;color:var(--text3);">${dayBills.length} purchase${dayBills.length>1?'s':''}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:15px;font-weight:800;color:var(--amber);">${fmtCurrency(dayTotal)}</div>
          <div style="font-size:11px;color:var(--text3);">→</div>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <!-- PARTY INFO CARD -->
    <div class="card" style="margin:12px 12px 0;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div style="width:52px;height:52px;background:var(--blue-bg);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;">👤</div>
        <div class="flex-1">
          <div style="font-size:17px;font-weight:800;">${esc(partyName)}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center;">
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;font-weight:700;">Total Sales</div>
          <div style="font-size:16px;font-weight:800;color:var(--green);">${fmtCurrency(totalSales)}</div>
        </div>
        <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center;">
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;font-weight:700;">Total Purchases</div>
          <div style="font-size:16px;font-weight:800;color:var(--amber);">${fmtCurrency(totalPurchases)}</div>
        </div>
        <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center;">
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;font-weight:700;">Balance</div>
          <div style="font-size:16px;font-weight:800;${balance >= 0 ? 'color:var(--green);' : 'color:var(--red);'}">${fmtCurrency(Math.abs(balance))} ${balance >= 0 ? 'Receivable' : 'Payable'}</div>
        </div>
      </div>
    </div>

    <!-- QUICK ACTIONS -->
    <div style="display:flex;gap:8px;padding:10px 12px;">
      <button class="btn btn-primary flex-1 btn-sm" onclick="pushPage('add-sale')">+ New Sale</button>
      <button class="btn btn-amber flex-1 btn-sm" onclick="pushPage('add-purchase')">+ New Purchase</button>
    </div>

    <!-- TABS -->
    <div style="display:flex;gap:0;border-bottom:1px solid var(--border);margin:10px 0 0;">
      <button class="btn btn-ghost" style="flex:1;border-radius:0;border-bottom:3px solid ${activeTab==='sales'?'var(--green)':'transparent'};font-weight:800;padding:12px;color:${activeTab==='sales'?'var(--green)':'var(--text3)'};" onclick="renderPartyDetail(document.getElementById('page-container'),{partyName:'${esc(partyName)}',tab:'sales'})">📦 Sales (${sales.length})</button>
      <button class="btn btn-ghost" style="flex:1;border-radius:0;border-bottom:3px solid ${activeTab==='purchases'?'var(--amber)':'transparent'};font-weight:800;padding:12px;color:${activeTab==='purchases'?'var(--amber)':'var(--text3)'};" onclick="renderPartyDetail(document.getElementById('page-container'),{partyName:'${esc(partyName)}',tab:'purchases'})">🏪 Purchases (${purchases.length})</button>
    </div>

    <!-- SALES HISTORY -->
    ${activeTab==='sales' ? `
    <div style="padding:0 12px;">
      ${salesRows ? `${salesRows}` : `<div class="empty-state" style="padding:48px 24px;"><div class="empty-icon">🧾</div><div class="empty-title">No sales</div><div class="empty-sub">Sales will appear here</div></div>`}
    </div>
    ` : ''}

    <!-- PURCHASE HISTORY -->
    ${activeTab==='purchases' ? `
    <div style="padding:0 12px 20px;">
      ${purRows ? `${purRows}` : `<div class="empty-state" style="padding:48px 24px;"><div class="empty-icon">📦</div><div class="empty-title">No purchases</div><div class="empty-sub">Purchases will appear here</div></div>`}
    </div>
    ` : ''}
  `;
}


// ── PARTY DATE DETAIL ─────────────────────────────────
function renderPartyDate(container, params) {
  const partyName = params.partyName;
  const dateKey = params.date;
  const type = params.type; // 'sale' or 'purchase'
  if (!partyName || !dateKey || !type) return;

  setHeaderTitle(partyName, `${fmtDateKey(dateKey)} (${type})`);

  const bills = type === 'sale' ? DB.getSales().filter(s => s.partyName === partyName && toDateKey(s.createdAt) === dateKey)
                                : DB.getPurchases().filter(p => p.partyName === partyName && toDateKey(p.createdAt) === dateKey);
  
  const dayTotal = bills.reduce((s, b) => s + Number(b.grandTotal || 0), 0);

  container.innerHTML = `
    <!-- SUMMARY CARD -->
    <div class="card" style="margin:12px;">
      <div style="text-align:center;padding:10px;">
        <div style="font-size:12px;color:var(--text3);text-transform:uppercase;font-weight:700;margin-bottom:4px;">Total ${type === 'sale' ? 'Sales' : 'Purchases'}</div>
        <div style="font-size:24px;font-weight:800;color:${type==='sale'?'var(--green)':'var(--amber)'};">${fmtCurrency(dayTotal)}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:6px;">${bills.length} bill${bills.length!==1?'s':''} on ${fmtDateKey(dateKey)}</div>
      </div>
    </div>

    <!-- BILLS ON THIS DATE -->
    <div class="font-bold text-sm text-muted" style="padding:6px 12px 8px;text-transform:uppercase;letter-spacing:.5px;">Bills</div>
    <div style="padding:0 12px 20px;">
      ${bills.length === 0
        ? `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No bills on this date</div></div>`
        : bills.map(b => `
          <div class="list-item" onclick="pushPage('${type}-detail',{id:'${b.id}'})">
            <div class="list-avatar" style="background:${type==='sale'?'var(--green-bg)':'var(--amber-bg)'};">${type==='sale'?'🧾':'📦'}</div>
            <div class="list-info">
              <div class="list-title"><b>${esc(b.id)}</b></div>
              <div class="list-sub">${b.items?.length||0} items · ${esc(b.paymentMethod||'Cash')}</div>
            </div>
            <div class="list-right">
              <div class="list-amount ${type==='sale'?'text-green':'text-amber'}">${fmtCurrency(b.grandTotal)}</div>
              <div style="display:flex;gap:4px;margin-top:4px;">
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();printSingleBill('${b.id}','${type}')" style="padding:4px 8px;">🖨</button>
              </div>
            </div>
          </div>`).join('')
      }
    </div>`;
}
