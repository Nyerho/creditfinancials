// ADMIN LOGIC

function adminGuard(el) {
  if (!isAdmin()) { el.innerHTML = '<div class="empty-state"><i class="bi bi-shield-exclamation"></i>Access Denied</div>'; return false; }
  return true;
}

function adminEscapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function adminDocLabel(v) {
  const labels = {
    drivers_license: "Driver's License",
    passport: 'Passport',
    national_id: 'National ID Card',
    utility_bill: 'Utility Bill',
    bank_statement: 'Bank Statement',
    tax_letter: 'Tax Letter'
  };
  return labels[v] || String(v || '—').replace(/_/g, ' ');
}

function adminFullAddress(u) {
  return [u.address, u.city, u.state, u.zip, u.country].filter(Boolean).join(', ') || '—';
}

function adminViewUser(id) {
  const u = DB.users.getById(id);
  if (!u) return toast('User not found', 'error');
  const accounts = DB.accounts.getByUser(u.id);
  const kyc = u.kycData || null;
  const accountRows = accounts.length
    ? accounts.map(a => `
      <div class="d-flex justify-content-between py-2 border-bottom" style="font-size:.85rem;">
        <span>${adminEscapeHtml(a.type)} <span class="mono" style="font-size:.75rem;color:var(--nb-muted);">${adminEscapeHtml(a.iban || a.id)}</span></span>
        <span class="mono fw-bold">${fmt(a.balance)}</span>
      </div>`).join('')
    : `<div style="font-size:.82rem;color:var(--nb-muted);">No accounts found.</div>`;

  showModal('User Details: ' + adminEscapeHtml(u.name), `
    <div style="font-size:.88rem;">
      <div class="mb-3 pb-3 border-bottom">
        <div style="font-weight:800;font-size:1rem;">Registration Details</div>
        <div style="font-size:.78rem;color:var(--nb-muted);">Full customer profile visible to admin staff.</div>
      </div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Full Name</span><span>${adminEscapeHtml(u.name)}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Email</span><span>${adminEscapeHtml(u.email)}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Role</span><span>${adminEscapeHtml(u.role || 'customer')}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Status</span><span>${adminEscapeHtml(u.status || 'active')}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Phone</span><span>${adminEscapeHtml(u.phone || '—')}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Date of Birth</span><span>${adminEscapeHtml(u.dob || '—')}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">SSN</span><span class="mono">${adminEscapeHtml(u.ssn || '—')}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Address</span><span style="text-align:right;max-width:65%;">${adminEscapeHtml(adminFullAddress(u))}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Joined</span><span>${adminEscapeHtml(u.joined || '—')}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Access Code</span><span class="mono">${adminEscapeHtml(u.accessCode || '—')}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Transfer Code</span><span>${u.transferVerificationCode ? 'Set by user' : 'Not set'}</span></div>
      <div class="mt-3 mb-2" style="font-weight:700;">Accounts</div>
      <div class="mb-3">${accountRows}</div>
      <div class="mt-3 mb-2" style="font-weight:700;">KYC Summary</div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">KYC Status</span><span>${adminEscapeHtml(u.kycStatus || 'unverified')}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">ID Type</span><span>${adminEscapeHtml(adminDocLabel(kyc?.type))}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Document Number</span><span class="mono">${adminEscapeHtml(kyc?.num || '—')}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Proof of Address</span><span>${adminEscapeHtml(adminDocLabel(kyc?.proofType || '—'))}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Submitted</span><span>${kyc?.submittedAt ? fmtDate(kyc.submittedAt) : '—'}</span></div>
      ${u.kycReason ? `<div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">KYC Reason</span><span style="text-align:right;max-width:65%;">${adminEscapeHtml(u.kycReason)}</span></div>` : ''}
      ${kyc?.front ? `<div class="mt-3"><label style="font-size:.75rem;font-weight:700;display:block;margin-bottom:.35rem;">Government ID</label><img src="${kyc.front}" style="width:100%;border-radius:8px;border:1px solid var(--nb-border);"></div>` : ''}
      ${(kyc?.proofOfAddress || kyc?.back) ? `<div class="mt-3"><label style="font-size:.75rem;font-weight:700;display:block;margin-bottom:.35rem;">Proof of Address</label><img src="${kyc.proofOfAddress || kyc.back}" style="width:100%;border-radius:8px;border:1px solid var(--nb-border);"></div>` : ''}
      ${kyc?.selfie ? `<div class="mt-3"><label style="font-size:.75rem;font-weight:700;display:block;margin-bottom:.35rem;">Selfie</label><img src="${kyc.selfie}" style="width:100%;max-height:260px;object-fit:contain;border-radius:8px;border:1px solid var(--nb-border);"></div>` : ''}
    </div>`,
    `<div class="d-flex gap-2 justify-content-end">
      <button class="btn-nb btn-nb-outline" onclick="closeModal()">Close</button>
      ${kyc ? `<button class="btn-nb btn-nb-outline" onclick="closeModal(); adminViewKYC('${u.id}')"><i class="bi bi-shield-check"></i> Review KYC</button>` : ''}
      <button class="btn-nb btn-nb-primary" onclick="closeModal(); adminEditUser('${u.id}')"><i class="bi bi-pencil"></i> Edit User</button>
    </div>`
  );
}

function renderAdminDashboard(el) {
  if (!adminGuard(el)) return;
  const users = DB.users.getAll();
  const accounts = DB.accounts.getAll();
  const txns = DB.transactions.getAll();
  const loans = DB.loans.getAll();
  const totalAum = accounts.reduce((s,a)=>s+a.balance,0);
  const volume = txns.reduce((s,t)=>s+t.amount,0);
  el.innerHTML = `
    <div class="admin-section mb-4"><i class="bi bi-lightning-charge-fill" style="color:var(--nb-gold);font-size:1.2rem;"></i><div><strong>Admin Mode Active</strong> — Full system access enabled</div></div>
    <div class="row g-3 mb-4">
      <div class="col-12 col-sm-6 col-xl-3"><div class="stat-card"><div class="stat-label"><i class="bi bi-people me-1"></i>Total Users</div><div class="stat-value">${users.length}</div></div></div>
      <div class="col-12 col-sm-6 col-xl-3"><div class="stat-card gold"><div class="stat-label"><i class="bi bi-bank me-1"></i>Total AUM</div><div class="stat-value">${fmt(totalAum)}</div></div></div>
      <div class="col-12 col-sm-6 col-xl-3"><div class="stat-card green"><div class="stat-label"><i class="bi bi-arrow-down-up me-1"></i>Txn Volume</div><div class="stat-value">${fmt(volume)}</div></div></div>
      <div class="col-12 col-sm-6 col-xl-3"><div class="stat-card red"><div class="stat-label"><i class="bi bi-exclamation-triangle me-1"></i>Frozen Accs</div><div class="stat-value">${accounts.filter(a=>a.status==='frozen').length}</div></div></div>
    </div>
    <div class="row g-3 mb-4">
      <div class="col-12 col-lg-8"><div class="nb-card"><h6 class="fw-semibold mb-3">Transaction Volume (Simulation)</h6><canvas id="admin-txn-chart" height="120"></canvas></div></div>
      <div class="col-12 col-lg-4"><div class="nb-card"><h6 class="fw-semibold mb-3">Account Types</h6><canvas id="admin-acc-chart" height="180"></canvas></div></div>
    </div>
    <div class="row g-3">
      <div class="col-12 col-lg-6"><div class="nb-card"><h6 class="fw-semibold mb-3">Recent Users</h6>
        <table class="nb-table"><thead><tr><th>Name</th><th>Role</th><th>Status</th></tr></thead><tbody>
          ${users.slice(0,5).map(u=>`<tr><td><div style="font-weight:500;">${u.name}</div><div style="font-size:.72rem;color:var(--nb-muted);">${u.email}</div></td><td>${u.role}</td><td><span class="badge-status badge-${u.status}">${u.status}</span></td></tr>`).join('')}
        </tbody></table>
        <button class="btn-nb btn-nb-outline btn-nb-sm mt-2" onclick="navigate('admin-users')">Manage Users →</button>
      </div></div>
      <div class="col-12 col-lg-6"><div class="nb-card"><h6 class="fw-semibold mb-3">Pending Loans</h6>
        ${loans.filter(l=>l.status==='pending').map(l=>`
          <div class="d-flex justify-content-between align-items-center py-2" style="border-bottom:1px solid var(--nb-border);">
            <div><div style="font-weight:500;">${l.type} Loan — ${fmt(l.amount)}</div><div style="font-size:.75rem;color:var(--nb-muted);">${DB.users.getById(l.userId)?.name||'Unknown'}</div></div>
            <div class="d-flex gap-1"><button class="btn-nb btn-nb-success btn-nb-sm" onclick="runLocked(this, ()=>approveLoan('${l.id}'), 'Approving...')"><i class="bi bi-check2"></i></button><button class="btn-nb btn-nb-danger btn-nb-sm" onclick="runLocked(this, ()=>rejectLoan('${l.id}'), 'Rejecting...')"><i class="bi bi-x"></i></button></div>
          </div>`).join('')||'<div style="color:var(--nb-muted);font-size:.85rem;">No pending loans</div>'}
      </div></div>
    </div>`;
  setTimeout(()=>{
    const months = ['Sep','Oct','Nov','Dec','Jan','Feb'];
    const ctx1 = document.getElementById('admin-txn-chart');
    if (ctx1) new Chart(ctx1, {type:'bar', data:{labels:months,datasets:[{label:'Volume',data:[45000,62000,58000,78000,55000,volume],backgroundColor:'rgba(29,111,164,.7)',borderRadius:6,borderSkipped:false}]},options:{plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>'$'+v.toLocaleString()}}}}});
    const accTypes = {};
    DB.accounts.getAll().forEach(a=>{accTypes[a.type]=(accTypes[a.type]||0)+1;});
    const ctx2 = document.getElementById('admin-acc-chart');
    if (ctx2) new Chart(ctx2, {type:'doughnut', data:{labels:Object.keys(accTypes),datasets:[{data:Object.values(accTypes),backgroundColor:['#1d6fa4','#c9a84c','#12b76a'],borderWidth:0}]},options:{plugins:{legend:{position:'bottom',labels:{font:{size:11}}}},cutout:'60%'}});
  },50);
}

function approveLoan(id) { DB.loans.update(id,{status:'active',nextPayment:new Date(Date.now()+30*86400000).toISOString().slice(0,10)}); logAudit('APPROVE_LOAN','loan',id); toast('Loan approved!','success'); renderPage('admin-dashboard'); }
function rejectLoan(id) { DB.loans.update(id,{status:'rejected'}); logAudit('REJECT_LOAN','loan',id); toast('Loan rejected','warning'); renderPage('admin-dashboard'); }

function renderAdminUsers(el) {
  if (!adminGuard(el)) return;
  const users = DB.users.getAll();
  const rows = users.map(u=>`<tr>
    <td><div style="font-weight:500;">${u.name}</div><div style="font-size:.72rem;color:var(--nb-muted);">${u.email}</div></td>
    <td>${u.role}</td>
    <td>${u.phone||'—'}</td>
    <td>
      ${u.accessCode ? `
        <div class="d-flex align-items-center gap-2">
          <span class="mono" style="font-size:.78rem;font-weight:800;letter-spacing:1px;">${u.accessCode}</span>
          <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="adminCopyAccessCode('${u.id}')" title="Copy access code"><i class="bi bi-clipboard"></i></button>
        </div>
      ` : `
        <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="adminGenerateAccessCode('${u.id}')" title="Generate access code"><i class="bi bi-magic"></i> Generate</button>
      `}
    </td>
    <td>${u.joined||'—'}</td>
    <td><span class="badge-status badge-${u.status}">${u.status}</span></td>
    <td>
      <div class="d-flex gap-1">
        <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="adminViewUser('${u.id}')" title="View Details"><i class="bi bi-eye"></i></button>
        <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="adminEditUser('${u.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="adminResetPassword('${u.id}')" title="Reset Password"><i class="bi bi-key"></i></button>
        ${(u.failedLogins||0)>=5?`<button class="btn-nb btn-nb-outline btn-nb-sm" onclick="adminUnlockUser('${u.id}')" title="Unlock"><i class="bi bi-unlock"></i></button>`:''}
        <button class="btn-nb ${u.status==='active'?'btn-nb-outline':'btn-nb-success'} btn-nb-sm" onclick="adminToggleUser('${u.id}')" title="${u.status==='active'?'Freeze':'Activate'}"><i class="bi bi-${u.status==='active'?'snow':'check2-circle'}"></i></button>
        ${u.role!=='superadmin'?`<button class="btn-nb btn-nb-danger btn-nb-sm" onclick="adminDeleteUser('${u.id}')" title="Delete"><i class="bi bi-trash"></i></button>`:''}
      </div>
    </td>
  </tr>`).join('');
  el.innerHTML = `
    <div class="admin-section mb-3"><i class="bi bi-people-fill" style="color:var(--nb-gold);"></i><div><strong>User Management</strong> — Full CRUD operations</div></div>
    <div class="nb-card">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div class="search-wrap"><i class="bi bi-search"></i><input class="search-bar" placeholder="Search users..." style="width:220px;" oninput="filterTable(this,'users-tbl')"></div>
        <button class="btn-nb btn-nb-primary" onclick="adminAddUserModal()"><i class="bi bi-person-plus"></i> Add User</button>
      </div>
      <div style="overflow-x:auto;"><table class="nb-table" id="users-tbl"><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Access Code</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
}
function filterTable(input, tableId) {
  const q = input.value.toLowerCase();
  document.querySelectorAll(`#${tableId} tbody tr`).forEach(r => r.style.display = r.textContent.toLowerCase().includes(q)?'':'none');
}
function generateTempPassword(len=10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let out = '';
  for (let i=0;i<len;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

function generateAccessCode(len=8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i=0;i<len;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}
function togglePw(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  const show = el.type === 'password';
  el.type = show ? 'text' : 'password';
  if (btn) btn.innerHTML = show ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
}
function copyFieldValue(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const v = el.value || '';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(v).then(()=>toast('Copied','success')).catch(()=>fallbackCopy(v));
  } else {
    fallbackCopy(v);
  }
}
function fallbackCopy(v) {
  const t = document.createElement('textarea');
  t.value = v;
  document.body.appendChild(t);
  t.select();
  try { document.execCommand('copy'); toast('Copied','success'); } catch { toast('Copy failed','error'); }
  t.remove();
}

function adminCopyAccessCode(id) {
  const u = DB.users.getById(id);
  const v = u?.accessCode || '';
  if (!v) return toast('No access code yet. Generate one first.', 'warning');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(v).then(()=>toast('Copied','success')).catch(()=>fallbackCopy(v));
  } else {
    fallbackCopy(v);
  }
}

function adminGenerateAccessCode(id) {
  const u = DB.users.getById(id);
  if (!u) return toast('User not found', 'error');
  const code = generateAccessCode();
  DB.users.update(id, { accessCode: code });
  logAudit('GENERATE_ACCESS_CODE','user',id);
  toast('Access code generated. Copy and share with the customer.', 'success');
  navigate('admin-users');
}
function adminUnlockUser(id) {
  DB.users.update(id, { failedLogins: 0, status: 'active' });
  logAudit('UNLOCK_USER','user',id);
  toast('User unlocked','success');
  navigate('admin-users');
}
function adminResetPassword(id) {
  const u = DB.users.getById(id);
  const temp = generateTempPassword();
  showModal('Reset Password — ' + u.name, `
    <p style="font-size:.85rem;color:var(--nb-muted);margin-bottom:.75rem;">Set a new password for this user. This will also unlock the account.</p>
    <div class="form-group">
      <label>New Password</label>
      <div class="d-flex gap-2">
        <input class="nb-input" id="rp-pass" type="password" value="${temp}">
        <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="togglePw('rp-pass', this)" title="Show/Hide"><i class="bi bi-eye"></i></button>
        <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="copyFieldValue('rp-pass')" title="Copy"><i class="bi bi-clipboard"></i></button>
      </div>
    </div>`,
    `<div class="d-flex gap-2 justify-content-end">
      <button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button>
      <button class="btn-nb btn-nb-primary" onclick="runLocked(this, ()=>adminConfirmResetPassword('${id}'), 'Resetting...')">Reset</button>
    </div>`
  );
}
function adminConfirmResetPassword(id) {
  const pass = document.getElementById('rp-pass').value;
  if (!pass || pass.length < 4) return toast('Password is too short','error');
  DB.users.update(id, { password: pass, failedLogins: 0, status: 'active' });
  logAudit('RESET_PASSWORD','user',id);
  toast('Password reset and user unlocked','success');
  closeModal();
  navigate('admin-users');
}
function adminAddUserModal() {
  showModal('Add New User', `
    <div class="row g-2">
      <div class="col-6 form-group"><label>First Name</label><input class="nb-input" id="au-fname"></div>
      <div class="col-6 form-group"><label>Last Name</label><input class="nb-input" id="au-lname"></div>
    </div>
    <div class="form-group"><label>Email</label><input class="nb-input" id="au-email" type="email"></div>
    <div class="form-group"><label>Password</label><div class="d-flex gap-2"><input class="nb-input" id="au-pass" type="password"><button class="btn-nb btn-nb-outline btn-nb-sm" onclick="togglePw('au-pass', this)" title="Show/Hide"><i class="bi bi-eye"></i></button></div></div>
    <div class="form-group"><label>Access Code (give to customer)</label>
      <div class="d-flex gap-2">
        <input class="nb-input" id="au-code" type="text" value="${generateAccessCode()}" readonly>
        <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="copyFieldValue('au-code')" title="Copy"><i class="bi bi-clipboard"></i></button>
      </div>
    </div>
    <div class="form-group"><label>Role</label><select class="nb-input" id="au-role"><option>customer</option><option>teller</option><option>admin</option></select></div>
    <div class="form-group"><label>Status</label><select class="nb-input" id="au-status"><option>active</option><option>frozen</option></select></div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-primary" onclick="runLocked(this, adminSaveNewUser, 'Creating...')">Create User</button></div>`
  );
}
async function adminSaveNewUser() {
  const fname = document.getElementById('au-fname').value.trim();
  const lname = document.getElementById('au-lname').value.trim();
  const email = document.getElementById('au-email').value.trim();
  const pass = document.getElementById('au-pass').value;
  if (!fname||!email||!pass) return toast('Fill required fields','error');
  if (DB.users.getByEmail(email)) return toast('Email exists','error');
  let id = 'u'+uid();
  const useCloud = !!window.NB_FIREBASE?.adminCreateAuthUser;
  if (useCloud) {
    try {
      const created = await window.NB_FIREBASE.adminCreateAuthUser(email, pass);
      id = created.uid;
    } catch (_) {
      return toast('Unable to create user in Firebase Auth. Check Auth settings.', 'error');
    }
  }
  const accessCode = document.getElementById('au-code')?.value || generateAccessCode();
  const role = document.getElementById('au-role').value;
  const status = document.getElementById('au-status').value;
  const user = {id,name:`${fname} ${lname}`,email,accessCode,role,status,phone:'',address:'',dob:'',joined:new Date().toISOString().slice(0,10),failedLogins:0};
  if (!useCloud) user.password = pass;
  DB.users.create(user);
  DB.accounts.create({ id:'a'+uid(), userId:id, type:'Checking', balance:0, iban:Math.floor(1000000000 + Math.random() * 9000000000).toString(), swift:'NXBKGB21', status:'active', limit:5000, createdAt:new Date().toISOString().slice(0,10) });
  logAudit('CREATE_USER','user',id);
  toast('User created! Copy the access code and share with the customer.','success');
  closeModal();
  navigate('admin-users');
}
function adminEditUser(id) {
  const u = DB.users.getById(id);
  showModal('Edit User: ' + u.name, `
    <div class="form-group"><label>Full Name</label><input class="nb-input" id="eu-name" value="${u.name}"></div>
    <div class="form-group"><label>Email</label><input class="nb-input" id="eu-email" value="${u.email}" type="email"></div>
    <div class="form-group"><label>Access Code</label>
      <div class="d-flex gap-2">
        <input class="nb-input" id="eu-code" value="${u.accessCode || ''}" readonly>
        <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="copyFieldValue('eu-code')" title="Copy"><i class="bi bi-clipboard"></i></button>
      </div>
    </div>
    <div class="form-group"><label>Member Since</label><input class="nb-input" id="eu-joined" type="date" value="${String(u.joined||'').slice(0,10)}"></div>
    <div class="form-group"><label>Phone</label><input class="nb-input" id="eu-phone" value="${u.phone||''}"></div>
    <div class="form-group"><label>Address</label><input class="nb-input" id="eu-addr" value="${u.address||''}"></div>
    <div class="form-group"><label>Role</label><select class="nb-input" id="eu-role"><option ${u.role==='customer'?'selected':''}>customer</option><option ${u.role==='teller'?'selected':''}>teller</option><option ${u.role==='admin'?'selected':''}>admin</option><option ${u.role==='superadmin'?'selected':''}>superadmin</option></select></div>
    <div class="form-group"><label>Status</label><select class="nb-input" id="eu-status"><option ${u.status==='active'?'selected':''}>active</option><option ${u.status==='frozen'?'selected':''}>frozen</option></select></div>
    <div class="d-flex gap-2 flex-wrap"><button class="btn-nb btn-nb-outline" onclick="adminResetPassword('${id}')"><i class="bi bi-key"></i> Reset Password</button>${(u.failedLogins||0)>=5?`<button class="btn-nb btn-nb-outline" onclick="adminUnlockUser('${id}')"><i class="bi bi-unlock"></i> Unlock</button>`:''}</div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-primary" onclick="runLocked(this, ()=>adminUpdateUser('${id}'), 'Saving...')">Save Changes</button></div>`
  );
}
function adminUpdateUser(id) {
  const joinedInput = String(document.getElementById('eu-joined')?.value || '').trim();
  const existing = DB.users.getById(id);
  DB.users.update(id, { name:document.getElementById('eu-name').value, email:document.getElementById('eu-email').value, joined: joinedInput || existing?.joined || new Date().toISOString().slice(0,10), phone:document.getElementById('eu-phone').value, address:document.getElementById('eu-addr').value, role:document.getElementById('eu-role').value, status:document.getElementById('eu-status').value });
  logAudit('UPDATE_USER','user',id);
  toast('User updated','success');
  closeModal();
  navigate('admin-users');
}
function adminToggleUser(id) {
  const u = DB.users.getById(id);
  const ns = u.status==='active'?'frozen':'active';
  DB.users.update(id,{status:ns});
  logAudit(ns==='frozen'?'FREEZE_USER':'ACTIVATE_USER','user',id);
  toast(`User ${ns}`,'warning');
  navigate('admin-users');
}
function adminDeleteUser(id) {
  if (!confirm('Delete this user? This cannot be undone.')) return;
  DB.users.delete(id);
  DB.set('accounts', DB.accounts.getAll().filter(a=>a.userId!==id));
  logAudit('DELETE_USER','user',id);
  toast('User deleted','success');
  navigate('admin-users');
}

function renderAdminKYC(el) {
  if (!adminGuard(el)) return;
  const users = DB.users.getAll().filter(u => u.kycStatus === 'pending');
  const rows = users.map(u => `
    <tr>
      <td><div style="font-weight:500;">${u.name}</div><div style="font-size:.72rem;color:var(--nb-muted);">${u.email}</div></td>
      <td>${adminDocLabel(u.kycData?.type || '—')}</td>
      <td>${u.kycData?.num || '—'}</td>
      <td>${fmtDate(u.kycData?.submittedAt)}</td>
      <td>
        <div class="d-flex gap-1">
          <button class="btn-nb btn-nb-primary btn-nb-sm" onclick="adminViewKYC('${u.id}')"><i class="bi bi-eye"></i> View Documents</button>
        </div>
      </td>
    </tr>`).join('');

  el.innerHTML = `
    <div class="admin-section mb-3"><i class="bi bi-shield-check" style="color:var(--nb-gold);"></i><div><strong>KYC Verifications</strong> — Review pending identity documents</div></div>
    <div class="nb-card">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div class="search-wrap"><i class="bi bi-search"></i><input class="search-bar" placeholder="Search pending..." style="width:220px;" oninput="filterTable(this,'kyc-tbl')"></div>
      </div>
      <div style="overflow-x:auto;"><table class="nb-table" id="kyc-tbl"><thead><tr><th>User</th><th>Doc Type</th><th>Doc Number</th><th>Submitted</th><th>Actions</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="text-center py-4 text-muted">No pending KYC requests</td></tr>'}</tbody></table></div>
    </div>`;
}

function adminViewKYC(userId) {
  const u = DB.users.getById(userId);
  if (!u || !u.kycData) return toast('KYC data not found', 'error');
  
  const data = u.kycData;
  showModal('Review KYC: ' + u.name, `
    <div class="row g-3">
      <div class="col-12">
        <div style="font-size:.85rem;color:var(--nb-muted);">Document Type: <strong>${adminDocLabel(data.type)}</strong></div>
        <div style="font-size:.85rem;color:var(--nb-muted);">Document Number: <strong>${data.num}</strong></div>
        <div style="font-size:.85rem;color:var(--nb-muted);">Proof of Address: <strong>${adminDocLabel(data.proofType || '—')}</strong></div>
      </div>
      <div class="col-md-6">
        <label style="font-size:.75rem;font-weight:700;display:block;margin-bottom:.25rem;">Government ID</label>
        <img src="${data.front}" style="width:100%;border-radius:8px;border:1px solid var(--nb-border);">
      </div>
      <div class="col-md-6">
        <label style="font-size:.75rem;font-weight:700;display:block;margin-bottom:.25rem;">Proof of Address</label>
        ${(data.proofOfAddress || data.back) ? `<img src="${data.proofOfAddress || data.back}" style="width:100%;border-radius:8px;border:1px solid var(--nb-border);">` : `<div style="padding:1rem;background:var(--nb-bg);text-align:center;border-radius:8px;font-size:.75rem;color:var(--nb-muted);">Not provided</div>`}
      </div>
      <div class="col-12">
        <label style="font-size:.75rem;font-weight:700;display:block;margin-bottom:.25rem;">Selfie</label>
        <img src="${data.selfie}" style="width:100%;max-height:300px;object-fit:contain;border-radius:8px;border:1px solid var(--nb-border);">
      </div>
      <div class="col-12">
        <label style="font-size:.75rem;font-weight:700;display:block;margin-bottom:.25rem;">Rejection Reason (Optional)</label>
        <input class="nb-input" id="kyc-reject-reason" placeholder="Why is this being rejected?">
      </div>
    </div>`,
    `<div class="d-flex gap-2 justify-content-end">
      <button class="btn-nb btn-nb-outline" onclick="closeModal()">Close</button>
      <button class="btn-nb btn-nb-danger" onclick="adminRejectKYC('${userId}')"><i class="bi bi-x-circle"></i> Reject</button>
      <button class="btn-nb btn-nb-success" onclick="adminVerifyKYC('${userId}')"><i class="bi bi-check-circle"></i> Verify User</button>
    </div>`
  );
}

function adminVerifyKYC(userId) {
  DB.users.update(userId, { kycStatus: 'verified' });
  logAudit('VERIFY_KYC', 'user', userId);
  toast('User KYC verified successfully', 'success');
  closeModal();
  navigate('admin-kyc');
}

function adminRejectKYC(userId) {
  const reason = document.getElementById('kyc-reject-reason').value.trim() || 'Documents were unclear or invalid';
  DB.users.update(userId, { kycStatus: 'rejected', kycReason: reason });
  logAudit('REJECT_KYC', 'user', userId, reason);
  toast('User KYC rejected', 'warning');
  closeModal();
  navigate('admin-kyc');
}

function renderAdminAccounts(el) {
  if (!adminGuard(el)) return;
  const accounts = DB.accounts.getAll();
  const rows = accounts.map(a=>{
    const owner = DB.users.getById(a.userId);
    return `<tr>
      <td class="mono" style="font-size:.78rem;">${a.id}</td>
      <td><div style="font-weight:500;">${owner?.name||'?'}</div><div style="font-size:.72rem;color:var(--nb-muted);">${owner?.email||''}</div></td>
      <td>${a.type}</td>
      <td class="mono">${fmt(a.balance)}</td>
      <td><span class="badge-status badge-${a.status}">${a.status}</span></td>
      <td>
        <div class="d-flex gap-1">
          <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="adminAdjustBalance('${a.id}')" title="Adjust Balance"><i class="bi bi-currency-dollar"></i></button>
          <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="adminEditAccountOpened('${a.id}')" title="Edit Opened Date"><i class="bi bi-calendar3"></i></button>
          <button class="btn-nb ${a.status==='active'?'btn-nb-outline':'btn-nb-success'} btn-nb-sm" onclick="adminToggleAccount('${a.id}')" title="${a.status==='active'?'Freeze':'Unfreeze'}"><i class="bi bi-${a.status==='active'?'snow':'check2-circle'}"></i></button>
          <button class="btn-nb btn-nb-danger btn-nb-sm" onclick="adminDeleteAccount('${a.id}')" title="Delete"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
  el.innerHTML = `
    <div class="admin-section mb-3"><i class="bi bi-wallet2" style="color:var(--nb-gold);"></i><div><strong>Account Management</strong> — Full CRUD</div></div>
    <div class="nb-card">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div class="search-wrap"><i class="bi bi-search"></i><input class="search-bar" placeholder="Search accounts..." style="width:220px;" oninput="filterTable(this,'accs-tbl')"></div>
        <button class="btn-nb btn-nb-primary" onclick="adminCreateAccountModal()"><i class="bi bi-plus-lg"></i> Create Account</button>
      </div>
      <div style="overflow-x:auto;"><table class="nb-table" id="accs-tbl"><thead><tr><th>ID</th><th>Owner</th><th>Type</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
}
function adminAdjustBalance(id) {
  const a = DB.accounts.getById(id);
  showModal('Adjust Balance — ' + a.type, `
    <p style="font-size:.85rem;">Current balance: <strong class="mono">${fmt(a.balance)}</strong></p>
    <div class="form-group"><label>Adjustment Type</label><select class="nb-input" id="adj-type"><option value="credit">Credit (+)</option><option value="debit">Debit (-)</option><option value="set">Set to Amount</option></select></div>
    <div class="form-group"><label>Amount ($)</label><input class="nb-input" id="adj-amount" type="number" placeholder="0.00"></div>
    <div class="form-group"><label>Transaction Date</label><input class="nb-input" id="adj-ts" type="datetime-local" value="${toDatetimeLocalValue(new Date().toISOString())}"></div>
    <div class="form-group"><label>Reason</label><input class="nb-input" id="adj-reason" placeholder="Reason for adjustment"></div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-gold" onclick="runLocked(this, ()=>doAdjustBalance('${id}'), 'Applying...')">Apply Adjustment</button></div>`
  );
}

function adminEditAccountOpened(id) {
  const a = DB.accounts.getById(id);
  if (!a) return toast('Account not found', 'error');
  const owner = DB.users.getById(a.userId);
  const v = String(a.createdAt || '').slice(0, 10);
  showModal('Edit Opened Date — ' + a.type, `
    <div class="form-group"><label>Account</label><div class="mono">${a.id}</div></div>
    <div class="form-group"><label>Owner</label><div>${owner?.name || '—'}</div></div>
    <div class="form-group"><label>Opened Date</label><input class="nb-input" id="ea-opened" type="date" value="${v}"></div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-primary" onclick="runLocked(this, ()=>adminSaveAccountOpened('${id}'), 'Saving...')">Save</button></div>`
  );
}

function adminSaveAccountOpened(id) {
  const a = DB.accounts.getById(id);
  if (!a) return toast('Account not found', 'error');
  const opened = String(document.getElementById('ea-opened')?.value || '').trim();
  if (!opened) return toast('Select a date', 'error');
  DB.accounts.update(id, { createdAt: opened });
  logAudit('UPDATE_ACCOUNT_OPENED','account',id,opened);
  toast('Opened date updated', 'success');
  closeModal();
  navigate('admin-accounts');
}
async function doAdjustBalance(id) {
  const a = DB.accounts.getById(id);
  const type = document.getElementById('adj-type').value;
  const amount = parseFloat(document.getElementById('adj-amount').value);
  const reason = sanitizeTxnDesc(document.getElementById('adj-reason').value||'Account adjustment');
  const ts = fromDatetimeLocalValue(document.getElementById('adj-ts').value) || new Date().toISOString();
  if (!amount) return toast('Enter amount','error');
  let newBal = a.balance;
  if (type==='credit') newBal += amount;
  else if (type==='debit') newBal -= amount;
  else newBal = amount;
  DB.accounts.update(id, {balance: Math.max(0, newBal)});
  const txnId = 't' + uid();
  DB.transactions.create({id:txnId,fromId:type==='debit'?id:null,toId:type==='credit'?id:null,amount,type:'adjustment',category:'Adjustment',desc:reason,status:'completed',ts});
  const ownerId = a.userId;
  const direction = type === 'debit' ? 'debit' : 'credit';
  
  // Send Email Alert
  sendTransactionAlert(ownerId, direction, amount, reason);

  const msg = direction === 'debit'
    ? `A withdrawal of ${fmt(amount)} was posted. ${reason ? '('+reason+')' : ''}`.trim()
    : `A deposit of ${fmt(amount)} was posted. ${reason ? '('+reason+')' : ''}`.trim();
  const notifId = 'n' + uid();
  DB.notifications.add({ id:notifId, userId: ownerId, message: msg, type: 'info', read: false, ts });
  logAudit('ADJUST_BALANCE','account',id,reason);

  const cloudEnabled = !!DB?.cloud?.enabled && DB.cloud.enabled();
  if (!cloudEnabled) {
    toast('Saved locally only (cloud sync is off). This balance will not reflect on other phones/browsers.', 'warning');
  } else if (window.NB_FIREBASE?.upsert) {
    try {
      await window.NB_FIREBASE.upsert('accounts', id, DB.accounts.getById(id));
      const txn = DB.transactions.getAll().find(t => t.id === txnId);
      if (txn) await window.NB_FIREBASE.upsert('transactions', txnId, txn);
      const notifs = DB.get('notifications') || [];
      const notif = notifs.find(n => n.id === notifId);
      if (notif) await window.NB_FIREBASE.upsert('notifications', notifId, notif);
    } catch (_) {
      toast('Saved locally, but cloud sync failed. Other devices may still show the old balance.', 'warning');
    }
  }

  toast('Balance adjusted!','success');
  closeModal();
  navigate('admin-accounts');
}
function adminToggleAccount(id) {
  const a = DB.accounts.getById(id);
  const ns = a.status==='active'?'frozen':'active';
  DB.accounts.update(id,{status:ns});
  logAudit(ns==='frozen'?'FREEZE_ACCOUNT':'UNFREEZE_ACCOUNT','account',id);
  toast(`Account ${ns}`,'warning');
  navigate('admin-accounts');
}
function adminDeleteAccount(id) {
  if (!confirm('Delete this account permanently?')) return;
  DB.accounts.delete(id);
  logAudit('DELETE_ACCOUNT','account',id);
  toast('Account deleted','success');
  navigate('admin-accounts');
}
function adminCreateAccountModal() {
  const users = DB.users.getAll();
  showModal('Create Account', `
    <div class="form-group"><label>User</label><select class="nb-input" id="ca-user">${users.map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}</select></div>
    <div class="form-group"><label>Account Type</label><select class="nb-input" id="ca-type"><option>Checking</option><option>Savings</option><option>Fixed Deposit</option></select></div>
    <div class="form-group"><label>Initial Balance</label><input class="nb-input" id="ca-bal" type="number" value="0"></div>
    <div class="form-group"><label>Status</label><select class="nb-input" id="ca-status"><option>active</option><option>frozen</option></select></div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-primary" onclick="runLocked(this, adminSaveAccount, 'Creating...')">Create</button></div>`
  );
}
function adminSaveAccount() {
  const id = 'a'+uid();
  DB.accounts.create({id,userId:document.getElementById('ca-user').value,type:document.getElementById('ca-type').value,balance:parseFloat(document.getElementById('ca-bal').value)||0,iban:'GB29NWBK'+Math.floor(Math.random()*1e14),swift:'NXBKGB21',status:document.getElementById('ca-status').value,limit:5000,createdAt:new Date().toISOString().slice(0,10)});
  logAudit('CREATE_ACCOUNT','account',id);
  toast('Account created!','success');
  closeModal();
  navigate('admin-accounts');
}

function renderAdminTransactions(el) {
  if (!adminGuard(el)) return;
  const txns = DB.transactions.getAll().sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  const rows = txns.map(t=>`<tr>
    <td class="mono" style="font-size:.72rem;">${t.id}</td>
    <td><div style="font-weight:500;">${sanitizeTxnDesc(t.desc)}</div><div style="font-size:.72rem;color:var(--nb-muted);">${t.category}</div></td>
    <td class="mono">${fmt(t.amount)}</td>
    <td>${t.type}</td>
    <td>${fmtDate(t.ts)}</td>
    <td><span class="badge-status badge-${t.status}">${t.status}</span></td>
    <td>
      <div class="d-flex gap-1">
        <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="adminEditTxn('${t.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn-nb btn-nb-danger btn-nb-sm" onclick="runLocked(this, ()=>adminDeleteTxn('${t.id}'), 'Deleting...')" title="Delete"><i class="bi bi-trash"></i></button>
      </div>
    </td>
  </tr>`).join('');
  el.innerHTML = `
    <div class="admin-section mb-3"><i class="bi bi-arrow-down-up" style="color:var(--nb-gold);"></i><div><strong>Transaction Management</strong> — View, Edit, Void all transactions</div></div>
    <div class="nb-card">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div class="search-wrap"><i class="bi bi-search"></i><input class="search-bar" placeholder="Search transactions..." style="width:220px;" oninput="filterTable(this,'txns-tbl')"></div>
        <div class="d-flex gap-2"><button class="btn-nb btn-nb-primary" onclick="adminCreateTxnModal()"><i class="bi bi-plus-lg"></i> Manual Entry</button>
        <button class="btn-nb btn-nb-outline" onclick="exportAllTxns()"><i class="bi bi-download"></i> Export</button></div>
      </div>
      <div style="overflow-x:auto;"><table class="nb-table" id="txns-tbl"><thead><tr><th>ID</th><th>Description</th><th>Amount</th><th>Type</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
}
function adminCreateTxnModal() {
  const accounts = DB.accounts.getAll();
  const accOpts = accounts.map(a=>{const u=DB.users.getById(a.userId);return `<option value="${a.id}">${a.type} — ${u?.name||'?'}</option>`;}).join('');
  showModal('Manual Transaction', `
    <div class="form-group"><label>From Account (leave blank for credit)</label><select class="nb-input" id="mt-from"><option value="">— None —</option>${accOpts}</select></div>
    <div class="form-group"><label>To Account (leave blank for debit)</label><select class="nb-input" id="mt-to"><option value="">— None —</option>${accOpts}</select></div>
    <div class="form-group"><label>Amount ($)</label><input class="nb-input" id="mt-amount" type="number"></div>
    <div class="form-group"><label>Transaction Date</label><input class="nb-input" id="mt-ts" type="datetime-local" value="${toDatetimeLocalValue(new Date().toISOString())}"></div>
    <div class="form-group"><label>Category</label><select class="nb-input" id="mt-cat"><option>Adjustment</option><option>Transfer</option><option>Fee</option><option>Refund</option><option>Interest</option></select></div>
    <div class="form-group"><label>Description</label><input class="nb-input" id="mt-desc" placeholder="Reason / notes"></div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-primary" onclick="runLocked(this, adminSaveTxn, 'Creating...')">Create</button></div>`
  );
}
function adminSaveTxn() {
  const amount = parseFloat(document.getElementById('mt-amount').value);
  if (!amount) return toast('Enter amount','error');
  const fromId = document.getElementById('mt-from').value||null;
  const toId = document.getElementById('mt-to').value||null;
  const ts = fromDatetimeLocalValue(document.getElementById('mt-ts').value) || new Date().toISOString();
  const cat = document.getElementById('mt-cat').value;
  const desc = sanitizeTxnDesc(document.getElementById('mt-desc').value||'Transaction posted');
  if (fromId) { 
    const a=DB.accounts.getById(fromId); 
    DB.accounts.update(fromId,{balance:Math.max(0,a.balance-amount)}); 
    sendTransactionAlert(a.userId, 'debit', amount, desc);
  }
  if (toId) { 
    const a=DB.accounts.getById(toId); 
    DB.accounts.update(toId,{balance:a.balance+amount}); 
    sendTransactionAlert(a.userId, 'credit', amount, desc);
  }
  const id='t'+uid();
  DB.transactions.create({id,fromId,toId,amount,type:'adjustment',category:cat,desc,status:'completed',ts});
  const impacted = new Set();
  if (fromId) impacted.add(DB.accounts.getById(fromId)?.userId);
  if (toId) impacted.add(DB.accounts.getById(toId)?.userId);
  impacted.forEach(userId => {
    if (!userId) return;
    DB.notifications.add({ id:'n'+uid(), userId, message: `A transaction of ${fmt(amount)} was posted. ${desc ? '('+desc+')' : ''}`.trim(), type:'info', read:false, ts });
  });
  logAudit('CREATE_TRANSACTION','transaction',id);
  toast('Transaction created!','success');
  closeModal();
  navigate('admin-transactions');
}
function adminEditTxn(id) {
  const t = DB.transactions.getAll().find(tx=>tx.id===id);
  showModal('Edit Transaction', `
    <div class="form-group"><label>Description</label><input class="nb-input" id="et-desc" value="${t.desc}"></div>
    <div class="form-group"><label>Category</label><input class="nb-input" id="et-cat" value="${t.category}"></div>
    <div class="form-group"><label>Date</label><input class="nb-input" id="et-ts" type="datetime-local" value="${toDatetimeLocalValue(t.ts)}"></div>
    <div class="form-group"><label>Status</label><select class="nb-input" id="et-status"><option ${t.status==='completed'?'selected':''}>completed</option><option ${t.status==='pending'?'selected':''}>pending</option><option ${t.status==='reversed'?'selected':''}>reversed</option></select></div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-primary" onclick="runLocked(this, ()=>adminUpdateTxn('${id}'), 'Saving...')">Save</button></div>`
  );
}
function adminUpdateTxn(id) {
  const ts = fromDatetimeLocalValue(document.getElementById('et-ts').value);
  const update = {
    desc: sanitizeTxnDesc(document.getElementById('et-desc').value),
    category: document.getElementById('et-cat').value,
    status: document.getElementById('et-status').value
  };
  if (ts) update.ts = ts;
  DB.transactions.update(id, update);
  logAudit('UPDATE_TRANSACTION','transaction',id);
  toast('Transaction updated','success');
  closeModal();
  navigate('admin-transactions');
}
function adminDeleteTxn(id) {
  if (!confirm('Delete this transaction permanently?')) return;
  DB.transactions.delete(id);
  logAudit('DELETE_TRANSACTION','transaction',id);
  toast('Transaction deleted','success');
  navigate('admin-transactions');
}
function exportAllTxns() {
  const txns = DB.transactions.getAll();
  const csv = ['ID,Date,Description,Category,Amount,Type,Status',...txns.map(t=>`${t.id},${t.ts},"${t.desc}",${t.category},${t.amount},${t.type},${t.status}`)].join('\n');
  const a = document.createElement('a'); a.href='data:text/csv,'+encodeURIComponent(csv); a.download='all-transactions.csv'; a.click();
}

function renderAdminLoans(el) {
  if (!adminGuard(el)) return;
  const loans = DB.loans.getAll();
  const rows = loans.map(l=>{
    const u = DB.users.getById(l.userId);
    return `<tr>
      <td><div style="font-weight:500;">${u?.name||'?'}</div><div style="font-size:.72rem;color:var(--nb-muted);">${u?.email||''}</div></td>
      <td>${l.type}</td>
      <td class="mono">${fmt(l.amount)}</td>
      <td>${l.rate}%</td>
      <td>${l.term}mo</td>
      <td class="mono">${fmt(l.monthlyPayment)}</td>
      <td><span class="badge-status badge-${l.status}">${l.status}</span></td>
      <td>
        <div class="d-flex gap-1">
          <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="adminEditLoan('${l.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
          ${l.status==='pending'?`<button class="btn-nb btn-nb-success btn-nb-sm" onclick="runLocked(this, ()=>approveLoan('${l.id}'), 'Approving...')"><i class="bi bi-check2"></i></button><button class="btn-nb btn-nb-danger btn-nb-sm" onclick="runLocked(this, ()=>rejectLoan('${l.id}'), 'Rejecting...')"><i class="bi bi-x"></i></button>`:''}
          <button class="btn-nb btn-nb-danger btn-nb-sm" onclick="adminDeleteLoan('${l.id}')" title="Cancel"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    </tr>`;}).join('');
  el.innerHTML = `
    <div class="admin-section mb-3"><i class="bi bi-bank" style="color:var(--nb-gold);"></i><div><strong>Loan Management</strong> — Approve, reject, edit all loans</div></div>
    <div class="nb-card">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div class="search-wrap"><i class="bi bi-search"></i><input class="search-bar" placeholder="Search loans..." style="width:220px;" oninput="filterTable(this,'loans-tbl')"></div>
        <button class="btn-nb btn-nb-primary" onclick="adminCreateLoanModal()"><i class="bi bi-plus-lg"></i> Issue Loan</button>
      </div>
      <div style="overflow-x:auto;"><table class="nb-table" id="loans-tbl"><thead><tr><th>Customer</th><th>Type</th><th>Amount</th><th>Rate</th><th>Term</th><th>Monthly</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
}
function adminEditLoan(id) {
  const l = DB.loans.getById(id);
  showModal('Edit Loan', `
    <div class="form-group"><label>Interest Rate (%)</label><input class="nb-input" id="el-rate" type="number" step="0.1" value="${l.rate}"></div>
    <div class="form-group"><label>Term (months)</label><input class="nb-input" id="el-term" type="number" value="${l.term}"></div>
    <div class="form-group"><label>Status</label><select class="nb-input" id="el-status"><option ${l.status==='active'?'selected':''}>active</option><option ${l.status==='pending'?'selected':''}>pending</option><option ${l.status==='paid'?'selected':''}>paid</option><option ${l.status==='rejected'?'selected':''}>rejected</option></select></div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-primary" onclick="adminUpdateLoan('${id}')">Save</button></div>`
  );
}
function adminUpdateLoan(id) {
  DB.loans.update(id,{rate:parseFloat(document.getElementById('el-rate').value),term:parseInt(document.getElementById('el-term').value),status:document.getElementById('el-status').value});
  logAudit('UPDATE_LOAN','loan',id);
  toast('Loan updated','success');
  closeModal();
  navigate('admin-loans');
}
function adminDeleteLoan(id) {
  if (!confirm('Cancel/delete this loan?')) return;
  DB.loans.delete(id);
  logAudit('DELETE_LOAN','loan',id);
  toast('Loan deleted','success');
  navigate('admin-loans');
}
function adminCreateLoanModal() {
  const users = DB.users.getAll();
  showModal('Issue Loan', `
    <div class="form-group"><label>Customer</label><select class="nb-input" id="il-user">${users.map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}</select></div>
    <div class="form-group"><label>Type</label><select class="nb-input" id="il-type"><option>Personal</option><option>Auto</option><option>Mortgage</option><option>Business</option></select></div>
    <div class="form-group"><label>Amount ($)</label><input class="nb-input" id="il-amount" type="number"></div>
    <div class="form-group"><label>Rate (%)</label><input class="nb-input" id="il-rate" type="number" step="0.1" value="5.5"></div>
    <div class="form-group"><label>Term (months)</label><input class="nb-input" id="il-term" type="number" value="24"></div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-primary" onclick="adminIssueLoan()">Issue Loan</button></div>`
  );
}
function adminIssueLoan() {
  const amount = parseFloat(document.getElementById('il-amount').value);
  const rate = parseFloat(document.getElementById('il-rate').value);
  const term = parseInt(document.getElementById('il-term').value);
  if (!amount) return toast('Enter amount','error');
  const r = rate/100/12;
  const monthly = r>0 ? amount*(r*Math.pow(1+r,term))/(Math.pow(1+r,term)-1) : amount/term;
  const id='l'+uid();
  DB.loans.create({id,userId:document.getElementById('il-user').value,type:document.getElementById('il-type').value,amount,rate,term,paid:0,status:'active',appliedAt:new Date().toISOString().slice(0,10),nextPayment:new Date(Date.now()+30*86400000).toISOString().slice(0,10),monthlyPayment:Math.round(monthly*100)/100});
  logAudit('ISSUE_LOAN','loan',id);
  toast('Loan issued!','success');
  closeModal();
  navigate('admin-loans');
}

function renderAdminCards(el) {
  if (!adminGuard(el)) return;
  const cards = DB.cards.getAll();
  const rows = cards.map(c=>{
    const u = DB.users.getById(c.userId);
    return `<tr>
      <td class="mono">${c.maskedNumber}</td>
      <td><div style="font-weight:500;">${u?.name||'?'}</div></td>
      <td>${c.type}</td>
      <td>${c.expiry}</td>
      <td class="mono">${fmt(c.dailyLimit)}</td>
      <td><span class="badge-status badge-${c.status}">${c.status}</span></td>
      <td>
        <div class="d-flex gap-1">
          <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="adminEditCardModal('${c.id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn-nb ${c.status==='active'?'btn-nb-outline':'btn-nb-success'} btn-nb-sm" onclick="adminToggleCard('${c.id}')"><i class="bi bi-${c.status==='active'?'snow':'check2-circle'}"></i></button>
          <button class="btn-nb btn-nb-danger btn-nb-sm" onclick="adminCancelCard('${c.id}')"><i class="bi bi-x-octagon"></i></button>
        </div>
      </td>
    </tr>`;}).join('');
  el.innerHTML = `
    <div class="admin-section mb-3"><i class="bi bi-credit-card" style="color:var(--nb-gold);"></i><div><strong>Card Management</strong> — Full CRUD on all cards</div></div>
    <div class="nb-card">
      <div style="overflow-x:auto;"><table class="nb-table"><thead><tr><th>Card Number</th><th>Owner</th><th>Type</th><th>Expiry</th><th>Daily Limit</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
}
function adminToggleCard(id) {
  const c = DB.cards.getById(id);
  const ns = c.status==='active'?'frozen':'active';
  DB.cards.update(id,{status:ns});
  logAudit(ns==='frozen'?'FREEZE_CARD':'UNFREEZE_CARD','card',id);
  toast(`Card ${ns}`,'warning');
  navigate('admin-cards');
}
function adminCancelCard(id) {
  if (!confirm('Permanently cancel this card?')) return;
  DB.cards.update(id,{status:'cancelled'});
  logAudit('CANCEL_CARD','card',id);
  toast('Card cancelled','warning');
  navigate('admin-cards');
}
function adminEditCardModal(id) {
  const c = DB.cards.getById(id);
  showModal('Edit Card Limits', `
    <div class="form-group"><label>Daily Limit ($)</label><input class="nb-input" id="ac-daily" type="number" value="${c.dailyLimit}"></div>
    <div class="form-group"><label>Monthly Limit ($)</label><input class="nb-input" id="ac-monthly" type="number" value="${c.monthlyLimit}"></div>
    <div class="form-group"><label>Status</label><select class="nb-input" id="ac-status"><option ${c.status==='active'?'selected':''}>active</option><option ${c.status==='frozen'?'selected':''}>frozen</option><option ${c.status==='cancelled'?'selected':''}>cancelled</option></select></div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-primary" onclick="adminUpdateCard('${id}')">Save</button></div>`
  );
}
function adminUpdateCard(id) {
  DB.cards.update(id,{dailyLimit:parseFloat(document.getElementById('ac-daily').value),monthlyLimit:parseFloat(document.getElementById('ac-monthly').value),status:document.getElementById('ac-status').value});
  logAudit('UPDATE_CARD','card',id);
  toast('Card updated','success');
  closeModal();
  navigate('admin-cards');
}

