// ============================================================
//  DRIVE — Pure fetch, no gapi dependency
// ============================================================

const DRIVE_FILE_ID_KEY = 'avani_drive_file_id';
let driveFileId = localStorage.getItem(DRIVE_FILE_ID_KEY) || null;

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

function driveHeaders() {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
}

// ---- Find the Drive file ----
async function findDriveFile() {
  const q = encodeURIComponent(`name='${CONFIG.DRIVE_FILE_NAME}' and trashed=false`);
  const url = `${DRIVE_API}/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&spaces=drive`;

  const resp = await fetch(url, { headers: driveHeaders() });
  console.log('findDriveFile status:', resp.status);

  if (!resp.ok) {
    const err = await resp.text();
    console.error('findDriveFile error:', err);
    throw new Error(`Drive search failed: ${resp.status}`);
  }

  const data = await resp.json();
  const files = data.files || [];
  console.log(`Found ${files.length} Drive file(s)`);

  // Delete duplicates
  if (files.length > 1) {
    for (let i = 1; i < files.length; i++) {
      await fetch(`${DRIVE_API}/files/${files[i].id}`, {
        method: 'DELETE',
        headers: driveHeaders()
      }).catch(() => {});
    }
  }

  if (files.length > 0) {
    driveFileId = files[0].id;
    localStorage.setItem(DRIVE_FILE_ID_KEY, driveFileId);
    console.log('Using file:', driveFileId);
    return driveFileId;
  }

  driveFileId = null;
  localStorage.removeItem(DRIVE_FILE_ID_KEY);
  return null;
}

// ---- Download file ----
async function downloadDriveFile(fileId) {
  const resp = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, { headers: driveHeaders() });
  console.log('downloadDriveFile status:', resp.status);
  if (!resp.ok) return null;
  return await resp.text();
}

// ---- Smart merge ----
function smartMerge(driveJson, localJson) {
  const result = { merged: null, newSales: 0, newPOs: 0 };
  try {
    const drive = JSON.parse(driveJson);
    result.merged = drive;
    if (!localJson) return result;
    const local = JSON.parse(localJson);
    if (!local || !local.sales) return result;

    const driveSaleIds = new Set((drive.sales || []).map(s => s.id));
    const localOnlySales = (local.sales || []).filter(s => s.id && !driveSaleIds.has(s.id));

    const drivePOIds = new Set((drive.purchases || []).map(p => p.id));
    const localOnlyPOs = (local.purchases || []).filter(p => p.id && !drivePOIds.has(p.id));

    if (localOnlySales.length > 0 || localOnlyPOs.length > 0) {
      result.merged = {
        ...drive,
        sales: [...(drive.sales||[]), ...localOnlySales].sort((a,b)=>(a.date||'').localeCompare(b.date||'')),
        purchases: [...(drive.purchases||[]), ...localOnlyPOs],
        settings: {
          ...(drive.settings||{}),
          lastBillNumber: Math.max(drive.settings?.lastBillNumber||0, local.settings?.lastBillNumber||0),
          lastBillDate: drive.settings?.lastBillDate || local.settings?.lastBillDate || '',
          lastBillSeq: Math.max(drive.settings?.lastBillSeq||0, local.settings?.lastBillSeq||0),
        }
      };
      result.newSales = localOnlySales.length;
      result.newPOs = localOnlyPOs.length;
    }
  } catch(e) {
    console.error('smartMerge error:', e);
  }
  return result;
}

// ---- Apply data ----
function applyData(data) {
  if (!data) return;
  if (data.settings) AppData.settings = { ...AppData.settings, ...data.settings };
  if (Array.isArray(data.products)) AppData.products = data.products.sort((a,b) => a.name.localeCompare(b.name));
  if (Array.isArray(data.vendors)) AppData.vendors = data.vendors;
  if (Array.isArray(data.sales)) AppData.sales = data.sales;
  if (Array.isArray(data.purchases)) AppData.purchases = data.purchases;
  if (Array.isArray(data.returns)) AppData.returns = data.returns || [];
  if (Array.isArray(data.adjustments)) AppData.adjustments = data.adjustments || [];
}

