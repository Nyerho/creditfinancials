
// ============================================================
// MAIN APP LOGIC
// ============================================================

const PAGES_CUSTOMER = [
  { id:'dashboard', label:'Dashboard', icon:'speedometer2', section:'MAIN' },
  { id:'accounts', label:'Accounts', icon:'wallet2', section:'MAIN' },
  { id:'transfers', label:'Transfers', icon:'arrow-left-right', section:'BANKING' },
  { id:'history', label:'Transactions', icon:'clock-history', section:'BANKING' },
  { id:'cards', label:'Cards', icon:'credit-card', section:'BANKING' },
  { id:'loans', label:'Loans', icon:'bank', section:'BANKING' },
  { id:'bills', label:'Bill Pay', icon:'receipt', section:'BANKING' },
  { id:'profile', label:'Profile', icon:'person', section:'ACCOUNT' },
];

function buildNav() {
  const user = STATE.user;
  if (!user) return;
  let pages = [...PAGES_CUSTOMER];
  // if (isAdmin()) pages = [...pages, ...PAGES_ADMIN]; // Admin separated
  let html = '';
  let lastSection = '';
  pages.forEach(p => {
    if (p.section !== lastSection) { html += `<div class="nav-section">${p.section}</div>`; lastSection = p.section; }
    html += `<div class="nav-item ${STATE.page===p.id?'active':''}" onclick="navigate('${p.id}')"><i class="bi bi-${p.icon}"></i>${p.label}</div>`;
  });
  
  // Add Logout
  html += `<div style="margin-top:auto;padding-top:1rem;border-top:1px solid rgba(255,255,255,0.1);">
    <div class="nav-item" onclick="logout()"><i class="bi bi-box-arrow-right"></i>Logout</div>
  </div>`;

  const el = document.getElementById('sidebar-nav');
  if (el) el.innerHTML = html;
}

// Navigation & UI
// toggleSidebar moved to utils.js

function nbUserInitials(user) {
  const name = (user?.name || '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const letters = parts.slice(0, 2).map(p => (p[0] || '').toUpperCase()).join('');
    return letters || 'U';
  }
  const email = (user?.email || '').trim();
  if (email) return String(email[0] || 'U').toUpperCase();
  return 'U';
}

function nbApplyAvatar(el, user) {
  if (!el) return;
  const photo = user?.photo || user?.photoUrl || user?.avatar || '';
  if (photo) {
    el.dataset.hasPhoto = '1';
    el.style.backgroundImage = `url("${photo}")`;
    el.textContent = '';
    return;
  }
  el.dataset.hasPhoto = '0';
  el.style.backgroundImage = '';
  el.textContent = nbUserInitials(user);
}

function updateTopbarUser() {
  const u = STATE.user;
  if (!u) return;
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  const topbarAvatar = document.getElementById('topbar-avatar');
  const sidebarName = document.getElementById('sidebar-name');
  const sidebarRole = document.getElementById('sidebar-role');

  nbApplyAvatar(sidebarAvatar, u);
  nbApplyAvatar(topbarAvatar, u);
  if(sidebarName) sidebarName.textContent = u.name;
  if(sidebarRole) sidebarRole.textContent = u.role.charAt(0).toUpperCase()+u.role.slice(1);
  updateNotifDot();
}

function updateNotifDot() {
  if (!STATE.user) return;
  const unread = DB.notifications.getByUser(STATE.user.id).filter(n=>!n.read).length;
  const dot = document.getElementById('notif-dot');
  if(dot) dot.style.display = unread > 0 ? 'block' : 'none';
}

function toggleTheme() {
  const html = document.documentElement;
  const dark = html.dataset.theme === 'dark';
  html.dataset.theme = dark ? 'light' : 'dark';
  const btn = document.getElementById('theme-btn');
  if(btn) btn.innerHTML = dark ? '<i class="bi bi-moon"></i>' : '<i class="bi bi-sun"></i>';
  localStorage.setItem('nb_theme', html.dataset.theme);
}

function navigate(page) {
  STATE.page = page;
  const title = document.getElementById('topbar-title');
  const pageLabel = [...PAGES_CUSTOMER].find(p=>p.id===page)?.label || page; 
  if(title) title.textContent = pageLabel;
  
  buildNav();
  renderPage(page);
  if (window.innerWidth < 992) toggleSidebar(false);
}

function renderPage(page) {
  const el = document.getElementById('page-content');
  if (!el) return;
  
  // KYC Restriction Check
  const restrictedPages = ['transfers', 'loans', 'bills', 'cards'];
  if (restrictedPages.includes(page) && (STATE.user.kycStatus !== 'verified')) {
    el.innerHTML = `
      <div class="empty-state" style="padding:4rem 1rem;">
        <i class="bi bi-shield-lock" style="font-size:3.5rem;color:var(--nb-warning);opacity:.8;"></i>
        <h5 class="mt-3 fw-bold">KYC Verification Required</h5>
        <p class="text-muted" style="max-width:400px;margin:0 auto;">To access ${page.charAt(0).toUpperCase() + page.slice(1)}, you must first verify your identity. This is a security requirement to prevent fraud.</p>
        <div class="mt-4">
          <button class="btn-nb btn-nb-primary px-4" onclick="navigate('kyc')">Verify Identity Now</button>
        </div>
      </div>`;
    return;
  }
  
  const pages = { 
    dashboard: renderDashboard, 
    accounts: renderAccounts, 
    transfers: renderTransfers, 
    history: renderHistory, 
    cards: renderCards, 
    loans: renderLoans, 
    bills: renderBills, 
    kyc: renderKYC,
    profile: renderProfile 
  };

  try {
    if (pages[page]) { 
      pages[page](el); 
    } else { 
      el.innerHTML = '<div class="empty-state"><i class="bi bi-question-circle"></i>Page not found</div>'; 
    }
  } catch (err) {
    console.error('Render error:', err);
    el.innerHTML = `<div class="alert alert-danger">Error rendering page: ${err.message}</div>`;
  }
}

// Boot
function bootApp() {
  // DB.seed() is now a no-op or handled in db.js initialization if needed.
  // We assume DB is ready.
  
  const authScreen = document.getElementById('auth-screen');
  const appScreen = document.getElementById('app');
  
  if(authScreen) authScreen.style.display = 'none';
  if(appScreen) appScreen.style.display = 'flex';
  
  updateTopbarUser();
  buildNav();
  
  // Determine start page
  let startPage = 'dashboard';
  if (isAdmin()) {
     // If user is admin, they should be redirected to admin.html or we handle it here.
     // The requirement is to separate admin into a separate script.
     // So if we are here, we are likely in app.html (customer app).
     // If an admin logs in here, maybe we should redirect them to admin.html?
     window.location.href = 'admin.html';
     return;
  }
  
  navigate(startPage);

  try { if (DB?.cloud?.watch) DB.cloud.watch(); } catch (_) {}
  
  const saved = localStorage.getItem('nb_theme');
  if (saved === 'dark') { 
    document.documentElement.dataset.theme = 'dark'; 
    const btn = document.getElementById('theme-btn');
    if(btn) btn.innerHTML = '<i class="bi bi-sun"></i>'; 
  }
  
  // Sidebar overlay listener
  document.getElementById('sidebar-overlay')?.addEventListener('click', () => toggleSidebar(false));
}

(() => {
  let t = null;
  window.addEventListener('nb_data_changed', () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      if (!STATE.user) return;
      try { updateTopbarUser(); } catch (_) {}
      try { updateNotifDot(); } catch (_) {}
      try { renderPage(STATE.page); } catch (_) {}
    }, 120);
  });
})();

function showNotifications() {
  const notifs = DB.notifications.getByUser(STATE.user.id);
  DB.notifications.markAllRead(STATE.user.id);
  updateNotifDot();
  const rows = notifs.length ? notifs.map(n=>`
    <div class="d-flex gap-2 mb-3 pb-3" style="border-bottom:1px solid var(--nb-border);">
      <div style="width:36px;height:36px;border-radius:50%;background:${n.type==='success'?'#d1fae5':n.type==='warning'?'#fef3c7':'#dbeafe'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="bi bi-${n.type==='success'?'check-circle':n.type==='warning'?'exclamation-triangle':'info-circle'}" style="color:${n.type==='success'?'var(--nb-success)':n.type==='warning'?'var(--nb-warning)':'var(--nb-accent)'};"></i>
      </div>
      <div><div style="font-size:.88rem;">${n.message}</div><div style="font-size:.75rem;color:var(--nb-muted);">${fmtDate(n.ts)}</div></div>
    </div>`).join('') : '<div class="empty-state"><i class="bi bi-bell-slash"></i>No notifications</div>';
  showModal('Notifications', rows);
}

// ============================================================
// CUSTOMER PAGES
// ============================================================

