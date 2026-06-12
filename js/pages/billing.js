// ============================================================
//  PAGE: Billing — with discount support
// ============================================================

let billItems = [];
let currentPayment = 'Cash';
let editingBillId = null; // set when editing an existing bill

function setPayment(method) {
  currentPayment = method;
  ['Cash','GPay','Other'].forEach(m => {
    const btn = document.getElementById('pay-' + m.toLowerCase());
    if (!btn) return;
    if (m === method) {
      btn.style.background = '#e8f5e8';
      btn.style.borderColor = '#3a9e3a';
      btn.style.color = '#2d7a2d';
      btn.style.fontWeight = '600';
    } else {
      btn.style.background = '';
      btn.style.borderColor = '';
      btn.style.color = '';
      btn.style.fontWeight = '';
    }
  });
}

function showCustomerSuggestions(query) {
  const dropdown = document.getElementById('customer-suggestions');
  if (!dropdown) return;
  if (!query || query.length < 2) { dropdown.style.display = 'none'; return; }
  const q = query.toLowerCase();
  const matches = (AppData.customers || [])
    .filter(c => c.name.toLowerCase().includes(q))
    .slice(0, 8);
  if (!matches.length) { dropdown.style.display = 'none'; return; }
  dropdown.innerHTML = matches.map(c => `
    <div onmousedown="pickCustomer('${c.name.replace(/'/g,"\\'")}','${(c.phone||'').replace(/'/g,"\\'")}');"
      style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border)"
      onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">
      <div style="font-weight:500">${c.name}</div>
      ${c.phone ? `<div style="font-size:11px;color:var(--text3)">${c.phone}</div>` : ''}
    </div>`).join('');
  dropdown.style.display = 'block';
}

function hideCustomerSuggestions() {
  const d = document.getElementById('customer-suggestions');
  if (d) d.style.display = 'none';
}

function pickCustomer(name, phone) {
  const custEl = document.getElementById('b-customer');
  const phoneEl = document.getElementById('b-phone');
  if (custEl) custEl.value = name;
  if (phoneEl && phone) phoneEl.value = phone;
  hideCustomerSuggestions();
}

function saveCustomerFromBill(name, phone) {
  if (!name || name === 'Walk-in') return;
  if (!AppData.customers) AppData.customers = [];
  const existing = AppData.customers.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    if (phone) existing.phone = phone; // update phone if provided
    existing.lastBill = today();
    existing.billCount = (existing.billCount || 0) + 1;
  } else {
    AppData.customers.push({ id: uid(), name, phone: phone || '', lastBill: today(), billCount: 1 });
    AppData.customers.sort((a,b) => a.name.localeCompare(b.name));
  }
}

