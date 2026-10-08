# Terrains : personnages et sculptures caractéristiques — 8 octobre 2026

Trois Terrains dont les figures importantes étaient absentes des volumes reçoivent **307 composants sculptés supplémentaires** : Chicken Game, Chorus of Sanctuary et Archfiend Palabyrinth. Leurs illustrations locales exactes sont conservées. Les volumes restent une adaptation spatiale : cette passe ne certifie ni une reproduction intégrale 1:1, ni les détails des 336 autres Terrains.

La [galerie comparative](artifacts/field-detail-wave-2026-10-08/gallery.html) montre la référence, l'état précédent et l'état actuel sous trois angles pour chacun des trois Terrains. Le [rapport mesuré](artifacts/field-detail-wave-2026-10-08/report.json) conserve les empreintes des sources, du runner, des dépendances et des 18 captures PNG, les matrices de caméra et les coûts de rendu.

## Sources et lacunes traitées

Les trois JPG de 624 × 624 ont été ouverts et inspectés directement avant la sculpture. Leurs octets et SHA256 sont identiques à ceux du commit de comparaison `251fec0197ed85e40bca2af03e4431db1fef11e5` ; aucune retouche de la référence n'a été effectuée. Leur provenance YGOPRODeck est enregistrée dans le snapshot et dans le rapport.

| Terrain | Constat documenté avant cette passe | Référence exacte conservée |
| --- | --- | --- |
| Chicken Game — `67616300` | La [revue indépendante C](native-field-final-review-2026-10-08.md) signalait que ses personnages et véhicules n'étaient pas modélisés. | [Illustration](../../public/environments/field-art/67616300.jpg), 113 373 octets |
| Chorus of Sanctuary — `81380218` | [TERRAIN_REFERENCE_AUDIT](../../TERRAIN_REFERENCE_AUDIT.md) décrivait le chérubin, son halo, les notes noires et les roses comme indispensables ; le chérubin et le halo restaient dans le fond exact, les roses étaient très simplifiées. | [Illustration](../../public/environments/field-art/81380218.jpg), 96 288 octets |
| Archfiend Palabyrinth — `63883999` | Le même audit avertissait que les visages sculptés ne devaient pas être annoncés terminés lorsqu'ils étaient absents. | [Illustration](../../public/environments/field-art/63883999.jpg), 117 360 octets |

## Volumes ajoutés et lecture visuelle

**Chicken Game : 80 composants, trois groupes.** Le visage mécanique orange effrayé occupe désormais le premier plan à droite, avec un front anguleux, des yeux bleus et cyan, un large sourire chromé à huit dents, un nez saillant, des sourcils relevés et trois gouttes de sueur en volume. Un buggy vert à quatre roues, pare-brise et arceaux suit le côté gauche de la route. Le petit char rouille sur le front comporte deux chenilles, des roues, une tourelle, un canon avec ouverture sombre et un petit pilote casqué. Les reliefs, routes, arbres et brumes déjà présents sont conservés. La [planche de ses trois angles](artifacts/field-detail-wave-2026-10-08/67616300-source-before-after-three-angles.jpg) rend les silhouettes nouvelles et leur profondeur visibles ; le buggy est partiellement occulté par la falaise dans un angle.

**Chorus of Sanctuary : 112 composants, deux groupes.** Le chérubin a une grosse tête, des boucles et mèches rouges, une couronne de feuilles pointues avec nervures, un halo doré incliné, une bouche de chant, une tunique jaune à plis et ceinture, des bras tendus, des doigts, des jambes nues et deux ailes à plumes superposées. Cinq signes musicaux noirs possèdent des têtes, hampes et crochets distincts. Les douze roses existantes forment maintenant deux masses corail agrandies aux coins, avec des spirales de pétales plus larges ; la grille violette fine et le double portail sont préservés. La [planche de ses trois angles](artifacts/field-detail-wave-2026-10-08/81380218-source-before-after-three-angles.jpg) a servi à vérifier puis à dégager la couronne de feuilles devant le front et à renforcer les roses périphériques.

**Archfiend Palabyrinth : 115 composants, un groupe.** Trois visages de maçonnerie disposent chacun d'un crâne saillant, d'orbites sombres, de sourcils, de joues anguleuses, d'un nez, d'une bouche et de crocs. Le grand visage central domine la couronne, avec des oreilles en membranes et des nervures de barbe. Le visage de droite porte deux cornes courbes. Les dix vertèbres existantes reçoivent de petites orbites et des nez ; seize joints soulignent la tour spiralée, et quinze ouvertures sombres rythment les galeries. Les tours côtelées, la spirale continue, les pointes et le sigil au sol sont conservés. La [planche de ses trois angles](artifacts/field-detail-wave-2026-10-08/63883999-source-before-after-three-angles.jpg) montre les trois faces et les petits masques sur l'architecture précédente.

## Limites visibles restantes

Les figures sont des volumes colorés fermés, et non des plans portant l'illustration. Leur emplacement périphérique respecte le dégagement du plateau ; cela adapte certains rapports d'échelle et positions centraux de l'image originale.

