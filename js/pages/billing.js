// ============================================================
//  PAGE: Billing — with discount support
// ============================================================

let billItems = [];

function renderBilling() {
  if (!billItems.length) billItems = [{ pid: '', qty: 1, price: 0, gst: 0, cost: 0, name: '', discount: 0 }];

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
      <div style="display:grid;grid-template-columns:1fr 70px 90px 70px 80px 32px;gap:8px;margin-bottom:6px">
        <span style="font-size:11px;color:var(--text3)">Product</span>
        <span style="font-size:11px;color:var(--text3)">Qty</span>
        <span style="font-size:11px;color:var(--text3)">Price (₹)</span>
        <span style="font-size:11px;color:var(--text3)">Disc%</span>
        <span style="font-size:11px;color:var(--text3)">Amount</span>
        <span></span>
      </div>
      <div id="bill-rows"></div>
      <button class="btn btn-sm" onclick="addBillRow()" style="margin-top:6px">+ Add item</button>

      <div class="divider"></div>
      <div class="form-grid" style="max-width:300px">
        <div class="form-group">
          <label>Overall bill discount (₹)</label>
          <input id="b-discount" type="number" step="0.01" placeholder="0.00" value="0" oninput="updateBillSummary()">
        </div>
      </div>

      <div class="bill-summary" id="bill-summary">
        <div class="bill-summary-row"><span>Subtotal</span><span id="bs-sub">₹0.00</span></div>
        <div class="bill-summary-row"><span>Item discounts</span><span id="bs-item-disc" style="color:var(--red)">-₹0.00</span></div>
        <div class="bill-summary-row"><span>Bill discount</span><span id="bs-bill-disc" style="color:var(--red)">-₹0.00</span></div>
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
  const html = billItems.map((it, i) => `
    <div style="display:grid;grid-template-columns:1fr 70px 90px 70px 80px 32px;gap:8px;align-items:center;margin-bottom:6px">
      <select onchange="billPickProduct(${i}, this.value)" style="padding:6px 8px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;font-family:inherit;background:var(--bg2);color:var(--text);width:100%">
        <option value="">— select —</option>
        ${AppData.products.map(p => `<option value="${p.id}" ${p.id === it.pid ? 'selected' : ''}>${p.name}${p.brand ? ' ('+p.brand+')' : ''}${p.weight||p.weightOther ? ' - '+(p.weightOther||p.weight) : ''}</option>`).join('')}
      </select>
      <input type="number" min="1" step="0.01" value="${it.qty}" onchange="billSetQty(${i}, this.value)" style="padding:6px 8px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text);text-align:center;width:100%">
      <input type="number" step="0.01" value="${it.price || ''}" onchange="billSetPrice(${i}, this.value)" placeholder="0.00" style="padding:6px 8px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text);width:100%">
      <input type="number" min="0" max="100" step="0.1" value="${it.discount || 0}" onchange="billSetDiscount(${i}, this.value)" placeholder="0" style="padding:6px 8px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text);text-align:center;width:100%">
      <span style="font-size:13px;font-weight:600;display:flex;align-items:center">${it.pid ? fmt(calcItemTotal(it)) : '—'}</span>
      <button onclick="removeBillRow(${i})" style="padding:4px 6px;border:1px solid #fca5a5;border-radius:var(--radius);background:transparent;color:var(--red);cursor:pointer;font-size:12px">✕</button>
    </div>
  `).join('');

  const rowsEl = document.getElementById('bill-rows');
  if (rowsEl) rowsEl.innerHTML = html;
  updateBillSummary();
}

function calcItemTotal(it) {
  const base = (parseFloat(it.price) || 0) * (parseFloat(it.qty) || 0);
  const disc = base * ((parseFloat(it.discount) || 0) / 100);
  return base - disc;
}

function billPickProduct(i, pid) {
  const p = AppData.products.find(x => x.id === pid);
  billItems[i] = p
    ? { pid: p.id, name: p.name, brand: p.brand || '', weight: p.weightOther || p.weight || '', qty: billItems[i].qty || 1, price: p.sell, gst: p.gst, cost: p.cost, mrp: p.mrp || 0, discount: 0 }
    : { pid: '', qty: 1, price: 0, gst: 0, cost: 0, name: '', discount: 0 };
  renderBillRows();
}
function billSetQty(i, v) { billItems[i].qty = parseFloat(v) || 1; renderBillRows(); }
function billSetPrice(i, v) { billItems[i].price = parseFloat(v) || 0; renderBillRows(); }
function billSetDiscount(i, v) { billItems[i].discount = parseFloat(v) || 0; renderBillRows(); }
function removeBillRow(i) { billItems.splice(i, 1); if (!billItems.length) addBillRow(); else renderBillRows(); }
function addBillRow() { billItems.push({ pid: '', qty: 1, price: 0, gst: 0, cost: 0, name: '', discount: 0 }); renderBillRows(); }

function updateBillSummary() {
  const valid = billItems.filter(it => it.pid);
  let sub = 0, itemDisc = 0, gstAmt = 0;
  valid.forEach(it => {
    const base = (parseFloat(it.price) || 0) * (parseFloat(it.qty) || 0);
    const disc = base * ((parseFloat(it.discount) || 0) / 100);
    const afterDisc = base - disc;
    sub += base;
    itemDisc += disc;
    gstAmt += afterDisc * ((parseFloat(it.gst) || 0) / 100);
  });
  const billDisc = parseFloat(document.getElementById('b-discount')?.value) || 0;
  const total = sub - itemDisc - billDisc + gstAmt;
  const profit = valid.reduce((acc, it) => acc + (calcItemTotal(it) - (parseFloat(it.cost) || 0) * (parseFloat(it.qty) || 0)), 0) - billDisc;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('bs-sub', fmt(sub));
  set('bs-item-disc', '-' + fmt(itemDisc));
  set('bs-bill-disc', '-' + fmt(billDisc));
  set('bs-gst', fmt(gstAmt));
  set('bs-total', fmt(Math.max(0, total)));
  set('bs-profit', fmt(profit));
}

