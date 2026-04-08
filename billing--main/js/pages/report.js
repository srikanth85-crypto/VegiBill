// ═══════════════════════════════════════════════════
//  VegiBill TN — pages/report.js
//  Trading Report System
// ═══════════════════════════════════════════════════

let _reportCharges = { lorryRent: 0, loadingCharges: 0, cbCharges: 0 };

function renderReport(container, params = {}) {
  setHeaderTitle('Trading Reports', 'Select Date');

  // Get all available dates from sales and purchases
  const sales = DB.getSales();
  const purchases = DB.getPurchases();
  const allRecords = [...sales, ...purchases];

  // Group by date and get unique dates
  const dateGroups = {};
  allRecords.forEach(record => {
    const date = toDateKey(record.createdAt);
    if (!dateGroups[date]) dateGroups[date] = [];
    dateGroups[date].push(record);
  });

  // Sort dates in descending order (newest first)
  const dates = Object.keys(dateGroups).sort().reverse();

  container.innerHTML = `
    <div class="page">
      <div class="font-bold text-sm text-muted" style="margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px;">Available Trading Dates</div>

      ${dates.length === 0
        ? `<div class="card" style="text-align:center;color:var(--text3);padding:32px;">
             <div style="font-size:48px;margin-bottom:16px;">📊</div>
             <div>No trading data found</div>
             <div style="font-size:13px;margin-top:8px;">Add sales and purchases to see reports</div>
           </div>`
        : dates.map(date => {
            const records = dateGroups[date];
            const salesCount = records.filter(r => r.id && r.id.startsWith('SL')).length;
            const purchaseCount = records.filter(r => r.id && r.id.startsWith('PUR')).length;

            return `
              <div class="list-item" onclick="pushPage('report-detail', {date: '${date}'})">
                <div class="list-avatar" style="background:var(--blue-bg);">
                  📅
                </div>
                <div class="list-info">
                  <div class="list-title">${fmtDateKey(date)}</div>
                  <div class="list-sub">${salesCount} sales · ${purchaseCount} purchases</div>
                </div>
                <div class="list-right">
                  <div class="list-amount">${records.length}</div>
                  <div class="list-date">transactions</div>
                </div>
              </div>`;
          }).join('')
      }
    </div>`;
}

