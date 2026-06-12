// ============================================================
//  AUTH — Supabase email/password authentication
// ============================================================

let currentUser = null;

async function initAuth() {
  // Check if user is already signed in — restore session immediately
  const { data: { session } } = await window._sb.auth.getSession();
  if (session) {
    currentUser = session.user;
    // Hide auth screen right away so user doesn't see it
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    await onSignedIn();
    return;
  }

  // No session — show auth screen
  document.getElementById('auth-screen').style.display = 'flex';

  // Listen for auth changes
  window._sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      await onSignedIn();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      showAuthScreen();
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('Token refreshed automatically ✓');
    }
  });
}

async function handleSignIn() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl = document.getElementById('auth-error');

  if (!email || !password) {
    errEl.textContent = 'Please enter email and password';
    return;
  }

  // Make sure Supabase is loaded
  if (!window._sb) {
    errEl.textContent = 'App still loading, please wait...';
    setTimeout(handleSignIn, 1000);
    return;
  }

  const btn = document.getElementById('auth-btn');
  btn.textContent = 'Signing in...';
  btn.disabled = true;
  errEl.textContent = '';

  const { data, error } = await window._sb.auth.signInWithPassword({ email, password });

  if (error) {
    errEl.textContent = error.message === 'Invalid login credentials'
      ? 'Wrong email or password'
      : error.message;
    btn.textContent = 'Sign in';
    btn.disabled = false;
  }
}

async function handleSignOut() {
  await window._sb.auth.signOut();
  currentUser = null;
  AppData.products = [];
  AppData.vendors = [];
  AppData.customers = [];
  AppData.sales = [];
  AppData.purchases = [];
  AppData.returns = [];
  AppData.adjustments = [];
  showToast('Signed out');
  showAuthScreen();
}

function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  const btn = document.getElementById('auth-btn');
  if (btn) { btn.textContent = 'Sign in'; btn.disabled = false; }
  const errEl = document.getElementById('auth-error');
  if (errEl) errEl.textContent = '';
}

async function onSignedIn() {
  const btn = document.getElementById('auth-btn');
  if (btn) { btn.textContent = 'Sign in'; btn.disabled = false; }

  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  const emailEl = document.getElementById('user-info-sidebar');
  if (emailEl && currentUser) emailEl.textContent = currentUser.email || '';

  showToast('Loading your data...');
  await loadFromSupabase();
  renderCurrentPage();
  updateSidebarShopInfo();
  updateOnlineStatus(true);
  startRealtimeSync();
}

let _realtimeChannel = null;

function startRealtimeSync() {
  if (_realtimeChannel) window._sb.removeChannel(_realtimeChannel);
  _realtimeChannel = window._sb
    .channel('db-changes-' + currentUser.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: 'user_id=eq.' + currentUser.id }, handleRealtimeChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sales', filter: 'user_id=eq.' + currentUser.id }, handleRealtimeChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases', filter: 'user_id=eq.' + currentUser.id }, handleRealtimeChange)
    .subscribe(status => console.log('Realtime:', status));
}

// Use a session ID to identify our own changes
const _sessionId = Math.random().toString(36).slice(2);

function handleRealtimeChange(payload) {
  // Skip - we handle our own updates directly in the UI

  const { table, eventType, new: n, old: o } = payload;
  if (eventType === 'INSERT' || eventType === 'UPDATE') {
    if (!n || n.user_id !== currentUser?.id) return;
    const updated = fromRow(table, n);
    const arr = table==='products' ? AppData.products : table==='sales' ? AppData.sales :
                table==='vendors' ? AppData.vendors : table==='customers' ? AppData.customers :
                table==='purchases' ? AppData.purchases : null;
    if (!arr) return;
    const idx = arr.findIndex(x => x.id === updated.id);
    if (idx >= 0) arr[idx] = updated; else arr.push(updated);
    if (table === 'products') AppData.products.sort((a,b) => a.name.localeCompare(b.name));
  } else if (eventType === 'DELETE') {
    const id = o?.id;
    if (!id) return;
    if (table==='products') AppData.products = AppData.products.filter(x => x.id !== id);
    else if (table==='sales') AppData.sales = AppData.sales.filter(x => x.id !== id);
    else if (table==='vendors') AppData.vendors = AppData.vendors.filter(x => x.id !== id);
    else if (table==='customers') AppData.customers = AppData.customers.filter(x => x.id !== id);
    else if (table==='purchases') AppData.purchases = AppData.purchases.filter(x => x.id !== id);
  }
  saveLocal();
  // Debounce re-render to avoid rapid updates
  clearTimeout(window._realtimeRenderTimer);
  window._realtimeRenderTimer = setTimeout(() => {
    renderCurrentPage();
    updateSidebarShopInfo();
    showToast(`Updated from other device ✓`);
  }, 1000);
  console.log('Realtime update from other device:', table, eventType);
}

function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}
