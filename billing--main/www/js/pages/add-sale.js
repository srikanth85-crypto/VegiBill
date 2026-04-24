// ═══════════════════════════════════════════════════
//  VegiBill TN — pages/add-sale.js
// ═══════════════════════════════════════════════════

let _saleItems = [];
let _editSaleId = null;
let _acHighlight = {}; // { [rowIndex]: highlightedIdx }

function renderAddSale(container, params = {}) {
  _editSaleId = params.editId || null;
  let existing = _editSaleId ? DB.getSaleById(_editSaleId) : null;
  _saleItems = existing
    ? JSON.parse(JSON.stringify(existing.items || []))
    : [_blankSaleItem()];
  _acHighlight = {};

  setHeaderTitle(_editSaleId ? 'Edit Sale' : 'New Sale', 'Sale Bill');

  container.innerHTML = `
    <div class="page" id="add-sale-page">

      <!-- BILL INFO CARD -->
      <div class="card">
        <div class="form-group">
          <label class="form-label">📅 Sale Date</label>
          <input type="date" id="sale-date" value="${existing ? toDateKey(existing.createdAt) : todayISO()}" />
        </div>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">👤 Customer Name</label>
            <input type="text" id="sale-customer" placeholder="Optional" value="${existing ? esc(existing.partyName || '') : ''}" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">📱 Mobile</label>
            <input type="tel" id="sale-mobile" placeholder="10 digits" maxlength="10" value="${existing ? esc(existing.mobile || '') : ''}" />
          </div>
        </div>
      </div>

      <!-- ITEMS SECTION -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin:2px 0 10px;">
        <div class="font-bold text-sm text-muted" style="text-transform:uppercase;letter-spacing:.5px;">🛒 Bill Items</div>
        <button class="btn btn-primary btn-sm" onclick="addSaleItem()">+ Add Row</button>
      </div>
      <div id="sale-items-container"></div>

      <!-- SUNGAM (Market Levy/Tax) -->
      <div class="sungam-row">
        <span class="sungam-label">⚖️ Sungam (Market Levy)</span>
        <input class="sungam-input" type="number" id="sale-sungam" placeholder="0.00" min="0" step="0.01"
          value="${existing ? (existing.sungam || 0) : ''}" oninput="recalcSale()" />
      </div>

      <!-- PAYMENT METHOD -->
      <div class="form-group">
        <label class="form-label">💳 Payment Method</label>
        <div class="pay-chips" id="sale-pay-chips">
          ${['Cash', 'UPI', 'Credit', 'Cheque'].map(m => `
            <button class="pay-chip ${(existing?.paymentMethod || 'Cash') === m ? 'selected' : ''}"
              onclick="selectPayMethod(this,'${m}','sale')">${m}</button>`).join('')}
        </div>
      </div>
      <input type="hidden" id="sale-payment-method" value="${existing?.paymentMethod || 'Cash'}" />

      <!-- SUMMARY -->
      <div class="summary-box">
        <div class="summary-row"><span>Sub Total</span><span id="sale-subtotal">₹0.00</span></div>
        <div class="summary-row"><span>Sungam</span><span id="sale-sungam-display">₹0.00</span></div>
        <div class="summary-row total"><span>Grand Total</span><span id="sale-grandtotal">₹0.00</span></div>
        <hr class="divider" style="margin:10px 0;"/>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Amount Paid (₹)</label>
            <input type="number" id="sale-paid" placeholder="Enter paid" min="0"
              value="${existing ? (existing.amountPaid || '') : ''}" oninput="recalcSale()" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Less / Discount (₹)</label>
            <input type="number" id="sale-less" placeholder="0" min="0" step="0.01"
              value="${existing ? (existing.less || '') : ''}" oninput="recalcSale()" />
          </div>
        </div>
        <div class="summary-row balance" id="sale-balance-row" style="display:none;margin-top:8px;">
          <span id="sale-balance-label">Balance</span>
          <span id="sale-balance-amt"></span>
        </div>
      </div>

      <!-- SAVE BUTTONS -->
      <div style="display:flex;gap:10px;margin-top:16px;padding-bottom:24px;">
        <button class="btn btn-secondary flex-1" onclick="goBack()">Cancel</button>
        <button class="btn btn-primary flex-1" onclick="saveSaleBill()">
          💾 ${_editSaleId ? 'Update' : 'Save'}
        </button>
        <button class="btn btn-blue flex-1" onclick="saveSaleBillAndPrint()" style="background:#2563eb;color:#fff;border:none;">
          🖨️ Save & Print
        </button>
      </div>

    </div>`;

  renderSaleItemsTable();
  recalcSale();

  // Close all dropdowns on outside click
  document.addEventListener('click', _closeSaleAcOnOutsideClick, true);
}