function renderBilling() {
  // If no items or empty, start fresh
  if (!billItems || billItems.length === 0) {
    billItems = [{ pid: '', qty: 1, price: 0, gst: 0, cost: 0, name: '', discount: 0 }];
  }
  currentPayment = currentPayment || 'Cash';

  document.getElementById('page-billing').innerHTML = `
    <div class="page-header">
      <h2 class="page-title">New Bill</h2>
    </div>
    <div class="card">
      ${editingBillId ? `<div style="background:#fef3c7;border:1px solid #d97706;border-radius:var(--radius);padding:8px 14px;margin-bottom:12px;font-size:13px;color:#92400e">
        ✏️ Editing bill <strong>${editingBillId}</strong> — Cost (₹) column is now visible. Update costs to fix profit figures.
      </div>` : ''}
      <div class="form-grid">
        <div class="form-group">
          <label>Customer name</label>
          <div style="position:relative">
            <input id="b-customer" placeholder="Walk-in customer" autocomplete="off"
              oninput="showCustomerSuggestions(this.value)"
              onblur="setTimeout(()=>hideCustomerSuggestions(),200)">
            <div id="customer-suggestions" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius);z-index:200;box-shadow:0 4px 12px rgba(0,0,0,0.1);max-height:160px;overflow-y:auto"></div>
          </div>
        </div>
        <div class="form-group"><label>Phone (optional)</label><input id="b-phone" placeholder="9XXXXXXXXX" type="tel"></div>
        <div class="form-group"><label>Bill date</label><input id="b-date" type="date" value="${today()}"></div>
        <div class="form-group"><label>Bill suffix <span style="font-size:11px;color:var(--text3)">— optional</span></label><input id="b-suffix" placeholder="e.g. A" maxlength="5" style="text-transform:uppercase"></div>
        <div class="form-group">
          <label>Payment method</label>
          <div style="display:flex;gap:8px;margin-top:4px">
            <button type="button" id="pay-cash" onclick="setPayment('Cash')"
              class="btn btn-sm" style="flex:1;background:#e8f5e8;border-color:#3a9e3a;color:#2d7a2d;font-weight:600">💵 Cash</button>
            <button type="button" id="pay-gpay" onclick="setPayment('GPay')"
              class="btn btn-sm" style="flex:1">📱 GPay</button>
            <button type="button" id="pay-other" onclick="setPayment('Other')"
              class="btn btn-sm" style="flex:1">Other</button>
          </div>
        </div>
      </div>
      <div class="divider"></div>
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">Items</div>
      <div style="display:grid;grid-template-columns:1fr 70px 90px 70px ${editingBillId ? '80px' : ''} 80px 32px;gap:8px;margin-bottom:6px">
        <span style="font-size:11px;color:var(--text3)">Product</span>
        <span style="font-size:11px;color:var(--text3)">Qty</span>
        <span style="font-size:11px;color:var(--text3)">Price (₹)</span>
        <span style="font-size:11px;color:var(--text3)">Disc%</span>
        ${editingBillId ? '<span style="font-size:11px;color:var(--amber)">Cost (₹)</span>' : ''}
        <span style="font-size:11px;color:var(--text3)">Amount</span>
        <span></span>
      </div>
      <div id="bill-rows"></div>
      <button class="btn btn-sm" onclick="addBillRow()" style="margin-top:6px">+ Add item</button>

      <div class="divider"></div>
      <div class="form-grid" style="max-width:600px">
        <div class="form-group">
          <label>Overall bill discount (₹)</label>
          <input id="b-discount" type="number" step="1" min="0" placeholder="0" value="0" oninput="updateBillSummary()">
        </div>
        <div class="form-group">
          <label>Delivery charges (₹)</label>
          <input id="b-delivery" type="number" step="1" min="0" placeholder="0" value="0" oninput="updateBillSummary()">
        </div>
        <div class="form-group">
          <label>Final amount collected (₹) <span style="font-size:11px;color:var(--text3)">— override if rounding</span></label>
          <input id="b-final" type="number" step="1" min="0" placeholder="Leave blank to use calculated total" oninput="updateBillSummary()">
        </div>
      </div>

      <div class="bill-summary" id="bill-summary">
        <div class="bill-summary-row"><span>Subtotal</span><span id="bs-sub">₹0.00</span></div>
        <div class="bill-summary-row"><span>Item discounts</span><span id="bs-item-disc" style="color:var(--red)">-₹0.00</span></div>
        <div class="bill-summary-row"><span>Bill discount</span><span id="bs-bill-disc" style="color:var(--red)">-₹0.00</span></div>
        <div class="bill-summary-row"><span>Delivery charges</span><span id="bs-delivery" style="color:var(--blue)">₹0.00</span></div>
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
  const showCost = !!editingBillId;
  const gridCols = showCost ? '1fr 70px 90px 70px 80px 80px 32px' : '1fr 70px 90px 70px 80px 32px';
  const html = billItems.map((it, i) => `
    <div style="display:grid;grid-template-columns:${gridCols};gap:8px;align-items:center;margin-bottom:6px" id="bill-row-${i}">
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
      <input type="number" value="${it.qty}"
        step="${it.pid && (AppData.products.find(p=>p.id===it.pid)?.cat === 'Vegetables' || AppData.products.find(p=>p.id===it.pid)?.cat === 'Fruits') ? '0.1' : '1'}"
        min="${it.pid && (AppData.products.find(p=>p.id===it.pid)?.cat === 'Vegetables' || AppData.products.find(p=>p.id===it.pid)?.cat === 'Fruits') ? '0.1' : '1'}"
        oninput="billSetQty(${i}, this.value)"
        style="padding:6px 8px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text);text-align:center;width:100%">
      <input type="number" step="1" min="0" value="${it.price || ''}" oninput="billSetPrice(${i}, this.value)" placeholder="0" style="padding:6px 8px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text);width:100%">
      <input type="number" min="0" max="100" step="1" value="${it.discount || 0}" oninput="billSetDiscount(${i}, this.value)" placeholder="0" style="padding:6px 8px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text);text-align:center;width:100%">
      ${showCost ? `<input type="number" step="1" min="0" value="${it.cost || 0}" oninput="billSetCost(${i}, this.value)"
        title="Cost price for profit calculation"
        style="padding:6px 8px;border:1px solid #fcd34d;border-radius:var(--radius);font-size:13px;background:#fffbeb;color:var(--text);width:100%">` : ''}
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

  // Re-render rows to update qty step (0.1 for veg/fruits, 1 for others)
  renderBillRows();
  // Restore search input after re-render
  const inputAfter = document.getElementById(`bill-search-${i}`);
  if (inputAfter && p) { inputAfter.value = p.name + (p.brand ? ' (' + p.brand + ')' : ''); inputAfter.style.borderColor = 'var(--accent)'; }
}
function billSetCost(i, v) {
  billItems[i].cost = parseFloat(v) || 0;
  updateBillSummary();
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
  const delivery = parseFloat(document.getElementById('b-delivery')?.value) || 0;
  const calcTotal = Math.max(0, sub - itemDisc - billDisc + gstAmt + delivery);
  const profit = valid.reduce((acc, it) => acc + (calcItemTotal(it) - (parseFloat(it.cost) || 0) * (parseFloat(it.qty) || 0)), 0) - billDisc;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const finalEl = document.getElementById('b-final');
  const finalAmt = finalEl && finalEl.value ? parseFloat(finalEl.value) : null;
  const displayTotal = finalAmt !== null ? finalAmt : calcTotal;
  const roundOff = finalAmt !== null ? finalAmt - calcTotal : 0;

  set('bs-sub', fmt(sub));
  set('bs-item-disc', '-' + fmt(itemDisc));
  set('bs-bill-disc', '-' + fmt(billDisc));
  set('bs-delivery', fmt(delivery));
  set('bs-gst', fmt(gstAmt));
  set('bs-calc', fmt(calcTotal));
  set('bs-total', fmt(displayTotal));

  // Show/hide delivery row
  const deliveryRow = document.getElementById('bs-delivery')?.parentElement;
  if (deliveryRow) deliveryRow.style.display = delivery > 0 ? '' : 'none';

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
  currentPayment = 'Cash';
  editingBillId = null;
  renderBilling();
  // Clear invoice section after render
  const inv = document.getElementById('invoice-section');
  if (inv) inv.innerHTML = '';
}

