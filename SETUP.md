# Vyapaar — Setup Guide

## Step 1: Upload to GitHub

1. Create a new GitHub account at github.com (use shop's email)
2. Click **New repository** → name it `vyapaar` → set to **Public** → click **Create repository**
3. Click **uploading an existing file** on the repo page
4. Upload ALL files maintaining the folder structure:
   - `index.html`
   - `manifest.json`
   - `css/style.css`
   - `js/config.js`
   - `js/data.js`
   - `js/auth.js`
   - `js/drive.js`
   - `js/ui.js`
   - `js/app.js`
   - `js/pages/dashboard.js`
   - `js/pages/inventory.js`
   - `js/pages/billing.js`
   - `js/pages/vendors.js`
   - `js/pages/reports.js`
   - `js/pages/sales.js`
   - `js/pages/settings.js`
5. Click **Commit changes**

## Step 2: Enable GitHub Pages

1. In your repo, go to **Settings** → **Pages** (left sidebar)
2. Under **Source**, select **Deploy from a branch**
3. Select branch: **main**, folder: **/ (root)**
4. Click **Save**
5. Wait 1-2 minutes → your app URL will appear:
   `https://yourusername.github.io/vyapaar`

## Step 3: Set up Google API (for Drive saving)

1. Go to **console.cloud.google.com**
2. Click **New Project** → name it `Vyapaar` → **Create**
3. Go to **APIs & Services** → **Library**
4. Search **Google Drive API** → click it → **Enable**
5. Go to **APIs & Services** → **Credentials**
6. Click **Create Credentials** → **OAuth client ID**
7. If asked, configure **OAuth consent screen** first:
   - User type: **External**
   - App name: `Vyapaar`
   - Support email: your email
   - Save and continue through all steps
8. Back in Credentials → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `Vyapaar`
   - Authorized JavaScript origins: add `https://yourusername.github.io`
   - Click **Create**
9. Copy the **Client ID** (looks like: `123456789-abc...apps.googleusercontent.com`)

## Step 4: Add Client ID to the app

1. Open the file `js/config.js`
2. Replace `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com` with your actual Client ID
3. Commit the change on GitHub

## Step 5: You're live!

Open `https://yourusername.github.io/vyapaar` on any device.
Sign in with the Google account where you want data stored.
Your data saves automatically to that Google Drive.

---

## Using on Phone (Android/iPhone)

Open the app URL in Chrome → tap the **3 dots menu** → **Add to Home Screen**.
It will work like an app icon on your phone!

---

## Need help?
Contact your developer with any issues.