function _blankSaleItem() {
  return { itemName: '', bags: '', quantity: '', unit: 'kg', pricePerUnit: '', totalPrice: '' };
}

// ── RENDER TABLE ──────────────────────────────────────
function renderSaleItemsTable() {
  const container = document.getElementById('sale-items-container');
  if (!container) return;

  if (_saleItems.length === 0) {
    container.innerHTML = '';
    return;
  }

  // Header
  let html = `
    <div style="display:grid;grid-template-columns:2fr .65fr .8fr .65fr .85fr 34px;gap:5px;
      padding:8px 12px;background:var(--bg3);border:1px solid var(--border);
      border-radius:var(--radius-sm) var(--radius-sm) 0 0;">
      <span style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">Item / பொருள்</span>
      <span style="font-size:10px;font-weight:700;color:var(--text3);">Bags</span>
      <span style="font-size:10px;font-weight:700;color:var(--text3);">Qty (Wt)</span>
      <span style="font-size:10px;font-weight:700;color:var(--text3);">Unit</span>
      <span style="font-size:10px;font-weight:700;color:var(--text3);">₹/Unit</span>
      <span></span>
    </div>
    <div style="border:1px solid var(--border);border-top:none;border-radius:0 0 var(--radius-sm) var(--radius-sm);overflow:visible;margin-bottom:10px;">`;

  _saleItems.forEach((item, i) => {
    html += `
      <div style="display:grid;grid-template-columns:2fr .65fr .8fr .65fr .85fr 34px;gap:5px;
        padding:8px 10px;border-bottom:1px solid var(--border);background:var(--bg2);
        align-items:center;position:relative;" id="sale-row-${i}">

        <!-- ITEM NAME + DROPDOWN -->
        <div style="position:relative;overflow:visible;">
          <input
            type="text"
            id="sale-item-name-${i}"
            placeholder="Type item name..."
            value="${esc(item.itemName)}"
            autocomplete="off"
            oninput="_onSaleItemInput(event,${i})"
            onkeydown="_onSaleItemKeydown(event,${i})"
            onfocus="_showSaleAc(${i})"
            style="font-size:13px;padding:7px 9px;border-radius:6px;border:1.5px solid var(--border2);background:var(--bg2);width:100%;" />
          <div id="sale-ac-${i}" class="autocomplete-dropdown"></div>
        </div>

        <!-- BAGS -->
        <input type="text" placeholder="Bags" value="${esc(item.bags)}"
          oninput="_saleItems[${i}].bags=this.value"
          onkeydown="_onSaleFieldKeydown(event,${i},'bags')"
          style="font-size:13px;padding:7px 8px;" />

        <!-- QUANTITY / WEIGHT -->
        <input type="number" placeholder="Wt" value="${esc(item.quantity)}" min="0" step="0.01"
          id="sale-qty-${i}"
          oninput="_saleItems[${i}].quantity=this.value;calcRowTotal(${i})"
          onkeydown="_onSaleFieldKeydown(event,${i},'qty')"
          style="font-size:13px;padding:7px 8px;" />

        <!-- UNIT -->
        <select onchange="_saleItems[${i}].unit=this.value" style="font-size:12px;padding:5px 4px;">
          ${['kg','g','pc','bunch','bag','dozen','quintal'].map(u =>
            `<option ${item.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
        </select>

        <!-- RATE -->
        <div style="position:relative;">
          <input type="number" placeholder="₹/unit" value="${esc(item.pricePerUnit)}" min="0" step="0.01"
            id="sale-rate-${i}"
            oninput="_saleItems[${i}].pricePerUnit=this.value;calcRowTotal(${i})"
            onkeydown="_onSaleFieldKeydown(event,${i},'rate')"
            style="font-size:13px;padding:7px 8px;" />
          <div style="font-size:11px;font-weight:700;color:var(--primary);text-align:right;margin-top:2px;"
            id="sale-row-total-${i}">₹${fmtNum(item.totalPrice)}</div>
        </div>

        <!-- DELETE -->
        <button onclick="removeSaleItem(${i})"
          style="width:28px;height:28px;border-radius:6px;background:var(--red-bg);color:var(--red);
            border:1px solid #fca5a5;font-size:14px;display:flex;align-items:center;justify-content:center;
            flex-shrink:0;cursor:pointer;transition:background .15s;"
          onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='var(--red-bg)'">✕</button>
      </div>`;
  });

  html += `</div>`;
  container.innerHTML = html;
  recalcSale();
}

// ── AUTOCOMPLETE LOGIC ────────────────────────────────
function _getSaleItemSuggestions(query) {
  if (!query || query.length < 1) return [];
  const items = DB.getItems();
  const q = query.toLowerCase();
  return items.filter(item =>
    item.name.toLowerCase().includes(q) ||
    (item.tamil && item.tamil.toLowerCase().includes(q))
  ).slice(0, 8);
}

function _showSaleAc(i) {
  const input = document.getElementById(`sale-item-name-${i}`);
  const dropdown = document.getElementById(`sale-ac-${i}`);
  if (!input || !dropdown) return;
  _renderSaleDropdown(i, input.value);
}

function _renderSaleDropdown(i, query) {
  const dropdown = document.getElementById(`sale-ac-${i}`);
  if (!dropdown) return;

  const suggestions = _getSaleItemSuggestions(query);
  if (suggestions.length === 0) { dropdown.style.display = 'none'; return; }

  const highlighted = _acHighlight[i] || 0;

  dropdown.innerHTML = suggestions.map((item, idx) => `
    <div class="autocomplete-item ${idx === highlighted ? 'highlighted' : ''}"
      data-idx="${idx}"
      onmousedown="event.preventDefault();_selectSaleItem(${i},'${esc(item.id)}')"
      onmouseover="_setAcHighlight(${i},${idx})">
      <span class="ac-emoji">${item.emoji || '🥬'}</span>
      <div>
        <div class="ac-name">${esc(item.name)}</div>
        <div class="ac-detail">${esc(item.tamil || '')}${item.price > 0 ? ` · Last: ₹${item.price}` : ''}</div>
      </div>
    </div>`
  ).join('');
  dropdown.style.display = 'block';
}

function _setAcHighlight(i, idx) {
  _acHighlight[i] = idx;
  _renderSaleDropdown(i, document.getElementById(`sale-item-name-${i}`)?.value || '');
}

function _hideSaleAc(i) {
  const dropdown = document.getElementById(`sale-ac-${i}`);
  if (dropdown) dropdown.style.display = 'none';
  delete _acHighlight[i];
}

function _hideSaleAcDelayed(i) {
  setTimeout(() => _hideSaleAc(i), 150);
}

function _closeSaleAcOnOutsideClick(e) {
  _saleItems.forEach((_, i) => {
    const row = document.getElementById(`sale-row-${i}`);
    if (row && !row.contains(e.target)) _hideSaleAc(i);
  });
}

function _onSaleItemInput(e, i) {
  _saleItems[i].itemName = e.target.value;
  _acHighlight[i] = 0;
  _renderSaleDropdown(i, e.target.value);
}

function _onSaleItemKeydown(e, i) {
  const dropdown = document.getElementById(`sale-ac-${i}`);
  const isOpen = dropdown && dropdown.style.display !== 'none';
  const suggestions = _getSaleItemSuggestions(document.getElementById(`sale-item-name-${i}`)?.value || '');

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (isOpen && suggestions.length > 0) {
      _acHighlight[i] = Math.min((_acHighlight[i] || 0) + 1, suggestions.length - 1);
      _renderSaleDropdown(i, document.getElementById(`sale-item-name-${i}`)?.value || '');
    }
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (isOpen) {
      _acHighlight[i] = Math.max((_acHighlight[i] || 0) - 1, 0);
      _renderSaleDropdown(i, document.getElementById(`sale-item-name-${i}`)?.value || '');
    }
    return;
  }
  if (e.key === 'Enter' || e.key === 'Tab') {
    if (isOpen && suggestions.length > 0) {
      e.preventDefault();
      const idx = _acHighlight[i] || 0;
      _selectSaleItem(i, suggestions[idx].id);
      return;
    }
    if (e.key === 'Tab') {
      _hideSaleAc(i);
      // Move to bags field
      const bagsInput = document.querySelector(`#sale-row-${i} input[placeholder="Bags"]`);
      if (bagsInput) { e.preventDefault(); bagsInput.focus(); }
    }
    return;
  }
  if (e.key === 'Escape') {
    _hideSaleAc(i);
    return;
  }
}

function _selectSaleItem(i, itemId) {
  const items = DB.getItems();
  const found = items.find(it => it.id === itemId);
  if (!found) return;

  _saleItems[i].itemName = found.name;
  _saleItems[i].unit = found.unit || 'kg';
  if (found.price > 0) {
    _saleItems[i].pricePerUnit = found.price;
  }

  // Update DOM without full re-render for smooth UX
  const nameInput = document.getElementById(`sale-item-name-${i}`);
  if (nameInput) nameInput.value = found.name;

  const rateInput = document.getElementById(`sale-rate-${i}`);
  if (rateInput && found.price > 0) rateInput.value = found.price;

  _hideSaleAc(i);
  calcRowTotal(i);

  // Focus quantity field
  setTimeout(() => {
    const qtyInput = document.getElementById(`sale-qty-${i}`);
    if (qtyInput) qtyInput.focus();
  }, 50);
}

function _onSaleFieldKeydown(e, i, field) {
  if (e.key !== 'Enter') return;
  e.preventDefault();

  const item = _saleItems[i];
  const isLast = i === _saleItems.length - 1;
  const hasData = item.itemName && item.quantity;

  if (isLast && hasData && field === 'rate') {
    addSaleItem();
    setTimeout(() => {
      const newInput = document.getElementById(`sale-item-name-${_saleItems.length - 1}`);
      if (newInput) newInput.focus();
    }, 50);
  } else {
    // Move to next field in same row
    const fieldsOrder = ['name', 'bags', 'qty', 'rate'];
    const nextField = fieldsOrder[fieldsOrder.indexOf(field) + 1];
    if (nextField) {
      const nextSel = nextField === 'name'
        ? `#sale-item-name-${i}`
        : nextField === 'bags'
          ? `#sale-row-${i} input[placeholder="Bags"]`
          : nextField === 'qty'
            ? `#sale-qty-${i}`
            : `#sale-rate-${i}`;
      const el = document.querySelector(nextSel);
      if (el) el.focus();
    }
  }
}

// ── ROW CALCULATION ───────────────────────────────────
function calcRowTotal(i) {
  const qty   = Number(_saleItems[i].quantity)    || 0;
  const price = Number(_saleItems[i].pricePerUnit) || 0;
  _saleItems[i].totalPrice = (qty * price).toFixed(2);
  const el = document.getElementById('sale-row-total-' + i);
  if (el) el.textContent = '₹' + fmtNum(_saleItems[i].totalPrice);
  recalcSale();
}

function recalcSale() {
  const sub    = _saleItems.reduce((s, i) => s + Number(i.totalPrice || 0), 0);
  const sungam = Number(document.getElementById('sale-sungam')?.value || 0);
  const grand  = sub + sungam;
  const paid   = Number(document.getElementById('sale-paid')?.value || 0);
  const less   = Number(document.getElementById('sale-less')?.value || 0);
  const effectiveTotal = grand - less;

  const el = id => document.getElementById(id);
  if (el('sale-subtotal'))       el('sale-subtotal').textContent       = fmtCurrency(sub);
  if (el('sale-sungam-display')) el('sale-sungam-display').textContent = fmtCurrency(sungam);
  if (el('sale-grandtotal'))     el('sale-grandtotal').textContent     = fmtCurrency(grand);

  const balRow = el('sale-balance-row');
  if (balRow && paid > 0) {
    const bal = effectiveTotal - paid;
    balRow.style.display = 'flex';
    el('sale-balance-label').textContent = bal > 0 ? 'Balance Due' : 'Balance Return';
    el('sale-balance-amt').textContent   = fmtCurrency(Math.abs(bal));
    el('sale-balance-amt').style.color   = bal > 0 ? 'var(--red)' : 'var(--primary)';
  } else if (balRow) {
    balRow.style.display = 'none';
  }
}

function addSaleItem() {
  _saleItems.push(_blankSaleItem());
  renderSaleItemsTable();
  // Auto-focus last item name
  setTimeout(() => {
    const lastIdx = _saleItems.length - 1;
    const el = document.getElementById(`sale-item-name-${lastIdx}`);
    if (el) el.focus();
  }, 60);
}

function removeSaleItem(i) {
  _saleItems.splice(i, 1);
  if (_saleItems.length === 0) _saleItems.push(_blankSaleItem());
  renderSaleItemsTable();
}

function selectPayMethod(btn, method, type) {
  const chips = btn.parentElement.querySelectorAll('.pay-chip');
  chips.forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
  const hiddenInput = document.getElementById(type === 'sale' ? 'sale-payment-method' : 'pur-payment-method');
  if (hiddenInput) hiddenInput.value = method;
}

// ── BUILD BILL OBJECT ─────────────────────────────────
function _buildSaleBill() {
  const validItems = _saleItems.filter(i => i.itemName && Number(i.totalPrice) > 0);
  if (validItems.length === 0) return null;

  const dateVal = document.getElementById('sale-date').value;
  const sub     = validItems.reduce((s, i) => s + Number(i.totalPrice || 0), 0);
  const sungam  = Number(document.getElementById('sale-sungam').value || 0);
  const grand   = sub + sungam;
  const paid    = Number(document.getElementById('sale-paid').value || grand);
  const less    = Number(document.getElementById('sale-less').value || 0);

  return {
    id:            _editSaleId || undefined,
    createdAt:     dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
    partyName:     document.getElementById('sale-customer').value.trim(),
    mobile:        document.getElementById('sale-mobile').value.trim(),
    items:         validItems,
    subTotal:      sub.toFixed(2),
    sungam:        sungam.toFixed(2),
    less:          less.toFixed(2),
    grandTotal:    grand.toFixed(2),
    amountPaid:    paid.toFixed(2),
    paymentMethod: document.getElementById('sale-payment-method').value,
  };
}

// ── SAVE / PRINT ──────────────────────────────────────
function saveSaleBill() {
  const bill = _buildSaleBill();
  if (!bill) { showToast('⚠️ Add at least one item with price!', 'error'); return; }

  const saved = DB.saveSale(bill);
  showToast('✅ Bill saved! ' + saved.id, 'success');
  document.removeEventListener('click', _closeSaleAcOnOutsideClick, true);

  document.getElementById('page-container').innerHTML = `
    <div class="page" style="text-align:center;padding:48px 24px;">
      <div style="font-size:56px;margin-bottom:20px;">✅</div>
      <div style="font-size:20px;font-weight:800;margin-bottom:8px;color:var(--text);">Bill Saved!</div>
      <div style="color:var(--text3);margin-bottom:8px;font-size:14px;">Invoice: <strong>${saved.id}</strong></div>
      <div style="color:var(--text3);margin-bottom:30px;font-size:14px;">Total: <strong style="color:var(--primary)">${fmtCurrency(saved.grandTotal)}</strong></div>
      <div style="display:flex;flex-direction:column;gap:10px;max-width:280px;margin:0 auto;">
        <button class="btn btn-primary btn-full" onclick="printSingleBill('${saved.id}','sale')">🖨️ Print Invoice</button>
        <button class="btn btn-blue btn-full" style="background:#2563eb;color:#fff;border:none;" onclick="navigateTo('add-sale')">+ New Sale</button>
        <button class="btn btn-secondary btn-full" onclick="navigateTo('home')">🏠 Go Home</button>
      </div>
    </div>`;
}

function saveSaleBillAndPrint() {
  const bill = _buildSaleBill();
  if (!bill) { showToast('⚠️ Add at least one item with price!', 'error'); return; }

  const saved = DB.saveSale(bill);
  showToast('✅ Saved! Opening print...', 'success');
  document.removeEventListener('click', _closeSaleAcOnOutsideClick, true);

  setTimeout(() => {
    printSingleBill(saved.id, 'sale');
  }, 300);

  setTimeout(() => {
    document.getElementById('page-container').innerHTML = `
      <div class="page" style="text-align:center;padding:48px 24px;">
        <div style="font-size:56px;margin-bottom:20px;">🖨️</div>
        <div style="font-size:20px;font-weight:800;margin-bottom:8px;color:var(--text);">Bill Printed!</div>
        <div style="color:var(--text3);margin-bottom:8px;font-size:14px;">Invoice: <strong>${saved.id}</strong></div>
        <div style="color:var(--text3);margin-bottom:30px;font-size:14px;">Total: <strong style="color:var(--primary)">${fmtCurrency(saved.grandTotal)}</strong></div>
        <div style="display:flex;flex-direction:column;gap:10px;max-width:280px;margin:0 auto;">
          <button class="btn btn-primary btn-full" onclick="printSingleBill('${saved.id}','sale')">🖨️ Print Again</button>
          <button class="btn btn-blue btn-full" style="background:#2563eb;color:#fff;border:none;" onclick="navigateTo('add-sale')">+ New Sale</button>
          <button class="btn btn-secondary btn-full" onclick="navigateTo('home')">🏠 Go Home</button>
        </div>
      </div>`;
  }, 600);
}
