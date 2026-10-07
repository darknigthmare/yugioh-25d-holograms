# Engineering : 24 sources reconstruites — 7 octobre 2026

Les 24 JPG locaux ont été ouverts individuellement avant conception. Les nouvelles formes reprennent les éléments effectivement visibles : ateliers, circuits, voiles, forteresses, attractions, portails et arrière-plans lumineux. Les personnages, créatures, armures et véhicules illustrés restent dans les JPG originaux. Aucune nouvelle texture ni source modifiée.

La volumétrie est adaptée à la périphérie du duel. Elle ne prétend pas restituer toute la scène ni sa perspective en 1:1. Les sources dominées par des figures reconstruisent uniquement leur environnement et leurs traits lumineux observables ; les lettres et symboles fins restent des approximations géométriques.

## Vérification

- `node test/field-engineering-references.test.js` : 8 tests passants, sans exclusion, via la vraie factory et `FIELD_GEOMETRY_THREE`.
- 24 groupes respectent le corridor pour chaque instance entière, des coordonnées et normales finies, des indices valides, une étendue horizontale inférieure à 48 et une destruction unique de toutes les géométries, instances et tous les matériaux, même inutilisés.
- Maxima mesurés dans Chromium : 178 primitives, 18 appels réels de rendu, 9 matériaux utilisés. Budgets : 220 / 18 / 10.
- Un seul renderer réutilisé ; 72 images source/avant/après, aucune erreur de page ou HTTP, aucune géométrie encore suivie après chaque disposal. Les six planches ont été ouvertes et examinées.
- Les corrections issues de cette revue portent sur les normales de la lave, des volcans et de la coque rayée, ainsi que les fonds des ouvertures de Megaroid et Magnacarrier. Les tests vérifient les normales et les vrais cadres ajourés.

## Comparaison et provenance

L’avant archive exactement la factory et ses 8 modules directement importés depuis `ba6c62aa6b3db8f15efad52e3ee8d5fcd143b601`. Seules les URL relatives de la copie servie sont réécrites pour le serveur local. Les caméras, lumières, exposition et résolution sont identiques avant/après pour chaque source. Les 24 empreintes JPG sont identiques à ce commit.

Le rendu présent utilise la factory finale intégrée, gelée après les six nouveaux lots. Les empreintes des 14 modules directement importés, du registre et du namespace Three de production sont consignées dans le rapport et contrôlées avant/après capture. La factory est identique à celle du rapport Frontier final.

- Module : `566328be75b756765ffd33c2eb7738f4825b8d4cdd48c8acec807505d674c8ce`
- Tests : `a4ab8d9697823b557d97ec1b91f2c101d5a5d2a162059a64ad5946c05462cd09`
- Factory capturée : `134b5a9e4cf1982b82a43e54f860522833cf1cea16013003b54153fc79dedb3c`
- Factory originale avant : `b83bba7f70345735cdd0921503fbed0579fe71dba67e5c84fd0b849391e0b121`
- Empreintes complètes des sources, dépendances et planches : [report.json](artifacts/field-engineering-2026-10-07/report.json).

## Éléments source et limites

