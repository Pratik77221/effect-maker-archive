# Browser permissions

The published v0.4.2 manifest requests:

| Permission | Why it is needed |
| --- | --- |
| `activeTab` | Temporary access to the tab where you deliberately activate the extension. |
| `scripting` | Run the bundled project adapter inside that selected Effect Maker editor for export/import and progress reporting. |
| `storage` | Keep GitHub authorization in session storage and remember repository/branch/backup selections locally. |
| Optional `https://github.com/*` | Start and complete GitHub device authorization when you connect. |
| Optional `https://api.github.com/*` | Read repository choices and backup history, and perform requested pushes/pulls. |

No persistent Effect Maker host access is requested. The adapter also checks the editor origin, project route, current project model and supported build. There are no automatic content scripts, browsing-history, cookie, debugger or web-request interception permissions. No remote scripts or analytics SDKs are loaded.

The toolbar uses one reusable extension window. Its launcher locates that window through extension contexts or popup-window metadata. It does not collect unrelated page content or browsing history. The service worker does not perform background project exports or synchronization.

GitHub authentication runs in the extension origin. Its token is restricted to trusted extension storage and is not passed to the editor adapter. Project operations run only on the selected editor project; a changed target is rejected. Pull requires a separate Import action before editor content changes.

The optional GitHub OAuth `repo` scope is broader than a single repository. Users approve that scope on GitHub, while the extension's backup UI uses the selected repository. GitHub account and organization controls still apply.

For retention, data transfers, account identifiers and how to disconnect, read the [privacy declaration](../PRIVACY.md).
