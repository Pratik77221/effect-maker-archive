# Verification status

Release: **0.4.2** · recorded **11 September 2026**.

## Reported real-world behavior

The project owner reports working export/import, GitHub push and restoration of an effect from its backup. An import into another project under the same Google account reportedly worked including AI generation. On another account/device, imported content worked while AI failed; a native template's AI generation failed there as well. The owner subsequently reported that the plugin was working and suspected an account issue. The precise external AI failure was not independently established.

Earlier browser checks verified capture/restore of a text property and position, with a tap-triggered script and reset in desktop preview. These checks do not establish phone behavior, publishing acceptance, every asset/node type or universal cross-account AI compatibility.

## Automated coverage

The final suite passes **75 tests** on Node.js v24.20.0. Coverage includes:

- Archive checksums, extraction/repacking, diffs and local Git checkpoints.
- PNG, image-sequence and GLB reference remapping while preserving authoring IDs and links.
- Destination-account upload options, use of new upload records and preservation of AI authoring references.
- Command completion, source/save verification, cancellation, deadlines, changed destinations and prevention of late follow-up writes.
- Serialized editor bridge, UI error states and a single reusable extension window.
- GitHub authorization, token storage, push/pull integrity, large backups, history, conflicts, public-backup consent and permission failures.
- Current/previous editor selection, older backup import, refusal of unknown builds/downgrades and serialized execution for both supported builds.
- New-repository discovery with the existing login, preservation of branch/backup/revision selection, refresh failure recovery and deferred refresh after returning from repository creation.

Editor and GitHub services are simulated in the automated suite. Passing tests do not prove that the live services accept every project.

A browser check of the actual rendered GitHub panel with simulated services confirmed the refresh controls are visible and that refreshing preserves a selected repository, non-default branch, backup and earlier revision. No live GitHub repository was created for this UI check.

## Current client contract checks

On 11 September 2026, a new browser tab at Effect Maker's home page served `effectmaker.effectmaker.en_GB.gfHrZWkok9A.2020.O`. The previous extension only recognized `k9eBOpQ9YWc`; the new client also renamed model, asset, graph and dispatcher symbols and changed the upload destination option from `Td` to `Ud`.

Downloaded the public script URL observed in that tab and reviewed the native serialization, source command, dependency walker, save method and upload/download implementation. No existing project was opened or edited during this compatibility check.

`scripts/check-editor-contract.js` passes three offline round trips against the actual downloaded native client definitions: previous → previous, previous → current and current → current. It exercises named objects, graph connections and a subgraph, image/sequence/GLB binary references, AI prompt references, native dispatch/source application and destination upload records. It verifies that only binary IDs change in the imported source. The surrounding browser, binary transfer and cloud save are simulated; this is not a live backend or AI-generation test. [Build hashes, mappings and reproduction](EDITOR-COMPATIBILITY.md).

## Compatibility boundary

The adapter targets the two explicitly reviewed English UK builds listed in the README and rejects other builds/locales until checked. Earlier backups can move forward to the current build; importing a current-build backup into the previous editor is refused. Reload the editor to move to Google's currently served build. Publication metadata and preferences are outside the archive contract. AI-service availability, account permissions, publication limits and future Google editor changes remain outside this extension's control.