function renderDashboard(el) {
  const user = STATE.user;
  if (!user) { location.href = 'app.html'; return; }
  const accounts = DB.accounts.getByUser(user.id);
  const myAccIds = accounts.map(a=>a.id);
  const txns = DB.transactions.getByUser(user.id).slice(0,12);
  const totalBal = accounts.reduce((s,a)=>s+(a.status==='active'?a.balance:0), 0);

  const uniqueTypes = Array.from(new Set(accounts.map(a=>a.type)));
  const tabs = ['All', ...uniqueTypes].map((t,i)=>`
    <button class="dash-tab ${i===0?'active':''}" onclick="dashFilterCards('${t.replace(/'/g,"\\'")}', this)">${t}</button>
  `).join('');

  const cardColors = ['purple','blue','gold'];
  const cardNodes = accounts.map((a,i)=>{
    const typeKey = a.type || 'Other';
    const masked = (a.iban || '').replace(/(.{4})/g,'$1 ').trim();
    return `
      <div class="dash-card ${cardColors[i%cardColors.length]}" data-type="${typeKey.replace(/"/g,'&quot;')}" onclick="navigate('accounts')">
        <div class="d-flex justify-content-between align-items-start" style="position:relative;z-index:1;">
          <div>
            <div class="label">${typeKey}</div>
            <div class="bal mono">${fmt(a.balance)}</div>
          </div>
          <span class="badge-status badge-${a.status}" style="align-self:flex-start;">${a.status}</span>
        </div>
        <div class="num mono" style="position:relative;z-index:1;">${masked || '—'}</div>
        <div class="meta" style="position:relative;z-index:1;">
          <div style="font-weight:700;opacity:.95;">${user.name}</div>
          <div style="display:flex;align-items:center;gap:.5rem;">
            <i class="bi bi-wifi" style="transform: rotate(90deg);opacity:.85;"></i>
            <i class="bi bi-credit-card-2-front" style="opacity:.9;"></i>
          </div>
        </div>
      </div>`;
  }).join('');

  const txnItems = txns.map(t=>{
    const isDebit = myAccIds.includes(t.fromId) && t.type !== 'credit';
    const icon = dashTxnIcon(t);
    const amountClass = isDebit ? 'neg' : 'pos';
    const sign = isDebit ? '-' : '+';
    return `
      <div class="txn-item" data-q="${(t.desc+' '+t.category).toLowerCase().replace(/"/g,'&quot;')}">
        <div class="d-flex align-items-center gap-2" style="min-width:0;">
          <div class="txn-ico"><i class="bi bi-${icon}"></i></div>
          <div class="txn-meta">
            <div class="txn-desc">${t.desc}</div>
            <div class="txn-sub">${t.category} • ${fmtDate(t.ts)}</div>
          </div>
        </div>
        <div class="text-end" style="flex-shrink:0;">
          <div class="txn-amt ${amountClass}">${sign}${fmt(t.amount)}</div>
          <div style="margin-top:.15rem;"><span class="badge-status badge-${t.status}" style="font-size:.65rem;">${t.status}</span></div>
        </div>
      </div>`;
  }).join('');

  const monthLabel = new Date().toLocaleString(undefined, { month: 'long', year: 'numeric' });

  el.innerHTML = `
    <div class="dash-grid">
      <div>
        <div class="dash-panel">
          <div class="dash-title-row">
            <div>
              <div class="dash-title">My cards</div>
              <div class="dash-sub">Quick view of your balances and recent activity</div>
            </div>
            <div class="d-flex align-items-center gap-2" style="flex-wrap:wrap;justify-content:flex-end;">
              <div class="search-wrap dash-search">
                <i class="bi bi-search"></i>
                <input class="search-bar" id="dash-search" placeholder="Search transactions..." oninput="dashFilterTxns(this.value)">
              </div>
              <button class="btn-nb btn-nb-primary btn-nb-sm" onclick="openNewAccountModal()"><i class="bi bi-plus-lg"></i></button>
            </div>
          </div>
          <div class="dash-tabs">${tabs}</div>

          <div class="dash-actions">
            <button class="dash-icon-action" onclick="navigate('transfers')"><i class="bi bi-arrow-left-right"></i>Transfer</button>
            <button class="dash-icon-action" onclick="navigate('bills')"><i class="bi bi-receipt"></i>Pay bills</button>
            <button class="dash-icon-action" onclick="navigate('cards')"><i class="bi bi-credit-card"></i>Cards</button>
            <button class="dash-icon-action" onclick="navigate('loans')"><i class="bi bi-bank"></i>Loans</button>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-12 col-sm-6">
              <div class="stat-card">
                <div class="stat-label"><i class="bi bi-wallet2 me-1"></i>Total Balance</div>
                <div class="stat-value">${fmt(totalBal)}</div>
              </div>
            </div>
            <div class="col-12 col-sm-6">
              <div class="stat-card gold">
                <div class="stat-label"><i class="bi bi-bank me-1"></i>Active Accounts</div>
                <div class="stat-value">${accounts.filter(a=>a.status==='active').length}</div>
              </div>
            </div>
          </div>

          <div class="dash-cards" id="dash-cards">
            ${cardNodes || `<div class="dash-mini" style="display:flex;align-items:center;justify-content:center;min-height:120px;"><div class="text-center" style="color:var(--nb-muted);"><div style="font-weight:800;">No accounts yet</div><div style="font-size:.8rem;margin-top:.25rem;">Open an account to get started.</div></div></div>`}
          </div>

          <div class="dash-analytics">
            <div class="dash-mini">
              <h6>Spending by category</h6>
              <canvas id="dash-spend-chart" height="160"></canvas>
              <div class="dash-legend" id="dash-legend"></div>
            </div>
            <div class="dash-mini">
              <h6>Income vs expenses</h6>
              <canvas id="dash-flow-chart" height="160"></canvas>
              <div style="display:flex;justify-content:space-between;gap:1rem;margin-top:.75rem;font-size:.8rem;color:var(--nb-muted);">
                <div><span class="dash-dot" style="background:var(--nb-success);"></span>Income</div>
                <div><span class="dash-dot" style="background:var(--nb-danger);"></span>Expenses</div>
              </div>
            </div>
          </div>

          <div style="margin-top:1.1rem;">
            <div class="dash-title-row" style="margin-bottom:.6rem;">
              <div class="dash-title" style="font-size:1rem;">Offers</div>
              <div class="dash-sub">Personalized for you</div>
            </div>
            <div class="dash-offers">
              <div class="offer-card yellow">
                <div class="t1">Credit</div>
                <div class="t2">Pre-approved limit check</div>
              </div>
              <div class="offer-card teal">
                <div class="t1">Debit Card</div>
                <div class="t2">Virtual card in minutes</div>
              </div>
              <div class="offer-card violet">
                <div class="t1">Package</div>
                <div class="t2">Premium account services</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="dash-panel txn-panel">
          <div class="txn-head">
            <h6>Transactions</h6>
            <div class="d-flex align-items-center gap-2">
              <div class="dash-sub" style="white-space:nowrap;">${monthLabel}</div>
              <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="navigate('history')">View all</button>
            </div>
          </div>
          <div class="txn-list" id="dash-txn-list">
            ${txnItems || `<div class="empty-state" style="padding:2rem 0;"><i class="bi bi-receipt-cutoff"></i>No transactions</div>`}
          </div>
        </div>
      </div>
    </div>`;

  dashFilterCards('All');

  const debitCats = {};
  let income = 0;
  let expenses = 0;
  txns.forEach(t=>{
    const isDebit = myAccIds.includes(t.fromId) && t.type !== 'credit';
    const raw = typeof t.amount === 'string' ? parseFloat(t.amount.replace(/[^0-9.-]/g, '')) : Number(t.amount);
    const amt = Number.isFinite(raw) ? Math.abs(raw) : 0;
    if (!amt) return;
    if (isDebit) {
      expenses += amt;
      const k = t.category || 'Other';
      debitCats[k] = (debitCats[k] || 0) + amt;
    } else if (myAccIds.includes(t.toId) || t.type === 'credit') {
      income += amt;
    }
  });

  if (window.__nbDashCharts) {
    Object.values(window.__nbDashCharts).forEach(c => { try { c.destroy(); } catch(_) {} });
  }
  window.__nbDashCharts = {};

  setTimeout(()=>{
    const spendCtx = document.getElementById('dash-spend-chart');
    const flowCtx = document.getElementById('dash-flow-chart');
    const legendEl = document.getElementById('dash-legend');

    const spendPairs = Object.entries(debitCats)
      .filter(([,v]) => Number.isFinite(v) && v > 0)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 6);
    const spendLabels = spendPairs.map(([k]) => k);
    const spendValues = spendPairs.map(([,v]) => Math.round(v * 100) / 100);
    const spendColors = ['#1d6fa4','#c9a84c','#12b76a','#f04438','#7c3aed','#f79009','#0f2d52','#14b8a6'].slice(0, spendLabels.length);

    if (spendCtx) {
      if (!window.Chart || !spendLabels.length) {
        spendCtx.style.display = 'none';
        if (legendEl) {
          legendEl.innerHTML = `<div style="color:var(--nb-muted);font-size:.82rem;">No spending data yet. Pay a bill to see categories.</div>`;
        }
      } else {
        spendCtx.style.display = '';
        window.__nbDashCharts.spend = new Chart(spendCtx, {
          type: 'doughnut',
          data: { labels: spendLabels, datasets: [{ data: spendValues, backgroundColor: spendColors, borderWidth: 0 }] },
          options: { plugins: { legend: { display: false } }, cutout: '70%' }
        });
        if (legendEl) {
          const total = spendValues.reduce((s,v)=>s+v,0) || 1;
          legendEl.innerHTML = spendLabels.map((l,idx)=>{
            const pct = Math.round((spendValues[idx] / total) * 100);
            return `<div class="dash-legend-item"><div><span class="dash-dot" style="background:${spendColors[idx]};"></span>${l}</div><div class="mono">${pct}%</div></div>`;
          }).join('');
        }
      }
    }

    if (flowCtx && window.Chart) {
      window.__nbDashCharts.flow = new Chart(flowCtx, {
        type: 'doughnut',
        data: {
          labels: ['Income', 'Expenses'],
          datasets: [{ data: [Math.max(income, 0.01), Math.max(expenses, 0.01)], backgroundColor: ['#12b76a', '#f04438'], borderWidth: 0 }]
        },
        options: { plugins: { legend: { display: false } }, cutout: '72%' }
      });
    }
  }, 50);
}

