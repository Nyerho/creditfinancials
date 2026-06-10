// ============================================================
// DATABASE (localStorage simulation)
// ============================================================
function nbCloudEnabled() {
  if (location.protocol === 'file:') return false;
  return !!window.NB_FIREBASE?.db && !!window.NB_FIREBASE?.upsert;
}

function nbCloudUpsert(collectionName, id, data) {
  if (!nbCloudEnabled()) return;
  const warn = () => {
    const now = Date.now();
    if (now - (window.__nb_cloud_err_at || 0) < 5000) return;
    window.__nb_cloud_err_at = now;
    try { toast('Cloud sync failed. Changes may not show on other devices.', 'warning'); } catch (_) {}
  };
  try {
    const p = window.NB_FIREBASE.upsert(collectionName, id, data);
    if (p && typeof p.then === 'function') p.catch(warn);
  } catch (_) {
    warn();
  }
}

function nbCloudRemove(collectionName, id) {
  if (!nbCloudEnabled()) return;
  const warn = () => {
    const now = Date.now();
    if (now - (window.__nb_cloud_err_at || 0) < 5000) return;
    window.__nb_cloud_err_at = now;
    try { toast('Cloud sync failed. Changes may not show on other devices.', 'warning'); } catch (_) {}
  };
  try {
    const p = window.NB_FIREBASE.remove(collectionName, id);
    if (p && typeof p.then === 'function') p.catch(warn);
  } catch (_) {
    warn();
  }
}

async function nbCloudSyncDown() {
  if (!nbCloudEnabled() || !window.NB_FIREBASE?.auth?.currentUser) return false;
  try {
    const uid = window.NB_FIREBASE.auth.currentUser.uid;
    const isAdmin = await (window.NB_FIREBASE.existsDoc ? window.NB_FIREBASE.existsDoc('admins', uid) : false);
    if (isAdmin && window.NB_FIREBASE?.list) {
      const [users, accounts, transactions, cards, loans, notifications, payees, auditLog] = await Promise.all([
        window.NB_FIREBASE.list('users'),
        window.NB_FIREBASE.list('accounts'),
        window.NB_FIREBASE.list('transactions'),
        window.NB_FIREBASE.list('cards'),
        window.NB_FIREBASE.list('loans'),
        window.NB_FIREBASE.list('notifications'),
        window.NB_FIREBASE.list('payees'),
        window.NB_FIREBASE.list('auditLog')
      ]);
      if (Array.isArray(users) && users.length) DB.set('users', users);
      if (Array.isArray(accounts) && accounts.length) DB.set('accounts', accounts);
      if (Array.isArray(transactions) && transactions.length) DB.set('transactions', transactions);
      if (Array.isArray(cards) && cards.length) DB.set('cards', cards);
      if (Array.isArray(loans) && loans.length) DB.set('loans', loans);
      if (Array.isArray(notifications) && notifications.length) DB.set('notifications', notifications);
      if (Array.isArray(payees) && payees.length) DB.set('payees', payees);
      if (Array.isArray(auditLog) && auditLog.length) DB.set('auditLog', auditLog);
      return true;
    }
    if (!window.NB_FIREBASE?.getById || !window.NB_FIREBASE?.listWhere) return false;
    const [me, accounts, transactions, cards, loans, notifications, payees] = await Promise.all([
      window.NB_FIREBASE.getById('users', uid),
      window.NB_FIREBASE.listWhere('accounts', 'userId', '==', uid),
      window.NB_FIREBASE.listWhere('transactions', 'userIds', 'array-contains', uid),
      window.NB_FIREBASE.listWhere('cards', 'userId', '==', uid),
      window.NB_FIREBASE.listWhere('loans', 'userId', '==', uid),
      window.NB_FIREBASE.listWhere('notifications', 'userId', '==', uid),
      window.NB_FIREBASE.listWhere('payees', 'userId', '==', uid)
    ]);
    if (me) DB.set('users', [me]);
    if (Array.isArray(accounts)) DB.set('accounts', accounts);
    if (Array.isArray(transactions)) DB.set('transactions', transactions);
    if (Array.isArray(cards)) DB.set('cards', cards);
    if (Array.isArray(loans)) DB.set('loans', loans);
    if (Array.isArray(notifications)) DB.set('notifications', notifications);
    if (Array.isArray(payees)) DB.set('payees', payees);
    return true;
  } catch (_) {
    try {
      const now = Date.now();
      if (now - (window.__nb_cloud_sync_err_at || 0) >= 5000) {
        window.__nb_cloud_sync_err_at = now;
        toast('Unable to sync your data from cloud. Check Firestore rules and hosting (http/https).', 'warning');
      }
    } catch (_) {}
    return false;
  }
}

