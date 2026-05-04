// ═══════════════════════════════════════════════════
//  VegiBill TN — pages/admin.js
// ═══════════════════════════════════════════════════

const ADMIN_SESSION_KEY = 'vegibill_admin_session';
const ADMIN_USER = 'admin';
const ADMIN_PASS = '1234';

function isAdminLoggedIn() {
  return localStorage.getItem(ADMIN_SESSION_KEY) === '1';
}

function adminLogout() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  showToast('Logged out');
  navigateTo('home');
}

function renderAdmin(container) {
  if (isAdminLoggedIn()) {
    renderAdminPanel(container);
    return;
  }
  renderAdminLogin(container);
}

function renderAdminLogin(container) {
  setHeaderTitle('Admin Login', 'Secure Access');

  container.innerHTML = `
    <div class="page">
      <div class="card" style="max-width:460px;margin:12px auto;">
        <div style="text-align:center;margin-bottom:20px;">
          <div style="font-size:40px;margin-bottom:10px;">🔐</div>
          <div class="font-bold text-lg">Admin Access</div>
          <div class="text-sm text-muted" style="margin-top:4px;">Secure area — authorised users only</div>
        </div>

        <div class="form-group">
          <label class="form-label">Username</label>
          <input id="admin-username" type="text" placeholder="Enter username" autocomplete="username" />
        </div>

        <div class="form-group">
          <label class="form-label">Password</label>
          <input id="admin-password" type="password" placeholder="Enter password" autocomplete="current-password" />
        </div>

        <div style="display:flex;gap:10px;margin-top:6px;">
          <button class="btn btn-secondary flex-1" onclick="navigateTo('home')">Cancel</button>
          <button class="btn btn-primary flex-1" onclick="adminLogin()">🔓 Login</button>
        </div>
      </div>
    </div>`;

  const userEl = document.getElementById('admin-username');
  const passEl = document.getElementById('admin-password');
  if (userEl && passEl) {
    const onEnter = (e) => { if (e.key === 'Enter') adminLogin(); };
    userEl.addEventListener('keydown', onEnter);
    passEl.addEventListener('keydown', onEnter);
    userEl.focus();
  }
}

function adminLogin() {
  const username = (document.getElementById('admin-username')?.value || '').trim();
  const password = document.getElementById('admin-password')?.value || '';

  if (!username || !password) { showToast('Enter username and password', 'error'); return; }
  if (username !== ADMIN_USER || password !== ADMIN_PASS) { showToast('Invalid credentials', 'error'); return; }

  localStorage.setItem(ADMIN_SESSION_KEY, '1');
  showToast('✅ Admin login successful', 'success');
  navigateTo('admin');
}

function renderAdminPanel(container) {
  setHeaderTitle('Admin Panel', 'VegiBill Control');

  const sales     = DB.getSales();
  const purchases = DB.getPurchases();
  const parties   = DB.getParties();
  const settings  = DB.getSettings();

  container.innerHTML = `
    <div class="page">

      <!-- STATS -->
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Total Sales</div>
          <div class="stat-value text-green">${sales.length}</div>
          <div class="stat-sub">bills created</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Purchase</div>
          <div class="stat-value text-amber">${purchases.length}</div>
          <div class="stat-sub">entries</div>
        </div>
      </div>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Parties</div>
          <div class="stat-value text-blue">${parties.length}</div>
          <div class="stat-sub">registered</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Storage</div>
          <div class="stat-value" style="font-size:16px;">Local DB</div>
          <div class="stat-sub">localStorage</div>
        </div>
      </div>

      <!-- SHOP SETTINGS -->
      <div class="card" style="margin-top:4px;">
        <div class="font-bold" style="margin-bottom:14px;font-size:15px;">🏪 Shop Settings</div>

        <div class="form-group">
          <label class="form-label">Shop Name</label>
          <input id="admin-shop-name" type="text" value="${esc(settings.shopName)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Address Line 1</label>
          <input id="admin-address" type="text" value="${esc(settings.address)}" />
        </div>
        <div class="form-group">
          <label class="form-label">City / PIN Code</label>
          <input id="admin-city" type="text" value="${esc(settings.city || '')}" placeholder="City, PIN Code" />
        </div>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Phone</label>
            <input id="admin-phone" type="tel" value="${esc(settings.phone)}" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Email</label>
            <input id="admin-email" type="email" value="${esc(settings.email || '')}" placeholder="shop@email.com"/>
          </div>
        </div>
        <div class="form-row" style="margin-top:14px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">GSTIN</label>
            <input id="admin-gstin" type="text" value="${esc(settings.gstin)}" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">State</label>
            <input id="admin-state" type="text" value="${esc(settings.state)}" />
          </div>
        </div>

        <button class="btn btn-primary btn-full" style="margin-top:16px;" onclick="saveAdminSettings()">
          💾 Save Settings
        </button>
      </div>

      <!-- ACTIONS -->
      <div class="card" style="margin-top:4px;">
        <div class="font-bold" style="margin-bottom:12px;">⚙️ Admin Actions</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-secondary" onclick="navigateTo('sales')">📋 Sales</button>
          <button class="btn btn-secondary" onclick="navigateTo('purchase')">📦 Purchase</button>
          <button class="btn btn-secondary" onclick="navigateTo('items')">🥬 Items</button>
          <button class="btn btn-amber" onclick="adminLogout()">🚪 Admin Logout</button>
          <button class="btn btn-danger" onclick="DB.removeAuth(); navigateTo('login');">🔒 App Logout</button>
        </div>
      </div>

    </div>`;
}

function saveAdminSettings() {
  const current = DB.getSettings();
  DB.saveSettings({
    ...current,
    shopName:  document.getElementById('admin-shop-name')?.value?.trim() || current.shopName,
    address:   document.getElementById('admin-address')?.value?.trim()   || current.address,
    city:      document.getElementById('admin-city')?.value?.trim()      || current.city,
    phone:     document.getElementById('admin-phone')?.value?.trim()     || current.phone,
    email:     document.getElementById('admin-email')?.value?.trim()     || current.email,
    gstin:     document.getElementById('admin-gstin')?.value?.trim()     || current.gstin,
    state:     document.getElementById('admin-state')?.value?.trim()     || current.state,
  });
  showToast('✅ Settings saved!', 'success');
}
