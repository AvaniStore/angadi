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
      <td style="padding:8px 10px;border-bottom:1px solid #d8e8d8">${it.name}${it.brand?' <span style="color:#888;font-size:11px">('+it.brand+')</span>':''}${it.weight?' <span style="color:#888;font-size:11px">'+it.weight+'</span>':''}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #d8e8d8;text-align:center">${it.qty}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #d8e8d8;text-align:right">₹${fmtNum(it.price)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #d8e8d8;text-align:center${it.discount?';color:#dc2626':''}">${it.discount?it.discount+'%':'—'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #d8e8d8;text-align:center">${it.gst}%</td>
      <td style="padding:8px 10px;border-bottom:1px solid #d8e8d8;text-align:right;font-weight:600">₹${fmtNum(after)}</td>
    </tr>`;
  }).join('');

  const invoiceHtml = `
    <div style="font-family:Arial,sans-serif;font-size:13px;color:#1a2e1a;max-width:100%;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:3px solid #3a9e3a;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-size:18px;font-weight:700;color:#2d7a2d">${s.shopName}</div>
          <div style="font-size:10px;color:#4caf50;letter-spacing:1px;text-transform:uppercase;margin:2px 0 4px">Herbal, Organic &amp; Natural Products</div>
          <div style="font-size:12px;color:#555;line-height:1.6">
            ${s.address?s.address+'<br>':''}${s.city||''}${s.state?', '+s.state:''}
            ${s.phone?'<br>Ph: '+s.phone:''}${s.gstin?'<br>GSTIN: '+s.gstin:''}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:18px;font-weight:700;color:#1a2e1a">INVOICE</div>
          <div style="font-size:12px;color:#555;margin-top:4px;line-height:1.7">
            Bill # ${sale.id.toUpperCase().slice(0,10)}<br>
            Date: ${fmtDate(sale.date)}<br>
            Customer: <strong>${sale.customer}</strong>${sale.phone?'<br>Ph: '+sale.phone:''}
          </div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px">
        <thead>
          <tr style="background:#edf5ed">
            <th style="padding:8px 10px;text-align:left;font-size:12px;color:#4a5e4a;border-bottom:1px solid #d8e8d8">Item</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#4a5e4a;border-bottom:1px solid #d8e8d8">Qty</th>
            <th style="padding:8px 10px;text-align:right;font-size:12px;color:#4a5e4a;border-bottom:1px solid #d8e8d8">Rate</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#4a5e4a;border-bottom:1px solid #d8e8d8">Disc%</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#4a5e4a;border-bottom:1px solid #d8e8d8">GST</th>
            <th style="padding:8px 10px;text-align:right;font-size:12px;color:#4a5e4a;border-bottom:1px solid #d8e8d8">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-top:8px">
        <div style="width:220px">
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#4a5e4a"><span>Subtotal</span><span>₹${fmtNum(sale.sub||sale.total)}</span></div>
          ${(sale.itemDisc||0)>0?`<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#dc2626"><span>Item discounts</span><span>-₹${fmtNum(sale.itemDisc)}</span></div>`:''}
          ${(sale.billDisc||0)>0?`<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#dc2626"><span>Bill discount</span><span>-₹${fmtNum(sale.billDisc)}</span></div>`:''}
          ${(sale.gst||0)>0?`<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#4a5e4a"><span>GST</span><span>₹${fmtNum(sale.gst)}</span></div>`:''}
          <div style="display:flex;justify-content:space-between;padding:8px 0 4px;font-size:16px;font-weight:700;color:#2d7a2d;border-top:2px solid #3a9e3a;margin-top:6px"><span>Total</span><span>₹${fmtNum(sale.total)}</span></div>
        </div>
      </div>
      <div style="text-align:center;margin-top:20px;font-size:12px;color:#8aa08a;padding-top:12px;border-top:1px solid #d8e8d8">
        Thank you for your purchase! &nbsp;·&nbsp; ${s.shopName}
      </div>
    </div>
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