const DB = {
  get(key) { try { return JSON.parse(localStorage.getItem('nb_' + key)) || null; } catch { return null; } },
  set(key, val) {
    localStorage.setItem('nb_' + key, JSON.stringify(val));
    try { window.dispatchEvent(new CustomEvent('nb_data_changed', { detail: { key } })); } catch (_) {}
  },
  
  // Seed function removed to avoid placeholder data
  seed() {
    if (nbCloudEnabled()) return;
    // Ensure at least one admin exists for system access
    const adminEmail = 'admin@creditfinancials.com';
    const existingAdmin =
      DB.users.getByEmail(adminEmail) ||
      DB.users.getAll().find(u => (u.email || '').trim().toLowerCase() === adminEmail);
    if (!existingAdmin) {
      const id = 'u' + Math.random().toString(36).substr(2,9);
      DB.users.create({
        id,
        name: 'System Admin',
        email: adminEmail,
        password: 'admin',
        role: 'admin',
        status: 'active',
        kycStatus: 'verified',
        failedLogins: 0,
        joined: new Date().toISOString()
      });
      console.log('Admin user created: admin@creditfinancials.com / admin');
    } else {
      DB.users.update(existingAdmin.id, { email: adminEmail, password: 'admin', status: 'active', role: 'admin', failedLogins: 0 });
    }
  },

  clearAll() {
    ['users', 'accounts', 'transactions', 'cards', 'loans', 'notifications', 'payees', 'auditLog', 'seeded'].forEach(k => localStorage.removeItem('nb_' + k));
    this.seed();
    location.reload();
  },

  users: {
    getAll() { return DB.get('users') || []; },
    getById(id) { return DB.users.getAll().find(u => u.id === id); },
    getByEmail(email) { return DB.users.getAll().find(u => u.email === email); },
    create(user) { const all = DB.users.getAll(); all.push(user); DB.set('users', all); nbCloudUpsert('users', user.id, user); },
    update(id, data) { const all = DB.users.getAll(); const i = all.findIndex(u => u.id === id); if (i > -1) { all[i] = {...all[i], ...data}; DB.set('users', all); nbCloudUpsert('users', id, all[i]); } },
    delete(id) { DB.set('users', DB.users.getAll().filter(u => u.id !== id)); nbCloudRemove('users', id); },
  },
  accounts: {
    getAll() { return DB.get('accounts') || []; },
    getByUser(uid) { return DB.accounts.getAll().filter(a => a.userId === uid); },
    getById(id) { return DB.accounts.getAll().find(a => a.id === id); },
    create(a) { const all = DB.accounts.getAll(); all.push(a); DB.set('accounts', all); nbCloudUpsert('accounts', a.id, a); },
    update(id, data) { const all = DB.accounts.getAll(); const i = all.findIndex(a => a.id === id); if (i > -1) { all[i] = {...all[i], ...data}; DB.set('accounts', all); nbCloudUpsert('accounts', id, all[i]); } },
    delete(id) { DB.set('accounts', DB.accounts.getAll().filter(a => a.id !== id)); nbCloudRemove('accounts', id); },
  },
  transactions: {
    getAll() { return DB.get('transactions') || []; },
    getByAccount(aid) { return DB.transactions.getAll().filter(t => t.fromId === aid || t.toId === aid).sort((a,b) => new Date(b.ts) - new Date(a.ts)); },
    getByUser(uid) { const accs = DB.accounts.getByUser(uid).map(a=>a.id); return DB.transactions.getAll().filter(t => accs.includes(t.fromId)||accs.includes(t.toId)).sort((a,b) => new Date(b.ts) - new Date(a.ts)); },
    create(t) {
      const fromAcc = t.fromId ? DB.accounts.getById(t.fromId) : null;
      const toAcc = t.toId ? DB.accounts.getById(t.toId) : null;
      const fromUserId = t.fromUserId || fromAcc?.userId || null;
      const toUserId = t.toUserId || toAcc?.userId || null;
      const userIds = Array.isArray(t.userIds) ? t.userIds : [fromUserId, toUserId].filter(Boolean);
      const txn = { ...t, fromUserId, toUserId, userIds };
      const all = DB.transactions.getAll();
      all.push(txn);
      DB.set('transactions', all);
      nbCloudUpsert('transactions', txn.id, txn);
    },
    update(id, data) { const all = DB.transactions.getAll(); const i = all.findIndex(t => t.id === id); if (i > -1) { all[i] = {...all[i], ...data}; DB.set('transactions', all); nbCloudUpsert('transactions', id, all[i]); } },
    delete(id) { DB.set('transactions', DB.transactions.getAll().filter(t => t.id !== id)); nbCloudRemove('transactions', id); },
  },
  cards: {
    getAll() { return DB.get('cards') || []; },
    getByUser(uid) { return DB.cards.getAll().filter(c => c.userId === uid); },
    getById(id) { return DB.cards.getAll().find(c => c.id === id); },
    create(c) { const all = DB.cards.getAll(); all.push(c); DB.set('cards', all); nbCloudUpsert('cards', c.id, c); },
    update(id, data) { const all = DB.cards.getAll(); const i = all.findIndex(c => c.id === id); if (i > -1) { all[i] = {...all[i], ...data}; DB.set('cards', all); nbCloudUpsert('cards', id, all[i]); } },
    delete(id) { DB.set('cards', DB.cards.getAll().filter(c => c.id !== id)); nbCloudRemove('cards', id); },
  },
  loans: {
    getAll() { return DB.get('loans') || []; },
    getByUser(uid) { return DB.loans.getAll().filter(l => l.userId === uid); },
    getById(id) { return DB.loans.getAll().find(l => l.id === id); },
    create(l) { const all = DB.loans.getAll(); all.push(l); DB.set('loans', all); nbCloudUpsert('loans', l.id, l); },
    update(id, data) { const all = DB.loans.getAll(); const i = all.findIndex(l => l.id === id); if (i > -1) { all[i] = {...all[i], ...data}; DB.set('loans', all); nbCloudUpsert('loans', id, all[i]); } },
    delete(id) { DB.set('loans', DB.loans.getAll().filter(l => l.id !== id)); nbCloudRemove('loans', id); },
  },
  notifications: {
    getByUser(uid) { return DB.get('notifications')?.filter(n=>n.userId===uid)||[]; },
    add(n) { const all = DB.get('notifications')||[]; all.push(n); DB.set('notifications', all); nbCloudUpsert('notifications', n.id, n); },
    markRead(id) { const all = DB.get('notifications')||[]; const i = all.findIndex(n=>n.id===id); if(i>-1){all[i].read=true; DB.set('notifications',all); nbCloudUpsert('notifications', id, all[i]);} },
    markAllRead(uid) { const all = DB.get('notifications')||[]; all.forEach(n=>{if(n.userId===uid)n.read=true;}); DB.set('notifications',all); all.filter(n=>n.userId===uid).forEach(n=>nbCloudUpsert('notifications', n.id, n)); },
  },
  payees: {
    getByUser(uid) { return DB.get('payees')?.filter(p=>p.userId===uid)||[]; },
    create(p) { const all = DB.get('payees')||[]; all.push(p); DB.set('payees', all); nbCloudUpsert('payees', p.id, p); },
    delete(id) { DB.set('payees', (DB.get('payees')||[]).filter(p=>p.id!==id)); nbCloudRemove('payees', id); },
  },
  auditLog: {
    getAll() { return DB.get('auditLog')||[]; },
    add(entry) { const all = DB.auditLog.getAll(); all.push(entry); DB.set('auditLog', all); nbCloudUpsert('auditLog', entry.id, entry); },
  }
};

