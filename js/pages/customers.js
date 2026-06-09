// ============================================================
//  PAGE: Customers
// ============================================================

function renderCustomers() {
  if (!AppData.customers) AppData.customers = [];

  // Build from sales history too — pick up customers not yet in directory
  AppData.sales.forEach(s => {
    if (!s.customer || s.customer === 'Walk-in') return;
    const existing = AppData.customers.find(c => c.name.toLowerCase() === s.customer.toLowerCase());
    if (!existing) {
      AppData.customers.push({ id: uid(), name: s.customer, phone: s.phone || '', lastBill: s.date, billCount: 0 });
    }
  });
  // Update bill counts
  AppData.customers.forEach(c => {
    c.billCount = AppData.sales.filter(s => s.customer && s.customer.toLowerCase() === c.name.toLowerCase()).length;
    const bills = AppData.sales.filter(s => s.customer && s.customer.toLowerCase() === c.name.toLowerCase());
    c.lastBill = bills.length ? bills.sort((a,b) => b.date.localeCompare(a.date))[0].date : c.lastBill;
    c.totalSpent = bills.reduce((a,s) => a+(s.total||0), 0);
  });
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
          <button class="btn btn-xs" onclick="viewCustomerBills('${c.name.replace(/'/g,\`\\'\`)}')">Bills</button>
          <button class="btn btn-xs btn-danger" onclick="deleteCustomer('${c.id}')">Del</button>
        </div>
      </td>
    </tr>`).join('') || `<tr><td colspan="6"><div class="empty-state"><p>No customers yet. They get added automatically when you save a bill with a customer name.</p></div></td></tr>`;

  document.getElementById('page-customers').innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Customers</h2>
      <button class="btn btn-primary btn-sm" onclick="openAddCustomer()">+ Add customer</button>
    </div>

    <div id="customer-form-container"></div>

    <div style="margin-bottom:12px">
      <input id="cust-search" type="text" placeholder="Search by name or phone..."
        oninput="renderCustomers()"
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
    AppData.customers.push({ id: uid(), name, phone, lastBill: '', billCount: 0, totalSpent: 0 });
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

function viewCustomerBills(name) {
  salesCustomerFilter = name;
  showPage('sales', document.querySelector('[data-page="sales"]'));
}
