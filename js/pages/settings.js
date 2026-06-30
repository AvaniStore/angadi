// ============================================================
//  PAGE: Settings — with PIN-protected reset
// ============================================================

const RESET_PIN_KEY = 'avani_reset_pin';

function renderSettings() {
  const s = AppData.settings;
  const hasPin = !!localStorage.getItem(RESET_PIN_KEY);

  document.getElementById('page-settings').innerHTML = `
    <div class="page-header"><h2 class="page-title">Settings</h2></div>

    <div class="card">
      <div class="settings-section">
        <h3>Shop details</h3>
        <div class="form-grid">
          <div class="form-group"><label>Shop name *</label><input id="s-name" value="${s.shopName || ''}" placeholder="My Shop"></div>
          <div class="form-group"><label>Phone</label><input id="s-phone" type="tel" value="${s.phone || ''}" placeholder="9XXXXXXXXX"></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label>Address</label><input id="s-address" value="${s.address || ''}" placeholder="Street, Area"></div>
          <div class="form-group"><label>City</label><input id="s-city" value="${s.city || ''}" placeholder="Udupi"></div>
          <div class="form-group"><label>State</label><input id="s-state" value="${s.state || ''}" placeholder="Karnataka"></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label>GSTIN</label><input id="s-gstin" value="${s.gstin || ''}" placeholder="29AABCS1234K1Z5"></div>
          <div class="form-group"><label>Email (optional)</label><input id="s-email" type="email" value="${s.email || ''}" placeholder="shop@email.com"></div>
          <div class="form-group"><label>Last bill number</label><input id="s-billno" type="number" value="${s.lastBillNumber || 0}" placeholder="0"><small style="color:var(--text3);font-size:11px">Format: AVN-DDMM-001 (e.g. AVN-0506-001)</small></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="saveSettings()">Save settings</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="settings-section">
        <h3>Clean up brand names</h3>
        <p style="font-size:13px;color:var(--text2);margin-bottom:14px">
          Fixes products where the same brand was typed with different capitalization or extra spaces
          (e.g. "24 Mantra" vs "24 mantra"), which makes them show up as separate brands in filters and reports.
        </p>
        <div id="brand-cleanup-result"></div>
        <div class="form-actions">
          <button class="btn" onclick="previewBrandCleanup()">🔍 Check for inconsistent brand names</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="settings-section">
        <h3>Data management</h3>
        <p style="font-size:13px;color:var(--text2);margin-bottom:14px">Your data is auto-saved to Google Drive. You can also export a backup.</p>
        <div class="form-actions">
          <button class="btn" onclick="exportData()">⬇ Export backup (JSON)</button>
          <button class="btn" onclick="importData()">⬆ Import backup</button>
          <button class="btn btn-primary" onclick="saveToGoogle()">☁ Save to Drive now</button>
          <button class="btn" onclick="showSyncDebug()" title="Show sync info for troubleshooting">🔍 Sync info</button>
        </div>
      </div>
    </div>

    <div class="card" style="border:1.5px solid #fca5a5">
      <div class="settings-section" style="margin-bottom:0">
        <h3 style="color:var(--red)">⚠ Reset & clear data</h3>
        <p style="font-size:13px;color:var(--text2);margin-bottom:16px">
          Protected by a 4-digit PIN. Always export a backup before resetting.
        </p>

        <div id="pin-setup-section">
          ${!hasPin ? `
            <div class="alert alert-amber" style="margin-bottom:14px">
              <span>🔒 Set a 4-digit PIN to protect these buttons before going live.</span>
            </div>
            <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
              <div class="form-group" style="margin:0">
                <label>Set reset PIN (4 digits)</label>
                <input id="new-pin" type="password" inputmode="numeric" maxlength="4" placeholder="e.g. 1234" style="width:120px;padding:8px 10px;border:1px solid var(--border2);border-radius:var(--radius);font-size:16px;letter-spacing:4px;text-align:center">
              </div>
              <div class="form-group" style="margin:0">
                <label>Confirm PIN</label>
                <input id="confirm-pin" type="password" inputmode="numeric" maxlength="4" placeholder="repeat" style="width:120px;padding:8px 10px;border:1px solid var(--border2);border-radius:var(--radius);font-size:16px;letter-spacing:4px;text-align:center">
              </div>
              <button class="btn btn-primary" onclick="setResetPin()">Set PIN</button>
            </div>
          ` : `
            <div class="alert alert-green" style="margin-bottom:14px">
              <span>🔒 Reset PIN is set. Enter PIN below to unlock and perform a reset.</span>
            </div>
            <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px">
              <div class="form-group" style="margin:0">
                <label>Enter PIN to unlock</label>
                <input id="unlock-pin" type="password" inputmode="numeric" maxlength="4" placeholder="····" style="width:120px;padding:8px 10px;border:1px solid var(--border2);border-radius:var(--radius);font-size:20px;letter-spacing:6px;text-align:center">
              </div>
              <button class="btn btn-primary" onclick="unlockReset()">Unlock</button>
              <button class="btn btn-sm" onclick="changePin()" style="margin-left:4px">Change PIN</button>
            </div>
            <div id="reset-buttons" style="display:none;flex-direction:column;gap:12px">
              <div style="background:var(--bg3);border-radius:var(--radius);padding:14px">
                <div style="font-size:13px;font-weight:600;margin-bottom:4px">Reset billing data</div>
                <div style="font-size:12px;color:var(--text3);margin-bottom:10px">Clears all sales bills and purchase history. Keeps products, vendors and settings.</div>
                <button class="btn btn-danger btn-sm" onclick="resetBillingData()">Clear bills & purchase history</button>
              </div>
              <div style="background:var(--bg3);border-radius:var(--radius);padding:14px">
                <div style="font-size:13px;font-weight:600;margin-bottom:4px">Full factory reset</div>
                <div style="font-size:12px;color:var(--text3);margin-bottom:10px">Clears everything — bills, purchases, products and vendors. Keeps shop name and settings.</div>
                <button class="btn btn-danger btn-sm" onclick="factoryReset()">Clear all data</button>
              </div>
              <div style="margin-top:4px">
                <button class="btn btn-sm" onclick="lockReset()">🔒 Lock again</button>
              </div>
            </div>
          `}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="settings-section" style="margin-bottom:0">
        <h3>About</h3>
        <p style="font-size:13px;color:var(--text2)">Avani v${CONFIG.VERSION} &nbsp;·&nbsp; Built for small business owners &nbsp;·&nbsp; Data stored in your Google Drive</p>
      </div>
    </div>
  `;
}

