# Frontier : 45 sources reconstruites — 7 octobre 2026

Les 45 JPG locaux ont été ouverts individuellement avant conception. Le module traite chaque source avec les motifs relevés dans son illustration : cavernes, cités, temples, machines, cartes, paysages saisonniers, circuits ou arrière-plans lumineux. Les fichiers source sont inchangés et conservent toutes leurs figures.

Les volumes sont adaptés à la périphérie du duel et à sa lisibilité. Ce lot ne prétend pas recréer intégralement les perspectives, les personnages ou la scène en 1:1. Les cartes dominées par des créatures reconstruisent leur arrière-plan observable. Les inscriptions, cartes peintes, graffitis et emblèmes détaillés restent dans la source ; leurs segments géométriques éventuels sont des approximations, sans nouvelle texture.

## Preuve finale

- `node test/field-frontier-references.test.js` : 11 tests passants, sans exclusion, avec la vraie factory et le namespace limité `FIELD_GEOMETRY_THREE`.
- 45 groupes : chaque AABB d’instance entière reste hors corridor, étendue horizontale inférieure à 48, positions/normales finies et indices valides. Destruction unique de toutes les instances, buffers et matériaux créés, y compris ceux inutilisés.
- Chromium : 135 images source/avant/après, douze planches ouvertes et revues. Aucun échec HTTP ou erreur de page. Un seul renderer réutilisé ; zéro géométrie suivie par Three après chaque destruction. La mémoire GPU au-delà de ce compteur n’est pas mesurée.
- Maxima réels : 208 primitives, 18 appels de rendu, 8 matériaux utilisés. Budgets respectés : 220 / 18 / 10.
- Le contrôle raycast conserve les 96 segments et 48 branches des coulées de Molten au-dessus du terrain irrégulier, vérifie l’ouverture effective de Liang et le dégagement de la rivière Summer par rapport aux terrasses. Les surfaces volcaniques et flottantes ont des normales sortantes.

## Baseline et empreintes

L’avant archive exactement `ba6c62aa6b3db8f15efad52e3ee8d5fcd143b601` : factory originale et ses 8 modules directement importés. Seules les URL relatives de la copie servie sont réécrites. Les 45 empreintes JPG correspondent à ce commit ; caméra, lumière, exposition et résolution sont identiques avant/après pour chaque source.

L’après utilise la factory finale commune aux six nouveaux lots. Le rapport enregistre les empreintes de ses 14 imports, du registre, du namespace de production et du script d’audit. Le script vérifie leur stabilité pendant la capture. La même factory est utilisée dans le rapport Engineering final.

- Module : `926e4873ff5e4c2a038f310eb6d5c702ed8dbe3d92bced322b88fe1cb21997af`
- Tests : `59bf1ad69069a6717f9cc0c960799b5fc6412cb85e2bfe699727947f65e1ad26`
- Factory finale : `134b5a9e4cf1982b82a43e54f860522833cf1cea16013003b54153fc79dedb3c`
- Factory originale avant : `b83bba7f70345735cdd0921503fbed0579fe71dba67e5c84fd0b849391e0b121`
- Détails, caméras, empreintes source/dépendances/planches et mesures par carte : [report.json](artifacts/field-frontier-2026-10-07/report.json).

## Motifs observés et adaptations

