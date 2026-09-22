# Editor compatibility review — 22 September 2026

The extension uses explicit profiles because Google's compiled identifiers can change between builds. The current profile was checked against the public JavaScript resource referenced by a newly opened Effect Maker home page. This is client-code evidence and offline integration verification; it does not establish production backend acceptance.

## Reviewed clients

| Client | Build | Downloaded script SHA-256 |
| --- | --- | --- |
| Original | `effectmaker.effectmaker.en_GB.k9eBOpQ9YWc.2020.O` | `f5ce71f0d7c60850b458033b069b6642798c8014acfd67a4f75b54f571ebd611` |
| 11 September | `effectmaker.effectmaker.en_GB.gfHrZWkok9A.2020.O` | `ff8ee50a8ca67647f3b99049b9247852b13b1a29e54d280f96d91111bb7c706c` |
| Current, 22 September | `effectmaker.effectmaker.en_GB.JjyImd5Sung.2020.O` | `767c7f62dcb557060c2907a320496ef16f864548c16076f6d6820dc7ea4260ce` |

Public resources: [original client](https://www.youtube.com/s/_/effectmaker/_/js/k=effectmaker.effectmaker.en_GB.k9eBOpQ9YWc.2020.O/am=AAAAAAAi/d=1/br=1/rs=AC3dgb2KK8K7vKFU91MyCGuNUsM99iHIlg/m=base), [11 September client](https://www.youtube.com/s/_/effectmaker/_/js/k=effectmaker.effectmaker.en_GB.gfHrZWkok9A.2020.O/am=AAAAAAAi/d=1/br=1/rs=AC3dgb0ASIWNJWGnHljggbTnp57xMqu3oA/m=base), [22 September client](https://www.youtube.com/s/_/effectmaker/_/js/k=effectmaker.effectmaker.en_GB.JjyImd5Sung.2020.O/am=AAAAAAAi/d=1/br=1/rs=AC3dgb3bvg4kj3K9u8xqCySPICP6X5lK2g/m=base). Downloaded Google client code is not included in the repository or release ZIP.

## Reviewed mappings

These are exported identifiers on the editor's native namespace, not public APIs.

| Role | Original | 11 September | 22 September |
| --- | --- | --- | --- |
| Injector / message accessor | `I` / `Ho` | `I` / `Ho` | `K` / `Jo` |
| Model / project wrapper / source | `hC` / `NC` / `XC` | `gC` / `MC` / `WC` | `lC` / `RC` / `aD` |
| Project ID / title / channel methods | `sb` / `yf` / `Ke` | `mb` / `xf` / `Kd` | `nb` / `wf` / `Ld` |
| Scene type / objects | `LC` / `kM` | `KC` / `iM` | `PC` / `kM` |
| Object/asset children | `Cb` | `Db` | `Ab` |
| Asset tree / entries / dependencies | `tM` / `wy` / `Vwa` | `rM` / `uy` / `Wwa` | `tM` / `yy` / `bxa` |
| Graph / subgraphs | `uM` / `Hx` | `sM` / `Fx` | `uM` / `Jx` |
| Node inputs / incoming connections | `ky` / `lM` | `iy` / `jM` | `my` / `lM` |
| Asset service / download URL / upload | `zA` / `BA` / `tS` | `yA` / `AA` / `qS` | `DA` / `FA` / `tS` |
| Explicit upload project option | `Td` | `Ud` | `Vd` |
| Uploaded record type | `GL` | `EL` | `GL` |
| Command token / completion dispatcher | `Vs` / `FQ` | `Vs` / `CQ` | `Ws` / `EQ` |
| Image binary getter / setter | `zy` / `ixa` | `xy` / `jxa` | `By` / `pxa` |
| GLB message / binary getter / setter | `Dy` / `Cy` / `nxa` | `By` / `Ay` / `oxa` | `Fy` / `Ey` / `uxa` |
| Sequence message / frame IDs / repeated-string setter | `yy` / `xy` / `nG` | `wy` / `vy` / `jG` | `Ay` / `zy` / `nG` |

The JSON-array marker remains `id(..., 32)`. Source data stays in project field 4; scene, asset tree and graph stay in source fields 2, 3 and 4. Binary IDs remain image field 6, GLB field 7 and sequence frame list field 1. The command still accepts `applyEffectSourceCommand` with `effectSourceJspb` and `assetsJspb`. Its resolver parses native messages, replaces binary records and applies the source. Model save still uses the destination's current project and revision state.

Graph `v()` returns variables, not edges. Summaries count incoming connections across node inputs in both main and nested graphs, and retain a separate variable count for empty-destination checks.

Each profile accepts archives from itself and the earlier reviewed builds. Thus both older backup formats can be imported into the current editor, while unreviewed downgrades are refused. Unknown editor builds remain blocked before model access.

## Reproduce the offline checks

Save the three resources above to local files in the same order, then run:

```sh
node scripts/check-editor-contract.js /path/to/k9eBOpQ9YWc-client.js /path/to/gfHrZWkok9A-client.js /path/to/JjyImd5Sung-client.js
```

The script verifies all three hashes before loading the definitions in an offline VM with no network/session implementation. It uses synthetic authoring data and the native serializer, message classes, dependency traversal, dispatcher and apply-source resolver. Uploads return synthetic native asset records; downloads and cloud save are simulated.

All six supported paths are exercised: original → original, original → 11 September, original → 22 September, 11 September → 11 September, 11 September → 22 September and 22 September → 22 September. Each check compares the complete source after remapping only the expected binary fields and confirms that the destination records do not retain the source channel ID.

This check does not render real GLBs/images, execute AI, upload to Google or prove persistence after a browser reload. A live test on a disposable empty project is still needed for those claims.