function renderAdminReports(el) {
  if (!adminGuard(el)) return;
  const txns = DB.transactions.getAll();
  const users = DB.users.getAll();
  const loans = DB.loans.getAll();
  const totalRevenue = txns.filter(t=>t.category==='Fee'||t.category==='Interest').reduce((s,t)=>s+t.amount,0);
  el.innerHTML = `
    <div class="admin-section mb-3"><i class="bi bi-bar-chart" style="color:var(--nb-gold);"></i><div><strong>Reports & Analytics</strong></div></div>
    <div class="row g-3 mb-4">
      <div class="col-6 col-xl-3"><div class="stat-card"><div class="stat-label">Total Transactions</div><div class="stat-value">${txns.length}</div></div></div>
      <div class="col-6 col-xl-3"><div class="stat-card gold"><div class="stat-label">Total Users</div><div class="stat-value">${users.length}</div></div></div>
      <div class="col-6 col-xl-3"><div class="stat-card green"><div class="stat-label">Active Loans</div><div class="stat-value">${loans.filter(l=>l.status==='active').length}</div></div></div>
      <div class="col-6 col-xl-3"><div class="stat-card red"><div class="stat-label">Pending Reviews</div><div class="stat-value">${loans.filter(l=>l.status==='pending').length}</div></div></div>
    </div>
    <div class="row g-3">
      <div class="col-12 col-lg-8"><div class="nb-card"><h6 class="fw-semibold mb-3">Monthly Transaction Summary</h6><canvas id="monthly-chart" height="150"></canvas></div></div>
      <div class="col-12 col-lg-4"><div class="nb-card"><h6 class="fw-semibold mb-3">Transaction Types</h6><canvas id="type-chart" height="200"></canvas></div></div>
    </div>
    <div class="row g-3 mt-0">
      <div class="col-12"><div class="nb-card">
        <div class="d-flex justify-content-between align-items-center mb-3"><h6 class="fw-semibold mb-0">User Status Distribution</h6><button class="btn-nb btn-nb-outline btn-nb-sm" onclick="exportReport()"><i class="bi bi-download"></i> Export</button></div>
        <div class="row g-3">
          ${['active','frozen','pending'].map(s=>{const count=users.filter(u=>u.status===s).length;const pct=Math.round(count/users.length*100)||0;return `<div class="col-12 col-md-4"><div style="font-size:.85rem;margin-bottom:.3rem;">${s.charAt(0).toUpperCase()+s.slice(1)} Users <strong>${count}</strong> (${pct}%)</div><div class="progress-bar-custom"><div class="progress-fill" style="width:${pct}%;"></div></div></div>`;}).join('')}
        </div>
      </div></div>
    </div>`;
  setTimeout(()=>{
    const months = ['Sep','Oct','Nov','Dec','Jan','Feb'];
    const ctx1 = document.getElementById('monthly-chart');
    if(ctx1) new Chart(ctx1, {type:'line',data:{labels:months,datasets:[{label:'Payments',data:[12,8,15,11,9,txns.filter(t=>t.type==='payment').length],borderColor:'#1d6fa4',fill:true,backgroundColor:'rgba(29,111,164,.1)',tension:.4},{label:'Transfers',data:[5,7,6,9,8,txns.filter(t=>t.type==='transfer').length],borderColor:'#c9a84c',fill:true,backgroundColor:'rgba(201,168,76,.1)',tension:.4}]},options:{plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true}}}});
    const types = {};
    txns.forEach(t=>{types[t.type]=(types[t.type]||0)+1;});
    const ctx2 = document.getElementById('type-chart');
    if(ctx2) new Chart(ctx2, {type:'doughnut',data:{labels:Object.keys(types),datasets:[{data:Object.values(types),backgroundColor:['#1d6fa4','#c9a84c','#12b76a','#f04438'],borderWidth:0}]},options:{plugins:{legend:{position:'bottom',labels:{font:{size:11}}}},cutout:'60%'}});
  },50);
}
function exportReport() {
  const users = DB.users.getAll();
  const csv = ['Name,Email,Role,Status,Joined',...users.map(u=>`${u.name},${u.email},${u.role},${u.status},${u.joined}`)].join('\n');
  const a = document.createElement('a'); a.href='data:text/csv,'+encodeURIComponent(csv); a.download='user-report.csv'; a.click();
}

