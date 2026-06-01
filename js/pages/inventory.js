// ============================================================
//  PAGE: Inventory
// ============================================================

let editingProductId = null;

const CATEGORIES = ['Grocery', 'Home Care', 'Cosmetics', 'Snacks', 'Vegetables', 'Other'];
const WEIGHTS = ['100g', '200g', '250g', '500g', '1kg', '200ml', '250ml', '500ml', '1000ml', 'pieces', 'Other'];

function renderInventory() {
  const search = (document.getElementById('inv-search') || {}).value || '';
  const catFilter = (document.getElementById('inv-cat-filter') || {}).value || '';
  const filtered = AppData.products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.cat || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || p.cat === catFilter;
    return matchSearch && matchCat;
  });

  const rows = filtered.map(p => {
    const margin = p.sell > 0 ? Math.round(((p.sell - p.cost) / p.sell) * 100) : 0;
    const marginColor = margin > 20 ? 'var(--accent-dark)' : margin > 10 ? 'var(--amber)' : 'var(--red)';
    const weightLabel = p.weightOther ? p.weightOther : (p.weight || '—');
    const isVeg = p.cat === 'Vegetables';
    return `<tr>
      <td>
        <span style="font-weight:500">${p.name}</span>${expiryTag(p.expiry)}
        ${isVeg ? '<span style="font-size:10px;background:#d1fae5;color:#065f46;padding:1px 6px;border-radius:10px;margin-left:4px">Veg</span>' : ''}
        ${p.brand ? `<div style="font-size:11px;color:var(--text3);margin-top:1px">${p.brand}</div>` : ''}
      </td>
      <td style="color:var(--text2)">${p.cat || '—'}</td>
      <td style="font-size:12px;color:var(--text3)">${weightLabel}</td>
      <td>${fmt(p.cost)}</td>
      <td>${p.mrp ? fmt(p.mrp) : '—'}</td>
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
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="openProductForm(null)">+ Add product</button>
        <button class="btn" onclick="openVegPriceUpdate()" title="Update vegetable prices">🥦 Update veg prices</button>
      </div>
    </div>

    <div id="product-form-container"></div>

    <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      <input id="inv-search" type="text" placeholder="Search by name, brand..." style="flex:1;min-width:180px;padding:8px 12px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text)" oninput="renderInventory()" value="${search}">
      <select id="inv-cat-filter" onchange="renderInventory()" style="padding:8px 12px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text)">
        <option value="">All categories</option>
        ${CATEGORIES.map(c => `<option value="${c}" ${c === catFilter ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
    </div>

    <div class="table-wrap">
      <table>
        <thead><tr><th>Product</th><th>Category</th><th>Weight/Vol</th><th>Cost</th><th>MRP</th><th>Selling</th><th>GST</th><th>Stock</th><th>Expiry</th><th>Margin</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="11"><div class="empty-state"><p>No products yet. Add your first product above.</p></div></td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function openProductForm(id) {
  editingProductId = id;
  const p = id ? AppData.products.find(x => x.id === id) : null;
  const isVeg = p && p.cat === 'Vegetables';

  const formHtml = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">${p ? 'Edit product' : 'Add new product'}</div>
      <div class="form-grid">
        <div class="form-group"><label>Product name *</label><input id="pf-name" value="${p ? p.name : ''}" placeholder="e.g. Tata Salt"></div>
        <div class="form-group"><label>Brand</label><input id="pf-brand" value="${p ? p.brand || '' : ''}" placeholder="e.g. Tata, Hindustan Unilever"></div>
        <div class="form-group">
          <label>Category</label>
          <select id="pf-cat" onchange="toggleVegNote()">
            ${CATEGORIES.map(c => `<option value="${c}" ${p && p.cat === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Weight / Volume / Unit</label>
          <select id="pf-weight" onchange="toggleWeightOther()">
            ${WEIGHTS.map(w => `<option value="${w}" ${p && (p.weight === w || (!p.weight && w === 'pieces')) ? 'selected' : ''}>${w}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" id="pf-weight-other-group" style="${p && p.weightOther ? '' : 'display:none'}">
          <label>Custom weight/unit</label>
          <input id="pf-weight-other" value="${p ? p.weightOther || '' : ''}" placeholder="e.g. 750g, 2L">
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Cost price (₹) *</label><input id="pf-cost" type="number" step="0.01" value="${p ? p.cost : ''}" placeholder="0.00"></div>
        <div class="form-group"><label>MRP (₹)</label><input id="pf-mrp" type="number" step="0.01" value="${p ? p.mrp || '' : ''}" placeholder="0.00"></div>
        <div class="form-group"><label>Selling price (₹) *</label><input id="pf-sell" type="number" step="0.01" value="${p ? p.sell : ''}" placeholder="0.00"></div>
        <div class="form-group"><label>GST %</label>
          <select id="pf-gst">
            ${[0,5,12,18,28].map(g => `<option value="${g}" ${p ? p.gst == g ? 'selected' : '' : g === 0 ? 'selected' : ''}>${g}%</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Current stock</label><input id="pf-stock" type="number" value="${p ? p.stock : ''}" placeholder="0"></div>
        <div class="form-group"><label>Low stock alert at</label><input id="pf-low" type="number" value="${p ? p.lowAt : CONFIG.DEFAULT_LOW_STOCK}" placeholder="${CONFIG.DEFAULT_LOW_STOCK}"></div>
        <div class="form-group"><label>Expiry date</label><input id="pf-expiry" type="date" value="${p ? p.expiry || '' : ''}"></div>
      </div>
      <div id="veg-note" style="${isVeg ? '' : 'display:none'}" class="alert alert-green" style="margin-top:8px">
        <span>💡 Vegetables: use the <strong>Update veg prices</strong> button on the inventory page to quickly update cost & selling prices weekly without editing each product.</span>
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

function toggleWeightOther() {
  const val = document.getElementById('pf-weight').value;
  const group = document.getElementById('pf-weight-other-group');
  if (group) group.style.display = val === 'Other' ? '' : 'none';
}

function toggleVegNote() {
  const val = document.getElementById('pf-cat').value;
  const note = document.getElementById('veg-note');
  if (note) note.style.display = val === 'Vegetables' ? '' : 'none';
}

function saveProduct() {
  const name = document.getElementById('pf-name').value.trim();
  if (!name) { showToast('Product name is required'); return; }
  const cost = parseFloat(document.getElementById('pf-cost').value) || 0;
  const sell = parseFloat(document.getElementById('pf-sell').value) || 0;
  const mrp = parseFloat(document.getElementById('pf-mrp').value) || 0;
  const weightSel = document.getElementById('pf-weight').value;
  const weightOther = document.getElementById('pf-weight-other') ? document.getElementById('pf-weight-other').value.trim() : '';

  if (sell < cost) {
    if (!confirm('Selling price is less than cost price. Continue?')) return;
  }
  if (mrp > 0 && sell > mrp) {
    if (!confirm('Selling price is above MRP. Continue?')) return;
  }

  const product = {
    id: editingProductId || uid(),
    name,
    brand: document.getElementById('pf-brand').value.trim(),
    cat: document.getElementById('pf-cat').value,
    weight: weightSel !== 'Other' ? weightSel : '',
    weightOther: weightSel === 'Other' ? weightOther : '',
    cost,
    mrp,
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

// ---- Vegetable weekly price update ----
function openVegPriceUpdate() {
  const vegs = AppData.products.filter(p => p.cat === 'Vegetables');
  if (!vegs.length) { showToast('No vegetables in inventory. Add them first.'); return; }

  const rows = vegs.map(v => `
    <div style="display:grid;grid-template-columns:1fr 90px 90px;gap:8px;align-items:center;margin-bottom:8px">
      <span style="font-size:13px;font-weight:500">${v.name} ${v.brand ? '('+v.brand+')' : ''}</span>
      <div class="form-group" style="margin:0">
        <input type="number" step="0.01" id="vp-cost-${v.id}" value="${v.cost}" placeholder="Cost/kg">
      </div>
      <div class="form-group" style="margin:0">
        <input type="number" step="0.01" id="vp-sell-${v.id}" value="${v.sell}" placeholder="Sell/kg">
      </div>
    </div>
  `).join('');

  document.getElementById('product-form-container').innerHTML = `
    <div class="card" style="margin-bottom:16px;border:2px solid var(--accent)">
      <div class="card-title">🥦 Weekly vegetable price update</div>
      <p style="font-size:12px;color:var(--text3);margin-bottom:14px">Update cost and selling prices for all vegetables at once.</p>
      <div style="display:grid;grid-template-columns:1fr 90px 90px;gap:8px;margin-bottom:8px">
        <span style="font-size:11px;color:var(--text3)">Vegetable</span>
        <span style="font-size:11px;color:var(--text3)">Cost (₹)</span>
        <span style="font-size:11px;color:var(--text3)">Selling (₹)</span>
      </div>
      ${rows}
      <div class="form-actions" style="margin-top:8px">
        <button class="btn btn-primary" onclick="saveVegPrices()">Update all prices</button>
        <button class="btn" onclick="document.getElementById('product-form-container').innerHTML=''">Cancel</button>
      </div>
    </div>
  `;
  document.getElementById('product-form-container').scrollIntoView({ behavior: 'smooth' });
}

function saveVegPrices() {
  const vegs = AppData.products.filter(p => p.cat === 'Vegetables');
  vegs.forEach(v => {
    const costEl = document.getElementById(`vp-cost-${v.id}`);
    const sellEl = document.getElementById(`vp-sell-${v.id}`);
    if (costEl) v.cost = parseFloat(costEl.value) || v.cost;
    if (sellEl) v.sell = parseFloat(sellEl.value) || v.sell;
  });
  autoSave();
  showToast('Vegetable prices updated ✓');
  document.getElementById('product-form-container').innerHTML = '';
  renderInventory();
}