| Terrain | Limites constatées dans les captures finales |
| --- | --- |
| Chicken Game | Le front et le nez restent anguleux, le sourire et les yeux sont stylisés. Les reflets, le raccourci de perspective, les minuscules marques du pilote et les surfaces arrière invisibles ne sont pas reproduits exactement. Les routes et falaises restent procédurales ; leur composition ne copie pas intégralement l'image. |
| Chorus of Sanctuary | L'anatomie, le visage, les boucles, les doigts, les plumes et les plis de tissu restent des approximations sculptées. Les roses utilisent des rosettes concentriques et les nuages des volumes ovales, sans reproduire chaque pétale ni la mer de nuages continue. La profondeur non visible dans l'image est interprétée. |
| Archfiend Palabyrinth | Les crânes, les orbites rapportées et les galeries sont stylisés ; les ouvertures sombres ne soustraient pas la pierre. Les tours restent une architecture simplifiée. Le grain de pierre, toutes les micro-sculptures, les éclairs et la perspective architecturale exacte ne sont pas reconstruits. |

Les métadonnées conservent `fidelity: reference-informed-geometry` et déclarent `referenceDetail.fidelity: source-inspected-adapted-sculpture`, les caractéristiques traitées et les limites par carte. La présence d'une reconstruction parmi les 339 Terrains ne signifie pas que la fidélité spatiale intégrale est atteinte.

## Comparaison et budgets

Le runner lance les factories de production avec le namespace Three borné dans Chromium et un vrai `WebGLRenderer`. Le rendu utilise le même éclairage, le même fond, le même cadrage et les mêmes matrices de caméra et de projection pour chaque paire avant/après. Les trois angles sont front, gauche et droite. Les quinze fichiers de géométrie/références du commit de comparaison sont archivés sans transformation dans `artifacts/field-detail-wave-2026-10-08/baseline-251fec/`.

Les dépendances sont restées identiques pendant les captures, sans erreur navigateur ou asset. Les trois planches finales ont été ouvertes et inspectées. Cette vérification isole la géométrie de Terrain ; elle ne remplace pas un audit de duel complet ni une mesure de performance sur appareil mobile physique.

| Terrain | Composants avant → après, avant fusion | Appels WebGL avant → après | Matériaux avant → après | Triangles avant → après |
| --- | --- | --- | --- | --- |
| Chicken Game | 36 → **116** | 7 → **10** | 2 → **3** | 25 180 → **31 996** |
| Chorus of Sanctuary | 73 → **185** | 6 → **8** | 4 → **5** | 29 712 → **43 504** |
| Archfiend Palabyrinth | 62 → **177** | 8 → **9** | 4 → **5** | 9 872 → **21 132** |

Ces coûts sont identiques aux trois angles. Les limites du host sont 220 composants, 18 appels et 10 matériaux. Les groupes colorés sont agrégés en buffers indexés, puis instanciés par le host ; le compteur de composants conserve les **307 volumes réellement ajoutés avant fusion**, et ne confond pas cette valeur avec le nombre de batches. Chicken Game compte neuf batches de géométrie mais dix appels WebGL, car une brume transparente double face produit une passe supplémentaire.

Tous les composants ajoutés sont hors du corridor jouable entier `[-9,-3,-18] → [9,30,17]` et sous la limite d'extension horizontale 48. Les matrices réfléchies inversent correctement les indices des triangles ; les chemins fermés n'ajoutent pas de bouchons superposés à leur jointure.

## Vérifications et intégration

La commande ciblée suivante passe **32/32 tests**, sans échec ni test ignoré :

```sh
node --test --test-isolation=none \
  test/field-reference-detail-wave.test.js \
  test/field-stage-references.test.js \
  test/field-ritual-references.test.js \
  test/field-dark-references.test.js
```

Les six nouveaux tests vérifient les octets des références, la portée déclarée, les volumes positifs, la fermeture et l'orientation opposée de chaque paire d'arêtes après soudure géométrique, les indices et attributs finis, les caractéristiques propres aux trois cartes, le corridor, les budgets et la libération unique de tous les buffers/matériaux/ressources d'instances lors du remplacement et d'une double libération. Les 26 tests des trois modules existants vérifient leurs autres Terrains et leur compatibilité avec l'agrégation. Les contrôles de syntaxe JS/Python et `git diff --check` passent également.

Les modifications de production sont limitées à [FieldReferenceDetailGeometry.js](../../src/ui/FieldReferenceDetailGeometry.js), appelé depuis [Stage](../../src/ui/FieldEnvironmentStageReferences.js), [Ritual](../../src/ui/FieldEnvironmentRitualReferences.js) et [Dark](../../src/ui/FieldEnvironmentDarkReferences.js). Les fichiers `FieldEnvironmentRegistry`, `FieldEnvironmentGeometry`, les sources JPEG, le moteur natif et les contrôles de duel ne sont pas modifiés par cette passe. Le [test dédié](../../test/field-reference-detail-wave.test.js) et le [runner de comparaison](../../scripts/audit-field-reference-detail-wave.py) permettent de la reproduire. Aucun build global, commit ou déploiement n'est réalisé dans ce chantier.
