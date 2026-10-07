# Terrains naturels : illustrations et volumes dédiés

Ce lot reconstruit les motifs réellement observés dans 14 illustrations originales locales, sans remplacer leurs JPEG. Deux silhouettes existantes, Zombie World et A Legendary Ocean, sont reprises ; les douze autres terrains reçoivent une géométrie dédiée. Chaque profil contient sa palette et ses motifs inspectés dans `src/ui/FieldEnvironmentNatureReferences.js`.

Les personnages et certains détails peints restent dans le fond original. Les volumes sont déplacés en périphérie pour laisser le corridor de duel libre. Les illustrations sont conservées à l'identique ; les volumes constituent une reconstruction adaptée, pas une reproduction spatiale 1:1.

## Références observées

Chaque lien mène au JPEG source utilisé. Les empreintes des fichiers et de la version du module sont archivées dans [le rapport de rendu](artifacts/field-nature-reference-2026-10-07.json).

| Terrain | Référence | Motifs reconstruits | Appels de rendu | Primitives avant fusion |
| --- | --- | --- | ---: | ---: |
| Zombie World | [4064256](https://images.ygoprodeck.com/images/cards_cropped/4064256.jpg) | Troncs violets contournés, tombes, rivière rouge, flèche osseuse et volutes cyan | 14 | 83 |
| A Legendary Ocean | [295517](https://images.ygoprodeck.com/images/cards_cropped/295517.jpg) | Aqueducs courbes sur hauts supports, tour crénelée, escalier, rayons sous-marins | 9 | 194 |
| Closed Forest | [78082039](https://images.ygoprodeck.com/images/cards_cropped/78082039.jpg) | Branches entrecroisées, œil jaune et pupille verticale | 5 | 45 |
| Acidic Downpour | [35956022](https://images.ygoprodeck.com/images/cards_cropped/35956022.jpg) | Pluie oblique, flaques violettes, rochers bas, vapeurs bouclées | 7 | 98 |
| Canyon | [28120197](https://images.ygoprodeck.com/images/cards_cropped/28120197.jpg) | Mesas à plateaux fermés, parois érodées et strates beiges | 10 | 10 |
| Amazoness Village | [712559](https://images.ygoprodeck.com/images/cards_cropped/712559.jpg) | Huttes de chaume sur pilotis, escaliers, palissade et feuilles pointues | 6 | 134 |
| Divine Wind of Mist Valley | [15854426](https://images.ygoprodeck.com/images/cards_cropped/15854426.jpg) | Ruban continu à six couleurs, paroi bleue facettée, orbes jaune vert | 3 | 13 |
| Naturia Forest | [37322745](https://images.ygoprodeck.com/images/cards_cropped/37322745.jpg) | Îlots rocheux flottants, végétation, lianes recourbées, arbre latéral | 11 | 47 |
| Mount Sylvania | [70222318](https://images.ygoprodeck.com/images/cards_cropped/70222318.jpg) | Sommet enneigé, forêt en couches, arbres ramifiés, ruisseaux et cascades | 12 | 73 |
| Venom Swamp | [54306223](https://images.ygoprodeck.com/images/cards_cropped/54306223.jpg) | Eau rouge brune, troncs moussus cassés, racines, roseaux, nénuphars et os immergés | 17 | 110 |
| Icejade Cenote Enion Cradle | [7142724](https://images.ygoprodeck.com/images/cards_cropped/7142724.jpg) | Vasques en étages, cascades, cônes flottants coiffés de glace, plantes violettes et glyphes turquoise | 10 | 106 |
| Reptilianne Recoil | [17000165](https://images.ygoprodeck.com/images/cards_cropped/17000165.jpg) | Labyrinthe angulaire violet, bandes noires et convergence d'éclairs cyan | 4 | 45 |
| Field Power Bonus | [88288421](https://images.ygoprodeck.com/images/cards_cropped/88288421.jpg) | Île surélevée, côte pâle, chaîne montagneuse, forêt, mer et boussole | 10 | 89 |
| Trirealm Rift Territory - Valvols | [33700664](https://images.ygoprodeck.com/images/cards_cropped/33700664.jpg) | Nuages d'orage, éclairs blancs, deux volcans, lave rouge, vortex cyan et magenta, arbres dénudés | 15 | 51 |

## Vérification

`node --test test/field-nature-references.test.js` vérifie les JPEG par SHA-256, les motifs observés, l'absence de props génériques sans rapport, le constructeur Three réellement utilisé par le duel, tous les sommets et normales, les limites du corridor et les budgets. Les tests rayonnent les plateaux de Canyon et plus de 200 points de lave de Valvols contre les vrais triangles. Les plantes d'Icejade doivent rester devant la coque opaque, avec une vérification par rayon. Chaque géométrie partagée est libérée une fois lors du remplacement du terrain.

La fusion des courbes conserve des groupes distincts à gauche, à droite et à l'horizon. Elle réduit les appels sans réunir les deux bords dans une boîte englobante qui obstruerait le corridor. Maximum du lot : 17 appels, 7 matériaux, 194 primitives avant fusion ; Icejade est le terrain le plus dense, à 35 296 triangles.

`python scripts/audit-nature-terrain-references.py --base-url http://127.0.0.1:5174` rend les 14 vrais modules dans Chromium/WebGL avec `FIELD_GEOMETRY_THREE`, puis les compare à la géométrie ancienne figée dans `field-geometry-baseline-6c0232f.js`. La caméra et l'éclairage sont identiques avant/après pour chaque carte. Le rapport contient les paramètres, les vrais appels et les empreintes sources. Aucun effet de carte ni aucune information privée de duel n'est utilisée par cet audit.

Field Power Bonus et Valvols sont nouveaux dans le catalogue local : leur colonne « avant » applique le constructeur précédent aux nouvelles références et ne représente pas un ancien déploiement de ces cartes.

Les captures finales, inspectées après correction des normales extérieures, sont [la première planche](artifacts/field-nature-comparison-2026-10-07-1.png) et [la seconde](artifacts/field-nature-comparison-2026-10-07-2.png). Aucun message d'erreur navigateur n'a été enregistré.

L'inspection visuelle a corrigé des écarts concrets : Closed Forest représente un œil derrière du bois, pas une forêt ouverte ; Divine Wind montre un ruban arc-en-ciel sur paroi bleue ; Reptilianne Recoil montre un labyrinthe énergétique. Les plateaux de Canyon sont fermés et les cônes/montagnes ont des normales tournées vers l'extérieur. Les plantes violettes d'Icejade ont été déplacées hors de leurs cônes pour rester visibles.
