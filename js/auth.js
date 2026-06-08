// ============================================================
//  AUTH — Google Sign-In via GSI
// ============================================================

let currentUser = null;
let gisInited = false;
let tokenClient = null;
let accessToken = null;

function loadGoogleLibraries() {
  const gsi = document.createElement('script');
  gsi.src = 'https://accounts.google.com/gsi/client';
  gsi.onload = () => { gisInited = true; };
  document.head.appendChild(gsi);

  const gapiScript = document.createElement('script');
  gapiScript.src = 'https://apis.google.com/js/api.js';
  gapiScript.onload = () => {
    window.gapi.load('client', async () => {
      await window.gapi.client.init({
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });
    });
  };
  document.head.appendChild(gapiScript);
}

function handleGoogleSignIn() {
  if (!gisInited) {
    showToast('Loading Google Sign-In, please try again...');
    setTimeout(handleGoogleSignIn, 1200);
    return;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    include_granted_scopes: false,
    callback: async (tokenResponse) => {
      if (tokenResponse.error) {
        // Only show error if it's not a silent refresh attempt
        if (tokenResponse.error !== 'interaction_required') {
          showToast('Sign-in failed: ' + tokenResponse.error);
        }
        return;
      }
      const isFirstSignIn = !accessToken;
      accessToken = tokenResponse.access_token;
      gapi.client.setToken({ access_token: accessToken });
      if (isFirstSignIn) {
        await fetchUserInfo();
        await onSignedIn();
      } else {
        console.log('Token refreshed silently ✓');
      }
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

  // Auto-refresh token every 50 minutes (tokens expire at 60 min)
  clearInterval(window._tokenRefreshTimer);
  window._tokenRefreshTimer = setInterval(async () => {
    console.log('Auto-refreshing token...');
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  }, 50 * 60 * 1000);

  showToast('Loading your data...');
  await loadFromDrive();
  saveLocal();
  renderCurrentPage();
  updateSidebarShopInfo();
}

function handleSignOut() {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {});
    accessToken = null;
  }
  currentUser = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  AppData.products = [];
  AppData.vendors = [];
  AppData.sales = [];
  AppData.purchases = [];
  AppData.returns = [];
  AppData.adjustments = [];
  showToast('Signed out');
}
