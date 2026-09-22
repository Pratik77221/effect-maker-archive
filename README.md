<p align="center"><img src="extension/icons/archive-128.png" width="80" height="80" alt="Effect Maker Archive icon"></p>

# Effect Maker Archive

Export, import and back up your YouTube Effect Maker projects from one Chrome extension window.

Save a complete project archive to your computer, restore it into an empty project, or connect GitHub to keep manual backups and version history. Local export/import works without connecting GitHub.

**[Download v0.4.5](https://github.com/Pratik77221/effect-maker-archive/releases/latest)** · **[Setup and usage](docs/SETUP.md)** · **[GitHub backups](docs/GITHUB.md)** · **[Privacy declaration](PRIVACY.md)**

This is an independent, unofficial project. It is not affiliated with, endorsed by, or supported by Google, YouTube or GitHub. Effect Maker has no official project import/export API; compatibility is limited to the reviewed editor builds. See [limitations](#compatibility-and-limits).

## What it does

| Feature | What you get |
| --- | --- |
| Export project | A `.json` archive containing authoring data and referenced binary assets. |
| Import project | Restore objects, assets and scripts into a separate empty Effect Maker project. Any destination name works. |
| GitHub backup | Browser sign-in, manual push/pull, backup notes and earlier versions. |
| Integrity checks | Source and asset checksums, upload-reference remapping and save verification. |
| Progress and recovery | Stage progress, elapsed time, cancellation and downloadable diagnostic logs. |
| Local CLI | Unpack assets, repack archives, compare source changes and create local Git checkpoints. |
| Update from GitHub | Check releases, download a ZIP, or install into the extension folder you select and reload automatically. |

Backups preserve authoring objects, asset definitions, visual scripts and embedded prompt settings. Referenced PNG, JPEG, WebP and GLB binaries are included, including supported image-sequence frames. Publishing metadata and editor preferences are excluded. Copying AI prompt settings does not grant AI-service access or guarantee generation in another account.

## Install in Chrome

1. Open [Releases](https://github.com/Pratik77221/effect-maker-archive/releases/latest) and download **`effect-maker-archive-v0.4.5.zip`** from **Assets**.
2. Extract the ZIP to a folder you will keep on your computer.
3. Open `chrome://extensions` and enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder containing `manifest.json`.
5. Open a project at [effects.youtube.com](https://effects.youtube.com), then click **Effect Maker Archive** in Chrome's Extensions menu. You can pin it to the toolbar.

The extension opens one reusable controls window. GitHub approval opens GitHub separately when you choose to sign in. The release ZIP is ready to load; Node.js is not needed to use the extension. [Full installation and update instructions](docs/SETUP.md).

If you download GitHub's automatically generated **Source code (zip)** instead, select its **`extension/`** subfolder when loading unpacked.

## Update from the extension

Version 0.4.5 adds **Update from GitHub** in the footer. Install this version manually once to get the button. Future updates can be installed from the controls:

1. Click **Update from GitHub** to check the latest stable release. GitHub sign-in is not required.
2. Choose the exact folder you selected in Chrome's **Load unpacked** dialog and allow file access.
3. When a newer version is available, click **Install update**. The extension downloads and verifies the ZIP, backs up the files it will replace, installs it and reloads itself.

The folder choice is remembered locally; Chrome may ask for access again. Updates run only when requested and cannot start during project operations. **Download ZIP** is available for manual installation. A release that changes browser requirements or permissions requires manual installation. Chrome's built-in updater does not automatically install GitHub ZIPs into unpacked extensions. [Update details](docs/UPDATES.md).

## Everyday workflow

**Export:** open the source project, wait for Effect Maker to finish saving, then choose **Export project**. Keep the downloaded JSON as your backup.

**Import:** open a different, empty project, choose the backup with **Choose project file**, then click **Import project**. After success, click **Reload editor** and check the preview.

**GitHub:** open **GitHub backup**, choose **Sign in with GitHub**, copy the verification code and approve the app named **effectmaker**. Choose your repository and backup name. **Push backup** creates a commit; **Pull backup** loads a version for the separate **Import project** action. [Detailed GitHub guide](docs/GITHUB.md).

Use a different backup name for each effect. Pushing the current project to an existing backup path replaces that path's latest version; older commits remain in Git history. Push/pull are manual. This release does not automatically sync saves, merge visual graphs or monitor projects in the background.

## Privacy, plainly

**No analytics, tracking or developer-operated data collection server.** The extension does not automatically send your project or credentials to its developer.

It does access project data to perform export/import. Google receives normal editor uploads and saves; GitHub receives project backups only when you choose to push them. GitHub sign-in uses a token held in browser session storage, and repository/branch/backup selections are remembered locally. Archives may contain project and channel identifiers in asset metadata. Update checks request public release metadata without your backup token; direct installation remembers a folder handle locally and writes extension files only after you choose Install update.

That is why our declaration says **no developer collection or tracking**, rather than claiming the software never accesses or stores any data. Read the [complete privacy declaration](PRIVACY.md) and [permission explanations](docs/PERMISSIONS.md).

## Compatibility and limits

- Chrome **116+**. Other Chromium browsers have not been independently validated.
- Current inspected editor build: `effectmaker.effectmaker.en_GB.JjyImd5Sung.2020.O`. The earlier `effectmaker.effectmaker.en_GB.gfHrZWkok9A.2020.O` and `effectmaker.effectmaker.en_GB.k9eBOpQ9YWc.2020.O` builds are also supported. Other builds are rejected until reviewed. Backups from either earlier build can be imported into the current build; downgrades are refused.
- Import requires a separate **empty** destination. It does not merge into existing content.
- Maximum archive: **60 MiB**; individual binary: **10 MiB**; combined binaries: **40 MiB**. These are extension limits, not Effect Maker's publication limits.
- Supported binary imports: PNG, JPEG, WebP and GLB. LUT restoration is not implemented.
- **No overall time limit** for project export/import. Each step has its own limit: **30 seconds per download**, **90 seconds per upload**, **20 seconds to apply**, and **60 seconds to save**. A project with many assets can take longer than three minutes. Cancel remains available.
- A cancelled or failed import may leave uploads or project changes behind. There is no automatic rollback; reload and inspect the destination before retrying.

Earlier releases have user-reported working export/import and GitHub backup. Version 0.4.5 adds GitHub release checks and optional folder-based installation, with automated coverage for integrity checks, write-failure recovery and UI controls. The overall project cutoff remains removed. The browser's native folder-permission and self-reload flow has not been live-verified in this release; Download ZIP remains available. [Verification details](docs/VERIFICATION.md) · [Troubleshooting](docs/TROUBLESHOOTING.md).

## For developers

```sh
git clone https://github.com/Pratik77221/effect-maker-archive.git
cd effect-maker-archive
npm test
npm run build
npm run check
```

Node.js **22.2+** is required for these commands. The JavaScript tooling has no third-party runtime dependencies; no `npm install` is needed. Packaging additionally uses Python 3: `npm run package`.

See [development and CLI instructions](docs/DEVELOPMENT.md), [release notes](CHANGELOG.md), and the [issue tracker](https://github.com/Pratik77221/effect-maker-archive/issues) for support.