function dashFilterCards(type, btn) {
  if (btn) {
    document.querySelectorAll('.dash-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  } else {
    const firstBtn = document.querySelector('.dash-tab');
    if (firstBtn) {
      document.querySelectorAll('.dash-tab').forEach(b=>b.classList.toggle('active', b.textContent.trim() === 'All'));
    }
  }
  const cards = document.querySelectorAll('#dash-cards .dash-card');
  cards.forEach(c=>{
    const t = c.getAttribute('data-type') || 'Other';
    c.style.display = (type === 'All' || t === type) ? '' : 'none';
  });
}

function dashFilterTxns(q) {
  const query = (q || '').trim().toLowerCase();
  const items = document.querySelectorAll('#dash-txn-list .txn-item');
  items.forEach(it=>{
    const hay = it.getAttribute('data-q') || '';
    it.style.display = !query || hay.includes(query) ? '' : 'none';
  });
}

function dashTxnIcon(t) {
  const c = (t.category || '').toLowerCase();
  if (t.type === 'transfer' || c.includes('transfer')) return 'arrow-left-right';
  if (c.includes('bill') || c.includes('utility') || c.includes('electric') || c.includes('water')) return 'receipt';
  if (c.includes('food') || c.includes('restaurant') || c.includes('drink') || c.includes('coffee')) return 'cup-hot';
  if (c.includes('transport') || c.includes('uber') || c.includes('taxi')) return 'car-front';
  if (c.includes('shopping') || c.includes('store')) return 'bag';
  if (c.includes('salary') || t.type === 'credit') return 'cash-coin';
  return 'card-list';
}

function renderAccounts(el) {
  const accounts = DB.accounts.getByUser(STATE.user.id);
  const colorClass = ['blue','dark','gold'];
  const cards = accounts.map((a,i)=>`
    <div class="col-12 col-md-6 col-xl-4">
      <div class="bank-card ${colorClass[i%3]}">
        <div class="card-chip"></div>
        <div style="position:relative;z-index:1;">
          <div class="card-number mb-3">${a.iban.replace(/(.{4})/g,'$1 ').trim()}</div>
          <div class="d-flex justify-content-between align-items-end">
            <div><div class="card-name">${STATE.user.name}</div><div style="font-size:.7rem;opacity:.7;">${a.type}</div></div>
            <div class="text-end"><div style="font-size:1.3rem;font-weight:700;">${fmt(a.balance)}</div><span class="badge-status badge-${a.status}" style="font-size:.65rem;">${a.status}</span></div>
          </div>
        </div>
      </div>
      <div class="nb-card mt-3">
        <div class="row g-2" style="font-size:.82rem;">
          <div class="col-6"><div style="color:var(--nb-muted);">IBAN</div><div class="mono" style="font-size:.78rem;">${a.iban}</div></div>
          <div class="col-6"><div style="color:var(--nb-muted);">SWIFT</div><div class="mono">${a.swift}</div></div>
          <div class="col-6"><div style="color:var(--nb-muted);">Transfer Limit</div><div class="mono">${fmt(a.limit||0)}/day</div></div>
          <div class="col-6"><div style="color:var(--nb-muted);">Opened</div><div>${a.createdAt}</div></div>
        </div>
        <hr class="divider">
        <div class="d-flex gap-2">
          <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="navigate('history')"><i class="bi bi-clock-history"></i> History</button>
          <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="downloadStatement('${a.id}')"><i class="bi bi-download"></i> Statement</button>
          <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="setTransferLimitModal('${a.id}')"><i class="bi bi-sliders"></i> Limit</button>
          ${a.status==='active'&&a.type!=='Fixed Deposit'?`<button class="btn-nb btn-nb-danger btn-nb-sm" onclick="closeAccountConfirm('${a.id}')"><i class="bi bi-x-circle"></i> Close</button>`:''}
        </div>
      </div>
    </div>`).join('');
  el.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="mb-0 fw-semibold">My Accounts</h5>
      <button class="btn-nb btn-nb-primary" onclick="openNewAccountModal()"><i class="bi bi-plus-lg"></i> Open Account</button>
    </div>
    <div class="row g-4">${cards||'<div class="col-12"><div class="empty-state"><i class="bi bi-wallet2"></i>No accounts yet</div></div>'}</div>`;
}

function setTransferLimitModal(accountId) {
  const a = DB.accounts.getById(accountId);
  if (!a) return toast('Account not found', 'error');
  showModal('Update Transfer Limit', `
    <p style="font-size:.85rem;color:var(--nb-muted);margin-bottom:.75rem;">This sets your daily transfer limit for this account.</p>
    <div class="form-group"><label>Account</label><div style="font-weight:600;">${a.type}</div><div class="mono" style="font-size:.78rem;">${a.iban || a.id}</div></div>
    <div class="form-group"><label>Daily Limit ($)</label><input class="nb-input" id="tl-limit" type="number" min="0" step="1" value="${Number(a.limit || 0)}"></div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-primary" onclick="runLocked(this, ()=>saveTransferLimit('${accountId}'), 'Saving...')"><i class="bi bi-check2"></i> Save</button></div>`
  );
}

async function saveTransferLimit(accountId) {
  const a = DB.accounts.getById(accountId);
  if (!a) return toast('Account not found', 'error');
  const raw = document.getElementById('tl-limit')?.value;
  const limit = Number.parseFloat(raw);
  if (!Number.isFinite(limit) || limit < 0) return toast('Enter a valid limit', 'error');
  DB.accounts.update(accountId, { limit });
  toast('Transfer limit updated', 'success');
  closeModal();
  if (STATE.page === 'accounts') navigate('accounts');
}

function closeAccountConfirm(id) {
  showModal('Close Account', `<p>Are you sure you want to close this account? Any remaining balance will be transferred to your primary account.</p>`, `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-danger" onclick="doCloseAccount('${id}')">Close Account</button></div>`);
}
function doCloseAccount(id) {
  DB.accounts.update(id, { status:'closed' });
  toast('Account closed successfully.', 'success');
  closeModal();
  navigate('accounts');
}
function downloadStatement(accountId) {
  const txns = DB.transactions.getByAccount(accountId);
  const csv = ['Date,Description,Category,Amount,Type', ...txns.map(t=>`${t.ts},${t.desc},${t.category},${t.amount},${t.type}`)].join('\n');
  const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'statement.csv'; a.click();
  toast('Statement downloaded', 'success');
}
function openNewAccountModal() {
  showModal('Open New Account', `
    <div class="form-group"><label>Account Type</label>
      <select class="nb-input" id="new-acc-type"><option>Savings</option><option>Fixed Deposit</option></select>
    </div>
    <div class="form-group"><label>Initial Deposit</label><input class="nb-input" id="new-acc-deposit" type="number" placeholder="0.00" min="0"></div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-primary" onclick="doOpenAccount()"><i class="bi bi-plus"></i> Open Account</button></div>`
  );
}
function doOpenAccount() {
  const type = document.getElementById('new-acc-type').value;
  const deposit = parseFloat(document.getElementById('new-acc-deposit').value)||0;
  DB.accounts.create({ id:'a'+uid(), userId:STATE.user.id, type, balance:deposit, iban:Math.floor(1000000000 + Math.random() * 9000000000).toString(), swift:'NXBKGB21', status:'active', limit:5000, createdAt:new Date().toISOString().slice(0,10) });
  if (deposit > 0) {
    sendTransactionAlert(STATE.user.id, 'credit', deposit, `Initial Deposit — ${type} Account`);
  }
  toast(`${type} account opened!`, 'success');
  closeModal();
  navigate('accounts');
}

