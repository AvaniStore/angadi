// ============================================================
//  DRIVE — Simple, proven working version
// ============================================================

const DRIVE_FILE_ID_KEY = 'avani_drive_file_id';
const DRIVE_FILE_ID_KEY2 = 'avani_fid'; // backup key

let driveFileId = localStorage.getItem(DRIVE_FILE_ID_KEY) || localStorage.getItem(DRIVE_FILE_ID_KEY2) || null;

function saveDriveFileId(id) {
  driveFileId = id;
  if (id) {
    localStorage.setItem(DRIVE_FILE_ID_KEY, id);
    localStorage.setItem(DRIVE_FILE_ID_KEY2, id);
    sessionStorage.setItem(DRIVE_FILE_ID_KEY, id);
  } else {
    localStorage.removeItem(DRIVE_FILE_ID_KEY);
    localStorage.removeItem(DRIVE_FILE_ID_KEY2);
    sessionStorage.removeItem(DRIVE_FILE_ID_KEY);
  }
}

async function loadFromDrive() {
  try {
    // Try cached file ID first — fastest path
    if (driveFileId) {
      const content = await downloadDriveFile(driveFileId);
      if (content) {
        deserialize(content);
        showToast('Data loaded ✓');
        return;
      }
      // Cached ID failed — search for file
      console.log('Cached ID failed, searching Drive...');
    }

    // Search Drive for the file
    const resp = await gapi.client.drive.files.list({
      q: `name='${CONFIG.DRIVE_FILE_NAME}' and trashed=false`,
      fields: 'files(id, name, modifiedTime)',
      spaces: 'drive',
      orderBy: 'modifiedTime desc',
    });

    const files = resp.result.files;
    if (files && files.length > 0) {
      saveDriveFileId(files[0].id);

      // Delete duplicates
      if (files.length > 1) {
        for (let i = 1; i < files.length; i++) {
          fetch(`https://www.googleapis.com/drive/v3/files/${files[i].id}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` }
          }).catch(() => {});
        }
      }

      const content = await downloadDriveFile(driveFileId);
      if (content) {
        deserialize(content);
        showToast('Data loaded ✓');
      }
    } else {
      // No file on Drive — load local, but DON'T clear the stored file ID
      const hasLocal = loadLocal();
      showToast(hasLocal ? 'Loaded from local storage' : 'Starting fresh');
    }
  } catch (e) {
    console.error('Drive load error', e);
    // On error — load local but keep the stored file ID intact
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
      saveDriveFileId(result.id);
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
  saveDriveFileId(null);
  await loadFromDrive();
  saveLocal();
  renderCurrentPage();
  updateSidebarShopInfo();
  showToast('Refreshed ✓');
}

function showSyncDebug() {
  const ls1 = localStorage.getItem(DRIVE_FILE_ID_KEY);
  const ls2 = localStorage.getItem(DRIVE_FILE_ID_KEY2);
  const ss = sessionStorage.getItem(DRIVE_FILE_ID_KEY);
  const info = [
    `Drive file ID (memory): ${driveFileId || 'none'}`,
    `Drive file ID (localStorage): ${ls1 || 'none'}`,
    `Drive file ID (backup): ${ls2 || 'none'}`,
    `Local bills: ${AppData.sales.length}`,
    `Last bill: ${AppData.sales.length ? AppData.sales[AppData.sales.length-1].id : 'none'}`,
    `Access token: ${accessToken ? 'present' : 'missing'}`,
  ];
  alert('Sync status:\n\n' + info.join('\n'));
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
