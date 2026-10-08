# Slifer, Obelisk et Ra — modèles articulés

Les trois Dieux égyptiens remplacent leur ancien modèle générique de bête dorée par des anatomies distinctes dans le factory réellement utilisé par `RealDuelScene3D`. Cette sélection de cartes emblématiques complète les modèles populaires ; elle ne constitue pas un classement mesuré des cartes de tournoi actuelles.

| Carte et passcode officiel | Motifs de l’illustration reproduits en volumes | Triangles au repos / défense | Appels GPU couleur |
| --- | --- | ---: | ---: |
| Slifer the Sky Dragon — 10000020 | Serpent rouge bouclé, deux bouches dentées, longues cornes balayées, gemme bleue, ventre noir côtelé, petites mains argentées et ailes rouges/noires | 2 992 / 3 560 | 5 |
| Obelisk the Tormentor — 10000000 | Corps bleu massif, pectoraux et abdominaux sculptés, petite tête cornue, épaules à lames, grandes plaques d’avant-bras et poings fermés | 2 672 / 3 240 | 5 |
| The Winged Dragon of Ra — 10000010 | Bec et cou de rapace, armure dorée segmentée, pivots circulaires des ailes, grandes ailes courbes à panneaux bronze, griffes, pattes et queue | 3 764 / 4 332 | 5 |

Le moteur fusionne les volumes par matériau. Les ailes et les mandibules utilisent les joints GPU existants ; le bras de frappe d’Obelisk utilise le joint de l’arme. Les plaques et ailes sont extrudées avec une épaisseur réelle. Les deux tubes sont fermés par des triangles reprenant exactement leurs anneaux de bord ; leur rayon diminue dans les virages serrés pour éviter des faces retournées. Leurs normales sont recalculées une fois à la construction. Aucune texture de carte, silhouette plate ou animation par minuterie ne remplace l’anatomie. Les poses ne réécrivent pas les buffers de positions. Ces ajouts ne changent aucune règle, aucun effet ou calcul d’ATK/DEF.

Les [profils et anatomies](../../src/ui/HologramPopularGodModels.js) se résolvent par passcode exact, y compris avec zéro initial et nom localisé. Les [références originales](../../src/ui/PopularGodReferenceArt.js) contiennent neuf JPEG indépendants : image complète, crop et petite carte pour chacun des trois passcodes. La vérification des ressources natives confirme leur base `cards.cdb`, type monstre à effet, niveau 10, race Divine-Beast et attribut DIVINE.

## Preuves finales

Le [rapport Chromium](artifacts/popular-gods-models-2026-10-08/measurements.json) compare les modules sources du commit publié `b8e216cd53ccc640366c91755268291afb1840d2` et les modules actuels. Les **18 triptyques** couvrent trois cartes, trois angles et deux poses, avec caméra, éclairage, format et pixel ratio identiques. Chaque image juxtapose le JPEG source exact, l’ancien modèle et le nouveau. Les hashes de toutes les dépendances sources et images restent identiques avant/après capture ; le catalogue réellement chargé contient 36 profils dédiés. Les appels et triangles sont mesurés dans le renderer, en attaque puis en défense. Il n’y a aucune erreur navigateur ni requête échouée. Les ressources GPU et les matériaux d’ombre du rig sont libérés, avec zéro géométrie, texture ou programme restant après destruction du renderer.

- [Slifer, trois quarts au repos](artifacts/popular-gods-models-2026-10-08/10000020-three-quarter-rest.png)
- [Obelisk, trois quarts au repos](artifacts/popular-gods-models-2026-10-08/10000000-three-quarter-rest.png)
- [Ra, trois quarts au repos](artifacts/popular-gods-models-2026-10-08/10000010-three-quarter-rest.png)

Les **28 anciens profils** conservent exactement leurs propriétés, échelles, pièces nommées, matériaux et buffers construits, y compris couleurs et joints : les hashes avant/après sont identiques pour chacun. Les 17 familles de remplacement conservent leur déclaration. Le [contrôle des images](artifacts/popular-gods-models-2026-10-08/art-preservation.json) compare directement les **470 JPEG préexistants** à la base Git : tous sont identiques octet pour octet, dont les 339 références cropped des Terrains. Les neuf nouvelles images ne gonflent pas ce nombre.

Les [quatre tests ciblés](../../test/popular-gods-models-2026-10-08.test.js) passent : identités natives et hashes d’images, anatomies/couleurs/joints, budgets dans les deux positions, orientation de chaque triangle cohérente avec ses normales, pose sans upload, mouvement réduit et libération complète. Les audits sont reproductibles avec `python3 scripts/audit-popular-gods-models-2026-10-08.py` et `python3 scripts/audit-popular-gods-art-preservation.py` ; les tests utilisent `node --test test/popular-gods-models-2026-10-08.test.js`.

L’[audit compilé TCG strict](tcg-gods-ui-2026-10-08.md) apporte une preuve séparée : six duels réels desktop/mobile, trois Jetons créés puis sacrifiés par les commandes natives, les trois Dieux invoqués avec leurs portraits exacts, et Ra à 100 LP / 7900 ATK / 7900 DEF après le vrai choix OUI. Ses 20 captures ne sont pas comptées dans les 18 triptyques de cette galerie.

## Limites de la preuve

Ces modèles sont des interprétations volumétriques des illustrations imprimées. La profondeur, le dos invisible, la symétrie et certaines proportions sont adaptés. L’illustration d’Obelisk s’arrête au niveau du buste : les jambes bleues sont explicitement extrapolées. Le décor égyptien, les halos et les traînées ne sont pas ajoutés à l’anatomie. La fidélité spatiale intégrale 1:1 n’est pas certifiée. Les appels GPU indiquent le rendu couleur, sans passe d’ombres. L’audit module montre une pose mécanique d’attaque à 0,4 ; il ne certifie aucun effet de carte ou duel natif, ni des captures de l’application compilée.

Deux comparaisons diagnostiques sont conservées séparément avec leurs pins réellement observés : la [première](artifacts/popular-gods-models-2026-10-08/diagnostic-before-tube-closure-and-final-profile-pins/measurements.json) précède la fermeture exacte des tubes et les courbes de Ra ; la [seconde](artifacts/popular-gods-models-2026-10-08/diagnostic-before-cap-normal-orientation/measurements.json) précède la correction du winding des caps et l’adaptation des virages. Chacune possède 18 captures et le module God exact dont le SHA correspond au rapport. Ces 36 captures diagnostiques ne sont pas comptées parmi les 18 preuves finales.
