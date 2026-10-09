# Continuation native et visuelle — 8 octobre 2026

**Les 224 Terrains qui restaient sans effet natif exercé sont achevés : 339 / 339 Terrains disposent d’au moins une branche réellement vérifiée, sur 353 / 353 scénarios.** Le catalogue visuel conserve les 339 reconstructions de volumes terminées le 7 octobre. Deux modèles de Pièges devenus monstres et deux correctifs de résolution native complètent cette continuation.

La vérification locale complète et les six parcours navigateur passent sur le même build final. Le [relevé consolidé](artifacts/native-completion-2026-10-08.json) identifie les sources, résultats et empreintes compilées. Les références de publication sont suivies séparément dans la description de la PR, pour son commit distant réel.

## Règles effectivement exercées

La [matrice native du 8 octobre](artifacts/native-field-runtime-2026-10-08.json) conserve **339 données/scripts disponibles, 339 initialisations réussies, 339 effets exercés et 353 scénarios réussis**, avec `integrationTested: 0`. Elle additionne les **128 scénarios de la baseline du 7 octobre** et **225 nouveaux scénarios pour les 224 Terrains restants**.

Les six lots documentent leurs effets, partenaires, coûts, résultats et branches non certifiées par ID : [A](native-field-batch-a-2026-10-08.md), [B](native-field-batch-b-2026-10-08.md), [C](native-field-batch-c-2026-10-08.md), [D](native-field-batch-d-2026-10-08.md), [E](native-field-batch-e-2026-10-08.md) et [F](native-field-batch-f-2026-10-08.md). Une simple activation ou initialisation ne suffit pas : chaque Terrain possède un résultat natif vérifié, une chaîne réelle, des messages, décisions, queries et cartes de fixture.

Les fixtures sont créées uniquement avant `start`, avec MR5 et les flags SEGOC TCG. Les graines et options d’équipes sont consignées ; Malefic World utilise une vraie pioche native par tour pour sa branche `EVENT_PREDRAW`. Le core résout les effets et reçoit les réponses typées avec leurs indices. Aucun scénario n’utilise Debug/TestMode, injection après démarrage ou simulation de résultat par le moteur JavaScript historique.

La [matrice commune de géométrie et de règles](artifacts/field-coverage-completion-2026-10-08.json) confirme **339 illustrations exactes, 339 décors dédiés, 339 références inspectées, 339 volumes reconstruits et 339 effets natifs exercés**. Les 29 effets JavaScript historiques y restent suivis séparément.

## Deux corrections de textes de cartes

Les archives Lua, CDB et WASM conservent leurs octets d’origine. Le lecteur normal transforme uniquement deux sources exécutées, sous garde SHA-256 de l’original et du résultat, avec provenance déclarée dans l’audit :

| Carte | Résultat corrigé | Preuve ciblée |
| --- | --- | --- |
| Dice Dungeon — 11808215 | Chaque joueur applique son propre dé, y compris si le contrôleur du Terrain n’est pas le joueur du tour. Les jets, RNG et retours d’End Phase restent natifs. | [Audit et comparaison avant/après](native-dice-dungeon-correction-2026-10-08.md) : 28 tests ciblés, dont 24 duels corrigés couvrant les résultats de 1 à 6. |
| Duel Tower — 43940008 | Les deux joueurs peuvent invoquer en cas d’égalité, chacun pouvant refuser ; Invocations simultanées, destinations légales et attaques directes natives. | [Texte Konami FR/EN et preuve](native-duel-tower-correction-2026-10-08.md) : 13 tests ciblés et 11 scénarios de duel, dont reproduction de l’original. |

Les empreintes originales/effectives et substitutions bornées figurent dans les modules, audits et JSON associés. Une source amont inconnue est refusée. La source exécutée corrigée est distinguée explicitement de la source officielle archivée ; les données de cartes et le binaire du core ne sont pas remplacés.

## Chaînes, permutation cachée et présentation

La [suite de chaînes du 8 octobre](artifacts/native-chain-interactions-2026-10-08.json) compte **26 cas**, contre 25 dans la preuve historique du 7 octobre. Le nouveau parcours de Call of the Forgotten Pose trois Pièges par le core, impose sa restriction d’Invocation et exerce `MSG_SHUFFLE_SET_CARD`. Les 26 cas passent. Les trois tests de protocole vérifient aussi des identités distinctes, les deux blocs de positions et la confidentialité des destinations masquées.

Le wrapper lit le compte `uint8`, toutes les positions sources puis toutes les destinations. Les destinations nulles masquent volontairement la permutation des cartes face verso ; la façade traite leur association identité-zone comme inconnue et produit des événements anonymes. La [reconstruction du wrapper depuis le paquet npm épinglé](artifacts/native-wrapper-reproduction-2026-10-08.json) reproduit ses cinq fichiers générés octet pour octet. Les sources TypeScript amont, Lua, CDB, engine et WASM restent intactes ; le correctif de décodage local est déclaré dans la [notice du wrapper](../../src/core/native/vendor/ocgcore/NOTICE.md).