function renderReportDetail(container, params = {}) {
  const selectedDate = params.date;
  if (!selectedDate) {
    container.innerHTML = '<div class="page">Invalid date</div>';
    return;
  }

  setHeaderTitle('Trading Report', fmtDateKey(selectedDate));

  // Get data for the selected date
  const sales = DB.getSales().filter(s => toDateKey(s.createdAt) === selectedDate);
  const purchases = DB.getPurchases().filter(p => toDateKey(p.createdAt) === selectedDate);

  // Calculate trading data by item
  const tradingData = calculateTradingData(sales, purchases);

  // Load saved charges for this date
  _reportCharges = DB.getReportCharges(selectedDate);

  const totalCharges = (_reportCharges.lorryRent || 0) + (_reportCharges.loadingCharges || 0) + (_reportCharges.cbCharges || 0);
  const totalGrossProfit = tradingData.reduce((sum, item) => sum + (item.grossProfit || 0), 0);
  const totalNetProfit = totalGrossProfit - totalCharges;

  container.innerHTML = `
    <div class="page">

      <!-- CHARGES BUTTON -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div class="font-bold text-sm text-muted" style="text-transform:uppercase;letter-spacing:.5px;">Trading Summary - ${fmtDateKey(selectedDate)}</div>
        <button class="btn btn-secondary btn-sm" onclick="openChargesPopup('${selectedDate}')">
          💰 Charges
        </button>
      </div>

      <!-- TRADING TABLE -->
      <div class="card" style="padding:0;">
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:var(--bg3);border-bottom:2px solid var(--border);">
                <th style="padding:12px 8px;text-align:left;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;">Items</th>
                <th style="padding:12px 8px;text-align:center;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;">Purchase<br/>Weight</th>
                <th style="padding:12px 8px;text-align:center;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;">Sale<br/>Weight</th>
                <th style="padding:12px 8px;text-align:center;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;">Weight<br/>Tally</th>
                <th style="padding:12px 8px;text-align:center;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;">Purchase<br/>Rate</th>
                <th style="padding:12px 8px;text-align:center;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;">Sale<br/>Rate</th>
                <th style="padding:12px 8px;text-align:center;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;">Price<br/>Tally</th>
                <th style="padding:12px 8px;text-align:center;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;">Charges</th>
                <th style="padding:12px 8px;text-align:center;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;">Gross<br/>Profit</th>
                <th style="padding:12px 8px;text-align:center;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;">Net<br/>Profit</th>
              </tr>
            </thead>
            <tbody>
              ${tradingData.map(item => `
                <tr style="border-bottom:1px solid var(--border);">
                  <td style="padding:12px 8px;font-weight:600;">${esc(item.itemName)}</td>
                  <td style="padding:12px 8px;text-align:center;">${fmtNum(item.purchaseWeight)} ${esc(item.unit)}</td>
                  <td style="padding:12px 8px;text-align:center;">${fmtNum(item.saleWeight)} ${esc(item.unit)}</td>
                  <td style="padding:12px 8px;text-align:center;font-weight:600;${item.weightTally >= 0 ? 'color:var(--green)' : 'color:var(--red)'}">${item.weightTally >= 0 ? '+' : ''}${fmtNum(item.weightTally)}</td>
                  <td style="padding:12px 8px;text-align:center;">₹${fmtNum(item.purchaseRate)}</td>
                  <td style="padding:12px 8px;text-align:center;">₹${fmtNum(item.saleRate)}</td>
                  <td style="padding:12px 8px;text-align:center;font-weight:600;${item.priceTally >= 0 ? 'color:var(--green)' : 'color:var(--red)'}">${item.priceTally >= 0 ? '+' : ''}${fmtNum(item.priceTally)}</td>
                  <td style="padding:12px 8px;text-align:center;">₹${fmtNum(item.charges || 0)}</td>
                  <td style="padding:12px 8px;text-align:center;font-weight:600;${item.grossProfit >= 0 ? 'color:var(--green)' : 'color:var(--red)'}">${item.grossProfit >= 0 ? '+' : ''}₹${fmtNum(item.grossProfit)}</td>
                  <td style="padding:12px 8px;text-align:center;font-weight:600;${item.netProfit >= 0 ? 'color:var(--green)' : 'color:var(--red)'}">${item.netProfit >= 0 ? '+' : ''}₹${fmtNum(item.netProfit)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background:var(--bg3);border-top:2px solid var(--border);">
                <td style="padding:12px 8px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">TOTAL</td>
                <td colspan="6" style="padding:12px 8px;text-align:center;font-weight:700;">Total Charges: ₹${fmtNum(totalCharges)}</td>
                <td style="padding:12px 8px;text-align:center;font-weight:700;">₹${fmtNum(totalCharges)}</td>
                <td style="padding:12px 8px;text-align:center;font-weight:700;${totalGrossProfit >= 0 ? 'color:var(--green)' : 'color:var(--red)'}">${totalGrossProfit >= 0 ? '+' : ''}₹${fmtNum(totalGrossProfit)}</td>
                <td style="padding:12px 8px;text-align:center;font-weight:700;${totalNetProfit >= 0 ? 'color:var(--green)' : 'color:var(--red)'}">${totalNetProfit >= 0 ? '+' : ''}₹${fmtNum(totalNetProfit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- ACTION BUTTONS -->
      <div style="display:flex;gap:12px;margin-top:16px;">
        <button class="btn btn-primary flex-1" onclick="saveReport('${selectedDate}')">💾 Save Report</button>
        <button class="btn btn-secondary flex-1" onclick="goBack()">❌ Close</button>
      </div>
    </div>`;
}

function calculateTradingData(sales, purchases) {
  const itemData = {};

  // Process purchases
  purchases.forEach(purchase => {
    (purchase.items || []).forEach(item => {
      const key = item.itemName.toLowerCase().trim();
      if (!itemData[key]) {
        itemData[key] = {
          itemName: item.itemName,
          unit: item.unit || 'kg',
          purchaseWeight: 0,
          purchaseValue: 0,
          saleWeight: 0,
          saleValue: 0
        };
      }
      itemData[key].purchaseWeight += Number(item.quantity || 0);
      itemData[key].purchaseValue += Number(item.totalPrice || 0);
    });
  });

  // Process sales
  sales.forEach(sale => {
    (sale.items || []).forEach(item => {
      const key = item.itemName.toLowerCase().trim();
      if (!itemData[key]) {
        itemData[key] = {
          itemName: item.itemName,
          unit: item.unit || 'kg',
          purchaseWeight: 0,
          purchaseValue: 0,
          saleWeight: 0,
          saleValue: 0
        };
      }
      itemData[key].saleWeight += Number(item.quantity || 0);
      itemData[key].saleValue += Number(item.totalPrice || 0);
    });
  });

  // Calculate rates and profits
  return Object.values(itemData).map(item => {
    const purchaseRate = item.purchaseWeight > 0 ? item.purchaseValue / item.purchaseWeight : 0;
    const saleRate = item.saleWeight > 0 ? item.saleValue / item.saleWeight : 0;

    const weightTally = item.saleWeight - item.purchaseWeight;
    const priceTally = saleRate - purchaseRate;
    const grossProfit = (item.saleWeight * saleRate) - (item.purchaseWeight * purchaseRate);
    const netProfit = grossProfit; // Will be adjusted with charges later

    return {
      ...item,
      purchaseRate,
      saleRate,
      weightTally,
      priceTally,
      grossProfit,
      netProfit,
      charges: 0 // Will be distributed proportionally
    };
  }).filter(item => item.purchaseWeight > 0 || item.saleWeight > 0);
}

function openChargesPopup(date) {
  const charges = DB.getReportCharges(date);

  openModal(`
    <div class="modal-title">Trading Charges - ${fmtDateKey(date)}</div>
    <div style="margin-top:16px;">
      <div class="form-group">
        <label class="form-label">Lorry Rent</label>
        <input type="number" id="lorry-rent" placeholder="0.00" min="0" step="0.01" value="${charges.lorryRent || 0}" />
      </div>
      <div class="form-group">
        <label class="form-label">Loading Charges</label>
        <input type="number" id="loading-charges" placeholder="0.00" min="0" step="0.01" value="${charges.loadingCharges || 0}" />
      </div>
      <div class="form-group">
        <label class="form-label">CB Charges</label>
        <input type="number" id="cb-charges" placeholder="0.00" min="0" step="0.01" value="${charges.cbCharges || 0}" />
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button class="btn btn-secondary flex-1" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary flex-1" onclick="saveCharges('${date}')">Done</button>
    </div>
  `);
}

function saveCharges(date) {
  const lorryRent = Number(document.getElementById('lorry-rent').value) || 0;
  const loadingCharges = Number(document.getElementById('loading-charges').value) || 0;
  const cbCharges = Number(document.getElementById('cb-charges').value) || 0;

  DB.saveReportCharges(date, { lorryRent, loadingCharges, cbCharges });
  closeModal();

  // Refresh the current report
  const currentPage = AppState.history[AppState.history.length - 1];
  if (currentPage.tab === 'report-detail') {
    renderReportDetail(document.getElementById('page-container'), currentPage.params);
  }

  showToast('Charges updated successfully!');
}

function saveReport(date) {
  // Mark report as saved (could store additional metadata)
  showToast('Report saved successfully!');
}

// Add charges functions to DB
DB.getReportCharges = function(date) {
  const charges = read('vb_report_charges', {});
  return charges[date] || { lorryRent: 0, loadingCharges: 0, cbCharges: 0 };
};

DB.saveReportCharges = function(date, charges) {
  const allCharges = read('vb_report_charges', {});
  allCharges[date] = charges;
  write('vb_report_charges', allCharges);
};