| Source | Motifs source guidant la reconstruction |
|---|---|
| Appliancer Electrilyrical World — 3875465 | rounded appliance workshop houses with oval and square lit windows ; central pointed castle towers and blue roofs ; colored radial fireworks and small desk lamps; appliance figures remain painted |
| Bug Matrix — 86643777 | large dark PCB floor covered in orange and purple circuit tracks ; two square diamond-marked cyan chip pads ; pale blue screen border and fine grid; mechanical insects remain painted |
| Catalyst Field — 65959844 | wide oblique orange orbit ribbons around a bright central flash ; forked red magenta lightning ; faint hexagonal background lattice; mechanical figures remain painted |
| Centrifugal Field — 1801154 | deep curved green cyan red and yellow vortex bands ; scattered warm embers along dark gaps ; white dragons remain only in the original artwork |
| Crystolic Potential — 3576031 | black overhanging cave lips with dripping yellow molten stalactites ; distant orange horizon and low rocky terraces ; small cross-shaped glints; all crystal creatures remain painted |
| Cyberdark Inferno — 44352516 | orange yellow flame rising beneath a dark blue smoky sky ; floating angular brown rock fragments ; red volcanic wall at left; cyber dragons remain painted |
| Deskbot Base — 12215894 | wide gray portal facade with black doors and green circuit seams ; projecting gray gangway and blue yellow scanner throat ; rear cliff wall and angular panels; flying Deskbot remains painted |
| Dinomic Powerload — 41128647 | broad diagonal cyan and red luminous streaks ; dense thin forked blue lightning in a gray cloudy background ; the armored figure and all floating armor pieces remain painted |
| Euler’s Circuit — 9547962 | concentric circular blue formula bands with dotted neon borders ; cyan electrical graph drawn inside the empty center ; three orange triangle markers and fine crossing circuit grid |
| Fandora, the Flying Fighting Furtress — 26162470 | three teal square sails and broad white triangular sails on a tall mast ; striped rounded flying hull with forward brass cannons ; purple membrane wings and long taut rigging; tiny flying figures remain painted |
| Fandora, the Flying Furtress — 64400161 | two large teal square sails and long oblique pale foresail ; striped rounded flying hull and projecting thin bowsprit ; high purple side wing and distant gray mountain ridge; flying figures remain painted |
| Fortissimo the Mobile Fortress — 86997073 | deep chamber of open hexagonal sockets and branching silver circuit ribs ; three overhead round metal discs with gold collars ; open hexagonal floor ducts and descending parallel dark conduits |
| Heavy Metal Raiders — 3113667 | blue forked electrical streaks against pink orange radial bands ; small dark magenta perspective grid below ; all slot machine and weapon creatures remain in the source artwork |
| Ignister A.I.Land — 59054773 | floating pink amusement island with triangular pennants around its rim ; central turret castle, curving roller coaster and large Ferris wheel ; striped carousel, round cyan dome and multicolored fireworks |
| Ignition Phoenix — 79555535 | two broad branching orange fire wings spread through the background ; narrow central upward column of fire and blue forked lightning ; mechanical people and the winged central figure remain painted |
| Karakuri Showdown Castle — 22751868 | tiered white Japanese castle with blue upturned triangular roofs ; large exposed circular gears and ribbed mechanical base ; short horizontal cannons, triangular roof ornaments and forked background lightning |
| Magnetic Field — 4740489 | upper and lower cyan elliptical energy rings ; three foreground green concentric circular coils ; cyan lightning and fine radial chamber ribs; magnet creatures remain painted |
| Megaroid City — 44139064 | tall central junction tower with two upper black tunnel mouths ; red and gray truss road bridges and long curved transparent transport tubes ; lower paired tunnel exits, control pod and canal; vehicles remain painted |
| Metamorformation — 46500985 | large cyan radial halo and star glints over a dark cave horizon ; low dusty brown road with small angular stones ; riders, motorcycles and luminous mechanical figure remain painted |
| Morphtronic Map — 56074358 | ochre parchment map with coastlines, grid and central compass ; large curved blue horseshoe magnet with red tips ; flip phone, gray appliance, red music box, screwdriver and oil lamp on a wooden desk |
| S-Force Bridgehead — 23377425 | broad central metal staircase below a large circular luminous portal ; green circuit seams on gray frame walls ; eight orbiting cyan display discs and rectangular screens; figures remain painted |
| Salamangreat Sanctuary — 1295111 | three cracked volcanic cones with bright vertical eruptions ; pink engraved circular sigil above a lava shelf ; thin rising red arcs and pale low vapor; central figure remains painted |
| Stand Up Centur-Ion! — 41371602 | large pink engraved circular halo behind the armored figures ; thin crossing light streaks and curling pink flame wisps ; loose teal ribbons high above; all figures and armor remain painted |
| Super Quantal Mech Ship Magnacarrier — 10424147 | wide angular pale carrier with two genuinely open forward bays ; raised faceted bridge on a dark stalk and low projecting landing decks ; luminous seams, side fins and rear pale circular platform; stored creatures remain painted |

Ignister A.I.Land remplace une ancienne géométrie dédiée sans inspection de source par le véritable parc visible : grande roue avec 12 cabines, deux rubans de montagnes russes, carousel, château, coupole et 24 fanions. Il compte comme une reconstruction nouvelle, sans ajouter une seconde géométrie dédiée pour la même carte. Les deux Fandora distinguent les trois voiles et canons de la version de combat des deux voiles et montagnes lointaines de l’autre illustration.

## Planches

- [Source / avant / après — planche 1](artifacts/field-engineering-2026-10-07/engineering-source-before-after-1.jpg)
- [Source / avant / après — planche 2](artifacts/field-engineering-2026-10-07/engineering-source-before-after-2.jpg)
- [Source / avant / après — planche 3](artifacts/field-engineering-2026-10-07/engineering-source-before-after-3.jpg)
- [Source / avant / après — planche 4](artifacts/field-engineering-2026-10-07/engineering-source-before-after-4.jpg)
- [Source / avant / après — planche 5](artifacts/field-engineering-2026-10-07/engineering-source-before-after-5.jpg)
- [Source / avant / après — planche 6](artifacts/field-engineering-2026-10-07/engineering-source-before-after-6.jpg)

Cet audit contrôle la géométrie de production dans un renderer réel. Il ne remplace pas un audit du duel complet et ne revendique aucune validation supplémentaire des règles natives. Aucun changement du core, du WASM, des scripts Lua ou des dépendances.
