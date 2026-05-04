// ═══════════════════════════════════════════════════
//  VegiBill TN — db.js  (Local Storage Database)
// ═══════════════════════════════════════════════════

const DB = (() => {

  // ── GENERIC HELPERS ──────────────────────────────
  function read(key, fallback = []) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { console.error('DB write error', e); }
  }

  // ── BILL NUMBER GENERATOR ─────────────────────────
  let _billNum = read('vb_bill_counter', 1000);
  function nextSaleNo() {
    _billNum++;
    write('vb_bill_counter', _billNum);
    return 'SL' + String(_billNum).padStart(5, '0');
  }
  let _purNum = read('vb_pur_counter', 2000);
  function nextPurNo() {
    _purNum++;
    write('vb_pur_counter', _purNum);
    return 'PUR' + String(_purNum).padStart(4, '0');
  }

  // ── SALES ─────────────────────────────────────────
  function getSales() { return read('vb_sales', []); }
  function saveSale(bill) {
    const sales = getSales();
    bill.id = bill.id || nextSaleNo();
    bill.createdAt = bill.createdAt || new Date().toISOString();
    const idx = sales.findIndex(s => s.id === bill.id);
    if (idx >= 0) sales[idx] = bill; else sales.unshift(bill);
    write('vb_sales', sales);
    return bill;
  }
  function deleteSale(id) {
    write('vb_sales', getSales().filter(s => s.id !== id));
  }
  function getSaleById(id) { return getSales().find(s => s.id === id); }

  // ── PURCHASES ─────────────────────────────────────
  function getPurchases() { return read('vb_purchases', []); }
  function savePurchase(p) {
    const purchases = getPurchases();
    p.id = p.id || nextPurNo();
    p.createdAt = p.createdAt || new Date().toISOString();
    const idx = purchases.findIndex(x => x.id === p.id);
    if (idx >= 0) purchases[idx] = p; else purchases.unshift(p);
    write('vb_purchases', purchases);
    return p;
  }
  function deletePurchase(id) {
    write('vb_purchases', getPurchases().filter(p => p.id !== id));
  }
  function getPurchaseById(id) { return getPurchases().find(p => p.id === id); }

  // ── PARTIES ───────────────────────────────────────
  function getParties() { return read('vb_parties', []); }
  function saveParty(party) {
    const parties = getParties();
    party.id = party.id || 'P' + Date.now();
    party.createdAt = party.createdAt || new Date().toISOString();
    const idx = parties.findIndex(p => p.id === party.id);
    if (idx >= 0) parties[idx] = party; else parties.push(party);
    write('vb_parties', parties);
    return party;
  }
  function deleteParty(id) {
    write('vb_parties', getParties().filter(p => p.id !== id));
  }
  function getPartyById(id) { return getParties().find(p => p.id === id); }

  // ── PARTY BALANCE OVERRIDE ────────────────────────
  function getPartyBalances() { return read('vb_party_balances', {}); }
  function setPartyBalance(partyName, date, type, less, adjustment) {
    const b = getPartyBalances();
    b[partyName + '_' + date + '_' + type] = { less: Number(less || 0), adjustment: Number(adjustment || 0) };
    write('vb_party_balances', b);
  }
  function getPartyBalance(partyName, date, type) {
    const b = getPartyBalances();
    return b[partyName + '_' + date + '_' + type] || { less: 0, adjustment: 0 };
  }

  // ── SETTINGS ──────────────────────────────────────
  function getSettings() {
    return read('vb_settings', {
      shopName:  'SRI PERIYANAYAGI AMMAN',
      address:   'Shop No 66, Gandhi Market, Thangachiammapatti',
      city:      'Oddanchatram 624612',
      phone:     '9876543210',
      email:     'shop@example.com',
      gstin:     '33AABCU9603R1ZJ',
      state:     'Tamil Nadu',
      stateCode: '33',
      logoUrl:   'img/logo.png',
    });
  }
  function saveSettings(s) { write('vb_settings', s); }

  // ── ITEM MASTER ────────────────────────────────────
  const DEFAULT_ITEMS = [
    { id: 'u_chilly',      name: 'U Chilly',           tamil: 'உ.மிளகாய்',   unit: 'kg',    emoji: '🌶️',  price: 0 },
    { id: 's_chilly',      name: 'S Chilly',            tamil: 'எஸ்.மிளகாய்', unit: 'kg',    emoji: '🌶️',  price: 0 },
    { id: 'drumstick',     name: 'Drumstick',           tamil: 'முருங்கை',    unit: 'bunch', emoji: '🌿',  price: 0 },
    { id: 'l_finger',      name: 'Lady Finger',         tamil: 'வெண்டைக்காய்', unit: 'kg',   emoji: '🌿',  price: 0 },
    { id: 'payaru',        name: 'Payaru',              tamil: 'பயறு',        unit: 'kg',    emoji: '🫛',  price: 0 },
    { id: 'beetroot',      name: 'Beetroot',            tamil: 'பீட்ரூட்',   unit: 'kg',    emoji: '🫜',  price: 0 },
    { id: 'k_amarai',      name: 'K Amarai',            tamil: 'க.அமராய்',   unit: 'kg',    emoji: '🫘',  price: 0 },
    { id: 'kozhi_amarai',  name: 'Kozhi Amarai',        tamil: 'கோழி அமராய்', unit: 'kg',   emoji: '🫘',  price: 0 },
    { id: 'pavai',         name: 'Pavakkai',            tamil: 'பாவக்காய்',  unit: 'kg',    emoji: '🫘',  price: 0 },
    { id: 'peerkan',       name: 'Peerkan',             tamil: 'பீர்க்கன்',  unit: 'kg',    emoji: '🥬',  price: 0 },
    { id: 'kovaikkai',     name: 'Kovaikkai',           tamil: 'கோவைக்காய்', unit: 'kg',    emoji: '🥒',  price: 0 },
    { id: 'k_manga',       name: 'K Manga',             tamil: 'க.மாங்காய்', unit: 'kg',    emoji: '🥭',  price: 0 },
    { id: 'u_manga',       name: 'U Manga',             tamil: 'உ.மாங்காய்', unit: 'kg',    emoji: '🥭',  price: 0 },
    { id: 'kiyar',         name: 'Kiyar',               tamil: 'கியார்',      unit: 'kg',    emoji: '🥒',  price: 0 },
    { id: 'elavan',        name: 'Elavan',              tamil: 'எலவன்',       unit: 'kg',    emoji: '🧅',  price: 0 },
    { id: 's_vellari',     name: 'S Vellari',           tamil: 'எஸ்.வெள்ளரி', unit: 'kg',   emoji: '🥬', price: 0 },
    { id: 'onion',         name: 'Onion',               tamil: 'வெங்காயம்',  unit: 'kg',    emoji: '🧅',  price: 0 },
    { id: 'thar',          name: 'Thar',                tamil: 'தார்',        unit: 'kg',    emoji: '🍅',  price: 0 },
    { id: 'brinjal',       name: 'Brinjal',             tamil: 'கத்தரிக்காய்', unit: 'kg',  emoji: '🍆',  price: 0 },
    { id: 'koork',         name: 'Koork',               tamil: 'கூர்க்',      unit: 'kg',    emoji: '🥬', price: 0 },
    { id: 'chembu',        name: 'Chembu',              tamil: 'சேம்பு',      unit: 'kg',    emoji: '🥔',  price: 0 },
    { id: 'lemon',         name: 'Lemon',               tamil: 'எலுமிச்சை',  unit: 'pc',    emoji: '🍋',  price: 0 },
    { id: 'northan',       name: 'Northan',             tamil: 'நார்தான்',   unit: 'kg',    emoji: '🥔',  price: 0 },
    { id: 'beens',         name: 'Beans',               tamil: 'பீன்ஸ்',     unit: 'kg',    emoji: '🫘',  price: 0 },
    { id: 'b_avarai',      name: 'B Avarai',            tamil: 'ப.அவரை',     unit: 'kg',    emoji: '🫘',  price: 0 },
    { id: 'chow_chow',     name: 'Chow Chow',           tamil: 'சௌசௌ',       unit: 'kg',    emoji: '🥦',  price: 0 },
    { id: 'suraikkai',     name: 'Suraikkai',           tamil: 'சுரைக்காய்', unit: 'kg',    emoji: '🥬',  price: 0 },
    { id: 'nelli',         name: 'Nelli',               tamil: 'நெல்லி',      unit: 'pc',    emoji: '🫐',  price: 0 },
    { id: 'c_flower',      name: 'Cauliflower',         tamil: 'காலிஃபிளவர்', unit: 'kg',   emoji: '🥦',  price: 0 },
    { id: 'tomato',        name: 'Tomato',              tamil: 'தக்காளி',     unit: 'kg',    emoji: '🍅',  price: 0 },
    { id: 'potato',        name: 'Potato',              tamil: 'உருளைக்கிழங்கு', unit: 'kg', emoji: '🥔', price: 0 },
    { id: 'carrot',        name: 'Carrot',              tamil: 'கேரட்',       unit: 'kg',    emoji: '🥕',  price: 0 },
    { id: 'cabbage',       name: 'Cabbage',             tamil: 'முட்டைக்கோஸ்', unit: 'kg',  emoji: '🥬',  price: 0 },
    { id: 'garlic',        name: 'Garlic',              tamil: 'பூண்டு',      unit: 'kg',    emoji: '🧄',  price: 0 },
    { id: 'ginger',        name: 'Ginger',              tamil: 'இஞ்சி',       unit: 'kg',    emoji: '🫚',  price: 0 },
  ];

  function getItems() {
    const saved = read('vb_items', null);
    if (!Array.isArray(saved) || saved.length === 0) {
      write('vb_items', DEFAULT_ITEMS);
      return [...DEFAULT_ITEMS];
    }
    const merged = [...saved];
    DEFAULT_ITEMS.forEach(def => {
      if (!merged.some(x => x.id === def.id)) merged.push(def);
    });
    if (merged.length !== saved.length) write('vb_items', merged);
    return merged;
  }
  function saveItem(item) {
    const items = getItems();
    const idx = items.findIndex(i => i.id === item.id);
    if (idx >= 0) items[idx] = item; else items.push(item);
    write('vb_items', items);
  }

  // ── AUTHENTICATION ──────────────────────────────────
  function getAuth() { return read('vb_auth', null); }
  function setAuth(phone) { write('vb_auth', { phone, loggedInAt: new Date().toISOString() }); }
  function removeAuth() { localStorage.removeItem('vb_auth'); }

  return {
    getSales, saveSale, deleteSale, getSaleById, nextSaleNo,
    getPurchases, savePurchase, deletePurchase, getPurchaseById, nextPurNo,
    getParties, saveParty, deleteParty, getPartyById,
    getPartyBalances, setPartyBalance, getPartyBalance,
    getSettings, saveSettings,
    getItems, saveItem,
    getAuth, setAuth, removeAuth,
  };
})();
