// ============================================================
//  OFFLINE — local storage queue + sync when back online
// ============================================================

const LOCAL_KEY = 'avani_offline_data';

// Save data to localStorage (always, as backup)
function saveLocal() {
  try {
    localStorage.setItem(LOCAL_KEY, serialize());
  } catch(e) {
    console.warn('LocalStorage save failed', e);
  }
}

// Load data from localStorage
function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      deserialize(raw);
      return true;
    }
  } catch(e) {
    console.warn('LocalStorage load failed', e);
  }
  return false;
}

// Check if online
function isOnline() {
  return navigator.onLine;
}

// Update the online/offline indicator in the UI
function updateOnlineStatus() {
  const indicator = document.getElementById('online-indicator');
  if (!indicator) return;
  if (isOnline()) {
    indicator.innerHTML = `<span style="color:var(--accent)">● Online</span>`;
    indicator.title = 'Connected — data will sync to Google Drive';
  } else {
    indicator.innerHTML = `<span style="color:var(--amber)">● Offline</span>`;
    indicator.title = 'Offline — data saved locally, will sync when connected';
  }
}

// When coming back online, auto-sync to Drive
window.addEventListener('online', () => {
  updateOnlineStatus();
  showToast('Back online — syncing to Google Drive...');
  if (typeof accessToken !== 'undefined' && accessToken) {
    setTimeout(() => saveToGoogle(), 1500);
  }
});

window.addEventListener('offline', () => {
  updateOnlineStatus();
  showToast('Offline mode — changes saved locally');
});

// Override autoSave to always save locally first
const _originalAutoSave = typeof autoSave === 'function' ? autoSave : null;
function autoSave() {
  saveLocal(); // Always save locally immediately
  clearTimeout(window._autoSaveTimer);
  if (isOnline() && typeof accessToken !== 'undefined' && accessToken) {
    window._autoSaveTimer = setTimeout(() => saveToGoogle(), 2000);
    const statusEl = document.getElementById('save-status');
    if (statusEl) statusEl.textContent = 'Unsaved changes';
  } else {
    const statusEl = document.getElementById('save-status');
    if (statusEl) statusEl.textContent = 'Saved locally';
  }
}
