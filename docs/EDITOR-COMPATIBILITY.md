# Editor compatibility review — 11 September 2026

The extension uses explicit profiles because Google's compiled identifiers can change between builds. The current profile was checked against the public JavaScript resource referenced by a newly opened Effect Maker home page. This is client-code evidence and offline integration verification; it does not establish production backend acceptance.

## Reviewed clients

| Client | Build | Downloaded script SHA-256 |
| --- | --- | --- |
| Previous | `effectmaker.effectmaker.en_GB.k9eBOpQ9YWc.2020.O` | `f5ce71f0d7c60850b458033b069b6642798c8014acfd67a4f75b54f571ebd611` |
| Current | `effectmaker.effectmaker.en_GB.gfHrZWkok9A.2020.O` | `ff8ee50a8ca67647f3b99049b9247852b13b1a29e54d280f96d91111bb7c706c` |

Public resources: [previous client](https://www.youtube.com/s/_/effectmaker/_/js/k=effectmaker.effectmaker.en_GB.k9eBOpQ9YWc.2020.O/am=AAAAAAAi/d=1/br=1/rs=AC3dgb2KK8K7vKFU91MyCGuNUsM99iHIlg/m=base), [current client](https://www.youtube.com/s/_/effectmaker/_/js/k=effectmaker.effectmaker.en_GB.gfHrZWkok9A.2020.O/am=AAAAAAAi/d=1/br=1/rs=AC3dgb0ASIWNJWGnHljggbTnp57xMqu3oA/m=base). Downloaded Google client code is not included in the repository or release ZIP.

## Reviewed mappings

These are exported identifiers on the editor's native namespace, not public APIs.

| Role | Previous | Current |
| --- | --- | --- |
| Model / project wrapper / source | `hC` / `NC` / `XC` | `gC` / `MC` / `WC` |
| Project ID / title / channel methods | `sb` / `yf` / `Ke` | `mb` / `xf` / `Kd` |
| Scene type / objects | `LC` / `kM` | `KC` / `iM` |
| Object/asset children | `Cb` | `Db` |
| Asset tree / entries / dependencies | `tM` / `wy` / `Vwa` | `rM` / `uy` / `Wwa` |
| Graph / subgraphs | `uM` / `Hx` | `sM` / `Fx` |
| Node inputs / incoming connections | `ky` / `lM` | `iy` / `jM` |
| Asset service / download URL / upload | `zA` / `BA` / `tS` | `yA` / `AA` / `qS` |
| Explicit upload project option | `Td` | `Ud` |
| Uploaded record type | `GL` | `EL` |
| Command token / completion dispatcher | `Vs` / `FQ` | `Vs` / `CQ` |
| Image binary getter / setter | `zy` / `ixa` | `xy` / `jxa` |
| GLB message / binary getter / setter | `Dy` / `Cy` / `nxa` | `By` / `Ay` / `oxa` |
| Sequence message / frame IDs / repeated-string setter | `yy` / `xy` / `nG` | `wy` / `vy` / `jG` |

The JSON-array marker remains `id(..., 32)` and message accessor remains `Ho`. Source data stays in project field 4; scene, asset tree and graph stay in source fields 2, 3 and 4. Binary IDs remain image field 6, GLB field 7 and sequence frame list field 1. The command still accepts `applyEffectSourceCommand` with `effectSourceJspb` and `assetsJspb`. Its resolver parses native messages, replaces binary records and applies the source. Model save still uses the destination's current project and revision state.

Graph `v()` returns variables, not edges. Summaries now count incoming connections across node inputs in both main and nested graphs, and retain a separate variable count for empty-destination checks.

The current profile accepts both reviewed archive builds. The previous profile only accepts previous-build archives, avoiding unverified downgrades.

## Reproduce the offline checks

Save the two resources above to local files, then run:

```sh
node scripts/check-editor-contract.js /path/to/previous-client.js /path/to/current-client.js
```

The script verifies both hashes before loading the definitions in an offline VM with no network/session implementation. It uses synthetic authoring data and the native serializer, message classes, dependency traversal, dispatcher and apply-source resolver. Uploads return synthetic native asset records; downloads and cloud save are simulated. It tests previous → previous, previous → current and current → current, and compares the complete source after remapping only the expected binary fields.

This check does not render real GLBs/images, execute AI, upload to Google or prove persistence after a browser reload. A live test on a disposable empty project is still needed for those claims.