async function nbCloudWatch() {
  if (!nbCloudEnabled() || !window.NB_FIREBASE?.auth?.currentUser) return false;
  const u = window.NB_FIREBASE.auth.currentUser;
  if (!u?.uid) return false;
  if (!window.NB_FIREBASE?.subscribeWhere || !window.NB_FIREBASE?.subscribeAll || !window.NB_FIREBASE?.subscribeDoc) return false;
  try {
    const prev = window.__nb_cloud_unsubs;
    if (Array.isArray(prev)) prev.forEach(fn => { try { fn(); } catch (_) {} });
    window.__nb_cloud_unsubs = [];
    const unsubs = window.__nb_cloud_unsubs;

    let isAdmin = false;
    try { isAdmin = await (window.NB_FIREBASE?.existsDoc ? window.NB_FIREBASE.existsDoc('admins', u.uid) : false); } catch (_) { isAdmin = false; }

    const setKey = (key, val) => DB.set(key, Array.isArray(val) ? val : val ? [val] : []);

    if (isAdmin) {
      unsubs.push(window.NB_FIREBASE.subscribeAll('users', v => DB.set('users', v || [])));
      unsubs.push(window.NB_FIREBASE.subscribeAll('accounts', v => DB.set('accounts', v || [])));
      unsubs.push(window.NB_FIREBASE.subscribeAll('transactions', v => DB.set('transactions', v || [])));
      unsubs.push(window.NB_FIREBASE.subscribeAll('cards', v => DB.set('cards', v || [])));
      unsubs.push(window.NB_FIREBASE.subscribeAll('loans', v => DB.set('loans', v || [])));
      unsubs.push(window.NB_FIREBASE.subscribeAll('notifications', v => DB.set('notifications', v || [])));
      unsubs.push(window.NB_FIREBASE.subscribeAll('payees', v => DB.set('payees', v || [])));
      unsubs.push(window.NB_FIREBASE.subscribeAll('auditLog', v => DB.set('auditLog', v || [])));
      return true;
    }

    unsubs.push(window.NB_FIREBASE.subscribeDoc('users', u.uid, v => setKey('users', v)));
    unsubs.push(window.NB_FIREBASE.subscribeWhere('accounts', 'userId', '==', u.uid, v => DB.set('accounts', v || [])));
    unsubs.push(window.NB_FIREBASE.subscribeWhere('transactions', 'userIds', 'array-contains', u.uid, v => DB.set('transactions', v || [])));
    unsubs.push(window.NB_FIREBASE.subscribeWhere('cards', 'userId', '==', u.uid, v => DB.set('cards', v || [])));
    unsubs.push(window.NB_FIREBASE.subscribeWhere('loans', 'userId', '==', u.uid, v => DB.set('loans', v || [])));
    unsubs.push(window.NB_FIREBASE.subscribeWhere('notifications', 'userId', '==', u.uid, v => DB.set('notifications', v || [])));
    unsubs.push(window.NB_FIREBASE.subscribeWhere('payees', 'userId', '==', u.uid, v => DB.set('payees', v || [])));
    return true;
  } catch (_) {
    return false;
  }
}

DB.cloud = { enabled: nbCloudEnabled, syncDown: nbCloudSyncDown, watch: nbCloudWatch };

// Initialize DB and ensure Admin exists
DB.seed();
