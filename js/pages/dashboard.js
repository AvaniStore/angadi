// ============================================================
//  PAGE: Dashboard
// ============================================================

function renderDashboard() {
  const todaySales = AppData.sales.filter(s => s.date === today());
  const rev = todaySales.reduce((a, s) => a + (s.total || 0), 0);
  const prof = todaySales.reduce((a, s) => a + (s.profit || 0), 0);
  const lowItems = AppData.products.filter(p => p.stock > 0 && p.stock <= p.lowAt);
  const outItems = AppData.products.filter(p => p.stock <= 0);

  const now = new Date();
  const expSoon = AppData.products.filter(p => {
    if (!p.expiry) return false;
    const d = new Date(p.expiry);
    return d > now && (d - now) < 30 * 24 * 3600 * 1000;
  });
  const expired = AppData.products.filter(p => p.expiry && new Date(p.expiry) < now);

  let alerts = '';
  if (outItems.length) alerts += `<div class="alert alert-red"><span>⚠ Out of stock: ${outItems.map(p => `<strong>${p.name}</strong>`).join(', ')}</span></div>`;
  if (lowItems.length) alerts += `<div class="alert alert-amber"><span>⚡ Low stock: ${lowItems.map(p => `<strong>${p.name}</strong> (${p.stock} left)`).join(', ')}</span></div>`;
  if (expired.length) alerts += `<div class="alert alert-red"><span>🗓 Expired products: ${expired.map(p => `<strong>${p.name}</strong>`).join(', ')}</span></div>`;
  if (expSoon.length) alerts += `<div class="alert alert-pink"><span>📅 Expiring soon: ${expSoon.map(p => `<strong>${p.name}</strong>`).join(', ')}</span></div>`;

  const recentSales = todaySales.slice(-5).reverse();
  const recentHtml = recentSales.length
    ? recentSales.map(s => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-weight:500;font-size:13px">${s.customer || 'Walk-in'}</div>
            <div style="font-size:11px;color:var(--text3)">${s.items.length} item${s.items.length !== 1 ? 's' : ''}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:600;font-size:13px">${fmt(s.total)}</div>
            <div style="font-size:11px;color:var(--accent)">${fmt(s.profit)} profit</div>
          </div>
        </div>`).join('')
    : '<div style="color:var(--text3);font-size:13px;padding:16px 0;text-align:center">No sales today yet</div>';

  const lowHtml = (outItems.concat(lowItems)).slice(0, 8).map(p => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px">${p.name}</span>
      ${stockBadge(p)}
    </div>`).join('') || '<div style="color:var(--text3);font-size:13px;padding:16px 0;text-align:center">All items well stocked ✓</div>';

  // Weekly sparkline data
  const weekDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const daySales = AppData.sales.filter(s => s.date === dateStr);
    weekDays.push({ date: dateStr, rev: daySales.reduce((a, s) => a + s.total, 0), prof: daySales.reduce((a, s) => a + s.profit, 0) });
  }
  const maxRev = Math.max(...weekDays.map(d => d.rev), 1);
  const barHtml = weekDays.map(d => {
    const h = Math.max(4, Math.round((d.rev / maxRev) * 60));
    const label = new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' });
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
      <div style="font-size:10px;color:var(--text3)">${d.rev > 0 ? '₹' + Math.round(d.rev) : ''}</div>
      <div style="width:100%;max-width:32px;height:${h}px;background:${d.date === today() ? 'var(--accent)' : 'var(--accent-light)'};border-radius:3px 3px 0 0"></div>
      <div style="font-size:10px;color:var(--text3)">${label}</div>
    </div>`;
  }).join('');

  document.getElementById('page-dashboard').innerHTML = `
    <div style="margin-bottom:6px">
      <h2 style="font-size:20px;font-weight:700">${AppData.settings.shopName || 'My Shop'}</h2>
      <p style="font-size:13px;color:var(--text3);margin-top:2px">${fmtDate(today())} — ${new Date().toLocaleDateString('en-IN', { weekday: 'long' })}</p>
    </div>

    <div class="metrics-grid" style="margin-top:16px">
      <div class="metric-card"><div class="metric-label">Today's revenue</div><div class="metric-value">${fmt(rev)}</div></div>
      <div class="metric-card"><div class="metric-label">Today's profit</div><div class="metric-value green">${fmt(prof)}</div></div>
      <div class="metric-card"><div class="metric-label">Bills today</div><div class="metric-value">${todaySales.length}</div></div>
      <div class="metric-card"><div class="metric-label">Total products</div><div class="metric-value">${AppData.products.length}</div></div>
      <div class="metric-card"><div class="metric-label">Low / out of stock</div><div class="metric-value ${outItems.length ? 'red' : lowItems.length ? 'amber' : ''}">${lowItems.length + outItems.length}</div></div>
    </div>

    ${alerts ? `<div style="margin-bottom:16px">${alerts}</div>` : ''}

    <div class="two-col">
      <div class="card">
        <div class="card-head">
          <span class="card-title">Today's sales</span>
          <button class="btn btn-sm" onclick="showPage('billing')">+ New bill</button>
        </div>
        ${recentHtml}
      </div>
      <div class="card">
        <div class="card-head">
          <span class="card-title">Stock alerts</span>
          <button class="btn btn-sm" onclick="showPage('inventory')">View all</button>
        </div>
        ${lowHtml}
      </div>
    </div>

    <div class="card">
      <div class="card-title">Revenue — last 7 days</div>
      <div style="display:flex;align-items:flex-end;gap:6px;height:80px;padding-top:16px">${barHtml}</div>
    </div>
  `;
}
