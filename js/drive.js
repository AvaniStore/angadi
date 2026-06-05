// ============================================================
//  DRIVE — Save and load with smart merge
// ============================================================

const DRIVE_FILE_ID_KEY = 'avani_drive_file_id';
let driveFileId = localStorage.getItem(DRIVE_FILE_ID_KEY) || null;

// ---- Core: find the Drive file ----
async function findDriveFile() {
  const resp = await gapi.client.drive.files.list({
    q: `name='${CONFIG.DRIVE_FILE_NAME}' and trashed=false`,
    fields: 'files(id, name, modifiedTime)',
    spaces: 'drive',
    orderBy: 'modifiedTime desc',
  });
  const files = resp.result.files || [];

  // Delete duplicates, keep only the newest
  if (files.length > 1) {
    for (let i = 1; i < files.length; i++) {
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${files[i].id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } catch(e) {}
    }
  }

  if (files.length > 0) {
    driveFileId = files[0].id;
    localStorage.setItem(DRIVE_FILE_ID_KEY, driveFileId);
    return driveFileId;
  }
  return null;
}

// ---- Smart merge: combine Drive + local, never lose bills ----
function smartMerge(driveJson, localJson) {
  try {
    const drive = JSON.parse(driveJson);
    const local = localJson ? JSON.parse(localJson) : null;

    // Start with Drive data as base
    const merged = { ...drive };

    if (!local) return merged;

    // Merge sales — keep all unique bill IDs from both
    const allSaleIds = new Set(drive.sales.map(s => s.id));
    const localOnlySales = (local.sales || []).filter(s => !allSaleIds.has(s.id));
    merged.sales = [...drive.sales, ...localOnlySales]
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Merge purchases — keep all unique PO IDs from both
    const allPOIds = new Set(drive.purchases.map(p => p.id));
    const localOnlyPOs = (local.purchases || []).filter(p => !allPOIds.has(p.id));
    merged.purchases = [...drive.purchases, ...localOnlyPOs];

    // Use whichever has higher bill sequence number
    if ((local.settings?.lastBillNumber || 0) > (merged.settings?.lastBillNumber || 0)) {
      merged.settings.lastBillNumber = local.settings.lastBillNumber;
      merged.settings.lastBillDate = local.settings.lastBillDate;
      merged.settings.lastBillSeq = local.settings.lastBillSeq;
    }

    const newSales = localOnlySales.length;
    const newPOs = localOnlyPOs.length;
    if (newSales > 0 || newPOs > 0) {
      console.log(`Smart merge: added ${newSales} local bills + ${newPOs} local POs`);
    }
    return { merged, newSales, newPOs };
  } catch(e) {
    console.error('Smart merge error', e);
    return { merged: JSON.parse(driveJson), newSales: 0, newPOs: 0 };
  }
}

// ---- Load from Drive with smart merge ----
async function loadFromDrive() {
  try {
    const fileId = await findDriveFile();

    if (fileId) {
      const driveContent = await downloadDriveFile(fileId);
      if (driveContent) {
        // Get local snapshot before overwriting
        const localContent = localStorage.getItem(LOCAL_KEY);
        // Smart merge Drive + local
        const { merged, newSales, newPOs } = smartMerge(driveContent, localContent);
        // Apply merged data
        Object.assign(AppData, merged);
        if (merged.settings) AppData.settings = { ...AppData.settings, ...merged.settings };
        if (Array.isArray(merged.products)) AppData.products = merged.products.sort((a,b) => a.name.localeCompare(b.name));
        if (Array.isArray(merged.vendors)) AppData.vendors = merged.vendors;
        if (Array.isArray(merged.sales)) AppData.sales = merged.sales;
        if (Array.isArray(merged.purchases)) AppData.purchases = merged.purchases;
        if (Array.isArray(merged.returns)) AppData.returns = merged.returns;
        if (Array.isArray(merged.adjustments)) AppData.adjustments = merged.adjustments;

        if (newSales > 0 || newPOs > 0) {
          showToast(`Synced — merged ${newSales} offline bill${newSales!==1?'s':''}  ✓`);
          // Push merged data back to Drive immediately
          setTimeout(() => saveToGoogle(), 1000);
        } else {
          showToast('Data loaded from Google Drive ✓');
        }
      }
    } else {
      // No Drive file yet — load from local
      const hasLocal = loadLocal();
      if (hasLocal) showToast('Loaded from local storage');
      else showToast('Starting fresh');
    }
  } catch(e) {
    console.error('Drive load error', e);
    const hasLocal = loadLocal();
    if (hasLocal) showToast('Offline — loaded from local storage');
    else showToast('Could not load data');
  }
}

// ---- Download file content ----
async function downloadDriveFile(fileId) {
  try {
    const resp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!resp.ok) return null;
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
        // File gone — create new
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
  } catch(e) {
    console.error('Drive save error', e);
    if (statusEl) statusEl.textContent = 'Save failed';
    showToast('Save failed — data kept locally');
  }
}

// ---- Manual refresh ----
async function refreshFromDrive() {
  if (!accessToken) { showToast('Please sign in first'); return; }
  const statusEl = document.getElementById('save-status');
  if (statusEl) statusEl.textContent = 'Refreshing...';
  driveFileId = null;
  localStorage.removeItem(DRIVE_FILE_ID_KEY);
  await loadFromDrive();
  saveLocal();
  renderCurrentPage();
  updateSidebarShopInfo();
  if (statusEl) statusEl.textContent = '';
}

// ---- Auto-save ----
function autoSave() {
  saveLocal();
  clearTimeout(window._autoSaveTimer);
  if (accessToken) {
    window._autoSaveTimer = setTimeout(() => saveToGoogle(), 2000);
    const statusEl = document.getElementById('save-status');
    if (statusEl) statusEl.textContent = 'Unsaved changes';
  }
}
