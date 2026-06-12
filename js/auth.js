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
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  const emailEl = document.getElementById('user-info-sidebar');
  if (emailEl && currentUser) emailEl.textContent = currentUser.email || '';

  showToast('Loading your data...');
  await loadFromSupabase();
  renderCurrentPage();
  updateSidebarShopInfo();
  updateOnlineStatus();
}

function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}