Les [modèles Slime et Apophis](trap-monster-models-2026-10-08.md) portent les profils à **22 modèles dédiés**, contre 20 précédemment, avec **17 familles de repli**. Leurs deux références JPEG locales exactes sont inspectées ; aucune illustration n’est collée sur une plaque servant de modèle 3D. Les **12 captures Chromium source/ancien/nouveau** couvrent devant, trois quarts et côté, au repos et en pose. Le rapport mesure budgets et libération GPU et constate zéro erreur JavaScript/WebGL ou requête en échec. La pose de test du Slime ne constitue pas une attaque autorisée par les règles.

Les captures ont également révélé un défaut mobile réel : le conteneur conservait un défilement de 220 pixels après les vues Compacte/Arène, déplaçant canvas et commandes caméra. La Vue Réelle annule désormais les deux offsets avant son redimensionnement, et le callback de pan différé re-vérifie le mode courant. Deux tests comportementaux et le parcours mobile contrôlent la transition. Les miniatures exactes des deux Pièges sont aussi livrées, ce qui supprime leurs requêtes 404 ; les six variantes JPEG conservent tailles, dimensions et SHA de référence.

## Contrôles finaux de livraison

| Contrôle du nouveau lot | Statut actuel | Preuve à consigner |
| --- | --- | --- |
| Matrice native consolidée | Réalisé : 353 / 353 scénarios, 339 / 339 effets | JSON natif du 8 octobre, sources et fixtures. |
| Corrections Dice Dungeon / Duel Tower | Preuves ciblées réalisées | Duels avant/après, gardes SHA, archives inchangées. |
| Deux nouveaux modèles | Audit ciblé réalisé : 12 captures | Modules, JPEG, captures et libérations GPU dans le rapport dédié. |
| Chaînes et permutation masquée | 26 cas natifs et 3 tests de protocole réussis | Suite courante, sélection des trois copies, confidentialité et destinations. |
| `npm run check` | 125 fichiers de tests réussis, zéro échec/skip ; Vite 104 modules | [Relevé du build](artifacts/native-completion-checks-2026-10-08.json), 339 sources et 339 replis. |
| `npm run audit:security` | Zéro vulnérabilité | Relevé du 8 octobre. |
| Navigateur sur le build final | Six audits réussis en 1280 × 900 et 390 × 844 | [Relevé consolidé](artifacts/native-completion-2026-10-08.json), sept fichiers essentiels concordants, zéro erreur de page/ressource/CSP. |
| Revue finale et `git diff --check` | Réalisés | [Revue indépendante](native-field-final-review-2026-10-08.md), sources et captures inspectées. |

La PR #1 a été fusionnée avant cette continuation, le 8 octobre à 13:57 UTC. La branche `master` pointe alors vers `e595f1fa5ef8d39f460e0ed3f825546d8652191a`, dont l’arbre `fdb043e23b488e978f8eebaf01b0b0311055738b` correspond à la baseline locale. Cette livraison prolonge la branche `codex/duel-fidelity-2026-10-01` dans une nouvelle PR draft et un aperçu du même commit ; ses références sont consignées après publication. Le déploiement de production relevé reste `dpl_Er8PxtzuXbJE1zbeAKUpDVc4epBG`, SHA `3e9e7b24d5b90803c802ccde728643f2033738a8`.

Les parcours finaux : [atlas](artifacts/field-atlas-ui-2026-10-08/report.json), [duel général](native-duel-ui-2026-10-08.md), [trois vues](native-duel-views-2026-10-08.md), [Pendule](native-pendulum-ui-2026-10-08.md), [chaînes et modèles](native-chain-ui-2026-10-08.md), [triple Pose et projection initiale](native-multi-set-ui-2026-10-08.md). Les captures attendent les dimensions CSS3D/WebGL et matrices stables sur deux frames ; une transition de 0,01 ms en mouvement réduit pouvait sinon être photographiée avant le tick de resize.

Entrée finale : `/assets/index-DNwe3FSS.js`, SHA-256 `38c428237545d8290e07229c5efdda93441dd1088234c31e64aa6ef3f8b59321`.

## Portée et historiques

Les **339 effets exercés** prouvent au moins une branche par Terrain. Ils ne certifient pas toutes les branches ni toutes les interactions du texte, tous les parcours d’interface ou les milliers de scripts du catalogue complet. Les données de disponibilité TCG conservent la date de leur relevé et restent distinctes des preuves d’exécution.

Les illustrations source sont exactes ; la géométrie et les anatomies restent adaptées à la lisibilité du duel, aux caméras et aux budgets de rendu. Les perspectives, personnages et parties invisibles ne sont pas tous reconstruits spatialement en 1:1. L’audit des deux modèles porte sur leurs modules graphiques, séparément de l’intégration du nouveau build de jeu.

Le [gate du 7 octobre](native-progress-2026-10-07.md), ses **121 fichiers de tests** et ses captures gardent leur valeur pour leur source et leur build historiques. Les preuves d’expansion et de continuation antérieures demeurent liées sans modification de leurs comptes. Le contrôle du navigateur général ne marque pas automatiquement les 339 Terrains comme intégrés/testés dans l’UI.
