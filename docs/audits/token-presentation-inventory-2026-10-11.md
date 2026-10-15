# Token presentation inventory — 2026-10-11

The pinned native database contains 240 actual Token monster records, representing 198 names. All 240 exact codes receive a dedicated presentation profile; native aliases remain separate identities. Three additional rows carry the Token bit without the Monster bit and remain internal placeholders without models. This presentation catalogue supplies no duel rules, deck entries or fabricated Token records.

The Atlas catalogue has 367 entries: 240 native duel identities, 120 API artwork presentations of those same Tokens, four verified commemorative prints and three internal placeholders. The 120 artwork presentations overlap the native identities and do not describe 120 additional Token species.

## Native creation and references

The lexical inventory scans 13,702 archived Lua files. It records 262 `Duel.CreateToken` call sites in 243 generator scripts. Static and explicitly bounded source expressions cover 223 native Token codes. Of the remaining 17 native records, 15 have an alias that is directly created. World Legacy Token `69811711` and the printed Fireball Token `98596597` are not direct creation codes; the scripts create the other World Legacy identity and the canonical Fireball Token `23116809`. This is an inventory of source code, not a certification of all runtime combinations.

The public YGOPRODeck `type=Token` snapshot returns 106 records and 120 images. Every image code matches an actual native Token record. Including nine exact native aliases, 129 native profiles have a verified Token illustration. Another 110 profiles link to local artwork of a verified generator card and explicitly identify it as a generator reference. World Legacy Token `69811711` has no assigned image. The 111 profiles without a Token illustration retain the `native-definition` visual basis; their procedural models are stylised reconstructions, not claims of an exact artwork replica.

The compact rendering module contains 240 visual profiles and 42 explicit anatomical families. It does not import descriptions, generator lists, statistics, physical print editions or remote art URLs. The richer Atlas module is separate. Colours assigned after visual inspection are chosen approximations, not sampled measurements.

Native Duel card frames and the inspector also use the 120 complete card JPEGs and 120 small JPEGs from the same pinned API snapshot. The separate compact `TokenCardReferenceArt.js` supports these 120 exact image codes and nine verified native aliases. Cropped references reuse the existing images. Tokens without a verified card illustration retain the neutral card frame. This artwork lookup does not admit Tokens to the Deck or change their statistics.

The final reference asset set has 476 original image files: the first 460 Token presentation references (120 crops, 120 complete frames, 120 small frames, 96 generator references and four commemorative scans), plus 16 files for six authentic support cards used in Duel checks. These six cards are Scapegoat, Dark Hole, Mecha Phantom Beast Tetherwolf, Creature Swap, Rite of Aramesir and Link Spider. Their six complete frames, six small frames and four additional crops use exact API bytes; Tetherwolf and Rite reuse two existing generator crops. The Token images and all 240 visual profiles remain unchanged. `NativeCardReferenceArt.js` now has 145 exact references: ten existing ordinary cards, 129 Token identities and six support cards.

## Verified commemorative prints

| Physical identifier | Printed subject | Presentation avatar | Primary product source |
| --- | --- | --- | --- |
| YGLD-ENTKN | Yami Yugi | Atem | [Yugi’s Legendary Decks](https://www.yugioh-card.com/en/products/past_products/yugis_legendary_decks/) |
| LDK2-ENT01 | Yami Yugi and Dark Magician | Atem | [Legendary Decks II](https://www.yugioh-card.com/en/products/past_products/legendary_decks_2/) |
| LDK2-ENT02 | Kaiba and Blue-Eyes White Dragon | Kaiba | [Legendary Decks II](https://www.yugioh-card.com/en/products/past_products/legendary_decks_2/) |
| LDK2-ENT03 | Joey and Red-Eyes Black Dragon | Joey | [Legendary Decks II](https://www.yugioh-card.com/en/products/past_products/legendary_decks_2/) |

Konami confirms one Yugi Token in YGLD and three Tokens showing the three duellists with their signature monsters in LDK2. The four source scans were inspected and retain their original bytes. Their catalogue codes and duel statistics are null. These views reuse the existing stylised duellist avatars; the printed companion monsters are not reproduced by this avatar view.

The [pinned generic Token gallery](https://yugipedia.com/index.php?title=Card_Gallery:Token_(card)&oldid=5987593) contains 438 multilingual print/reprint records, 383 with an image and 55 without an image. These are editions, not 438 distinct artworks or Token species. The separately named Joey gallery illustrates that this generic gallery is not a complete worldwide physical Token census. The API likewise omits commemorative duellist prints.

Konami also confirms five special Tokens in [Albaz Strike](https://www.yugioh-card.com/en/products/sdaz/) and five artwork variants in [Spirit Charmers](https://www.yugioh-card.com/en/products/sdsc/). These ten physical art variants are documented outside this four-print extension. They are not silently counted as covered 3D presentations.

## Reproduction and integrity

- `token-profile-inventory.json` records the native data hash, Lua inventory hash, exact profiles and counts.
- `lua-token-generators.json` contains the lexical method, source hashes and a reproducible extractor.
- `token-reference-art.json`, `token-generator-reference-art.json` and `commemorative-token-reference-art.json` identify every local image by source URL and SHA-256.
- `token-card-frame-reference-art.json` pins all 240 additional full/small JPEGs; `token-card-frame-delivery.json` records the compact lookup and alias coverage.
- `token-duel-support-art.json` and `token-duel-support-art-delivery.json` pin the six support-card references, 16 additional files, two reused crops and the final 145-entry native artwork lookup.
- `verified-commemorative-token-presentations.json` includes the Konami product sources and the four validated physical identifiers.
- `commemorative-token-gallery-inventory.json` retains the complete measured generic gallery list and its bounded scope.
- `build-token-catalog.py` regenerates the two presentation modules from the pinned source artefacts.

Run `node --test tests/token-monster-profiles.test.mjs` to compare all native Token identities and statistics, aliases, every image hash, the Lua source domains, the commemorative avatar boundary and the compact module’s dependencies. Native Lua, card-data and WASM archives remain unchanged.
