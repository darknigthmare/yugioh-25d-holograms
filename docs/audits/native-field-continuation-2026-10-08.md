# Consolidation native des Terrains — 406 scénarios

Le collecteur a réellement exécuté les **406 scénarios**, ainsi que l’initialisation distincte des **339 Terrains**, avec le WASM OCG archivé. Les 406 scénarios passent ; toutes les 339 lignes sont empaquetées, initialisées et exercées par au moins un scénario. Le compteur d’intégration navigateur de cette preuve headless reste **0**.

Le rapport courant est [native-field-runtime-continuation-2026-10-08.json](artifacts/native-field-runtime-continuation-2026-10-08.json). Son horodatage exact est donné par `executedAtUtc`, en UTC. Il complète les **377 scénarios** de la [vague précédente](artifacts/native-field-runtime-wave-2026-10-08.json), conservée intégralement.

## Ajouts et pointeur courant

- [Continuation A](continuation-field-a-2026-10-08.md) : 15 branches sur Chicken Game, Gateway to Chaos, Secret Village, Black Garden, Fire King Island et Archfiend Palabyrinth.
- [Continuation B](continuation-field-b-2026-10-08.md) : 14 branches sur Dragon Ravine, Zombie World, Union Hangar, SPYRAL Resort, Mound of the Bound Creator, Sky Iris et Lair of Darkness.

Les deux listes sont disjointes : **29 branches sur 13 Terrains** déjà présents. Chaque session ajoute ses cartes avant `start`. Tous les choix, coûts, LP, Invocations, destructions, restrictions, phases et destinations vérifiés proviennent des messages et requêtes OCG. Aucun résultat n’est substitué par un moteur de règles JavaScript ou une injection après démarrage.

[audit-native-field-runtime.mjs](../../scripts/audit-native-field-runtime.mjs) importe les deux nouveaux runners après les 377 scénarios historiques. `NATIVE_FIELD_AUDIT_PATH` pointe sur le nouveau rapport, qui cite la vague précédente dans `previousEvidencePath`. Le générateur de couverture et [NativeFieldCoverageSnapshot.js](../../src/ui/NativeFieldCoverageSnapshot.js) utilisent désormais ce rapport courant, avec **406 scénarios / 406 réussites**.

Le snapshot conserve les mêmes identités, disponibilités, source CDB/Lua, core OCG, scripts spécifiques et quatre ensembles de couverture des 339 cartes. Seuls le pointeur de preuve et les deux compteurs de scénarios progressent ; la couverture reste fondée sur les lignes individuelles et ne devient pas une certification de tous les effets.

La preuve [field-coverage-continuation-2026-10-08.json](artifacts/field-coverage-continuation-2026-10-08.json) garde la distinction entre géométrie dédiée, volumes étudiés, effets JavaScript historiques, disponibilité native, effets effectivement exercés et intégration navigateur. Ses 339 cartes restent étudiées et reconstruites ; les 29 effets JavaScript historiques restent distincts des 339 Terrains exercés avec OCG. L’enrichissement des volumes et la fidélité visuelle sont documentés par les autres audits, sans promesse spatiale intégrale 1:1.

## Préservation complète de l’historique

Deux contrôles indépendants protègent l’historique :

1. Le collecteur, après avoir exécuté les 406 séances, sérialise les données avec le même encodage JSON que les anciens rapports et exige l’égalité stricte des **377 objets de scénario complets**, dans leur ordre historique, et des **339 objets de matrice complets**.
2. [audit-native-field-continuation-preservation.py](../../scripts/audit-native-field-continuation-preservation.py) lit le rapport précédent depuis le commit `HEAD` enregistré, vérifie que ses octets archivés sont identiques à cet objet Git, puis compare chaque scénario et chaque ligne au rapport nouveau.

Voir [native-field-continuation-preservation-2026-10-08.json](artifacts/native-field-continuation-preservation-2026-10-08.json). Tous ses contrôles réussissent : aucun ID historique manquant, aucune collision, aucun champ historique modifié, aucune ligne de matrice modifiée, aucun message `RETRY`, aucune erreur Lua/core. Les 29 nouveaux scénarios sont passés et utilisent uniquement des Terrains précédemment couverts.

Cette comparaison couvre les descriptions, IDs, champs de provenance, flags, messages, décisions, requêtes, fixtures, seeds, équipes, corrections appliquées, erreurs et tous les autres champs présents dans chacun des 377 anciens objets. Elle enregistre une empreinte de l’objet entier et des six composants explicites (`messages`, `decisions`, `queries`, `fixtureCards`, `fixtureSeed`, `fixtureTeams`) pour chaque scénario. Les tableaux conservent leur ordre et les types/valeurs JSON restent exacts ; les entiers BigInt natifs sont encodés en chaînes, comme dans le rapport historique.

Les métadonnées du nouveau rapport, sa date d’exécution et ses empreintes de sources actuelles progressent séparément. Les 377 anciennes preuves ne sont ni copiées comme résultats supposés, ni recalculées artificiellement : les 377 séances sont rejouées, puis leur représentation enregistrée est comparée au précédent.

## Ressources et validation

Le WASM reste l’artefact natif de **935745 octets**, SHA-256 `0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026`, core `38d04c9feb1a26617407091380634c87262fe3f8`, API `11.0`. Les archives Lua/CDB et les sources du core ne changent pas. Les deux corrections Lua locales déjà présentes, lues sous garde d’empreinte pour Dice Dungeon et Duel Tower, restent explicitement déclarées ; aucune correction de carte supplémentaire n’est introduite par ces deux continuations.

Le rapport enregistre les empreintes de **34 dépendances de source**, dont les deux runners, leurs tests, les tests de snapshot, le générateur, les sources du runtime, la politique de révélation publique, la compatibilité Lua, le reader CDB/Lua et les modules du wrapper OCG. Les empreintes des ressources archivées et du build restent également présentes dans la provenance native. Les deux rapports individuels A/B fournissent les scripts de leurs fixtures et leurs empreintes originales/effectivement lues.

```sh
node scripts/audit-native-field-runtime.mjs
node scripts/generate-native-field-coverage.mjs
node scripts/audit-field-coverage.mjs
python scripts/audit-native-field-continuation-preservation.py
node --test --test-reporter=tap tests/native-field-catalogue.test.js test/native-field-atlas-coverage.test.js
```

Le passage ciblé du catalogue et de l’atlas compte **419 tests nommés réussis**, dont les 406 scénarios natifs. Aucun échec, annulation, saut ou TODO. Voir [targeted-tests.txt](artifacts/continuation-field-consolidation-2026-10-08/targeted-tests.txt). Dans cet environnement géré, la commande de test a utilisé l’override autorisé `with_additional_permissions` avec `network.enabled=true`, qui permet aux workers Node de transmettre leurs résultats ; aucun changement de `package.json` ou de configuration globale des tests n’est requis.

Les anciennes sorties `native-field-runtime-wave-2026-10-08.json` et `field-coverage-wave-2026-10-08.json` restent inchangées. Aucun build, commit, publication, fusion de PR ou promotion en production n’est effectué par cette consolidation.

La preuve reste limitée aux scénarios nommés et à leurs contrôles explicites. Elle ne certifie pas toutes les interactions de chaque Terrain, l’ensemble des règles TCG, l’intégration navigateur des 339 cartes ou une reproduction visuelle complète 1:1.
