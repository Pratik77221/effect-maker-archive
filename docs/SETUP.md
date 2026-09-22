# Setup and use

## Requirements

- A desktop computer with Chrome 116 or newer.
- Access to [YouTube Effect Maker](https://effects.youtube.com) and a compatible editor build.
- A GitHub account only if you want GitHub backups. Local JSON export/import works without it.

## Install the release ZIP

1. Visit the [latest release](https://github.com/Pratik77221/effect-maker-archive/releases/latest).
2. Under **Assets**, download `effect-maker-archive-v0.4.3.zip` and extract it.
3. Keep the extracted folder in a permanent location. Chrome loads an unpacked extension from this folder.
4. Open `chrome://extensions` in Chrome.
5. Enable **Developer mode**, then click **Load unpacked**.
6. Select the extracted folder containing `manifest.json`.
7. Use Chrome's Extensions menu to pin **Effect Maker Archive**, if desired.
8. Open an Effect Maker project and click the extension icon. The controls should show **Version 0.4.3**.

These are Chrome's standard [unpacked-extension installation steps](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked). This distribution is a GitHub release, not a Chrome Web Store installation.

The custom release ZIP contains `manifest.json` at its root. If you instead download GitHub's **Source code (zip)** or clone this repository, select the repository's **`extension`** directory.

## Export a project

1. Open the project you want to back up.
2. Wait until Effect Maker has finished saving your changes.
3. Open the extension and select **Project files → Export project**.
4. Keep the editor and extension windows open while assets download.
5. Save the resulting `.json` file. It contains the project source and referenced binary assets in one archive.

Export checks the source and file hashes and stops if the project changes while it is being captured. If that happens, wait for saving to finish and export again. The archive may contain private content and original project/channel identifiers; choose its storage location accordingly.

## Import a project

1. In Effect Maker, create or open a **different, empty project**. Any project name is accepted.
2. Open the extension on that destination project.
3. Select **Choose project file** and choose your exported `.json`.
4. Click **Import project**. Validation runs before uploads, followed by asset upload, source application and saving.
5. When the extension reports that the project was imported and saved, click **Reload editor**.
6. Check the objects, assets, visual script and preview. Test any AI generation in the destination account separately.

Import does not rename the destination, merge with existing content or publish the effect. A project that already contains content is rejected. Logical object, asset and node IDs are preserved; supported uploaded binary references are changed to the new destination uploads.

## Back up to GitHub

Open the **GitHub backup** tab and follow the [GitHub guide](GITHUB.md). A pull loads a backup into the file controls; you still click **Import project** to change Effect Maker.

Each Push backs up the project connected to the extension window. Use distinct backup names for different effects. Reusing an existing path intentionally updates its latest version, including when the current project is empty.

## Progress, cancellation and recovery

Progress shows the current stage, asset count where applicable, elapsed time and the stage deadline. Duration depends on asset count, file sizes, connection speed and Google's responses. The overall deadline is three minutes; it is not a promised completion time.

**Cancel** stops the extension's remaining work. Google's already-started upload, apply or save operations may finish afterward. A partial import is not rolled back.

After a stopped import, reload and inspect the destination. If it contains content, use a new empty project for another attempt. Open **Activity details → Download test log** to record the failing step. Logs are downloaded to your device; they are not sent to the maintainer automatically.

## Update an existing installation

1. Finish or cancel active extension operations.
2. Download and extract the newer release.
3. Update the folder Chrome loaded, or remove the old extension and load the new extracted folder.
4. In `chrome://extensions`, click the extension's **Reload** button.
5. Reload the Effect Maker tab and reopen the extension. Confirm the displayed version.

GitHub sign-in may need to be repeated because tokens are kept only in session storage. Updating files alone does not replace code already running inside an open editor tab.

Read [troubleshooting](TROUBLESHOOTING.md) for errors and [privacy](../PRIVACY.md) for data handling and removal.
