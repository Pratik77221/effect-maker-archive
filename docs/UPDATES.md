# Updating from GitHub

Version 0.4.5 adds **Update from GitHub** to the footer of the extension controls. Install 0.4.5 manually once to get this feature. Updates use the stable releases of `Pratik77221/effect-maker-archive`; they do not follow arbitrary repositories, branches or untagged changes.

## Check and install

1. Finish any project operation, then click **Update from GitHub**. Allow access to the GitHub API if Chrome asks. The panel shows the installed and latest release versions; GitHub backup sign-in is not required.
2. Choose **Choose extension folder** and select the exact folder you selected under **Load unpacked**. It must contain `manifest.json` for the running version. Allow read/write access in Chrome's picker.
3. If a newer version is available, choose **Install update**. Allow GitHub release downloads if asked.
4. Keep the controls open. The updater checks the complete ZIP's SHA-256 against GitHub's release metadata, validates its paths and manifest, downloads everything before replacement, and saves the previous contents of changed files locally. It writes the manifest last, verifies the files and reloads the extension.
5. Reopen the extension and confirm the new version. GitHub backup sign-in may need to be repeated because its token is held in session storage.

The directory handle is remembered locally. Chrome can ask for file access again, so a saved folder is not a promise of permanent permission. **Forget folder** clears the remembered handle. Choose the exact loaded folder: another identical copy may pass content checks, but updating that copy does not update Chrome's active installation. The panel reports a version mismatch after reload when it can detect this.

These are user-triggered installations, not silent background auto-updates. The UI blocks updates during project operations. Cancel works during checking, downloading and package validation; it is disabled while files are being replaced so the operation can finish or attempt recovery.

## Download-only option

**Download ZIP** opens the exact release asset. Extract it into the installed extension folder, reload the extension at `chrome://extensions`, then reopen the controls. This is also the fallback if folder access or ZIP decompression is unavailable, the checksum is absent, or the release changes browser requirements or permissions.

Chrome's [standard update mechanism](https://developer.chrome.com/docs/extensions/develop/concepts/extensions-update-lifecycle) uses supported extension distribution channels; it does not turn an unpacked GitHub ZIP installation into a Store-managed extension. Direct folder installation here uses Chrome's [File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) and your selected directory.

## Recovery and local backup

The selected folder contains `.effect-maker-archive-update-backup.json` after an installation attempt. It holds the previous contents of replaced extension package files as base64 and records which files were newly created. It does not copy Chrome storage, other folders or exported effect archives.

If a write fails, the updater attempts to restore previous contents and remove files it just created. A browser crash or revoked filesystem access can prevent complete recovery; filesystem replacement is not an atomic transaction. If the extension no longer opens or recovery fails, download the release ZIP from GitHub and replace its files manually before reloading. The backup remains available for recovery of customized extension files. This updater overwrites packaged files, so maintain a separate copy of source customizations you want to keep.

The release checks, ZIP parsing, filesystem write/recovery logic and UI handlers have automated tests. Chrome's real permission dialogs, persistent directory grant and self-reload sequence were not live-tested in this release because the browser connection was unavailable. The browser preview under `dev/update-preview.html` uses simulated services and never writes extension files.
