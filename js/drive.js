// ============================================================
//  DRIVE — Save and load data from Google Drive
// ============================================================

let driveFileId = null;

async function loadFromDrive() {
  try {
    // Search for existing file
    const resp = await gapi.client.drive.files.list({
      q: `name='${CONFIG.DRIVE_FILE_NAME}' and trashed=false`,
      fields: 'files(id, name, modifiedTime)',
      spaces: 'drive',
    });

    const files = resp.result.files;
    if (files && files.length > 0) {
      driveFileId = files[0].id;
      const content = await downloadDriveFile(driveFileId);
      if (content) {
        deserialize(content);
        showToast('Data loaded from Google Drive ✓');
      }
    } else {
      showToast('No existing data found. Starting fresh.');
    }
  } catch (e) {
    console.error('Drive load error', e);
    showToast('Could not load from Drive. Working offline.');
  }
}

async function downloadDriveFile(fileId) {
  try {
    const resp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
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
    const blob = new Blob([content], { type: 'application/json' });

    if (driveFileId) {
      // Update existing file
      await fetch(
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
    } else {
      // Create new file
      const metadata = {
        name: CONFIG.DRIVE_FILE_NAME,
        mimeType: 'application/json',
      };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

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
    }

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
  await loadFromDrive();
  saveLocal();
  renderCurrentPage();
  updateSidebarShopInfo();
  if (statusEl) statusEl.textContent = '';
  showToast('Refreshed from Google Drive ✓');
}

// Auto-save after any data change
function autoSave() {
  clearTimeout(window._autoSaveTimer);
  window._autoSaveTimer = setTimeout(() => {
    if (accessToken) saveToGoogle();
  }, 2000);
  const statusEl = document.getElementById('save-status');
  if (statusEl) statusEl.textContent = 'Unsaved changes';
}
