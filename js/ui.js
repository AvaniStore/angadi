// ============================================================
//  UI — navigation, toast, sidebar
// ============================================================

let currentPage = 'dashboard';

function showPage(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  if (el) el.classList.add('active');
  else {
    const navEl = document.querySelector(`[data-page="${name}"]`);
    if (navEl) navEl.classList.add('active');
  }
  currentPage = name;
  const titles = { dashboard: 'Dashboard', inventory: 'Inventory', billing: 'New Bill', vendors: 'Vendors', reports: 'Reports', sales: 'Sales History', settings: 'Settings' };
  document.getElementById('topbar-title').textContent = titles[name] || name;
  renderCurrentPage();

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

function renderCurrentPage() {
  const renderers = {
    dashboard: renderDashboard,
    inventory: renderInventory,
    billing: renderBilling,
    vendors: renderVendors,
    reports: renderReports,
    sales: renderSales,
    settings: renderSettings,
  };
  if (renderers[currentPage]) renderers[currentPage]();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function updateSidebarShopInfo() {
  const el = document.getElementById('sidebar-shop-name');
  const loc = document.getElementById('sidebar-shop-loc');
  if (el) el.textContent = AppData.settings.shopName || 'My Shop';
  if (loc) loc.textContent = AppData.settings.city || '';
}

function showToast(msg, duration = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), duration);
}

function confirmDelete(msg) {
  return confirm(msg || 'Are you sure you want to delete this?');
}

// ---- Print invoice ----
function printInvoice(html) {
  const frame = document.getElementById('print-frame');
  frame.innerHTML = `<style>
    body{font-family:sans-serif;font-size:13px;color:#000;padding:24px;max-width:600px;margin:auto}
    table{width:100%;border-collapse:collapse}
    th{background:#f5f5f5;padding:8px;text-align:left;font-size:12px}
    td{padding:8px;border-bottom:1px solid #eee}
    .inv-head{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #000}
    .shop-name{font-size:18px;font-weight:700}
    .totals{margin-left:auto;width:200px}
    .totals-row{display:flex;justify-content:space-between;padding:3px 0;font-size:13px}
    .totals-row.final{font-weight:700;font-size:15px;border-top:1px solid #ccc;margin-top:6px;padding-top:8px}
    .footer{text-align:center;margin-top:24px;font-size:11px;color:#888;border-top:1px solid #eee;padding-top:12px}
  </style>${html}`;
  window.print();
}
