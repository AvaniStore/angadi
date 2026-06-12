// ============================================================
//  SUPABASE — replaces drive.js for data sync
// ============================================================

// Convert AppData format to/from Supabase rows
function toRow(table, obj) {
  const uid = currentUser.id;
  if (table === 'products') return {
    id: obj.id, user_id: uid, name: obj.name, brand: obj.brand||'',
    cat: obj.cat||'Grocery', weight: obj.weight||'', weight_other: obj.weightOther||'',
    cost: obj.cost||0, mrp: obj.mrp||0, sell: obj.sell||0, gst: obj.gst||0,
    stock: obj.stock||0, low_at: obj.lowAt||3, expiry: obj.expiry||''
  };
  if (table === 'sales') return {
    id: obj.id, user_id: uid, date: obj.date, customer: obj.customer||'Walk-in',
    phone: obj.phone||'', payment: obj.payment||'Cash', items: obj.items||[],
    sub: obj.sub||0, item_disc: obj.itemDisc||0, bill_disc: obj.billDisc||0,
    delivery: obj.delivery||0, gst: obj.gst||0, calc_total: obj.calcTotal||0,
    round_off: obj.roundOff||0, total: obj.total||0, profit: obj.profit||0
  };
  if (table === 'vendors') return {
    id: obj.id, user_id: uid, name: obj.name, phone: obj.phone||'',
    city: obj.city||'', gstin: obj.gstin||'', email: obj.email||'',
    brands: obj.brands||'', products: obj.products||'', payment: obj.payment||'Cash'
  };
  if (table === 'customers') return {
    id: obj.id, user_id: uid, name: obj.name, phone: obj.phone||'',
    last_bill: obj.lastBill||'', bill_count: obj.billCount||0, total_spent: obj.totalSpent||0
  };
  if (table === 'purchases') return {
    id: obj.id, user_id: uid, po_number: obj.poNumber||'', date: obj.date,
    vendor_id: obj.vendorId||'', vendor: obj.vendor||'', bill_no: obj.billNo||'',
    payment: obj.payment||'Cash', items: obj.items||[], total: obj.total||0
  };
  if (table === 'returns') return {
    id: obj.id, user_id: uid, sale_id: obj.saleId||'', date: obj.date,
    items: obj.items||[], refund: obj.refund||0, reason: obj.reason||''
  };
  if (table === 'adjustments') return {
    id: obj.id, user_id: uid, date: obj.date, product_id: obj.productId||'',
    product: obj.product||'', qty: obj.qty||0, type: obj.type||'Write-off',
    reason: obj.reason||'', loss: obj.loss||0
  };
}

function fromRow(table, row) {
  if (table === 'products') return {
    id: row.id, name: row.name, brand: row.brand, cat: row.cat,
    weight: row.weight, weightOther: row.weight_other, cost: +row.cost,
    mrp: +row.mrp, sell: +row.sell, gst: +row.gst, stock: +row.stock,
    lowAt: +row.low_at, expiry: row.expiry
  };
  if (table === 'sales') return {
    id: row.id, date: row.date, customer: row.customer, phone: row.phone,
    payment: row.payment, items: row.items, sub: +row.sub,
    itemDisc: +row.item_disc, billDisc: +row.bill_disc, delivery: +row.delivery,
    gst: +row.gst, calcTotal: +row.calc_total, roundOff: +row.round_off,
    total: +row.total, profit: +row.profit
  };
  if (table === 'vendors') return {
    id: row.id, name: row.name, phone: row.phone, city: row.city,
    gstin: row.gstin, email: row.email, brands: row.brands,
    products: row.products, payment: row.payment
  };
  if (table === 'customers') return {
    id: row.id, name: row.name, phone: row.phone, lastBill: row.last_bill,
    billCount: row.bill_count, totalSpent: +row.total_spent
  };
  if (table === 'purchases') return {
    id: row.id, poNumber: row.po_number, date: row.date, vendorId: row.vendor_id,
    vendor: row.vendor, billNo: row.bill_no, payment: row.payment,
    items: row.items, total: +row.total
  };
  if (table === 'returns') return {
    id: row.id, saleId: row.sale_id, date: row.date,
    items: row.items, refund: +row.refund, reason: row.reason
  };
  if (table === 'adjustments') return {
    id: row.id, date: row.date, productId: row.product_id, product: row.product,
    qty: +row.qty, type: row.type, reason: row.reason, loss: +row.loss
  };
}

