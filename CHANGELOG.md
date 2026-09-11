# Release notes

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
