# Release notes

## 0.4.4 — 22 September 2026

- Remove the overall three-minute cutoff from both the extension controls and editor jobs. Projects with many assets can keep importing or exporting while each transfer completes within its own time window.
- Give every stage its full timeout regardless of earlier elapsed time. Keep cancellation and the individual download/upload/apply/save deadlines.
- Show elapsed time without a misleading maximum when no stage deadline applies. Diagnostics record the absence of an overall limit explicitly.
- Update setup and troubleshooting guidance; GitHub sign-in retains its separate three-minute approval window.

Validation includes **85 passing automated tests**, including a simulated 320-second import sequence, cancellation after ten minutes and a stalled transfer after a long operation. All **six offline native-client round trips** also pass. Live Google transfers/save and AI generation were not retested. Permissions, archive size limits and privacy behavior are unchanged.

## 0.4.3 — 22 September 2026

- Support the new `JjyImd5Sung` English UK editor build after reviewing its served client code. Update the injector, message accessor, model, graph, asset, command and explicit destination-upload mappings.
- Keep both earlier editor profiles and accept backups from `k9eBOpQ9YWc` and `gfHrZWkok9A` in the current editor. Unknown builds and unreviewed downgrades remain blocked.
- Extend regression coverage to all six supported import combinations and serialized extension execution on all three builds. Update the reproducible native-client checker and compatibility documentation.

Validation includes **82 passing automated tests** and **six offline round trips** using the actual reviewed Google clients. Native serialization, reference remapping and source application are exercised; cloud transfers/save and AI execution are not live-tested in this update. Extension permissions and data handling are unchanged. See [verification](docs/VERIFICATION.md).

## 0.4.2 — 11 September 2026

- Support the new `gfHrZWkok9A` English UK editor build with reviewed function mappings, project accessors and destination upload fields. Retain the prior build profile for already-open tabs.
- Import backups made with the previous `k9eBOpQ9YWc` build into the current editor. Reject unreviewed builds and archive downgrades with clearer error messages.
- Put **Refresh repositories** directly below the repository selector and keep **Create a repository** visible. Refresh automatically after returning from that link, using the existing GitHub session.
- Preserve available repository, branch, backup and revision selections during refresh. Allow retry after a failed initial load without signing in again.
- Correct object names and graph connection counts in summaries; track graph variables separately when checking for an empty destination.

Validation includes **75 passing automated tests**, a rendered UI refresh check, and three offline round trips using the actual reviewed Google clients: previous → previous, previous → current and current → current. The offline checks use native serialization, graph/asset accessors, command dispatch and source application; cloud uploads/downloads/save and AI execution are simulated or outside those checks. See [verification](docs/VERIFICATION.md).

## 0.4.1 — 8 September 2026

First public packaged release of Effect Maker Archive.

- Export project source and referenced assets to a local JSON archive.
- Import into a separate empty project with any name, supported binary remapping, integrity checks and save verification.
- Manual GitHub backups and version history through browser device authorization; no token-entry setup.
- One reusable extension window with a light interface, clear Import/Export actions and progress.
- Bounded waits, cancellation, recovery guidance and downloadable diagnostic logs.
- Local unpack, pack, diff and Git checkpoint commands.
- Public setup, troubleshooting, permission and privacy documentation.

Validated with 65 automated tests using simulated services and local archive checks. Project-owner reports confirm working export/import and GitHub backup. Compatibility remains limited to the inspected Effect Maker build; universal cloud, phone and AI-service behavior is not certified.
