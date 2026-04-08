// ================================================
// VegiBill TN - pages/items.js
// ================================================

function renderItems(container) {
  setHeaderTitle('Items', 'Veg list with local rates');

  const items = _sortedItems();

  container.innerHTML = `
    <div class="search-wrap" style="padding-top:12px;">
      <div class="search-input">
        <input type="text" id="items-search" placeholder="Search English / Tamil item name..." oninput="_filterItemsList()" />
      </div>
    </div>

    <div style="padding:0 12px 10px;display:flex;gap:8px;">
      <button class="btn btn-primary btn-sm" style="margin-left:auto;" onclick="_openAddItemModal()">+ Add Item</button>
    </div>

    <div class="card" style="margin:0 12px 10px;">
      <div style="font-size:12px;color:var(--text2);line-height:1.45;">
        Update <strong>Price per KG</strong> whenever market rate changes. Values are saved instantly.
      </div>
    </div>

    <div class="card" style="margin:0 12px 20px;padding:0;overflow:hidden;">
      <div class="items-head">
        <div>Vegetable (English / Tamil)</div>
        <div style="text-align:right;">Price / KG</div>
      </div>
      <div id="items-list-wrap">
        ${items.map(item => _itemPriceRow(item)).join('')}
      </div>
    </div>`;
}

