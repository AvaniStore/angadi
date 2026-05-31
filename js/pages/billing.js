// ============================================================
//  PAGE: Billing
// ============================================================

let billItems = [];

function renderBilling() {
  if (!billItems.length) billItems = [{ pid: '', qty: 1, price: 0, gst: 0, cost: 0, name: '' }];

  document.getElementById('page-billing').innerHTML = `
    <div class="page-header">
      <h2 class="page-title">New Bill</h2>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Customer name</label><input id="b-customer" placeholder="Walk-in customer"></div>
        <div class="form-group"><label>Phone (optional)</label><input id="b-phone" placeholder="9XXXXXXXXX" type="tel"></div>
        <div class="form-group"><label>Bill date</label><input id="b-date" type="date" value="${today()}"></div>
      </div>
      <div class="divider"></div>
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">Items</div>
      <div style="display:grid;grid-template-columns:1fr 70px 90px 80px 32px;gap:8px;margin-bottom:6px">
        <span style="font-size:11px;color:var(--text3)">Product</span>
        <span style="font-size:11px;color:var(--text3)">Qty</span>
        <span style="font-size:11px;color:var(--text3)">Price (₹)</span>
        <span style="font-size:11px;color:var(--text3)">Amount</span>
        <span></span>
      </div>
      <div id="bill-rows"></div>
      <button class="btn btn-sm" onclick="addBillRow()" style="margin-top:6px">+ Add item</button>
      <div class="bill-summary" id="bill-summary">
        <div class="bill-summary-row"><span>Subtotal</span><span id="bs-sub">₹0.00</span></div>
        <div class="bill-summary-row"><span>GST</span><span id="bs-gst">₹0.00</span></div>
        <div class="bill-summary-row total"><span>Total</span><span id="bs-total">₹0.00</span></div>
        <div class="bill-summary-row" style="margin-top:4px"><span style="color:var(--accent)">Estimated profit</span><span id="bs-profit" style="color:var(--accent)">₹0.00</span></div>
      </div>
      <div class="form-actions" style="margin-top:14px">
        <button class="btn btn-primary" onclick="saveBill()">Save & view invoice</button>
        <button class="btn" onclick="clearBill()">Clear</button>
      </div>
    </div>
    <div id="invoice-section"></div>
  `;
  renderBillRows();
}

function renderBillRows() {
  const opts = AppData.products.map(p =>
    `<option value="${p.id}">${p.name} — ${fmt(p.sell)}</option>`
  ).join('');

  const html = billItems.map((it, i) => `
    <div class="bill-row">
      <select onchange="billPickProduct(${i}, this.value)">
        <option value="">— select —</option>
        ${AppData.products.map(p => `<option value="${p.id}" ${p.id === it.pid ? 'selected' : ''}>${p.name}</option>`).join('')}
      </select>
      <input type="number" min="1" value="${it.qty}" onchange="billSetQty(${i}, this.value)" style="text-align:center">
      <input type="number" step="0.01" value="${it.price || ''}" onchange="billSetPrice(${i}, this.value)" placeholder="0.00">
      <span style="font-size:13px;font-weight:600;display:flex;align-items:center">${it.pid ? fmt(it.price * it.qty) : '—'}</span>
      <button class="btn btn-xs btn-danger" onclick="removeBillRow(${i})" aria-label="Remove">✕</button>
    </div>
  `).join('');

  const rowsEl = document.getElementById('bill-rows');
  if (rowsEl) rowsEl.innerHTML = html;
  updateBillSummary();
}

function billPickProduct(i, pid) {
  const p = AppData.products.find(x => x.id === pid);
  billItems[i] = p
    ? { pid: p.id, name: p.name, qty: billItems[i].qty || 1, price: p.sell, gst: p.gst, cost: p.cost }
    : { pid: '', qty: 1, price: 0, gst: 0, cost: 0, name: '' };
  renderBillRows();
}
function billSetQty(i, v) { billItems[i].qty = parseInt(v) || 1; renderBillRows(); }
function billSetPrice(i, v) { billItems[i].price = parseFloat(v) || 0; renderBillRows(); }
function removeBillRow(i) { billItems.splice(i, 1); if (!billItems.length) addBillRow(); else renderBillRows(); }
function addBillRow() { billItems.push({ pid: '', qty: 1, price: 0, gst: 0, cost: 0, name: '' }); renderBillRows(); }

