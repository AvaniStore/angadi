// ============================================================
//  PAGE: Reports
// ============================================================

let activeReportTab = 'daily';

function renderReports() {
  document.getElementById('page-reports').innerHTML = `
    <div class="page-header"><h2 class="page-title">Reports</h2></div>
    <div class="tabs">
      <button class="tab-btn ${activeReportTab === 'daily' ? 'active' : ''}" onclick="switchReportTab('daily', this)">Daily</button>
      <button class="tab-btn ${activeReportTab === 'weekly' ? 'active' : ''}" onclick="switchReportTab('weekly', this)">Weekly</button>
      <button class="tab-btn ${activeReportTab === 'monthly' ? 'active' : ''}" onclick="switchReportTab('monthly', this)">Monthly</button>
      <button class="tab-btn ${activeReportTab === 'range' ? 'active' : ''}" onclick="switchReportTab('range', this)">Date range</button>
      <button class="tab-btn ${activeReportTab === 'product' ? 'active' : ''}" onclick="switchReportTab('product', this)">By Product</button>
    </div>
    <div id="report-content"></div>
  `;
  renderReportTab(activeReportTab);
}

function switchReportTab(tab, btn) {
  activeReportTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderReportTab(tab);
}

function renderReportTab(tab) {
  if (tab === 'daily') renderDailyReport();
  else if (tab === 'weekly') renderWeeklyReport();
  else if (tab === 'monthly') renderMonthlyReport();
  else if (tab === 'range') renderRangeReport();
  else if (tab === 'product') renderProductReport();
}

function reportMetricsHtml(s, from, to) {
  const margin = s.revenue > 0 ? ((s.profit / s.revenue) * 100).toFixed(1) : 0;
  const periodReturns = (AppData.returns || []).filter(r => r.date >= from && r.date <= to);
  const totalReturns = periodReturns.reduce((a, r) => a + (r.refund || 0), 0);
  const periodAdj = (AppData.adjustments || []).filter(a => a.date >= from && a.date <= to && a.type === 'Write-off');
  const totalLoss = periodAdj.reduce((a, w) => a + (w.loss || 0), 0);

  // Payment breakdown
  const periodSales = AppData.sales.filter(s => s.date >= from && s.date <= to);
  const cashTotal = periodSales.filter(s => (s.payment||'Cash') === 'Cash').reduce((a,s) => a + s.total, 0);
  const gpayTotal = periodSales.filter(s => s.payment === 'GPay').reduce((a,s) => a + s.total, 0);
  const otherTotal = periodSales.filter(s => s.payment === 'Other').reduce((a,s) => a + s.total, 0);

  return `
    <div class="metrics-grid" style="margin-bottom:16px">
      <div class="metric-card"><div class="metric-label">Revenue</div><div class="metric-value">${fmt(s.revenue)}</div></div>
      <div class="metric-card"><div class="metric-label">Profit</div><div class="metric-value green">${fmt(s.profit)}</div></div>
      <div class="metric-card"><div class="metric-label">Margin</div><div class="metric-value ${parseFloat(margin) > 15 ? 'green' : 'amber'}">${margin}%</div></div>
      <div class="metric-card"><div class="metric-label">GST collected</div><div class="metric-value">${fmt(s.gst)}</div></div>
      <div class="metric-card"><div class="metric-label">Bills</div><div class="metric-value">${s.bills}</div></div>
      <div class="metric-card"><div class="metric-label">💵 Cash</div><div class="metric-value">${fmt(cashTotal)}</div></div>
      <div class="metric-card"><div class="metric-label">📱 GPay</div><div class="metric-value" style="color:#1d4ed8">${fmt(gpayTotal)}</div></div>
      ${otherTotal > 0 ? `<div class="metric-card"><div class="metric-label">Other</div><div class="metric-value">${fmt(otherTotal)}</div></div>` : ''}
      ${totalReturns > 0 ? `<div class="metric-card"><div class="metric-label">Returns</div><div class="metric-value red">-${fmt(totalReturns)}</div></div>` : ''}
      ${totalLoss > 0 ? `<div class="metric-card"><div class="metric-label">Write-off loss</div><div class="metric-value red">-${fmt(totalLoss)}</div></div>` : ''}
      ${(totalReturns > 0 || totalLoss > 0) ? `<div class="metric-card"><div class="metric-label">Net profit</div><div class="metric-value green">${fmt(s.profit - totalReturns - totalLoss)}</div></div>` : ''}
    </div>`;
}

