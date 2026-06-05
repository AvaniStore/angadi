// ============================================================
//  PAGE: Inventory
// ============================================================

let editingProductId = null;

const CATEGORIES = ['Grocery', 'Home Care', 'Cosmetics', 'Snacks', 'Vegetables', 'Fruits', 'Other'];
const WEIGHTS = ['100g', '200g', '250g', '500g', '1kg', '200ml', '250ml', '500ml', '1000ml', 'pieces', 'Other'];

function filterInventoryTable(search) {
  const catFilter = (document.getElementById('inv-cat-filter') || {}).value || '';
  const q = (search || '').toLowerCase();

  const filtered = AppData.products.filter(p => {
    const matchSearch = !q || p.name.toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q) ||
      (p.cat || '').toLowerCase().includes(q);
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
          <button class="btn btn-xs" style="color:var(--amber);border-color:#fcd34d" onclick="openStockAdjust('${p.id}')">±</button>
          <button class="btn btn-xs btn-danger" onclick="deleteProduct('${p.id}')">Del</button>
        </div>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="11"><div class="empty-state"><p>No products match your search.</p></div></td></tr>`;

  const tbody = document.querySelector('#page-inventory .table-wrap tbody');
  if (tbody) tbody.innerHTML = rows;
}

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
          <button class="btn btn-xs" style="color:var(--amber);border-color:#fcd34d" onclick="openStockAdjust('${p.id}')">±</button>
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
        <button class="btn" onclick="openVegPriceUpdate()" title="Update vegetable & fruit prices">🥦 Update veg & fruit prices</button>
      </div>
    </div>

    <div id="product-form-container"></div>

    <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      <input id="inv-search" type="text" placeholder="Search by name, brand, category..." style="flex:1;min-width:180px;padding:8px 12px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text)" oninput="filterInventoryTable(this.value)" value="${search}">
      <select id="inv-cat-filter" onchange="filterInventoryTable(document.getElementById('inv-search').value)" style="padding:8px 12px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text)">
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
          <select id="pf-cat" onchange="toggleCatOther()">
            ${CATEGORIES.map(c => `<option value="${c}" ${p && (p.cat === c || (c === 'Other' && !CATEGORIES.slice(0,-1).includes(p.cat))) ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" id="pf-cat-other-group" style="${p && !CATEGORIES.slice(0,-1).includes(p.cat) ? '' : 'display:none'}">
          <label>Custom category</label>
          <input id="pf-cat-other" value="${p && !CATEGORIES.slice(0,-1).includes(p.cat) ? p.cat : ''}" placeholder="e.g. Dairy, Frozen, Beverages">
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
      <div id="veg-note" style="${isVeg ? '' : 'display:none'};margin-top:8px" class="alert alert-green">
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

function toggleCatOther() {
  const val = document.getElementById('pf-cat').value;
  const group = document.getElementById('pf-cat-other-group');
  if (group) group.style.display = val === 'Other' ? '' : 'none';
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

  const catSel = document.getElementById('pf-cat').value;
  const catOther = document.getElementById('pf-cat-other') ? document.getElementById('pf-cat-other').value.trim() : '';
  const cat = catSel === 'Other' ? (catOther || 'Other') : catSel;

  const product = {
    id: editingProductId || uid(),
    name,
    brand: document.getElementById('pf-brand').value.trim(),
    cat,
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
  AppData.products.sort((a, b) => a.name.localeCompare(b.name));
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

// ---- Vegetable & fruit weekly price update ----
function openVegPriceUpdate() {
  const vegs = AppData.products.filter(p => p.cat === 'Vegetables' || p.cat === 'Fruits');
  if (!vegs.length) { showToast('No vegetables or fruits in inventory.'); return; }

  document.getElementById('product-form-container').innerHTML = `
    <div class="card" style="margin-bottom:16px;border:2px solid var(--accent)">
      <div class="card-head">
        <span class="card-title">🥦 Weekly vegetable & fruit price update</span>
        <button class="btn btn-sm" onclick="document.getElementById('product-form-container').innerHTML=''">Cancel</button>
      </div>
      <p style="font-size:12px;color:var(--text3);margin-bottom:12px">Update cost and selling prices. Leave blank to keep existing price.</p>

      <!-- Sticky search + header -->
      <div style="position:sticky;top:52px;background:var(--bg2);z-index:10;padding-bottom:8px;border-bottom:1px solid var(--border);margin-bottom:8px">
        <input id="veg-search" type="text" placeholder="🔍 Search vegetable or fruit..." oninput="filterVegPriceRows(this.value)"
          style="width:100%;padding:8px 12px;border:1.5px solid var(--accent);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text);margin-bottom:8px">
        <div style="display:grid;grid-template-columns:1fr 100px 100px;gap:8px;padding:0 4px">
          <span style="font-size:11px;color:var(--text3);font-weight:500">Product</span>
          <span style="font-size:11px;color:var(--text3);font-weight:500">Cost (₹)</span>
          <span style="font-size:11px;color:var(--text3);font-weight:500">Selling (₹)</span>
        </div>
      </div>

      <div id="veg-price-rows">
        ${vegs.map(v => vegPriceRow(v)).join('')}
      </div>
      <div class="form-actions" style="margin-top:12px;position:sticky;bottom:0;background:var(--bg2);padding-top:8px;border-top:1px solid var(--border)">
        <button class="btn btn-primary" onclick="saveVegPrices()">Update all prices</button>
        <span id="veg-match-count" style="font-size:12px;color:var(--text3);margin-left:8px">${vegs.length} items</span>
      </div>
    </div>
  `;
  document.getElementById('product-form-container').scrollIntoView({ behavior: 'smooth' });
  // Auto-focus search after scroll
  setTimeout(() => { const s = document.getElementById('veg-search'); if(s) s.focus(); }, 400);
}

function vegPriceRow(v) {
  return `<div class="veg-price-row" data-name="${v.name.toLowerCase()}" style="display:grid;grid-template-columns:1fr 100px 100px;gap:8px;align-items:center;margin-bottom:6px;padding:4px 0;border-bottom:1px solid var(--border)">
    <span style="font-size:13px">${v.name}${v.brand ? `<span style="font-size:11px;color:var(--text3)"> (${v.brand})</span>` : ''} <span style="font-size:10px;background:${v.cat==='Fruits'?'#fef3c7':'#d1fae5'};color:${v.cat==='Fruits'?'#92400e':'#065f46'};padding:1px 5px;border-radius:8px">${v.cat}</span></span>
    <input type="number" id="vp-cost-${v.id}" value="${v.cost||''}" placeholder="${v.cost||0}"
      onkeydown="if(event.key==='ArrowUp'){event.preventDefault();this.value=Math.round((parseFloat(this.value)||0)+1)}else if(event.key==='ArrowDown'){event.preventDefault();this.value=Math.max(0,Math.round((parseFloat(this.value)||0)-1))}"
      style="padding:5px 8px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text);width:100%">
    <input type="number" id="vp-sell-${v.id}" value="${v.sell||''}" placeholder="${v.sell||0}"
      onkeydown="if(event.key==='ArrowUp'){event.preventDefault();this.value=Math.round((parseFloat(this.value)||0)+1)}else if(event.key==='ArrowDown'){event.preventDefault();this.value=Math.max(0,Math.round((parseFloat(this.value)||0)-1))}"
      style="padding:5px 8px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text);width:100%">
  </div>`;
}

function filterVegPriceRows(query) {
  const q = query.toLowerCase();
  let visible = 0;
  document.querySelectorAll('.veg-price-row').forEach(row => {
    const show = !q || row.dataset.name.includes(q);
    row.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  const countEl = document.getElementById('veg-match-count');
  if (countEl) countEl.textContent = q ? `${visible} match${visible!==1?'es':''}` : `${visible} items`;
}

function saveVegPrices() {
  const vegs = AppData.products.filter(p => p.cat === 'Vegetables' || p.cat === 'Fruits');
  vegs.forEach(v => {
    const costEl = document.getElementById(`vp-cost-${v.id}`);
    const sellEl = document.getElementById(`vp-sell-${v.id}`);
    if (costEl && costEl.value !== '') v.cost = parseFloat(costEl.value) || v.cost;
    if (sellEl && sellEl.value !== '') v.sell = parseFloat(sellEl.value) || v.sell;
  });
  autoSave();
  showToast('Prices updated ✓');
  document.getElementById('product-form-container').innerHTML = '';
  renderInventory();
}

// ---- Stock adjustment (write-off) ----
function openStockAdjust(pid) {
  const p = AppData.products.find(x => x.id === pid);
  if (!p) return;

  // Recent adjustments for this product
  const recentAdj = (AppData.adjustments || []).filter(a => a.pid === pid).slice(-5).reverse();
  const recentHtml = recentAdj.length ? recentAdj.map(a =>
    `<div style="font-size:12px;color:var(--text3);padding:3px 0">${fmtDate(a.date)} — ${a.type}: ${a.qty > 0 ? '+' : ''}${a.qty} units (${a.reason})</div>`
  ).join('') : '';

  document.getElementById('product-form-container').innerHTML = `
    <div class="card" style="margin-bottom:16px;border:2px solid #fcd34d">
      <div class="card-head">
        <span class="card-title">± Adjust stock — ${p.name}${p.brand ? ' ('+p.brand+')' : ''}</span>
        <button class="btn btn-sm" onclick="document.getElementById('product-form-container').innerHTML=''">Cancel</button>
      </div>
      <div style="font-size:13px;margin-bottom:14px">
        Current stock: <strong>${p.stock} units</strong>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Adjustment type</label>
          <select id="adj-type" onchange="updateAdjSign()" style="padding:8px 10px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text)">
            <option value="remove">Remove stock (write-off)</option>
            <option value="add">Add stock (manual correction)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Reason</label>
          <select id="adj-reason" style="padding:8px 10px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text)">
            <option>Near expiry — removed from shelf</option>
            <option>Expired</option>
            <option>Damaged / broken</option>
            <option>Internal use / sample</option>
            <option>Theft / shrinkage</option>
            <option>Manual correction</option>
            <option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Quantity</label>
          <input id="adj-qty" type="number" min="1" step="1" placeholder="0"
            style="padding:8px 10px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text)"
            oninput="updateAdjPreview('${pid}')">
        </div>
      </div>
      <div id="adj-preview" style="font-size:13px;color:var(--text2);margin-bottom:12px"></div>
      ${recentAdj.length ? `<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:500;margin-bottom:4px;color:var(--text3)">Recent adjustments:</div>${recentHtml}</div>` : ''}
      <div class="form-actions">
        <button class="btn btn-primary" onclick="saveStockAdjust('${pid}')">Confirm adjustment</button>
      </div>
    </div>
  `;
  document.getElementById('product-form-container').scrollIntoView({ behavior: 'smooth' });
}

function updateAdjSign() {
  const pid = document.querySelector('[id^="adj-qty"]') ? document.getElementById('adj-qty').dataset.pid : null;
  updateAdjPreview();
}

function updateAdjPreview(pid) {
  const p = pid ? AppData.products.find(x => x.id === pid) : null;
  if (!p) return;
  const type = document.getElementById('adj-type').value;
  const qty = parseInt(document.getElementById('adj-qty').value) || 0;
  const newStock = type === 'remove' ? p.stock - qty : p.stock + qty;
  const loss = type === 'remove' ? qty * p.cost : 0;
  const preview = document.getElementById('adj-preview');
  if (!preview) return;
  if (qty <= 0) { preview.innerHTML = ''; return; }
  if (type === 'remove' && qty > p.stock) {
    preview.innerHTML = `<span style="color:var(--red)">⚠ Cannot remove more than current stock (${p.stock})</span>`;
    return;
  }
  preview.innerHTML = `
    Stock will change: <strong>${p.stock}</strong> → <strong style="color:${type==='remove'?'var(--red)':'var(--accent-dark)'}">${newStock}</strong>
    ${loss > 0 ? ` &nbsp;·&nbsp; <span style="color:var(--red)">Loss: ${fmt(loss)} (at cost)</span>` : ''}
  `;
}

function saveStockAdjust(pid) {
  const p = AppData.products.find(x => x.id === pid);
  if (!p) return;
  const type = document.getElementById('adj-type').value;
  const qty = parseInt(document.getElementById('adj-qty').value) || 0;
  const reason = document.getElementById('adj-reason').value;

  if (qty <= 0) { showToast('Enter a valid quantity'); return; }
  if (type === 'remove' && qty > p.stock) { showToast(`Cannot remove more than current stock (${p.stock})`); return; }

  const change = type === 'remove' ? -qty : qty;
  const loss = type === 'remove' ? qty * p.cost : 0;

  p.stock += change;

  if (!AppData.adjustments) AppData.adjustments = [];
  AppData.adjustments.push({
    id: uid(), date: today(),
    pid, product: p.name, brand: p.brand || '',
    type: type === 'remove' ? 'Write-off' : 'Manual add',
    qty: change, reason, loss,
  });

  autoSave();
  showToast(`Stock adjusted: ${p.name} → ${p.stock} units ✓`);
  document.getElementById('product-form-container').innerHTML = '';
  renderInventory();
}