// ---- Load from Drive ----
async function loadFromDrive() {
  try {
    const fileId = await findDriveFile();

    if (!fileId) {
      const hasLocal = loadLocal();
      showToast(hasLocal ? 'Loaded from local storage' : 'Starting fresh');
      showReconnectBtn(true);
      return;
    }

    const driveContent = await downloadDriveFile(fileId);
    if (!driveContent) {
      const hasLocal = loadLocal();
      showToast(hasLocal ? 'Drive error — loaded locally' : 'Could not load data');
      showReconnectBtn(true);
      return;
    }

    const localContent = localStorage.getItem(LOCAL_KEY);
    const { merged, newSales, newPOs } = smartMerge(driveContent, localContent);

    if (!merged) { showToast('Error reading data'); return; }

    applyData(merged);
    showReconnectBtn(false);
    _driveConnected = true;
    updateOnlineStatus();

    if (newSales > 0 || newPOs > 0) {
      showToast(`Merged ${newSales} offline bill${newSales!==1?'s':''} ✓`);
      setTimeout(() => saveToGoogle(), 1500);
    } else {
      showToast('Data loaded ✓');
    }

  } catch(e) {
    console.error('loadFromDrive error:', e);
    const hasLocal = loadLocal();
    showToast(hasLocal ? 'Offline — loaded locally' : 'Could not load data');
    showReconnectBtn(true);
  }
}

// ---- Save to Drive ----
async function saveToGoogle() {
  if (!accessToken) { showToast('Please sign in first'); return; }
  const statusEl = document.getElementById('save-status');
  if (statusEl) statusEl.textContent = 'Saving...';

  try {
    const content = serialize();

    if (driveFileId) {
      const resp = await fetch(
        `${DRIVE_UPLOAD}/files/${driveFileId}?uploadType=media`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: content }
      );
      if (!resp.ok) {
        driveFileId = null;
        localStorage.removeItem(DRIVE_FILE_ID_KEY);
        await saveToGoogle();
        return;
      }
    } else {
      const meta = JSON.stringify({ name: CONFIG.DRIVE_FILE_NAME, mimeType: 'application/json' });
      const form = new FormData();
      form.append('metadata', new Blob([meta], { type: 'application/json' }));
      form.append('file', new Blob([content], { type: 'application/json' }));
      const resp = await fetch(
        `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id`,
        { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form }
      );
      const result = await resp.json();
      driveFileId = result.id;
      localStorage.setItem(DRIVE_FILE_ID_KEY, driveFileId);
    }

    saveLocal();
    showReconnectBtn(false);
    _driveConnected = true;
    updateOnlineStatus();
    if (statusEl) { statusEl.textContent = 'Saved ✓'; setTimeout(() => { statusEl.textContent=''; }, 3000); }
    console.log('Saved to Drive:', driveFileId);

  } catch(e) {
    console.error('saveToGoogle error:', e);
    if (statusEl) statusEl.textContent = 'Save failed';
    saveLocal();
  }
}

// ---- Manual refresh ----
async function refreshFromDrive() {
  if (!accessToken) { showToast('Please sign in first'); return; }
  driveFileId = null;
  localStorage.removeItem(DRIVE_FILE_ID_KEY);
  await loadFromDrive();
  saveLocal();
  renderCurrentPage();
  updateSidebarShopInfo();
  showToast('Refreshed ✓');
}

// ---- Reconnect ----
async function reconnectDrive() {
  showToast('Reconnecting...');
  if (tokenClient) tokenClient.requestAccessToken({ prompt: '' });
  else showToast('Please sign out and sign back in');
}

function showReconnectBtn(show) {
  const btn = document.getElementById('reconnect-btn');
  if (btn) btn.style.display = show ? '' : 'none';
}

// ---- Debug ----
function showSyncDebug() {
  const info = [
    `Drive file ID: ${driveFileId || 'none'}`,
    `Drive connected: ${_driveConnected}`,
    `Local bills: ${AppData.sales.length}`,
    `Last bill: ${AppData.sales.length ? AppData.sales[AppData.sales.length-1].id : 'none'}`,
    `Access token: ${accessToken ? 'present' : 'missing'}`,
  ];
  alert('Sync status:\n\n' + info.join('\n'));
}

// ---- Auto-save ----
function autoSave() {
  saveLocal();
  localStorage.setItem('avani_last_save', new Date().toLocaleTimeString());
  clearTimeout(window._autoSaveTimer);
  if (accessToken) {
    window._autoSaveTimer = setTimeout(() => saveToGoogle(), 2000);
    const statusEl = document.getElementById('save-status');
    if (statusEl) statusEl.textContent = 'Unsaved changes';
  }
}