function renderTransfers(el) {
  const accounts = DB.accounts.getByUser(STATE.user.id).filter(a=>a.status==='active');
  const payees = DB.payees.getByUser(STATE.user.id);
  const fromOpts = accounts.map(a=>`<option value="${a.id}">${a.type} — ${fmt(a.balance)}</option>`).join('');
  el.innerHTML = `
    <div class="row g-4">
      <div class="col-12 col-lg-7">
        <div class="nb-card">
          <h6 class="fw-semibold mb-3">New Transfer</h6>
          <div class="tab-nav">
            <button class="tab-btn active" onclick="switchTransferTab(this,'internal')">Internal</button>
            <button class="tab-btn" onclick="switchTransferTab(this,'external')">To Someone</button>
            <button class="tab-btn" onclick="switchTransferTab(this,'international')">International</button>
          </div>
          <div id="transfer-tab-content">
            <div class="form-group"><label>From Account</label><select class="nb-input" id="t-from">${fromOpts}</select></div>
            <div id="transfer-to-internal">
              <div class="form-group"><label>To Account</label><select class="nb-input" id="t-to-internal">${fromOpts}</select></div>
            </div>
            <div id="transfer-to-external" style="display:none;">
              <div class="form-group"><label>Recipient Account / IBAN</label><input class="nb-input" id="t-to-iban" placeholder="GB29 NWBK 6016..."></div>
              <div class="form-group"><label>Recipient Name</label><input class="nb-input" id="t-to-name" placeholder="John Doe"></div>
              <div class="form-group"><label>Bank Name</label><input class="nb-input" id="t-to-bank" placeholder="Credit Financials"></div>
            </div>
            <div id="transfer-to-intl" style="display:none;">
              <div class="form-group"><label>SWIFT/BIC Code</label><input class="nb-input" id="t-swift" placeholder="BOFAUS3N"></div>
              <div class="form-group"><label>Beneficiary IBAN</label><input class="nb-input" id="t-intl-iban" placeholder="DE89 3704 0044..."></div>
              <div class="form-group"><label>Beneficiary Name</label><input class="nb-input" id="t-intl-name" placeholder="Hans Mueller"></div>
              <div class="form-group"><label>Country</label><input class="nb-input" id="t-intl-country" placeholder="Germany"></div>
            </div>
            <div class="row g-2">
              <div class="col-8"><div class="form-group"><label>Amount</label><input class="nb-input" id="t-amount" type="number" placeholder="0.00" min="0.01"></div></div>
              <div class="col-4"><div class="form-group"><label>Currency</label><select class="nb-input" id="t-currency"><option>USD</option><option>EUR</option><option>GBP</option></select></div></div>
            </div>
            <div class="form-group"><label>Description / Reference</label><input class="nb-input" id="t-desc" placeholder="What's this for?"></div>
            <button class="btn-nb btn-nb-primary w-100 justify-content-center" style="padding:.7rem;" onclick="initiateTransfer()"><i class="bi bi-send"></i> Review Transfer</button>
          </div>
        </div>
      </div>
      <div class="col-12 col-lg-5">
        <div class="nb-card mb-3">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="mb-0 fw-semibold">Saved Payees</h6>
            <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="addPayeeModal()"><i class="bi bi-plus"></i> Add</button>
          </div>
          ${payees.length?payees.map(p=>`<div class="d-flex justify-content-between align-items-center py-2" style="border-bottom:1px solid var(--nb-border);">
            <div><div style="font-size:.88rem;font-weight:500;">${p.name}</div><div style="font-size:.75rem;color:var(--nb-muted);">${p.bank} • ${p.account.slice(-4)}</div></div>
            <button class="btn-nb btn-nb-danger btn-nb-sm" onclick="deletePayee('${p.id}')"><i class="bi bi-trash"></i></button>
          </div>`).join(''):'<div style="color:var(--nb-muted);font-size:.85rem;text-align:center;padding:1rem;">No saved payees</div>'}
        </div>
        <div class="nb-card">
          <h6 class="fw-semibold mb-3">Exchange Rates</h6>
          <div style="font-size:.85rem;">
            ${[['EUR','0.9215'],['GBP','0.7892'],['JPY','149.72'],['CAD','1.3610']].map(([c,r])=>`<div class="d-flex justify-content-between py-1" style="border-bottom:1px solid var(--nb-border);"><span>USD → ${c}</span><span class="mono fw-semibold">${r}</span></div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}
let transferMode = 'internal';
function switchTransferTab(btn, mode) {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  transferMode = mode;
  document.getElementById('transfer-to-internal').style.display = mode==='internal'?'block':'none';
  document.getElementById('transfer-to-external').style.display = mode==='external'?'block':'none';
  document.getElementById('transfer-to-intl').style.display = mode==='international'?'block':'none';
}
async function initiateTransfer() {
  const amount = parseFloat(document.getElementById('t-amount').value);
  const fromId = document.getElementById('t-from').value;
  const desc = document.getElementById('t-desc').value || 'Transfer';
  const currency = document.getElementById('t-currency').value;
  if (!amount || amount <= 0) return toast('Enter a valid amount', 'error');
  const fromAcc = DB.accounts.getById(fromId);
  if (fromAcc.balance < amount) return toast('Insufficient funds', 'error');
  if (Number(fromAcc.limit || 0) > 0 && amount > Number(fromAcc.limit || 0)) return toast(`Amount exceeds your daily transfer limit (${fmt(fromAcc.limit)})`, 'error');

  const code = generateOtpCode();
  const ok = await sendGenericOtp(STATE.user, code, 'transfer', 'Confirm your NexaBank transfer');
  
  // OTP confirm
  showModal('Confirm Transfer', `
    <div style="text-align:center;padding:1rem 0;">
      <div style="font-size:2rem;font-weight:700;color:var(--nb-accent);">${currency} ${fmt(amount)}</div>
      <div style="color:var(--nb-muted);margin:.5rem 0;">${desc}</div>
      <p style="font-size:.85rem;">Enter the verification code sent to your email:</p>
      <input class="nb-input" id="otp-input" placeholder="6-digit code" style="max-width:200px;margin:0 auto;text-align:center;font-size:1.2rem;letter-spacing:4px;" maxlength="6">
      ${!ok ? `<p style="font-size:.78rem;color:var(--nb-danger);margin-top:.5rem;">Email service unavailable. Use fallback: <strong>${code}</strong></p>` : `<p style="font-size:.78rem;color:var(--nb-muted);margin-top:.5rem;">Code expires in 10 minutes.</p>`}
    </div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-primary" onclick="runLocked(this, () => confirmTransfer('${fromId}',${amount},'${desc}','${!ok?code:''}'), 'Confirming...')"><i class="bi bi-check2"></i> Confirm</button></div>`
  );
}
async function confirmTransfer(fromId, amount, desc, fallbackCode) {
  const otp = document.getElementById('otp-input').value;
  if (fallbackCode) {
    if (otp !== fallbackCode) return toast('Invalid verification code', 'error');
  } else {
    const res = await verifyGenericOtp(STATE.user.id, otp);
    if (!res.ok) return toast(res.msg, 'error');
  }

  const fromAcc = DB.accounts.getById(fromId);
  DB.accounts.update(fromId, { balance: fromAcc.balance - amount });
  sendTransactionAlert(STATE.user.id, 'debit', amount, desc);

  let toId = null;
  if (transferMode === 'internal') {
    toId = document.getElementById('t-to-internal')?.value;
    if (toId) {
      const toAcc = DB.accounts.getById(toId);
      DB.accounts.update(toId, { balance: toAcc.balance + amount });
      sendTransactionAlert(toAcc.userId, 'credit', amount, desc);
    }
  }
  DB.transactions.create({ id:'t'+uid(), fromId, toId, amount, type:'transfer', category:'Transfer', desc, status:'completed', ts:new Date().toISOString() });
  DB.notifications.add({ id:'n'+uid(), userId:STATE.user.id, message:`Transfer of ${fmt(amount)} was successful.`, type:'success', read:false, ts:new Date().toISOString() });
  toast('Transfer successful!', 'success');
  closeModal();
  navigate('history');
}
function addPayeeModal() {
  showModal('Add Payee', `
    <div class="form-group"><label>Payee Name</label><input class="nb-input" id="py-name" placeholder="Full Name"></div>
    <div class="form-group"><label>Account / IBAN</label><input class="nb-input" id="py-acc" placeholder="GB29NWBK..."></div>
    <div class="form-group"><label>Bank</label><input class="nb-input" id="py-bank" placeholder="Credit Financials"></div>
    <div class="form-group"><label>Category</label><select class="nb-input" id="py-cat"><option>Personal</option><option>Business</option><option>Utilities</option></select></div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-primary" onclick="savePayee()">Save Payee</button></div>`
  );
}
function savePayee() {
  const name = document.getElementById('py-name').value.trim();
  const acc = document.getElementById('py-acc').value.trim();
  if (!name || !acc) return toast('Name and account required', 'error');
  DB.payees.create({ id:'p'+uid(), userId:STATE.user.id, name, account:acc, bank:document.getElementById('py-bank').value||'External', category:document.getElementById('py-cat').value });
  toast('Payee saved!', 'success');
  closeModal();
  navigate('transfers');
}
function deletePayee(id) { DB.payees.delete(id); toast('Payee removed', 'success'); navigate('transfers'); }

