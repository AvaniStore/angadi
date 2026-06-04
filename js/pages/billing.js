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
      <div class="form-grid" style="max-width:500px">
        <div class="form-group">
          <label>Overall bill discount (₹)</label>
          <input id="b-discount" type="number" step="0.01" placeholder="0.00" value="0" oninput="updateBillSummary()">
        </div>
        <div class="form-group">
          <label>Final amount collected (₹) <span style="font-size:11px;color:var(--text3)">— override total if rounding</span></label>
          <input id="b-final" type="number" step="0.01" placeholder="Leave blank to use calculated total" oninput="updateBillSummary()">
        </div>
      </div>

      <div class="bill-summary" id="bill-summary">
        <div class="bill-summary-row"><span>Subtotal</span><span id="bs-sub">₹0.00</span></div>
        <div class="bill-summary-row"><span>Item discounts</span><span id="bs-item-disc" style="color:var(--red)">-₹0.00</span></div>
        <div class="bill-summary-row"><span>Bill discount</span><span id="bs-bill-disc" style="color:var(--red)">-₹0.00</span></div>
        <div class="bill-summary-row"><span>GST</span><span id="bs-gst">₹0.00</span></div>
        <div class="bill-summary-row"><span>Calculated total</span><span id="bs-calc">₹0.00</span></div>
        <div class="bill-summary-row total"><span>Amount collected</span><span id="bs-total">₹0.00</span></div>
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
    <div style="display:grid;grid-template-columns:1fr 70px 90px 70px 80px 32px;gap:8px;align-items:center;margin-bottom:6px" id="bill-row-${i}">
      <div style="position:relative">
        <input
          id="bill-search-${i}"
          type="text"
          placeholder="Search product..."
          value="${it.name ? it.name + (it.brand ? ' ('+it.brand+')' : '') : ''}"
          oninput="billSearchProduct(${i}, this.value)"
          onfocus="billShowDropdown(${i})"
          onblur="setTimeout(() => billHideDropdown(${i}), 200)"
          autocomplete="off"
          style="padding:6px 8px;border:1px solid ${it.pid ? 'var(--accent)' : 'var(--border2)'};border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text);width:100%">
        <div id="bill-dropdown-${i}" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius);max-height:200px;overflow-y:auto;z-index:200;box-shadow:0 4px 12px rgba(0,0,0,0.15)"></div>
      </div>
      <input type="number" min="0.01" step="1" value="${it.qty}" oninput="billSetQty(${i}, this.value)" style="padding:6px 8px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text);text-align:center;width:100%">
      <input type="number" step="0.01" value="${it.price || ''}" onchange="billSetPrice(${i}, this.value)" placeholder="0.00" style="padding:6px 8px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text);width:100%">
      <input type="number" min="0" max="100" step="0.1" value="${it.discount || 0}" onchange="billSetDiscount(${i}, this.value)" placeholder="0" style="padding:6px 8px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text);text-align:center;width:100%">
      <span id="bill-amt-${i}" style="font-size:13px;font-weight:600;display:flex;align-items:center">${it.pid ? fmt(calcItemTotal(it)) : '—'}</span>
      <button onclick="removeBillRow(${i})" style="padding:4px 6px;border:1px solid #fca5a5;border-radius:var(--radius);background:transparent;color:var(--red);cursor:pointer;font-size:12px">✕</button>
    </div>
  `).join('');

  const rowsEl = document.getElementById('bill-rows');
  if (rowsEl) rowsEl.innerHTML = html;
  updateBillSummary();
}

function billSearchProduct(i, query) {
  const dropdown = document.getElementById(`bill-dropdown-${i}`);
  if (!dropdown) return;

  if (!query.trim()) {
    billHideDropdown(i);
    return;
  }

  const q = query.toLowerCase();
  const matches = AppData.products.filter(p => {
    return p.name.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.cat && p.cat.toLowerCase().includes(q));
  }).slice(0, 15); // max 15 results

  if (!matches.length) {
    dropdown.innerHTML = `<div style="padding:10px 12px;font-size:13px;color:var(--text3)">No products found</div>`;
    dropdown.style.display = 'block';
    return;
  }

  dropdown.innerHTML = matches.map(p => `
    <div
      onmousedown="billPickProduct(${i}, '${p.id}')"
      style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"
      onmouseover="this.style.background='var(--bg3)'"
      onmouseout="this.style.background=''"
    >
      <div>
        <span style="font-weight:500">${p.name}</span>
        ${p.brand ? `<span style="color:var(--text3);font-size:11px"> (${p.brand})</span>` : ''}
        ${p.stock <= 0 ? `<span style="color:var(--red);font-size:11px"> — Out of stock</span>` : ''}
      </div>
      <span style="color:var(--accent-dark);font-weight:600;font-size:13px">₹${p.sell}</span>
    </div>
  `).join('');
  dropdown.style.display = 'block';
}

function billShowDropdown(i) {
  const input = document.getElementById(`bill-search-${i}`);
  if (input && input.value.trim()) billSearchProduct(i, input.value);
}

function billHideDropdown(i) {
  const dropdown = document.getElementById(`bill-dropdown-${i}`);
  if (dropdown) dropdown.style.display = 'none';
  // If no product selected, clear the input
  const input = document.getElementById(`bill-search-${i}`);
  if (input && billItems[i] && !billItems[i].pid) input.value = '';
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

  // Re-render rows so amount column shows correctly with qty=1
  renderBillRows();

  // Restore search input text and focus after re-render
  const input = document.getElementById(`bill-search-${i}`);
  if (input && p) {
    input.value = p.name + (p.brand ? ' (' + p.brand + ')' : '');
    input.style.borderColor = 'var(--accent)';
  }
}
function billSetQty(i, v) {
  billItems[i].qty = parseFloat(v) || 1;
  const amtEl = document.getElementById(`bill-amt-${i}`);
  if (amtEl && billItems[i].pid) amtEl.textContent = fmt(calcItemTotal(billItems[i]));
  updateBillSummary();
}
function billSetPrice(i, v) {
  billItems[i].price = parseFloat(v) || 0;
  const amtEl = document.getElementById(`bill-amt-${i}`);
  if (amtEl && billItems[i].pid) amtEl.textContent = fmt(calcItemTotal(billItems[i]));
  updateBillSummary();
}
function billSetDiscount(i, v) {
  billItems[i].discount = parseFloat(v) || 0;
  const amtEl = document.getElementById(`bill-amt-${i}`);
  if (amtEl && billItems[i].pid) amtEl.textContent = fmt(calcItemTotal(billItems[i]));
  updateBillSummary();
}
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
  const calcTotal = Math.max(0, sub - itemDisc - billDisc + gstAmt);
  const finalEl = document.getElementById('b-final');
  const finalAmt = finalEl && finalEl.value ? parseFloat(finalEl.value) : null;
  const displayTotal = finalAmt !== null ? finalAmt : calcTotal;
  const roundOff = finalAmt !== null ? finalAmt - calcTotal : 0;

  set('bs-sub', fmt(sub));
  set('bs-item-disc', '-' + fmt(itemDisc));
  set('bs-bill-disc', '-' + fmt(billDisc));
  set('bs-gst', fmt(gstAmt));
  set('bs-calc', fmt(calcTotal));
  set('bs-total', fmt(displayTotal));

  // Show round off difference
  const calcRow = document.getElementById('bs-calc')?.parentElement;
  if (calcRow) calcRow.style.display = finalAmt !== null ? '' : 'none';

  // Adjust profit for round-off difference
  const adjustedProfit = profit + roundOff;
  set('bs-profit', fmt(adjustedProfit));

  // Highlight final amount field if it differs from calc
  if (finalEl) {
    finalEl.style.borderColor = finalAmt !== null && Math.abs(roundOff) > 0 ? 'var(--accent)' : 'var(--border2)';
  }
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
  const calcTotal = Math.max(0, sub - itemDisc - billDisc + gstAmt);
  const finalEl = document.getElementById('b-final');
  const finalAmt = finalEl && finalEl.value ? parseFloat(finalEl.value) : null;
  const total = finalAmt !== null ? finalAmt : calcTotal;
  const roundOff = finalAmt !== null ? finalAmt - calcTotal : 0;
  const profit = valid.reduce((acc, it) => acc + (calcItemTotal(it) - (parseFloat(it.cost) || 0) * (parseFloat(it.qty) || 0)), 0) - billDisc + roundOff;

  const customer = document.getElementById('b-customer').value.trim() || 'Walk-in';
  const phone = document.getElementById('b-phone').value.trim();
  const date = document.getElementById('b-date').value || today();
  const billNo = nextBillNumber();

  const sale = { id: billNo, date, customer, phone, items: valid, sub, itemDisc, billDisc, gst: gstAmt, calcTotal, roundOff, total, profit };
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
            Bill # ${sale.id}<br>
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
          ${sale.roundOff ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:${sale.roundOff>0?'#dc2626':'#3a9e3a'}"><span>Round off</span><span>${sale.roundOff>0?'-':'+'} ₹${fmtNum(Math.abs(sale.roundOff))}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;padding:8px 0 4px;font-size:16px;font-weight:700;color:#2d7a2d;border-top:2px solid #3a9e3a;margin-top:6px"><span>Total</span><span>₹${fmtNum(sale.total)}</span></div>
        </div>
      </div>
      <div style="text-align:center;margin-top:20px;font-size:12px;color:#8aa08a;padding-top:12px;border-top:1px solid #d8e8d8">
        Thank you for your purchase! &nbsp;·&nbsp; ${s.shopName}
      </div>
    </div>
  `;
}
