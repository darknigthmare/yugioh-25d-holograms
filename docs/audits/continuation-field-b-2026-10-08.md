# Continuation B — branches natives de sept Terrains

Le 8 octobre 2026, **14 scénarios supplémentaires sur 7 Terrains passent réellement dans OCG/WASM**, API native 11.0. Ils complètent les 377 scénarios de la vague précédente ; aucun scénario historique, matrice consolidée ou snapshot n’est modifié par ce chantier.

Les [preuves JSON](artifacts/continuation-field-b-2026-10-08.json) contiennent **956 messages natifs, 341 décisions typées et 89 requêtes natives**, les cartes de départ, les équipes, les graines déterministes et les résultats des assertions. Le [script reproductible](../../scripts/native-field-continuation-b.mjs) construit chaque fixture avant `duel.start()`. Les coûts, attaques, restrictions, changements de contrôle et passages de phase passent ensuite par le protocole réel du cœur.

| Terrain | ID | Nouvelles branches constatées |
| --- | --- | --- |
| Dragon Ravine | 62265044 | Recherche Dragunity avec défausse comme coût et limite partagée entre modes ; Ash Blossom annule la recherche, conserve le coût payé et consomme toujours la limite. |
| Zombie World | 4064256 | Interdiction d’Invocation Sacrifice et de Pose Sacrifice non-Zombie pour les deux joueurs ; Vampire Lord reste légal et est réellement Invoqué. Les races des deux terrains et des deux Cimetières reviennent aux valeurs imprimées après MST, puis Blue-Eyes est réellement Invoqué par deux Sacrifices. |
| Union Hangar | 66399653 | Interdiction de déséquipement expirant à la fin du tour, suivie d’un déséquipement/Invocation Spéciale réel de B-Buster Drake ; Book of Moon en chaîne met la cible face verso et empêche l’équipement depuis le Deck à la résolution. |
| SPYRAL Resort | 54631665 | Filtrage des cibles adverses protégé, puis restauration après destruction du Terrain ; auto-destruction à l’End Phase sans monstre au Cimetière ; choix de détruire le Terrain malgré un mélange légal disponible. Dans les deux derniers cas, raison native exacte `0x81` = destruction et coût, sans raison d’effet ou de combat. |
| Mound of the Bound Creator | 269012 | Protection des monstres de Niveau 10 des deux joueurs contre ciblage et destruction non ciblée ; les petits monstres sont détruits par Dark Hole. Après retrait du Terrain, Book of Moon peut cibler le Niveau 10. Deux destructions au combat, une par joueur, déclenchent chacune 1000 dégâts d’effet distincts des 1550 dégâts de combat. |
| Sky Iris | 27813661 | Magician dans une véritable Zone Pendule protégé du ciblage adverse ; un autre Spell et le Terrain restent ciblables. Après retrait de Sky Iris, MST peut détruire Timegazer, qui rejoint face recto l’Extra Deck. |
| Lair of Darkness | 59160188 | Coût d’Enemy Controller payé par un monstre adverse puis prise de contrôle temporaire, retour au propriétaire à l’End Phase et création d’un Token. Cette substitution ne permet pas une Invocation Sacrifice ordinaire avec les monstres adverses. Si MST retire le Terrain après un coût de Sacrifice d’Ahrima, l’attribut imprimé revient et aucun Token n’est créé. |

Le cas Sky Iris emploie **Supply Squad**, un Spell Continu déclaré légalement dans une Zone Magie/Piège, comme cible de contrôle. Les doublons Jizukiru sont distingués par contrôleur dans la réponse native à Book of Moon. Ces choix évitent les fixtures illégales et les sélections ambiguës au même nom.

## Validation et provenance

Exécution directe : `node scripts/native-field-continuation-b.mjs` — **14/14**, aucune erreur Lua, aucun message `RETRY`. [Journal natif](artifacts/continuation-field-b-2026-10-08/native-execution.txt).

Tests ciblés : `node --test --test-isolation=none --test-reporter=tap tests/native-field-continuation-b.test.mjs` — **15 tests nommés réussis**, aucun échec, annulation, test ignoré ou todo. [Journal](artifacts/continuation-field-b-2026-10-08/targeted-tests.txt).

La même [suite](../../tests/native-field-continuation-b.test.mjs) passe également en isolation par défaut, **15 tests nommés**, lorsque les sous-processus sont autorisés par l’environnement d’exécution. [Journal en isolation par défaut](artifacts/continuation-field-b-2026-10-08/targeted-tests-default-isolation.txt). Le sandbox local restreint avait seulement affiché un wrapper de fichier : le diagnostic `spawnSync` produisait `EPERM` et supprimait des sorties de flux pour des programmes sans WASM également. L’autorisation réseau additionnelle du runtime corrige ce comportement local ; aucun changement de `package.json`, aucune adaptation des assertions et aucun contournement de règles du jeu n’ont été conservés.

Le JSON scelle **25 fichiers de dépendances**, **21 scripts de cartes**, `constant.lua`, `utility.lua` et le bootstrap de compatibilité existant. Le SHA-256 du WASM est contrôlé contre `core-build.json`; les données CDB, les archives Lua et la banlist sont contrôlées contre leur manifeste. Chaque carte de fixture garde les empreintes du script original et du script effectif.

Les corrections de script déjà existantes restent identiques. **Aucun script de carte, fichier CDB ou binaire WASM n’est modifié dans cette continuation.** Les flags sont `MODE_MR5`, `TCG_SEGOC_NONPUBLIC` et `TCG_SEGOC_FIRSTTRIGGER`; aucun mode test, moteur de règles JavaScript, API de debug Lua ou injection de cartes après le démarrage n’est utilisé.

## Limites

Cette preuve couvre les quatorze branches décrites, pas toutes les combinaisons de cartes, fenêtres d’effets, protections ou coûts de ces sept Terrains. Elle ne certifie pas leurs graphismes, l’interface compilée ou la fidélité intégrale TCG. Les décisions et requêtes stockées appartiennent à des sessions natives déterministes construites pour vérifier les branches citées.