function renderHistory(el) {
  const txns = DB.transactions.getByUser(STATE.user.id);
  const accounts = DB.accounts.getByUser(STATE.user.id);
  const myAccIds = accounts.map(a=>a.id);
  const income = txns.filter(t=>t.toId && myAccIds.includes(t.toId)).reduce((s,t)=>s+t.amount,0);
  const expenses = txns.filter(t=>t.fromId && myAccIds.includes(t.fromId) && t.type!=='transfer').reduce((s,t)=>s+t.amount,0);
  const rows = txns.map(t=>{
    const isDebit = myAccIds.includes(t.fromId) && t.type!=='credit';
    const cleanDesc = sanitizeTxnDesc(t.desc);
    return `<tr>
      <td><div class="d-flex align-items-center gap-2">
        <div style="width:36px;height:36px;border-radius:50%;background:${isDebit?'#fee2e2':'#d1fae5'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="bi bi-arrow-${isDebit?'up':'down'}-circle" style="color:${isDebit?'var(--nb-danger)':'var(--nb-success)'};"></i>
        </div>
        <div><div style="font-weight:500;">${cleanDesc}</div><div style="font-size:.75rem;color:var(--nb-muted);">${t.category}</div></div>
      </div></td>
      <td style="font-size:.78rem;color:var(--nb-muted);">${fmtDate(t.ts)}</td>
      <td><span class="${isDebit?'amount-neg':'amount-pos'}">${isDebit?'-':'+'}${fmt(t.amount)}</span></td>
      <td><span class="badge-status badge-${t.status}">${t.status}</span></td>
      <td><button class="btn-nb btn-nb-outline btn-nb-sm" onclick="viewTxn('${t.id}')"><i class="bi bi-eye"></i></button></td>
    </tr>`;}).join('');
  el.innerHTML = `
    <div class="row g-3 mb-4">
      <div class="col-12 col-sm-6"><div class="stat-card green"><div class="stat-label"><i class="bi bi-arrow-down-circle me-1"></i>Total Income</div><div class="stat-value">${fmt(income)}</div></div></div>
      <div class="col-12 col-sm-6"><div class="stat-card red"><div class="stat-label"><i class="bi bi-arrow-up-circle me-1"></i>Total Expenses</div><div class="stat-value">${fmt(expenses)}</div></div></div>
    </div>
    <div class="nb-card">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <h6 class="mb-0 fw-semibold">All Transactions</h6>
        <div class="d-flex gap-2 flex-wrap">
          <div class="search-wrap"><i class="bi bi-search"></i><input class="search-bar" placeholder="Search..." oninput="filterTxns(this.value)" style="width:200px;"></div>
          <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="exportTxns()"><i class="bi bi-download"></i> Export</button>
        </div>
      </div>
      <div style="overflow-x:auto;"><table class="nb-table" id="txn-table"><thead><tr><th>Description</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="text-center text-muted py-4">No transactions</td></tr>'}</tbody></table></div>
    </div>`;
}
function viewTxn(id) {
  const t = DB.transactions.getAll().find(tx=>tx.id===id);
  if (!t) return;
  const cleanDesc = sanitizeTxnDesc(t.desc);
  showModal('Transaction Details', `
    <div style="font-size:.88rem;">
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">ID</span><span class="mono">${t.id}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Description</span><span>${cleanDesc}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Category</span><span>${t.category}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Amount</span><span class="mono fw-bold">${fmt(t.amount)}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Type</span><span>${t.type}</span></div>
      <div class="d-flex justify-content-between py-2 border-bottom"><span style="color:var(--nb-muted);">Status</span><span class="badge-status badge-${t.status}">${t.status}</span></div>
      <div class="d-flex justify-content-between py-2"><span style="color:var(--nb-muted);">Date</span><span>${new Date(t.ts).toLocaleString()}</span></div>
    </div>`
  );
}
function filterTxns(q) {
  const rows = document.querySelectorAll('#txn-table tbody tr');
  rows.forEach(r => { r.style.display = r.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none'; });
}
function exportTxns() {
  const txns = DB.transactions.getByUser(STATE.user.id);
  const csv = ['Date,Description,Category,Amount,Type,Status', ...txns.map(t=>`${t.ts},"${t.desc}",${t.category},${t.amount},${t.type},${t.status}`)].join('\n');
  const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'transactions.csv'; a.click();
}

function renderCards(el) {
  const cards = DB.cards.getByUser(STATE.user.id).map(nbEnsureCardSecrets);
  const colorClass = ['blue','dark','gold'];
  const cardHtml = cards.map((c,i)=>`
    <div class="col-12 col-md-6">
      <div class="bank-card ${colorClass[i%3]} mb-3">
        <div class="card-chip"></div>
        <div style="position:relative;z-index:1;">
          <div class="card-number mb-2">${nbMaskPan(c.number || c.maskedNumber)}</div>
          <div class="d-flex justify-content-between align-items-end">
            <div><div class="card-name">${c.holderName || STATE.user.name}</div><div style="font-size:.7rem;opacity:.7;">VALID THRU ${c.expiry}</div></div>
            <div class="text-end"><div style="font-weight:700;font-size:1.1rem;">${c.type}</div><span class="badge-status badge-${c.status}" style="font-size:.65rem;">${c.status}</span></div>
          </div>
        </div>
      </div>
      <div class="nb-card">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div style="font-weight:700;">Card details</div>
          <button class="btn-nb btn-nb-outline btn-nb-sm" id="card-secrets-btn-${c.id}" onclick="toggleCardSecrets('${c.id}')"><i class="bi bi-eye"></i> Show details</button>
        </div>
        <div id="card-secrets-${c.id}" data-open="0" class="row g-2 mb-3" style="font-size:.82rem;">
          <div class="col-12"><div style="color:var(--nb-muted);">Card Number</div><div class="mono fw-bold" id="card-num-${c.id}">${nbMaskPan(c.number)}</div></div>
          <div class="col-6"><div style="color:var(--nb-muted);">CVV</div><div class="mono fw-bold" id="card-cvv-${c.id}">•••</div></div>
          <div class="col-6"><div style="color:var(--nb-muted);">Expiry</div><div class="mono fw-bold">${c.expiry}</div></div>
          <div class="col-12"><div style="color:var(--nb-muted);">Cardholder</div><div class="mono fw-bold">${c.holderName || STATE.user.name}</div></div>
        </div>
        <div class="row g-2 mb-3" style="font-size:.82rem;">
          <div class="col-6"><div style="color:var(--nb-muted);">Daily Limit</div><div class="mono fw-bold">${fmt(c.dailyLimit)}</div></div>
          <div class="col-6"><div style="color:var(--nb-muted);">Monthly Limit</div><div class="mono fw-bold">${fmt(c.monthlyLimit)}</div></div>
          ${c.creditLimit?`<div class="col-6"><div style="color:var(--nb-muted);">Credit Limit</div><div class="mono">${fmt(c.creditLimit)}</div></div><div class="col-6"><div style="color:var(--nb-muted);">Used</div><div class="mono">${fmt(c.used||0)}</div></div>`:''}
        </div>
        ${c.creditLimit?`<div class="loan-progress"><div style="font-size:.75rem;color:var(--nb-muted);margin-bottom:.3rem;">Utilization ${Math.round((c.used/c.creditLimit)*100)}%</div><div class="progress-bar-custom"><div class="progress-fill" style="width:${Math.round((c.used/c.creditLimit)*100)}%;"></div></div></div>`:''}
        <div class="d-flex gap-2 flex-wrap mt-2">
          <button class="btn-nb ${c.status==='active'?'btn-nb-outline':'btn-nb-success'} btn-nb-sm" onclick="toggleCard('${c.id}')"><i class="bi bi-${c.status==='active'?'snow':'check2'}"></i> ${c.status==='active'?'Freeze':'Unfreeze'}</button>
          <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="setCardLimitModal('${c.id}')"><i class="bi bi-sliders"></i> Limits</button>
          <button class="btn-nb btn-nb-danger btn-nb-sm" onclick="reportCard('${c.id}')"><i class="bi bi-flag"></i> Report Lost</button>
        </div>
      </div>
    </div>`).join('');
  el.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="mb-0 fw-semibold">My Cards</h5>
      <button class="btn-nb btn-nb-primary" onclick="requestCardModal()"><i class="bi bi-plus-lg"></i> Request Card</button>
    </div>
    <div class="row g-4">${cardHtml||'<div class="col"><div class="empty-state"><i class="bi bi-credit-card-2-front"></i>No cards</div></div>'}</div>`;
}
function toggleCard(id) {
  const c = DB.cards.getById(id);
  const ns = c.status==='active'?'frozen':'active';
  DB.cards.update(id, {status:ns});
  toast(`Card ${ns}`, ns==='frozen'?'warning':'success');
  navigate('cards');
}
function reportCard(id) {
  DB.cards.update(id, {status:'blocked'});
  toast('Card reported as lost. A new card will be issued.', 'warning');
  navigate('cards');
}
function setCardLimitModal(id) {
  const c = DB.cards.getById(id);
  showModal('Set Card Limits', `
    <div class="form-group"><label>Daily Limit ($)</label><input class="nb-input" id="cl-daily" type="number" value="${c.dailyLimit}"></div>
    <div class="form-group"><label>Monthly Limit ($)</label><input class="nb-input" id="cl-monthly" type="number" value="${c.monthlyLimit}"></div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-primary" onclick="saveCardLimits('${id}')">Save</button></div>`
  );
}
function saveCardLimits(id) {
  DB.cards.update(id, { dailyLimit: parseFloat(document.getElementById('cl-daily').value), monthlyLimit: parseFloat(document.getElementById('cl-monthly').value) });
  toast('Card limits updated', 'success');
  closeModal();
  navigate('cards');
}
function requestCardModal() {
  const accounts = DB.accounts.getByUser(STATE.user.id).filter(a=>a.status==='active');
  showModal('Request New Card', `
    <div class="form-group"><label>Account</label><select class="nb-input" id="nc-acc">${accounts.map(a=>`<option value="${a.id}">${a.type} — ${fmt(a.balance)}</option>`).join('')}</select></div>
    <div class="form-group"><label>Card Type</label><select class="nb-input" id="nc-type"><option>Debit</option><option>Virtual</option></select></div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-primary" onclick="doRequestCard()">Request Card</button></div>`
  );
}
function doRequestCard() {
  const pan = nbGeneratePan();
  const cvv = String(Math.floor(100 + Math.random() * 900));
  const expiry = '12/29';
  DB.cards.create({
    id:'c'+uid(),
    accountId:document.getElementById('nc-acc').value,
    userId:STATE.user.id,
    type:document.getElementById('nc-type').value,
    number: pan,
    maskedNumber: nbMaskPan(pan),
    cvv,
    expiry,
    holderName: STATE.user.name,
    status:'active',
    dailyLimit:1500,
    monthlyLimit:7500
  });
  toast('Card requested! Processing in 3-5 business days.', 'success');
  closeModal();
  navigate('cards');
}

function renderLoans(el) {
  const loans = DB.loans.getByUser(STATE.user.id);
  const loanRows = loans.map(l=>`
    <div class="nb-card mb-3">
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div><div class="d-flex align-items-center gap-2"><h6 class="mb-0">${l.type} Loan</h6><span class="badge-status badge-${l.status}">${l.status}</span></div>
          <div style="font-size:.8rem;color:var(--nb-muted);">Applied: ${fmtDate(l.appliedAt)}</div>
        </div>
        <div class="text-end"><div class="mono fw-bold fs-5">${fmt(l.amount)}</div><div style="font-size:.78rem;color:var(--nb-muted);">${l.rate}% APR • ${l.term} months</div></div>
      </div>
      <div class="row g-3 mb-3" style="font-size:.82rem;">
        <div class="col-6 col-md-3"><div style="color:var(--nb-muted);">Paid</div><div class="mono">${fmt(l.paid)}</div></div>
        <div class="col-6 col-md-3"><div style="color:var(--nb-muted);">Remaining</div><div class="mono">${fmt(l.amount-l.paid)}</div></div>
        <div class="col-6 col-md-3"><div style="color:var(--nb-muted);">Monthly</div><div class="mono">${fmt(l.monthlyPayment)}</div></div>
        <div class="col-6 col-md-3"><div style="color:var(--nb-muted);">Next Payment</div><div>${l.nextPayment}</div></div>
      </div>
      <div class="loan-progress"><div style="font-size:.75rem;color:var(--nb-muted);margin-bottom:.3rem;">Progress: ${Math.round((l.paid/l.amount)*100)}% paid</div><div class="progress-bar-custom"><div class="progress-fill" style="width:${Math.round((l.paid/l.amount)*100)}%;"></div></div></div>
      ${l.status==='active'?`<div class="mt-3"><button class="btn-nb btn-nb-outline btn-nb-sm" onclick="earlyRepay('${l.id}')"><i class="bi bi-cash-stack"></i> Early Repayment</button></div>`:''}
    </div>`).join('');
  el.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="mb-0 fw-semibold">Loans & Credit</h5>
      <button class="btn-nb btn-nb-primary" onclick="applyLoanModal()"><i class="bi bi-plus-lg"></i> Apply for Loan</button>
    </div>
    ${loanRows||'<div class="empty-state"><i class="bi bi-bank2"></i>No active loans</div>'}
    <div class="nb-card mt-3">
      <h6 class="fw-semibold mb-3">Loan Calculator</h6>
      <div class="row g-3">
        <div class="col-md-4"><label>Loan Amount ($)</label><input class="nb-input" id="lc-amount" type="number" value="10000" oninput="calcLoan()"></div>
        <div class="col-md-4"><label>Interest Rate (%)</label><input class="nb-input" id="lc-rate" type="number" value="5.5" step="0.1" oninput="calcLoan()"></div>
        <div class="col-md-4"><label>Term (months)</label><input class="nb-input" id="lc-term" type="number" value="24" oninput="calcLoan()"></div>
      </div>
      <div class="row g-3 mt-1" id="loan-calc-result">
        <div class="col-md-4"><div class="nb-card" style="text-align:center;"><div style="color:var(--nb-muted);font-size:.78rem;">Monthly Payment</div><div class="mono fw-bold" id="lc-monthly" style="font-size:1.5rem;color:var(--nb-accent);"></div></div></div>
        <div class="col-md-4"><div class="nb-card" style="text-align:center;"><div style="color:var(--nb-muted);font-size:.78rem;">Total Payment</div><div class="mono fw-bold" id="lc-total" style="font-size:1.5rem;"></div></div></div>
        <div class="col-md-4"><div class="nb-card" style="text-align:center;"><div style="color:var(--nb-muted);font-size:.78rem;">Total Interest</div><div class="mono fw-bold" id="lc-interest" style="font-size:1.5rem;color:var(--nb-danger);"></div></div></div>
      </div>
    </div>`;
  calcLoan();
}
function calcLoan() {
  const p = parseFloat(document.getElementById('lc-amount')?.value)||0;
  const r = (parseFloat(document.getElementById('lc-rate')?.value)||0)/100/12;
  const n = parseInt(document.getElementById('lc-term')?.value)||1;
  const m = r>0 ? p*(r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1) : p/n;
  const total = m*n;
  if (document.getElementById('lc-monthly')) {
    document.getElementById('lc-monthly').textContent = fmt(m);
    document.getElementById('lc-total').textContent = fmt(total);
    document.getElementById('lc-interest').textContent = fmt(total-p);
  }
}
function applyLoanModal() {
  showModal('Apply for Loan', `
    <div class="form-group"><label>Loan Type</label><select class="nb-input" id="al-type"><option>Personal</option><option>Auto</option><option>Mortgage</option><option>Business</option></select></div>
    <div class="form-group"><label>Amount</label><input class="nb-input" id="al-amount" type="number" placeholder="e.g. 10000"></div>
    <div class="form-group"><label>Preferred Term (months)</label><input class="nb-input" id="al-term" type="number" placeholder="e.g. 24"></div>
    <div class="form-group"><label>Purpose</label><input class="nb-input" id="al-purpose" placeholder="What is this loan for?"></div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-primary" onclick="submitLoan()">Submit Application</button></div>`
  );
}
function submitLoan() {
  const amount = parseFloat(document.getElementById('al-amount').value);
  const term = parseInt(document.getElementById('al-term').value);
  if (!amount||!term) return toast('Fill in all fields', 'error');
  const rate = 5.5;
  const r = rate/100/12;
  const monthly = r>0 ? amount*(r*Math.pow(1+r,term))/(Math.pow(1+r,term)-1) : amount/term;
  DB.loans.create({ id:'l'+uid(), userId:STATE.user.id, type:document.getElementById('al-type').value, amount, rate, term, paid:0, status:'pending', appliedAt:new Date().toISOString().slice(0,10), nextPayment:'—', monthlyPayment:Math.round(monthly*100)/100 });
  toast('Loan application submitted! Review within 2-3 business days.', 'success');
  closeModal();
  navigate('loans');
}
function earlyRepay(id) {
  const l = DB.loans.getById(id);
  showModal('Early Repayment', `<p>Make a payment towards your ${l.type} Loan (remaining: ${fmt(l.amount-l.paid)})</p><div class="form-group"><label>Payment Amount</label><input class="nb-input" id="ep-amount" type="number" value="${l.monthlyPayment}"></div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-success" onclick="processPayment('${id}')">Pay Now</button></div>`
  );
}
function processPayment(id) {
  const amount = parseFloat(document.getElementById('ep-amount').value);
  const l = DB.loans.getById(id);
  const newPaid = l.paid + amount;
  DB.loans.update(id, { paid: newPaid, status: newPaid >= l.amount ? 'paid' : 'active' });
  toast('Payment processed!', 'success');
  closeModal();
  navigate('loans');
}

