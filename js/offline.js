// ============================================================
//  OFFLINE — local storage + auto-sync on reconnect
// ============================================================

const LOCAL_KEY = 'avani_offline_data';

function saveLocal() {
  try {
    localStorage.setItem(LOCAL_KEY, serialize());
  } catch(e) {
    console.warn('LocalStorage save failed', e);
  }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) { deserialize(raw); return true; }
  } catch(e) {
    console.warn('LocalStorage load failed', e);
  }
  return false;
}

function isOnline() {
  return navigator.onLine;
}

let _driveConnected = false;

function updateOnlineStatus() {
  const indicator = document.getElementById('online-indicator');
  if (!indicator) return;
  if (_driveConnected) {
    indicator.innerHTML = `<span style="color:var(--accent)">● Drive synced</span>`;
    indicator.title = 'Connected to Google Drive';
  } else if (isOnline()) {
    indicator.innerHTML = `<span style="color:var(--amber)">● Connecting...</span>`;
    indicator.title = 'Online but not yet synced to Drive';
  } else {
    indicator.innerHTML = `<span style="color:var(--red)">● Offline</span>`;
    indicator.title = 'No internet — changes saved locally';
  }
}

// When coming back online — reload from Drive (which also merges local bills)
window.addEventListener('online', async () => {
  updateOnlineStatus();
  if (typeof accessToken !== 'undefined' && accessToken) {
    showToast('Back online — syncing...');
    await loadFromDrive();
    saveLocal();
    renderCurrentPage();
    updateSidebarShopInfo();
  } else {
    showToast('Back online — please refresh to sync');
  }
});

window.addEventListener('offline', () => {
  updateOnlineStatus();
  showToast('Offline mode — changes saved locally');
});
