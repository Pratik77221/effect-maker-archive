# Development

## Requirements and checks

Use Node.js 22.2 or newer. There are no third-party JavaScript runtime dependencies to install.

```sh
npm test
npm run build
npm run check
```

`npm run build` regenerates `extension/editor-panel.bundle.js` and `extension/editor-job.bundle.js` from the source modules. Commit regenerated bundles with changes to their source. They are static bundles. The optional GitHub updater verifies and installs a complete release into a user-selected folder and reloads the extension; it does not evaluate downloaded code in the current session.

To make the installable ZIP, also install Python 3 and run:

```sh
npm run package
```

The package script creates `dist/effect-maker-archive-v<version>.zip` and `dist/SHA256SUMS.txt`. The ZIP has `manifest.json` at its root, plus installation and privacy documents. It contains no project archives, tests, authentication files or Git history.

## Source layout

| Directory/file | Responsibility |
| --- | --- |
| `extension/adapter.js` | Pinned Effect Maker model integration, export/import and save verification. |
| `extension/runtime.js` | Per-step deadlines, cancellation and progress; no overall project deadline. |
| `extension/editor-bridge.js`, `editor-job.js` | Selected-tab execution and job lifecycle. |
| `extension/editor-panel.js`, `panel-styles.js` | Import/export controls. |
| `extension/github-*.js` | Optional OAuth, repository UI and backup API. |
| `extension/update-*.js` | Public release checks, bounded ZIP validation, selected-folder installation and update UI. |
| `extension/launch.js`, `panel-target.js` | Single controls window and target validation. |
| `lib/archive.js`, `cli.js` | Local archive and Git utilities. |
| `fixtures/`, `test/`, `dev/` | Synthetic fixtures, automated tests and local UI previews. |

## Local UI preview

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://localhost:8765/dev/ui-preview.html` for file controls, `http://localhost:8765/dev/github-preview.html` for GitHub backup flows or `http://localhost:8765/dev/update-preview.html` for the update controls. Preview accounts and service responses are simulated. These pages do not validate live cloud behavior or replace extension files.

Icons are bundled. Regenerating raster icons with `scripts/build-icons.py` additionally requires Pillow; it is not required to use, test or package the existing extension.

## Local archive CLI

```sh
node cli.js inspect effect.json
node cli.js unpack effect.json new-snapshot-directory
node cli.js pack new-snapshot-directory rebuilt-effect.json
node cli.js diff before.json after.json
node cli.js checkpoint effect.json /path/to/dedicated-git-repository
```

The optional POSIX wrapper `./em-sync` uses the `node` executable on PATH. Unpack writes a source JSON, manifest and separate content-addressed binary files. Pack checks integrity; it does not automatically authorize arbitrary manual source edits by updating hashes. Checkpoints refuse a dirty Git repository and never push to a remote. Their local commit author is `Effect Maker Archive <effect-maker-archive@localhost>`.

## Maintaining a fork

The bundled GitHub OAuth client ID is public; it is not a secret. A fork distributing its own GitHub integration should register its own OAuth app, enable Device Flow and update `GITHUB_CLIENT_ID` in `extension/github-auth.js`. Never add an OAuth client secret or a personal access token to extension files.

Review the adapter against a changed editor contract before changing its build identifier. Keep token handling in the extension origin and update the [privacy declaration](../PRIVACY.md) when behavior changes.

The [editor compatibility review](EDITOR-COMPATIBILITY.md) records all three supported profiles and a reproducible offline check against separately downloaded Google clients. Run that check when changing the adapter as well as the ordinary test suite. It deliberately does not ship Google client code or call cloud endpoints.
