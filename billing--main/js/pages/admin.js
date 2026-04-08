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
        <div class="font-bold text-lg" style="margin-bottom:6px;">Admin Access</div>
        <div class="text-sm text-muted" style="margin-bottom:14px;">Enter admin credentials to continue.</div>

        <div class="form-group">
          <label class="form-label">Username</label>
          <input id="admin-username" type="text" placeholder="Enter username" autocomplete="username" />
        </div>

        <div class="form-group">
          <label class="form-label">Password</label>
          <input id="admin-password" type="password" placeholder="Enter password" autocomplete="current-password" />
        </div>

        <div style="display:flex;gap:10px;">
          <button class="btn btn-secondary flex-1" onclick="navigateTo('home')">Cancel</button>
          <button class="btn btn-primary flex-1" onclick="adminLogin()">Login</button>
        </div>
      </div>
    </div>`;

  const userEl = document.getElementById('admin-username');
  const passEl = document.getElementById('admin-password');
  if (userEl && passEl) {
    const onEnter = (e) => {
      if (e.key === 'Enter') adminLogin();
    };
    userEl.addEventListener('keydown', onEnter);
    passEl.addEventListener('keydown', onEnter);
  }
}

function adminLogin() {
  const username = (document.getElementById('admin-username')?.value || '').trim();
  const password = document.getElementById('admin-password')?.value || '';

  if (!username || !password) {
    showToast('Enter username and password');
    return;
  }

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    showToast('Invalid credentials');
    return;
  }

  localStorage.setItem(ADMIN_SESSION_KEY, '1');
  showToast('Admin login successful');
  navigateTo('admin');
}

function renderAdminPanel(container) {
  setHeaderTitle('Admin Panel', 'VegiBill Control');

  const sales = DB.getSales();
  const purchases = DB.getPurchases();
  const parties = DB.getParties();

  container.innerHTML = `
    <div class="page">
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Total Sales</div>
          <div class="stat-value text-green">${sales.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Purchase</div>
          <div class="stat-value text-amber">${purchases.length}</div>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Parties</div>
          <div class="stat-value text-blue">${parties.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Database</div>
          <div class="stat-value">Local</div>
        </div>
      </div>

      <div class="card" style="margin-top:10px;">
        <div class="font-bold" style="margin-bottom:8px;">Admin Actions</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-secondary" onclick="navigateTo('sales')">View Sales</button>
          <button class="btn btn-secondary" onclick="navigateTo('purchase')">View Purchase</button>
          <button class="btn btn-danger" onclick="adminLogout()">Logout</button>
        </div>
      </div>
    </div>`;
}
