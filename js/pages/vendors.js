// ============================================================
//  PAGE: Vendors — multi-product purchase orders
// ============================================================

let poItems = []; // items in current PO

function renderVendors() {
  const vendorCards = AppData.vendors.length ? `
    <details ${AppData.vendors.length <= 4 ? 'open' : ''}>
      <summary style="cursor:pointer;font-size:13px;font-weight:600;color:var(--accent-dark);padding:8px 0;list-style:none;display:flex;align-items:center;gap:6px">
        <span>${AppData.vendors.length > 4 ? '▶' : '▼'}</span>
        ${AppData.vendors.length} vendor${AppData.vendors.length!==1?'s':''} — click to ${AppData.vendors.length > 4 ? 'expand' : 'collapse'}
      </summary>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;margin-top:10px">
        ${AppData.vendors.map(v => `
          <div class="card" style="margin-bottom:0;padding:12px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
              <div style="min-width:0">
                <div style="font-weight:600;font-size:14px">${v.name}</div>
                <div style="font-size:12px;color:var(--text3);margin-top:3px;line-height:1.7">
                  ${v.city ? `📍 ${v.city}` : ''}${v.phone ? ` &nbsp;·&nbsp; 📞 ${v.phone}` : ''}
                  ${v.brands ? `<br>Brands: <span style="color:var(--text2)">${v.brands}</span>` : ''}
                  ${v.products ? `<br>Products: <span style="color:var(--text2)">${v.products}</span>` : ''}
                  ${v.gstin ? `<br>GSTIN: ${v.gstin}` : ''}
                </div>
              </div>
              <div style="display:flex;gap:4px;flex-shrink:0">
                <button class="btn btn-xs" onclick="editVendor('${v.id}')">Edit</button>
                <button class="btn btn-xs btn-danger" onclick="deleteVendor('${v.id}')">Del</button>
              </div>
            </div>
          </div>`).join('')}
      </div>
    </details>` : '<div class="empty-state"><p>No vendors added yet.</p></div>';

  const poRows = AppData.purchases.slice().reverse().slice(0, 20).map(po => `
    <tr>
      <td style="font-size:12px;color:var(--text3)">${po.poNumber || '—'}</td>
      <td style="font-size:12px;color:var(--text3)">${fmtDate(po.date)}</td>
      <td style="font-weight:500">${po.vendor}</td>
      <td>${po.items ? po.items.length + ' item' + (po.items.length !== 1 ? 's' : '') : po.product}</td>
      <td style="font-weight:600">${fmt(po.total)}</td>
      <td><span style="font-size:11px;padding:2px 7px;border-radius:10px;${
        (po.payment||'Cash')==='Cash'?'background:#dcfce7;color:#166534':
        po.payment==='GPay'?'background:#dbeafe;color:#1d4ed8':
        po.payment==='Credit'?'background:#fef3c7;color:#92400e':
        'background:#f3e8ff;color:#7e22ce'}">${po.payment||'Cash'}</span></td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-xs" onclick="viewPurchaseBill('${po.id}')">Bill</button>
          <button class="btn btn-xs" style="color:var(--blue);border-color:#93c5fd" onclick="editPurchaseOrder('${po.id}')">Edit</button>
          <button class="btn btn-xs btn-danger" onclick="deletePurchaseOrder('${po.id}')">Del</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="6"><div class="empty-state"><p>No purchases recorded yet.</p></div></td></tr>`;

  document.getElementById('page-vendors').innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Vendors</h2>
      <button class="btn btn-primary" onclick="openVendorForm()">+ Add vendor</button>
    </div>

    <div id="vendor-form-container"></div>
    <div id="purchase-bill-section"></div>

    <div style="margin-bottom:20px">${vendorCards}</div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title">New Purchase Order</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Vendor *</label>
          <select id="po-vendor" style="padding:8px 10px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text)">
            <option value="">— select vendor —</option>
            ${AppData.vendors.map(v => `<option value="${v.id}">${v.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Vendor invoice/bill no.</label>
          <input id="po-billno" placeholder="Optional" style="padding:8px 10px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text)">
        </div>
        <div class="form-group">
          <label>Date</label>
          <input id="po-date" type="date" value="${today()}" style="padding:8px 10px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text)">
        </div>
        <div class="form-group">
          <label>Payment method</label>
          <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">
            <button type="button" id="po-pay-cash" onclick="setPOPayment('Cash')"
              class="btn btn-sm" style="background:#e8f5e8;border-color:#3a9e3a;color:#2d7a2d;font-weight:600">💵 Cash</button>
            <button type="button" id="po-pay-gpay" onclick="setPOPayment('GPay')"
              class="btn btn-sm">📱 GPay</button>
            <button type="button" id="po-pay-bank" onclick="setPOPayment('Bank Transfer')"
              class="btn btn-sm">🏦 Bank Transfer</button>
            <button type="button" id="po-pay-credit" onclick="setPOPayment('Credit')"
              class="btn btn-sm">📋 Credit</button>
          </div>
          <input type="hidden" id="po-payment" value="Cash">
        </div>
      </div>

      <div style="font-size:13px;font-weight:600;margin:14px 0 8px">Products received</div>
      <div style="display:grid;grid-template-columns:1fr 80px 100px 32px;gap:8px;margin-bottom:6px">
        <span style="font-size:11px;color:var(--text3)">Product</span>
        <span style="font-size:11px;color:var(--text3)">Qty</span>
        <span style="font-size:11px;color:var(--text3)">Cost/unit (₹)</span>
        <span></span>
      </div>
      <div id="po-rows"></div>
      <button class="btn btn-sm" onclick="addPORow()" style="margin-top:6px">+ Add product</button>

      <div id="po-total-bar" style="background:var(--bg3);border-radius:var(--radius);padding:12px;margin-top:12px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;color:var(--text2)">Total purchase value</span>
        <span style="font-size:16px;font-weight:700" id="po-total-val">₹0.00</span>
      </div>

      <div class="form-actions" style="margin-top:12px">
        <button class="btn btn-primary" onclick="savePurchaseOrder()">Confirm stock-in & generate PO bill</button>
        <button class="btn" onclick="clearPO()">Clear</button>
      </div>
    </div>

    <div class="table-wrap">
      <div style="padding:12px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border)">Purchase history</div>
      <table>
        <thead><tr><th>PO #</th><th>Date</th><th>Vendor</th><th>Items</th><th>Total</th><th>Payment</th><th></th></tr></thead>
        <tbody>${poRows}</tbody>
      </table>
    </div>
  `;

  if (!poItems.length) poItems = [{ pid: '', name: '', brand: '', qty: 1, cost: 0 }];
  renderPORows();
}

function renderPORows() {
  const html = poItems.map((it, i) => `
    <div style="display:grid;grid-template-columns:1fr 80px 100px 32px;gap:8px;align-items:center;margin-bottom:6px">
      <div style="position:relative">
        <input
          id="po-search-${i}"
          type="text"
          placeholder="Search product..."
          value="${it.name ? it.name + (it.brand ? ' ('+it.brand+')' : '') : ''}"
          oninput="poSearchProduct(${i}, this.value)"
          onfocus="poShowDropdown(${i})"
          onblur="setTimeout(() => poHideDropdown(${i}), 200)"
          autocomplete="off"
          style="padding:6px 8px;border:1px solid ${it.pid ? 'var(--accent)' : 'var(--border2)'};border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text);width:100%">
        <div id="po-dropdown-${i}" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius);max-height:200px;overflow-y:auto;z-index:200;box-shadow:0 4px 12px rgba(0,0,0,0.15)"></div>
      </div>
      <input type="number" min="1" value="${it.qty}" onchange="poSetQty(${i}, this.value)"
        style="padding:6px 8px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;text-align:center;width:100%;background:var(--bg2);color:var(--text)">
      <input type="number" step="0.01" value="${it.cost || ''}" placeholder="0.00" onchange="poSetCost(${i}, this.value)"
        style="padding:6px 8px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;width:100%;background:var(--bg2);color:var(--text)">
      <button onclick="removePORow(${i})" style="padding:4px 6px;border:1px solid #fca5a5;border-radius:var(--radius);background:transparent;color:var(--red);cursor:pointer;font-size:12px">✕</button>
    </div>
  `).join('');
  const el = document.getElementById('po-rows');
  if (el) el.innerHTML = html;
  updatePOTotal();
}

function poSearchProduct(i, query) {
  const dropdown = document.getElementById(`po-dropdown-${i}`);
  if (!dropdown) return;
  if (!query.trim()) { poHideDropdown(i); return; }

  const q = query.toLowerCase();
  const matches = AppData.products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.brand && p.brand.toLowerCase().includes(q)) ||
    (p.cat && p.cat.toLowerCase().includes(q))
  ).slice(0, 15);

  if (!matches.length) {
    dropdown.innerHTML = `<div style="padding:10px 12px;font-size:13px;color:var(--text3)">No products found</div>`;
    dropdown.style.display = 'block';
    return;
  }

  dropdown.innerHTML = matches.map(p => `
    <div
      onmousedown="poPickProduct(${i}, '${p.id}')"
      style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"
      onmouseover="this.style.background='var(--bg3)'"
      onmouseout="this.style.background=''">
      <div>
        <span style="font-weight:500">${p.name}</span>
        ${p.brand ? `<span style="color:var(--text3);font-size:11px"> (${p.brand})</span>` : ''}
        <span style="color:var(--text3);font-size:11px"> — stock: ${p.stock}</span>
      </div>
      <span style="color:var(--text3);font-size:12px">cost: ₹${p.cost||0}</span>
    </div>
  `).join('');
  dropdown.style.display = 'block';
}

function poShowDropdown(i) {
  const input = document.getElementById(`po-search-${i}`);
  if (input && input.value.trim()) poSearchProduct(i, input.value);
}

function poHideDropdown(i) {
  const dropdown = document.getElementById(`po-dropdown-${i}`);
  if (dropdown) dropdown.style.display = 'none';
  const input = document.getElementById(`po-search-${i}`);
  if (input && poItems[i] && !poItems[i].pid) input.value = '';
}

function poPickProduct(i, pid) {
  const p = AppData.products.find(x => x.id === pid);
  if (!p) return;
  poItems[i].pid = pid;
  poItems[i].name = p.name;
  poItems[i].brand = p.brand || '';
  poItems[i].cost = p.cost || 0;

  const input = document.getElementById(`po-search-${i}`);
  const dropdown = document.getElementById(`po-dropdown-${i}`);
  if (input) { input.value = p.name + (p.brand ? ' (' + p.brand + ')' : ''); input.style.borderColor = 'var(--accent)'; }
  if (dropdown) dropdown.style.display = 'none';

  // Update cost field
  const costInput = input?.closest('div')?.parentElement?.querySelector('input[type="number"]:last-of-type');
  const rowEl = document.getElementById(`po-rows`)?.children[i];
  if (rowEl) {
    const inputs = rowEl.querySelectorAll('input[type="number"]');
    if (inputs[1]) inputs[1].value = p.cost || '';
  }
  updatePOTotal();
}
function poSetQty(i, v) { poItems[i].qty = parseInt(v) || 1; updatePOTotal(); }
function poSetCost(i, v) { poItems[i].cost = parseFloat(v) || 0; updatePOTotal(); }
function setPOPayment(method) {
  document.getElementById('po-payment').value = method;
  const styles = {
    'Cash': 'background:#e8f5e8;border-color:#3a9e3a;color:#2d7a2d;font-weight:600',
    'GPay': 'background:#dbeafe;border-color:#3b82f6;color:#1d4ed8;font-weight:600',
    'Bank Transfer': 'background:#f3e8ff;border-color:#9333ea;color:#7e22ce;font-weight:600',
    'Credit': 'background:#fef3c7;border-color:#d97706;color:#92400e;font-weight:600',
  };
  const ids = { 'Cash': 'po-pay-cash', 'GPay': 'po-pay-gpay', 'Bank Transfer': 'po-pay-bank', 'Credit': 'po-pay-credit' };
  Object.keys(ids).forEach(m => {
    const btn = document.getElementById(ids[m]);
    if (btn) btn.style.cssText = m === method ? styles[m] : '';
  });
}

function addPORow() { poItems.push({ pid: '', name: '', brand: '', qty: 1, cost: 0 }); renderPORows(); }
function removePORow(i) { poItems.splice(i, 1); if (!poItems.length) addPORow(); else renderPORows(); }
function clearPO() { poItems = [{ pid: '', name: '', brand: '', qty: 1, cost: 0 }]; renderVendors(); }

function updatePOTotal() {
  const total = poItems.reduce((a, it) => a + (it.qty || 0) * (it.cost || 0), 0);
  const el = document.getElementById('po-total-val');
  if (el) el.textContent = fmt(total);
}

function savePurchaseOrder() {
  const vendorId = document.getElementById('po-vendor').value;
  const billNo = document.getElementById('po-billno').value.trim();
  const date = document.getElementById('po-date').value || today();
  const validItems = poItems.filter(it => it.pid && it.qty > 0);

  if (!vendorId) { showToast('Select a vendor'); return; }
  if (!validItems.length) { showToast('Add at least one product'); return; }

  const vendor = AppData.vendors.find(v => v.id === vendorId);
  if (!vendor) return;

  const poNumber = window._editingPONumber || nextPONumber();
  window._editingPONumber = null;
  window._editingPOId = null;
  const poItemDetails = [];
  let total = 0;

  validItems.forEach(it => {
    const product = AppData.products.find(p => p.id === it.pid);
    if (!product) return;
    product.stock += it.qty;
    if (it.cost > 0) product.cost = it.cost;
    // Save updated stock to Supabase immediately
    if (typeof saveRecord === 'function') saveRecord('products', product).catch(console.error);
    const lineTotal = it.qty * it.cost;
    total += lineTotal;
    poItemDetails.push({
      pid: it.pid, product: product.name, brand: product.brand || '',
      qty: it.qty, costPerUnit: it.cost, lineTotal,
    });
  });

  const payment = document.getElementById('po-payment')?.value || 'Cash';

  const purchase = {
    id: uid(), poNumber, date,
    vendorId, vendor: vendor.name,
    items: poItemDetails,
    total, billNo, payment,
    product: poItemDetails.map(i => i.product).join(', '),
    qty: poItemDetails.reduce((a, i) => a + i.qty, 0),
    costPerUnit: 0,
  };
  AppData.purchases.push(purchase);

  showToast(`Stock updated for ${poItemDetails.length} product(s) ✓`);
  autoSave();
  showPurchaseBill(purchase, vendor);
  poItems = [{ pid: '', qty: 1, cost: 0 }];
  renderVendors();
}

function showPurchaseBill(po, vendor) {
  const s = AppData.settings;
  const rows = (po.items || [{ product: po.product, brand: po.brand||'', qty: po.qty, costPerUnit: po.costPerUnit, lineTotal: po.total }]).map(it => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #d8e8d8">${it.product}${it.brand ? ' <span style="color:#888;font-size:11px">('+it.brand+')</span>' : ''}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #d8e8d8;text-align:center">${it.qty}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #d8e8d8;text-align:right">₹${fmtNum(it.costPerUnit)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #d8e8d8;text-align:right;font-weight:600">₹${fmtNum(it.lineTotal)}</td>
    </tr>`).join('');

  const billHtml = `
    <div style="font-family:Arial,sans-serif;font-size:13px;color:#1a2e1a;max-width:100%;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:3px solid #3a9e3a;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-size:18px;font-weight:700;color:#2d7a2d">${s.shopName}</div>
          <div style="font-size:10px;color:#4caf50;letter-spacing:1px;text-transform:uppercase;margin:2px 0 4px">Herbal, Organic &amp; Natural Products</div>
          <div style="font-size:12px;color:#555;line-height:1.6">
            ${s.address ? s.address+'<br>' : ''}${s.city||''}${s.state ? ', '+s.state : ''}
            ${s.phone ? '<br>Ph: '+s.phone : ''}${s.gstin ? '<br>GSTIN: '+s.gstin : ''}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:18px;font-weight:700;color:#1a2e1a">PURCHASE ORDER</div>
          <div style="font-size:12px;color:#555;margin-top:4px;line-height:1.7">
            PO # <strong>${po.poNumber || po.id}</strong><br>
            Date: ${fmtDate(po.date)}
            ${po.billNo ? '<br>Vendor Bill #: '+po.billNo : ''}<br>
            Payment: <strong>${po.payment || 'Cash'}</strong>
          </div>
        </div>
      </div>
      <div style="background:#f4f8f4;border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px">
        <strong>Vendor:</strong> ${vendor.name}<br>
        ${vendor.city ? vendor.city+(vendor.phone?' &nbsp;·&nbsp; ':''): ''}${vendor.phone || ''}
        ${vendor.gstin ? '<br>GSTIN: '+vendor.gstin : ''}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px">
        <thead>
          <tr style="background:#edf5ed">
            <th style="padding:8px 10px;text-align:left;font-size:12px;color:#4a5e4a;border-bottom:1px solid #d8e8d8">Product</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#4a5e4a;border-bottom:1px solid #d8e8d8">Qty</th>
            <th style="padding:8px 10px;text-align:right;font-size:12px;color:#4a5e4a;border-bottom:1px solid #d8e8d8">Cost/unit</th>
            <th style="padding:8px 10px;text-align:right;font-size:12px;color:#4a5e4a;border-bottom:1px solid #d8e8d8">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end">
        <div style="width:220px">
          <div style="display:flex;justify-content:space-between;padding:8px 0 4px;font-size:16px;font-weight:700;color:#2d7a2d;border-top:2px solid #3a9e3a;margin-top:6px"><span>Total payable</span><span>₹${fmtNum(po.total)}</span></div>
        </div>
      </div>
      <div style="text-align:center;margin-top:20px;font-size:12px;color:#8aa08a;padding-top:12px;border-top:1px solid #d8e8d8">
        Purchase record &nbsp;·&nbsp; ${s.shopName}
      </div>
    </div>
  `;

  _currentInvoiceHtml = billHtml;

  document.getElementById('purchase-bill-section').innerHTML = `
    <div style="background:#fff;border:2px solid var(--accent);border-radius:12px;padding:16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <span style="font-size:14px;font-weight:600;color:#1a2e1a">Purchase order generated — ${po.poNumber || po.id}</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" onclick="printCurrentInvoice()">🖨 Print</button>
          <button class="btn btn-sm" onclick="document.getElementById('purchase-bill-section').innerHTML=''">Close</button>
        </div>
      </div>
      <div style="background:#fff;border:1px solid #d8e8d8;border-radius:8px;padding:20px;overflow:hidden">
        ${billHtml}
      </div>
    </div>
  `;
  document.getElementById('purchase-bill-section').scrollIntoView({ behavior: 'smooth' });
}

function deletePurchaseOrder(id) {
  const po = AppData.purchases.find(p => p.id === id);
  if (!po) return;
  if (!confirmDelete(`Delete PO ${po.poNumber || po.id}? This will NOT reverse stock changes already made.`)) return;
  AppData.purchases = AppData.purchases.filter(p => p.id !== id);
  autoSave();
  showToast('Purchase order deleted');
  renderVendors();
}

function editPurchaseOrder(id) {
  const po = AppData.purchases.find(p => p.id === id);
  if (!po) return;
  if (!confirm(`Edit PO ${po.poNumber || po.id}?\n\nStock changes from the original PO will be reversed before re-saving.`)) return;

  // Reverse stock changes from original PO
  (po.items || []).forEach(it => {
    const p = AppData.products.find(x => x.id === it.pid);
    if (p) p.stock -= it.qty;
  });

  // Remove old PO
  AppData.purchases = AppData.purchases.filter(p => p.id !== id);

  // Load PO items into the form
  poItems = (po.items || []).map(it => ({ ...it }));

  renderVendors();

  // Pre-fill form fields after render
  setTimeout(() => {
    const vendorEl = document.getElementById('po-vendor');
    const billnoEl = document.getElementById('po-billno');
    const dateEl = document.getElementById('po-date');
    if (vendorEl) vendorEl.value = po.vendorId || '';
    if (billnoEl) billnoEl.value = po.billNo || '';
    if (dateEl) dateEl.value = po.date || today(); // preserve original date
    if (po.payment) setPOPayment(po.payment);
    renderPORows();

    // Store original PO info
    window._editingPOId = id;
    window._editingPONumber = po.poNumber;

    // Show amber editing banner above the PO form
    const poSection = document.getElementById('po-rows')?.closest('.card');
    if (poSection && !document.getElementById('po-edit-banner')) {
      const banner = document.createElement('div');
      banner.id = 'po-edit-banner';
      banner.style.cssText = 'background:#fef3c7;border:1px solid #d97706;border-radius:var(--radius);padding:8px 14px;margin-bottom:10px;font-size:13px;color:#92400e;display:flex;justify-content:space-between;align-items:center;gap:10px';
      banner.innerHTML = `<span>✏️ Editing <strong>${po.poNumber || po.id}</strong> — original date &amp; PO number preserved. Only fix errors.</span>
        <button class="btn btn-xs" onclick="cancelPOEdit()" style="color:#92400e;border-color:#d97706;white-space:nowrap">✕ Cancel</button>`;
      poSection.insertAdjacentElement('beforebegin', banner);
    }

    banner?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast(`Editing PO ${po.poNumber || po.id} — fix errors and confirm`);
  }, 150);
}

function cancelPOEdit() {
  window._editingPOId = null;
  window._editingPONumber = null;
  poItems = [{ pid: '', name: '', brand: '', qty: 1, cost: 0 }];
  renderVendors();
  showToast('Edit cancelled');
}

function viewPurchaseBill(id) {
  const po = AppData.purchases.find(p => p.id === id);
  if (!po) return;
  const vendor = AppData.vendors.find(v => v.id === po.vendorId) || { name: po.vendor, city: '', phone: '', gstin: '' };
  showPurchaseBill(po, vendor);
}

function openVendorForm(id) {
  const v = id ? AppData.vendors.find(x => x.id === id) : null;
  const formHtml = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">${v ? 'Edit vendor' : 'Add vendor'}</div>
      <div class="form-grid">
        <div class="form-group"><label>Vendor name *</label><input id="vf-name" value="${v?v.name:''}" placeholder="Distributor / supplier name"></div>
        <div class="form-group"><label>Phone</label><input id="vf-phone" value="${v?v.phone||'':''}" placeholder="9XXXXXXXXX" type="tel"></div>
        <div class="form-group"><label>City</label><input id="vf-city" value="${v?v.city||'':''}" placeholder="Mangaluru"></div>
        <div class="form-group"><label>GSTIN (optional)</label><input id="vf-gstin" value="${v?v.gstin||'':''}" placeholder="29XXXXX..."></div>
        <div class="form-group"><label>Brands supplied</label><input id="vf-brands" value="${v?v.brands||'':''}" placeholder="e.g. 24 Mantra, Go Earth"></div>
        <div class="form-group"><label>Products supplied</label><input id="vf-products" value="${v?v.products||'':''}" placeholder="e.g. Oils, Pulses, Jaggery"></div>
        <div class="form-group">
          <label>Preferred payment</label>
          <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">
            <button type="button" id="vf-pay-cash" onclick="setVendorPayment('Cash')"
              class="btn btn-sm" style="${(!v||v.payment==='Cash')?'background:#e8f5e8;border-color:#3a9e3a;color:#2d7a2d;font-weight:600':''}">💵 Cash</button>
            <button type="button" id="vf-pay-gpay" onclick="setVendorPayment('GPay')"
              class="btn btn-sm" style="${v&&v.payment==='GPay'?'background:#dbeafe;border-color:#3b82f6;color:#1d4ed8;font-weight:600':''}">📱 GPay</button>
            <button type="button" id="vf-pay-bank" onclick="setVendorPayment('Bank Transfer')"
              class="btn btn-sm" style="${v&&v.payment==='Bank Transfer'?'background:#f3e8ff;border-color:#9333ea;color:#7e22ce;font-weight:600':''}">🏦 Bank Transfer</button>
          </div>
          <input type="hidden" id="vf-payment" value="${v?v.payment||'Cash':'Cash'}">
        </div>
        <div class="form-group"><label>Email (optional)</label><input id="vf-email" type="email" value="${v?v.email||'':''}" placeholder="vendor@email.com"></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" onclick="saveVendor('${id||''}')">Save vendor</button>
        <button class="btn" onclick="renderVendors()">Cancel</button>
      </div>
    </div>
  `;
  const container = document.getElementById('vendor-form-container');
  if (container) { container.innerHTML = formHtml; document.getElementById('vf-name').focus(); }
}

function setVendorPayment(method) {
  document.getElementById('vf-payment').value = method;
  ['Cash','GPay','Bank Transfer'].forEach(m => {
    const btn = document.getElementById('vf-pay-' + m.toLowerCase().replace(' ',''));
    if (!btn) return;
    const styles = {
      'Cash': 'background:#e8f5e8;border-color:#3a9e3a;color:#2d7a2d;font-weight:600',
      'GPay': 'background:#dbeafe;border-color:#3b82f6;color:#1d4ed8;font-weight:600',
      'Bank Transfer': 'background:#f3e8ff;border-color:#9333ea;color:#7e22ce;font-weight:600'
    };
    btn.style.cssText = m === method ? styles[m] : '';
  });
}

function editVendor(id) { openVendorForm(id); }

function saveVendor(id) {
  const name = document.getElementById('vf-name').value.trim();
  if (!name) { showToast('Vendor name is required'); return; }
  const data = {
    name,
    phone: document.getElementById('vf-phone').value.trim(),
    city: document.getElementById('vf-city').value.trim(),
    gstin: document.getElementById('vf-gstin').value.trim(),
    email: document.getElementById('vf-email').value.trim(),
    brands: document.getElementById('vf-brands').value.trim(),
    products: document.getElementById('vf-products').value.trim(),
    payment: document.getElementById('vf-payment').value || 'Cash',
  };
  if (id) {
    const idx = AppData.vendors.findIndex(v => v.id === id);
    if (idx >= 0) AppData.vendors[idx] = { ...AppData.vendors[idx], ...data };
    showToast('Vendor updated ✓');
  } else {
    AppData.vendors.push({ id: uid(), ...data });
    showToast('Vendor added ✓');
  }
  autoSave();
  renderVendors();
}

function deleteVendor(id) {
  if (!confirmDelete('Delete this vendor?')) return;
  AppData.vendors = AppData.vendors.filter(v => v.id !== id);
  showToast('Vendor deleted');
  autoSave();
  renderVendors();
}