| Source | Motifs source guidant la reconstruction |
|---|---|
| Adamancipator Laputite — 46552140 | branching purple cave shelves and hanging stalactites ; cyan crystal clusters around a distant luminous opening; explorers stay painted |
| Beetrooper Formation — 64213017 | broad curved cyan bands through a pale cloudy sky ; distant low green mountains and fine sparkles; all insect cavalry stay painted |
| Pere-Zenet Em Heru — 46273941 | four engraved square gold columns and rectangular side bays ; stepped circular stone floor with four pedestal fire bowls and rising green wisps; figures stay painted |
| Camelot, Realm of Noble Knights and Noble Arms — 15635751 | layered white castle with crenellations and many slender pointed turrets ; red banners, narrow dark windows and dense forest around the foundations |
| Catapult Zone — 14289852 | two timber catapults with winches, cups, ropes and paired wheels ; distant pink cylindrical castle walls, airborne stones and low mist; people stay painted |
| Cynet Universe — 61583217 | cyan hexagonal sheets, segmented calibration discs and bright linked nodes ; curved pink blue comet traces over a diagonal fine grid |
| Dark Contract with Patent License — 33814281 | tall uneven rectangular stacks with closely spaced paper-edge grooves ; curling loose paper sheets beneath a violet spiral and pink moon |
| Defense Zone — 59687381 | cyan square floor lattice and small hexagonal marks ; red vertical grid panels and a pale rectangular goal frame; all defenders stay painted |
| Don't Slip, the Dogs of War — 65938950 | pink sloping truss beams and gold sawtooth frieze ; large central paw banner and colored diamonds above a planked floor; all dogs stay painted |
| Dragonic Diagram — 13035077 | gold circular and angular floor diagram ; high cloudy banks and slanted white light rays; projected dragon and people stay painted |
| Dreamland — 26920296 | deep irregular floating cliff with grass-covered top and hanging roots ; cluster of stepped pale spires, curved arches and small neighboring islands; central statue stays painted |
| Drytron Fafnir — 58793369 | dense blue violet star field and bright crossed glints ; long cyan and magenta luminous trails; every mechanical dragon remains painted |
| Empowerment — 54250060 | gold pink blue and green radial light rays ; dense fine gold sparks behind the winged figure; creature stays painted |
| Enneapolis — 17621695 | tall angular white blade towers with blue longitudinal seams ; circular cantilever terraces and uninterrupted looping elevated roads above dense low blocks and a coastal horizon |
| Fire Fortress atop Liang Peak — 66750703 | curving gray perimeter wall with tiled cap and an arched gateway ; three connected stair flights lead through wooded slopes to white temples with dark blue upturned roofs |
| Fire King Island — 57554544 | ribbed volcano with an open orange crater surrounded by thick jungle ; pale striated coastal cliffs, scattered small ruins, low clouds and breaking white surf; flying creature stays painted |
| Fire Prison — 269510 | broad orange curled flames against dense gray smoke ; forked cyan lightning above the fire; dragon stays painted |
| Floowandereeze and the Magnificent Map — 28126717 | ragged parchment coast and ornate teal paths ending in curled scrolls ; small flat cartographic landmarks; birds and symbols remain in the original map |
| Forest of Lost Flowers — 91228233 | continuous gnarled purple trunks, slanting roots and thin branching bud stems ; blue elongated buds, flat turquoise mushrooms, orange cup fungi and bright five-petal pink flowers |
| Galloping Gaia — 2106266 | broad gold orange speed rays and a low blazing field ; small scattered dark fragments; mounted knight and golden creature stay painted |
| Hideout in the Sky, Coulomb — 37654623 | dense multicolor container towers with small windows and corrugated roofs ; bridges, stairs, dish, lattice cranes, hanging cables and a tall glowing central antenna |
| JJ "Kewl Tune" — 14442329 | arched double black door with inset windows and long handles ; parallel blue red green neon pipe arches, gray elbow conduits, fluorescent wall fixtures and descending stairs; graffiti stays painted |
| Jurrac Volcano — 89948817 | low broad red caldera with glowing jagged streams ; large vertical eruption, fine ballistic orange trajectories and many airborne dark rock fragments; creature stays painted |
| Kozmotown — 67237709 | jagged industrial skyline filled with irregular cyan yellow windows ; large sunset glow, layered clouds and a perspective road grid; foreground shuttle stays painted |
| Magical Meltdown — 47679935 | double inscribed crimson floor rings with interlocking triangles ; vertical red energy columns, tiny incandescent sparks and forked red lightning; magician stays painted |
| Majesty's Pegasus — 76473843 | broad pale mint ribbons looping through the sky ; eight-point star glints and thin white lightning; all winged creatures stay painted |
| Materiactor Meltthrough — 66059345 | angular brown broken rock edges behind a bright peach flash ; dense thin violet lightning; liquid creature and its apparent waterfalls stay painted |
| Mimighoul Dungeon — 86809440 | stone block vault with deep central pit and uneven pavers ; suspended two-tier iron grate cage with linked chains and warm wall torch; skulls, creatures and treasure figures stay painted |
| Molten Destruction — 19384334 | irregular folded black caldera with surface-matched winding lava and connected branches ; open incandescent crater, airborne lava fragments and layered warm clouds with curled smoke |
| Mystic Mine — 76375976 | ribbed cave walls and uneven hanging stalactites ; continuous purple green teal wisps and low white fog with small gold sparks; people and held orange glyph stay painted |
| Mystic Plasma Zone — 18161786 | continuous grooved violet cloud vortex with attached folds and inward curls ; branched cyan lightning, jagged distant mountains and a sloping gray green stepped rock shelf |
| Myutant Evolution Lab — 34572613 | row of tall curved glass vats with dark round flanged bases ; gray jointed manipulation arm with round pivots, fluid highlights and tiny rising bubbles; specimen stays painted |
| New Frontier — 56787189 | layered ochre canyon town with irregular spires and distant narrow towers ; foreground curved red and blue pavilion roofs and timber galleries; flying vehicle and people stay painted |
| Pressured Planet Wraitsoth — 71832012 | red multi-tier Japanese pagodas with glowing rectangular circuit seams ; gray round-topped windows, red elliptical energy arcs and floating rock chips; fighters stay painted |
| Primitive Planet Reichphobia — 56063182 | broad overhanging rock plateau and vertically striped rear mesas ; evergreen grove, low dust and a bright teal comet with a granular tail; armed beasts stay painted |
| PSY-Frame Circuit — 575512 | large slanted yellow green circuit grid ; branching green electric traces and radial charged flashes; entire mechanical creature stays painted |
| Ryu-Ge War Zone — 55276522 | three distinct large engraved battle discs in red rock, jade cloud and icy blue water ; diagonal striated coast between them, broken rocky rims and dense pale cloud banks |
| Ryzeal Cross — 6798031 | four tall yellow reactor cells with springs and a shared upper bus ; large circular blue gold segmented dynamo, stacked radiator fins and looping cyan electric streams |
| Sky Striker Airspace - Area Zero — 50005218 | green red perspective grid below floating gold triangle reticles ; rectangular blue red display panels, fine horizontal bars and a long curved cyan arrow; source typography stays painted |
| Skyscraper — 63035430 | enclosing dark facades with tall yellow window grids and added horizontal masonry ribs ; stepped central spire with arched crown, textured full moon and crossed broad searchlights |
| Spring — 60600821 | overlapping long mountain ridges and a five-tier pagoda silhouette ; foreground thin plum branches with pink five-petal blossoms, low lavender mist and warm horizon; calligraphy stays painted |
| Starlight Junktion — 1003840 | continuous four-loop elevated interchange with rainbow lanes and tall supports ; two crossing roads over luminous city blocks with many crossed star glints |
| Stars Align Above the Shrine — 15306543 | upturned dark green bridge with post-hung catenary rails and thin bamboo leaves ; large overhead cyan ellipse and tapering light shaft, drifting feather shapes and many stars; fine emblem remains painted |
| Summer — 97254001 | long winding pale river between stepped rice terraces and thin dark dykes ; dense bordering forest, layered night clouds, full moon and warm fireflies; calligraphy stays painted |
| Synchro World — 36742774 | curved metallic arena road with parallel border lanes and stepped side seating ; tall gridded wire fences and blue violet converging speed streaks; rider and motorcycle stay painted |

