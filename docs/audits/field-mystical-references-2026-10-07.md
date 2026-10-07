# Géométrie des Terrains mystiques — 7 octobre 2026

Quatorze Terrains supplémentaires possèdent des repères géométriques issus de
leurs illustrations locales, ouvertes individuellement avant construction.
Le constructeur est intégré au vrai registre et au factory d'environnement.
Les JPG restent intacts : les empreintes de chaque source correspondent au
snapshot de référence existant.

| ID | Terrain | Repères observés reconstruits |
| --- | --- | --- |
| 94243005 | Chaos Zone | Quadrillage bleu déformé, galaxies cyan en spirale, ouverture blanche |
| 33550694 | Fusion Gate | Entonnoir violet, bandes incurvées, grille verte au sol |
| 42015635 | Neo Space | Rubans nuageux multicolores en spirale, petits ovales lumineux |
| 87902575 | Future Visions | Fenêtres paysagères inclinées, cadres menthe, galaxies violettes |
| 20720928 | Metaphys Factor | Ouverture irrégulière fracturée, éclats colorés, foudre bleue |
| 34822850 | Void Expansion | Nuages cyan, petites îles rocheuses, diagramme de nœuds colorés |
| 33900648 | Clear World | Prisme hexagonal bleu pointu, rayons blancs, halos circulaires |
| 69296555 | Array of Revealing Light | Sceau cyan, étoile angulaire rose, cercle doré, petites marques |
| 58406094 | Starry Knight Sky | Nébuleuse turquoise diagonale, étoiles dorées et vertes, points cyan |
| 675319 | Zodiac Sign | Signes violets dentelés, traînées diagonales, éclats radiaux |
| 27813661 | Sky Iris | Halos concentriques multicolores, lignes triangulaires, perles lumineuses |
| 69217334 | Breaking of the World | Rayons cyan convergents, plaques de pierre angulaires, foudre rose |
| 95856586 | Zexal Field | Halo sphérique doré, panneaux colorés, rayons et bandes courbes |
| 4545854 | Xyz Territory | Coque ronde cyan, traînées multicolores, fragments sombres périphériques |

Les personnages et créatures restent dans les illustrations conservées. Les
formes reprennent les repères visibles et les adaptent à l'espace périphérique
du duel ; elles ne constituent ni des modèles complets de personnages ni une
reproduction spatiale intégrale de la perspective peinte.

Les six tests d'intégration passent avec le namespace Three borné utilisé en
production. Ils vérifient les sources intactes, les motifs propres à chaque
carte, les indices et normales finis, la préservation des couleurs après
fusion des buffers, les extrémités du prisme, la courbure des quadrillages,
les limites, le corridor libre et la libération unique des buffers, matériaux
et attributs d'instances au remplacement.

Le rendu Chromium réel de 42 images compare source, géométrie précédente et
nouvelle géométrie avec la même caméra et la même lumière pour chaque carte.
Les quatre planches ont été ouvertes et inspectées. Cette inspection a permis
de corriger une émission blanche qui pâlissait les couleurs des sommets, puis
de remplacer des pierres trop arrondies et des signes trop pleins par leurs
formes angulaires observées. La capture finale ne comporte aucune erreur de
page ou de ressource. Les maxima constatés sont **11 appels de rendu, 8
matériaux et 126 primitives**, sous les budgets de 18, 10 et 220. Aucun volume
ne croise le corridor jouable ; leurs coordonnées horizontales restent dans
les limites de 48 unités.

Le [rapport JSON](artifacts/field-mystical-2026-10-07.json) contient les
empreintes des sources, du module et de la baseline archivée, les caméras et les
mesures avant/après. Planches finales :

- [Chaos Zone, Fusion Gate, Neo Space, Future Visions](artifacts/field-mystical-board-1-2026-10-07.jpg)
- [Metaphys Factor, Void Expansion, Clear World, Array of Revealing Light](artifacts/field-mystical-board-2-2026-10-07.jpg)
- [Starry Knight Sky, Zodiac Sign, Sky Iris](artifacts/field-mystical-board-3-2026-10-07.jpg)
- [Breaking of the World, Zexal Field, Xyz Territory](artifacts/field-mystical-board-4-2026-10-07.jpg)

```sh
node --test test/field-mystical-references.test.js
python scripts/audit-field-mystical-references.py --capture
```

Le script utilise Playwright Python et Chromium déjà installés. Il réutilise un
seul renderer, libère chaque scène après sa capture et n'instancie ni partie,
état privé adverse, texture de carte sur la géométrie ni hook de développement.
