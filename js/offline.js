// ============================================================
//  OFFLINE — status indicator + offline bill protection only
//  localStorage is NOT used as a data cache anymore
//  Supabase is always the master data source
// ============================================================

const LOCAL_KEY = 'avani_offline_data'; // kept for compatibility but not used as cache

function saveLocal() {
  // No-op — Supabase is master, we don't cache main data locally
  // Only offline bills and deleted IDs are saved separately
}

function loadLocal() {
  // No-op — always load from Supabase
  return false;
}

let _supabaseConnected = false;

function updateOnlineStatus(connected) {
  if (connected !== undefined) _supabaseConnected = connected;
  const indicator = document.getElementById('online-indicator');
  if (!indicator) return;
  if (_supabaseConnected) {
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
  _supabaseConnected = false;
  updateOnlineStatus(false);
  showToast('Offline — bills will be saved locally and synced when back online');
});
