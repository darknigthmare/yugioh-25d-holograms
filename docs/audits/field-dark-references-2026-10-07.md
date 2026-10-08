# 20 Terrains : illustrations sombres, intérieurs et paysages inspectés

Les 20 JPG locaux ont été ouverts individuellement avant la conception. [FieldEnvironmentDarkReferences.js](../../src/ui/FieldEnvironmentDarkReferences.js) reconstruit leurs éléments de décor réellement visibles avec le sous-ensemble Three de production et les helpers de la factory. Les figures, créatures et éléments peints non modélisés restent dans les illustrations exactes, conservées sans retouche. Les dimensions et la perspective sont adaptées à la périphérie du duel ; il ne s'agit pas de reproductions intégrales en 3D à l'échelle 1:1.

Le regroupement « Dark » ne détermine pas les formes ou les couleurs. Curse of the Shadow Prison montre une scène claire de désert ; Ghostrick Mansion un intérieur de fête ; Shiranui Style Synthesis des rubans lumineux autour de figures ; Necrovalley une gorge rocheuse. Ces sources ne deviennent pas des châteaux ou des cimetières par simple correspondance de famille.

| Terrain | Ce que la nouvelle vue démontre | Éléments conservés dans la peinture |
| --- | --- | --- |
| Archfiend Palabyrinth — 63883999 | Tours cylindriques nervurées, grande spirale continue de gauche, couronne à cornes pointues, fines lames verticales et sigil concentrique au sol | Sculptures démoniaques détaillées, chauves-souris et ciel |
| Curse of the Shadow Prison — 81788994 | Falaise ocre érodée, recessus sableux et socle bas noir à deux points lumineux dorés | Figure assise, armure, accessoire orbital et grand bâton en croissant |
| Dark Sanctuary — 16625614 | Château noir rouge à longues aiguilles, ouvertures pointues et rocher irrégulier nettement sous le bâtiment | Yeux et bouches géants dans le ciel, brume |
| Domain of the True Monarchs — 84171830 | Colonnes verticales d'une grande chambre, trois bandes courbes concentriques à l'arrière et faisceau blanc supérieur | Une immense figure centrale sur son siège et les six visiteurs au premier plan ; aucun second trône inventé |
| Dream Mirror of Terror — 1050355 | Trois ponts élevés courbes, tourelles bleu violet, fenêtres magenta et épais filaments violets rampants | Créatures et bordure décorative du miroir |
| Evil Eye Domain – Pareidolia — 70122149 | Château noir asymétrique à fines arêtes dorées, fenêtres lavande pointues, nombreuses aiguilles, lune cyan et branches de falaise | Visage de la lune, relief peint et ciel |
| Fallen Paradise — 13301895 | Tronc tordu, 28 ramifications continues attachées, huit racines, cinq creux lumineux verts, roches anguleuses, dalles craquées et pomme rouge | Texture fine de l'écorce et ciel |
| Ghostrick Mansion — 99795159 | Pièce intérieure à rideaux réellement plissés, table ronde drapée, candélabre à trois branches, sofa, mantel, pot et bouteille | Personnages et fête ; aucune scène extérieure de cimetière |
| Labrynth Labyrinth — 33407125 | Ville ronde blanche et bleue enrichie de fines tourelles, 21 arches centrales, trois balcons à rails, gables losangés, deux grandes rampes ascendantes, ornements flottants et calice à douze pétales | Sigil céleste et petits détails peints |
| Lair of Darkness — 59160188 | Dalles polygonales brisées, crêtes noires anguleuses et éclairs arrière branchés | Figure ailée centrale et quatre têtes spectrales cyan |
| Mansion of the Dreadful Dolls — 36890111 | Mansion ronde à trois niveaux, 21 vitraux multicolores, pointes noires, porche triangulaire, porte claire et grille à pointes | Poupées et chauves-souris |
| Mementomictlan — 43338320 | Ziggurat rouge cuivre à quatre degrés portant 28 gravures carrées, deux grands braseros ronds noirs, flammes courbes et cristaux multicolores | Grand autel et figures squelettiques |
| Necrovalley — 47355498 | Deux parois rocheuses irrégulières à stries verticales, passage sableux, soleil couchant et deux petites pyramides à l'horizon | Nuages et lumière peinte du ciel |
| Nightmare Throne — 93729896 | Fauteuil métallique bleu à dossier courbe et fente, panneaux fins, accoudoirs cylindriques roulés, assise en saillie et base effilée, rectangles translucides flottants | Figure ailée assise et espace peint |
| Pandemonium — 94585852 | Colonnes jaune vert nervurées, pointes rouges recourbées, arcs de liaison, ouverture ovale dentée et cour ronde à quatre degrés | Silhouette centrale et détails organiques peints |
| Shiranui Style Synthesis — 40005099 | Trois larges rubans physiques cyan blanc croisés, 19 traits de lumière violette et points pâles | Figures vivante et spectrale, armes et éventails ; aucun cimetière n'est représenté |
| Supreme King's Castle — 72043279 | Flèche rocheuse asymétrique continue, cavités sombres, pics latéraux, petit bâtiment d'entrée, lave orange et éclair violet anguleux branché | Ciel et détails fins des surfaces |
| The Gates of Dark World — 33017655 | Deux portes massives véritablement entrouvertes, dix reliefs longs et courbes, colonnes annelées à chapiteaux ronds, ouverture cyan blanche | Silhouette centrale et fumée |
| Vampire Kingdom — 62188962 | Neuf maisons à toits inclinés, lucarnes, cheminées et fenêtres étroites, petit château pâle lointain, chemin blanc sinueux, lune rouge et clôture à pointes | Brume et ciel |
| Vendread Nights — 76871889 | Huit immeubles à 96 fenêtres jaunes/cyan, cinq fils barbelés parallèles à pointes réellement croisées, poteaux, lune pâle et faisceaux diagonaux | Héros et zombies |

