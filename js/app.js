// ============================================================
//  APP — entry point
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
  loadGoogleLibraries();

  // Close sidebar when clicking outside on mobile
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
