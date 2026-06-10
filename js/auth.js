// ============================================================
// AUTH & SESSION
// ============================================================

if (location.protocol === 'file:' && !window.__NB_FILE_MODE_WARNED) {
  window.__NB_FILE_MODE_WARNED = true;
  try { toast('You are opening the app as a file. Cloud sync is disabled, so balances won’t reflect on other phones/browsers. Host it on http/https to enable syncing.', 'warning'); } catch (_) {}
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function generateAccessCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function togglePwInput(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  const show = el.type === 'password';
  el.type = show ? 'text' : 'password';
  if (btn) btn.innerHTML = show ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
}

function openForgotPasswordModal() {
  showModal('Reset Password', `
    <p style="font-size:.85rem;color:var(--nb-muted);margin-bottom:.75rem;">Enter your email address and we’ll send a password reset link.</p>
    <div class="form-group"><label>Email</label><input class="nb-input" id="fp-email" type="email" placeholder="you@example.com"></div>`,
    `<div class="d-flex gap-2 justify-content-end">
      <button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button>
      <button class="btn-nb btn-nb-primary" onclick="runLocked(this, sendForgotPasswordLink, 'Sending...')">Send Link</button>
    </div>`
  );
}

async function sendForgotPasswordLink() {
  const email = normalizeEmail(document.getElementById('fp-email')?.value);
  if (!email) return toast('Enter your email', 'error');
  try {
    if (!window.NB_FIREBASE?.sendPasswordReset) throw new Error('Firebase not ready');
    await window.NB_FIREBASE.sendPasswordReset(email);
    toast('Password reset email sent.', 'success');
    closeModal();
  } catch (_) {
    toast('Unable to send reset email. Check Firebase Auth settings.', 'error');
  }
}

async function resendVerificationEmail() {
  try {
    const user = window.NB_FIREBASE?.auth?.currentUser;
    if (!user) return toast('Please sign in again.', 'warning');
    if (!window.NB_FIREBASE?.sendVerifyEmail) throw new Error('Firebase not ready');
    await window.NB_FIREBASE.sendVerifyEmail(user);
    toast('Verification email sent.', 'success');
  } catch (_) {
    toast('Unable to send verification email.', 'error');
  }
}

async function sha256Hex(input) {
  const enc = new TextEncoder();
  const data = enc.encode(String(input));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function cloudSignInOrBootstrap(email, password) {
  if (!window.NB_FIREBASE?.signIn) {
    return { ok: false, msg: 'Cloud auth not available' };
  }
  const normEmail = normalizeEmail(email);
  try {
    const cred = await window.NB_FIREBASE.signIn(normEmail, password);
    return { ok: true, firebaseUser: cred.user };
  } catch (e) {
    const code = e?.code || '';
    if (code === 'auth/user-not-found') return { ok: false, msg: 'User not found. Please register or ask admin to create your account.' };
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return { ok: false, msg: 'Invalid password' };
    return { ok: false, msg: 'Unable to sign in' };
  }
}

async function cloudGetOrCreateProfile(firebaseUser) {
  const email = normalizeEmail(firebaseUser?.email);
  const uid = firebaseUser?.uid;
  if (!uid || !email) return null;
  if (!window.NB_FIREBASE?.getById || !window.NB_FIREBASE?.existsDoc || !window.NB_FIREBASE?.upsert) return null;
  const [isAdminUser, existingById] = await Promise.all([
    window.NB_FIREBASE.existsDoc('admins', uid),
    window.NB_FIREBASE.getById('users', uid)
  ]);
  let existing = existingById;
  if (!existing && window.NB_FIREBASE?.findOneByField) {
    try { existing = await window.NB_FIREBASE.findOneByField('users', 'email', email); } catch (_) {}
  }
  const role = isAdminUser ? (existing?.role || 'admin') : (existing?.role || 'customer');
  const base = existing || {
    id: uid,
    name: 'User',
    email,
    role,
    status: 'active',
    failedLogins: 0,
    joined: new Date().toISOString().slice(0, 10)
  };
  const profile = { ...base, id: uid, email, role };
  await window.NB_FIREBASE.upsert('users', uid, profile);
  return profile;
}

function verifyCredentials(email, password) {
  const normEmail = normalizeEmail(email);
  try { DB.seed(); } catch (_) {}
  const user = DB.users.getByEmail(normEmail) || DB.users.getAll().find(u => normalizeEmail(u.email) === normEmail);
  if (!user) return { ok: false, msg: 'User not found' };
  if (user.status === 'frozen') return { ok: false, msg: 'Account is frozen. Contact support.' };
  if (user.failedLogins >= 5 && user.password !== password) return { ok: false, msg: 'Account locked. Too many failed attempts.' };
  if (user.password !== password) {
    DB.users.update(user.id, { failedLogins: (user.failedLogins||0)+1 });
    return { ok: false, msg: 'Invalid password' };
  }
  DB.users.update(user.id, { failedLogins: 0 });
  return { ok: true, user };
}

function finalizeLogin(user) {
  STATE.user = user;
  sessionStorage.setItem('nb_session', user.id);
  return { ok: true };
}

function logout() {
  STATE.user = null;
  sessionStorage.removeItem('nb_session');
  location.href = 'app.html'; // Redirect to login
}

function isAdmin() { return STATE.user && ['admin','superadmin','teller'].includes(STATE.user.role); }
function isSuperAdmin() { return STATE.user && STATE.user.role === 'superadmin'; }

function restoreSession() {
  const uid = sessionStorage.getItem('nb_session');
  if (uid) { STATE.user = DB.users.getById(uid); return !!STATE.user; }
  return false;
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function requestLoginOtp(user) {
  const code = generateOtpCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const payload = { userId: user.id, email: normalizeEmail(user.email), expiresAt, attempts: 0 };
  sessionStorage.setItem('nb_login_otp', JSON.stringify(payload));
  
  const ok = await sendGenericOtp(user, code, 'login', 'Your Credit Financials one-time login code');
  if (ok) {
    toast('Login code queued to email. If you don’t receive it, use your access code.', 'success');
  } else {
    const fallback = { ...payload, code };
    sessionStorage.setItem('nb_login_otp', JSON.stringify(fallback));
    toast('Email OTP is not available. Use your access code, or the fallback code for testing.', 'warning');
    const showCode = (localStorage.getItem('nb_show_login_otp') || '1') === '1';
    if (showCode) toast(`Login code: ${code}`, 'info');
  }
}

async function sendGenericOtp(user, code, actionType, subject) {
  try {
    if (!window.NB_FIREBASE?.queueEmail || !window.NB_FIREBASE?.saveLoginOtp) throw new Error('Firebase not ready');
    if (!crypto?.subtle) throw new Error('Secure context required');
    
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const hash = await sha256Hex(`${user.id}:${code}`);
    
    // Save to Firestore for verification
    await window.NB_FIREBASE.saveLoginOtp(user.id, normalizeEmail(user.email), hash, expiresAt);
    
    // Queue the email
    await window.NB_FIREBASE.queueEmail(
      normalizeEmail(user.email),
      subject || 'Your NexaBank verification code',
      `Your verification code is ${code}. It expires in 10 minutes.`,
      `<p>Your verification code is <strong>${code}</strong>.</p><p>This code expires in 10 minutes.</p><p>If you didn't request this, please secure your account.</p>`
    );
    return true;
  } catch (e) {
    console.error('OTP Send Error:', e);
    return false;
  }
}

async function verifyGenericOtp(userId, code) {
  try {
    if (!window.NB_FIREBASE?.getLoginOtp || !window.NB_FIREBASE?.deleteLoginOtp) throw new Error('Firebase not ready');
    if (!crypto?.subtle) throw new Error('Secure context required');
    
    const rec = await window.NB_FIREBASE.getLoginOtp(userId);
    if (!rec?.hash || !rec?.expiresAt || Date.now() > rec.expiresAt) {
      return { ok: false, msg: 'Code expired or not found.' };
    }
    
    const hash = await sha256Hex(`${userId}:${code}`);
    if (hash === rec.hash) {
      await window.NB_FIREBASE.deleteLoginOtp(userId);
      return { ok: true };
    }
    return { ok: false, msg: 'Invalid verification code.' };
  } catch (e) {
    console.error('OTP Verify Error:', e);
    return { ok: false, msg: 'Verification service unavailable.' };
  }
}

async function sendTransactionAlert(userId, type, amount, desc) {
  const user = DB.users.getById(userId);
  if (!user || !user.email) return;

  const subject = `Transaction Alert: ${type === 'credit' ? 'Credit' : 'Debit'} - ${fmt(amount)}`;
  const time = new Date().toLocaleString();
  const balance = DB.accounts.getByUser(userId).reduce((s, a) => s + a.balance, 0);

  const text = `A ${type} transaction of ${fmt(amount)} has occurred on your account.\nDescription: ${desc}\nTime: ${time}\nNew Total Balance: ${fmt(balance)}`;
  const html = `
    <div style="font-family:sans-serif;max-width:500px;border:1px solid #e5e9f0;border-radius:12px;padding:24px;background:#ffffff;">
      <h2 style="color:${type === 'credit' ? '#12b76a' : '#f04438'};margin-top:0;font-size:20px;">${type === 'credit' ? 'Credit' : 'Debit'} Alert</h2>
      <p style="font-size:15px;color:#1a1f36;">Hello ${user.name},</p>
      <p style="font-size:15px;color:#1a1f36;">This is to notify you of a <strong>${type}</strong> transaction on your account.</p>
      <div style="background:#f3f6fb;padding:16px;border-radius:8px;margin:20px 0;">
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:4px 0;color:#6b7280;">Amount</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#1a1f36;">${fmt(amount)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Description</td><td style="padding:4px 0;text-align:right;color:#1a1f36;">${desc}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Date</td><td style="padding:4px 0;text-align:right;color:#1a1f36;">${time}</td></tr>
        </table>
      </div>
      <p style="font-size:14px;color:#1a1f36;">Your total account balance is now <strong>${fmt(balance)}</strong>.</p>
      <p style="font-size:12px;color:#9ca3af;margin-top:30px;border-top:1px solid #e5e9f0;padding-top:12px;line-height:1.5;">
        If you did not authorize this transaction, please contact NexaBank support immediately or freeze your cards in the mobile app.
      </p>
    </div>
  `;

  try {
    if (window.NB_FIREBASE?.queueEmail) {
      await window.NB_FIREBASE.queueEmail(user.email, subject, text, html);
    }
  } catch (e) {
    console.error('Failed to send transaction alert email:', e);
  }
}

function getPendingLoginOtp() {
  try { return JSON.parse(sessionStorage.getItem('nb_login_otp') || 'null'); } catch { return null; }
}

function clearPendingLoginOtp() {
  sessionStorage.removeItem('nb_login_otp');
}

// ============================================================
// AUTH FORMS
// ============================================================
function renderAuthForm(type='login') {
  const c = document.getElementById('auth-form-container');
  if (!c) return; // Guard if container doesn't exist (e.g. in admin page if structure differs)
  
  if (type === 'login') {
    c.innerHTML = `
      <div class="form-group"><label>Email Address</label><input class="nb-input" id="a-email" type="email" placeholder="you@example.com"/></div>
      <div class="form-group"><label>Password</label>
        <div class="d-flex gap-2">
          <input class="nb-input" id="a-pass" type="password" placeholder="••••••••"/>
          <button class="btn-nb btn-nb-outline btn-nb-sm" type="button" onclick="togglePwInput('a-pass', this)" title="Show/Hide"><i class="bi bi-eye"></i></button>
        </div>
      </div>
      <div class="d-flex justify-content-between align-items-center mb-3" style="font-size:.82rem;">
        <label style="display:inline-flex;align-items:center;gap:.3rem;cursor:pointer;color:var(--nb-text);"><input type="checkbox"> Remember me</label>
        <a href="#" style="color:var(--nb-accent);" onclick="openForgotPasswordModal()">Forgot password?</a>
      </div>
      <button class="btn-nb btn-nb-primary w-100 justify-content-center" style="padding:.75rem;" onclick="runLocked(this, doLoginStart, 'Signing in...')"><i class="bi bi-box-arrow-in-right"></i> Continue</button>
      <div class="text-center mt-3" style="font-size:.82rem;color:var(--nb-muted);">No account? <a href="#" style="color:var(--nb-accent);" onclick="renderAuthForm('register')">Create one</a></div>
    `;
    // Removed demo accounts hint for "real" bank feel
  } else if (type === 'login-otp') {
    const pending = getPendingLoginOtp();
    const masked = pending?.email ? pending.email.replace(/^(.{2}).+(@.+)$/, (_, a, b) => `${a}••••${b}`) : '';
    c.innerHTML = `
      <div class="form-group"><label>Email Address</label><input class="nb-input" id="lo-email" type="email" value="${pending?.email || ''}" disabled/></div>
      <div class="form-group"><label>Verification Code</label><input class="nb-input" id="lo-otp" maxlength="12" placeholder="Email OTP or access code" style="letter-spacing:2px;text-align:center;font-size:1.05rem;"/></div>
      <div class="d-flex justify-content-between align-items-center mb-3" style="font-size:.82rem;">
        <span style="color:var(--nb-muted);">Check email: ${masked || 'your inbox'}</span>
        <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="runLocked(this, resendLoginOtp, 'Resending...')">Resend</button>
      </div>
      <div class="mb-3" style="font-size:.82rem;color:var(--nb-muted);">
        Didn’t get an email? Use your access code (from admin or shown at registration).
      </div>
      <button class="btn-nb btn-nb-primary w-100 justify-content-center" style="padding:.75rem;" onclick="runLocked(this, doLoginVerify, 'Verifying...')"><i class="bi bi-shield-check"></i> Verify & Sign In</button>
      <div class="text-center mt-3" style="font-size:.82rem;color:var(--nb-muted);"><a href="#" style="color:var(--nb-accent);" onclick="clearPendingLoginOtp();renderAuthForm('login')">Back</a></div>
    `;
  } else {
    c.innerHTML = `
      <div class="row g-2">
        <div class="col-6 form-group"><label>First Name</label><input class="nb-input" id="r-fname" placeholder="John"></div>
        <div class="col-6 form-group"><label>Last Name</label><input class="nb-input" id="r-lname" placeholder="Doe"></div>
      </div>
      <div class="form-group"><label>Email</label><input class="nb-input" id="r-email" type="email" placeholder="you@email.com"></div>
      <div class="form-group"><label>SSN</label><input class="nb-input" id="r-ssn" placeholder="123-45-6789" inputmode="numeric"></div>
      <div class="form-group"><label>Date of Birth</label><input class="nb-input" id="r-dob" type="date"></div>
      <div class="form-group"><label>Phone</label><input class="nb-input" id="r-phone" placeholder="+1-555-0100"></div>
      <div class="form-group"><label>Address</label><input class="nb-input" id="r-address" placeholder="Street address"></div>
      <div class="row g-2">
        <div class="col-6 form-group"><label>City</label><input class="nb-input" id="r-city" placeholder="City"></div>
        <div class="col-6 form-group"><label>State/Region</label><input class="nb-input" id="r-state" placeholder="State"></div>
      </div>
      <div class="row g-2">
        <div class="col-6 form-group"><label>Postal Code</label><input class="nb-input" id="r-zip" placeholder="ZIP"></div>
        <div class="col-6 form-group"><label>Country</label><input class="nb-input" id="r-country" placeholder="Country"></div>
      </div>
      <div class="form-group"><label>Account Type</label>
        <select class="nb-input" id="r-acc-type">
          <option value="Checking">Checking Account</option>
          <option value="Savings">Savings Account</option>
        </select>
      </div>
      <div class="form-group"><label>Password</label>
        <div class="d-flex gap-2">
          <input class="nb-input" id="r-pass" type="password" placeholder="min 8 chars">
          <button class="btn-nb btn-nb-outline btn-nb-sm" type="button" onclick="togglePwInput('r-pass', this)" title="Show/Hide"><i class="bi bi-eye"></i></button>
        </div>
      </div>
      <div class="form-group"><label>Confirm Password</label>
        <div class="d-flex gap-2">
          <input class="nb-input" id="r-pass2" type="password" placeholder="repeat password">
          <button class="btn-nb btn-nb-outline btn-nb-sm" type="button" onclick="togglePwInput('r-pass2', this)" title="Show/Hide"><i class="bi bi-eye"></i></button>
        </div>
      </div>
      <button class="btn-nb btn-nb-primary w-100 justify-content-center" style="padding:.75rem;" onclick="runLocked(this, doRegister, 'Creating...')"><i class="bi bi-person-plus"></i> Create Account</button>
      <div class="text-center mt-3" style="font-size:.82rem;color:var(--nb-muted);">Have an account? <a href="#" style="color:var(--nb-accent);" onclick="renderAuthForm('login')">Sign in</a></div>`;
  }
}

async function doLoginStart() {
  try {
    const email = normalizeEmail(document.getElementById('a-email').value);
    const pass = document.getElementById('a-pass').value;
    if (window.NB_FIREBASE?.auth) {
      const cloud = await cloudSignInOrBootstrap(email, pass);
      if (!cloud.ok) return toast(cloud.msg, 'error');
      if (window.NB_FIREBASE?.reloadCurrentUser) {
        try { await window.NB_FIREBASE.reloadCurrentUser(); } catch (_) {}
      }
      let isStaff = false;
      let isStaffKnown = true;
      try {
        isStaff = await (window.NB_FIREBASE?.existsDoc ? window.NB_FIREBASE.existsDoc('admins', cloud.firebaseUser.uid) : false);
      } catch (_) {
        isStaffKnown = false;
        isStaff = false;
      }
      if (isStaffKnown && !isStaff && email === 'admin@creditfinancials.com' && window.NB_FIREBASE?.upsert) {
        try {
          await window.NB_FIREBASE.upsert('admins', cloud.firebaseUser.uid, { id: cloud.firebaseUser.uid, email: normalizeEmail(email), enabled: true, ts: new Date().toISOString() });
          isStaff = await (window.NB_FIREBASE?.existsDoc ? window.NB_FIREBASE.existsDoc('admins', cloud.firebaseUser.uid) : false);
        } catch (_) {}
      }
      if (isStaffKnown && !isStaff && email === 'admin@creditfinancials.com') {
        showModal('Admin Access Not Enabled', `
          <p style="font-size:.88rem;color:var(--nb-muted);margin-bottom:.75rem;">
            This account signed in with Firebase Auth, but it is not marked as an admin in Firestore.
          </p>
          <p style="font-size:.82rem;color:var(--nb-muted);margin-bottom:.75rem;">
            Create a Firestore document:
          </p>
          <div class="nb-card" style="padding:1rem;">
            <div style="font-size:.82rem;color:var(--nb-muted);">Collection</div>
            <div class="mono" style="font-weight:700;">admins</div>
            <div style="font-size:.82rem;color:var(--nb-muted);margin-top:.5rem;">Document ID</div>
            <div class="mono" style="font-weight:700;">${cloud.firebaseUser.uid}</div>
          </div>
          <p style="font-size:.82rem;color:var(--nb-muted);margin-top:.75rem;">
            Also make sure you deployed your Firestore rules.
          </p>`,
          `<div class="d-flex gap-2 justify-content-end">
            <button class="btn-nb btn-nb-outline" onclick="closeModal()">Close</button>
          </div>`
        );
        return;
      }
      const emailVerified = !!(window.NB_FIREBASE?.auth?.currentUser?.emailVerified);
      if (!isStaff && !emailVerified) {
        try {
          if (window.NB_FIREBASE?.sendVerifyEmail) await window.NB_FIREBASE.sendVerifyEmail(cloud.firebaseUser);
        } catch (_) {}
        showModal('Verify Your Email', `
          <p style="font-size:.88rem;color:var(--nb-muted);margin-bottom:.75rem;">We sent a verification link to <strong>${normalizeEmail(cloud.firebaseUser.email)}</strong>.</p>
          <p style="font-size:.82rem;color:var(--nb-muted);">You can still continue to enter your login code, but please verify your email.</p>`,
          `<div class="d-flex gap-2 justify-content-end">
            <button class="btn-nb btn-nb-outline" onclick="closeModal()">Close</button>
            <button class="btn-nb btn-nb-primary" onclick="runLocked(this, resendVerificationEmail, 'Sending...')">Resend Email</button>
          </div>`
        );
      }
      let profile = null;
      try {
        profile = await cloudGetOrCreateProfile(cloud.firebaseUser);
      } catch (_) {
        profile = null;
      }
      if (!profile) {
        const fallback = {
          id: cloud.firebaseUser.uid,
          name: cloud.firebaseUser.displayName || 'User',
          email: normalizeEmail(cloud.firebaseUser.email),
          role: isStaff ? 'admin' : 'customer',
          status: 'active',
          failedLogins: 0,
          joined: new Date().toISOString().slice(0, 10)
        };
        if (DB.users.getById(fallback.id)) DB.users.update(fallback.id, fallback);
        else DB.users.create(fallback);
        finalizeLogin(fallback);
        toast('Signed in, but profile access is blocked by Firestore rules. Using local profile.', 'warning');
      } else {
        if (DB.users.getById(profile.id)) DB.users.update(profile.id, profile);
        else DB.users.create(profile);
        finalizeLogin(profile);
      }
      try { await DB.cloud.syncDown(); } catch (_) {}
      const sessionUser = STATE.user;
      if (isStaff || ['admin','superadmin','teller'].includes(sessionUser?.role)) {
        return window.location.href = 'admin.html';
      }
      await requestLoginOtp(sessionUser);
      return renderAuthForm('login-otp');
    }
    const result = verifyCredentials(email, pass);
    if (!result.ok) return toast(result.msg, 'error');
    if (['admin','superadmin','teller'].includes(result.user.role)) {
      finalizeLogin(result.user);
      return window.location.href = 'admin.html';
    }
    await requestLoginOtp(result.user);
    renderAuthForm('login-otp');
  } catch (e) {
    const code = e?.code ? ` (${e.code})` : '';
    toast(`Login failed${code}. Check Firebase Auth/Firestore settings.`, 'error');
  }
}

async function resendLoginOtp() {
  const pending = getPendingLoginOtp();
  if (!pending?.userId) return toast('Please sign in again.', 'warning');
  const user = DB.users.getById(pending.userId);
  if (!user) { clearPendingLoginOtp(); return toast('Please sign in again.', 'warning'); }
  await requestLoginOtp(user);
  renderAuthForm('login-otp');
}

async function doLoginVerify() {
  const pending = getPendingLoginOtp();
  if (!pending?.userId) return toast('Please sign in again.', 'warning');
  if (Date.now() > pending.expiresAt) { clearPendingLoginOtp(); renderAuthForm('login'); return toast('Login code expired. Please sign in again.', 'error'); }
  const otp = String(document.getElementById('lo-otp').value || '').trim();
  const nextAttempts = (pending.attempts || 0) + 1;
  sessionStorage.setItem('nb_login_otp', JSON.stringify({ ...pending, attempts: nextAttempts }));
  if (nextAttempts > 6) { clearPendingLoginOtp(); renderAuthForm('login'); return toast('Too many attempts. Please sign in again.', 'error'); }
  const localUser = DB.users.getById(pending.userId);
  const accessCodeOk = !!(localUser?.accessCode && otp && otp.toUpperCase() === String(localUser.accessCode).toUpperCase());
  if (pending.code) {
    if (otp !== pending.code && !accessCodeOk) return toast('Invalid verification code.', 'error');
  } else {
    try {
      const res = await verifyGenericOtp(pending.userId, otp);
      if (!res.ok && !accessCodeOk) return toast(res.msg || 'Invalid verification code.', 'error');
    } catch (_) {
      if (!accessCodeOk) return toast('Unable to verify code. Use your access code or try again.', 'error');
    }
  }
  const user = DB.users.getById(pending.userId);
  if (!user) { clearPendingLoginOtp(); renderAuthForm('login'); return toast('Please sign in again.', 'warning'); }
  clearPendingLoginOtp();
  finalizeLogin(user);
  try { await DB.cloud.syncDown(); } catch (_) {}
  if (isAdmin()) window.location.href = 'admin.html';
  else bootApp();
}

function doRegister() {
  const fname = document.getElementById('r-fname').value.trim();
  const lname = document.getElementById('r-lname').value.trim();
  const email = normalizeEmail(document.getElementById('r-email').value);
  const ssnRaw = document.getElementById('r-ssn').value.trim();
  const pass = document.getElementById('r-pass').value;
  const pass2 = document.getElementById('r-pass2').value;
  const dob = document.getElementById('r-dob').value;
  const phone = document.getElementById('r-phone').value.trim();
  const address = document.getElementById('r-address').value.trim();
  const city = document.getElementById('r-city').value.trim();
  const state = document.getElementById('r-state').value.trim();
  const zip = document.getElementById('r-zip').value.trim();
  const country = document.getElementById('r-country').value.trim();
  const ssnDigits = ssnRaw.replace(/[^\d]/g, '');
  if (!fname||!lname||!email) return toast('Please fill all required fields', 'error');
  if (ssnDigits.length !== 9) return toast('Please enter a valid SSN', 'error');
  if (!dob) return toast('Date of birth is required', 'error');
  if (!phone) return toast('Phone is required', 'error');
  if (!address || !city || !state || !zip || !country) return toast('Address details are required', 'error');
  if (pass !== pass2) return toast('Passwords do not match', 'error');
  if (pass.length < 6) return toast('Password must be 6+ characters', 'error');
  if (DB.users.getByEmail(email)) return toast('Email already registered', 'error');
  const accType = document.getElementById('r-acc-type').value;
  if (window.NB_FIREBASE?.auth && window.NB_FIREBASE?.signUp && window.NB_FIREBASE?.upsert) {
    (async () => {
      try {
        const cred = await window.NB_FIREBASE.signUp(email, pass);
        try {
          if (window.NB_FIREBASE?.sendVerifyEmail) await window.NB_FIREBASE.sendVerifyEmail(cred.user);
        } catch (_) {}
        const id = cred.user.uid;
        const accessCode = generateAccessCode();
        const user = { id, name:`${fname} ${lname}`, email, role:'customer', status:'active', phone, dob, ssn:ssnDigits, address, city, state, zip, country, accessCode, joined:new Date().toISOString().slice(0,10), failedLogins:0 };
        DB.users.create(user);
        DB.accounts.create({ id:'a'+uid(), userId:id, type:accType, balance:0, iban:Math.floor(1000000000 + Math.random() * 9000000000).toString(), swift:'NXBKGB21', status:'active', limit:5000, createdAt:new Date().toISOString().slice(0,10) });
        await window.NB_FIREBASE.upsert('users', id, user);
        try { await DB.cloud.syncDown(); } catch (_) {}
        toast('Account created. If you don’t receive a login code by email, contact support for your access code.', 'info');
        toast('Verification email sent. Please verify your email.', 'success');
        await requestLoginOtp(user);
        renderAuthForm('login-otp');
        toast('Registration successful. Please verify your login code.', 'success');
      } catch (_) {
        toast('Unable to register. Please try again.', 'error');
      }
    })();
    return;
  }
  const id = 'u' + uid();
  const accessCode = generateAccessCode();
  const user = { id, name:`${fname} ${lname}`, email, password:pass, role:'customer', status:'active', phone, dob, ssn:ssnDigits, address, city, state, zip, country, accessCode, joined:new Date().toISOString().slice(0,10), failedLogins:0 };
  DB.users.create(user);
  DB.accounts.create({ id:'a'+uid(), userId:id, type:accType, balance:0, iban:Math.floor(1000000000 + Math.random() * 9000000000).toString(), swift:'NXBKGB21', status:'active', limit:5000, createdAt:new Date().toISOString().slice(0,10) });
  const res = verifyCredentials(email, pass);
  if (!res.ok) { toast('Registration successful. Please sign in.', 'success'); return renderAuthForm('login'); }
  toast('Account created. If you don’t receive a login code by email, contact support for your access code.', 'info');
  requestLoginOtp(res.user);
  renderAuthForm('login-otp');
  toast('Registration successful. Please verify your login code.', 'success');
}
