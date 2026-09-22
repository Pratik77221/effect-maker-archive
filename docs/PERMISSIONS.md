# Browser permissions

The published v0.4.5 manifest requests:

| Permission | Why it is needed |
| --- | --- |
| `activeTab` | Temporary access to the tab where you deliberately activate the extension. |
| `scripting` | Run the bundled project adapter inside that selected Effect Maker editor for export/import and progress reporting. |
| `storage` | Keep GitHub authorization in session storage and remember repository/branch/backup selections locally. |
| Optional `https://github.com/*` | GitHub device authorization and requested extension release downloads. |
| Optional `https://api.github.com/*` | Repository backup operations and public extension release checks. |
| Optional `https://release-assets.githubusercontent.com/*` | Download the verified extension ZIP when you choose Install update. |

No persistent Effect Maker host access is requested. The adapter also checks the editor origin, project route, current project model and supported build. There are no automatic content scripts, browsing-history, cookie, debugger or web-request interception permissions. Project operations use packaged scripts. The optional updater installs release files from the fixed GitHub repository only after an explicit action, then reloads the extension; it does not evaluate downloaded scripts in the current session.

Direct installation uses Chrome's File System Access directory picker. You choose the installed extension folder and grant read/write access. This is separate from broad filesystem or native-messaging permissions, neither of which is requested in the manifest. The chosen directory handle is remembered in IndexedDB. The updater validates the folder, package hash, file paths and manifest requirements before replacing files. It refuses automatic installation when the release changes the reviewed manifest permission/security fields. [Update workflow](UPDATES.md).

The toolbar uses one reusable extension window. Its launcher locates that window through extension contexts or popup-window metadata. It does not collect unrelated page content or browsing history. The service worker does not perform background project exports or synchronization.

GitHub authentication runs in the extension origin. Its token is restricted to trusted extension storage and is not passed to the editor adapter. Project operations run only on the selected editor project; a changed target is rejected. Pull requires a separate Import action before editor content changes.

The optional GitHub OAuth `repo` scope is broader than a single repository. Users approve that scope on GitHub, while the extension's backup UI uses the selected repository. GitHub account and organization controls still apply.

For retention, data transfers, account identifiers and how to disconnect, read the [privacy declaration](../PRIVACY.md).