function salesTableHtml(salesArr) {
  if (!salesArr.length) return '<div class="empty-state"><p>No sales in this period.</p></div>';
  const rows = salesArr.slice().reverse().map(s => `
    <tr>
      <td style="font-size:12px;color:var(--text3)">${fmtDate(s.date)}</td>
      <td style="font-weight:500">${s.customer}</td>
      <td>${s.items.length}</td>
      <td>${fmt(s.total)}</td>
      <td style="color:var(--accent-dark);font-weight:600">${fmt(s.profit)}</td>
    </tr>`).join('');
  return `<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Profit</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function renderDailyReport() {
  const salesArr = AppData.sales.filter(s => s.date === today());
  const s = reportSummary(salesArr);
  document.getElementById('report-content').innerHTML = `
    <div style="font-size:13px;color:var(--text3);margin-bottom:12px">Today — ${fmtDate(today())}</div>
    ${reportMetricsHtml(s, today(), today())}
    ${salesTableHtml(salesArr)}
  `;
}

function renderWeeklyReport() {
  const d = new Date(); d.setDate(d.getDate() - 6);
  const from = d.toISOString().slice(0, 10);
  const salesArr = salesInRange(from, today());
  const s = reportSummary(salesArr);

  // Day-by-day breakdown
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    const dateStr = dt.toISOString().slice(0, 10);
    const daySales = AppData.sales.filter(x => x.date === dateStr);
    const daySum = reportSummary(daySales);
    days.push({ date: dateStr, ...daySum });
  }

  const dayRows = days.map(d => `
    <tr>
      <td>${fmtDate(d.date)} (${new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })})</td>
      <td>${fmt(d.revenue)}</td>
      <td style="color:var(--accent-dark);font-weight:500">${fmt(d.profit)}</td>
      <td>${d.bills}</td>
    </tr>`).join('');

  document.getElementById('report-content').innerHTML = `
    <div style="font-size:13px;color:var(--text3);margin-bottom:12px">Last 7 days — ${fmtDate(from)} to ${fmtDate(today())}</div>
    ${reportMetricsHtml(s, from, today())}
    <div class="table-wrap" style="margin-bottom:16px">
      <table><thead><tr><th>Day</th><th>Revenue</th><th>Profit</th><th>Bills</th></tr></thead>
      <tbody>${dayRows}</tbody></table>
    </div>
    ${salesTableHtml(salesArr)}
  `;
}

function renderMonthlyReport() {
  // Get all months that have sales
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Build last 12 months
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const from = `${year}-${String(month+1).padStart(2,'0')}-01`;
    const lastDay = new Date(year, month+1, 0).getDate();
    const to = `${year}-${String(month+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const salesArr = salesInRange(from, to);
    const s = reportSummary(salesArr);
    if (salesArr.length > 0 || i === 0) {
      months.push({ from, to, label, s, salesArr });
    }
  }

  const selectedMonth = (document.getElementById('month-select') || {}).value || months[0]?.from || '';

  const monthOptions = months.map(m =>
    `<option value="${m.from}" ${m.from === selectedMonth ? 'selected' : ''}>${m.label} (${m.salesArr.length} bills)</option>`
  ).join('');

  document.getElementById('report-content').innerHTML = `
    <div class="card" style="margin-bottom:14px">
      <div class="form-group" style="margin:0">
        <label>Select month</label>
        <select id="month-select" onchange="renderMonthlyReport()"
          style="padding:8px 12px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text);width:100%;max-width:280px">
          ${monthOptions}
        </select>
      </div>
    </div>
    <div id="monthly-result"></div>
  `;

  // Show selected month data
  const selected = months.find(m => m.from === selectedMonth) || months[0];
  if (selected) {
    // Day-by-day breakdown for the selected month
    const startDate = new Date(selected.from + 'T00:00:00');
    const endDate = new Date(selected.to + 'T00:00:00');
    const dayList = [];
    for (let dt = new Date(startDate); dt <= endDate; dt.setDate(dt.getDate() + 1)) {
      const dateStr = dt.toISOString().slice(0, 10);
      const daySales = AppData.sales.filter(x => x.date === dateStr);
      if (daySales.length === 0) continue; // skip days with no bills to keep the table compact
      const daySum = reportSummary(daySales);
      dayList.push({ date: dateStr, ...daySum });
    }

    const monthDayRows = dayList.map(d => `
      <tr>
        <td>${fmtDate(d.date)} (${new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })})</td>
        <td>${fmt(d.revenue)}</td>
        <td style="color:var(--accent-dark);font-weight:500">${fmt(d.profit)}</td>
        <td>${d.bills}</td>
      </tr>`).join('');

    document.getElementById('monthly-result').innerHTML = `
      <div style="font-size:13px;color:var(--text3);margin-bottom:12px">${selected.label} — ${fmtDate(selected.from)} to ${fmtDate(selected.to)}</div>
      ${reportMetricsHtml(selected.s, selected.from, selected.to)}
      <div class="table-wrap" style="margin-bottom:16px">
        <table><thead><tr><th>Day</th><th>Revenue</th><th>Profit</th><th>Bills</th></tr></thead>
        <tbody>${monthDayRows || '<tr><td colspan="4" style="text-align:center;color:var(--text3)">No bills this month</td></tr>'}</tbody></table>
      </div>
      ${salesTableHtml(selected.salesArr)}
    `;
  }
}