function clearBill() {
  billItems = [{ pid: '', qty: 1, price: 0, gst: 0, cost: 0, name: '', discount: 0 }];
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

  let sub = 0, itemDisc = 0, gstAmt = 0;
  valid.forEach(it => {
    const base = (parseFloat(it.price) || 0) * (parseFloat(it.qty) || 0);
    const disc = base * ((parseFloat(it.discount) || 0) / 100);
    const afterDisc = base - disc;
    sub += base;
    itemDisc += disc;
    gstAmt += afterDisc * ((parseFloat(it.gst) || 0) / 100);
  });
  const billDisc = parseFloat(document.getElementById('b-discount')?.value) || 0;
  const total = Math.max(0, sub - itemDisc - billDisc + gstAmt);
  const profit = valid.reduce((acc, it) => acc + (calcItemTotal(it) - (parseFloat(it.cost) || 0) * (parseFloat(it.qty) || 0)), 0) - billDisc;

  const customer = document.getElementById('b-customer').value.trim() || 'Walk-in';
  const phone = document.getElementById('b-phone').value.trim();
  const date = document.getElementById('b-date').value || today();

  const sale = { id: uid(), date, customer, phone, items: valid, sub, itemDisc, billDisc, gst: gstAmt, total, profit };
  AppData.sales.push(sale);

  valid.forEach(it => {
    const p = AppData.products.find(x => x.id === it.pid);
    if (p) p.stock -= it.qty;
  });

  autoSave();
  showToast('Bill saved ✓');
  showInvoice(sale);
  billItems = [];
}

function showInvoice(sale) {
  const s = AppData.settings;
  const rows = sale.items.map(it => {
    const base = it.price * it.qty;
    const disc = base * ((it.discount || 0) / 100);
    const after = base - disc;
    return `<tr>
      <td>${it.name}${it.brand ? ' <span style="color:#888;font-size:11px">('+it.brand+')</span>' : ''}${it.weight ? ' <span style="color:#888;font-size:11px">'+it.weight+'</span>' : ''}</td>
      <td style="text-align:center">${it.qty}</td>
      <td style="text-align:right">₹${fmtNum(it.price)}</td>
      ${it.discount ? `<td style="text-align:center;color:#dc2626">${it.discount}%</td>` : '<td style="text-align:center">—</td>'}
      <td style="text-align:center">${it.gst}%</td>
      <td style="text-align:right;font-weight:600">₹${fmtNum(after)}</td>
    </tr>`;
  }).join('');

  const invoiceHtml = buildInvoiceHtml(sale, rows, s);
  document.getElementById('invoice-section').innerHTML = `
    <div class="card">
      <div class="card-head">
        <span class="card-title">Invoice preview</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" onclick="printInvoice(\`${invoiceHtml.replace(/`/g,'\\`').replace(/\$/g,'\\$')}\`)">🖨 Print</button>
          <button class="btn btn-sm" onclick="renderBilling()">New bill</button>
        </div>
      </div>
      <div class="invoice-preview">${invoiceHtml}</div>
    </div>
  `;
}

function buildInvoiceHtml(sale, rows, s) {
  return `
    <div class="inv-head">
      <div>
        <div class="shop-name">${s.shopName}</div>
        <div style="font-size:12px;color:#555;margin-top:4px;line-height:1.6">
          ${s.address ? s.address + '<br>' : ''}${s.city || ''}${s.state ? ', ' + s.state : ''}
          ${s.phone ? '<br>Ph: ' + s.phone : ''}
          ${s.gstin ? '<br>GSTIN: ' + s.gstin : ''}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:700">INVOICE</div>
        <div style="font-size:12px;color:#555;margin-top:4px">
          Bill # ${sale.id.toUpperCase().slice(0,10)}<br>
          Date: ${fmtDate(sale.date)}<br>
          Customer: ${sale.customer}${sale.phone ? '<br>Ph: ' + sale.phone : ''}
        </div>
      </div>
    </div>
    <table>
      <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:center">Disc%</th><th style="text-align:center">GST</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals" style="margin-left:auto;width:240px;margin-top:12px">
      <div class="totals-row"><span>Subtotal</span><span>₹${fmtNum(sale.sub)}</span></div>
      ${sale.itemDisc > 0 ? `<div class="totals-row"><span>Item discounts</span><span style="color:#dc2626">-₹${fmtNum(sale.itemDisc)}</span></div>` : ''}
      ${sale.billDisc > 0 ? `<div class="totals-row"><span>Bill discount</span><span style="color:#dc2626">-₹${fmtNum(sale.billDisc)}</span></div>` : ''}
      ${sale.gst > 0 ? `<div class="totals-row"><span>GST</span><span>₹${fmtNum(sale.gst)}</span></div>` : ''}
      <div class="totals-row final"><span>Total</span><span>₹${fmtNum(sale.total)}</span></div>
    </div>
    <div class="footer">Thank you for your purchase! &nbsp;·&nbsp; ${s.shopName}</div>
  `;
}