function saveBill() {
  const valid = billItems.filter(it => it.pid && it.qty > 0);
  if (!valid.length) { showToast('Add at least one product'); return; }

  const stockWarnings = [];
  const zeroCostItems = [];
  valid.forEach(it => {
    const p = AppData.products.find(x => x.id === it.pid);
    if (p) {
      if (p.stock < it.qty) stockWarnings.push(`${p.name} (stock: ${p.stock}, billing: ${it.qty})`);
      it.cost = p.cost || 0;
      if (!p.cost || p.cost === 0) zeroCostItems.push(p.name);
    }
  });

  // Warn for out of stock but allow to proceed
  if (stockWarnings.length) {
    if (!confirm(`⚠ Some items have insufficient stock:\n${stockWarnings.join('\n')}\n\nContinue anyway?`)) return;
  }
  if (zeroCostItems.length) {
    if (!confirm(`Cost price is ₹0 for: ${zeroCostItems.join(', ')}.\nProfit will show as ₹0 for these items.\n\nContinue?`)) return;
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
  const delivery = parseFloat(document.getElementById('b-delivery')?.value) || 0;
  const calcTotal = Math.max(0, sub - itemDisc - billDisc + gstAmt + delivery);
  const finalEl = document.getElementById('b-final');
  const finalAmt = finalEl && finalEl.value ? parseFloat(finalEl.value) : null;
  const total = finalAmt !== null ? finalAmt : calcTotal;
  const roundOff = finalAmt !== null ? finalAmt - calcTotal : 0;
  const profit = valid.reduce((acc, it) => acc + (calcItemTotal(it) - (parseFloat(it.cost) || 0) * (parseFloat(it.qty) || 0)), 0) - billDisc + roundOff;

  const customer = document.getElementById('b-customer').value.trim() || 'Walk-in';
  const phone = document.getElementById('b-phone').value.trim();
  const date = document.getElementById('b-date').value || today();
  const suffix = (document.getElementById('b-suffix')?.value || '').trim();
  const billNo = editingBillId || nextBillNumber(suffix); // keep original ID if editing
  editingBillId = null; // reset after use
  saveCustomerFromBill(customer, phone);

  const sale = { id: billNo, date, customer, phone, payment: currentPayment, items: valid, sub, itemDisc, billDisc, delivery, gst: gstAmt, calcTotal, roundOff, total, profit };
  AppData.sales.push(sale);

  valid.forEach(it => {
    const p = AppData.products.find(x => x.id === it.pid);
    if (p) p.stock -= it.qty;
  });

  autoSave('sales', sale);
  if (typeof saveSettings === 'function') saveSettings().catch(console.error);
  showToast('Bill saved ✓');

  // Reset everything FIRST
  currentPayment = 'Cash';
  editingBillId = null;
  billItems = [{ pid: '', qty: 1, price: 0, gst: 0, cost: 0, name: '', discount: 0 }];
  window._justSavedBill = Date.now();

  // Re-render the billing form fresh (clears all inputs)
  renderBilling();

  // Then show invoice below the fresh form
  showInvoice(sale);
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
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
        <span style="font-size:14px;font-weight:600;color:#1a2e1a">✓ Bill saved — Invoice preview</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" onclick="clearBill()" style="font-size:14px">+ New bill</button>
          <button class="btn btn-sm" onclick="printCurrentInvoice()">🖨 Print</button>
        </div>
      </div>
      <div style="background:#fff;border:1px solid #d8e8d8;border-radius:8px;padding:20px;overflow:hidden">
        ${_currentInvoiceHtml}
      </div>
    </div>
  `;
  // Scroll to invoice so user can see it
  document.getElementById('invoice-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            Customer: <strong>${sale.customer}</strong>${sale.phone ? '<br>Ph: ' + sale.phone : ''}<br>
            Payment: <strong>${sale.payment || 'Cash'}</strong>
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
          ${(sale.delivery||0)>0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#2563eb"><span>Delivery charges</span><span>+₹${fmtNum(sale.delivery)}</span></div>` : ''}
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
