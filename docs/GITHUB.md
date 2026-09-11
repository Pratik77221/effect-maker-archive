# GitHub backups

GitHub is optional. Each backup is a complete JSON archive at `effect-maker/<backup-name>.json`. Push/pull are manual; this is not automatic cloud synchronization or graph merging.

## Sign in

1. Open the extension on your Effect Maker project and choose **GitHub backup**.
2. Click **Sign in with GitHub** and allow the requested GitHub host access.
3. Click **Copy code & open GitHub**.
4. Paste the verification code on GitHub and approve the OAuth app named **effectmaker**.
5. Return to the extension to select a repository.

No personal access token or client secret needs to be created or pasted. Sign-in uses GitHub's [device authorization flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow). Approval must finish within the extension's three-minute operation window; start sign-in again if it expires.

The requested OAuth scope is **repo**, which includes private repositories. GitHub applies your account permissions, organization policies and branch rules. Authentication does not bypass them. Credentials are held in trusted browser session storage; closing/restarting the browser or reloading the extension may require signing in again. **Disconnect** removes the extension's local session token. Revoke the app in GitHub's application settings to remove its GitHub authorization. See [privacy](../PRIVACY.md).

## Create a backup repository

Click **Create a repository** beside **Refresh repositories**, directly below the repository selector. A private repository is usually appropriate for unpublished effect content. Initialize it with a README so it has an existing default branch, then return to the extension. The list refreshes automatically after you return from this link.

If you created a repository elsewhere, click **Refresh repositories**. This reloads repositories and the selected repository's branches, backups and history using your existing sign-in. It keeps your selected repository, branch, backup and revision when they are still available. Disconnecting and signing in again is unnecessary. If a refresh fails, retry the button; a temporary network failure does not remove your sign-in.

Your effects do not need to be backed up to this extension's source-code repository. Select a repository intended for your own project archives.

## Push

1. Choose the repository.
2. Under **Project backup**, choose **Create a new backup**, then enter a name such as `HauntedBooth`.
3. Optionally choose a branch and enter a backup note under **Backup options**.
4. Review the displayed repository, branch and path. Public repositories require **Allow my project backup to be public**.
5. Click **Push backup**.

The extension exports the currently connected project and creates a Git commit. An unchanged archive, ignoring only the capture timestamp, creates no extra commit.

Choosing an existing backup updates that file. A blank current project can replace a populated backup's latest version, so check the project and backup selection before pushing. Prior revisions remain in Git history. Different effects should use different names.

## Pull an earlier or current version

1. Open a separate empty Effect Maker project and open the extension there.
2. Select the repository and **Project backup**.
3. Under **Version to pull**, choose the latest version or one of the most recent 20 commits that changed the file.
4. Click **Pull backup**. The file's Git hash and source/asset checksums are verified.
5. The extension switches to **Project files** with the backup selected. Click **Import project**.
6. After successful saving, click **Reload editor** and check the effect.

Pulling alone does not change the editor or overwrite the GitHub file. To recover an older version that is not listed, download it from GitHub's file history and use normal file import.

## Conflicts and permissions

Existing backups must match the file revision last observed by the extension. If someone changes it meanwhile, Push stops; refresh and review the latest version. A network interruption may occur after GitHub accepted a commit, so refresh before repeating a push.

Read-only repositories can be used for pulls. Organization approval, protected branches and rate limits can stop a write. Follow the displayed error and select an appropriate repository or branch; there are no force pushes or automatic write retries.

Binary assets are base64 inside the JSON, so GitHub's text diff is not a useful image/model comparison. The [local CLI](DEVELOPMENT.md#local-archive-cli) can unpack assets into separate files.
