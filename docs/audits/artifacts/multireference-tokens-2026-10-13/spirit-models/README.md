# Four printed Token anatomies — 13 October 2026

This change replaces the previous generic anatomy for four exact native codes. All four original, unmodified scans were inspected at their native dimensions before modeling. `../verified-printed-token-references.json` records source URL, printed version, identity, dimensions and SHA256.

| Code | Printed version | Visible evidence represented |
| --- | --- | --- |
| 38053382 | Generaider Token, OP13-EN026 | Metallic crescent torso, narrow silver face, spiked oval crown, detached pointed legs, curved blade wings, orbit arms and colored inlays. |
| 51208047 | Trickstar Token, OP10-EN026 | Purple heart-shaped skull, pale empty eyes, white scalloped wings, green outline and curled stalk, blue pearl. |
| 60514626 | Mask Token, OP19-EN029 | Green-gray pear-shaped body, elongated asymmetric mask face and dark hollow, rolled sleeve/ankle cuffs, short curled fingers and broad toes. |
| 87669905 | Dual Avatar Spirit Token, OP14-EN026 | Seated spectral guardian lion, muzzle and nose, open roar and fangs, broad front paws and claws, carved cloud-like mane and swept tail. |

Branches are selected by exact native code. They neither invent a printed identity from a variant string nor change the database, race, level, stats, generator scripts, game rules or private state.

Only one independent printed composition is available for each of these four Tokens. These scans establish the facing silhouette, palette and defining details, not a certified 1:1 mesh. Side and rear geometry, occluded joins and the lion's rear paws remain procedural interpretations. Reprints and scans of the same composition must not be counted as independent viewpoints. The green Mask's left hollow is asymmetric; no invented pair of eyes or mouth is added. The lion has no humanoid legs, wings or weapon.

`geometry-report.json` records an executed 532-assertion audit for all four codes in ATK and DEF. The script is archived as `audit-spirit-models.mjs.txt` to avoid Node's recursive test discovery; rerun it from the repository root with `node --input-type=module < docs/audits/artifacts/multireference-tokens-2026-10-13/spirit-models/audit-spirit-models.mjs.txt`.

The existing 240-code model/fidelity regressions passed 9/9 after reducing two intermediate over-budget meshes. `initial-budget-measurements.json` preserves those earlier failed measurements without treating them as final validation. Original per-code fivefold limits are unchanged. Stable geometry buffers and disposal are checked; browser rendering and performance are reported independently by the visual QA addendum.

The lion's jaw and lower fangs remain on the BODY joint, so the open roar stays attached to the head. The unrelated global dragon jaw pivot is not applied to this seated animal.
