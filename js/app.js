// ============================================================
//  APP — entry point
// ============================================================

window.addEventListener('DOMContentLoaded', async () => {

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('Service worker registered'))
      .catch(e => console.warn('SW registration failed', e));
  }

  // Initialise Supabase auth — always loads fresh from Supabase
  await initAuth();

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