## Contrôles physiques

[field-dark-references.test.js](../../test/field-dark-references.test.js) passe ses **10 tests directs**. Ils utilisent les constructeurs réellement disponibles dans `FIELD_GEOMETRY_THREE`, vérifient les 20 dispatches, l'absence de texture cachée, les buffers et normales finis, les indices valides et les formes spécifiques décrites ci-dessus. Les bornes transformées de **chaque instance entière** sont hors du corridor `[-9,-3,-18] → [9,30,17]` ; l'étendue horizontale reste strictement inférieure à 48. Le remplacement libère chaque buffer, matériau et allocation d'instance exactement une fois, y compris après un second appel au disposal.

La mesure Chromium finale est au maximum **184 primitives, 17 appels WebGL et 7 matériaux**, sous les limites de 220 / 18 / 10. Les courbes regroupées utilisent des buffers statiques partagés ; leurs triangles réels et les compteurs par carte figurent dans le rapport. Les appels mesurés incluent les passes des rectangles transparents du fauteuil.

Les **11 tests directs** communs de [field-environment-geometry.test.js](../../test/field-environment-geometry.test.js) passent également, dont les 339 Terrains, la déterminisme et la protection des cartes masquées, en attente ou annulées. Cette validation concerne le décor et ne représente pas une nouvelle preuve de branches des règles du duel.

Labrynth a été rouvert et enrichi après revue de la première planche. Ses deux instances `labrynth-broad-white-ascending-spiral-ramp` ont chacune 81 points et une largeur de 3.1 ; les montées sont 9 et 11, les profondeurs 11 et 13. La distance maximale au véritable segment 3D départ→arrivée, calculée avec `THREE.Line3.closestPointToPoint`, est **6.0817 et 9.4449**. Le test contrôle la distance physique, pas seulement un paramètre de sinusoïde. Une troisième galerie supérieure porte un nom distinct. Les petites ramifications de Fallen Paradise sont également contrôlées pour leur raccord réel à la branche porteuse.

## Captures et reproduction

Le [script d'audit](../../scripts/audit-field-dark-references.py) utilise un **unique renderer WebGL** réutilisé pour les 40 vues géométriques. Les 20 sources portent le total à **60 images**. Chaque paire avant/après utilise la même caméra, lumière et exposition ; les cadrages sont adaptés séparément au sujet de chaque carte et enregistrés dans le rapport.

Le constructeur précédent est le [fichier exact archivé de `2bc79f1`](artifacts/field-dark-2026-10-07/baseline-2bc79f1.js). La vue avant démontre le comportement précédent ; la vue après démontre la présence des volumes de décor et de leurs détails. La vue source permet de comparer les formes et couleurs observées, sans promettre une restitution complète des figures ou une perspective identique à la peinture. Les quatre planches ont été ouvertes et inspectées, puis la planche Rooms a été réinspectée après l'enrichissement final de Labrynth.

- [Forteresses, désert, chambre et miroir](artifacts/field-dark-2026-10-07/field-dark-fortresses-2026-10-07.jpg)
- [Pareidolia, arbre, intérieur, Labrynth et chemin rocheux](artifacts/field-dark-2026-10-07/field-dark-rooms-2026-10-07.jpg)
- [Mansion, ziggurat, gorge, fauteuil et cour](artifacts/field-dark-2026-10-07/field-dark-rituals-2026-10-07.jpg)
- [Rubans, flèche, portes, ville et barbelés](artifacts/field-dark-2026-10-07/field-dark-nightscapes-2026-10-07.jpg)
- [Galerie autonome des 60 images](artifacts/field-dark-2026-10-07/gallery.html)
- [Rapport JSON et SHA-256](artifacts/field-dark-2026-10-07/report.json)

La galerie contient les 20 JPG originaux exacts et les 40 PNG capturés, intégrés dans le document, sans script actif ni renderer vivant. Son contrôle ouvre le document via le serveur local et vérifie que les 60 images se chargent. Le rapport conserve les SHA-256 des sources, du module, de la factory, du sous-ensemble Three, du test, du baseline, des planches et de la galerie. Aucun échec HTTP, JavaScript ou WebGL n'a été signalé dans la capture finale.

```sh
node test/field-dark-references.test.js
node test/field-environment-geometry.test.js
python3 scripts/audit-field-dark-references.py --capture
```

La reproduction utilise Playwright Python et `/usr/bin/chromium` déjà disponibles, sans nouvelle dépendance npm. Le module produit est gelé au SHA-256 `f32d83bdeb1f2a3d51f3d405c0b8e546a3a5ad96132d2d0d79e7281bc45a2066`.

Ce lot possède uniquement son nouveau module, son test, son script et ses preuves. Le propriétaire de la factory intègre le dispatch et les compteurs communs. Aucun moteur, WASM, script Lua ou autre produit partagé n'est modifié par ce lot.