function _sortedItems() {
  const items = DB.getItems();
  return [...items].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

function _itemPriceRow(item) {
  return `
    <div class="item-price-row" id="item-row-${item.id}">
      <div>
        <div class="item-name-en">${esc(item.name || '')}</div>
        <div class="item-name-ta">${esc(item.tamil || '')}</div>
      </div>
      <div>
        <input class="item-price-input" type="number" min="0" step="0.01"
          value="${Number(item.price || 0)}"
          oninput="_updateItemPrice('${item.id}', this.value)"
          placeholder="0.00" />
      </div>
    </div>`;
}

function _filterItemsList() {
  const q = (document.getElementById('items-search')?.value || '').trim().toLowerCase();
  const items = _sortedItems();

  const html = items
    .filter(item => {
      const en = (item.name || '').toLowerCase();
      const ta = (item.tamil || '').toLowerCase();
      return !q || en.includes(q) || ta.includes(q);
    })
    .map(item => _itemPriceRow(item))
    .join('');

  const wrap = document.getElementById('items-list-wrap');
  if (wrap) {
    wrap.innerHTML = html || `<div class="empty-state" style="padding:22px 16px;"><div class="empty-title">No matching items</div></div>`;
  }
}

function _updateItemPrice(itemId, val) {
  const items = DB.getItems();
  const item = items.find(i => i.id === itemId);
  if (!item) return;

  const parsed = Number(val);
  item.price = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  DB.saveItem(item);
}

function _openAddItemModal() {
  openModal(`
    <div class="modal-title">
      Add New Item
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>

    <div class="form-group">
      <label class="form-label">Vegetable Name (English) *</label>
      <input type="text" id="m-item-name" placeholder="e.g. Snake Gourd"
        oninput="_autoFillTamilName(this.value)" />
    </div>

    <div class="form-group">
      <label class="form-label">Vegetable Name (Tamil)</label>
      <input type="text" id="m-item-tamil" placeholder="Tamil name auto-filled" />
    </div>

    <div class="form-group">
      <label class="form-label">Price per KG *</label>
      <input type="number" id="m-item-price" min="0" step="0.01" placeholder="0.00" />
    </div>

    <div style="display:flex;gap:10px;margin-top:4px;">
      <button class="btn btn-secondary flex-1" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary flex-1" onclick="_saveNewItem()">💾 Save Item</button>
    </div>
  `);

  setTimeout(() => document.getElementById('m-item-name')?.focus(), 100);
}

function _saveNewItem() {
  const name = (document.getElementById('m-item-name')?.value || '').trim();
  const tamil = (document.getElementById('m-item-tamil')?.value || '').trim();
  const priceNum = Number(document.getElementById('m-item-price')?.value || 0);

  if (!name) { showToast('⚠️ Enter vegetable name'); return; }
  if (!Number.isFinite(priceNum) || priceNum < 0) { showToast('⚠️ Enter valid price'); return; }

  const items = DB.getItems();
  const existing = items.find(i => (i.name || '').toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.tamil = tamil || existing.tamil || _autoTamilFromEnglish(name);
    existing.price = priceNum;
    existing.unit = 'kg';
    DB.saveItem(existing);
    closeModal();
    showToast('✅ Item updated');
    _refreshItemsView();
    return;
  }

  const id = _uniqueItemId(name);
  DB.saveItem({
    id,
    name,
    tamil: tamil || _autoTamilFromEnglish(name),
    price: priceNum,
    unit: 'kg',
    emoji: '🥬',
  });

  closeModal();
  showToast('✅ New item added');
  _refreshItemsView();
}

function _refreshItemsView() {
  const container = document.getElementById('page-container');
  if (!container) return;
  renderItems(container);
}

function _uniqueItemId(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
  const items = DB.getItems();
  let id = base;
  let n = 2;
  while (items.some(i => i.id === id)) {
    id = `${base}-${n}`;
    n++;
  }
  return id;
}

function _autoFillTamilName(englishName) {
  const tamilInput = document.getElementById('m-item-tamil');
  if (!tamilInput) return;
  tamilInput.value = _autoTamilFromEnglish(englishName || '');
}

function _autoTamilFromEnglish(englishName) {
  const raw = (englishName || '').trim();
  if (!raw) return '';
  const key = raw.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

  const map = {
    onion: 'வெங்காயம்',
    tomato: 'தக்காளி',
    potato: 'உருளைக்கிழங்கு',
    carrot: 'கேரட்',
    beans: 'பீன்ஸ்',
    brinjal: 'கத்திரிக்காய்',
    eggplant: 'கத்திரிக்காய்',
    capsicum: 'குடமிளகாய்',
    ladyfinger: 'வெண்டைக்காய்',
    okra: 'வெண்டைக்காய்',
    bittergourd: 'பாகற்காய்',
    drumstick: 'முருங்கைக்காய்',
    coconut: 'தேங்காய்',
    lemon: 'எலுமிச்சை',
    spinach: 'கீரை',
    cucumber: 'வெள்ளரி',
    pumpkin: 'பூசணிக்காய்',
    cabbage: 'முட்டைக்கோஸ்',
    cauliflower: 'காலிஃப்ளவர்',
    beetroot: 'பீட்ரூட்',
    radish: 'முள்ளங்கி',
    turnip: 'டர்னிப்',
    'broad beans': 'அவரைக்காய்',
    'cluster beans': 'கொத்தவரங்காய்',
    'green peas': 'பட்டாணி',
    peas: 'பட்டாணி',
    'raw banana': 'வாழைக்காய்',
    'banana flower': 'வாழைப்பூ',
    'banana stem': 'வாழைத்தண்டு',
    'ash gourd': 'வெள்ளைப்பூசணி',
    'bottle gourd': 'சுரைக்காய்',
    'ridge gourd': 'பீர்க்கங்காய்',
    'snake gourd': 'புடலங்காய்',
    'ivy gourd': 'கோவைக்காய்',
    chayote: 'சௌ சௌ',
    yam: 'சேனைக்கிழங்கு',
    colocasia: 'சேப்பங்கிழங்கு',
    'sweet potato': 'சர்க்கரைவள்ளிக்கிழங்கு',
    ginger: 'இஞ்சி',
    garlic: 'பூண்டு',
    chilli: 'மிளகாய்',
    'green chilli': 'பச்சை மிளகாய்',
    'red chilli': 'சிவப்பு மிளகாய்',
    coriander: 'கொத்தமல்லி',
    mint: 'புதினா',
    'curry leaf': 'கருவேப்பிலை',
    mushroom: 'காளான்',
    broccoli: 'ப்ரோகோலி',
    lettuce: 'லெட்டூஸ்',
    'sweet corn': 'சோளம்',
    corn: 'சோளம்',
    shallot: 'சின்ன வெங்காயம்',
    'raw mango': 'மாங்காய்',
  };

  if (map[key]) return map[key];
  return _tamilPhoneticFallback(raw);
}

function _tamilPhoneticFallback(text) {
  let s = (text || '').toLowerCase();

  const digraphs = [
    ['ng', 'ங்'], ['sh', 'ஷ்'], ['ch', 'ச்'], ['th', 'த்'], ['dh', 'த்'],
    ['ph', 'ஃப்'], ['bh', 'ப்'], ['kh', 'க்'], ['aa', 'ஆ'], ['ee', 'ஈ'],
    ['oo', 'ஊ'], ['ai', 'ஐ'], ['au', 'ஔ']
  ];
  digraphs.forEach(([en, ta]) => {
    s = s.replace(new RegExp(en, 'g'), ta);
  });

  const chars = {
    a:'அ', b:'ப்', c:'க்', d:'ட்', e:'எ', f:'ஃப்', g:'க்', h:'ஹ்', i:'இ', j:'ஜ்',
    k:'க்', l:'ல்', m:'ம்', n:'ன்', o:'ஒ', p:'ப்', q:'க்', r:'ர்', s:'ஸ்',
    t:'ட்', u:'உ', v:'வ்', w:'வ்', x:'க்ஸ்', y:'ய்', z:'ஸ்', ' ':' '
  };

  let out = '';
  for (let i = 0; i < s.length; i++) {
    out += chars[s[i]] || s[i];
  }
  return out.replace(/\s+/g, ' ').trim();
}
