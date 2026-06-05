// ============================================================
//  OFFLINE — local storage backup
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

function updateOnlineStatus() {
  const indicator = document.getElementById('online-indicator');
  if (!indicator) return;
  if (isOnline()) {
    indicator.innerHTML = `<span style="color:var(--accent)">● Online</span>`;
  } else {
    indicator.innerHTML = `<span style="color:var(--amber)">● Offline</span>`;
  }
}

window.addEventListener('online', () => {
  updateOnlineStatus();
  showToast('Back online — syncing...');
  if (typeof accessToken !== 'undefined' && accessToken) {
    setTimeout(() => saveToGoogle(), 1500);
  }
});

window.addEventListener('offline', () => {
  updateOnlineStatus();
  showToast('Offline mode — changes saved locally');
});
