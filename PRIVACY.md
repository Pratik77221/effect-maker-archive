# Privacy declaration

**Effect Maker Archive · version 0.4.5 · effective 22 September 2026**

Maintained by [Pratik77221](https://github.com/Pratik77221). This declaration describes the extension distributed from [this repository](https://github.com/Pratik77221/effect-maker-archive), including its optional GitHub connection and local CLI.

## Our commitment

**We do not operate a server that collects or retains extension users' projects, credentials or usage activity. The extension includes no analytics, advertising, tracking, telemetry, or automatic error-report uploads. We do not sell extension user data or use it for advertising or model training.**

The extension accesses and processes data needed for the actions you request. It creates local files and can transfer project data directly to Google or GitHub. It would therefore be inaccurate to describe it as accessing or storing no data at all.

## Data used by each feature

| Feature | Data handled | Purpose and destination |
| --- | --- | --- |
| Open controls | Selected editor tab URL, tab/project identifier and extension-window identifiers | Bind the controls to the project you selected and reuse the controls window. Processed locally. |
| Export | Project title/ID/build, authoring source, objects, scripts, prompts, asset definitions, binary files, asset metadata and checksums | Read the selected project and download its referenced assets from Google to create your local JSON archive. |
| Import | The archive you choose and the current destination's project/channel identifiers | Check the file, upload its assets to the destination in Google Effect Maker, remap references and save the source. |
| GitHub sign-in | OAuth device codes, access token, GitHub login and numeric account ID | Authorize GitHub access and display the connected account. Authentication is directly with GitHub. |
| GitHub backup | Accessible repository metadata, branches, backup paths, commit history and selected archive contents | Show your choices; fetch a backup on Pull; send an archive and commit note to your chosen repository on Push. |
| Extension updates | Installed version, public release metadata and extension ZIP | Check the maintainer's public GitHub release only when requested. Download update code without the GitHub backup token or Google credentials. |
| Direct update installation | A directory handle chosen by you and the extension files inside it | Validate the selected folder, keep a local copy of files being replaced, install the verified release and reload the extension. No selected local files are uploaded. |
| Diagnostics | Extension version, stages, times, errors and project/asset identifiers, counts or summaries depending on the operation | Display activity locally and download a test log only when you choose that action. |
| Local CLI | Archives, extracted assets, manifests, diffs and Git checkpoint data | Write to directories you specify on your computer. The CLI does not automatically push to a remote. |

Archives include source project identifiers and can contain the source YouTube channel ID in raw asset metadata. They can also contain private text, prompts, images and models. They are not anonymized. Import uses the current destination for new uploads; original upload records are not reapplied.

The extension does not read or export Google passwords, authentication cookies or authorization headers. Google's editor and the browser use the existing signed-in session to perform the requested asset downloads, uploads and saves. GitHub passwords and two-factor codes are entered on GitHub's own page, not in the extension. The extension receives a GitHub OAuth access token after approval.

## Storage and retention

- **Temporary project data and activity:** held in the extension window and editor memory during use. Completed editor jobs are normally released after the extension receives the result; a cleanup timer removes completed job entries after approximately two minutes. Closing or reloading pages also releases their in-memory state. The UI can retain its selected archive or last activity until it is closed, reloaded or replaced.
- **GitHub token and profile:** kept in `chrome.storage.session`, restricted to trusted extension contexts. The extension does not put them in persistent local storage, Chrome Sync, archives or diagnostic logs. Disconnect removes this session entry; Chrome also clears session storage when the extension is reloaded, disabled or updated, or the browser restarts. [Chrome storage documentation](https://developer.chrome.com/docs/extensions/reference/api/storage).
- **Repository preferences:** the selected repository, branch and backup path are stored in `chrome.storage.local` until changed, cleared or the extension is removed. Disconnecting GitHub does not erase these preferences.
- **Update folder:** a directory handle is stored in the extension's IndexedDB after you choose the installation folder. **Forget folder** removes that remembered handle; Chrome may retain its own file-access permission separately. The updater queries permission again before writing. The expected version after an installation is stored briefly in `chrome.storage.local` and removed when the controls next check the installed version.
- **Previous extension files:** `.effect-maker-archive-update-backup.json` is written in the selected extension folder before program files are replaced. It contains the previous contents of replaced package files and version information, not Chrome storage or your exported project archives. It remains there until a subsequent successful backup replaces it or you remove it. A failed write triggers an attempt to restore those files; a browser shutdown can interrupt that recovery.
- **Your files:** exported archives, downloaded logs, extracted assets and local Git checkpoints remain where you save them until you remove them. They are not encrypted by the extension; base64 asset encoding is not encryption.
- **Google and GitHub copies:** projects and backups remain in those services under their policies and your account/repository settings. Git commits can retain older versions after a file is changed or removed.

Removing the extension or disconnecting GitHub does not delete your downloaded files, Google projects, GitHub backups or Git history. A failed or cancelled import may leave uploaded assets or source changes in the destination project.

## Network transfers and access

The extension has no developer collection endpoint. Project operations use the selected Google Effect Maker project and its asset service. Optional GitHub operations use `github.com` for device authorization and `api.github.com` for account/repository operations. These transfers use HTTPS. Google and GitHub can receive ordinary connection information, such as an IP address, when you connect to them.

**Update from GitHub** requests public release information from `api.github.com`. **Install update** downloads the named ZIP from the maintainer's GitHub release, including GitHub's `release-assets.githubusercontent.com` download host. These requests omit authentication cookies and the backup OAuth token. Update checks and installations are initiated by your clicks; there are no scheduled update checks or silent background installations. Download ZIP opens GitHub through the browser, where your ordinary browser session and GitHub's policies apply.

**Refresh repositories** requests updated repository choices and the selected repository's branches, backups and history directly from GitHub using the existing session token. Clicking **Create a repository** also schedules this metadata refresh when you return to the extension. Refreshing does not export, upload or import an Effect Maker project.

GitHub sign-in requests the OAuth **`repo`** scope, which includes access to private repositories permitted by your account. The code uses that access for the displayed backup features. Push requires your action and a selected destination; public repositories also require the public-backup checkbox. Everyone who can access the selected repository can access its backups. You can revoke the OAuth app in your GitHub application settings.

The launcher may inspect extension contexts or popup-window metadata to find its existing controls window. It does not collect browsing history or read unrelated websites' page content. There are no automatic content scripts or background project synchronization. See [browser permissions](docs/PERMISSIONS.md).

## Third parties and voluntary support

Google and GitHub operate independently of this extension and apply their own policies: [Google Privacy Policy](https://policies.google.com/privacy), [GitHub General Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). This declaration does not promise that those companies collect or retain no data.

If you choose to send the maintainer a log, backup or support message, the maintainer can see what you send. That is voluntary support disclosure, not automatic collection by the extension. Public GitHub issues are visible to others; review files before attaching them. Support content remains subject to the hosting service's retention controls.

## Questions and changes

Ask questions through the [repository issue tracker](https://github.com/Pratik77221/effect-maker-archive/issues). Future changes to data handling will be described in an updated version of this declaration and the release notes. This statement describes the shipped code; it is not a claim of Google certification or Chrome Web Store approval.