async function loadFromSupabase() {
  try {
    const sb = window._sb;
    const uid = currentUser.id;
    console.log('Loading from Supabase, user:', uid);

    const [
      { data: settingsRows, error: e0 },
      { data: products, error: e1 },
      { data: vendors, error: e2 },
      { data: customers, error: e3 },
      { data: sales, error: e4 },
      { data: purchases, error: e5 },
      { data: returns_, error: e6 },
      { data: adjustments, error: e7 },
    ] = await Promise.all([
      sb.from('settings').select('*').eq('user_id', uid).limit(1),
      sb.from('products').select('*').eq('user_id', uid),
      sb.from('vendors').select('*').eq('user_id', uid),
      sb.from('customers').select('*').eq('user_id', uid),
      sb.from('sales').select('*').eq('user_id', uid).order('date', { ascending: true }),
      sb.from('purchases').select('*').eq('user_id', uid).order('date', { ascending: true }),
      sb.from('returns').select('*').eq('user_id', uid),
      sb.from('adjustments').select('*').eq('user_id', uid),
    ]);

    // Log any errors
    [e0,e1,e2,e3,e4,e5,e6,e7].forEach((e,i) => { if(e) console.error(`Load error table ${i}:`, e.message); });

    console.log(`Loaded: products=${products?.length}, vendors=${vendors?.length}, sales=${sales?.length}, customers=${customers?.length}`);

    // Apply settings
    if (settingsRows && settingsRows.length > 0) {
      const s = settingsRows[0];
      AppData.settings = {
        ...AppData.settings,
        shopName: s.shop_name, address: s.address, city: s.city,
        state: s.state, phone: s.phone, gstin: s.gstin, email: s.email,
        lastBillNumber: s.last_bill_number, lastBillDate: s.last_bill_date,
        lastBillSeq: s.last_bill_seq, lastPONumber: s.last_po_number,
      };
    }

    AppData.products = (products||[]).map(r => fromRow('products', r)).sort((a,b) => a.name.localeCompare(b.name));
    AppData.vendors = (vendors||[]).map(r => fromRow('vendors', r));
    AppData.customers = (customers||[]).map(r => fromRow('customers', r));
    AppData.sales = (sales||[]).map(r => fromRow('sales', r));
    AppData.purchases = (purchases||[]).map(r => fromRow('purchases', r));
    AppData.returns = (returns_||[]).map(r => fromRow('returns', r));
    AppData.adjustments = (adjustments||[]).map(r => fromRow('adjustments', r));

    // Merge any offline bills
    mergeOfflineData();
    saveLocal();
    showToast(`Data loaded ✓ (${AppData.products.length} products, ${AppData.sales.length} bills)`);
    updateOnlineStatus(true);

  } catch(e) {
    console.error('Supabase load error:', e);
    const hasLocal = loadLocal();
    showToast(hasLocal ? 'Offline — loaded locally' : 'Could not load data');
    updateOnlineStatus(false);
  }
}

// Save a single record to Supabase
async function saveRecord(table, obj) {
  if (!currentUser) return;
  _savingToSupabase = true;
  const row = toRow(table, obj);
  const { error } = await window._sb.from(table).upsert(row, { onConflict: 'id' });
  if (error) console.error(`Save ${table} error:`, error);
  setTimeout(() => { _savingToSupabase = false; }, 2000);
}

// Delete a single record
async function deleteRecord(table, id) {
  if (!currentUser) return;
  const { error } = await window._sb.from(table).delete().eq('id', id).eq('user_id', currentUser.id);
  if (error) console.error(`Delete ${table} error:`, error);
}

