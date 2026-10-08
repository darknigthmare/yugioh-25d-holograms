# 14 Terrains urbains et architecturaux — sources inspectées et volumes

Les 14 JPG locaux ont été ouverts individuellement avant la construction des volumes. Le module [FieldEnvironmentUrbanReferences.js](../../src/ui/FieldEnvironmentUrbanReferences.js) apporte des formes distinctes issues de ces illustrations. Il utilise les helpers de la vraie factory et le sous-ensemble Three de production ; aucun renderer, texture de carte, animation ou état global supplémentaire n'est créé.

Les dimensions et la perspective sont adaptées à la périphérie du duel. Les personnages, figurines et détails peints restent dans l'illustration intacte. Cette reconstruction ne prétend pas reproduire intégralement chaque peinture en 3D ni sa perspective exacte. Les inscriptions illisibles d'Endymion et du théâtre sont des traits décoratifs abstraits, sans texte inventé.

| Terrain | Détails effectivement observés et reconstruits | Primitives / appels WebGL / matériaux |
| --- | --- | --- |
| Clock Tower Prison — 75041269 | Tour carrée bleu ardoise, deux cadrans perpendiculaires à bord doré, repères horaires, aiguilles à extrémités losange, quatre tourelles pointues, rangée d'arches noires | 95 / 13 / 5 |
| Golden Castle of Stromberg — 72283691 | Donjon rond, tourelles coniques dorées et finials, grand pignon central, fenêtres pointues, porte sombre, créneaux et escalier frontal | 65 / 8 / 4 |
| Magical Citadel of Endymion — 39910367 | Tour ronde, médaillons, fenêtres en arche, petite ville claire aux toits rouges, tourelles bleues, deux rubans roses ascendants et trois orbites bleues | 70 / 12 / 8 |
| Mausoleum of the Emperor — 80921533 | Deux obélisques orange à pointe pyramidale, brasero rond et flamme courbe, deux volées d'escalier et flancs pleins inclinés ; gardiens peints conservés | 23 / 8 / 3 |
| Mausoleum of White — 24382602 | Hautes colonnes pâles, chapiteaux ronds, canaux cyan et lumière verticale ; monument blanc courbe à étages et cabochons violets. Les figures et le dragon restent peints | 50 / 5 / 5 |
| Ancient City – Rainbow Ruins — 34487429 | Sept terrasses de gradins courbes divisées par trois allées d'escalier, quatre colonnes ocre annelées et sept bandes physiques d'arc-en-ciel | 64 / 5 / 4 |
| Kyoutou Waterfront — 56111151 | Fût bleu fin, anneaux dorés et diagonales de structure, grande galerie ronde vitrée avec vingt montants, coupole peu profonde, lanterne rouge et ville côtière basse | 112 / 9 / 5 |
| U.A. Stadium — 19814508 | Terrain vert dans des gradins ovales sombres, enveloppe pâle asymétrique reliée au bord des gradins et soulignée d'or, emblème rond rouge, écran cyan flottant et projecteurs croisés | 29 / 10 / 6 |
| U.A. Hyper Stadium — 12931061 | Bol ovale profond à neuf terrasses, six anneaux lumineux cyan, quarante-quatre ampoules, panneaux noirs diagonaux et bras architecturaux croisés bordés d'or, fenêtres cyan et projecteur | 73 / 8 / 6 |
| Abyss Playhouse – Fantastic Theater — 77297908 | Façade rouge, trois arches lumineuses, deux grands ornements en œil, enseigne en cœur rose, marquise claire, ampoules chaudes et escalier ; créatures et artistes peints conservés | 60 / 13 / 6 |
| Amazement Precious Park — 33773528 | Grande roue jaune à douze cabines suspendues, haute flèche blanche cylindrique à étages, manège rond rouge, hall à toit anguleux rayé et chemins courbes | 46 / 13 / 6 |
| Despia, Theater of the Branded — 99543666 | Corps sombre facetté, structure ouverte, losanges dorés et gemmes rouges, quatre tourelles en trompette évasée avec douze nervures chacune et pointes noires, roches suspendues et chaînes fines | 52 / 9 / 4 |
| Dogmatika Nation — 65589010 | Tours et murs violets en plusieurs plans, longues fenêtres gothiques, toits aiguille et couronne de cathédrale pâle dorée reliée à la citadelle lointaine | 73 / 9 / 5 |
| Ritual Sanctuary — 95658967 | Socle ovale doré à trois niveaux, faisceau triangulaire rose et confettis inclinés. La source montre des figurines de mariage, sans temple ; les figurines restent peintes | 28 / 7 / 6 |

