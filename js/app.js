// ============================================================
//  APP — entry point with PWA + offline support
// ============================================================

window.addEventListener('DOMContentLoaded', () => {

  // Register service worker for offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('Service worker registered'))
      .catch(e => console.warn('SW registration failed', e));
  }

  // Show online/offline status
  updateOnlineStatus();

  // Load Google libraries for sign-in
  loadGoogleLibraries();

  // If offline and we have local data, load it and show app without sign-in
  if (!isOnline()) {
    const hasLocal = loadLocal();
    if (hasLocal) {
      // Show app in offline mode without requiring sign-in
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      updateSidebarShopInfo();
      renderCurrentPage();
      showToast('Offline mode — loaded from local storage');
    }
  }

  // Close sidebar on outside click (mobile)
  document.addEventListener('click', e => {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.querySelector('.menu-toggle');
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });
});
