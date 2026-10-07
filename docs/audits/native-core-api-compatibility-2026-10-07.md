# Compatibilité des scripts Lua et du moteur natif — 7 octobre 2026

Le moteur livré est maintenant le core officiel EDOPro **`38d04c9feb1a26617407091380634c87262fe3f8`**, compilé avec Emscripten **4.0.9**. Cette mise à jour corrige une incompatibilité réelle de l’ancien binaire : l’effet **267** d’Angelechy Endgame Problem s’initialisait, mais le core ignorait le choix de zone de Special Summon par l’adversaire. Le scénario de régression échoue sur l’ancien core et passe sur le nouveau, avec les scripts officiels inchangés.

Le build est consigné dans [core-build.json](../../public/native/core-build.json), avec les sources correspondantes, hashes et recette publique. Le WASM et son loader Emscripten ont été remplacés ensemble. Une seconde compilation dans un autre répertoire reproduit leurs deux SHA-256 exactement. Les headers `ocgapi.h`, `ocgapi_types.h` et `ocgapi_constants.h` sont byte-identiques entre les deux cores ; l’ABI C reste **11.0**.

## Noms de fonctions

L’audit compare les accès exacts `Duel.X`, `Card.X`, `Group.X` et `Effect.X` des **339 scripts Field**, des **26 helpers** et de l’archive complète de **13 702 scripts** aux vrais registres C++ et aux extensions Lua. Le lexer retire les commentaires et le contenu des chaînes, y compris les commentaires et chaînes à crochets longs. Le préprocesseur C développe les getters générés par macros ; les alias et bindings `LUA_FUNCTION_EXISTING` sont inclus. Aucune condition de compilation ne retire ces méthodes du build standard.

| Périmètre | Références exactes | API distinctes | Résultat |
| --- | ---: | ---: | --- |
| 339 scripts Field | 5 950 | 212 | 187 fournies par le core et 25 par les helpers ; aucun nom absent. |
| 26 helpers | 1 407 | 206 | Une référence ancienne absente dans un helper inutilisé, décrite ci-dessous. |
| Fields et helpers | 7 357 | 292 | Aucune nouvelle API Field manquante ; le même helper inutilisé reste identifié. |
| 13 702 scripts archivés | 197 737 | 471 | Un défaut partenaire corrigé par alias natif exact ; un helper inutilisé reste identifié. Aucune revendication de couverture des branches de toutes ces cartes. |

Les registres natifs contiennent **251 méthodes Duel, 275 Card, 51 Group et 60 Effect**, soit **637** méthodes dans ces quatre namespaces. Les **13 méthodes Debug** portent le total de ces cinq bibliothèques à 650. Les noms des registres sont inchangés entre ancien et nouveau core. Leur présence seule ne détectait donc pas l’incompatibilité d’Angelechy.

Une sonde Lua distincte dans le **WASM réellement livré** vérifie le type de **686 fonctions** des registres, des helpers chargés au démarrage et du bridge local. **685 sont callable**. Le seul nom absent est `Duel.GetMasterRule`, exactement celui déjà isolé par l’analyse statique. La sonde émet intentionnellement un diagnostic dans un handle jetable pour consigner cette absence ; elle ne modifie aucune carte ni aucun script officiel.

Deux défauts amont sont identifiés explicitement :

- `utility.lua:2074` appelle `Duel.GetMasterRule()` dans `Auxiliary.MainAndExtraSpSummonLoop`. Aucun autre script de l’archive ne fait appel à ce helper ; ce défaut n’est donc pas un blocage des 339 Fields.
- `c60921537.lua:26` appelle `Group.NewGroup()` dans **Dogmatikamacabre**, lorsque `CARD_SPIRIT_ELIMINATION` affecte le joueur. Ce nom n’existe dans aucun des deux registres natifs et n’est pas ajouté par les helpers officiels. Le [bridge local](../../src/core/native/NativeLuaCompatibility.js) fournit exactement `Group.NewGroup = Group.CreateGroup` lorsque le premier est `nil`. `CreateGroup` est le vrai constructeur natif ; aucun effet ni algorithme de carte n’est calculé par ce bridge. Le Lua archivé reste byte-identique. Le catalogue étendu n’est pas présenté comme une validation de toutes ses branches.

