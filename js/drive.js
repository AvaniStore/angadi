// ============================================================
//  DRIVE — Save and load with smart merge
// ============================================================

const DRIVE_FILE_ID_KEY = 'avani_drive_file_id';
let driveFileId = localStorage.getItem(DRIVE_FILE_ID_KEY) || null;

// ---- Find the one true Drive file ----
async function findDriveFile() {
  const resp = await gapi.client.drive.files.list({
    q: `name='${CONFIG.DRIVE_FILE_NAME}' and trashed=false`,
    fields: 'files(id, name, modifiedTime)',
    spaces: 'drive',
    orderBy: 'modifiedTime desc',
  });
  const files = resp.result.files || [];

  // Clean up duplicates — keep only the newest
  if (files.length > 1) {
    console.log(`Found ${files.length} data files — cleaning up duplicates`);
    for (let i = 1; i < files.length; i++) {
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${files[i].id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } catch(e) { console.warn('Could not delete duplicate', e); }
    }
  }

  if (files.length > 0) {
    driveFileId = files[0].id;
    localStorage.setItem(DRIVE_FILE_ID_KEY, driveFileId);
    console.log(`Using Drive file: ${driveFileId} (modified: ${files[0].modifiedTime})`);
    return driveFileId;
  }
  driveFileId = null;
  localStorage.removeItem(DRIVE_FILE_ID_KEY);
  return null;
}

// ---- Smart merge: combine Drive + local, never lose bills ----
function smartMerge(driveJson, localJson) {
  const result = { merged: null, newSales: 0, newPOs: 0 };
  try {
    const drive = JSON.parse(driveJson);
    result.merged = drive;

    if (!localJson) return result;

    const local = JSON.parse(localJson);
    if (!local || !local.sales) return result;

    // Find bills in local that are NOT in Drive
    const driveSaleIds = new Set((drive.sales || []).map(s => s.id));
    const localOnlySales = (local.sales || []).filter(s => s.id && !driveSaleIds.has(s.id));

    const drivePOIds = new Set((drive.purchases || []).map(p => p.id));
    const localOnlyPOs = (local.purchases || []).filter(p => p.id && !drivePOIds.has(p.id));

    if (localOnlySales.length > 0 || localOnlyPOs.length > 0) {
      console.log(`Merging ${localOnlySales.length} local-only bills + ${localOnlyPOs.length} local-only POs`);
      result.merged = {
        ...drive,
        sales: [...(drive.sales || []), ...localOnlySales].sort((a,b) => (a.date||'').localeCompare(b.date||'')),
        purchases: [...(drive.purchases || []), ...localOnlyPOs],
        settings: {
          ...(drive.settings || {}),
          lastBillNumber: Math.max(drive.settings?.lastBillNumber || 0, local.settings?.lastBillNumber || 0),
          lastBillDate: drive.settings?.lastBillDate || local.settings?.lastBillDate || '',
          lastBillSeq: Math.max(drive.settings?.lastBillSeq || 0, local.settings?.lastBillSeq || 0),
        }
      };
      result.newSales = localOnlySales.length;
      result.newPOs = localOnlyPOs.length;
    }
  } catch(e) {
    console.error('Smart merge error', e);
  }
  return result;
}

// ---- Apply data to AppData ----
function applyData(data) {
  if (!data) return;
  if (data.settings) AppData.settings = { ...AppData.settings, ...data.settings };
  if (Array.isArray(data.products)) AppData.products = data.products.sort((a,b) => a.name.localeCompare(b.name));
  if (Array.isArray(data.vendors)) AppData.vendors = data.vendors;
  if (Array.isArray(data.sales)) AppData.sales = data.sales;
  if (Array.isArray(data.purchases)) AppData.purchases = data.purchases;
  if (Array.isArray(data.returns)) AppData.returns = data.returns;
  if (Array.isArray(data.adjustments)) AppData.adjustments = data.adjustments;
}

// ---- Load from Drive with smart merge ----
async function loadFromDrive() {
  try {
    const fileId = await findDriveFile();

    if (!fileId) {
      // No Drive file — load local as fallback
      const hasLocal = loadLocal();
      showToast(hasLocal ? 'Loaded from local storage' : 'Starting fresh');
      return;
    }

    const driveContent = await downloadDriveFile(fileId);
    if (!driveContent) {
      const hasLocal = loadLocal();
      showToast(hasLocal ? 'Drive error — loaded locally' : 'Could not load data');
      return;
    }

    // Get local snapshot before applying Drive data
    const localContent = localStorage.getItem(LOCAL_KEY);

    // Smart merge Drive + local
    const { merged, newSales, newPOs } = smartMerge(driveContent, localContent);

    if (!merged) {
      showToast('Error reading data');
      return;
    }

    // Apply merged data
    applyData(merged);

    if (newSales > 0 || newPOs > 0) {
      showToast(`Merged ${newSales} offline bill${newSales!==1?'s':''} ✓`);
      // Push merged data back to Drive so both devices get it
      setTimeout(() => saveToGoogle(), 1500);
    } else {
      showToast('Data loaded ✓');
    }

  } catch(e) {
    console.error('Drive load error', e);
    const hasLocal = loadLocal();
    showToast(hasLocal ? 'Offline — loaded locally' : 'Could not load data');
  }
}

// ---- Download file ----
async function downloadDriveFile(fileId) {
  try {
    const resp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!resp.ok) { console.warn('Download failed', resp.status); return null; }
    return await resp.text();
  } catch(e) {
    console.error('Download error', e);
    return null;
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
        `https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: content,
        }
      );
      if (!resp.ok) {
        console.warn('Save failed, trying to create new file');
        driveFileId = null;
        localStorage.removeItem(DRIVE_FILE_ID_KEY);
        await saveToGoogle();
        return;
      }
    } else {
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify({ name: CONFIG.DRIVE_FILE_NAME, mimeType: 'application/json' })], { type: 'application/json' }));
      form.append('file', new Blob([content], { type: 'application/json' }));
      const resp = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
        { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form }
      );
      const result = await resp.json();
      driveFileId = result.id;
      localStorage.setItem(DRIVE_FILE_ID_KEY, driveFileId);
    }

    saveLocal();
    if (statusEl) { statusEl.textContent = 'Saved ✓'; setTimeout(() => { statusEl.textContent = ''; }, 3000); }
    console.log('Saved to Drive:', driveFileId);
  } catch(e) {
    console.error('Drive save error', e);
    if (statusEl) statusEl.textContent = 'Save failed';
    saveLocal();
    showToast('Save failed — kept locally');
  }
}

// ---- Manual refresh ----
async function refreshFromDrive() {
  if (!accessToken) { showToast('Please sign in first'); return; }
  const statusEl = document.getElementById('save-status');
  if (statusEl) statusEl.textContent = 'Refreshing...';
  // Clear cached ID to force a fresh search
  driveFileId = null;
  localStorage.removeItem(DRIVE_FILE_ID_KEY);
  await loadFromDrive();
  saveLocal();
  renderCurrentPage();
  updateSidebarShopInfo();
  if (statusEl) statusEl.textContent = '';
  showToast('Refreshed ✓');
}

// ---- Debug: show sync info ----
function showSyncDebug() {
  const info = [
    `Drive file ID: ${driveFileId || 'none'}`,
    `Local bills: ${AppData.sales.length}`,
    `Last bill: ${AppData.sales.length ? AppData.sales[AppData.sales.length-1].id : 'none'}`,
    `Last saved: ${localStorage.getItem('avani_last_save') || 'unknown'}`,
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
