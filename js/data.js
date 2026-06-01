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
  },
  products: [],
  vendors: [],
  sales: [],
  purchases: [],
  returns: [],       // customer returns
  adjustments: [],   // stock write-offs (expiry, damage, internal use)
};

// ---- ID & date helpers ----
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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
  if (p.stock <= 0) return `<span class="badge badge-out">Out of stock</span>`;
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

// ---- Serialize / deserialize for Drive ----
function serialize() {
  return JSON.stringify(AppData, null, 2);
}

function deserialize(json) {
  try {
    const d = JSON.parse(json);
    if (d.settings) AppData.settings = { ...AppData.settings, ...d.settings };
    if (Array.isArray(d.products)) AppData.products = d.products;
    if (Array.isArray(d.vendors)) AppData.vendors = d.vendors;
    if (Array.isArray(d.sales)) AppData.sales = d.sales;
    if (Array.isArray(d.purchases)) AppData.purchases = d.purchases;
    if (Array.isArray(d.returns)) AppData.returns = d.returns;
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
