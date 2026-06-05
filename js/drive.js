// ============================================================
//  DRIVE — Save and load data from Google Drive
// ============================================================

const DRIVE_FILE_ID_KEY = 'avani_drive_file_id';

let driveFileId = localStorage.getItem(DRIVE_FILE_ID_KEY) || null;

async function loadFromDrive() {
  try {
    // Always search by name to find the most recently modified file
    // This ensures both devices always sync to the same file
    const resp = await gapi.client.drive.files.list({
      q: `name='${CONFIG.DRIVE_FILE_NAME}' and trashed=false`,
      fields: 'files(id, name, modifiedTime)',
      spaces: 'drive',
      orderBy: 'modifiedTime desc',
    });

    const files = resp.result.files;
    if (files && files.length > 0) {
      // Always use the most recently modified file
      driveFileId = files[0].id;
      localStorage.setItem(DRIVE_FILE_ID_KEY, driveFileId);

      // If there are duplicates, delete the older ones silently
      if (files.length > 1) {
        console.log(`Found ${files.length} data files, cleaning up duplicates...`);
        for (let i = 1; i < files.length; i++) {
          try {
            await fetch(`https://www.googleapis.com/drive/v3/files/${files[i].id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${accessToken}` }
            });
          } catch(e) { /* ignore delete errors */ }
        }
      }

      const content = await downloadDriveFile(driveFileId);
      if (content) {
        deserialize(content);
        showToast('Data loaded from Google Drive ✓');
      }
    } else {
      // No file found — try cached ID as fallback
      if (driveFileId) {
        const content = await downloadDriveFile(driveFileId);
        if (content) { deserialize(content); showToast('Data loaded ✓'); return; }
      }
      showToast('No existing data found. Starting fresh.');
    }
  } catch (e) {
    console.error('Drive load error', e);
    const hasLocal = loadLocal();
    if (hasLocal) showToast('Loaded from local storage (offline)');
    else showToast('Could not load data. Check connection.');
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
    console.error('Download error', e);
    return null;
  }
}

async function saveToGoogle() {
  if (!accessToken) {
    showToast('Please sign in first');
    return;
  }

  const statusEl = document.getElementById('save-status');
  if (statusEl) statusEl.textContent = 'Saving...';

  try {
    const content = serialize();

    if (driveFileId) {
      // Update existing file
      const resp = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: content,
        }
      );
      if (!resp.ok) {
        // File might have been deleted — create a new one
        driveFileId = null;
        localStorage.removeItem(DRIVE_FILE_ID_KEY);
        await saveToGoogle();
        return;
      }
    } else {
      // Create new file
      const metadata = {
        name: CONFIG.DRIVE_FILE_NAME,
        mimeType: 'application/json',
      };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([content], { type: 'application/json' }));

      const resp = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form,
        }
      );
      const result = await resp.json();
      driveFileId = result.id;
      localStorage.setItem(DRIVE_FILE_ID_KEY, driveFileId); // Cache file ID
    }

    saveLocal(); // Keep local in sync too
    if (statusEl) {
      statusEl.textContent = 'Saved ✓';
      setTimeout(() => { statusEl.textContent = ''; }, 3000);
    }
    showToast('Saved to Google Drive ✓');
  } catch (e) {
    console.error('Drive save error', e);
    if (statusEl) statusEl.textContent = 'Save failed';
    showToast('Save failed. Check your connection.');
  }
}

// Manual refresh — pulls latest from Drive, overwrites local
async function refreshFromDrive() {
  if (!accessToken) { showToast('Please sign in first'); return; }
  const statusEl = document.getElementById('save-status');
  if (statusEl) statusEl.textContent = 'Refreshing...';
  showToast('Fetching latest data from Drive...');
  // Clear cached ID to force a fresh search
  driveFileId = null;
  localStorage.removeItem(DRIVE_FILE_ID_KEY);
  await loadFromDrive();
  saveLocal();
  renderCurrentPage();
  updateSidebarShopInfo();
  if (statusEl) statusEl.textContent = '';
  showToast('Refreshed from Google Drive ✓');
}

// Auto-save after any data change
function autoSave() {
  saveLocal(); // Always save locally immediately
  clearTimeout(window._autoSaveTimer);
  if (accessToken) {
    window._autoSaveTimer = setTimeout(() => saveToGoogle(), 2000);
    const statusEl = document.getElementById('save-status');
    if (statusEl) statusEl.textContent = 'Unsaved changes';
  }
}
