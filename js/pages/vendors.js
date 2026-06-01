// ============================================================
//  PAGE: Vendors — with purchase bill generation
// ============================================================

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

  const poRows = AppData.purchases.slice().reverse().slice(0, 15).map(po => `
    <tr>
      <td style="font-size:12px;color:var(--text3)">${fmtDate(po.date)}</td>
      <td style="font-weight:500">${po.product}</td>
      <td>${po.vendor}</td>
      <td style="text-align:center">${po.qty}</td>
      <td>${fmt(po.costPerUnit)}</td>
      <td style="font-weight:600">${fmt(po.total)}</td>
      <td><button class="btn btn-xs" onclick="viewPurchaseBill('${po.id}')">Bill</button></td>
    </tr>
  `).join('') || `<tr><td colspan="7"><div class="empty-state"><p>No purchases recorded yet.</p></div></td></tr>`;

  document.getElementById('page-vendors').innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Vendors</h2>
      <button class="btn btn-primary" onclick="openVendorForm()">+ Add vendor</button>
    </div>

    <div id="vendor-form-container"></div>
    <div id="purchase-bill-preview"></div>

    <div style="margin-bottom:20px">${vendorCards}</div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title">Stock-in / Purchase order</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Vendor *</label>
          <select id="po-vendor">
            <option value="">— select vendor —</option>
            ${AppData.vendors.map(v => `<option value="${v.id}">${v.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Product *</label>
          <select id="po-product" onchange="poFillCost()">
            <option value="">— select product —</option>
            ${AppData.products.map(p => `<option value="${p.id}">${p.name}${p.brand ? ' ('+p.brand+')' : ''}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Qty received *</label><input id="po-qty" type="number" min="1" placeholder="0"></div>
        <div class="form-group"><label>Cost per unit (₹)</label><input id="po-cost" type="number" step="0.01" placeholder="0.00"></div>
        <div class="form-group"><label>Invoice / Bill no.</label><input id="po-billno" placeholder="Optional"></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" onclick="savePurchase()">Confirm stock-in & generate bill</button>
      </div>
    </div>

    <div id="purchase-bill-section"></div>

    <div class="table-wrap">
      <div style="padding:12px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border)">Purchase history</div>
      <table>
        <thead><tr><th>Date</th><th>Product</th><th>Vendor</th><th>Qty</th><th>Cost/unit</th><th>Total</th><th></th></tr></thead>
        <tbody>${poRows}</tbody>
      </table>
    </div>
  `;
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

function poFillCost() {
  const pid = document.getElementById('po-product').value;
  const p = AppData.products.find(x => x.id === pid);
  if (p) document.getElementById('po-cost').value = p.cost;
}

function savePurchase() {
  const vendorId = document.getElementById('po-vendor').value;
  const productId = document.getElementById('po-product').value;
  const qty = parseInt(document.getElementById('po-qty').value) || 0;
  const costPerUnit = parseFloat(document.getElementById('po-cost').value) || 0;
  const billNo = document.getElementById('po-billno').value.trim();

  if (!vendorId || !productId || !qty) { showToast('Fill in all required fields'); return; }

  const vendor = AppData.vendors.find(v => v.id === vendorId);
  const product = AppData.products.find(p => p.id === productId);
  if (!vendor || !product) return;

  product.stock += qty;
  if (costPerUnit > 0) product.cost = costPerUnit;

  const purchase = {
    id: uid(), date: today(),
    vendorId, vendor: vendor.name,
    productId, product: product.name,
    brand: product.brand || '',
    qty, costPerUnit,
    total: qty * costPerUnit,
    billNo,
  };
  AppData.purchases.push(purchase);

  showToast(`Stock updated: ${product.name} → ${product.stock} units ✓`);
  autoSave();
  showPurchaseBill(purchase, vendor, product);
  renderVendors();
}

function showPurchaseBill(po, vendor, product) {
  const s = AppData.settings;
  const billHtml = `
    <div class="inv-head">
      <div>
        <div class="shop-name">${s.shopName}</div>
        <div style="font-size:12px;color:#555;margin-top:4px;line-height:1.6">
          ${s.address ? s.address + '<br>' : ''}${s.city || ''}${s.state ? ', '+s.state : ''}
          ${s.phone ? '<br>Ph: '+s.phone : ''}
          ${s.gstin ? '<br>GSTIN: '+s.gstin : ''}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:700">PURCHASE ORDER</div>
        <div style="font-size:12px;color:#555;margin-top:4px">
          PO # ${po.id.toUpperCase().slice(0,10)}<br>
          Date: ${fmtDate(po.date)}
          ${po.billNo ? '<br>Vendor Bill #: '+po.billNo : ''}
        </div>
      </div>
    </div>
    <div style="margin:16px 0;padding:12px;background:#f9fafb;border-radius:8px;font-size:13px">
      <strong>Vendor:</strong> ${vendor.name}<br>
      ${vendor.city ? vendor.city + ' &nbsp;·&nbsp; ' : ''}${vendor.phone || ''}<br>
      ${vendor.gstin ? 'GSTIN: '+vendor.gstin : ''}
    </div>
    <table>
      <thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Cost/unit</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>
        <tr>
          <td>${po.product}${po.brand ? ' <span style="color:#888;font-size:11px">('+po.brand+')</span>' : ''}</td>
          <td style="text-align:center">${po.qty}</td>
          <td style="text-align:right">₹${fmtNum(po.costPerUnit)}</td>
          <td style="text-align:right;font-weight:700">₹${fmtNum(po.total)}</td>
        </tr>
      </tbody>
    </table>
    <div class="totals" style="margin-left:auto;width:200px;margin-top:12px">
      <div class="totals-row final"><span>Total payable</span><span>₹${fmtNum(po.total)}</span></div>
    </div>
    <div class="footer">Purchase record &nbsp;·&nbsp; ${s.shopName}</div>
  `;

  document.getElementById('purchase-bill-section').innerHTML = `
    <div class="card" style="margin-bottom:16px;border:2px solid var(--accent)">
      <div class="card-head">
        <span class="card-title">Purchase bill generated</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" onclick="printInvoice(\`${billHtml.replace(/`/g,'\\`').replace(/\$/g,'\\$')}\`)">🖨 Print</button>
          <button class="btn btn-sm" onclick="document.getElementById('purchase-bill-section').innerHTML=''">Close</button>
        </div>
      </div>
      <div class="invoice-preview">${billHtml}</div>
    </div>
  `;
  document.getElementById('purchase-bill-section').scrollIntoView({ behavior: 'smooth' });
}

function viewPurchaseBill(id) {
  const po = AppData.purchases.find(p => p.id === id);
  if (!po) return;
  const vendor = AppData.vendors.find(v => v.id === po.vendorId) || { name: po.vendor, city: '', phone: '', gstin: '' };
  const product = AppData.products.find(p => p.id === po.productId) || { name: po.product, brand: po.brand || '' };
  showPurchaseBill(po, vendor, product);
}
