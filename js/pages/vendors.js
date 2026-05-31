// ============================================================
//  PAGE: Vendors
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
        <div style="display:flex;gap:6px">
          <button class="btn btn-xs btn-danger" onclick="deleteVendor('${v.id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('') || '<div class="empty-state"><p>No vendors added yet.</p></div>';

  // Purchase history (last 10)
  const poRows = AppData.purchases.slice().reverse().slice(0, 15).map(po => `
    <tr>
      <td style="font-size:12px;color:var(--text3)">${fmtDate(po.date)}</td>
      <td style="font-weight:500">${po.product}</td>
      <td>${po.vendor}</td>
      <td style="text-align:center">${po.qty}</td>
      <td>${fmt(po.costPerUnit)}</td>
      <td style="font-weight:600">${fmt(po.total)}</td>
    </tr>
  `).join('') || `<tr><td colspan="6"><div class="empty-state"><p>No purchases recorded yet.</p></div></td></tr>`;

  document.getElementById('page-vendors').innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Vendors</h2>
      <button class="btn btn-primary" onclick="openVendorForm()">+ Add vendor</button>
    </div>

    <div id="vendor-form-container"></div>

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
            ${AppData.products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Qty received *</label><input id="po-qty" type="number" min="1" placeholder="0"></div>
        <div class="form-group"><label>Cost per unit (₹)</label><input id="po-cost" type="number" step="0.01" placeholder="0.00"></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" onclick="savePurchase()">Confirm stock-in</button>
      </div>
    </div>

    <div class="table-wrap">
      <div style="padding:12px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border)">Purchase history</div>
      <table>
        <thead><tr><th>Date</th><th>Product</th><th>Vendor</th><th>Qty</th><th>Cost/unit</th><th>Total</th></tr></thead>
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
  if (container) {
    container.innerHTML = formHtml;
    document.getElementById('vf-name').focus();
  }
}

function saveVendor() {
  const name = document.getElementById('vf-name').value.trim();
  if (!name) { showToast('Vendor name is required'); return; }
  AppData.vendors.push({
    id: uid(),
    name,
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

  if (!vendorId || !productId || !qty) { showToast('Fill in all required fields'); return; }

  const vendor = AppData.vendors.find(v => v.id === vendorId);
  const product = AppData.products.find(p => p.id === productId);
  if (!vendor || !product) return;

  product.stock += qty;
  if (costPerUnit > 0) product.cost = costPerUnit;

  AppData.purchases.push({
    id: uid(),
    date: today(),
    vendorId,
    vendor: vendor.name,
    productId,
    product: product.name,
    qty,
    costPerUnit,
    total: qty * costPerUnit,
  });

  showToast(`Stock updated: ${product.name} → ${product.stock} units ✓`);
  autoSave();
  renderVendors();
}
