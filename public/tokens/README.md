# Token artwork references

The images are source references, separate from the procedural 3D models. Card illustrations belong to their respective Yu-Gi-Oh! rights holders.

- `reference/`: 120 unchanged cropped JPEGs, returned by the public YGOPRODeck Token API snapshot on 2026-10-11.
- `cards/` and `small/`: 120 complete card JPEGs and 120 small card JPEGs from that same snapshot. Native presentations use only the 120 verified image codes and nine native aliases sharing their exact reference.
- `generators/`: 96 unchanged cropped JPEGs of verified cards that create Tokens. These are labelled as generator references, not illustrations of the Token itself.
- `commemorative/`: four unchanged physical Token card scans from the pinned Yugipedia gallery sources. Konami product pages confirm the YGLD and LDK2 Token products.
- `duel-cards/`, `duel-small/` and `duel-cropped/`: six complete card images, six small card images and four cropped images for Scapegoat, Dark Hole, Tetherwolf, Creature Swap, Rite of Aramesir and Link Spider. These ordinary cards are authentic support cards used in the Token Duel checks. Tetherwolf and Rite reuse their two existing cropped generator references. All 16 additional files retain their original API bytes.

Exact URLs, image dimensions, byte counts and SHA-256 hashes are stored in `docs/audits/artifacts/token-monster-inventory-2026-10-11/`. No remote image fetch is required by the Atlas.
