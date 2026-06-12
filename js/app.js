// ============================================================
//  APP — entry point with PWA + offline support
// ============================================================

window.addEventListener('DOMContentLoaded', async () => {

  // Register service worker for offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('Service worker registered'))
      .catch(e => console.warn('SW registration failed', e));
  }

  // If offline and we have local data, load it without requiring sign-in
  if (!navigator.onLine) {
    const hasLocal = loadLocal();
    if (hasLocal) {
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      updateSidebarShopInfo();
      renderCurrentPage();
      showToast('Offline mode — loaded from local storage');
      updateOnlineStatus(false);
      return;
    }
  }

  // Initialise Supabase auth
  await initAuth();

  // Close sidebar on outside click (mobile)
  document.addEventListener('click', e => {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.querySelector('.menu-toggle');
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && toggle && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });
});