Les appels ci-dessus sont mesurés par Chromium sur le renderer réel, y compris la passe additionnelle du faisceau transparent de Ritual Sanctuary. Le maximum observé est **112 primitives, 13 appels et 8 matériaux**, sous les limites de 220 / 18 / 10. Les triangles par carte et les matrices de caméra figurent dans le [rapport JSON](artifacts/field-urban-2026-10-07.json).

## Vérification

[field-urban-references.test.js](../../test/field-urban-references.test.js) passe ses **8 tests directs**. Ils couvrent les 14 constructions avec les seuls constructeurs Three disponibles en production, les coordonnées et normales finies, les indices valides, les formes concrètes (dont les cadrans perpendiculaires et les tourelles réellement évasées), l'orientation extérieure des marches, le corridor et les budgets. Les bornes transformées de **chaque instance entière** sont hors du corridor `[-9,-3,-18] → [9,30,17]`, avec une étendue horizontale inférieure à 48. Tous les buffers, matériaux et allocations d'instances sont libérés une seule fois, même lorsque le disposal est répété.

Les **11 tests directs** de [field-environment-geometry.test.js](../../test/field-environment-geometry.test.js) passent également, dont l'instanciation des 339 Terrains, la déterminisme et les protections des Terrains masqués/en attente/annulés. Cette vérification concerne les volumes et leur intégration ; elle ne constitue pas une nouvelle preuve de branches des règles de duel.

## Planches et reproduction

Chromium a rendu **42 images**, sur un unique contexte WebGL réutilisé : illustration source intacte, constructeur précédent archivé à `de9cda6`, puis nouveaux volumes. Chaque paire avant/après conserve la même caméra, lumière et exposition. Les trois planches ont été ouvertes et inspectées. Aucun échec HTTP, JavaScript ou WebGL n'a été signalé.

- [Châteaux et mausolées](artifacts/field-urban-castles-2026-10-07.jpg)
- [Ruines, waterfront, stades et théâtre](artifacts/field-urban-stadiums-2026-10-07.jpg)
- [Parc, Despia, Dogmatika et Ritual Sanctuary](artifacts/field-urban-theaters-2026-10-07.jpg)

La première inspection a permis de retourner l'ouverture des gradins de Rainbow Ruins, de corriger leurs faces éclairées, d'attacher la couronne blanche de Dogmatika à son bâtiment et de rendre la coque U.A. continue. Les planches publiées correspondent à la version finale après ces corrections.

Le [script reproductible](../../scripts/audit-field-urban-references.py) utilise Playwright Python et `/usr/bin/chromium` déjà installés, sans ajouter de dépendance à l'application :

```sh
node test/field-urban-references.test.js
node test/field-environment-geometry.test.js
python3 scripts/audit-field-urban-references.py --capture
```

Le rapport conserve les SHA-256 des 14 sources exactes, du [constructeur précédent](artifacts/field-urban-baseline-de9cda6.js) et du module final. SHA-256 final du module Urban : `b3d94d8d9f427315fec3b0d36c775fc337d827b92ca6a8fd7de8d8665e5e61c9`.

Le lot Urban ajoute seulement son module, son test, ce script et les preuves associées. Le dispatch et les compteurs communs sont intégrés par le propriétaire de la factory. Ce lot ne modifie pas le moteur natif, son WASM ni les scripts Lua.
