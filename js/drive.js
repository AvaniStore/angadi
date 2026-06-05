// ============================================================
//  DRIVE — Simple, proven working version
// ============================================================

const DRIVE_FILE_ID_KEY = 'avani_drive_file_id';
let driveFileId = localStorage.getItem(DRIVE_FILE_ID_KEY) || null;

async function loadFromDrive() {
  try {
    const resp = await gapi.client.drive.files.list({
      q: `name='${CONFIG.DRIVE_FILE_NAME}' and trashed=false`,
      fields: 'files(id, name, modifiedTime)',
      spaces: 'drive',
      orderBy: 'modifiedTime desc',
    });

    const files = resp.result.files;
    if (files && files.length > 0) {
      driveFileId = files[0].id;
      localStorage.setItem(DRIVE_FILE_ID_KEY, driveFileId);
      const content = await downloadDriveFile(driveFileId);
      if (content) {
        deserialize(content);
        showToast('Data loaded ✓');
      }
    } else {
      const hasLocal = loadLocal();
      showToast(hasLocal ? 'Loaded from local storage' : 'Starting fresh');
    }
  } catch (e) {
    console.error('Drive load error', e);
    const hasLocal = loadLocal();
    showToast(hasLocal ? 'Offline — loaded locally' : 'Could not load data');
  }
}

async function downloadDriveFile(fileId) {
  try {
    const resp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!resp.ok) return null;
    return await resp.text();
  } catch (e) {
    return null;
  }
}

async function saveToGoogle() {
  if (!accessToken) { showToast('Please sign in first'); return; }
  const statusEl = document.getElementById('save-status');
  if (statusEl) statusEl.textContent = 'Saving...';

  try {
    const content = serialize();

    if (driveFileId) {
      await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=media`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: content }
      );
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
    showToast('Saved to Google Drive ✓');
  } catch (e) {
    console.error('Drive save error', e);
    if (statusEl) statusEl.textContent = 'Save failed';
    showToast('Save failed — data kept locally');
  }
}

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

function showSyncDebug() {
  alert('Sync status:\n\nDrive file ID: ' + (driveFileId || 'none') + '\nLocal bills: ' + AppData.sales.length + '\nLast bill: ' + (AppData.sales.length ? AppData.sales[AppData.sales.length-1].id : 'none'));
}

function showReconnectBtn(show) {
  const btn = document.getElementById('reconnect-btn');
  if (btn) btn.style.display = show ? '' : 'none';
}

function autoSave() {
  saveLocal();
  clearTimeout(window._autoSaveTimer);
  if (accessToken) {
    window._autoSaveTimer = setTimeout(() => saveToGoogle(), 2000);
    const statusEl = document.getElementById('save-status');
    if (statusEl) statusEl.textContent = 'Unsaved changes';
  }
}
