// ============================================================
//  DATA — app state and helpers
// ============================================================

const AppData = {
  settings: {
    shopName: 'Avani — The Organic Store',
    address: 'CPC Plaza, Opp. KSRTC Bus Stand',
    city: 'Udupi',
    state: 'Karnataka',
    phone: '99024 77544 / 94835 46661',
    gstin: '',
    email: '',
    lastBillNumber: 0,   // sequential bill counter
    lastPONumber: 0,     // sequential PO counter
  },
  products: [],
  vendors: [],
  customers: [],     // saved customer directory
  sales: [],
  purchases: [],
  returns: [],
  adjustments: [],
};

// ---- ID & date helpers ----
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function nextBillNumber(suffix) {
  const now = new Date();
  const dateStr = String(now.getDate()).padStart(2,'0') + String(now.getMonth()+1).padStart(2,'0');
  const lastDate = AppData.settings.lastBillDate || '';

  // Reset sequence if new day
  if (lastDate !== dateStr) {
    AppData.settings.lastBillDate = dateStr;
    AppData.settings.lastBillSeq = 0;
  }
  AppData.settings.lastBillSeq = (AppData.settings.lastBillSeq || 0) + 1;
  AppData.settings.lastBillNumber = (AppData.settings.lastBillNumber || 0) + 1; // keep overall counter

  const seq = String(AppData.settings.lastBillSeq).padStart(3, '0');
  const base = `AVN-${dateStr}-${seq}`;
  return suffix ? `${base}-${suffix.toUpperCase()}` : base;
}

function nextPONumber() {
  AppData.settings.lastPONumber = (AppData.settings.lastPONumber || 0) + 1;
  return 'PO-' + String(AppData.settings.lastPONumber).padStart(3, '0');
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}
function fmt(n) {
  return '₹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNum(n) {
  return parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---- Stock helpers ----
function stockBadge(p) {
  if (p.stock < 0) return `<span class="badge badge-out">${p.stock} (oversold)</span>`;
  if (p.stock === 0) return `<span class="badge badge-out">Out of stock</span>`;
  if (p.stock <= p.lowAt) return `<span class="badge badge-low">${p.stock} left</span>`;
  return `<span class="badge badge-ok">${p.stock}</span>`;
}

function expiryTag(expiry) {
  if (!expiry) return '';
  const d = new Date(expiry), now = new Date();
  const diff = (d - now) / (1000 * 60 * 60 * 24);
  if (diff < 0) return `<span class="tag-expired">Expired</span>`;
  if (diff < 30) return `<span class="tag-expiring">Exp. soon</span>`;
  return '';
}

// ---- Bill calculation ----
function calcBill(items) {
  let sub = 0, gstAmt = 0;
  items.forEach(it => {
    if (!it.pid) return;
    const base = (parseFloat(it.price) || 0) * (parseInt(it.qty) || 0);
    sub += base;
    gstAmt += base * ((parseFloat(it.gst) || 0) / 100);
  });
  return { sub, gst: gstAmt, total: sub + gstAmt };
}

function calcProfit(items) {
  return items.reduce((acc, it) => {
    if (!it.pid) return acc;
    return acc + ((parseFloat(it.price) || 0) - (parseFloat(it.cost) || 0)) * (parseInt(it.qty) || 0);
  }, 0);
}

// ---- Merge offline data with Drive data ----
// Called when coming back online — keeps offline bills that aren't in Drive yet
function mergeOfflineData(localData) {
  try {
    if (!localData) return { sales: 0, purchases: 0 };

    // Get IDs already loaded from Drive (now in AppData)
    const driveSaleIds = new Set(AppData.sales.map(s => s.id));
    const drivePurchaseIds = new Set(AppData.purchases.map(p => p.id));

    // Find offline-only sales and purchases not yet in Drive
    const offlineSales = (localData.sales || []).filter(s => !driveSaleIds.has(s.id));
    const offlinePurchases = (localData.purchases || []).filter(p => !drivePurchaseIds.has(p.id));

    if (offlineSales.length > 0 || offlinePurchases.length > 0) {
      AppData.sales = [...AppData.sales, ...offlineSales].sort((a, b) => a.date.localeCompare(b.date));
      AppData.purchases = [...AppData.purchases, ...offlinePurchases];

      // Keep bill counter accurate for new format
      offlineSales.forEach(s => {
        if (s.id && s.id.startsWith('AVN-')) {
          AppData.settings.lastBillNumber = (AppData.settings.lastBillNumber || 0) + 1;
        }
      });

      console.log(`Merged ${offlineSales.length} offline bills, ${offlinePurchases.length} offline purchases`);
      return { sales: offlineSales.length, purchases: offlinePurchases.length };
    }
  } catch (e) {
    console.error('Merge error', e);
  }
  return { sales: 0, purchases: 0 };
}
function serialize() {
  return JSON.stringify(AppData, null, 2);
}

function deserialize(json) {
  try {
    const d = JSON.parse(json);
    if (d.settings) AppData.settings = { ...AppData.settings, ...d.settings };
    if (Array.isArray(d.products)) AppData.products = d.products.sort((a, b) => a.name.localeCompare(b.name));
    if (Array.isArray(d.vendors)) AppData.vendors = d.vendors;
    if (Array.isArray(d.sales)) AppData.sales = d.sales;
    if (Array.isArray(d.purchases)) AppData.purchases = d.purchases;
    if (Array.isArray(d.customers)) AppData.customers = d.customers;
    if (Array.isArray(d.adjustments)) AppData.adjustments = d.adjustments;
    return true;
  } catch (e) {
    console.error('Deserialize error', e);
    return false;
  }
}

// ---- Report helpers ----
function salesInRange(from, to) {
  return AppData.sales.filter(s => s.date >= from && s.date <= to);
}

function reportSummary(salesArr) {
  const revenue = salesArr.reduce((a, s) => a + (s.total || 0), 0);
  const profit = salesArr.reduce((a, s) => a + (s.profit || 0), 0);
  const gst = salesArr.reduce((a, s) => a + (calcBill(s.items || []).gst || 0), 0);
  const items = salesArr.reduce((a, s) => a + (s.items || []).reduce((b, it) => b + (parseInt(it.qty) || 0), 0), 0);
  return { revenue, profit, gst, bills: salesArr.length, items };
}
