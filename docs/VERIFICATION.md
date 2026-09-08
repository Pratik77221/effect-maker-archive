# Verification status

Release: **0.4.1** · recorded **8 September 2026**.

## Reported real-world behavior

The project owner reports working export/import, GitHub push and restoration of an effect from its backup. An import into another project under the same Google account reportedly worked including AI generation. On another account/device, imported content worked while AI failed; a native template's AI generation failed there as well. The owner subsequently reported that the plugin was working and suspected an account issue. The precise external AI failure was not independently established.

Earlier browser checks verified capture/restore of a text property and position, with a tap-triggered script and reset in desktop preview. These checks do not establish phone behavior, publishing acceptance, every asset/node type or universal cross-account AI compatibility.

## Automated coverage

The final snapshot passes **65 tests** on Node.js v24.20.0. Coverage includes:

- Archive checksums, extraction/repacking, diffs and local Git checkpoints.
- PNG, image-sequence and GLB reference remapping while preserving authoring IDs and links.
- Destination-account upload options, use of new upload records and preservation of AI authoring references.
- Command completion, source/save verification, cancellation, deadlines, changed destinations and prevention of late follow-up writes.
- Serialized editor bridge, UI error states and a single reusable extension window.
- GitHub authorization, token storage, push/pull integrity, large backups, history, conflicts, public-backup consent and permission failures.

Editor and GitHub services are simulated in the automated suite. Passing tests do not prove that the live services accept every project.

## Compatibility boundary

The adapter targets the explicitly checked editor build listed in the README and rejects other builds. Publication metadata and preferences are outside the archive contract. AI-service availability, account permissions, publication limits and future Google editor changes remain outside this extension's control.