function renderBills(el) {
  const payees = DB.payees.getByUser(STATE.user.id);
  const accounts = DB.accounts.getByUser(STATE.user.id).filter(a=>a.status==='active');
  el.innerHTML = `
    <div class="row g-4">
      <div class="col-12 col-lg-7">
        <div class="nb-card">
          <h6 class="fw-semibold mb-4">Pay a Bill</h6>
          <div class="form-group"><label>Payment Category</label>
            <select class="nb-input" id="bill-cat">
              <option>Electricity</option><option>Water</option><option>Internet</option><option>Gas</option><option>Phone</option><option>Insurance</option><option>Subscription</option>
            </select>
          </div>
          <div class="form-group"><label>Provider / Payee</label><input class="nb-input" id="bill-provider" placeholder="Provider name or account number"></div>
          <div class="form-group"><label>From Account</label><select class="nb-input" id="bill-from">${accounts.map(a=>`<option value="${a.id}">${a.type} — ${fmt(a.balance)}</option>`).join('')}</select></div>
          <div class="form-group"><label>Amount ($)</label><input class="nb-input" id="bill-amount" type="number" placeholder="0.00"></div>
          <div class="form-group"><label>Schedule (Optional)</label><input class="nb-input" id="bill-schedule" type="date"></div>
          <button class="btn-nb btn-nb-primary" onclick="payBill()"><i class="bi bi-receipt"></i> Pay Bill</button>
        </div>
      </div>
      <div class="col-12 col-lg-5">
        <div class="nb-card">
          <h6 class="fw-semibold mb-3">Quick Pay</h6>
          <div class="row g-2">
            ${['Electricity','Water','Internet','Gas','Phone','TV'].map(b=>`
              <div class="col-4"><button class="btn-nb btn-nb-outline w-100 justify-content-center flex-column py-3" style="gap:.3rem;" onclick="quickBill('${b}')">
                <i class="bi bi-${b==='Electricity'?'lightning':b==='Water'?'droplet':b==='Internet'?'wifi':b==='Gas'?'fire':b==='Phone'?'phone':'tv'}" style="font-size:1.3rem;"></i>
                <span style="font-size:.75rem;">${b}</span>
              </button></div>`).join('')}
          </div>
        </div>
        <div class="nb-card mt-3">
          <h6 class="fw-semibold mb-3">Saved Payees</h6>
          ${payees.map(p=>`<div class="d-flex justify-content-between align-items-center py-2" style="border-bottom:1px solid var(--nb-border);">
            <div style="font-size:.85rem;"><strong>${p.name}</strong><br><span style="color:var(--nb-muted);">${p.category}</span></div>
            <button class="btn-nb btn-nb-outline btn-nb-sm" onclick="payToPayee('${p.id}')">Pay</button>
          </div>`).join('')||'<div style="color:var(--nb-muted);font-size:.85rem;">No saved payees</div>'}
        </div>
      </div>
    </div>`;
}
async function payBill() {
  const amount = parseFloat(document.getElementById('bill-amount').value);
  if (!amount || amount <= 0) return toast('Enter valid amount', 'error');
  const fromId = document.getElementById('bill-from').value;
  const acc = DB.accounts.getById(fromId);
  if (acc.balance < amount) return toast('Insufficient funds', 'error');

  const cat = document.getElementById('bill-cat').value;
  const provider = document.getElementById('bill-provider').value || 'Bill Payment';

  const code = generateOtpCode();
  const ok = await sendGenericOtp(STATE.user, code, 'payment', `Confirm your ${cat} payment`);

  showModal('Confirm Payment', `
    <div style="text-align:center;padding:1rem 0;">
      <div style="font-size:2rem;font-weight:700;color:var(--nb-accent);">$${fmt(amount)}</div>
      <div style="color:var(--nb-muted);margin:.5rem 0;">${cat} — ${provider}</div>
      <p style="font-size:.85rem;">Enter the verification code sent to your email:</p>
      <input class="nb-input" id="otp-input" placeholder="6-digit code" style="max-width:200px;margin:0 auto;text-align:center;font-size:1.2rem;letter-spacing:4px;" maxlength="6">
      ${!ok ? `<p style="font-size:.78rem;color:var(--nb-danger);margin-top:.5rem;">Email service unavailable. Use fallback: <strong>${code}</strong></p>` : `<p style="font-size:.78rem;color:var(--nb-muted);margin-top:.5rem;">Code expires in 10 minutes.</p>`}
    </div>`,
    `<div class="d-flex gap-2 justify-content-end"><button class="btn-nb btn-nb-outline" onclick="closeModal()">Cancel</button><button class="btn-nb btn-nb-primary" onclick="runLocked(this, () => confirmBillPayment('${fromId}',${amount},'${cat}','${provider}','${!ok?code:''}'), 'Processing...')"><i class="bi bi-check2"></i> Confirm</button></div>`
  );
}
async function confirmBillPayment(fromId, amount, cat, provider, fallbackCode) {
  const otp = document.getElementById('otp-input').value;
  if (fallbackCode) {
    if (otp !== fallbackCode) return toast('Invalid verification code', 'error');
  } else {
    const res = await verifyGenericOtp(STATE.user.id, otp);
    if (!res.ok) return toast(res.msg, 'error');
  }

  const acc = DB.accounts.getById(fromId);
  DB.accounts.update(fromId, { balance: acc.balance - amount });
  sendTransactionAlert(STATE.user.id, 'debit', amount, `${cat} — ${provider}`);
  DB.transactions.create({ id: 't' + uid(), fromId, toId: null, amount, type: 'payment', category: cat, desc: provider, status: 'completed', ts: new Date().toISOString() });
  toast('Bill paid successfully!', 'success');
  closeModal();
  navigate('history');
}
function quickBill(cat) {
  document.getElementById('bill-cat').value = cat;
  document.getElementById('bill-provider').value = cat + ' Provider';
  document.getElementById('bill-amount').focus();
}
function payToPayee(id) {
  const p = DB.payees.getById ? DB.payees.getById(id) : (DB.get('payees')||[]).find(px=>px.id===id);
  if (p) { document.getElementById('bill-provider').value = p.name; }
}

