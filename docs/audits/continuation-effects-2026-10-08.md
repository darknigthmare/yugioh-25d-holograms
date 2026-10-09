# Quatre attaques spécifiques supplémentaires — 8 octobre 2026

Les attaques du Magicien Sombre, de la Magicienne des Ténèbres, du Castor Guerrier et de La Jinn utilisent maintenant quatre silhouettes distinctes. **Quatre vraies commandes d’attaque natives passent**, et **62 tests ciblés passent**. La comparaison du renderer isolé contient 48 rendus avant/après ; elle ne certifie pas à elle seule l’affichage des animations dans l’interface compilée.

## Références et modifications

Les quatre illustrations publiques locales ont été inspectées. Leurs SHA-256 sont conservés dans [la preuve native](artifacts/continuation-effects-2026-10-08/native-attacks.json). Le renderer prend l’identité publique de l’attaquant, sans interpréter le texte d’une carte ni produire de règle.

| Carte | Avant | Après | Motif de l’illustration |
| --- | --- | --- | --- |
| Magicien Sombre, `46986414` | Orbe générique de magie | Canon creux vert/blanc, cinq anneaux violets instanciés qui avancent et charge à l’extrémité | Sceptre vert et cercle de magie |
| Magicienne des Ténèbres, `38033121` | Même orbe générique | Deux spirales roses, sept étoiles dorées instanciées et charge dorée | Sceptre doré et motif étoilé de la tenue |
| Castor Guerrier, `32452818` | Trois arcs génériques de lame | Lame pointue et garde, bouclier à cinq côtés extrudé avec bosse, coupe argentée mobile | Épée droite et bouclier |
| La Jinn, `97590747` | Huit rayons d’impact génériques | Deux poings, huit phalanges, pouces, deux bracelets dorés et deux volutes vertes | Poings, bracelets et volute de génie ; aucune lampe inventée à partir du nom |

Les attaques suivent les vraies coordonnées publiques de la source et de la cible. Les identifiants d’animation de base restent inchangés : les poses existantes continuent donc de fonctionner. Un profil explicitement fourni conserve la priorité, et une activation de carte n’est pas transformée en attaque. Les quatre anciennes attaques spécifiques restent couvertes par leurs tests.

Ces motifs constituent une interprétation procédurale des illustrations. Ils ne revendiquent pas une animation officielle reproduite image par image ni une couverture de toutes les cartes.

## Exécution du vrai moteur

[audit-continuation-effects-native.mjs](../../scripts/audit-continuation-effects-native.mjs) prépare des fixtures synthétiques **avant** le démarrage de chaque duel MR5/SEGOC. Il utilise les décisions typées et commandes réelles du moteur. Les deux End Phases sont franchies avant la Battle Phase pour respecter l’interdiction d’attaque du premier tour. Aucun `Debug`, mode QA ou ajout de carte après démarrage.

La cible face recto est l’Elfe Mystique à 800 ATK. Les messages `ATTACK` et `BATTLE`, la destruction, le déplacement au Cimetière, la présence de l’attaquant et les LP sont contrôlés.

| Attaquant | ATK native | Dégâts natifs | LP adverses finaux |
| --- | ---: | ---: | ---: |
| `46986414` | 2500 | 1700 | 6300 |
| `38033121` | 2000 | 1200 | 6800 |
| `32452818` | 1200 | 400 | 7600 |
| `97590747` | 1800 | 1000 | 7000 |

Résultat : **4/4 scénarios réussis**, sans `RETRY` ni erreur Lua. [native-attacks.json](artifacts/continuation-effects-2026-10-08/native-attacks.json) archive les fixtures, choix, commandes, messages, requêtes et événements publics. Les payloads de rendu proviennent du traducteur natif puis de `createPublicCombatVisual`. Les fixtures ne certifient pas le parcours de construction d’un Deck dans l’application.

## Comparaison avant/après

[audit-continuation-effects-render.py](../../scripts/audit-continuation-effects-render.py) consomme ces quatre présentations publiques et lance seulement le renderer. Aucun duel ni réponse moteur n’est injecté par ce script.

La variante « Avant » conserve le factory et le module spécifique du commit local de référence `5971495fb9425b96416b5e07bfeb6d28ec9bd43c`. Seul son import vers le module spécifique est réécrit pour servir la copie archivée. Les deux variantes utilisent le même registre de profils courant, afin d’isoler les géométries et couleurs de ce lot.

- [Factory avant](artifacts/continuation-effects-2026-10-08/CombatVisualEffects.before.js)
- [Module spécifique avant](artifacts/continuation-effects-2026-10-08/CardSpecificVisualEffects.before.js)
- [Mesures et matrices](artifacts/continuation-effects-2026-10-08/render-comparison.json)
- [Galerie ordinateur](artifacts/continuation-effects-2026-10-08/gallery-1280.jpg)
- [Galerie mobile](artifacts/continuation-effects-2026-10-08/gallery-390.jpg)

