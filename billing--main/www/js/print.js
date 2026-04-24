// ═══════════════════════════════════════════════════
//  VegiBill TN — print.js
//  A4 Professional Invoice + Thermal Receipt Generator
// ═══════════════════════════════════════════════════

// ── A4 PROFESSIONAL INVOICE ───────────────────────────
function buildA4InvoiceHTML(bill, type = 'sale') {
  const shop    = DB.getSettings();
  const isSale  = type === 'sale';
  const billNo  = bill.id || '';
  const date    = fmtDate(bill.createdAt);

  const subTotal   = Number(bill.subTotal   || 0);
  const sungam     = Number(bill.sungam     || 0);
  const less       = Number(bill.less       || 0);
  const adjustment = Number(bill.adjustment || 0);
  const grandTotal = Number(bill.grandTotal || 0);
  const paid       = Number(bill.amountPaid || grandTotal);
  const effectiveTotal = grandTotal - less - adjustment;
  const balance    = effectiveTotal - paid;

  const totalWeight = (bill.items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  // Build item rows
  const itemRows = (bill.items || []).map((item, idx) => `
    <tr class="${idx % 2 === 1 ? 'alt-row' : ''}">
      <td class="center">${fmtNum(item.pricePerUnit)}</td>
      <td class="item-name">${esc(item.itemName)}</td>
      <td class="center">${idx + 1}</td>
      <td class="center">${esc(item.bags || '-')}</td>
      <td class="center">${fmtNum(item.quantity)}</td>
      <td class="center">${esc(item.unit || 'kg')}</td>
      <td class="right bold">₹${fmtNum(item.totalPrice)}</td>
    </tr>`).join('');

  const logo = shop.logoUrl ? `<img src="${shop.logoUrl}" alt="Logo" style="width:70px;height:70px;object-fit:contain;border-radius:8px;" onerror="this.style.display='none'" />` : `<div style="font-size:40px;line-height:1;">🥬</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Invoice ${billNo}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Arial', 'Helvetica Neue', sans-serif;
    font-size: 13px;
    color: #1a202c;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .invoice-wrapper {
    max-width: 760px;
    margin: 0 auto;
    padding: 32px 36px;
  }

  /* ── HEADER ── */
  .inv-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 18px;
    border-bottom: 2.5px solid #16a34a;
    margin-bottom: 20px;
  }
  .shop-block {}
  .shop-name {
    font-size: 22px;
    font-weight: 900;
    color: #15803d;
    letter-spacing: -0.3px;
    text-transform: uppercase;
    line-height: 1.2;
  }
  .shop-meta {
    font-size: 12px;
    color: #4a5568;
    margin-top: 6px;
    line-height: 1.7;
  }
  .shop-meta a { color: #2563eb; text-decoration: none; }
  .logo-block {
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }

  /* ── CENTER TITLE ── */
  .inv-title-bar {
    text-align: center;
    margin-bottom: 18px;
  }
  .inv-title {
    display: inline-block;
    font-size: 17px;
    font-weight: 900;
    letter-spacing: 3px;
    color: #15803d;
    text-transform: uppercase;
    border-top: 1.5px solid #d1fae5;
    border-bottom: 1.5px solid #d1fae5;
    padding: 6px 36px;
    background: #f0fdf4;
    border-radius: 4px;
  }

  /* ── META ROW ── */
  .inv-meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 18px;
    gap: 20px;
  }
  .bill-to-block {}
  .bill-to-label {
    font-size: 11px;
    color: #94a3b8;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 4px;
  }
  .bill-to-name {
    font-size: 16px;
    font-weight: 800;
    color: #1a202c;
  }
  .bill-to-mobile {
    font-size: 12px;
    color: #4a5568;
    margin-top: 2px;
  }
  .inv-details-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 18px;
    min-width: 200px;
  }
  .inv-detail-row {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    font-size: 12px;
    padding: 3px 0;
  }
  .inv-detail-label { color: #64748b; font-weight: 600; }
  .inv-detail-val { color: #1a202c; font-weight: 700; }

  /* ── ITEMS TABLE ── */
  .inv-table-wrapper {
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 20px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  thead tr {
    background: #15803d;
    color: #fff;
  }
  thead th {
    padding: 10px 8px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  thead th.right { text-align: right; padding-right: 14px; }
  thead th.center { text-align: center; }
  thead th.left { text-align: left; padding-left: 14px; }
  tbody tr { border-bottom: 1px solid #f1f5f9; }
  tbody tr:last-child { border-bottom: none; }
  tbody tr.alt-row { background: #f8fffe; }
  tbody td { padding: 9px 8px; vertical-align: middle; color: #1a202c; }
  tbody td.center { text-align: center; }
  tbody td.right { text-align: right; padding-right: 14px; }
  tbody td.item-name { font-weight: 600; padding-left: 14px; }
  tbody td.bold { font-weight: 700; }

  /* ── FOOTER TABLE ── */
  .inv-footer-row {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    align-items: flex-start;
    margin-bottom: 20px;
  }
  .inv-words-box {
    flex: 1;
    background: #fffbeb;
    border: 1.5px solid #fcd34d;
    border-radius: 8px;
    padding: 12px 16px;
  }
  .inv-words-label {
    font-size: 11px;
    font-weight: 700;
    color: #92400e;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 5px;
  }
  .inv-words-text {
    font-size: 13px;
    font-weight: 700;
    color: #78350f;
    line-height: 1.5;
  }
  .inv-totals-box {
    min-width: 240px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 16px;
    font-size: 13px;
    border-bottom: 1px solid #f1f5f9;
  }
  .totals-row:last-child { border-bottom: none; }
  .totals-row .label { color: #4a5568; font-weight: 600; }
  .totals-row .value { font-weight: 700; color: #1a202c; }
  .totals-row.sub-total { background: #f8fafc; }
  .totals-row.grand-total {
    background: #15803d;
    color: #fff;
    font-size: 15px;
    font-weight: 900;
  }
  .totals-row.grand-total .label,
  .totals-row.grand-total .value { color: #fff; font-weight: 900; }
  .totals-row.received { background: #f0fdf4; }
  .totals-row.received .value { color: #15803d; }
  .totals-row.balance-row { background: #fffbeb; }
  .totals-row.balance-row .value { color: #d97706; }
  .totals-row.balance-due .value { color: #dc2626; }
  .totals-row.prev-balance { background: #fef3c7; }

  /* ── WEIGHT BAR ── */
  .weight-bar {
    display: flex;
    gap: 20px;
    margin-bottom: 16px;
    padding: 10px 16px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    color: #15803d;
  }
  .weight-bar span { color: #4a5568; font-weight: 600; }

  /* ── PRINT FOOTER ── */
  .inv-print-footer {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1.5px dashed #cbd5e1;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-size: 12px;
    color: #94a3b8;
  }
  .inv-sign-block { text-align: right; }
  .inv-sign-line {
    margin-top: 40px;
    border-top: 1px solid #cbd5e1;
    padding-top: 6px;
    font-size: 11px;
    color: #64748b;
    font-weight: 600;
  }

  /* ── PRINT BUTTON (screen only) ── */
  .print-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e2e8f0;
  }
  .print-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 22px; border-radius: 8px; font-size: 14px;
    font-weight: 700; cursor: pointer; border: none; font-family: inherit;
    transition: all .15s;
  }
  .print-btn-primary { background: #16a34a; color: #fff; }
  .print-btn-primary:hover { background: #15803d; }
  .print-btn-secondary { background: #f0f2f8; color: #1a202c; border: 1.5px solid #e2e8f0; }
  .print-btn-secondary:hover { background: #e2e8f0; }

  @media print {
    @page { size: A4 portrait; margin: 12mm 14mm; }
    body { font-size: 12px; }
    .print-actions { display: none !important; }
    .inv-table-wrapper { page-break-inside: avoid; }
    .inv-footer-row { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="invoice-wrapper">

  <!-- PRINT ACTION BUTTONS (screen only) -->
  <div class="print-actions">
    <button class="print-btn print-btn-secondary" onclick="window.close()">✕ Close</button>
    <button class="print-btn print-btn-primary" onclick="window.print()">🖨️ Print / Save PDF</button>
  </div>

  <!-- HEADER -->
  <div class="inv-header">
    <div class="shop-block">
      <div class="shop-name">${esc(shop.shopName)}</div>
      <div class="shop-meta">
        ${esc(shop.address)}<br/>
        ${esc(shop.city || '')}<br/>
        📞 ${esc(shop.phone)}
        ${shop.email ? `&nbsp;|&nbsp; ✉ <a href="mailto:${esc(shop.email)}">${esc(shop.email)}</a>` : ''}
        ${shop.gstin ? `<br/>GSTIN: ${esc(shop.gstin)}` : ''}
      </div>
    </div>
    <div class="logo-block">
      ${logo}
      <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Tamil Nadu, India</div>
    </div>
  </div>

  <!-- TITLE -->
  <div class="inv-title-bar">
    <span class="inv-title">${isSale ? 'Sales Bill' : 'Purchase Bill'}</span>
  </div>

  <!-- CUSTOMER + INVOICE DETAILS -->
  <div class="inv-meta">
    <div class="bill-to-block">
      <div class="bill-to-label">Bill To</div>
      <div class="bill-to-name">${bill.partyName ? esc(bill.partyName) : 'Cash Customer'}</div>
      ${bill.mobile ? `<div class="bill-to-mobile">📱 ${esc(bill.mobile)}</div>` : ''}
    </div>
    <div class="inv-details-box">
      <div class="inv-detail-row">
        <span class="inv-detail-label">Invoice No</span>
        <span class="inv-detail-val">${esc(billNo)}</span>
      </div>
      <div class="inv-detail-row">
        <span class="inv-detail-label">Date</span>
        <span class="inv-detail-val">${date}</span>
      </div>
      <div class="inv-detail-row">
        <span class="inv-detail-label">Payment</span>
        <span class="inv-detail-val">${esc(bill.paymentMethod || 'Cash')}</span>
      </div>
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <div class="inv-table-wrapper">
    <table>
      <thead>
        <tr>
          <th class="center">Rate (₹)</th>
          <th class="left">Item Name</th>
          <th class="center">S.No</th>
          <th class="center">Bags</th>
          <th class="center">Weight</th>
          <th class="center">Unit</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${(bill.items || []).length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8;">No items</td></tr>' : ''}
      </tbody>
    </table>
  </div>

  <!-- WEIGHT + TOTAL BAR -->
  <div class="weight-bar">
    <div><span>Total Items: </span>${(bill.items || []).length}</div>
    <div><span>Total Weight: </span>${fmtNum(totalWeight)} kg</div>
    <div><span>Gross Amount: </span>₹${fmtNum(subTotal)}</div>
  </div>

  <!-- WORDS + TOTALS -->
  <div class="inv-footer-row">
    <div class="inv-words-box">
      <div class="inv-words-label">Invoice Amount in Words</div>
      <div class="inv-words-text">${numberToWords(grandTotal)}</div>
    </div>
    <div class="inv-totals-box">
      <div class="totals-row sub-total">
        <span class="label">Sub Total</span>
        <span class="value">₹${fmtNum(subTotal)}</span>
      </div>
      ${sungam > 0 ? `<div class="totals-row">
        <span class="label">Sungam (Levy)</span>
        <span class="value">₹${fmtNum(sungam)}</span>
      </div>` : ''}
      ${less > 0 ? `<div class="totals-row">
        <span class="label">Less / Discount</span>
        <span class="value" style="color:#dc2626;">-₹${fmtNum(less)}</span>
      </div>` : ''}
      <div class="totals-row grand-total">
        <span class="label">Total</span>
        <span class="value">₹${fmtNum(grandTotal)}</span>
      </div>
      <div class="totals-row received">
        <span class="label">Received</span>
        <span class="value">₹${fmtNum(paid)}</span>
      </div>
      <div class="totals-row ${balance > 0 ? 'balance-due' : 'balance-row'}">
        <span class="label">${balance > 0 ? 'Balance Due' : 'Balance Return'}</span>
        <span class="value">₹${fmtNum(Math.abs(balance))}</span>
      </div>
    </div>
  </div>

  <!-- PRINT FOOTER -->
  <div class="inv-print-footer">
    <div>
      <div style="font-weight:700;color:#4a5568;">Thank you for your business!</div>
      <div style="margin-top:3px;">VegiBill TN · Powered by technology</div>
    </div>
    <div class="inv-sign-block">
      <div class="inv-sign-line">Authorised Signatory</div>
    </div>
  </div>

</div>
</body>
</html>`;
}

// ── THERMAL RECEIPT (80mm / kept for thermal printers) ─
function buildReceiptHTML(bill, type = 'sale') {
  const shop   = DB.getSettings();
  const isSale = type === 'sale';
  const billNo = bill.id || '';
  const date   = fmtDate(bill.createdAt);

  const rows = (bill.items || []).map(item => `
    <tr>
      <td class="name">${esc(item.itemName)}</td>
      <td>${esc(item.bags || '-')}</td>
      <td>${fmtNum(item.quantity)} ${esc(item.unit || '')}</td>
      <td class="amt">₹${fmtNum(item.pricePerUnit)}</td>
      <td class="amt">₹${fmtNum(item.totalPrice)}</td>
    </tr>`).join('');

  const sungam      = Number(bill.sungam     || 0);
  const less        = Number(bill.less       || 0);
  const adjustment  = Number(bill.adjustment || 0);
  const subTotal    = Number(bill.subTotal   || 0);
  const grandTotal  = Number(bill.grandTotal || 0);
  const paid        = Number(bill.amountPaid || grandTotal);
  const effectiveTotal = grandTotal - less - adjustment;
  const balance     = paid - effectiveTotal;

  const partyLine  = bill.partyName ? `<div class="meta">${isSale ? 'Customer' : 'Supplier'}: <b>${esc(bill.partyName)}</b></div>` : '';
  const mobileLine = bill.mobile    ? `<div class="meta">Mobile: ${esc(bill.mobile)}</div>` : '';

  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"/>
<title>Receipt ${billNo}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Courier New',Courier,monospace; font-size:12px; width:80mm; margin:0 auto; color:#000; background:#fff; }
  .center { text-align:center; }
  .bold { font-weight:bold; }
  .dashed { border-top:1px dashed #000; margin:5px 0; }
  .shop-name { font-size:16px; font-weight:bold; text-align:center; }
  .shop-sub { font-size:10px; text-align:center; color:#333; }
  .meta { font-size:11px; margin:2px 0; }
  .bill-head { display:flex; justify-content:space-between; margin:4px 0; font-size:11px; }
  table { width:100%; border-collapse:collapse; margin:4px 0; }
  th { font-size:10px; text-align:left; border-bottom:1px solid #000; padding:2px 1px; }
  td { font-size:11px; padding:3px 1px; vertical-align:top; }
  td.name { max-width:30mm; word-break:break-word; }
  td.amt { text-align:right; }
  th.amt { text-align:right; }
  .totals { margin-top:4px; }
  .total-row { display:flex; justify-content:space-between; font-size:11px; padding:2px 0; }
  .total-row.big { font-size:14px; font-weight:bold; border-top:1px solid #000; padding-top:4px; margin-top:2px; }
  .footer { text-align:center; font-size:10px; margin-top:8px; color:#444; }
  .pay-badge { display:inline-block; border:1px solid #000; padding:1px 6px; border-radius:4px; font-size:10px; }
  @media print { @page { size:80mm auto; margin:2mm; } body { width:80mm; } }
</style>
</head><body>
  <div class="shop-name">${esc(shop.shopName)}</div>
  <div class="shop-sub">${esc(shop.address)}</div>
  <div class="shop-sub">Ph: ${esc(shop.phone)}</div>
  <div class="dashed"></div>
  <div class="center bold" style="font-size:13px;">${isSale ? 'SALE RECEIPT' : 'PURCHASE RECEIPT'}</div>
  ${partyLine}
  <div class="center" style="font-size:11px;">Bill No: ${esc(billNo)}</div>
  <div class="bill-head"><span>${date}</span><span class="pay-badge">${esc(bill.paymentMethod || 'Cash')}</span></div>
  ${mobileLine}
  <div class="dashed"></div>
  <table>
    <thead>
      <tr>
        <th>Item</th><th>Bag</th><th>Qty</th>
        <th class="amt">Rate</th><th class="amt">Amt</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="dashed"></div>
  <div class="totals">
    <div class="total-row"><span>Sub Total</span><span>₹${fmtNum(subTotal)}</span></div>
    ${sungam > 0 ? `<div class="total-row"><span>Sungam</span><span>₹${fmtNum(sungam)}</span></div>` : ''}
    <div class="total-row big"><span>GRAND TOTAL</span><span>₹${fmtNum(grandTotal)}</span></div>
    ${less > 0 ? `<div class="total-row"><span>Less</span><span>-₹${fmtNum(less)}</span></div>` : ''}
    ${paid !== effectiveTotal ? `
    <div class="total-row"><span>Amount Paid</span><span>₹${fmtNum(paid)}</span></div>
    <div class="total-row" style="font-weight:bold;">
      <span>${balance >= 0 ? 'Balance Return' : 'Balance Due'}</span>
      <span>₹${fmtNum(Math.abs(balance))}</span>
    </div>` : ''}
  </div>
  <div class="dashed"></div>
  <div class="footer">
    <div>Thank you! வாருங்கள் மீண்டும்!</div>
    <div style="margin-top:3px;">** Computer generated receipt **</div>
    <div style="margin-top:2px;font-size:9px;">VegiBill TN · Tamil Nadu</div>
  </div>
</body></html>`;
}

// ── PRINT SINGLE BILL (A4) ─────────────────────────────
function printSingleBill(billId, type = 'sale') {
  const bill = type === 'sale' ? DB.getSaleById(billId) : DB.getPurchaseById(billId);
  if (!bill) return showToast('Bill not found!', 'error');

  const w = window.open('', '_blank', 'width=820,height=900,scrollbars=yes');
  w.document.write(buildA4InvoiceHTML(bill, type));
  w.document.close();
}

// ── PRINT THERMAL RECEIPT ──────────────────────────────
function printThermalBill(billId, type = 'sale') {
  const bill = type === 'sale' ? DB.getSaleById(billId) : DB.getPurchaseById(billId);
  if (!bill) return showToast('Bill not found!', 'error');

  const w = window.open('', '_blank', 'width=380,height=700,scrollbars=yes');
  w.document.write(buildReceiptHTML(bill, type));
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}

// ── BULK PRINT ─────────────────────────────────────────
function bulkPrintBills(billIds, type = 'sale') {
  const source = type === 'sale' ? DB.getSales() : DB.getPurchases();
  const bills  = source.filter(b => billIds.includes(b.id));
  if (!bills.length) return showToast('No bills selected!', 'error');

  const pagesHtml = bills
    .map(b => buildA4InvoiceHTML(b, type))
    .join('<div style="page-break-after:always;"></div>');

  const w = window.open('', '_blank', 'width=820,height=900,scrollbars=yes');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>@media print{@page{size:A4;margin:12mm 14mm;}}</style>
    </head><body>${pagesHtml}</body></html>`);
  w.document.close();
}

// ── SHARE TEXT ─────────────────────────────────────────
function buildShareText(bill, type = 'sale') {
  const shop   = DB.getSettings();
  const isSale = type === 'sale';
  let text = `${shop.shopName}\n`;
  text += `${isSale ? 'SALE' : 'PURCHASE'} Bill: ${bill.id}\n`;
  text += `Date: ${fmtDate(bill.createdAt)}\n`;
  if (bill.partyName) text += `${isSale ? 'Customer' : 'Supplier'}: ${bill.partyName}\n`;
  text += `\n`;
  (bill.items || []).forEach(item => {
    text += `• ${item.itemName}: ${item.quantity}${item.unit} × ₹${item.pricePerUnit} = ₹${item.totalPrice}\n`;
  });
  text += `\nTotal: ₹${bill.grandTotal}`;
  if (bill.sungam > 0) text += `\nSungam: ₹${bill.sungam}`;
  text += `\nPayment: ${bill.paymentMethod || 'Cash'}`;
  return text;
}