function renderAdminConfig(el) {
  if (!adminGuard(el)) return;
  el.innerHTML = `
    <div class="admin-section mb-3"><i class="bi bi-gear" style="color:var(--nb-gold);"></i><div><strong>System Configuration</strong></div></div>
    <div class="row g-4">
      <div class="col-12 col-lg-6">
        <div class="nb-card">
          <h6 class="fw-semibold mb-3">Interest Rates</h6>
          ${[['Savings Account','3.50'],['Fixed Deposit','5.00'],['Personal Loan','8.00'],['Mortgage','4.50'],['Auto Loan','6.00']].map(([n,v])=>`
            <div class="d-flex justify-content-between align-items-center py-2" style="border-bottom:1px solid var(--nb-border);">
              <div style="font-size:.88rem;">${n}</div>
              <div class="d-flex align-items-center gap-2"><input class="nb-input" style="width:80px;text-align:center;" type="number" step="0.01" value="${v}"><span style="font-size:.85rem;">%</span></div>
            </div>`).join('')}
          <button class="btn-nb btn-nb-primary mt-3" onclick="toast('Rates saved!','success')">Save Rates</button>
        </div>
        <div class="nb-card mt-3">
          <h6 class="fw-semibold mb-3">Transfer Limits</h6>
          ${[['Daily Customer Limit','10,000'],['Monthly Customer Limit','50,000'],['International Limit','25,000'],['Teller Daily','100,000']].map(([n,v])=>`
            <div class="d-flex justify-content-between align-items-center py-2" style="border-bottom:1px solid var(--nb-border);">
              <div style="font-size:.88rem;">${n}</div>
              <div class="d-flex align-items-center gap-2"><span style="font-size:.85rem;">$</span><input class="nb-input" style="width:110px;text-align:right;" type="text" value="${v}"></div>
            </div>`).join('')}
          <button class="btn-nb btn-nb-primary mt-3" onclick="toast('Limits saved!','success')">Save Limits</button>
        </div>
      </div>
      <div class="col-12 col-lg-6">
        <div class="nb-card mb-3">
          <h6 class="fw-semibold mb-3">System Controls</h6>
          <div class="d-flex justify-content-between align-items-center py-2" style="border-bottom:1px solid var(--nb-border);">
            <div><div style="font-weight:500;">Maintenance Mode</div><div style="font-size:.78rem;color:var(--nb-muted);">Locks all customer logins</div></div>
            <button class="btn-nb btn-nb-outline" onclick="toast('Maintenance mode toggled','warning')">Toggle</button>
          </div>
          <div class="d-flex justify-content-between align-items-center py-2" style="border-bottom:1px solid var(--nb-border);">
            <div><div style="font-weight:500;">New Registrations</div><div style="font-size:.78rem;color:var(--nb-muted);">Allow new account creation</div></div>
            <button class="btn-nb btn-nb-success btn-nb-sm">Enabled</button>
          </div>
          <div class="d-flex justify-content-between align-items-center py-2">
            <div><div style="font-weight:500;">2FA Enforcement</div><div style="font-size:.78rem;color:var(--nb-muted);">Require OTP for all transfers</div></div>
            <button class="btn-nb btn-nb-success btn-nb-sm">Enabled</button>
          </div>
        </div>
        <div class="nb-card mb-3">
          <h6 class="fw-semibold mb-3">Broadcast Announcement</h6>
          <div class="form-group"><label>Message</label><textarea class="nb-input" rows="3" placeholder="Type a system-wide announcement..."></textarea></div>
          <div class="form-group"><label>Priority</label><select class="nb-input"><option>Info</option><option>Warning</option><option>Critical</option></select></div>
          <button class="btn-nb btn-nb-primary" onclick="toast('Announcement broadcast to all users!','success')"><i class="bi bi-megaphone"></i> Broadcast</button>
        </div>
        <div class="nb-card">
          <h6 class="fw-semibold mb-3">Danger Zone</h6>
          <button class="btn-nb btn-nb-danger w-100 mb-2 justify-content-center" onclick="toast('Full backup initiated...','info')"><i class="bi bi-cloud-download"></i> Export Full Database</button>
          <button class="btn-nb btn-nb-outline w-100 justify-content-center" onclick="if(confirm('Reset SYSTEM DATA? This will wipe all users except admin.')){DB.clearAll();}"><i class="bi bi-arrow-clockwise"></i> Reset System Data</button>
        </div>
      </div>
    </div>`;
}

