# Modèles des Pièges devenus monstres — 8 octobre 2026

Metal Reflect Slime (`26905245`) et Embodiment of Apophis (`28649820`) disposent désormais de volumes dédiés dans le pipeline Three existant. Les JPEG locaux, recadrés et complets, ont été inspectés personnellement. Les illustrations sont des références de construction et d’audit ; aucune n’est appliquée comme texture à une plaque ou à un standee.

| Carte | Motifs repris en volume | Budget mesuré au repos et en pose |
| --- | --- | --- |
| Metal Reflect Slime | Masse métallique brun-argent torsadée, plis arrondis avec crêtes claires, sphère argentée centrale à neuf pointes radiales et une pointe frontale, petite sphère inférieure et longue pointe descendante. Aucun visage, œil, nageoire ou patte inventé. | 4 appels de rendu couleur, 4700 triangles |
| Embodiment of Apophis | Gardien à armure noir bleuté et bordures or, casque à face pointue, yeux rouges, plaques ventrales violettes, cobra arrière avec gueule, crochets ivoire et langue bifide, véritable lame ivoire courbe à épaisseur physique, ornements à yeux rouges fendus. | 5 appels de rendu couleur, 5980 triangles |

Les palettes sont stockées dans les vertex colors. L’éclairage émissif d’Apophis utilise un bleu discret afin de conserver l’armure noire ; les dorures gardent leurs couleurs locales propres. Le bras droit, le pommeau, la garde et la lame partagent le joint de l’arme. Les poses utilisent le rig GPU fini existant, sans rechargement des buffers de géométrie ni animation infinie.

L’audit [Chromium et ses mesures](artifacts/trap-monster-models-2026-10-08/measurements.json) compare les modules réellement exécutés à ceux du commit `d549dbe`. Chaque vue utilise les mêmes caméras, lumières, dimensions et cartes de présentation pour l’ancien et le nouveau modèle. Les captures présentent côte à côte le JPEG source, l’ancien volume générique et le nouveau volume. Les **12 captures** — deux cartes, devant / trois quarts / côté, au repos et à progression 0,4 — ont été ouvertes et inspectées. Cette revue a conduit à adoucir les plis du Slime, corriger l’armure qui brunissait et préciser le masque et les motifs d’Apophis.

Exemples : [Slime devant](artifacts/trap-monster-models-2026-10-08/26905245-front-rest.png), [Slime de côté](artifacts/trap-monster-models-2026-10-08/26905245-side-rest.png), [Apophis devant](artifacts/trap-monster-models-2026-10-08/28649820-front-rest.png), [Apophis en pose](artifacts/trap-monster-models-2026-10-08/28649820-three-quarter-attack.png).

Validation : `node --test --test-isolation=none test/hologram-reference-anatomy.test.js test/hologram-pose-animation.test.js` — **11 tests réussis**. `python scripts/audit-trap-monster-models.py` — **12 captures**, zéro erreur JavaScript/WebGL et zéro requête en échec. Le rapport archive les empreintes des dépendances actuelles, des dépendances du commit de comparaison, des JPEG complets et recadrés et de chaque capture. Un garde vérifie que les sources n’ont pas changé pendant la capture.

La libération est réellement vérifiée pour les deux versions : chaque géométrie et chaque matériau, y compris les matériaux GPU de profondeur et de distance du rig, reçoit sa disposal ; après suppression du modèle et rendu d’une scène vide, le compteur GPU des géométries et textures est à zéro. La destruction du renderer libère tous ses programmes. Le rig ne reste pas actif après cette libération.

Il s’agit d’une **anatomie procédurale adaptée aux motifs visibles**, avec profondeur, pose et proportions adaptées au duel ; cette construction ne certifie pas un 1:1 spatial intégral ni une anatomie officielle des parties invisibles. Le budget correspond au rendu couleur, sans passe d’ombres dans cet audit. Les captures sont un audit de modules graphiques, séparé de l’intégration navigateur du duel.

Pour Slime, la pose nommée `attack` est uniquement un essai mécanique du rig GPU. Ce test ne réalise aucune action de duel et ne prétend pas autoriser une attaque : le texte officiel interdit à Metal Reflect Slime d’attaquer, et cette règle demeure sous le contrôle du core natif.
