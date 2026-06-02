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
  const zeroCostItems = [];
  valid.forEach(it => {
    const p = AppData.products.find(x => x.id === it.pid);
    if (p) {
      if (p.stock < it.qty) stockErrors.push(`${p.name} (only ${p.stock} in stock)`);
      // Always use latest cost from product to ensure accurate profit
      it.cost = p.cost || 0;
      if (!p.cost || p.cost === 0) zeroCostItems.push(p.name);
    }
  });
  if (stockErrors.length) { showToast('Stock issue: ' + stockErrors.join(', ')); return; }
  if (zeroCostItems.length) {
    if (!confirm(`Cost price is ₹0 for: ${zeroCostItems.join(', ')}.\nProfit will show as ₹0 for these items.\n\nContinue? (You can fix cost price in Inventory later)`)) return;
  }

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
      <td style="padding:8px 10px;border-bottom:1px solid #d8e8d8">${it.name}${it.brand ? ' <span style="color:#888;font-size:11px">('+it.brand+')</span>' : ''}${it.weight ? ' <span style="color:#888;font-size:11px">'+it.weight+'</span>' : ''}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #d8e8d8;text-align:center">${it.qty}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #d8e8d8;text-align:right">₹${fmtNum(it.price)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #d8e8d8;text-align:center${it.discount?';color:#dc2626':''}">${it.discount ? it.discount+'%' : '—'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #d8e8d8;text-align:center">${it.gst}%</td>
      <td style="padding:8px 10px;border-bottom:1px solid #d8e8d8;text-align:right;font-weight:600">₹${fmtNum(after)}</td>
    </tr>`;
  }).join('');

  _currentInvoiceHtml = buildInvoiceHtml(sale, rows, s);

  document.getElementById('invoice-section').innerHTML = `
    <div style="background:#fff;border:1px solid #d8e8d8;border-radius:12px;padding:16px;margin-top:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <span style="font-size:14px;font-weight:600;color:#1a2e1a">Invoice preview</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" onclick="printCurrentInvoice()">🖨 Print</button>
          <button class="btn btn-sm" onclick="renderBilling()">New bill</button>
        </div>
      </div>
      <div style="background:#fff;border:1px solid #d8e8d8;border-radius:8px;padding:20px;overflow:hidden">
        ${_currentInvoiceHtml}
      </div>
    </div>
  `;
}

function printCurrentInvoice() {
  printInvoice(_currentInvoiceHtml);
}

function buildInvoiceHtml(sale, rows, s) {
  return `
    <div style="font-family:Arial,sans-serif;font-size:13px;color:#1a2e1a;max-width:100%;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:3px solid #3a9e3a;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-size:18px;font-weight:700;color:#2d7a2d">${s.shopName}</div>
          <div style="font-size:10px;color:#4caf50;letter-spacing:1px;text-transform:uppercase;margin:2px 0 4px">Herbal, Organic &amp; Natural Products</div>
          <div style="font-size:12px;color:#555;line-height:1.6">
            ${s.address ? s.address + '<br>' : ''}${s.city || ''}${s.state ? ', ' + s.state : ''}
            ${s.phone ? '<br>Ph: ' + s.phone : ''}
            ${s.gstin ? '<br>GSTIN: ' + s.gstin : ''}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:18px;font-weight:700;color:#1a2e1a">INVOICE</div>
          <div style="font-size:12px;color:#555;margin-top:4px;line-height:1.7">
            Bill # ${sale.id.toUpperCase().slice(0,10)}<br>
            Date: ${fmtDate(sale.date)}<br>
            Customer: <strong>${sale.customer}</strong>${sale.phone ? '<br>Ph: ' + sale.phone : ''}
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
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#4a5e4a"><span>Subtotal</span><span>₹${fmtNum(sale.sub)}</span></div>
          ${(sale.itemDisc||0)>0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#dc2626"><span>Item discounts</span><span>-₹${fmtNum(sale.itemDisc)}</span></div>` : ''}
          ${(sale.billDisc||0)>0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#dc2626"><span>Bill discount</span><span>-₹${fmtNum(sale.billDisc)}</span></div>` : ''}
          ${(sale.gst||0)>0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#4a5e4a"><span>GST</span><span>₹${fmtNum(sale.gst)}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;padding:8px 0 4px;font-size:16px;font-weight:700;color:#2d7a2d;border-top:2px solid #3a9e3a;margin-top:6px"><span>Total</span><span>₹${fmtNum(sale.total)}</span></div>
        </div>
      </div>
      <div style="text-align:center;margin-top:20px;font-size:12px;color:#8aa08a;padding-top:12px;border-top:1px solid #d8e8d8">
        Thank you for your purchase! &nbsp;·&nbsp; ${s.shopName}
      </div>
    </div>
  `;
}
