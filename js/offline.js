// ============================================================
//  OFFLINE — local storage backup + online status
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

function updateOnlineStatus(connected) {
  const indicator = document.getElementById('online-indicator');
  if (!indicator) return;
  if (connected) {
    indicator.innerHTML = `<span style="color:var(--accent)">● Synced</span>`;
  } else if (navigator.onLine) {
    indicator.innerHTML = `<span style="color:var(--amber)">● Connecting...</span>`;
  } else {
    indicator.innerHTML = `<span style="color:var(--red)">● Offline</span>`;
  }
}

window.addEventListener('online', async () => {
  updateOnlineStatus(false);
  if (currentUser) {
    showToast('Back online — syncing...');
    await loadFromSupabase();
    renderCurrentPage();
    updateSidebarShopInfo();
  }
});

window.addEventListener('offline', () => {
  updateOnlineStatus(false);
  showToast('Offline — changes saved locally');
});
