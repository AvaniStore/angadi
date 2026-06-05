// ============================================================
//  AUTH — Google Sign-In via GSI
// ============================================================

let currentUser = null;
let gisInited = false;
let tokenClient = null;
let accessToken = null;

function loadGoogleLibraries() {
  // Load GSI (identity)
  const gsi = document.createElement('script');
  gsi.src = 'https://accounts.google.com/gsi/client';
  gsi.onload = () => { gisInited = true; };
  document.head.appendChild(gsi);

  // Load GAPI (drive)
  const gapi = document.createElement('script');
  gapi.src = 'https://apis.google.com/js/api.js';
  gapi.onload = () => {
    window.gapi.load('client', async () => {
      await window.gapi.client.init({
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });
    });
  };
  document.head.appendChild(gapi);
}

function handleGoogleSignIn() {
  if (!gisInited) {
    showToast('Loading Google Sign-In, please try again in a moment...');
    setTimeout(handleGoogleSignIn, 1200);
    return;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    callback: async (tokenResponse) => {
      if (tokenResponse.error) {
        showToast('Sign-in failed: ' + tokenResponse.error);
        return;
      }
      accessToken = tokenResponse.access_token;
      gapi.client.setToken({ access_token: accessToken });
      await fetchUserInfo();
      await onSignedIn();
    },
  });
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

async function fetchUserInfo() {
  try {
    const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    currentUser = await resp.json();
  } catch (e) {
    console.error('User info error', e);
  }
}

async function onSignedIn() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  if (currentUser) {
    document.getElementById('user-info-sidebar').textContent = currentUser.email || currentUser.name || '';
  }

  showToast('Loading your data...');
  const statusEl = document.getElementById('save-status');
  if (statusEl) statusEl.textContent = 'Syncing...';

  // loadFromDrive handles smart merge of Drive + local automatically
  await loadFromDrive();
  saveLocal();
  renderCurrentPage();
  updateSidebarShopInfo();
  if (statusEl) statusEl.textContent = '';
}

function handleSignOut() {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {});
    accessToken = null;
  }
  currentUser = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  // Clear in-memory data but keep localStorage as offline fallback
  AppData.products = [];
  AppData.vendors = [];
  AppData.sales = [];
  AppData.purchases = [];
  AppData.returns = [];
  AppData.adjustments = [];
  showToast('Signed out');
}
