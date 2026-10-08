# Effets publics : attaques, destruction, annulation et réanimation — 8 octobre 2026

Quatre attaques ont été exécutées dans le moteur natif officiel, puis sept présentations publiques ont été comparées avant/après sur ordinateur et mobile. Les effets possèdent désormais des géométries et des mouvements distincts. La galerie contrôle le module de rendu isolé ; elle ne constitue pas un audit de l’interface de duel compilée.

## Sources et changements

Les illustrations locales recadrées de `89631139`, `74677422`, `91152256`, `70781052`, `83764718` et `44095762` ont été inspectées. Leurs empreintes sont conservées dans [native-attacks.json](artifacts/effects-wave-2026-10-08/native-attacks.json). Les quatre familles d’attaque proviennent également des correspondances explicites existantes dans `CombatVisualProfiles.js`. Le texte des cartes ne produit aucune règle ou statistique dans le renderer.

| Présentation | Avant | Après | Preuve utilisée |
| --- | --- | --- | --- |
| Dragon Blanc aux Yeux Bleus, `89631139` | Deux cylindres et anneaux | Souffle effilé blanc, deux hélices, charge à la source et éclats cristallins à l’impact | Attaque native exécutée dans ce lot |
| Dragon Noir aux Yeux Rouges, `74677422` | Orbe utilisé également pour la magie | Neuf langues de feu, douze braises, fumée et axe incandescent | Attaque native exécutée dans ce lot |
| Gardien Celte, `91152256` | Trois traits circulaires | Lame pointue avec garde, croissant rempli et bord argenté en mouvement | Attaque native exécutée dans ce lot |
| Crâne Invoqué, `70781052` | Lignes d’éclair fines | Trois rubans d’éclairs ramifiés, charges à la source et couronne d’impact, sans clignotement stroboscopique | Attaque native exécutée dans ce lot |
| Destruction | Onde et points d’énergie, sans fragments | Dix-huit fragments instanciés qui se séparent et descendent | Destruction native de l’Elfe Mystique par le Dragon Blanc |
| Annulation | Dôme protecteur | Quatre quarts de sceau qui se séparent et croix d’annulation | Scénario natif exécuté séparément par le lot de présentation publique, archivé avec son empreinte |
| Réanimation confirmée | Cercles génériques | Ankh turquoise ascendant, traverse blanche et colonne lumineuse | Scénario natif exécuté séparément par le lot de présentation publique, archivé avec son empreinte |

L’ankh reprend le motif visible de Monster Reborn. La seule activation de cette carte dessine un glyphe plat : elle ne fait pas apparaître une réanimation. La montée et la colonne exigent une invocation publique réellement confirmée, avec `nativeRevivalConfirmed: true` et `revivalFrom.zoneType: 'graveyard'`. La chaîne annulée de Monster Reborn demeure une annulation.

Les illustrations et les familles connues permettent ces correspondances visuelles ; elles ne définissent pas une animation officielle image par image. Cet audit ne revendique donc pas une reproduction 1:1 de chorégraphies officielles ni la couverture de toutes les cartes.

## Vérification native

[audit-card-specific-native-attacks.mjs](../../scripts/audit-card-specific-native-attacks.mjs) crée chaque fixture avant le démarrage, réinitialise la session et utilise les vrais choix du moteur en MR5 avec SEGOC. Aucun `Debug`, mode QA ou ajout de cartes après démarrage. Les deux End Phases sont réellement franchies avant le combat pour respecter l’interdiction d’attaque du premier tour.

La cible publique est une Elfe Mystique à 800 ATK. Les messages `ATTACK` et `BATTLE`, la destruction, le motif de déplacement au Cimetière, la présence de l’attaquant et les LP finaux sont vérifiés :

| Attaquant | ATK native | Dégâts natifs | LP adverses finaux |
| --- | ---: | ---: | ---: |
| `89631139` | 3000 | 2200 | 5800 |
| `74677422` | 2400 | 1600 | 6400 |
| `91152256` | 1400 | 600 | 7400 |
| `70781052` | 2500 | 1700 | 6300 |

Résultat : **4/4 attaques passent**, sans `RETRY` ni erreur Lua. [Le rapport natif](artifacts/effects-wave-2026-10-08/native-attacks.json) conserve les commandes, choix typés, messages, requêtes, fixtures et événements publics. Ces fixtures de test ne certifient pas le parcours de constitution d’un Deck dans l’interface.

La réanimation et l’annulation ne sont pas comptées comme deux duels supplémentaires exécutés dans ce lot. Leur preuve originale est [l’audit natif de présentation publique](artifacts/native-public-presentation-wave-2026-10-08.json), dont une copie exacte est conservée dans [referenced-native-public-evidence.json](artifacts/effects-wave-2026-10-08/referenced-native-public-evidence.json). Les IDs des deux scénarios, le chemin original et le SHA-256 sont enregistrés dans le rapport natif de ce lot.

La référence finale possède le SHA-256 `ce4236ca9815b2e4b104981e99b3acf5175781007f5c6e2d3ca40c6c719b5dfe`. Après la capture, la provenance de ce rapport partagé et les dépendances publiques ont été finalisées. Les quatre attaques de ce lot ont alors été réexécutées avec le traducteur final `13b5c2897a486c7837d1740b0fded2a96deaf9bc6d1cf0e157511fa4f5746f85`, les décisions finales `aad5bbb34c29a917569801465ce015209bc027715e594d9b986e6e4b8ce2adbe` et leur helper de présentation `27a15280426911bc61e301206922c0bd187afef648a3004a33e5eb2fa14f3142`. Elles passent toujours. Le rapport natif conserve aussi les empreintes du runtime, des ressources, de la compatibilité Lua et du wrapper utilisés. Les sept descriptions publiques rendues sont strictement identiques à celles de la capture.