function setResetPin() {
  const pin = document.getElementById('new-pin').value.trim();
  const confirm = document.getElementById('confirm-pin').value.trim();
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { showToast('PIN must be exactly 4 digits'); return; }
  if (pin !== confirm) { showToast('PINs do not match'); return; }
  localStorage.setItem(RESET_PIN_KEY, pin);
  showToast('PIN set successfully 🔒');
  renderSettings();
}

function unlockReset() {
  const entered = document.getElementById('unlock-pin').value.trim();
  const saved = localStorage.getItem(RESET_PIN_KEY);
  if (entered !== saved) {
    showToast('Incorrect PIN');
    document.getElementById('unlock-pin').value = '';
    document.getElementById('unlock-pin').style.borderColor = 'var(--red)';
    setTimeout(() => { const el = document.getElementById('unlock-pin'); if(el) el.style.borderColor = ''; }, 1500);
    return;
  }
  const btns = document.getElementById('reset-buttons');
  if (btns) btns.style.display = 'flex';
  document.getElementById('unlock-pin').value = '';
  showToast('Unlocked ✓ — reset options are now visible');
}

function lockReset() {
  const btns = document.getElementById('reset-buttons');
  if (btns) btns.style.display = 'none';
  showToast('Locked 🔒');
}

function changePin() {
  const oldPin = prompt('Enter current PIN:');
  const saved = localStorage.getItem(RESET_PIN_KEY);
  if (oldPin !== saved) { showToast('Incorrect current PIN'); return; }
  const newPin = prompt('Enter new 4-digit PIN:');
  if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { showToast('PIN must be exactly 4 digits'); return; }
  const confirmPin = prompt('Confirm new PIN:');
  if (newPin !== confirmPin) { showToast('PINs do not match'); return; }
  localStorage.setItem(RESET_PIN_KEY, newPin);
  showToast('PIN changed successfully 🔒');
  renderSettings();
}

