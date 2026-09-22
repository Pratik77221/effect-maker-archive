# Verification status

Release: **0.4.4** · recorded **22 September 2026**.

## Reported real-world behavior

The project owner reports working export/import, GitHub push and restoration of an effect from its backup. An import into another project under the same Google account reportedly worked including AI generation. On another account/device, imported content worked while AI failed; a native template's AI generation failed there as well. The owner subsequently reported that the plugin was working and suspected an account issue. The precise external AI failure was not independently established.

Earlier browser checks verified capture/restore of a text property and position, with a tap-triggered script and reset in desktop preview. These checks do not establish phone behavior, publishing acceptance, every asset/node type or universal cross-account AI compatibility.

## Automated coverage

The final suite passes **85 tests** on Node.js v24.20.0. Coverage includes:

- Archive checksums, extraction/repacking, diffs and local Git checkpoints.
- PNG, image-sequence and GLB reference remapping while preserving authoring IDs and links.
- Destination-account upload options, use of new upload records and preservation of AI authoring references.
- Command completion, source/save verification, cancellation, deadlines, changed destinations and prevention of late follow-up writes.
- Removal of the overall deadline: a fake-clock import completes four 80-second uploads (320 seconds total), then applies and saves. Further checks verify cancellation after ten minutes, a later stalled upload's own 90-second deadline and progress text when no stage limit applies.
- Serialized editor bridge, UI error states and a single reusable extension window.
- GitHub authorization, token storage, push/pull integrity, large backups, history, conflicts, public-backup consent and permission failures.
- All three reviewed editor profiles, all six supported backup import combinations, refusal of unknown builds/downgrades and serialized execution for every supported build.
- New-repository discovery with the existing login, preservation of branch/backup/revision selection, refresh failure recovery and deferred refresh after returning from repository creation.

Editor and GitHub services are simulated in the automated suite. Passing tests do not prove that the live services accept every project.

A browser check in the 0.4.2 release of the actual rendered GitHub panel with simulated services confirmed the refresh controls are visible and that refreshing preserves a selected repository, non-default branch, backup and earlier revision. No live GitHub repository was created for this UI check. Those repository controls remain unchanged in 0.4.4.

## Current client contract checks

On 22 September 2026, a new browser tab at Effect Maker's home page served `effectmaker.effectmaker.en_GB.JjyImd5Sung.2020.O`. Version 0.4.2 recognized the two earlier builds. This new client renamed the injector, message accessor, model, asset, graph and command symbols, and changed the explicit upload destination option from `Ud` to `Vd`.

Downloaded the public script URL observed in that tab and reviewed the native serialization, source command, dependency walker, save method and upload/download implementation. No existing project was opened or edited during this compatibility check.

`scripts/check-editor-contract.js` passes all six same-build and forward import combinations against the three actual downloaded native client definitions. It exercises named objects, graph connections and a subgraph, image/sequence/GLB binary references, AI prompt references, native dispatch/source application and destination upload records. It verifies that only binary IDs change in the imported source. The surrounding browser, binary transfer and cloud save are simulated; this is not a live backend or AI-generation test. [Build hashes, mappings and reproduction](EDITOR-COMPATIBILITY.md).

## Compatibility boundary

The adapter targets the three explicitly reviewed English UK builds listed in the README and rejects other builds/locales until checked. Earlier backups can move forward to the current build; downgrading to an older editor is refused. Reload the editor to move to Google's currently served build. Publication metadata and preferences are outside the archive contract. AI-service availability, account permissions, publication limits and future Google editor changes remain outside this extension's control.
