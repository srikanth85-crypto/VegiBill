// ═══════════════════════════════════════════════════
//  VegiBill TN — login.js  (Authentication Page)
// ═══════════════════════════════════════════════════

function renderLogin(container) {
  // We need to hide the top header and bottom nav on the login page
  document.getElementById('app-header').classList.add('hidden');
  document.getElementById('bottom-nav').classList.add('hidden');

  container.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; justify-content: center; min-height: 100%; padding-top: 40px;">
      
      <div style="text-align: center; margin-bottom: 40px;">
        <div style="font-size: 64px; margin-bottom: 10px;">🥬</div>
        <h1 style="font-size: 28px; font-weight: 900; color: var(--text); letter-spacing: -0.5px;">VegiBill TN</h1>
        <p style="color: var(--text3); font-size: 14px; margin-top: 5px;">Professional Wholesale Billing</p>
      </div>

      <!-- STEP 1: PHONE NUMBER INPUT -->
      <div id="login-step-1" class="card">
        <h2 style="font-size: 18px; font-weight: 800; margin-bottom: 16px;">Welcome Back</h2>
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="tel" id="login-phone" placeholder="Enter your 10-digit mobile number" maxlength="10" />
        </div>
        <button class="btn btn-primary btn-full mt-2" style="padding: 14px; font-size: 16px;" onclick="handleSendOTP()">
          Send OTP
        </button>
      </div>

      <!-- STEP 2: OTP VERIFICATION (Hidden initially) -->
      <div id="login-step-2" class="card hidden">
        <h2 style="font-size: 18px; font-weight: 800; margin-bottom: 6px;">Verify Phone</h2>
        <p style="font-size: 13px; color: var(--text3); margin-bottom: 16px;">
          Code sent to <span id="display-phone" style="font-weight: 700; color: var(--text);"></span>
          <span style="color: var(--primary); cursor: pointer; margin-left: 8px; font-weight: 600;" onclick="handleEditPhone()">Edit</span>
        </p>
        
        <div class="form-group">
          <label class="form-label">Enter OTP</label>
          <input type="number" id="login-otp" placeholder="Enter 6-digit OTP (Mock: 123456)" />
        </div>
        <button class="btn btn-primary btn-full mt-2" style="padding: 14px; font-size: 16px;" onclick="handleVerifyOTP()">
          Verify & Login
        </button>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <p style="font-size: 12px; color: var(--text3);">Secure Authentication • VegiBill TN</p>
      </div>

    </div>
  `;
}

// ── LOGIC ──────────────────────────────────────────

function handleSendOTP() {
  const phone = document.getElementById('login-phone').value.trim();
  
  if (!phone || phone.length !== 10 || isNaN(phone)) {
    showToast('Please enter a valid 10-digit phone number.', 'error');
    return;
  }

  // MOCK: Send OTP
  // In a real app, you would call an API here.
  showToast('OTP sent successfully! (Mock)', 'success');
  
  // Transition to step 2
  document.getElementById('login-step-1').classList.add('hidden');
  document.getElementById('login-step-2').classList.remove('hidden');
  document.getElementById('display-phone').textContent = phone;
  document.getElementById('login-otp').focus();
}

function handleEditPhone() {
  document.getElementById('login-step-2').classList.add('hidden');
  document.getElementById('login-step-1').classList.remove('hidden');
  document.getElementById('login-phone').focus();
}

function handleVerifyOTP() {
  const otp = document.getElementById('login-otp').value.trim();
  const phone = document.getElementById('display-phone').textContent;

  if (!otp) {
    showToast('Please enter the OTP.', 'error');
    return;
  }

  // MOCK: Verify OTP
  // In a real app, you would call an API here. We'll accept '123456' or any non-empty for demo, let's say '123456' is strict.
  if (otp !== '123456') {
    showToast('Invalid OTP. Please try again.', 'error');
    return;
  }

  showToast('Login successful!', 'success');
  
  // Save auth state
  DB.setAuth(phone);

  // Restore App Shell UI and navigate to home
  document.getElementById('app-header').classList.remove('hidden');
  document.getElementById('bottom-nav').classList.remove('hidden');
  navigateTo('home');
}