## Comparaison du rendu

[audit-effects-wave.py](../../scripts/audit-effects-wave.py) rend seulement les sept événements publics archivés. Il ne lance pas un duel et n’injecte aucun état de jeu. La variante « Avant » est reconstruite en retirant exclusivement le dispatch et les gardes ajoutés par ce lot au factory courant ; sa source est conservée dans [CombatVisualEffects.before.js](artifacts/effects-wave-2026-10-08/CombatVisualEffects.before.js). Les profils partagés courants restent identiques entre les deux variantes : la comparaison isole les changements de géométrie de ce lot.

Les tailles contrôlées sont **1280 × 900** et **390 × 844**. Chaque effet est capturé à 22 %, 50 % et 78 % pour les deux variantes : **84 images de rendu**, regroupées dans quatorze captures comparatives et deux galeries. Les quatorze comparaisons ont été inspectées visuellement. Les captures mobiles restent entièrement dans leur largeur.

- [Galerie ordinateur](artifacts/effects-wave-2026-10-08/gallery-1280.jpg)
- [Galerie mobile](artifacts/effects-wave-2026-10-08/gallery-390.jpg)
- [Mesures, matrices et apparitions](artifacts/effects-wave-2026-10-08/render-comparison.json)

Les sept silhouettes sont distinctes, les attributs et matrices sont finis et aucune texture de carte n’est appliquée aux effets. Le maximum observé est **9 appels de dessin après contre 14 avant** dans cette comparaison, avec au plus 2424 triangles après. Ce sont des mesures de géométrie sur Chromium avec rendu logiciel, pas un benchmark de fluidité sur téléphone.

Les captures n’ont pas été refaites lors de cette mise à jour de provenance. Leur entrée exacte est préservée dans [native-attacks.render-input.json](artifacts/effects-wave-2026-10-08/native-attacks.render-input.json), ainsi que [l’ancienne référence native](artifacts/effects-wave-2026-10-08/referenced-native-public-evidence.render-input.json), SHA-256 `ff911726ec4b617fba329913af4ba1e39356896f72c67323b89e30563d71294a`. La propriété `referenceRefresh` du rapport de rendu relie ces fichiers à la référence courante et consigne l’égalité des sept descriptions. Les empreintes prises lors du rendu restent celles réellement enregistrées ; la provenance courante est indiquée séparément.

Après chaque animation : chaque géométrie, matériau et ressource instanciée est libéré exactement une fois ; le second `dispose()` et les mises à jour après libération sont inactifs ; le groupe est retiré ; les compteurs de géométries et textures du renderer reviennent à zéro. Aucune erreur JavaScript ni requête échouée. Les empreintes des sources sont identiques avant et après l’audit.

## Confidentialité, mouvement réduit et règles

Les cartes cachées sont rejetées avant de lire leur identité ou d’allouer une géométrie. Les contrôles utilisent des getters qui échouent s’ils sont lus : **zéro lecture d’identité privée**, zéro géométrie pour une carte cachée et zéro géométrie avec mouvement réduit. Le module reçoit uniquement une description publique, sans objet de jeu ni identifiant privé.

Les mouvements réutilisent leurs vecteurs et matrices temporaires. Les particules répétées utilisent des `InstancedMesh` ; aucun timer, nouvelle boucle RAF, texture ou téléchargement supplémentaire n’est ajouté. Les limites de concurrence, la pause lorsque la vue est cachée et le nettoyage de la scène restent sous le contrôle du manager existant.

Le routage d’une vraie réanimation depuis le Cimetière est vérifié séparément dans les scénarios natifs de présentation publique. Le manager de scène annule également le projectile d’une attaque réellement annulée au `sourceRef` correspondant quand `nativeAttackNegated === true` ; cette correction relève du lot de scène et de ses tests. La galerie de ce lot ne certifie pas ce cycle intégré d’annulation dans l’interface compilée.

Les profils des autres cartes et des Terrains restent disponibles via le renderer existant. Les effets ne modifient aucune cible, condition d’invocation, statistique, destruction ou résolution : ces décisions proviennent du moteur.

## Tests et sources gelées

**50/50 tests ciblés passent**, sans échec ni test ignoré. [Sortie archivée](artifacts/effects-wave-2026-10-08/targeted-tests.txt). Ils couvrent notamment les silhouettes et directions, la séparation des fragments, le contrat de réanimation, les getters privés, le mouvement réduit, les matrices instanciées, la libération et le manager existant.

```sh
node --test --test-isolation=none test/card-specific-visual-effects.test.js test/real-duel-hologram-models.test.js test/native-summon-visuals.test.js test/native-field-visuals.test.js test/hologram-pose-animation.test.js test/public-battle-field-cinematics.test.js test/public-field-combat-visuals.test.js
node scripts/audit-card-specific-native-attacks.mjs
python scripts/audit-effects-wave.py
```

Sources applicatives gelées :

| Fichier | SHA-256 |
| --- | --- |
| `src/ui/CombatVisualEffects.js` | `6e685855e5c491e5d2d340baa4a5b399438bf3c4e899e5a888f989c994852e94` |
| `src/ui/CardSpecificVisualEffects.js` | `7dfdb44e13561cd78231c4a5fc8391b6c449ecb36ce328063f93013892d32e88` |
| `test/card-specific-visual-effects.test.js` | `3de3ec72890e545903e2703bf8adb50f4b9a22de76f7b96d8285353bd67b6802` |

Le WASM, les données natives et les scripts Lua restent inchangés. Ce lot ne réalise aucun build global, commit ou publication. L’intégration navigateur de la nouvelle compilation fait l’objet d’un audit distinct.
