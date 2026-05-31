// ============================================================
//  PAGE: Inventory
// ============================================================

let editingProductId = null;

function renderInventory() {
  const search = (document.getElementById('inv-search') || {}).value || '';
  const filtered = AppData.products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.cat || '').toLowerCase().includes(search.toLowerCase())
  );

  const rows = filtered.map(p => {
    const margin = p.sell > 0 ? Math.round(((p.sell - p.cost) / p.sell) * 100) : 0;
    const marginColor = margin > 20 ? 'var(--accent-dark)' : margin > 10 ? 'var(--amber)' : 'var(--red)';
    return `<tr>
      <td><span style="font-weight:500">${p.name}</span>${expiryTag(p.expiry)}</td>
      <td style="color:var(--text2)">${p.cat || '—'}</td>
      <td>${fmt(p.cost)}</td>
      <td>${fmt(p.sell)}</td>
      <td style="color:var(--text3)">${p.gst}%</td>
      <td>${stockBadge(p)}</td>
      <td style="font-size:12px;color:var(--text3)">${fmtDate(p.expiry)}</td>
      <td style="font-weight:600;color:${marginColor}">${margin}%</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-xs" onclick="openProductForm('${p.id}')">Edit</button>
          <button class="btn btn-xs btn-danger" onclick="deleteProduct('${p.id}')">Del</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('page-inventory').innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Inventory</h2>
      <button class="btn btn-primary" onclick="openProductForm(null)">+ Add product</button>
    </div>

    <div id="product-form-container"></div>

    <div style="display:flex;gap:10px;margin-bottom:12px">
      <input id="inv-search" type="text" placeholder="Search products..." style="flex:1;padding:8px 12px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text)" oninput="renderInventory()" value="${search}">
    </div>

    <div class="table-wrap">
      <table>
        <thead><tr><th>Product</th><th>Category</th><th>Cost</th><th>Selling</th><th>GST</th><th>Stock</th><th>Expiry</th><th>Margin</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="9"><div class="empty-state"><p>No products yet. Add your first product above.</p></div></td></tr>`}</tbody>
      </table>
    </div>
  `;

  if (editingProductId !== undefined && document.getElementById('product-form-container')) {
    // Re-render form if it was open
  }
}

function openProductForm(id) {
  editingProductId = id;
  const p = id ? AppData.products.find(x => x.id === id) : null;

  const formHtml = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">${p ? 'Edit product' : 'Add new product'}</div>
      <div class="form-grid">
        <div class="form-group"><label>Product name *</label><input id="pf-name" value="${p ? p.name : ''}" placeholder="e.g. Tata Salt 1kg"></div>
        <div class="form-group"><label>Category</label><input id="pf-cat" value="${p ? p.cat || '' : ''}" placeholder="e.g. Grocery"></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Cost price (₹) *</label><input id="pf-cost" type="number" step="0.01" value="${p ? p.cost : ''}" placeholder="0.00"></div>
        <div class="form-group"><label>Selling price (₹) *</label><input id="pf-sell" type="number" step="0.01" value="${p ? p.sell : ''}" placeholder="0.00"></div>
        <div class="form-group"><label>GST %</label>
          <select id="pf-gst">
            ${[0,5,12,18,28].map(g => `<option value="${g}" ${p && p.gst == g ? 'selected' : g === 12 && !p ? 'selected' : ''}>${g}%</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Current stock (units)</label><input id="pf-stock" type="number" value="${p ? p.stock : ''}" placeholder="0"></div>
        <div class="form-group"><label>Low stock alert at</label><input id="pf-low" type="number" value="${p ? p.lowAt : CONFIG.DEFAULT_LOW_STOCK}" placeholder="${CONFIG.DEFAULT_LOW_STOCK}"></div>
        <div class="form-group"><label>Expiry date</label><input id="pf-expiry" type="date" value="${p ? p.expiry || '' : ''}"></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" onclick="saveProduct()">Save product</button>
        <button class="btn" onclick="renderInventory()">Cancel</button>
        ${p ? `<button class="btn btn-danger" onclick="deleteProduct('${p.id}')">Delete</button>` : ''}
      </div>
    </div>
  `;

  document.getElementById('page-inventory').innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Inventory</h2>
      <button class="btn btn-primary" onclick="openProductForm(null)">+ Add product</button>
    </div>
    ${formHtml}
    <div id="product-form-container"></div>
  `;
  document.getElementById('pf-name').focus();
}

function saveProduct() {
  const name = document.getElementById('pf-name').value.trim();
  if (!name) { showToast('Product name is required'); return; }
  const cost = parseFloat(document.getElementById('pf-cost').value) || 0;
  const sell = parseFloat(document.getElementById('pf-sell').value) || 0;
  if (sell < cost) {
    if (!confirm('Selling price is less than cost price. Continue?')) return;
  }
  const product = {
    id: editingProductId || uid(),
    name,
    cat: document.getElementById('pf-cat').value.trim(),
    cost,
    sell,
    gst: parseInt(document.getElementById('pf-gst').value) || 0,
    stock: parseInt(document.getElementById('pf-stock').value) || 0,
    lowAt: parseInt(document.getElementById('pf-low').value) || CONFIG.DEFAULT_LOW_STOCK,
    expiry: document.getElementById('pf-expiry').value || '',
  };

  if (editingProductId) {
    const idx = AppData.products.findIndex(x => x.id === editingProductId);
    AppData.products[idx] = product;
    showToast('Product updated ✓');
  } else {
    AppData.products.push(product);
    showToast('Product added ✓');
  }
  editingProductId = null;
  autoSave();
  renderInventory();
}

function deleteProduct(id) {
  if (!confirmDelete('Delete this product? This cannot be undone.')) return;
  AppData.products = AppData.products.filter(p => p.id !== id);
  showToast('Product deleted');
  autoSave();
  renderInventory();
}