function renderRangeReport() {
  const fromVal = document.getElementById('r-from') ? document.getElementById('r-from').value : '';
  const toVal = document.getElementById('r-to') ? document.getElementById('r-to').value : '';

  document.getElementById('report-content').innerHTML = `
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>From</label><input id="r-from" type="date" value="${fromVal}"></div>
        <div class="form-group"><label>To</label><input id="r-to" type="date" value="${toVal || today()}"></div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="runRangeReport()">Generate report</button>
    </div>
    <div id="range-result"></div>
  `;
}

function runRangeReport() {
  const from = document.getElementById('r-from').value;
  const to = document.getElementById('r-to').value;
  if (!from || !to) { showToast('Select both dates'); return; }
  if (from > to) { showToast('From date must be before To date'); return; }
  const salesArr = salesInRange(from, to);
  const s = reportSummary(salesArr);
  document.getElementById('range-result').innerHTML = `
    <div style="font-size:13px;color:var(--text3);margin:12px 0">${fmtDate(from)} to ${fmtDate(to)}</div>
    ${reportMetricsHtml(s, from, to)}
    ${salesTableHtml(salesArr)}
  `;
}

function renderProductReport() {
  const brands = [...new Set(AppData.products.map(p => p.brand).filter(Boolean))].sort();
  const monthStart = new Date(); monthStart.setDate(1);
  const defaultFrom = monthStart.toISOString().slice(0, 10);

  document.getElementById('report-content').innerHTML = `
    <div class="card" style="margin-bottom:14px">
      <div class="form-grid">
        <div class="form-group">
          <label>Brand</label>
          <select id="pr-brand" onchange="updateProductFilterOptions()"
            style="padding:8px 12px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text)">
            <option value="">All brands</option>
            ${brands.map(b => `<option value="${b}">${b}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Product <span style="font-size:11px;color:var(--text3)">— optional, narrows to one item</span></label>
          <select id="pr-product"
            style="padding:8px 12px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text)">
            <option value="">All products${brands.length ? ' in selected brand' : ''}</option>
          </select>
        </div>
        <div class="form-group"><label>From</label><input id="pr-from" type="date" value="${defaultFrom}"></div>
        <div class="form-group"><label>To</label><input id="pr-to" type="date" value="${today()}"></div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="runProductReport()">Generate report</button>
    </div>
    <div id="product-report-result"></div>
  `;
  updateProductFilterOptions();
}

function updateProductFilterOptions() {
  const brand = document.getElementById('pr-brand')?.value || '';
  const productSel = document.getElementById('pr-product');
  if (!productSel) return;
  const matching = AppData.products
    .filter(p => !brand || p.brand === brand)
    .sort((a, b) => a.name.localeCompare(b.name));
  productSel.innerHTML = `<option value="">All products${brand ? ' in ' + brand : ''}</option>` +
    matching.map(p => `<option value="${p.id}">${p.name}${p.brand ? ' (' + p.brand + ')' : ''}</option>`).join('');
}

function runProductReport() {
  const brand = document.getElementById('pr-brand').value;
  const productId = document.getElementById('pr-product').value;
  const from = document.getElementById('pr-from').value;
  const to = document.getElementById('pr-to').value;
  if (!from || !to) { showToast('Select both dates'); return; }
  if (from > to) { showToast('From date must be before To date'); return; }
  if (!brand && !productId) { showToast('Select a brand or a specific product'); return; }

  const salesArr = salesInRange(from, to);

  // Build a map of pid -> { name, brand, qty, revenue, profit, bills (set) }
  const productMap = {};
  salesArr.forEach(s => {
    (s.items || []).forEach(it => {
      if (!it.pid) return;
      if (productId && it.pid !== productId) return;
      if (brand && !productId && it.brand !== brand) return;
      const base = (parseFloat(it.price) || 0) * (parseFloat(it.qty) || 0);
      const disc = base * ((parseFloat(it.discount) || 0) / 100);
      const lineRevenue = base - disc;
      const lineCost = (parseFloat(it.cost) || 0) * (parseFloat(it.qty) || 0);
      const lineProfit = lineRevenue - lineCost;

      if (!productMap[it.pid]) {
        productMap[it.pid] = { pid: it.pid, name: it.name, brand: it.brand || '', qty: 0, revenue: 0, profit: 0, billIds: new Set() };
      }
      productMap[it.pid].qty += parseFloat(it.qty) || 0;
      productMap[it.pid].revenue += lineRevenue;
      productMap[it.pid].profit += lineProfit;
      productMap[it.pid].billIds.add(s.id);
    });
  });

  const rows = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);
  const totalQty = rows.reduce((a, r) => a + r.qty, 0);
  const totalRevenue = rows.reduce((a, r) => a + r.revenue, 0);
  const totalProfit = rows.reduce((a, r) => a + r.profit, 0);
  const totalBills = new Set(rows.flatMap(r => [...r.billIds])).size;

  const label = productId
    ? (AppData.products.find(p => p.id === productId)?.name || 'Selected product')
    : (brand || 'All products');

  const tableRows = rows.map(r => {
    const product = AppData.products.find(p => p.id === r.pid);
    const currentStock = product ? product.stock : '—';
    return `<tr>
      <td style="font-weight:500">${r.name}${r.brand ? ` <span style="color:var(--text3);font-size:11px">(${r.brand})</span>` : ''}</td>
      <td style="text-align:center">${r.qty}</td>
      <td style="text-align:center">${r.billIds.size}</td>
      <td>${fmt(r.revenue)}</td>
      <td style="color:var(--accent-dark);font-weight:600">${fmt(r.profit)}</td>
      <td style="text-align:center;color:var(--text3)">${currentStock}</td>
    </tr>`;
  }).join('');

  document.getElementById('product-report-result').innerHTML = `
    <div style="font-size:13px;color:var(--text3);margin-bottom:12px">${label} — ${fmtDate(from)} to ${fmtDate(to)}</div>
    <div class="metrics-grid" style="margin-bottom:16px">
      <div class="metric-card"><div class="metric-label">Total qty sold</div><div class="metric-value">${totalQty}</div></div>
      <div class="metric-card"><div class="metric-label">Revenue</div><div class="metric-value">${fmt(totalRevenue)}</div></div>
      <div class="metric-card"><div class="metric-label">Profit</div><div class="metric-value green">${fmt(totalProfit)}</div></div>
      <div class="metric-card"><div class="metric-label">Bills containing these items</div><div class="metric-value">${totalBills}</div></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Product</th><th>Qty sold</th><th>Bills</th><th>Revenue</th><th>Profit</th><th>Current stock</th></tr></thead>
        <tbody>${tableRows || '<tr><td colspan="6" style="text-align:center;color:var(--text3)">No sales found for this selection in this period</td></tr>'}</tbody>
      </table>
    </div>
  `;
}
