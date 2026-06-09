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
      <button class="tab-btn ${activeReportTab === 'range' ? 'active' : ''}" onclick="switchReportTab('range', this)">Date range</button>
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
  else if (tab === 'range') renderRangeReport();
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