Deux formats sont contrôlés : **1280 × 900** et **390 × 844**. Les vrais buffers de rendu ont respectivement **480 × 320** et **342 × 228** pixels. Chaque attaque est rendue à 22 %, 50 % et 78 % pour les deux variantes : **48 images**, exportées individuellement dans le dossier `frames/`. Les huit captures comparatives ont été inspectées visuellement, et les deux galeries restent dans la largeur du viewport.

Le maximum observé est **9 appels de dessin après contre 11 avant**, avec au plus **2500 triangles après**. Le bouclier du Castor ajoute de la géométrie par rapport aux arcs génériques : son maximum passe de 6 à 9 appels, dans le budget de 10 fixé pour cette comparaison. Les particules répétées utilisent des `InstancedMesh`. Ces mesures sur Chromium avec rendu logiciel ne sont pas un benchmark de fluidité sur téléphone.

Après chaque effet, les géométries, matériaux et ressources instanciées sont libérés exactement une fois. Les groupes et compteurs de géométrie/texture reviennent à zéro. Les matrices et attributs sont finis, aucune texture n’est appliquée aux effets, aucune erreur JavaScript ni requête échouée n’est observée. Les empreintes des dépendances sont identiques au début et à la fin de la capture.

## Routage, confidentialité et durée de vie

Le test de ce lot traverse **le vrai `RealDuelScene3D.playCombatEffect`**, après la reconstruction publique, et constate les quatre nouvelles géométries dans ses effets actifs. Une annulation native confirmée retire uniquement le projectile qui correspond au propriétaire, au type de zone et à l’index attendus. Les autres attaques sont conservées ; les ressources du projectile annulé sont libérées une seule fois.

Les scénarios de régression du manager couvrent également le report des poses, les notifications répétées, les zones Extra, les références invalides, les onglets cachés et le mouvement réduit. Ce lot ne modifie pas le manager, son plafond de concurrence ni sa boucle RAF.

Les getters privés des payloads cachés ou supprimés ne sont jamais lus. Les cartes face verso et le mouvement réduit produisent zéro géométrie. Le payload public n’emporte aucun identifiant interne d’instance. Les mises à jour réutilisent leurs vecteurs/quaternions et ne créent ni timer ni texture supplémentaire.

## Vérification reproductible

[Sortie des 62 tests ciblés](artifacts/continuation-effects-2026-10-08/targeted-tests.txt) : zéro échec, annulation, test ignoré ou todo.

```sh
node --test --test-isolation=none test/continuation-effects-2026-10-08.test.js test/card-specific-visual-effects.test.js test/real-duel-attack-negation.test.js test/real-duel-hologram-models.test.js test/native-summon-visuals.test.js test/native-field-visuals.test.js test/hologram-pose-animation.test.js test/public-battle-field-cinematics.test.js test/public-field-combat-visuals.test.js
node scripts/audit-continuation-effects-native.mjs
python scripts/audit-continuation-effects-render.py
```

| Source | SHA-256 |
| --- | --- |
| `src/ui/CardSpecificVisualEffects.js` | `b56382a7b1ba63e299b1bedc18405ad4b01454a182f2160aef544089a4182df7` |
| `src/ui/CombatVisualEffects.js`, inchangé | `6e685855e5c491e5d2d340baa4a5b399438bf3c4e899e5a888f989c994852e94` |
| `test/continuation-effects-2026-10-08.test.js` | `c6c71f55ce2b079e0e3ddb3b2f9f636a8a7db0cbafa15dcb1070a49e69209fd6` |

Ce lot ne modifie ni le WASM ni les données natives ni les scripts Lua, et ne réalise aucun build global, commit ou publication. L’intégration de la nouvelle compilation appartient à la vérification finale du dépôt.

Les quatre duels natifs, la galerie et les 62 tests ont été réexécutés après le gel final coordonné des sources. Les dépendances de ce lot restent identiques à celles réellement observées lors de son premier audit ; les quatre descriptions publiques et les 48 instantanés de géométrie sont strictement égaux. Les premiers rapports et vingt copies exactes de leurs dépendances de code sont conservés dans [le dossier diagnostique](artifacts/continuation-effects-2026-10-08/diagnostic-before-final-source-pins/provenance.json). [final-source-refresh.json](artifacts/continuation-effects-2026-10-08/final-source-refresh.json) conserve la portée de cette réexécution et les empreintes finales. Les audits antérieurs déjà committés restent intacts.
