// ═══════════════════════════════════════════════════
//  VegiBill TN — pages/home.js
// ═══════════════════════════════════════════════════

function renderHome(container) {
  setHeaderTitle('VegiBill TN', new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' }));

  const sales = DB.getSales();
  const purchases = DB.getPurchases();
  const todaySales = filterByPeriod(sales, 'today');
  const todayPurchases = filterByPeriod(purchases, 'today');
  const todaySaleAmt = todaySales.reduce((s, b) => s + Number(b.grandTotal || 0), 0);
  const todayPurAmt = todayPurchases.reduce((s, b) => s + Number(b.grandTotal || 0), 0);
  const monthSales = filterByPeriod(sales, 'month');
  const monthAmt = monthSales.reduce((s, b) => s + Number(b.grandTotal || 0), 0);
  const parties = DB.getParties();

  container.innerHTML = `
    <div class="page">

      <!-- STATS -->
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Today's Sales</div>
          <div class="stat-value text-green">${fmtCurrency(todaySaleAmt)}</div>
          <div class="stat-sub">${todaySales.length} bills</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Today's Purchase</div>
          <div class="stat-value text-amber">${fmtCurrency(todayPurAmt)}</div>
          <div class="stat-sub">${todayPurchases.length} entries</div>
        </div>
      </div>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Month Revenue</div>
          <div class="stat-value text-blue">${fmtCurrency(monthAmt)}</div>
          <div class="stat-sub">${monthSales.length} bills this month</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Parties</div>
          <div class="stat-value">${parties.length}</div>
          <div class="stat-sub">Registered suppliers</div>
        </div>
      </div>

      <!-- QUICK ACTIONS -->
      <div class="quick-actions">
        <button class="quick-card" onclick="pushPage('add-sale')">
          <span class="quick-icon">🧾</span>
          <span class="quick-title">New Sale</span>
          <span class="quick-sub">Create sale bill</span>
        </button>
        <button class="quick-card" onclick="pushPage('add-purchase')">
          <span class="quick-icon">📦</span>
          <span class="quick-title">New Purchase</span>
          <span class="quick-sub">Record purchase</span>
        </button>
        <button class="quick-card" onclick="navigateTo('sales')">
          <span class="quick-icon">📋</span>
          <span class="quick-title">View Sales</span>
          <span class="quick-sub">History & prints</span>
        </button>
        <button class="quick-card" onclick="navigateTo('parties')">
          <span class="quick-icon">👥</span>
          <span class="quick-title">Parties</span>
          <span class="quick-sub">Supplier ledger</span>
        </button>
        <button class="quick-card" onclick="navigateTo('admin')">
          <span class="quick-icon">🔐</span>
          <span class="quick-title">Admin</span>
          <span class="quick-sub">Login & controls</span>
        </button>
      </div>

      <!-- RECENT SALES -->
      <div class="font-bold text-sm text-muted" style="margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;">Recent Sales</div>
      ${todaySales.length === 0
        ? `<div class="card" style="text-align:center;color:var(--text3);padding:24px;">No sales today yet. <button class="btn btn-primary btn-sm" style="margin-top:10px;" onclick="pushPage('add-sale')">+ Add Sale</button></div>`
        : todaySales.slice(0, 5).map(b => `
          <div class="list-item" onclick="pushPage('sale-detail',{id:'${b.id}'})">
            <div class="list-avatar" style="background:var(--green-bg);">🧾</div>
            <div class="list-info">
              <div class="list-title">${b.partyName ? `<strong>${esc(b.partyName)}</strong>` : esc(b.id)}</div>
              <div class="list-sub">${b.partyName ? `Invoice: ${esc(b.id)} · ` : ''}${b.items?.length||0} items</div>
            </div>
            <div class="list-right">
              <div class="list-amount text-green">${fmtCurrency(b.grandTotal)}</div>
              <div class="list-date">${fmtTime(b.createdAt)}</div>
            </div>
          </div>`).join('')      }
    </div>`;
}