function updateBillSummary() {
  const valid = billItems.filter(it => it.pid);
  const t = calcBill(valid);
  const prof = calcProfit(valid);
  const sub = document.getElementById('bs-sub');
  const gst = document.getElementById('bs-gst');
  const total = document.getElementById('bs-total');
  const profit = document.getElementById('bs-profit');
  if (sub) sub.textContent = fmt(t.sub);
  if (gst) gst.textContent = fmt(t.gst);
  if (total) total.textContent = fmt(t.total);
  if (profit) profit.textContent = fmt(prof);
}

function clearBill() {
  billItems = [{ pid: '', qty: 1, price: 0, gst: 0, cost: 0, name: '' }];
  renderBilling();
}

function saveBill() {
  const valid = billItems.filter(it => it.pid && it.qty > 0);
  if (!valid.length) { showToast('Add at least one product'); return; }

  const stockErrors = [];
  valid.forEach(it => {
    const p = AppData.products.find(x => x.id === it.pid);
    if (p && p.stock < it.qty) stockErrors.push(`${p.name} (only ${p.stock} in stock)`);
  });
  if (stockErrors.length) { showToast('Stock issue: ' + stockErrors.join(', ')); return; }

  const t = calcBill(valid);
  const profit = calcProfit(valid);
  const customer = document.getElementById('b-customer').value.trim() || 'Walk-in';
  const phone = document.getElementById('b-phone').value.trim();
  const date = document.getElementById('b-date').value || today();

  const sale = { id: uid(), date, customer, phone, items: valid, total: t.total, profit, sub: t.sub, gst: t.gst };
  AppData.sales.push(sale);

  // Deduct stock
  valid.forEach(it => {
    const p = AppData.products.find(x => x.id === it.pid);
    if (p) p.stock -= it.qty;
  });

  autoSave();
  showToast('Bill saved ✓');
  showInvoice(sale, t);
  billItems = [];
}

function showInvoice(sale, t) {
  const s = AppData.settings;
  const rows = sale.items.map(it => `
    <tr>
      <td>${it.name}</td>
      <td style="text-align:center">${it.qty}</td>
      <td style="text-align:right">₹${fmtNum(it.price)}</td>
      <td style="text-align:center">${it.gst}%</td>
      <td style="text-align:right;font-weight:600">₹${fmtNum(it.price * it.qty)}</td>
    </tr>`).join('');

  const invoiceHtml = `
    <div class="inv-head">
      <div>
        <div class="shop-name">${s.shopName}</div>
        <div style="font-size:12px;color:#555;margin-top:4px;line-height:1.6">${s.address || ''}<br>${s.city || ''}, ${s.state || ''}<br>Ph: ${s.phone || ''} &nbsp;·&nbsp; GSTIN: ${s.gstin || ''}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:700">INVOICE</div>
        <div style="font-size:12px;color:#555;margin-top:4px">Bill # ${sale.id.toUpperCase().slice(0, 10)}<br>Date: ${fmtDate(sale.date)}<br>Customer: ${sale.customer}${sale.phone ? '<br>Ph: ' + sale.phone : ''}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:center">GST</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals" style="margin-left:auto;width:220px;margin-top:12px">
      <div class="totals-row"><span>Subtotal</span><span>₹${fmtNum(t.sub)}</span></div>
      <div class="totals-row"><span>GST</span><span>₹${fmtNum(t.gst)}</span></div>
      <div class="totals-row final"><span>Total</span><span>₹${fmtNum(t.total)}</span></div>
    </div>
    <div class="footer">Thank you for your purchase! &nbsp;·&nbsp; ${s.shopName}</div>
  `;

  document.getElementById('invoice-section').innerHTML = `
    <div class="card">
      <div class="card-head">
        <span class="card-title">Invoice preview</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" onclick="printInvoice(\`${invoiceHtml.replace(/`/g, '\\`')}\`)">🖨 Print</button>
          <button class="btn btn-sm" onclick="renderBilling()">New bill</button>
        </div>
      </div>
      <div class="invoice-preview">${invoiceHtml}</div>
    </div>
  `;
}
