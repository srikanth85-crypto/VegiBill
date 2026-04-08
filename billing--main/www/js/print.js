// ═══════════════════════════════════════════════════
//  VegiBill TN — print.js
//  Thermal Printer: 80mm / 58mm receipt generator
// ═══════════════════════════════════════════════════

function buildReceiptHTML(bill, type='sale') {
  const shop = DB.getSettings();
  const isSale = type === 'sale';
  const billLabel = isSale ? 'SALE RECEIPT' : 'PURCHASE RECEIPT';
  const billNo = bill.id || '';
  const date = fmtDate(bill.createdAt);
  const time = fmtTime(bill.createdAt);

  const rows = (bill.items || []).map(item => `
    <tr>
      <td class="name">${esc(item.itemName)}</td>
      <td>${esc(item.bags || '-')}</td>
      <td>${fmtNum(item.quantity)} ${esc(item.unit||'')}</td>
      <td class="amt">₹${fmtNum(item.pricePerUnit)}</td>
      <td class="amt">₹${fmtNum(item.totalPrice)}</td>
    </tr>`).join('');

  const sungam = Number(bill.sungam || 0);
  const less = Number(bill.less || 0);
  const adjustment = Number(bill.adjustment || 0);
  const subTotal = Number(bill.subTotal || 0);
  const grandTotal = Number(bill.grandTotal || 0);
  const paid = Number(bill.amountPaid || grandTotal);
  const effectiveTotal = grandTotal - less - adjustment;
  const balance = paid - effectiveTotal;

  const partyLine = bill.partyName
    ? `<div class="meta">${isSale ? 'Customer' : 'Supplier'}: <b>${esc(bill.partyName)}</b></div>` : '';
  const mobileLine = bill.mobile ? `<div class="meta">Mobile: ${esc(bill.mobile)}</div>` : '';

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
  @media print {
    @page { size:80mm auto; margin:2mm; }
    body { width:80mm; }
  }
</style>
</head><body>
  <div class="shop-name">${esc(shop.shopName)}</div>
  <div class="shop-sub">${esc(shop.address)}</div>
  <div class="shop-sub">Ph: ${esc(shop.phone)} | GSTIN: ${esc(shop.gstin)}</div>
  <div class="shop-sub">State: ${esc(shop.state)} (${esc(shop.stateCode)})</div>
  <div class="dashed"></div>

  <div class="center bold" style="font-size:13px;">${billLabel}</div>
  ${partyLine}
  <div class="center" style="font-size:11px;">Bill No: ${esc(billNo)}</div>
  <div class="bill-head"><span>${date}</span><span class="pay-badge">${esc(bill.paymentMethod || 'Cash')}</span></div>
  ${mobileLine}
  <div class="dashed"></div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Bag</th>
        <th>Qty</th>
        <th class="amt">Rate</th>
        <th class="amt">Amt</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="dashed"></div>

  <div class="totals">
    <div class="total-row"><span>Sub Total</span><span>₹${fmtNum(subTotal)}</span></div>
    ${sungam > 0 ? `<div class="total-row"><span>Sungam (Tax/Levy)</span><span>₹${fmtNum(sungam)}</span></div>` : ''}
    <div class="total-row big"><span>GRAND TOTAL</span><span>₹${fmtNum(grandTotal)}</span></div>
    ${less > 0 ? `<div class="total-row"><span>Less</span><span>-₹${fmtNum(less)}</span></div>` : ''}
    ${!isSale && adjustment > 0 ? `<div class="total-row"><span>Adjustment</span><span>-₹${fmtNum(adjustment)}</span></div>` : ''}
    ${(less > 0 || (!isSale && adjustment > 0)) ? `<div class="total-row" style="border-top:1px dashed #000;padding-top:4px;font-weight:bold;"><span>NET TOTAL</span><span>₹${fmtNum(effectiveTotal)}</span></div>` : ''}
    ${paid !== effectiveTotal ? `<div class="total-row"><span>Amount Paid</span><span>₹${fmtNum(paid)}</span></div>
    <div class="total-row" style="font-weight:bold;color:${balance>=0?'#000':'#000'}">
      <span>${balance >= 0 ? 'Balance Return' : 'Balance Due'}</span>
      <span>₹${fmtNum(Math.abs(balance))}</span>
    </div>` : ''}
  </div>
  <div class="dashed"></div>

  <div class="footer">
    <div>Thank you! வாருங்கள் மீண்டும்!</div>
    <div style="margin-top:3px;">** This is a computer generated receipt **</div>
    <div style="margin-top:2px;font-size:9px;">VegiBill TN · Tamil Nadu</div>
  </div>
</body></html>`;
}

function printSingleBill(billId, type='sale') {
  const bill = type === 'sale' ? DB.getSaleById(billId) : DB.getPurchaseById(billId);
  if (!bill) return showToast('Bill not found!');
  const w = window.open('', '_blank', 'width=400,height=650,scrollbars=yes');
  w.document.write(buildReceiptHTML(bill, type));
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}

function bulkPrintBills(billIds, type='sale') {
  const source = type === 'sale' ? DB.getSales() : DB.getPurchases();
  const bills = source.filter(b => billIds.includes(b.id));
  if (!bills.length) return showToast('No bills selected!');
  const html = bills.map(b => buildReceiptHTML(b, type)).join('<div style="page-break-after:always;"></div>');
  const w = window.open('', '_blank', 'width=400,height=700,scrollbars=yes');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@media print{@page{size:80mm auto;margin:2mm;}}</style></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 500);
}

function buildShareText(bill, type='sale') {
  const shop = DB.getSettings();
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
