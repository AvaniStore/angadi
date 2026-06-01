// ============================================================
//  PAGE: Sales History
// ============================================================

function renderSales() {
  const rows = AppData.sales.slice().reverse().map(s => `
    <tr>
      <td style="font-size:12px;color:var(--text3)">#${s.id.toUpperCase().slice(0,8)}</td>
      <td>${fmtDate(s.date)}</td>
      <td style="font-weight:500">${s.customer}</td>
      <td style="color:var(--text3)">${s.phone || '—'}</td>
      <td>${(s.items||[]).length} item${(s.items||[]).length!==1?'s':''}</td>
      <td style="font-weight:600">${fmt(s.total)}</td>
      <td style="color:var(--accent-dark);font-weight:600">${fmt(s.profit)}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-xs" onclick="viewSale('${s.id}')">View</button>
          <button class="btn btn-xs btn-danger" onclick="deleteSale('${s.id}')">Del</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="8"><div class="empty-state"><p>No sales recorded yet.</p></div></td></tr>`;

  const totalRev = AppData.sales.reduce((a,s)=>a+(s.total||0),0);
  const totalProfit = AppData.sales.reduce((a,s)=>a+(s.profit||0),0);

  document.getElementById('page-sales').innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Sales History</h2>
      <div style="font-size:13px;color:var(--text2)">${AppData.sales.length} bills &nbsp;·&nbsp; ${fmt(totalRev)} revenue &nbsp;·&nbsp; <span style="color:var(--accent-dark)">${fmt(totalProfit)} profit</span></div>
    </div>
    <div id="sale-detail"></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Bill #</th><th>Date</th><th>Customer</th><th>Phone</th><th>Items</th><th>Total</th><th>Profit</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function deleteSale(id) {
  const sale = AppData.sales.find(s => s.id === id);
  if (!sale) return;
  if (!confirmDelete(`Delete bill for ${sale.customer} on ${fmtDate(sale.date)} (${fmt(sale.total)})?`)) return;
  // Restore stock for deleted bill
  if (confirm('Restore stock for items in this bill?')) {
    (sale.items || []).forEach(it => {
      const p = AppData.products.find(x => x.id === it.pid);
      if (p) p.stock += it.qty;
    });
  }
  AppData.sales = AppData.sales.filter(s => s.id !== id);
  autoSave();
  showToast('Bill deleted ✓');
  renderSales();
}

function viewSale(id) {
  const sale = AppData.sales.find(s => s.id === id);
  if (!sale) return;
  const s = AppData.settings;

  const rows = (sale.items||[]).map(it => {
    const base = it.price * it.qty;
    const disc = base * ((it.discount||0)/100);
    const after = base - disc;
    return `<tr>
      <td>${it.name}${it.brand?' <span style="color:#888;font-size:11px">('+it.brand+')</span>':''}${it.weight?' <span style="color:#888;font-size:11px">'+it.weight+'</span>':''}</td>
      <td style="text-align:center">${it.qty}</td>
      <td style="text-align:right">₹${fmtNum(it.price)}</td>
      ${it.discount?`<td style="text-align:center;color:#dc2626">${it.discount}%</td>`:'<td style="text-align:center">—</td>'}
      <td style="text-align:center">${it.gst}%</td>
      <td style="text-align:right;font-weight:600">₹${fmtNum(after)}</td>
    </tr>`;
  }).join('');

  const invoiceHtml = `
    <div class="inv-head">
      <div>
        <div class="shop-name">${s.shopName}</div>
        <div style="font-size:12px;color:#555;margin-top:4px;line-height:1.6">
          ${s.address?s.address+'<br>':''}${s.city||''}${s.state?', '+s.state:''}
          ${s.phone?'<br>Ph: '+s.phone:''}
          ${s.gstin?'<br>GSTIN: '+s.gstin:''}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:700">INVOICE</div>
        <div style="font-size:12px;color:#555;margin-top:4px">
          Bill # ${sale.id.toUpperCase().slice(0,10)}<br>
          Date: ${fmtDate(sale.date)}<br>
          Customer: ${sale.customer}${sale.phone?'<br>Ph: '+sale.phone:''}
        </div>
      </div>
    </div>
    <table>
      <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:center">Disc%</th><th style="text-align:center">GST</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals" style="margin-left:auto;width:240px;margin-top:12px">
      <div class="totals-row"><span>Subtotal</span><span>₹${fmtNum(sale.sub||sale.total)}</span></div>
      ${(sale.itemDisc||0)>0?`<div class="totals-row"><span>Item discounts</span><span style="color:#dc2626">-₹${fmtNum(sale.itemDisc)}</span></div>`:''}
      ${(sale.billDisc||0)>0?`<div class="totals-row"><span>Bill discount</span><span style="color:#dc2626">-₹${fmtNum(sale.billDisc)}</span></div>`:''}
      ${(sale.gst||0)>0?`<div class="totals-row"><span>GST</span><span>₹${fmtNum(sale.gst)}</span></div>`:''}
      <div class="totals-row final"><span>Total</span><span>₹${fmtNum(sale.total)}</span></div>
    </div>
    <div class="footer">Thank you for your purchase! &nbsp;·&nbsp; ${s.shopName}</div>
  `;

  document.getElementById('sale-detail').innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-head">
        <span class="card-title">Invoice — ${sale.customer}</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" onclick="printInvoice(\`${invoiceHtml.replace(/`/g,'\\`').replace(/\$/g,'\\$')}\`)">🖨 Print</button>
          <button class="btn btn-sm" onclick="document.getElementById('sale-detail').innerHTML=''">Close</button>
        </div>
      </div>
      <div class="invoice-preview">${invoiceHtml}</div>
    </div>
  `;
  document.getElementById('sale-detail').scrollIntoView({ behavior: 'smooth' });
}
