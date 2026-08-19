// ============================================================
//  PAGE: Customers
// ============================================================

function renderCustomers() {
  if (!AppData.customers) AppData.customers = [];

  // Deduplicate by name (case-insensitive) — merge bill counts if duplicates exist
  const seen = new Map();
  AppData.customers.forEach(c => {
    const key = c.name.toLowerCase().trim();
    if (seen.has(key)) {
      // Keep the one with more bills, merge data
      const existing = seen.get(key);
      if ((c.billCount || 0) > (existing.billCount || 0)) {
        existing.billCount = c.billCount;
        existing.totalSpent = c.totalSpent;
        existing.lastBill = c.lastBill;
      }
      // Delete the duplicate from Supabase silently
      if (typeof deleteRecord === 'function') deleteRecord('customers', c.id).catch(()=>{});
    } else {
      seen.set(key, c);
    }
  });
  AppData.customers = [...seen.values()];

  // Update bill counts and remove customers with no bills
  AppData.customers.forEach(c => {
    const bills = AppData.sales.filter(s => s.customer && s.customer.toLowerCase() === c.name.toLowerCase());
    c.billCount = bills.length;
    c.lastBill = bills.length ? bills.sort((a,b) => b.date.localeCompare(a.date))[0].date : c.lastBill;
    c.totalSpent = bills.reduce((a,s) => a+(s.total||0), 0);
  });

  // Remove customers that were auto-added from bills but now have no bills
  // (keeps manually added customers even with 0 bills)
  AppData.customers = AppData.customers.filter(c => c.billCount > 0 || c.manuallyAdded || true);
  AppData.customers.sort((a,b) => a.name.localeCompare(b.name));

  const search = (document.getElementById('cust-search') || {}).value || '';
  const filtered = AppData.customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone||'').includes(search)
  );

  const rows = filtered.map(c => `
    <tr>
      <td style="font-weight:500">${c.name}</td>
      <td style="color:var(--text3)">${c.phone || '—'}</td>
      <td style="text-align:center">${c.billCount}</td>
      <td style="font-weight:500">${fmt(c.totalSpent||0)}</td>
      <td style="color:var(--text3);font-size:12px">${fmtDate(c.lastBill)}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-xs" onclick="editCustomer('${c.id}')">Edit</button>
          <button class="btn btn-xs" onclick="viewCustomerBills(this.dataset.name)" data-name="${c.name.replace(/"/g,'&quot;')}">Bills</button>
          <button class="btn btn-xs btn-danger" onclick="deleteCustomer('${c.id}')">Del</button>
        </div>
      </td>
    </tr>`).join('') || `<tr><td colspan="6"><div class="empty-state"><p>No customers yet. They get added automatically when you save a bill with a customer name.</p></div></td></tr>`;

  // Walk-in summary
  const walkInBills = AppData.sales.filter(s => !s.customer || s.customer === 'Walk-in' || s.customer === 'Walk In');
  const walkInRevenue = walkInBills.reduce((a,s) => a+(s.total||0), 0);
  const walkInLast = walkInBills.length ? walkInBills.sort((a,b) => b.date.localeCompare(a.date))[0].date : null;

  document.getElementById('page-customers').innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Customers</h2>
      <button class="btn btn-primary btn-sm" onclick="openAddCustomer()">+ Add customer</button>
    </div>

    <div id="customer-form-container"></div>

    <!-- Walk-in summary -->
    ${walkInBills.length ? `
    <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius);padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div style="font-size:22px">🚶</div>
      <div>
        <div style="font-weight:600;font-size:14px">Walk-in customers</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">No name recorded at time of sale</div>
      </div>
      <div style="margin-left:auto;display:flex;gap:20px;flex-wrap:wrap">
        <div style="text-align:center">
          <div style="font-size:18px;font-weight:700">${walkInBills.length}</div>
          <div style="font-size:11px;color:var(--text3)">bills</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:18px;font-weight:700">${fmt(walkInRevenue)}</div>
          <div style="font-size:11px;color:var(--text3)">total spent</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:14px;font-weight:600">${walkInLast ? fmtDate(walkInLast) : '—'}</div>
          <div style="font-size:11px;color:var(--text3)">last visit</div>
        </div>
        <button class="btn btn-sm" onclick="viewCustomerBills('Walk-in')">View bills</button>
      </div>
    </div>` : ''}

    <div style="margin-bottom:12px">
      <input id="cust-search" type="text" placeholder="Search by name or phone..." value="${search}"
        oninput="salesCustomerFilter=this.value;filterCustomerRows(this.value)" onkeydown="event.stopPropagation()"
        style="width:100%;max-width:300px;padding:8px 12px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;background:var(--bg2);color:var(--text)">
    </div>

    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Phone</th><th>Bills</th><th>Total spent</th><th>Last bill</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function openAddCustomer(id) {
  const c = id ? AppData.customers.find(x => x.id === id) : null;
  document.getElementById('customer-form-container').innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">${c ? 'Edit customer' : 'Add customer'}</div>
      <div class="form-grid">
        <div class="form-group"><label>Name *</label><input id="cf-name" value="${c ? c.name : ''}" placeholder="Customer name"></div>
        <div class="form-group"><label>Phone</label><input id="cf-phone" type="tel" value="${c ? c.phone||'' : ''}" placeholder="9XXXXXXXXX"></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" onclick="saveCustomer('${id||''}')">Save</button>
        <button class="btn" onclick="document.getElementById('customer-form-container').innerHTML=''">Cancel</button>
      </div>
    </div>
  `;
  document.getElementById('cf-name').focus();
}

function editCustomer(id) { openAddCustomer(id); }

function saveCustomer(id) {
  const name = document.getElementById('cf-name').value.trim();
  if (!name) { showToast('Name is required'); return; }
  const phone = document.getElementById('cf-phone').value.trim();
  if (!AppData.customers) AppData.customers = [];
  if (id) {
    const c = AppData.customers.find(x => x.id === id);
    if (c) { c.name = name; c.phone = phone; }
  } else {
    AppData.customers.push({ id: uid(), name, phone, lastBill: '', billCount: 0, totalSpent: 0, manuallyAdded: true });
    AppData.customers.sort((a,b) => a.name.localeCompare(b.name));
  }
  autoSave();
  showToast('Customer saved ✓');
  document.getElementById('customer-form-container').innerHTML = '';
  renderCustomers();
}

function deleteCustomer(id) {
  if (!confirmDelete('Delete this customer?')) return;
  AppData.customers = AppData.customers.filter(c => c.id !== id);
  autoSave();
  showToast('Customer deleted');
  renderCustomers();
}

function viewCustomerBills(nameOrEl) {
  const name = typeof nameOrEl === 'string' ? nameOrEl : nameOrEl.dataset?.name || nameOrEl;
  salesCustomerFilter = name;
  showPage('sales', document.querySelector('[data-page="sales"]'));
}

function filterCustomerRows(query) {
  const q = (query || '').toLowerCase().trim();
  const tbody = document.querySelector('#page-customers .table-wrap tbody');
  if (!tbody) return;
  tbody.querySelectorAll('tr').forEach(row => {
    // Always reset to visible first
    row.style.display = '';
    if (q) {
      const name = (row.querySelector('td:nth-child(1)')?.textContent || '').toLowerCase();
      const phone = (row.querySelector('td:nth-child(2)')?.textContent || '').toLowerCase();
      if (!name.includes(q) && !phone.includes(q)) {
        row.style.display = 'none';
      }
    }
  });
}
