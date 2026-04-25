// ═══════════════════════════════════════════════════
//  VegiBill TN — pages/add-purchase.js
// ═══════════════════════════════════════════════════

let _purItems = [];
let _editPurId = null;
let _purAutocompleteOpen = null; // Track which item row has autocomplete open
let _purAcHighlight = {}; // { [rowIndex]: highlightedIdx }

function renderAddPurchase(container, params = {}) {
  _editPurId = params.editId || null;
  const existing = _editPurId ? DB.getPurchaseById(_editPurId) : null;
  _purItems = existing ? JSON.parse(JSON.stringify(existing.items || [])) : [_blankPurItem()];

  setHeaderTitle(_editPurId ? 'Edit Purchase' : 'New Purchase', 'Purchase Entry');

  const parties = DB.getParties();
  const partyOpts = `<option value="">-- Select Supplier --</option>` +
    parties.map(p => `<option value="${esc(p.id)}" data-name="${esc(p.name)}" ${existing?.partyId===p.id?'selected':''}>${esc(p.name)}</option>`).join('');

  container.innerHTML = `
    <div class="page">

      <!-- PURCHASE INFO -->
      <div class="card" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">Purchase Date</label>
          <input type="date" id="pur-date" value="${existing ? toDateKey(existing.createdAt) : todayISO()}" />
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">Supplier Name</label>
          <input type="text" id="pur-party" placeholder="Type supplier name" value="${existing ? esc(existing.partyName||'') : ''}" />
        </div>
      </div>

      <!-- ITEMS - SPREADSHEET VIEW -->
      <div class="pur-items-wrapper">
        <div id="pur-items-container"></div>
      </div>

      <!-- SUNGAM -->
      <div class="sungam-row">
        <span class="sungam-label">⚖️ Sungam (Market Levy)</span>
        <input class="sungam-input" type="number" id="pur-sungam" placeholder="0.00" min="0" step="0.01"
          value="${existing ? (existing.sungam||0) : ''}" oninput="recalcPur()" />
      </div>

      <!-- PAYMENT -->
      <div class="form-group">
        <label class="form-label">Payment Method</label>
        <div class="pay-chips" id="pur-pay-chips">
          ${['Cash','UPI','Credit','Cheque'].map(m => `
            <button class="pay-chip ${(existing?.paymentMethod||'Cash')===m?'selected':''}"
              onclick="selectPayMethod(this,'${m}','pur')">${m}</button>`).join('')}
        </div>
      </div>
      <input type="hidden" id="pur-payment-method" value="${existing?.paymentMethod||'Cash'}" />

      <!-- SUMMARY -->
      <div class="summary-box">
        <div class="summary-row"><span>Sub Total</span><span id="pur-subtotal">₹0.00</span></div>
        <div class="summary-row"><span>Sungam</span><span id="pur-sungam-display">₹0.00</span></div>
        <div class="summary-row total"><span>Grand Total</span><span id="pur-grandtotal">₹0.00</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Amount Paid (₹)</label>
            <input type="number" id="pur-paid" placeholder="Enter amount paid" min="0"
              value="${existing ? (existing.amountPaid||'') : ''}" oninput="recalcPur()" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Less (₹)</label>
            <input type="number" id="pur-less" placeholder="Discount/Reduction" min="0" step="0.01"
              value="${existing ? (existing.less||'') : ''}" oninput="recalcPur()" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Adjustment (₹)</label>
            <input type="number" id="pur-adjustment" placeholder="Additional adjustment" min="0" step="0.01"
              value="${existing ? (existing.adjustment||'') : ''}" oninput="recalcPur()" />
          </div>
        </div>
        <div class="summary-row balance" id="pur-balance-row" style="display:none;">
          <span id="pur-balance-label">Balance</span>
          <span id="pur-balance-amt"></span>
        </div>

      <!-- SAVE -->
      <div style="display:flex;gap:10px;margin-top:14px;padding-bottom:24px;">
        <button class="btn btn-secondary flex-1" onclick="goBack()">Cancel</button>
        <button class="btn btn-amber flex-1" onclick="savePurchaseBill()" style="background:#d97706;color:#fff;border:none;">
          💾 ${_editPurId ? 'Update' : 'Save'}
        </button>
        <button class="btn btn-amber flex-1" onclick="savePurchaseBillAndPrint()" style="background:#d97706;color:#fff;border:none;">
          🖨️ Save & Print
        </button>
      </div>
    </div>`;

  renderPurItemsTable();
  recalcPur();
}

