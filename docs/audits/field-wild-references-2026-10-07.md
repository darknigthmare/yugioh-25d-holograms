# Terrains sauvages : 20 reconstructions de repères — 7 octobre 2026

Les **20 JPG ont été ouverts et inspectés individuellement** avant la construction.
Le module intégré apporte des compositions distinctes de troncs, racines,
canopées, falaises, jardins, dunes et ruines. Les **9 contrôles directs passent**,
et Chromium a produit **60 vues source/avant/après**, sans erreur. Les cinq
planches finales ont été relues visuellement après les corrections.

Les illustrations restent intactes : leurs SHA-256 correspondent au snapshot
pinné. Les figures dessinées restent dans l’image. Rikka Konkon et Harpies’
Hunting Ground sont dominés par des personnages ; leurs volumes ajoutés se
limitent aux branches, signes de neige et reliefs ou traits de sol réellement
observés. Pour Triamid Kingolem, seuls la plateforme, les panneaux et les tubes
sont adaptés : aucun modèle complet du personnage mécanique n’est annoncé.

Les proportions et positions sont adaptées à la périphérie du duel. L’ouverture
centrale visible dans les planches est le corridor réservé aux cartes. Cette
volumétrie reprend les motifs de la peinture et conserve du parallaxe ; elle ne
reproduit pas la perspective, les textures, la densité végétale ou toute la
composition spatiale de l’illustration à l’identique.

La relecture a conduit à compléter le toit et la ferronnerie d’Aroma Garden,
élargir la canopée et suivre les surfaces d’écorce de Gaia Power, conserver les
deux massifs asymétriques de Mountain, placer les plantes au-dessus de leurs
terrains, matérialiser la fissure de Sogen et donner aux ruines de Golgonda un
sol de dunes visible. Ces corrections sont incluses dans les captures finales.

| Carte | Terrain | Primitives avant regroupement | Appels réels Chromium | Matériaux |
| --- | --- | ---: | ---: | ---: |
| 87624166 | Ancient Forest | 82 | 6 | 2 |
| 5050644 | Aroma Garden | 193 | 16 | 1 |
| 71645242 | Black Garden | 79 | 6 | 1 |
| 62265044 | Dragon Ravine | 43 | 8 | 2 |
| 87430998 | Forest | 111 | 14 | 1 |
| 56594520 | Gaia Power | 64 | 8 | 1 |
| 75782277 | Harpies’ Hunting Ground | 45 | 4 | 1 |
| 10080320 | Jurassic World | 76 | 11 | 2 |
| 17228908 | Lost World | 59 | 7 | 1 |
| 50913601 | Mountain | 27 | 6 | 2 |
| 76869711 | Rikka Konkon | 97 | 5 | 2 |
| 86318356 | Sogen | 38 | 7 | 2 |
| 23424603 | Wasteland | 33 | 6 | 1 |
| 45383307 | Triamid Cruiser | 173 | 9 | 2 |
| 9989792 | Triamid Fortress | 88 | 7 | 1 |
| 72772445 | Triamid Kingolem | 143 | 5 | 1 |
| 84335863 | White Rose Cloister | 220 | 7 | 1 |
| 12801833 | Traptrip Garden | 72 | 7 | 2 |
| 60884672 | Great Sand Sea - Gold Golgonda | 50 | 8 | 1 |
| 7206349 | Vernusylph in Full Bloom | 81 | 10 | 1 |

Le maximum observé est de **220 primitives, 16 appels et 2 matériaux**. Les
limites sont 220 primitives, 18 appels et 10 matériaux. Le test utilise le vrai
factory et `FIELD_GEOMETRY_THREE`, sans importer une seconde namespace dans le
module de décor. Il contrôle tous les buffers de positions, normales et couleurs,
les indices, l’étendue horizontale inférieure à 48 et l’absence d’intersection
du corridor pour chaque instance entière, après application de sa matrice.
Le compteur de primitives est établi avant le regroupement des motifs.

Mountain garde un massif droit de **25** et un massif gauche de **11**, soit un
rapport de 2,27. Le test mesure les rayons d’une rangée de chacun des buffers à
112 segments et trouve **42 maxima de relief par massif**, soit 84 au total.
Gaia possède un tronc continu de **27**, des racines couvrant environ **23,1**
en largeur et une canopée supplémentaire couvrant environ **29,4**. Les contrôles
de plantes comparent aussi leurs bases aux triangles réellement tessellés du sol.

La vérification de remplacement instrumente les géométries, matériaux et
ressources d’instances dès leur création. Elle inclut les ressources inutilisées
du host et confirme leur libération exactement une fois, même avec un second
appel de destruction. L’audit ne prétend pas mesurer toutes les allocations GPU.

Le [rapport complet](artifacts/field-wild-2026-10-07/report.json) conserve les
caméras, statistiques et SHA exacts. L’ancienne factory et ses cinq modules de
référence sont archivés depuis le commit `2bc79f1cd9b7a8b67df04696cde4010b3038dd48`.
Un seul renderer WebGL est réutilisé pour les 40 rendus avant/après ; la caméra
et la lumière restent identiques pour chaque comparaison. Les images source
sont affichées séparément, sans texture de carte appliquée à la géométrie.
Chromium utilise SwiftShader pour cette preuve locale.

SHA-256 du module final :
`b8db1cfd37d85dfd222d0b6c9a89934cc1f9c0d0ce7ae3e95325efafdb07d0c7`.
SHA-256 de la factory intégrée capturée :
`b83bba7f70345735cdd0921503fbed0579fe71dba67e5c84fd0b849391e0b121`.
SHA-256 de la factory archivée :
`5c5d86bee1abaf9244ded5e7dfed65bdb88678e15acffbd896824f502387601a`.
SHA-256 du script de capture :
`8757799821cd48c55f132206656b3966150db135cf7266c9b7e771e106b98234`.

Planches comparatives :

- [1 — Ancient Forest, Aroma Garden, Black Garden, Dragon Ravine](artifacts/field-wild-2026-10-07/field-wild-board-1-2026-10-07.jpg)
- [2 — Forest, Gaia Power, Harpies’ Hunting Ground, Jurassic World](artifacts/field-wild-2026-10-07/field-wild-board-2-2026-10-07.jpg)
- [3 — Lost World, Mountain, Rikka Konkon, Sogen](artifacts/field-wild-2026-10-07/field-wild-board-3-2026-10-07.jpg)
- [4 — Wasteland, Triamid Cruiser, Fortress et Kingolem](artifacts/field-wild-2026-10-07/field-wild-board-4-2026-10-07.jpg)
- [5 — White Rose Cloister, Traptrip Garden, Golgonda, Vernusylph](artifacts/field-wild-2026-10-07/field-wild-board-5-2026-10-07.jpg)

Les 60 PNG individuels sont conservés dans le même dossier. Le rapport liste
leurs noms. Pour reproduire :

```sh
node test/field-wild-references.test.js
python scripts/audit-field-wild-references.py --capture
```

L’audit sert uniquement les modules et JPG locaux sur un port éphémère. Il
n’ouvre aucun duel, n’utilise aucun hook QA et ne lit aucun état de carte privée.
Aucune dépendance npm, WASM, donnée de carte ou règle Lua n’a été modifiée par ce lot.