Molten Destruction, Mystic Plasma Zone, Cynet Universe et Skyscraper étaient déjà étudiés. Leurs formes physiques testées sont conservées et enrichies : couches et fumée du ciel, stries de nuages et relief de sol, disques étalonnés et liens continus, reliefs de façade et couronne arquée. Cette reconstruction supplémentaire se fonde sur de nouveaux détails visibles ; elle ne repose pas sur un renommage.

La revue a corrigé les normales des nouveaux volcans, les falaises de New Frontier/Reichphobia, le passage de Liang, les voies colorées de Starlight et le tracé dégagé des rizières Summer. Les cadrages de Enneapolis, Skyscraper, Summer et Stars Align Above the Shrine ont été ajustés ensemble avant/après afin de montrer l’ensemble des volumes.

Les petites villes, forêts, reliefs, lettres et symboles sont des adaptations simplifiées. Le lot ne reconstruit pas les statues centrales de Dreamland, les insectes de Beetrooper, les dragons de Drytron, les figures de Materiactor, les appareils ou emblèmes tenus par des personnages, ni les véhicules illustrés. Les détails cartographiques de Floowandereeze restent des repères plats, sans inventer une ville à partir de leur nom.

## Planches

- [Source / avant / après — planche 1](artifacts/field-frontier-2026-10-07/frontier-source-before-after-1.jpg)
- [Source / avant / après — planche 2](artifacts/field-frontier-2026-10-07/frontier-source-before-after-2.jpg)
- [Source / avant / après — planche 3](artifacts/field-frontier-2026-10-07/frontier-source-before-after-3.jpg)
- [Source / avant / après — planche 4](artifacts/field-frontier-2026-10-07/frontier-source-before-after-4.jpg)
- [Source / avant / après — planche 5](artifacts/field-frontier-2026-10-07/frontier-source-before-after-5.jpg)
- [Source / avant / après — planche 6](artifacts/field-frontier-2026-10-07/frontier-source-before-after-6.jpg)
- [Source / avant / après — planche 7](artifacts/field-frontier-2026-10-07/frontier-source-before-after-7.jpg)
- [Source / avant / après — planche 8](artifacts/field-frontier-2026-10-07/frontier-source-before-after-8.jpg)
- [Source / avant / après — planche 9](artifacts/field-frontier-2026-10-07/frontier-source-before-after-9.jpg)
- [Source / avant / après — planche 10](artifacts/field-frontier-2026-10-07/frontier-source-before-after-10.jpg)
- [Source / avant / après — planche 11](artifacts/field-frontier-2026-10-07/frontier-source-before-after-11.jpg)
- [Source / avant / après — planche 12](artifacts/field-frontier-2026-10-07/frontier-source-before-after-12.jpg)

Cet audit contrôle la géométrie de production dans un renderer réel. Il ne remplace pas l’audit du duel complet et ne revendique pas de nouvelle validation des règles natives. Aucun changement du core, du WASM, des scripts Lua ou des dépendances.