function _blankPurItem() {
  return { itemName: '', bags: '', quantity: '', unit: 'kg', pricePerUnit: '', totalPrice: '' };
}

function renderPurItemsTable() {
  const container = document.getElementById('pur-items-container');
  if (!container) return;

  const isMobile = window.innerWidth < 480;
  
  // Desktop view: grid layout
  if (!isMobile) {
    const rows = _purItems.map((item, i) => `
        <div class="pur-table-row" data-index="${i}" style="position:relative;display:grid;grid-template-columns:2fr .8fr 1fr .9fr 1.2fr 40px;gap:5px;align-items:center;">
          <div style="position:relative;width:100%;overflow:visible;">
            <input type="text" class="pur-item-name" placeholder="Item name" value="${esc(item.itemName)}"
              data-index="${i}" oninput="_onPurItemInput(event, ${i})" onkeydown="_onPurItemKeydown(event, ${i})" onfocus="_showPurAutocomplete(${i})" onblur="_hidePurAutocomplete(${i})" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:4px;" />
            <div id="pur-autocomplete-${i}" class="autocomplete-dropdown" style="display:none;position:absolute;top:calc(100% + 2px);left:0;right:0;background:white;border:1px solid var(--border2);border-radius:4px;max-height:180px;overflow-y:auto;z-index:1000;box-shadow:0 4px 12px rgba(0,0,0,0.15);"></div>
          </div>
        <input type="text" class="pur-item-bags" placeholder="Bags" value="${esc(item.bags)}"
          data-index="${i}" oninput="_purItems[${i}].bags=this.value" onkeydown="_onPurKeydown(event, ${i}, 'bags')" />
        <input type="number" class="pur-item-qty" placeholder="Qty" value="${esc(item.quantity)}" min="0" step="0.01"
          data-index="${i}" onkeydown="_onPurKeydown(event, ${i}, 'qty')" oninput="_purItems[${i}].quantity=this.value;calcPurRowTotal(${i})" />
        <select class="pur-item-unit" data-index="${i}" onkeydown="_onPurKeydown(event, ${i}, 'unit')" onchange="_purItems[${i}].unit=this.value;calcPurRowTotal(${i})">
          ${['kg','g','pc','bunch','bag','dozen','quintal'].map(u => `<option ${item.unit===u?'selected':''}>${u}</option>`).join('')}
        </select>
        <input type="number" class="pur-item-price" placeholder="₹/unit" value="${esc(item.pricePerUnit)}" min="0" step="0.01"
          data-index="${i}" onkeydown="_onPurKeydown(event, ${i}, 'price')" oninput="_purItems[${i}].pricePerUnit=this.value;calcPurRowTotal(${i})" />
        <div class="pur-item-total" id="pur-row-total-${i}">₹${fmtNum(item.totalPrice)}</div>
        <button class="pur-item-del" onclick="removePurItem(${i})">✕</button>
      </div>`).join('');

    container.innerHTML = `
      <div class="pur-table-header">
        <div>Item</div>
        <div>Bags</div>
        <div>Qty</div>
        <div>Unit</div>
        <div>Rate (₹)</div>
        <div>Total</div>
        <div></div>
      </div>
      <div class="pur-table-body">${rows}</div>`;
  } else {
    // Mobile view: card layout
    const cards = _purItems.map((item, i) => `
      <div class="pur-card" data-index="${i}">
          <div class="pur-card-row" style="position:relative;">
            <label>Item</label>
            <div style="position:relative;">
              <input type="text" class="pur-item-name" placeholder="Item name" value="${esc(item.itemName)}"
                data-index="${i}" oninput="_onPurItemInput(event, ${i})" onkeydown="_onPurKeydown(event, ${i}, 'name')" onfocus="_showPurAutocomplete(${i})" />
              <div id="pur-autocomplete-mobile-${i}" class="autocomplete-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1px solid var(--border2);border-radius:4px;max-height:150px;overflow-y:auto;z-index:100;"></div>
            </div>
        </div>
        <div class="pur-card-row">
          <label>Bags</label>
          <input type="text" class="pur-item-bags" placeholder="Bags" value="${esc(item.bags)}"
            data-index="${i}" oninput="_purItems[${i}].bags=this.value" onkeydown="_onPurKeydown(event, ${i}, 'bags')" />
        </div>
        <div class="pur-card-row">
          <label>Qty × Unit</label>
          <div style="display:flex;gap:5px;">
            <input type="number" class="pur-item-qty" placeholder="Qty" value="${esc(item.quantity)}" min="0" step="0.01" style="flex:1;"
              data-index="${i}" onkeydown="_onPurKeydown(event, ${i}, 'qty')" oninput="_purItems[${i}].quantity=this.value;calcPurRowTotal(${i})" />
            <select class="pur-item-unit" data-index="${i}" style="flex:0.8;" onkeydown="_onPurKeydown(event, ${i}, 'unit')" onchange="_purItems[${i}].unit=this.value;calcPurRowTotal(${i})">
              ${['kg','g','pc','bunch','bag','dozen','quintal'].map(u => `<option ${item.unit===u?'selected':''}>${u}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="pur-card-row">
          <label>Rate (₹)</label>
          <input type="number" class="pur-item-price" placeholder="Price/unit" value="${esc(item.pricePerUnit)}" min="0" step="0.01"
            data-index="${i}" onkeydown="_onPurKeydown(event, ${i}, 'price')" oninput="_purItems[${i}].pricePerUnit=this.value;calcPurRowTotal(${i})" />
        </div>
        <div class="pur-card-summary">
          <span>Total</span>
          <span style="font-weight:bold;color:var(--amber);" id="pur-row-total-${i}">₹${fmtNum(item.totalPrice)}</span>
          <button class="pur-item-del" onclick="removePurItem(${i})" style="margin-left:auto;">✕</button>
        </div>
      </div>`).join('');

    container.innerHTML = `<div class="pur-cards-wrapper">${cards}</div>`;
  }
}

function _onPurKeydown(e, i, field) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  
  const item = _purItems[i];
  const isLastItem = i === _purItems.length - 1;
  const hasData = item.itemName && item.quantity && item.pricePerUnit;
  
  if (isLastItem && hasData) {
    // Add new blank item when Enter pressed on last row with data
    _purItems.push(_blankPurItem());
    renderPurItemsTable();
    // Focus the new row's item name field
    setTimeout(() => {
      const newInput = document.querySelector(`input[data-index="${_purItems.length - 1}"].pur-item-name`);
      if (newInput) newInput.focus();
    }, 100);
  } else {
    // Move to next field
    const fields = ['name', 'bags', 'qty', 'unit', 'price'];
    const currIdx = fields.indexOf(field);
    if (currIdx < fields.length - 1) {
      const nextField = fields[currIdx + 1];
      const selector = {name:'.pur-item-name', bags:'.pur-item-bags', qty:'.pur-item-qty', unit:'.pur-item-unit', price:'.pur-item-price'}[nextField];
      const nextInput = document.querySelector(`${selector}[data-index="${i}"]`);
      if (nextInput) nextInput.focus();
    } else {
      // Last field, move to next row
      if (i + 1 < _purItems.length) {
        const nextInput = document.querySelector(`.pur-item-name[data-index="${i + 1}"]`);
        if (nextInput) nextInput.focus();
      }
    }
  }
}

function calcPurRowTotal(i) {
  const qty = Number(_purItems[i].quantity) || 0;
  const price = Number(_purItems[i].pricePerUnit) || 0;
  _purItems[i].totalPrice = (qty * price).toFixed(2);
  const el = document.getElementById('pur-row-total-' + i);
  if (el) el.textContent = '₹' + fmtNum(_purItems[i].totalPrice);
  recalcPur();
}

function recalcPur() {
  const sub = _purItems.reduce((s, i) => s + Number(i.totalPrice || 0), 0);
  const sungam = Number(document.getElementById('pur-sungam')?.value || 0);
  const grand = sub + sungam;
  const paid = Number(document.getElementById('pur-paid')?.value || 0);
  const less = Number(document.getElementById('pur-less')?.value || 0);
  const adjustment = Number(document.getElementById('pur-adjustment')?.value || 0);
  const effectiveTotal = grand - less - adjustment;

  const el = id => document.getElementById(id);
  if (el('pur-subtotal')) el('pur-subtotal').textContent = fmtCurrency(sub);
  if (el('pur-sungam-display')) el('pur-sungam-display').textContent = fmtCurrency(sungam);
  if (el('pur-grandtotal')) el('pur-grandtotal').textContent = fmtCurrency(grand);

  const balRow = el('pur-balance-row');
  if (balRow && paid > 0) {
    const bal = effectiveTotal - paid;
    balRow.style.display = 'flex';
    el('pur-balance-label').textContent = bal > 0 ? 'Balance Due' : 'Balance Return';
    el('pur-balance-amt').textContent = fmtCurrency(Math.abs(bal));
    el('pur-balance-amt').style.color = bal > 0 ? 'var(--red)' : 'var(--green)';
  } else if (balRow) {
    balRow.style.display = 'none';
  }
}

function removePurItem(i) {
  _purItems.splice(i, 1);
  if (_purItems.length === 0) _purItems.push(_blankPurItem());
  renderPurItemsTable();
}

function _getPurItemSuggestions(input) {
  if (!input || input.length < 1) return [];
  const items = DB.getItems();
  const q = input.toLowerCase();
  return items.filter(item => 
    (item.name && item.name.toLowerCase().includes(q)) || 
    (item.tamil && item.tamil.toLowerCase().includes(q))
  ).slice(0, 8); // Show max 8 suggestions
}

function _hidePurAutocomplete(i) {
  setTimeout(() => {
    const d1 = document.getElementById('pur-autocomplete-' + i);
    const d2 = document.getElementById('pur-autocomplete-mobile-' + i);
    if(d1) d1.style.display = 'none';
    if(d2) d2.style.display = 'none';
    delete _purAcHighlight[i];
  }, 200);
}

function _onPurItemKeydown(e, i) {
  const isMobile = window.innerWidth < 480;
  const dropdownId = isMobile ? `pur-autocomplete-mobile-${i}` : `pur-autocomplete-${i}`;
  const dropdown = document.getElementById(dropdownId);
  const input = document.querySelector(`.pur-item-name[data-index="${i}"]`);
  
  const isOpen = dropdown && dropdown.style.display !== 'none';
  const suggestions = _getPurItemSuggestions(input ? input.value : '');

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (isOpen && suggestions.length > 0) {
      _purAcHighlight[i] = Math.min((_purAcHighlight[i] || 0) + 1, suggestions.length - 1);
      _showPurAutocomplete(i, input.value);
    }
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (isOpen) {
      _purAcHighlight[i] = Math.max((_purAcHighlight[i] || 0) - 1, 0);
      _showPurAutocomplete(i, input.value);
    }
    return;
  }
  if (e.key === 'Enter' || e.key === 'Tab') {
    if (isOpen && suggestions.length > 0) {
      e.preventDefault();
      const idx = _purAcHighlight[i] || 0;
      _selectPurItem(i, suggestions[idx].id);
      return;
    }
    if (e.key === 'Tab') {
      _hidePurAutocomplete(i);
      const bagsInput = document.querySelector(`.pur-item-bags[data-index="${i}"]`);
      if (bagsInput) { e.preventDefault(); bagsInput.focus(); }
    }
    return;
  }
  if (e.key === 'Escape') {
    _hidePurAutocomplete(i);
    return;
  }
  
  // Original keydown logic for other keys if not handled
  if (e.key === 'Enter') {
    _onPurKeydown(e, i, 'name');
  }
}

function _onPurItemInput(e, i) {
  _purItems[i].itemName = e.target.value;
  _purAcHighlight[i] = 0;
  _showPurAutocomplete(i, e.target.value);
}

function _showPurAutocomplete(i, query) {
  const input = document.querySelector(`.pur-item-name[data-index="${i}"]`);
  const isMobile = window.innerWidth < 480;
  const dropdownId = isMobile ? `pur-autocomplete-mobile-${i}` : `pur-autocomplete-${i}`;
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  const val = query !== undefined ? query : input.value;
  const suggestions = _getPurItemSuggestions(val);

  if (suggestions.length > 0) {
    _purAutocompleteOpen = i;
    const highlighted = _purAcHighlight[i] || 0;
    
    dropdown.innerHTML = suggestions.map((item, idx) => `
      <div class="autocomplete-item ${idx === highlighted ? 'highlighted' : ''}"
        data-idx="${idx}"
        onmousedown="event.preventDefault();_selectPurItem(${i}, '${esc(item.id)}')"
        onmouseover="_setPurAcHighlight(${i}, ${idx})">
        <span class="ac-emoji">${item.emoji || '🥬'}</span>
        <div>
          <div class="ac-name">${esc(item.name)}</div>
          <div class="ac-detail">${esc(item.tamil || '')}${item.price > 0 ? ` · Last: ₹${item.price}` : ''}</div>
        </div>
      </div>`
    ).join('');
    dropdown.style.display = 'block';
  } else {
    dropdown.style.display = 'none';
    _purAutocompleteOpen = null;
  }
}

function _setPurAcHighlight(i, idx) {
  _purAcHighlight[i] = idx;
  const input = document.querySelector(`.pur-item-name[data-index="${i}"]`);
  _showPurAutocomplete(i, input ? input.value : '');
}

function _selectPurItem(i, itemId) {
  const items = DB.getItems();
  const found = items.find(it => it.id === itemId);
  if (!found) return;

  _purItems[i].itemName = found.name;
  _purItems[i].unit = found.unit || 'kg';
  if (found.price > 0) _purItems[i].pricePerUnit = found.price;

  const input = document.querySelector(`.pur-item-name[data-index="${i}"]`);
  if (input) input.value = found.name;
  const priceInput = document.querySelector(`.pur-item-price[data-index="${i}"]`);
  if (priceInput && found.price > 0) priceInput.value = found.price;

  const isMobile = window.innerWidth < 480;
  const dropdownId = isMobile ? `pur-autocomplete-mobile-${i}` : `pur-autocomplete-${i}`;
  const dropdown = document.getElementById(dropdownId);
  if (dropdown) dropdown.style.display = 'none';
  _purAutocompleteOpen = null;
  calcPurRowTotal(i);
  // Focus next field
  setTimeout(() => {
    const qtyInput = document.querySelector(`.pur-item-qty[data-index="${i}"]`);
    if (qtyInput) qtyInput.focus();
  }, 50);
}

function _buildPurchaseBill() {
  const validItems = _purItems.filter(i => i.itemName && Number(i.totalPrice) > 0);
  if (validItems.length === 0) return null;

  const dateVal = document.getElementById('pur-date').value;
  const sub = validItems.reduce((s, i) => s + Number(i.totalPrice || 0), 0);
  const sungam = Number(document.getElementById('pur-sungam').value || 0);
  const grand = sub + sungam;
  const less = Number(document.getElementById('pur-less').value || 0);
  const adjustment = Number(document.getElementById('pur-adjustment').value || 0);
  const paid = Number(document.getElementById('pur-paid').value || grand);
  const partyEl = document.getElementById('pur-party');
  const partyName = partyEl.value.trim();

  return {
    id: _editPurId || undefined,
    createdAt: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
    partyId: '', // No partyId since typed
    partyName,
    mobile: '',
    items: validItems,
    subTotal: sub.toFixed(2),
    sungam: sungam.toFixed(2),
    less: less.toFixed(2),
    adjustment: adjustment.toFixed(2),
    grandTotal: grand.toFixed(2),
    amountPaid: paid.toFixed(2),
    paymentMethod: document.getElementById('pur-payment-method').value,
  };
}

function savePurchaseBill() {
  const bill = _buildPurchaseBill();
  if (!bill) { showToast('⚠️ Add at least one item!', 'error'); return; }

  const saved = DB.savePurchase(bill);
  showToast('✅ Purchase saved! ' + saved.id, 'success');

  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="page" style="text-align:center;padding:48px 24px;">
      <div style="font-size:56px;margin-bottom:20px;">✅</div>
      <div style="font-size:20px;font-weight:800;margin-bottom:8px;color:var(--text);">Purchase Saved!</div>
      <div style="color:var(--text3);margin-bottom:8px;font-size:14px;">Bill: <strong>${saved.id}</strong></div>
      <div style="color:var(--text3);margin-bottom:30px;font-size:14px;">Total: <strong style="color:var(--amber)">${fmtCurrency(saved.grandTotal)}</strong></div>
      <div style="display:flex;flex-direction:column;gap:10px;max-width:280px;margin:0 auto;">
        <button class="btn btn-primary btn-full" onclick="printSingleBill('${saved.id}','purchase')">🖨️ Print Invoice</button>
        <button class="btn btn-secondary btn-full" onclick="navigateTo('add-purchase')">+ New Purchase</button>
        <button class="btn btn-secondary btn-full" onclick="navigateTo('home')">🏠 Go Home</button>
      </div>
    </div>`;
}

function savePurchaseBillAndPrint() {
  const bill = _buildPurchaseBill();
  if (!bill) { showToast('⚠️ Add at least one item!', 'error'); return; }

  const saved = DB.savePurchase(bill);
  showToast('✅ Saved! Opening print...', 'success');

  setTimeout(() => { printSingleBill(saved.id, 'purchase'); }, 300);

  setTimeout(() => {
    const container = document.getElementById('page-container');
    container.innerHTML = `
      <div class="page" style="text-align:center;padding:48px 24px;">
        <div style="font-size:56px;margin-bottom:20px;">🖨️</div>
        <div style="font-size:20px;font-weight:800;margin-bottom:8px;color:var(--text);">Purchase Printed!</div>
        <div style="color:var(--text3);margin-bottom:8px;font-size:14px;">Bill: <strong>${saved.id}</strong></div>
        <div style="color:var(--text3);margin-bottom:30px;font-size:14px;">Total: <strong style="color:var(--amber)">${fmtCurrency(saved.grandTotal)}</strong></div>
        <div style="display:flex;flex-direction:column;gap:10px;max-width:280px;margin:0 auto;">
          <button class="btn btn-primary btn-full" onclick="printSingleBill('${saved.id}','purchase')">🖨️ Print Again</button>
          <button class="btn btn-secondary btn-full" onclick="navigateTo('add-purchase')">+ New Purchase</button>
          <button class="btn btn-secondary btn-full" onclick="navigateTo('home')">🏠 Go Home</button>
        </div>
      </div>`;
  }, 600);
}