function nbDigits(n) {
  return String(n ?? '').replace(/\D/g, '');
}

function nbGeneratePan(last4 = null) {
  const l4 = last4 ? nbDigits(last4).slice(-4) : String(Math.floor(1000 + Math.random() * 9000));
  const prefix = String(Math.floor(4000 + Math.random() * 999)).padStart(4, '4');
  const mid1 = String(Math.floor(1000 + Math.random() * 9000));
  const mid2 = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}${mid1}${mid2}${l4}`.slice(0, 16);
}

function nbFormatPan(pan) {
  const digits = nbDigits(pan).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function nbMaskPan(pan) {
  const digits = nbDigits(pan).slice(0, 16);
  if (!digits) return '**** **** **** ****';
  const last4 = digits.slice(-4);
  return `**** **** **** ${last4}`;
}

function nbEnsureCardSecrets(card) {
  if (!card) return card;
  const patch = {};
  const masked = String(card.maskedNumber || '');
  const last4 = masked.match(/(\d{4})\s*$/)?.[1] || null;
  if (!card.number) patch.number = nbGeneratePan(last4);
  if (!card.cvv) patch.cvv = String(Math.floor(100 + Math.random() * 900));
  if (!card.expiry) patch.expiry = '12/29';
  if (!card.holderName) patch.holderName = STATE?.user?.name || card.holderName || 'Card Holder';
  if (!card.maskedNumber) patch.maskedNumber = nbMaskPan(patch.number || card.number);
  if (Object.keys(patch).length) {
    DB.cards.update(card.id, patch);
    return { ...card, ...patch };
  }
  return card;
}

function toggleCardSecrets(id) {
  const box = document.getElementById(`card-secrets-${id}`);
  const btn = document.getElementById(`card-secrets-btn-${id}`);
  if (!box) return;
  const open = box.dataset.open === '1';
  box.dataset.open = open ? '0' : '1';
  const c = nbEnsureCardSecrets(DB.cards.getById(id));
  const numEl = document.getElementById(`card-num-${id}`);
  const cvvEl = document.getElementById(`card-cvv-${id}`);
  if (numEl) numEl.textContent = (open ? nbMaskPan(c.number) : nbFormatPan(c.number));
  if (cvvEl) cvvEl.textContent = (open ? '•••' : String(c.cvv || ''));
  if (btn) btn.innerHTML = open ? '<i class="bi bi-eye"></i> Show details' : '<i class="bi bi-eye-slash"></i> Hide details';
}

function renderProfile(el) {
  const u = STATE.user;
  const emailVerified = !!(window.NB_FIREBASE?.auth?.currentUser?.emailVerified);
  const initials = nbUserInitials(u);
  const photo = u?.photo || u?.photoUrl || '';
  const avatarStyle = photo
    ? `background-image:url('${photo}');background-size:cover;background-position:center;background-repeat:no-repeat;`
    : `background:linear-gradient(135deg,var(--nb-primary),var(--nb-accent));`;
  el.innerHTML = `
    <div class="row g-4">
      <div class="col-12 col-lg-4">
        <div class="nb-card text-center">
          <div id="profile-avatar" style="width:80px;height:80px;border-radius:50%;margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;color:#fff;${avatarStyle}">${photo ? '' : initials}</div>
          <h5 class="fw-semibold mb-1">${u.name}</h5>
          <div style="color:var(--nb-muted);font-size:.85rem;">${u.email}</div>
          <div class="mt-2"><span class="chip"><i class="bi bi-shield-check"></i> ${u.role}</span></div>
          <div class="mt-3">
            <div class="form-group text-start">
              <label>Profile photo</label>
              <input class="nb-input" id="p-photo" type="file" accept="image/*" onchange="onProfilePhotoSelected(event)">
            </div>
            <div class="d-flex gap-2 justify-content-center mt-2">
              ${photo ? `<button class="btn-nb btn-nb-outline btn-nb-sm" onclick="removeProfilePhoto()"><i class="bi bi-trash3"></i> Remove</button>` : ``}
            </div>
          </div>
          ${u.role==='customer' && !emailVerified ? `
            <div class="mt-3" style="font-size:.85rem;color:var(--nb-warning);">
              Email not verified
            </div>
            <button class="btn-nb btn-nb-outline btn-nb-sm mt-2" onclick="runLocked(this, resendVerificationFromDashboard, 'Sending...')">
              <i class="bi bi-envelope"></i> Resend Verification
            </button>
          ` : ``}
          <hr class="divider">
          <div class="text-start" style="font-size:.85rem;">
            <div class="d-flex justify-content-between py-1"><span style="color:var(--nb-muted);">Member since</span><span>${u.joined}</span></div>
            <div class="d-flex justify-content-between py-1"><span style="color:var(--nb-muted);">Accounts</span><span>${DB.accounts.getByUser(u.id).length}</span></div>
            <div class="d-flex justify-content-between py-1"><span style="color:var(--nb-muted);">Cards</span><span>${DB.cards.getByUser(u.id).length}</span></div>
          </div>
        </div>
      </div>
      <div class="col-12 col-lg-8">
        <div class="nb-card mb-3">
          <h6 class="fw-semibold mb-3">Personal Information</h6>
          <div class="row g-3">
            <div class="col-md-6 form-group"><label>Full Name</label><input class="nb-input" id="p-name" value="${u.name}"></div>
            <div class="col-md-6 form-group"><label>Email</label><input class="nb-input" id="p-email" value="${u.email}" type="email"></div>
            <div class="col-md-6 form-group"><label>Phone</label><input class="nb-input" id="p-phone" value="${u.phone||''}"></div>
            <div class="col-md-6 form-group"><label>Date of Birth</label><input class="nb-input" id="p-dob" value="${u.dob||''}" type="date"></div>
            <div class="col-12 form-group"><label>Address</label><input class="nb-input" id="p-addr" value="${u.address||''}"></div>
          </div>
          <button class="btn-nb btn-nb-primary mt-2" onclick="saveProfile()"><i class="bi bi-check2"></i> Save Changes</button>
        </div>
        <div class="nb-card">
          <h6 class="fw-semibold mb-3">Change Password</h6>
          <div class="row g-3">
            <div class="col-md-4 form-group"><label>Current Password</label><input class="nb-input" id="p-cur-pass" type="password"></div>
            <div class="col-md-4 form-group"><label>New Password</label><input class="nb-input" id="p-new-pass" type="password"></div>
            <div class="col-md-4 form-group"><label>Confirm New</label><input class="nb-input" id="p-con-pass" type="password"></div>
          </div>
          <button class="btn-nb btn-nb-outline mt-2" onclick="changePassword()"><i class="bi bi-lock"></i> Update Password</button>
        </div>
      </div>
    </div>`;
}

async function resendVerificationFromDashboard() {
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

async function nbImageFileToAvatarDataUrl(file, size = 256) {
  const mime = 'image/jpeg';
  const quality = 0.86;
  if (window.createImageBitmap) {
    const bmp = await createImageBitmap(file);
    const minSide = Math.min(bmp.width, bmp.height);
    const sx = Math.max(0, Math.floor((bmp.width - minSide) / 2));
    const sy = Math.max(0, Math.floor((bmp.height - minSide) / 2));
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.drawImage(bmp, sx, sy, minSide, minSide, 0, 0, size, size);
    if (typeof bmp.close === 'function') bmp.close();
    return canvas.toDataURL(mime, quality);
  }
  const dataUrl = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ''));
    fr.onerror = () => reject(new Error('read failed'));
    fr.readAsDataURL(file);
  });
  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('image load failed'));
  });
  const minSide = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
  const sx = Math.max(0, Math.floor(((img.naturalWidth || img.width) - minSide) / 2));
  const sy = Math.max(0, Math.floor(((img.naturalHeight || img.height) - minSide) / 2));
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
  return canvas.toDataURL(mime, quality);
}

async function onProfilePhotoSelected(e) {
  try {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) return toast('Please select an image file.', 'error');
    const dataUrl = await nbImageFileToAvatarDataUrl(file, 256);
    DB.users.update(STATE.user.id, { photo: dataUrl });
    STATE.user = DB.users.getById(STATE.user.id);
    updateTopbarUser();
    const el = document.getElementById('page-content');
    if (STATE.page === 'profile' && el) renderProfile(el);
    toast('Profile photo updated!', 'success');
  } catch (_) {
    toast('Unable to update photo. Please try a different image.', 'error');
  }
}

function removeProfilePhoto() {
  DB.users.update(STATE.user.id, { photo: null });
  STATE.user = DB.users.getById(STATE.user.id);
  updateTopbarUser();
  const el = document.getElementById('page-content');
  if (STATE.page === 'profile' && el) renderProfile(el);
  toast('Profile photo removed.', 'success');
}

// KYC Verification Page
function renderKYC(el) {
  const u = STATE.user;
  const status = u.kycStatus || 'unverified'; // unverified, pending, verified, rejected
  
  let statusHtml = '';
  if (status === 'verified') {
    statusHtml = `<div class="alert alert-success d-flex align-items-center gap-3">
      <i class="bi bi-patch-check-fill fs-3"></i>
      <div>
        <h6 class="mb-0 fw-bold">KYC Verified</h6>
        <div style="font-size:.85rem;">Your identity has been successfully verified. You have full access to all features.</div>
      </div>
    </div>`;
  } else if (status === 'pending') {
    statusHtml = `<div class="alert alert-warning d-flex align-items-center gap-3">
      <i class="bi bi-clock-history fs-3"></i>
      <div>
        <h6 class="mb-0 fw-bold">Verification Pending</h6>
        <div style="font-size:.85rem;">Our team is reviewing your documents. This usually takes 24-48 hours.</div>
      </div>
    </div>`;
  } else if (status === 'rejected') {
    statusHtml = `<div class="alert alert-danger d-flex align-items-center gap-3">
      <i class="bi bi-exclamation-octagon fs-3"></i>
      <div>
        <h6 class="mb-0 fw-bold">Verification Rejected</h6>
        <div style="font-size:.85rem;">Reason: ${u.kycReason || 'Documents were unclear'}. Please re-submit your documents.</div>
      </div>
    </div>`;
  } else {
    statusHtml = `<div class="alert alert-info d-flex align-items-center gap-3">
      <i class="bi bi-shield-lock fs-3"></i>
      <div>
        <h6 class="mb-0 fw-bold">KYC Required</h6>
        <div style="font-size:.85rem;">To ensure the security of your account and comply with regulations, please verify your identity.</div>
      </div>
    </div>`;
  }

  el.innerHTML = `
    <div class="row g-4 justify-content-center">
      <div class="col-12 col-lg-8">
        <div class="nb-card">
          <h5 class="fw-semibold mb-4">Identity Verification (KYC)</h5>
          ${statusHtml}
          
          ${status === 'unverified' || status === 'rejected' ? `
            <div class="mt-4">
              <div class="form-group">
                <label>Document Type</label>
                <select class="nb-input" id="kyc-doc-type">
                  <option value="passport">Passport</option>
                  <option value="id_card">National ID Card</option>
                  <option value="drivers_license">Driver's License</option>
                </select>
              </div>
              <div class="form-group">
                <label>Document Number</label>
                <input class="nb-input" id="kyc-doc-num" placeholder="e.g. A12345678">
              </div>
              <div class="row g-3">
                <div class="col-md-6 form-group">
                  <label>Front of Document</label>
                  <input class="nb-input" type="file" accept="image/*" id="kyc-front">
                </div>
                <div class="col-md-6 form-group">
                  <label>Back of Document (if applicable)</label>
                  <input class="nb-input" type="file" accept="image/*" id="kyc-back">
                </div>
              </div>
              <div class="form-group mt-3">
                <label>Selfie with Document</label>
                <input class="nb-input" type="file" accept="image/*" id="kyc-selfie">
              </div>
              <div class="mt-4 d-flex justify-content-end">
                <button class="btn-nb btn-nb-primary px-4" onclick="submitKYC()"><i class="bi bi-cloud-upload"></i> Submit for Verification</button>
              </div>
            </div>
          ` : `
            <div class="mt-4 text-center py-5">
              <i class="bi bi-shield-shaded" style="font-size:4rem;color:var(--nb-muted);opacity:.3;"></i>
              <p class="mt-3 text-muted">No action required at this time.</p>
            </div>
          `}
        </div>
      </div>
    </div>`;
}

async function submitKYC() {
  const type = document.getElementById('kyc-doc-type').value;
  const num = document.getElementById('kyc-doc-num').value.trim();
  const front = document.getElementById('kyc-front').files[0];
  const back = document.getElementById('kyc-back').files[0];
  const selfie = document.getElementById('kyc-selfie').files[0];

  if (!num) return toast('Please enter document number', 'error');
  if (!front || !selfie) return toast('Please upload front of document and selfie', 'error');

  // Simulate file upload (store as dataUrl for demo)
  const frontUrl = await nbImageFileToAvatarDataUrl(front, 800);
  const backUrl = back ? await nbImageFileToAvatarDataUrl(back, 800) : null;
  const selfieUrl = await nbImageFileToAvatarDataUrl(selfie, 800);

  DB.users.update(STATE.user.id, {
    kycStatus: 'pending',
    kycData: {
      type,
      num,
      front: frontUrl,
      back: backUrl,
      selfie: selfieUrl,
      submittedAt: new Date().toISOString()
    }
  });

  STATE.user = DB.users.getById(STATE.user.id);
  toast('KYC documents submitted successfully!', 'success');
  renderKYC(document.getElementById('page-content'));
}

function saveProfile() {
  DB.users.update(STATE.user.id, { name:document.getElementById('p-name').value, email:document.getElementById('p-email').value, phone:document.getElementById('p-phone').value, dob:document.getElementById('p-dob').value, address:document.getElementById('p-addr').value });
  STATE.user = DB.users.getById(STATE.user.id);
  updateTopbarUser();
  toast('Profile updated!', 'success');
}
function changePassword() {
  const cur = document.getElementById('p-cur-pass').value;
  const nw = document.getElementById('p-new-pass').value;
  const cn = document.getElementById('p-con-pass').value;
  if (cur !== STATE.user.password) return toast('Current password incorrect', 'error');
  if (nw !== cn) return toast('Passwords do not match', 'error');
  if (nw.length < 6) return toast('Password must be 6+ chars', 'error');
  DB.users.update(STATE.user.id, { password: nw });
  STATE.user.password = nw;
  toast('Password updated!', 'success');
}