Le [scénario partenaire réel](../../tests/native-lua-compatibility.test.js) active Spirit Elimination, vérifie son effet natif puis la branche officielle `extramat` de Dogmatikamacabre. Il réalise une Invocation Rituelle de White Knight avec Blue-Eyes, conserve White Knight et White Relic déjà sur le terrain, puis utilise les vrais prompts de l’effet final pour sélectionner une carte de l’Extra Deck adverse et l’envoyer au Cimetière. L’Extra Deck propre reste intact ; l’état natif confirme l’Invocation Rituelle et aucune erreur Lua/core ou message `RETRY` n’apparaît. Les situations initiales sont des fixtures déclarées ; les effets et décisions sont ceux du moteur.

Inventaire des registres, définitions Lua, témoins de ligne, défauts et sonde : [native-core-api-compatibility-2026-10-07.json](artifacts/native-core-api-compatibility-2026-10-07.json).

## Codes d’effets et capacités natives

L’analyse complémentaire vérifie **199 identifiants `EFFECT_*` et `LOCATION_REASON_*`**, soit **3 606 références** dans les Fields et helpers. Toutes leurs valeurs Lua sont résolues. Aucun code numérique natif ne diffère de sa valeur Lua dans le nouveau core.

| Classification du nouveau core | Identifiants |
| --- | ---: |
| Codes natifs, dont les nouveaux codes Angelechy | 167 |
| Alias numériques natifs vérifiés | 2 |
| Tags d’effets gérés et interrogés par Lua | 24 |
| Alias de flags Lua | 6 |
| Capacité native non résolue | 0 |

Les deux alias numériques sont `EFFECT_FORCE_MZONE` → `EFFECT_MUST_USE_MZONE` (265) et `EFFECT_MUST_BE_MATERIAL` → `EFFECT_MUST_BE_SMATERIAL` (312). Chaque tag Lua et alias de flag possède un témoin de définition ou de consommation dans l’artefact ; leur absence comme identifiant C++ ne constitue pas une fonction moteur absente.

L’ancien core omettait exactement **`EFFECT_OPPO_CHOOSES_SPSUMMON_ZONE=267`** et **`LOCATION_REASON_SPSUMMON=0x11`**. Le nouveau core les traite dans `common.h` et `operations.cpp`. Il évalue l’opération de l’effet puis change le joueur qui répond au choix de zone, tout en conservant le contrôleur de destination. Le scénario réel passe par les effets d’Angelechy Problem, Enlisted, Bastion et Shatranga pour former deux Monster Cards dans les Spell/Trap Zones ; après activation d’Endgame, le Special Summon adverse de Gilasaurus demande bien au propriétaire du Field de choisir la zone adverse. Le masque et la requête finale sont vérifiés dans la matrice native.

Preuves : [identifiants et témoins](artifacts/effect-location-identifier-audit-2026-10-07.json), [comparaison des cores](artifacts/core-upgrade-compatibility-summary-2026-10-07.json), [20 scénarios et 339 initialisations](artifacts/native-field-runtime-2026-10-07.json).

## Reproduction et limites

```sh
python scripts/audit-native-core-api-compatibility.py --probe-wasm
python scripts/audit-native-core-capabilities.py
node scripts/audit-native-field-runtime.mjs
node --test tests/native-lua-compatibility.test.js
```

L’audit des noms nécessite Python 3 et `cpp` ; sa sonde nécessite Node. L’audit des codes nécessite Python 3.12 et `g++` et extrait les archives de sources livrées dans un répertoire temporaire. Aucun réseau n’est requis. `--strict-corpus` rend également fatale la référence amont inutilisée ; sans cette option, elle reste consignée et toute nouvelle référence absente fait échouer l’audit. `--core-archive` permet de comparer une autre archive épinglée.

La compatibilité des noms et des constantes ne prouve pas la compatibilité de tous les arguments, les rulings, ni l’exécution de chaque branche. Les appels sur un receveur non typé comme `c:Foo()` et l’indexation calculée d’un namespace ne sont pas attribués à une classe par le lexer. Les **339 initialisations**, les **20 scénarios couvrant 18 Fields** et les preuves de l’interface restent des niveaux de validation séparés. Cet audit évite de confondre un enregistrement d’effet accepté avec une capacité effectivement prise en charge par le core.