function renderAdminAudit(el) {
  if (!adminGuard(el)) return;
  const logs = DB.auditLog.getAll().reverse();
  const rows = logs.map(l=>{
    const admin = DB.users.getById(l.adminId);
    return `<tr>
      <td>${fmtDate(l.ts)}</td>
      <td style="font-size:.8rem;">${new Date(l.ts).toLocaleTimeString()}</td>
      <td><strong>${admin?.name||'?'}</strong></td>
      <td><span class="chip" style="font-size:.72rem;">${l.action}</span></td>
      <td style="font-size:.8rem;">${l.entity} / <span class="mono">${l.entityId}</span></td>
      <td style="font-size:.82rem;">${l.detail||'—'}</td>
    </tr>`;}).join('');
  el.innerHTML = `
    <div class="admin-section mb-3"><i class="bi bi-shield-check" style="color:var(--nb-gold);"></i><div><strong>Audit Log</strong> — All admin actions recorded</div></div>
    <div class="nb-card">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div class="search-wrap"><i class="bi bi-search"></i><input class="search-bar" placeholder="Search audit log..." style="width:220px;" oninput="filterTable(this,'audit-tbl')"></div>
        <span style="font-size:.82rem;color:var(--nb-muted);">${logs.length} entries</span>
      </div>
      <div style="overflow-x:auto;"><table class="nb-table" id="audit-tbl">
        <thead><tr><th>Date</th><th>Time</th><th>Admin</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead>
        <tbody>${rows||'<tr><td colspan="6" class="text-center py-4 text-muted">No audit entries yet</td></tr>'}</tbody>
      </table></div>
    </div>`;
}

function navigate(page) {
  STATE.page = page;
  const content = document.getElementById('admin-content');
  
  // Update sidebar
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });

  // Render content
  if (page === 'admin-dashboard') renderAdminDashboard(content);
  else if (page === 'admin-users') renderAdminUsers(content);
  else if (page === 'admin-kyc') renderAdminKYC(content);
  else if (page === 'admin-accounts') renderAdminAccounts(content);
  else if (page === 'admin-transactions') renderAdminTransactions(content);
  else if (page === 'admin-loans') renderAdminLoans(content);
  else if (page === 'admin-cards') renderAdminCards(content);
  else if (page === 'admin-reports') renderAdminReports(content);
  else if (page === 'admin-config') renderAdminConfig(content);
  else if (page === 'admin-audit') renderAdminAudit(content);
  else if (page === 'admin-settings') content.innerHTML = '<div class="nb-card"><h6>Settings</h6><p>System settings coming soon.</p></div>';
  else renderAdminDashboard(content);
}
