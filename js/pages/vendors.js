// ============================================================
//  PAGE: Vendors — multi-product purchase orders
// ============================================================

let poItems = []; // items in current PO

function renderVendors() {
  const vendorCards = AppData.vendors.map(v => `
    <div class="card" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-weight:600;font-size:14px">${v.name}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:4px;line-height:1.8">
            📍 ${v.city || '—'} &nbsp;·&nbsp; 📞 ${v.phone || '—'}
            ${v.gstin ? `<br>GSTIN: ${v.gstin}` : ''}
          </div>
        </div>
        <button class="btn btn-xs btn-danger" onclick="deleteVendor('${v.id}')">Delete</button>
      </div>
    </div>
  `).join('') || '<div class="empty-state"><p>No vendors added yet.</p></div>';

  const poRows = AppData.purchases.slice().reverse().slice(0, 20).map(po => `
    <tr>
      <td style="font-size:12px;color:var(--text3)">${po.poNumber || '—'}</td>
      <td style="font-size:12px;color:var(--text3)">${fmtDate(po.date)}</td>
      <td style="font-weight:500">${po.vendor}</td>
      <td>${po.items ? po.items.length + ' item' + (po.items.length !== 1 ? 's' : '') : po.product}</td>
      <td style="font-weight:600">${fmt(po.total)}</td>
      <td><button class="btn btn-xs" onclick="viewPurchaseBill('${po.id}')">Bill</button></td>
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
        <thead><tr><th>PO #</th><th>Date</th><th>Vendor</th><th>Items</th><th>Total</th><th></th></tr></thead>
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

  const poNumber = nextPONumber();
  const poItemDetails = [];
  let total = 0;

  validItems.forEach(it => {
    const product = AppData.products.find(p => p.id === it.pid);
    if (!product) return;
    product.stock += it.qty;
    if (it.cost > 0) product.cost = it.cost;
    const lineTotal = it.qty * it.cost;
    total += lineTotal;
    poItemDetails.push({
      pid: it.pid, product: product.name, brand: product.brand || '',
      qty: it.qty, costPerUnit: it.cost, lineTotal,
    });
  });

  const purchase = {
    id: uid(), poNumber, date,
    vendorId, vendor: vendor.name,
    items: poItemDetails,
    total, billNo,
    // Legacy fields for backward compat
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
            ${po.billNo ? '<br>Vendor Bill #: '+po.billNo : ''}
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

function viewPurchaseBill(id) {
  const po = AppData.purchases.find(p => p.id === id);
  if (!po) return;
  const vendor = AppData.vendors.find(v => v.id === po.vendorId) || { name: po.vendor, city: '', phone: '', gstin: '' };
  showPurchaseBill(po, vendor);
}

function openVendorForm() {
  const formHtml = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">Add vendor</div>
      <div class="form-grid">
        <div class="form-group"><label>Vendor name *</label><input id="vf-name" placeholder="Distributor / supplier name"></div>
        <div class="form-group"><label>Phone</label><input id="vf-phone" placeholder="9XXXXXXXXX" type="tel"></div>
        <div class="form-group"><label>City</label><input id="vf-city" placeholder="Mangaluru"></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>GSTIN (optional)</label><input id="vf-gstin" placeholder="29XXXXX..."></div>
        <div class="form-group"><label>Email (optional)</label><input id="vf-email" type="email" placeholder="vendor@email.com"></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" onclick="saveVendor()">Save vendor</button>
        <button class="btn" onclick="renderVendors()">Cancel</button>
      </div>
    </div>
  `;
  const container = document.getElementById('vendor-form-container');
  if (container) { container.innerHTML = formHtml; document.getElementById('vf-name').focus(); }
}

function saveVendor() {
  const name = document.getElementById('vf-name').value.trim();
  if (!name) { showToast('Vendor name is required'); return; }
  AppData.vendors.push({
    id: uid(), name,
    phone: document.getElementById('vf-phone').value.trim(),
    city: document.getElementById('vf-city').value.trim(),
    gstin: document.getElementById('vf-gstin').value.trim(),
    email: document.getElementById('vf-email').value.trim(),
  });
  showToast('Vendor added ✓');
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
