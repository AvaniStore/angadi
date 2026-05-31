// ============================================================
//  PAGE: Settings
// ============================================================

function renderSettings() {
  const s = AppData.settings;
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
          <div class="form-group"><label>City</label><input id="s-city" value="${s.city || ''}" placeholder="Mangaluru"></div>
          <div class="form-group"><label>State</label><input id="s-state" value="${s.state || ''}" placeholder="Karnataka"></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label>GSTIN</label><input id="s-gstin" value="${s.gstin || ''}" placeholder="29AABCS1234K1Z5"></div>
          <div class="form-group"><label>Email (optional)</label><input id="s-email" type="email" value="${s.email || ''}" placeholder="shop@email.com"></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="saveSettings()">Save settings</button>
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
        </div>
      </div>
    </div>

    <div class="card">
      <div class="settings-section" style="margin-bottom:0">
        <h3>About</h3>
        <p style="font-size:13px;color:var(--text2)">Vyapaar v${CONFIG.VERSION} &nbsp;·&nbsp; Built for small business owners &nbsp;·&nbsp; Data stored in your Google Drive</p>
      </div>
    </div>
  `;
}

function saveSettings() {
  AppData.settings.shopName = document.getElementById('s-name').value.trim() || 'My Shop';
  AppData.settings.phone = document.getElementById('s-phone').value.trim();
  AppData.settings.address = document.getElementById('s-address').value.trim();
  AppData.settings.city = document.getElementById('s-city').value.trim();
  AppData.settings.state = document.getElementById('s-state').value.trim();
  AppData.settings.gstin = document.getElementById('s-gstin').value.trim();
  AppData.settings.email = document.getElementById('s-email').value.trim();
  updateSidebarShopInfo();
  autoSave();
  showToast('Settings saved ✓');
}

function exportData() {
  const blob = new Blob([serialize()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vyapaar-backup-${today()}.json`;
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
