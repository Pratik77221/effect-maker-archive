# Troubleshooting

## The extension does not open

Open a project editor, rather than the Effect Maker dashboard, before clicking the icon. Confirm that Chrome loaded the folder containing `manifest.json`. After an update, reload the extension and the editor tab. Version 0.4.2 uses one reusable controls window and does not depend on Chrome's Side Panel API.

## Unsupported editor build

Version **0.4.2** supports the current `effectmaker.effectmaker.en_GB.gfHrZWkok9A.2020.O` build and the earlier `effectmaker.effectmaker.en_GB.k9eBOpQ9YWc.2020.O` build. If version 0.4.1 shows this error, [install the update](SETUP.md#update-an-existing-installation), reload the extension, then reload the editor tab. Your earlier exported backups remain supported on the current build.

Google can update its editor independently. Other builds still stop import/export until their contracts have been reviewed. The error now includes the detected build identifier; include it and the extension version in an issue. The latest [compatibility review](EDITOR-COMPATIBILITY.md) records the functions and upload fields checked.

## Destination is not empty

Import requires a different project containing no authoring objects, content assets or script content. Any name is accepted. Create an empty destination instead of deleting existing work to make room.

## Import stopped, timed out or was cancelled

Open **Activity details** and choose **Download test log**. The current stage identifies whether validation, upload, source application or saving failed. A failure after uploads can leave partial state. Reload and inspect the destination before another attempt; use a new empty destination if it now contains content.

The total deadline is three minutes. Changing the clock or waiting longer after a stopped operation will not resume it. Google operations already started may complete after cancellation; the extension does not claim rollback.

## The editor did not apply the expected source

The editor command completed, but the resulting source did not exactly match the source the extension expected. Saving is not confirmed by that message. Reload and inspect the destination and retain the log.

This release uses strict serialized-source comparison. Hand-edited archives can introduce representation differences that the editor normalizes, such as an explicit empty connection list becoming an omitted field. Unmodified exports are preferred. A checksum recalculation by itself does not validate an edited archive's editor compatibility. Report reproducible cases before retrying the same file repeatedly.

## AI generation reports an unexpected error

Import preserves prompt configuration and graph references; it does not grant access to Google's generation service or test that service as part of import.

First test an official AI template in the affected account/device using the same generation mode. If native generation also fails, the error occurs without importing the backup; investigate the account, browser/session, device/network or service before changing archive IDs. A fresh Chrome profile with no extensions can help isolate browser state. If native generation works, compare the imported prompt's own preview and the full graph behavior.

An observed account/device issue affected both an imported project and a native template. That did not establish an import defect or identify the exact account-side cause. Google's [AI guide](https://support.google.com/youtube/answer/16604251?hl=en) describes prompt previews and generation requirements. The generic error alone does not identify a restriction or an outage.

## GitHub refuses access or the sign-in code expires

Use **Sign in again with GitHub** for expired authorization. Complete device approval within three minutes. Verify repository write access, organization approval and branch rules when a push is refused. Read-only access permits pulls. See the [GitHub guide](GITHUB.md).

## A GitHub backup now looks empty

Push backs up the current project to the selected path. Pushing an empty project to an existing path updates that path with the empty state. Select an earlier **Version to pull**, or use GitHub's file history, to retrieve the previous backup. Use separate backup names for separate effects.

## A new GitHub repository is missing

Click **Refresh repositories**, directly below the repository selector. You can keep your existing GitHub sign-in. If you used **Create a repository** in the extension, returning to the controls triggers this refresh automatically. If an operation is still running, the refresh waits until it finishes. Check that the repository belongs to the connected account or is accessible to it if it remains missing.

## Reporting an issue

Include the extension version, failing action/stage, browser version, whether the error also occurs in a native project, and a reviewed diagnostic log where helpful. Share reproduction steps through [GitHub Issues](https://github.com/Pratik77221/effect-maker-archive/issues). Archives and successful-import logs can include identifiers and content summaries; avoid posting private effect data publicly.