// Save settings
async function saveSettings() {
  if (!currentUser) return;
  const s = AppData.settings;
  const { error } = await window._sb.from('settings').upsert({
    user_id: currentUser.id,
    shop_name: s.shopName, address: s.address, city: s.city,
    state: s.state, phone: s.phone, gstin: s.gstin||'', email: s.email||'',
    last_bill_number: s.lastBillNumber||0, last_bill_date: s.lastBillDate||'',
    last_bill_seq: s.lastBillSeq||0, last_po_number: s.lastPONumber||0,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  if (error) console.error('Save settings error:', error);
}

// Full save to Supabase (used for import/bulk operations)
async function saveToGoogle() {
  if (!currentUser) { showToast('Please sign in first'); return; }
  const statusEl = document.getElementById('save-status');
  if (statusEl) statusEl.textContent = 'Saving...';

  try {
    _savingToSupabase = true;
    await saveSettings();

    const tables = ['products','vendors','customers','sales','purchases','returns','adjustments'];
    const arrays = [AppData.products, AppData.vendors, AppData.customers, AppData.sales, AppData.purchases, AppData.returns, AppData.adjustments];

    for (let i = 0; i < tables.length; i++) {
      const arr = arrays[i];
      if (!arr || arr.length === 0) {
        console.log(`${tables[i]}: skipped (empty)`);
        continue;
      }

      // Map rows and filter out any nulls
      const rows = arr.map(obj => toRow(tables[i], obj)).filter(Boolean);

      // Save in batches of 100 to avoid payload limits
      const batchSize = 100;
      let saved = 0;
      for (let j = 0; j < rows.length; j += batchSize) {
        const batch = rows.slice(j, j + batchSize);
        const { error } = await window._sb.from(tables[i]).upsert(batch, { onConflict: 'id' });
        if (error) {
          console.error(`Save ${tables[i]} batch ${j} error:`, error.message, error.details);
        } else {
          saved += batch.length;
        }
      }
      console.log(`${tables[i]}: saved ${saved}/${rows.length}`);
      if (statusEl) statusEl.textContent = `Saving ${tables[i]}...`;
    }

    saveLocal();
    setTimeout(() => { _savingToSupabase = false; }, 3000);
    if (statusEl) { statusEl.textContent = 'Saved ✓'; setTimeout(() => { statusEl.textContent = ''; }, 3000); }
    showToast('Saved to Supabase ✓');
    updateOnlineStatus(true);
  } catch(e) {
    _savingToSupabase = false;
    console.error('Save error:', e);
    if (statusEl) statusEl.textContent = 'Save failed';
    saveLocal();
  }
}

// Auto-save — save changed record immediately
function autoSave(table, obj) {
  saveLocal();
  if (!currentUser) return;
  if (table && obj) {
    saveRecord(table, obj).catch(console.error);
    if (table === 'sales' || table === 'products') saveSettings().catch(console.error);
  }
  const statusEl = document.getElementById('save-status');
  if (statusEl) { statusEl.textContent = 'Saved ✓'; setTimeout(() => { statusEl.textContent = ''; }, 2000); }
}

// Refresh from Supabase
async function refreshFromDrive() {
  if (!currentUser) { showToast('Please sign in first'); return; }
  showToast('Refreshing...');
  await loadFromSupabase();
  renderCurrentPage();
  updateSidebarShopInfo();
}

// Merge offline data into Supabase on reconnect
function mergeOfflineData() {
  try {
    const localRaw = localStorage.getItem(LOCAL_KEY);
    if (!localRaw) return;
    const local = JSON.parse(localRaw);
    if (!local) return;

    // Merge offline bills
    if (local.sales) {
      const onlineSaleIds = new Set(AppData.sales.map(s => s.id));
      const offlineSales = (local.sales || []).filter(s => s.id && !onlineSaleIds.has(s.id));
      if (offlineSales.length > 0) {
        AppData.sales = [...AppData.sales, ...offlineSales].sort((a,b) => (a.date||'').localeCompare(b.date||''));
        offlineSales.forEach(s => saveRecord('sales', s).catch(console.error));
        showToast(`Merged ${offlineSales.length} offline bill${offlineSales.length!==1?'s':''} ✓`);
      }
    }

    // Merge offline product changes (stock, prices)
    // If local has products and Supabase has the same products,
    // push any local products that differ from what Supabase returned
    if (local.products && AppData.products.length > 0) {
      const supabaseProductMap = new Map(AppData.products.map(p => [p.id, p]));
      const changedProducts = (local.products || []).filter(lp => {
        const sp = supabaseProductMap.get(lp.id);
        if (!sp) return false; // new product — handled by full save
        // Check if stock or prices differ
        return lp.stock !== sp.stock || lp.cost !== sp.cost || lp.sell !== sp.sell;
      });

      if (changedProducts.length > 0) {
        console.log(`Merging ${changedProducts.length} offline product changes`);
        changedProducts.forEach(lp => {
          // Update AppData with local version
          const idx = AppData.products.findIndex(p => p.id === lp.id);
          if (idx >= 0) AppData.products[idx] = lp;
          // Push to Supabase
          saveRecord('products', lp).catch(console.error);
        });
        showToast(`Synced ${changedProducts.length} offline stock/price change${changedProducts.length!==1?'s':''} ✓`);
      }
    }

  } catch(e) {
    console.error('mergeOfflineData error:', e);
  }
}

function showSyncDebug() {
  alert(`Sync status:\n\nUser: ${currentUser?.email || 'not signed in'}\nLocal bills: ${AppData.sales.length}\nProducts: ${AppData.products.length}\nLast bill: ${AppData.sales.length ? AppData.sales[AppData.sales.length-1].id : 'none'}`);
}

function showReconnectBtn(show) {
  const btn = document.getElementById('reconnect-btn');
  if (btn) btn.style.display = show ? '' : 'none';
}

// Auto-save — called after every data change
// Pass table + object for instant single-record save, or no args for local-only
function autoSave(table, obj) {
  saveLocal();
  if (!currentUser || !navigator.onLine) return;

  const statusEl = document.getElementById('save-status');

  if (table && obj) {
    // Save single record immediately
    saveRecord(table, obj)
      .then(() => {
        if (statusEl) { statusEl.textContent = 'Saved ✓'; setTimeout(() => { statusEl.textContent = ''; }, 2000); }
      })
      .catch(e => {
        console.error('autoSave error:', e);
        if (statusEl) statusEl.textContent = 'Save failed';
      });
    // Also save settings if bill counter changed
    if (table === 'sales' || table === 'products') saveSettings().catch(console.error);
  } else {
    // Debounced full save for bulk changes
    clearTimeout(window._autoSaveTimer);
    if (statusEl) statusEl.textContent = 'Saving...';
    window._autoSaveTimer = setTimeout(() => saveToGoogle(), 2000);
  }
}
