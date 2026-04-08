// ═══════════════════════════════════════════════════
//  VegiBill TN — db.js  (Local Storage Database)
//  Replace localStorage calls with Firebase/Supabase
//  by swapping functions below.
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
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error('DB write error', e); }
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
  // balances: { partyName_date_type: {less, adjustment} }
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
      shopName: 'Sri Murugan Vegetables',
      address: 'No. 12, Market Street, Chennai - 600001',
      phone: '9876543210',
      gstin: '33AABCU9603R1ZJ',
      state: 'Tamil Nadu',
      stateCode: '33',
    });
  }
  function saveSettings(s) { write('vb_settings', s); }

  // ── ITEM MASTER ────────────────────────────────────
  const DEFAULT_ITEMS = [
    { id: 'u_chilly',      name: 'Green Chilli',      tamil: 'பச்சை மிளகாய்',         unit: 'kg',    emoji: '🌶️' },
    { id: 's_chilly',      name: 'Red Chilli',        tamil: 'சிவப்பு மிளகாய்',       unit: 'kg',    emoji: '🌶️' },
    { id: 'drumstick',     name: 'Drumstick',         tamil: 'முருங்கைக்காய்',      unit: 'bunch', emoji: '🌿' },
    { id: 'l_finger',      name: 'Lady Finger',       tamil: 'வெண்டைக்காய்',       unit: 'kg',    emoji: '🌿' },
    { id: 'payaru',        name: 'Peas',              tamil: 'பட்டாணி',              unit: 'kg',    emoji: '🫛' },
    { id: 'beetroot',      name: 'Beetroot',          tamil: 'பீட்ரூட்',            unit: 'kg',    emoji: '🫜' },
    { id: 'k_amarai',      name: 'Kai Amarai',        tamil: 'கை அமரை',             unit: 'kg',    emoji: '🫘' },
    { id: 'kozhi_amarai',  name: 'Cowpea',            tamil: 'கோழி அமரை',          unit: 'kg',    emoji: '🫘' },
    { id: 'pavai',         name: 'Pigeon Peas',       tamil: 'ததொம்பை',            unit: 'kg',    emoji: '🫘' },
    { id: 'peerkan',       name: 'Bitter Gourd',      tamil: 'பாகற்காய்',            unit: 'kg',    emoji: '🥬' },
    { id: 'kovaikkai',     name: 'Ivy Gourd',         tamil: 'கோவைக்காய்',          unit: 'kg',    emoji: '🥒' },
    { id: 'k_manga',       name: 'Green Mango',       tamil: 'பச்சை மாங்காய்',       unit: 'kg',    emoji: '🥭' },
    { id: 'u_manga',       name: 'Raw Mango',         tamil: 'மாங்காய்',             unit: 'kg',    emoji: '🥭' },
    { id: 'kiyar',         name: 'Cucumber',          tamil: 'வெள்ளரி',             unit: 'kg',    emoji: '🥒' },
    { id: 'elavan',        name: 'Shallot',           tamil: 'எள்ளிவளை',            unit: 'kg',    emoji: '🧅' },
    { id: 'mathan',        name: 'Pumpkin',           tamil: 'மதனம்',               unit: 'kg',    emoji: '🎃' },
    { id: 's_vellari',     name: 'Snake Gourd',       tamil: 'சுரைக்காய்',           unit: 'kg',    emoji: '🥬' },
    { id: 'onion',         name: 'Onion',             tamil: 'வெங்காயம்',            unit: 'kg',    emoji: '🧅' },
    { id: 'thar',          name: 'Tomato',            tamil: 'தக்காளி',              unit: 'kg',    emoji: '🍅' },
    { id: 'brinjal',       name: 'Brinjal',           tamil: 'கத்திரிக்காய்',       unit: 'kg',    emoji: '🍆' },
    { id: 'koork',         name: 'Bottle Gourd',      tamil: 'சுரைக்காய் (பெரியது)',  unit: 'kg',    emoji: '🥬' },
    { id: 'chembu',        name: 'Taro Root',         tamil: 'சேப்பங்கிழங்கு',      unit: 'kg',    emoji: '🥔' },
    { id: 'lemon',         name: 'Lemon',             tamil: 'எலுமிச்சை',            unit: 'pc',    emoji: '🍋' },
    { id: 'northan',       name: 'Potato',            tamil: 'உருளைக்கிழங்கு',      unit: 'kg',    emoji: '🥔' },
    { id: 'beens',         name: 'Green Beans',       tamil: 'பீன்ஸ்',                unit: 'kg',    emoji: '🫘' },
    { id: 'b_avarai',      name: 'Broad Beans',       tamil: 'அவரைக்காய் (பெரிய)',  unit: 'kg',    emoji: '🫘' },
    { id: 'chow_chow',     name: 'Chayote',           tamil: 'சோ சோ',               unit: 'kg',    emoji: '🥬' },
    { id: 'suraikkai',     name: 'Ridge Gourd',       tamil: 'பீர்க்கங்காய்',        unit: 'kg',    emoji: '🥬' },
    { id: 'nelli',         name: 'Indian Gooseberry', tamil: 'நெல்லி',               unit: 'pc',    emoji: '🫐' },
    { id: 'c_flower',      name: 'Cauliflower',       tamil: 'காலிஃப்ளவர்',        unit: 'kg',    emoji: '🥦' },
  ];
  function getItems() {
    const saved = read('vb_items', null);
    if (!Array.isArray(saved) || saved.length === 0) {
      write('vb_items', DEFAULT_ITEMS);
      return [...DEFAULT_ITEMS];
    }

    // Keep user prices/edits and auto-append any newly introduced defaults.
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

  return {
    getSales, saveSale, deleteSale, getSaleById, nextSaleNo,
    getPurchases, savePurchase, deletePurchase, getPurchaseById, nextPurNo,
    getParties, saveParty, deleteParty, getPartyById,
    getPartyBalances, setPartyBalance, getPartyBalance,
    getSettings, saveSettings,
    getItems, saveItem,
  };
})();