function saveSettings() {
  AppData.settings.shopName = document.getElementById('s-name').value.trim() || 'Avani';
  AppData.settings.phone = document.getElementById('s-phone').value.trim();
  AppData.settings.address = document.getElementById('s-address').value.trim();
  AppData.settings.city = document.getElementById('s-city').value.trim();
  AppData.settings.state = document.getElementById('s-state').value.trim();
  AppData.settings.gstin = document.getElementById('s-gstin').value.trim();
  AppData.settings.email = document.getElementById('s-email').value.trim();
  AppData.settings.lastBillNumber = parseInt(document.getElementById('s-billno').value) || 0;
  updateSidebarShopInfo();
  autoSave();
  showToast('Settings saved ✓');
}

function exportData() {
  const blob = new Blob([serialize()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `avani-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup downloaded ✓');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (deserialize(ev.target.result)) {
        updateSidebarShopInfo();
        showToast('Data imported ✓');
        autoSave();
        renderSettings();
      } else {
        showToast('Invalid backup file');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function resetBillingData() {
  if (!confirm('This will delete ALL sales bills and purchase history.\n\nYour products and vendors will be kept.\n\nAre you sure?')) return;
  if (!confirm('Last confirmation — this cannot be undone. Continue?')) return;
  AppData.sales = [];
  AppData.purchases = [];
  autoSave();
  showToast('Bills and purchase history cleared ✓');
  renderSettings();
}

// ---- Brand name cleanup ----
// Finds products whose brand field differs only by capitalization or stray
// whitespace from another brand already in use, and groups them so they
// can be merged onto one consistent spelling/casing.
function _findBrandInconsistencies() {
  const groups = {}; // normalized key -> { rawForms: Map<raw, count>, productIds: [] }
  AppData.products.forEach(p => {
    const raw = (p.brand || '');
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (!groups[key]) groups[key] = { rawForms: new Map(), productIds: [] };
    groups[key].rawForms.set(raw, (groups[key].rawForms.get(raw) || 0) + 1);
    groups[key].productIds.push(p.id);
  });

  // Only keep groups where more than one distinct raw form exists —
  // those are the ones that need merging
  const inconsistent = [];
  Object.entries(groups).forEach(([key, g]) => {
    if (g.rawForms.size > 1) {
      // Canonical form = whichever exact raw string is used most often
      const sortedForms = [...g.rawForms.entries()].sort((a, b) => b[1] - a[1]);
      const canonical = sortedForms[0][0].replace(/\s+/g, ' ').trim();
      inconsistent.push({
        key, canonical,
        variants: sortedForms.map(([form, count]) => ({ form, count })),
        productIds: g.productIds,
      });
    }
  });
  return inconsistent;
}

function previewBrandCleanup() {
  const inconsistencies = _findBrandInconsistencies();
  const resultEl = document.getElementById('brand-cleanup-result');
  if (!resultEl) return;

  if (!inconsistencies.length) {
    resultEl.innerHTML = `<div class="alert alert-green" style="margin-bottom:14px">✓ No inconsistent brand names found — everything looks clean.</div>`;
    return;
  }

  const rows = inconsistencies.map(g => `
    <div style="border:1px solid var(--border2);border-radius:var(--radius);padding:10px 14px;margin-bottom:8px">
      <div style="font-size:13px;margin-bottom:6px">
        Will become: <strong style="color:var(--accent-dark)">${g.canonical}</strong>
      </div>
      <div style="font-size:12px;color:var(--text3)">
        ${g.variants.map(v => `"${v.form}" (${v.count} product${v.count !== 1 ? 's' : ''})`).join(' &nbsp;+&nbsp; ')}
      </div>
    </div>
  `).join('');

  resultEl.innerHTML = `
    <div class="alert alert-amber" style="margin-bottom:14px">
      Found ${inconsistencies.length} brand${inconsistencies.length !== 1 ? 's' : ''} with inconsistent spelling/casing across ${inconsistencies.reduce((a,g)=>a+g.productIds.length,0)} products.
    </div>
    ${rows}
    <div class="form-actions" style="margin-top:10px">
      <button class="btn btn-primary" onclick="applyBrandCleanup()">✓ Fix all — apply consistent names</button>
    </div>
  `;
}

function applyBrandCleanup() {
  const inconsistencies = _findBrandInconsistencies();
  if (!inconsistencies.length) { showToast('Nothing to fix'); return; }

  if (!confirm(`This will update the brand name on ${inconsistencies.reduce((a,g)=>a+g.productIds.length,0)} products to use one consistent spelling per brand. Continue?`)) return;

  let updated = 0;
  inconsistencies.forEach(g => {
    g.productIds.forEach(pid => {
      const p = AppData.products.find(x => x.id === pid);
      if (p && p.brand !== g.canonical) {
        p.brand = g.canonical;
        if (typeof saveRecord === 'function') saveRecord('products', p).catch(console.error);
        updated++;
      }
    });
  });

  saveLocal();
  showToast(`Updated brand name on ${updated} product${updated !== 1 ? 's' : ''} ✓`);
  const resultEl = document.getElementById('brand-cleanup-result');
  if (resultEl) resultEl.innerHTML = `<div class="alert alert-green" style="margin-bottom:14px">✓ Cleaned up. Re-check anytime if you add more products.</div>`;
}

function recalculateAllProfits() {
  if (!confirm(`Recalculate profit for all ${AppData.sales.length} bills using current inventory cost prices?\n\nThis will update profit figures for bills where cost was ₹0. Cannot be undone.`)) return;

  let fixed = 0;
  let zeroProfit = 0;
  let skipped = 0;

  AppData.sales.forEach(sale => {
    let newProfit = 0;
    let hasZeroCost = false;
    let allCostsFound = true;

    (sale.items || []).forEach(item => {
      const product = AppData.products.find(p => p.id === item.pid);
      const itemRevenue = (parseFloat(item.price) || 0) * (parseFloat(item.qty) || 0) * (1 - (parseFloat(item.discount) || 0) / 100);
      const currentCost = product ? (parseFloat(product.cost) || 0) : (parseFloat(item.cost) || 0);
      const itemCostTotal = currentCost * (parseFloat(item.qty) || 0);

      if (currentCost === 0) hasZeroCost = true;
      if (!product) allCostsFound = false;

      // Update item cost in the sale record
      if (product && product.cost > 0) {
        item.cost = product.cost;
      }

      newProfit += itemRevenue - itemCostTotal;
    });

    // Adjust for bill-level discount
    newProfit -= (parseFloat(sale.billDisc) || 0);
    // Add round-off to profit
    newProfit += (parseFloat(sale.roundOff) || 0);

    const oldProfit = sale.profit || 0;

    if (hasZeroCost) zeroProfit++;

    // Only update if profit was clearly wrong (> revenue which means cost was 0)
    if (oldProfit >= sale.total * 0.99 && sale.total > 0) {
      sale.profit = Math.round(newProfit * 100) / 100;
      fixed++;
    } else if (Math.abs(oldProfit - newProfit) > 1) {
      // Also update if significantly different
      sale.profit = Math.round(newProfit * 100) / 100;
      fixed++;
    } else {
      skipped++;
    }
  });

  autoSave();

  const resultEl = document.getElementById('recalc-result');
  if (resultEl) {
    resultEl.innerHTML = `✓ Updated ${fixed} bills &nbsp;·&nbsp; ${skipped} already correct &nbsp;·&nbsp; ${zeroProfit} bills still have items with ₹0 cost`;
  }
  showToast(`Recalculated ${fixed} bills ✓`);
}

function factoryReset() {
  if (!confirm('This will delete ALL data — bills, purchases, products and vendors.\n\nYour shop name and settings will be kept.\n\nAre you sure?')) return;
  if (!confirm('Last confirmation — this cannot be undone. Continue?')) return;
  AppData.sales = [];
  AppData.purchases = [];
  AppData.products = [];
  AppData.vendors = [];
  autoSave();
  showToast('All data cleared ✓');
  renderSettings();
}
