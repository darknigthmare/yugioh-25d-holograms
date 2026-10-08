# Terrains technologiques, industriels et mécaniques — 7 octobre 2026

Ce lot reconstruit les volumes de **16 illustrations réellement ouvertes et inspectées**, dans [FieldEnvironmentTechnologyReferences.js](../../src/ui/FieldEnvironmentTechnologyReferences.js). Chaque source JPG locale a été examinée avant conception. Les illustrations restent intactes ; les personnes, monstres et locomotives qui y apparaissent ne sont pas remplacés par des modèles approximatifs. Les profils sont identifiés par le passcode canonique, avec une palette et des motifs propres à chaque source.

Ces volumes sont adaptés à la périphérie du plateau. Le lot apporte **16 études d’illustrations et 16 reconstructions de volumes** ; il ne prétend pas reproduire intégralement l’espace peint en 1:1. Les repères procéduraux précédents et les vrais effets de cartes restent des preuves distinctes.

| Terrain | Formes observées et reconstruites | Primitives / appels / matériaux |
| --- | --- | ---: |
| Boot Sector Launch · 36668118 | Rotor ouvert à dents, carter rouge, axe latéral et ports cyan | 31 / 9 / 4 |
| Brain Research Lab · 85668449 | Cuve verte transparente, paroi de moniteurs et cadrans, câbles suspendus | 105 / 9 / 5 |
| GMX Lab #5 · 74378580 | Béton effondré aux bords fracturés, tuyaux exposés, entrée barrée, palmes et lianes | 68 / 10 / 6 |
| Rescue-ACE HQ · 63899465 | Réacteur rouge étagé, cylindres latéraux, base concentrique, panneaux cyan et câbles jaunes | 33 / 14 / 7 |
| Cynet Storm · 42461852 | Entonnoir continu, spirales magenta et blanches, alvéoles et fragments de données | 135 / 5 / 5 |
| Fusion Recycling Plant · 22829942 | Bâtiment, cheminée, tuyau courbé, pente de débris, projecteurs et anneaux lumineux | 69 / 13 / 5 |
| Geartown · 37694547 | Grands engrenages ouverts, tours ocre, arbres métalliques et fenêtres rondes jaunes | 35 / 10 / 7 |
| Iron Core Specimen Lab · 53039326 | Parois orange à pistes angulaires, sonde hexagonale suspendue, câbles et consoles | 50 / 9 / 7 |
| Scrap Factory · 28388296 | Cuve ouverte de métal fondu, griffe courbe, plaques dentelées et arbre transversal | 12 / 10 / 5 |
| Union Hangar · 66399653 | Trois tambours jaunes, pods alternés en saillie et raccords verts | 56 / 7 / 5 |
| B.E.F. Zelos · 975299 | Cadres de lancement successifs, ports ronds cyan et faisceaux verts croisés | 43 / 5 / 4 |
| Meklord Fortress · 67328336 | Dôme continu, deux anneaux cyan, pointes recourbées, couronne et lumière en ∞ | 13 / 9 / 4 |
| Orcustrated Babel · 90351981 | Tour effilée, ruban doré continu à fentes, cage croisée, socle circulaire et petits tuyaux d’orgue | 196 / 9 / 6 |
| Revolving Switchyard · 76136345 | Fosse circulaire, pont à treillis, portique rouge, sept paires de rails radiaux et cinq remises | 84 / 9 / 6 |
| Numeron Network · 41418852 | Nervures orange aux cellules polygonales irrégulières, flèches sombres, jonctions et sphères roses | 142 / 5 / 3 |
| Laser Qlip · 43034264 | Quatre piliers à nervures, pointes hautes et basses, cadre supérieur courbe et chambre centrale | 54 / 10 / 3 |

Les chiffres proviennent du [rapport Chromium](artifacts/field-technology-2026-10-07/report.json), qui conserve également les SHA-256 du module, du factory, du baseline et de chaque JPG, ainsi que les caméras utilisées. Les maxima du lot sont **196 primitives, 14 appels et 7 matériaux**, sous les budgets **220 / 18 / 10**. Les tests vérifient que chaque instance reste hors du corridor jouable et sous l’étendue horizontale maximale.

Les **48 images** comparent la source, les anciens volumes et le nouveau constructeur avec la même caméra et la même lumière. Le baseline archivé est le factory intégré dont seuls les imports, maps et dispatch de ce lot ont été retirés ; les anciens accessoires et le fallback de famille restent présents. Il ne représente pas une capture historique d’un commit distinct. Les quatre planches ont été ouvertes pour inspection, puis renouvelées après correction de la visibilité de la lave, du rotor clair et de la largeur du ruban de Babel.

- [Planche 1 : lancement, laboratoires et poste de commande](artifacts/field-technology-2026-10-07/technology-source-before-after-1.jpg)
- [Planche 2 : entonnoir numérique, recyclage, engrenages et sonde](artifacts/field-technology-2026-10-07/technology-source-before-after-2.jpg)
- [Planche 3 : fonderie, hangar, lancement et dôme](artifacts/field-technology-2026-10-07/technology-source-before-after-3.jpg)
- [Planche 4 : Babel, voies ferroviaires, réseau et structure suspendue](artifacts/field-technology-2026-10-07/technology-source-before-after-4.jpg)

L’audit utilise **un seul renderer WebGL**, séquentiellement réemployé, et le même namespace Three borné que l’application. Aucune erreur de page ou de chargement n’a été observée. `renderer.info.memory.geometries` revient à **0 après chaque destruction** ; les tests comptent également chaque disposal de buffer, matériau et instance une seule fois. Ce contrôle ne mesure pas toutes les allocations GPU.

Les [cinq tests du lot](../../test/field-technology-references.test.js) exercent le vrai factory intégré : budgets, corridor, tableaux et indices finis, normales des faces des engrenages, surfaces et courbes continues, ouverture de la cuve, compositions distinctes et disposal. Les formes utilisent les helpers partagés ; le module n’importe pas un second namespace Three et ne crée ni animation ni texture de carte.

```sh
node --test --test-isolation=none test/field-technology-references.test.js
python scripts/audit-field-technology-references.py --capture
```

Le script de capture sert seulement les modules locaux, Three et les JPG déjà archivés. Il ne modifie pas les images et ne requête aucun service d’assets externe.
