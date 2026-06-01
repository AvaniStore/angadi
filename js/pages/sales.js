// ============================================================
//  PAGE: Sales History — with customer returns
// ============================================================

function renderSales() {
  const totalRev = AppData.sales.reduce((a,s) => a + (s.total||0), 0);
  const totalProfit = AppData.sales.reduce((a,s) => a + (s.profit||0), 0);
  const totalReturns = AppData.returns.reduce((a,r) => a + (r.refund||0), 0);

  const rows = AppData.sales.slice().reverse().map(s => {
    const saleReturns = AppData.returns.filter(r => r.saleId === s.id);
    const returnedAmt = saleReturns.reduce((a,r) => a + (r.refund||0), 0);
    const hasReturn = saleReturns.length > 0;
    return `<tr>
      <td style="font-size:12px;color:var(--text3)">#${s.id.toUpperCase().slice(0,8)}</td>
      <td>${fmtDate(s.date)}</td>
      <td style="font-weight:500">${s.customer}${hasReturn ? ' <span class="badge badge-exp" style="font-size:10px">Return</span>' : ''}</td>
      <td style="color:var(--text3)">${s.phone || '—'}</td>
      <td>${(s.items||[]).length} item${(s.items||[]).length!==1?'s':''}</td>
      <td style="font-weight:600">${fmt(s.total)}${hasReturn ? `<div style="font-size:11px;color:var(--red)">-${fmt(returnedAmt)} returned</div>` : ''}</td>
      <td style="color:var(--accent-dark);font-weight:600">${fmt(s.profit)}</td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <button class="btn btn-xs" onclick="viewSale('${s.id}')">View</button>
          <button class="btn btn-xs" style="color:var(--amber);border-color:#fcd34d" onclick="openReturn('${s.id}')">↩ Return</button>
          <button class="btn btn-xs btn-danger" onclick="deleteSale('${s.id}')">Del</button>
        </div>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="8"><div class="empty-state"><p>No sales recorded yet.</p></div></td></tr>`;

  // Returns history
  const returnRows = AppData.returns.slice().reverse().slice(0,10).map(r => {
    const sale = AppData.sales.find(s => s.id === r.saleId);
    return `<tr>
      <td style="font-size:12px;color:var(--text3)">${fmtDate(r.date)}</td>
      <td>${sale ? sale.customer : '—'}</td>
      <td>${r.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</td>
      <td style="color:var(--red);font-weight:600">-${fmt(r.refund)}</td>
      <td style="font-size:12px;color:var(--text3)">${r.reason || '—'}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="5"><div class="empty-state" style="padding:16px"><p>No returns yet</p></div></td></tr>`;

  document.getElementById('page-sales').innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Sales History</h2>
      <div style="font-size:13px;color:var(--text2)">
        ${AppData.sales.length} bills &nbsp;·&nbsp; ${fmt(totalRev)} revenue &nbsp;·&nbsp;
        <span style="color:var(--accent-dark)">${fmt(totalProfit)} profit</span>
        ${totalReturns > 0 ? ` &nbsp;·&nbsp; <span style="color:var(--red)">-${fmt(totalReturns)} returns</span>` : ''}
      </div>
    </div>
    <div id="sale-detail"></div>
    <div id="return-form"></div>

    <div class="table-wrap" style="margin-bottom:20px">
      <table>
        <thead><tr><th>Bill #</th><th>Date</th><th>Customer</th><th>Phone</th><th>Items</th><th>Total</th><th>Profit</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    ${AppData.returns.length ? `
    <div style="font-size:14px;font-weight:600;margin-bottom:10px">Returns history</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Date</th><th>Customer</th><th>Items returned</th><th>Refund</th><th>Reason</th></tr></thead>
        <tbody>${returnRows}</tbody>
      </table>
    </div>` : ''}
  `;
}

// ---- Return flow ----
function openReturn(saleId) {
  const sale = AppData.sales.find(s => s.id === saleId);
  if (!sale) return;

  // Check already returned items
  const pastReturns = AppData.returns.filter(r => r.saleId === saleId);
  const returnedQtys = {};
  pastReturns.forEach(r => r.items.forEach(i => {
    returnedQtys[i.pid] = (returnedQtys[i.pid] || 0) + i.qty;
  }));

  const itemRows = sale.items.map(it => {
    const alreadyReturned = returnedQtys[it.pid] || 0;
    const canReturn = it.qty - alreadyReturned;
    if (canReturn <= 0) return `
      <div style="display:grid;grid-template-columns:1fr 80px 80px;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:13px;color:var(--text3)">${it.name} <em>(fully returned)</em></span>
        <span></span><span></span>
      </div>`;
    return `
      <div style="display:grid;grid-template-columns:1fr 80px 80px;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:13px;font-weight:500">${it.name}${it.brand ? ' ('+it.brand+')' : ''}</div>
          <div style="font-size:11px;color:var(--text3)">Sold: ${it.qty} &nbsp;·&nbsp; Can return: ${canReturn} &nbsp;·&nbsp; ${fmt(it.price)} each</div>
        </div>
        <input type="number" id="ret-qty-${it.pid}" min="0" max="${canReturn}" value="0" step="1"
          style="padding:6px 8px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;text-align:center;width:100%"
          oninput="updateReturnTotal('${saleId}')">
        <span style="font-size:13px;font-weight:500;text-align:right" id="ret-amt-${it.pid}">₹0.00</span>
      </div>`;
  }).join('');

  document.getElementById('return-form').innerHTML = `
    <div class="card" style="margin-bottom:16px;border:2px solid #fcd34d">
      <div class="card-head">
        <span class="card-title">↩ Process return — ${sale.customer} · ${fmtDate(sale.date)}</span>
        <button class="btn btn-sm" onclick="document.getElementById('return-form').innerHTML=''">Cancel</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 80px 80px;gap:8px;margin-bottom:6px">
        <span style="font-size:11px;color:var(--text3)">Item</span>
        <span style="font-size:11px;color:var(--text3);text-align:center">Return qty</span>
        <span style="font-size:11px;color:var(--text3);text-align:right">Refund</span>
      </div>
      ${itemRows}
      <div class="form-grid" style="margin-top:12px">
        <div class="form-group">
          <label>Reason for return</label>
          <select id="ret-reason" style="padding:8px 10px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text)">
            <option>Customer changed mind</option>
            <option>Wrong product given</option>
            <option>Damaged / defective</option>
            <option>Near expiry</option>
            <option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Total refund</label>
          <div id="ret-total" style="font-size:20px;font-weight:700;color:var(--red);padding:6px 0">₹0.00</div>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" onclick="saveReturn('${saleId}')">Confirm return</button>
      </div>
    </div>
  `;
  document.getElementById('return-form').scrollIntoView({ behavior: 'smooth' });
}

function updateReturnTotal(saleId) {
  const sale = AppData.sales.find(s => s.id === saleId);
  if (!sale) return;
  let total = 0;
  sale.items.forEach(it => {
    const qtyEl = document.getElementById(`ret-qty-${it.pid}`);
    const amtEl = document.getElementById(`ret-amt-${it.pid}`);
    if (!qtyEl) return;
    const qty = parseFloat(qtyEl.value) || 0;
    const itemDisc = 1 - ((it.discount || 0) / 100);
    const amt = qty * it.price * itemDisc;
    total += amt;
    if (amtEl) amtEl.textContent = fmt(amt);
  });
  const totalEl = document.getElementById('ret-total');
  if (totalEl) totalEl.textContent = fmt(total);
}

function saveReturn(saleId) {
  const sale = AppData.sales.find(s => s.id === saleId);
  if (!sale) return;

  const returnedItems = [];
  let refund = 0;

  sale.items.forEach(it => {
    const qtyEl = document.getElementById(`ret-qty-${it.pid}`);
    if (!qtyEl) return;
    const qty = parseFloat(qtyEl.value) || 0;
    if (qty <= 0) return;
    const itemDisc = 1 - ((it.discount || 0) / 100);
    const amt = qty * it.price * itemDisc;
    returnedItems.push({ pid: it.pid, name: it.name, brand: it.brand || '', qty, price: it.price, refundAmt: amt });
    refund += amt;
    // Restore stock
    const p = AppData.products.find(x => x.id === it.pid);
    if (p) p.stock += qty;
  });

  if (!returnedItems.length) { showToast('Enter qty for at least one item'); return; }

  const reason = document.getElementById('ret-reason').value;
  AppData.returns.push({
    id: uid(), date: today(), saleId,
    items: returnedItems, refund, reason,
  });

  // Adjust sale profit
  const profitLoss = returnedItems.reduce((a, i) => {
    const orig = sale.items.find(x => x.pid === i.pid);
    return a + (i.price - (orig ? orig.cost : 0)) * i.qty;
  }, 0);
  sale.profit = (sale.profit || 0) - profitLoss;

  autoSave();
  showToast(`Return processed — ${fmt(refund)} refund ✓`);
  document.getElementById('return-form').innerHTML = '';
  renderSales();
}

// ---- Delete bill ----
function deleteSale(id) {
  const sale = AppData.sales.find(s => s.id === id);
  if (!sale) return;
  if (!confirmDelete(`Delete bill for ${sale.customer} on ${fmtDate(sale.date)} (${fmt(sale.total)})?`)) return;
  if (confirm('Restore stock for items in this bill?')) {
    (sale.items || []).forEach(it => {
      const p = AppData.products.find(x => x.id === it.pid);
      if (p) p.stock += it.qty;
    });
  }
  AppData.sales = AppData.sales.filter(s => s.id !== id);
  AppData.returns = AppData.returns.filter(r => r.saleId !== id);
  autoSave();
  showToast('Bill deleted ✓');
  renderSales();
}

// ---- View invoice ----
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
        <div style="font-size:11px;color:#4caf50;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Herbal, Organic &amp; Natural Products</div>
        <div style="font-size:12px;color:#555;margin-top:4px;line-height:1.6">
          ${s.address?s.address+'<br>':''}${s.city||''}${s.state?', '+s.state:''}
          ${s.phone?'<br>Ph: '+s.phone:''}${s.gstin?'<br>GSTIN: '+s.gstin:''}
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
