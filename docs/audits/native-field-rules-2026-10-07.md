# Exécution native des 339 Magies de Terrain — 7 octobre 2026

Les **339 cartes du catalogue disposent de leur ligne CDB et de leur véritable script Lua**, et leur `initial_effect` s’exécute sans diagnostic Lua dans **339 duels natifs distincts**. **20 scénarios de règles passent**, couvrant **18 terrains différents**. Ces résultats concernent le moteur WASM ; la vérification du navigateur possède son propre rapport.

| Niveau de preuve | Résultat | Ce qu’il établit |
| --- | ---: | --- |
| `bundled` | 339 / 339 | Ligne CDB et script Lua exact présents dans les archives livrées. |
| `initialized` | 339 / 339 | Insertion du terrain, `initial_effect`, enregistrement des effets, requête native et démarrage d’un duel sans erreur Lua. |
| `effectTested` | 18 / 339 | Au moins un effet exécuté et vérifié dans les scénarios ci-dessous. |
| `integrationTested` | 0 dans cet audit | Cet audit Node ne produit aucune preuve de clics, d’affichage ou de comportement du navigateur. |

La matrice complète contient les passcodes canoniques et physiques, les chemins Lua amont, les SHA-256 de chaque script, les réponses typées, les messages du moteur et les résultats des requêtes : [native-field-runtime-2026-10-07.json](artifacts/native-field-runtime-2026-10-07.json). Elle conserve les quatre niveaux séparément. L’initialisation ne vérifie pas toutes les branches des effets ni l’exécution de tous les événements enregistrés.

## Scénarios exécutés

Chaque scénario utilise un nouveau handle de duel et des cartes réelles. Les assertions portent sur les messages de chaîne et les requêtes du moteur, sans calcul d’effet dans JavaScript.

| Terrain | Preuve d’effet native |
| --- | --- |
| Zombie World | Activation depuis la main ; Blue-Eyes devient Zombie. |
| Necrovalley | Gravekeeper’s Spy gagne 500 ATK/DEF ; deuxième duel : Monster Reborn est légalement activé et ciblé, puis son effet est désactivé à la résolution. Le monstre adverse reste au Cimetière. |
| Molten Destruction | Ryu-Ran reçoit +500 ATK et −400 DEF. |
| Gaia Power | Jerry Beans Man reçoit +500 ATK et −400 DEF, avec DEF limitée à zéro par le moteur. |
| Wetlands | Slime Toad, WATER/Aqua de Niveau 2, gagne 1200 ATK. |
| A Legendary Ocean | Slime Toad reçoit +200 ATK/DEF et son Niveau passe de 2 à 1 ; l’identité native respecte l’alias Umi. |
| Dragon Ravine | Défausse réelle de Dark Magician en coût ; sélection du mode d’envoi ; Blue-Eyes envoyé depuis le Deck par effet. Les raisons natives distinguent coût et effet ; aucune cible de chaîne. |
| Fusion Gate | Sélection de Fusion et matériaux ; trois Blue-Eyes sont bannis et Blue-Eyes Ultimate Dragon est Fusion Summoned. Deuxième duel : trois Fusions successives occupent les Main Monster Zones sous MR5. |
| Extra Net | Une Fusion depuis l’Extra Deck déclenche une chaîne obligatoire ; le joueur adverse répond à la proposition de pioche et pioche réellement. |
| Summon Breaker | Deux Special Summons légaux de Gilasaurus, puis un Normal Summon ; le troisième déclenche la chaîne et le passage en End Phase. |
| Venom Swamp | Trigger obligatoire d’End Phase ; un Venom Counter est ajouté, vérifié par requête, et Dark Magician perd 500 ATK. |
| Mausoleum of the Emperor | Chaîne d’ignition ; paiement natif de 2000 LP ; Normal Summon de Blue-Eyes sans Tribute. |
| Harpies’ Hunting Ground | Normal Summon de Harpie Lady ; trigger obligatoire, cible adverse Spell/Trap et destruction ; bonus de 200 ATK vérifié. |
| Geartown | Mystical Space Typhoon cible et détruit le terrain ; son trigger optionnel invoque Ancient Gear Gadjiltron Dragon depuis le Deck. |
| Magical Citadel of Endymion | Hinotama résout et crée un Spell Counter ; un MST ultérieur cible Citadel, puis une décision explicite consomme un compteur pour remplacer la destruction. |
| Gateway to Chaos | Activation, sélection du vrai Black Luster Soldier Ritual et ajout depuis le Deck à la main ; aucune cible de chaîne. |
| Black Garden | Normal Summon d’Alexandrite Dragon ; ATK divisée par deux et véritable Rose Token créé sur le terrain adverse. |
| Angelechy Endgame Problem | Deux Angelechy Monster Cards deviennent légalement des Continuous Spells via Angelechy Problem : défausse de MST, invocation d’Enlisted, placement de Bastion et trigger de placement de Shatranga. Endgame remplace le premier terrain. Lors du Special Summon adverse de Gilasaurus, le moteur propose la décision de zone au propriétaire d’Endgame ; ce joueur place Gilasaurus dans la Main Monster Zone adverse 2. |

## Conditions de validation

Flags : `MODE_MR5 | TCG_SEGOC_NONPUBLIC | TCG_SEGOC_FIRSTTRIGGER`, valeur `12885092352`. Les deux flags SEGOC TCG sont nécessaires ; MR5 seul conserve les conventions de déclenchement OCG. Aucun flag `TEST_MODE`, `PSEUDO_SHUFFLE` ou `UNLIMITED_SUMMONS` n’est activé.

Les fixtures de règles démarrent avec zéro carte piochée et zéro pioche automatique par tour, et une seed déterministe `[1n, 2n, 3n, 4n]`. Les cartes sont placées avant le démarrage pour fixer la situation initiale. Les cartes de Fusion de l’Extra Deck sont face verso, conformément aux règles ; les mettre face recto empêcherait à juste titre leur placement MR5 dans les Main Monster Zones. Les scripts, lignes CDB et phases du moteur restent intacts. Chaque action et choix passe par `duelSetResponse` via `NativeDuelRuntime.respond`.

Une requête est faite immédiatement après l’insertion de chaque terrain, avant le démarrage et donc avant ses coûts d’entretien. Le démarrage est ensuite avancé jusqu’à la première décision native. Cela permet par exemple à Golden Castle of Stromberg de détruire légalement sa propre carte au Standby si le Deck de fixture contient moins de dix cartes, sans confondre ce comportement avec une erreur d’initialisation.

Sources gelées : CardScripts `37f270dc813a12d123707ae255f2bda7922999c4`, BabelCDB `fdf92aea31033cd6c44afa89987c5e00665205e2`. Les quatre passcodes récemment attribués conservent une correspondance explicite avec leur passcode de script prerelease ; aucun script canonique fictif n’est généré. Le WASM et les corrections de décodage du wrapper sont documentés dans [NOTICE.md](../../src/core/native/vendor/ocgcore/NOTICE.md). Les corrections décodent notamment `TYPE` et les couples type/quantité des compteurs ; elles ne changent pas les effets Lua.

Le binaire validé est construit depuis le core `38d04c9feb1a26617407091380634c87262fe3f8`, avec SHA-256 `0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026`. [core-build.json](../../public/native/core-build.json) conserve la recette, le compilateur, les archives sources et leurs hashes. L’audit vérifie ce hash et l’API avant d’exécuter les scénarios.

Le scénario Angelechy constitue aussi une régression du binaire : l’ancien core `8e5f4e4f…`, pourtant exposé par la même API 11.0, ignore `EFFECT_OPPO_CHOOSES_SPSUMMON_ZONE=267` et donne la décision au joueur qui invoque. Le scénario échoue alors avec `player 1 != player 0`. Avec le nouveau core, le vrai `SELECT_PLACE` a `player=0`, masque `4292935679`, et la réponse désigne `player=1`, zone 2. Les scripts Lua sont identiques dans les deux cas ; [la comparaison des traces](artifacts/native-field-angelechy-zone-regression-2026-10-07.json) garde les versions et les hashes distincts. Le seul succès d’`initial_effect` ne pouvait pas détecter cette différence de comportement.

## Relancer

```sh
node scripts/audit-native-field-runtime.mjs
node --test --test-isolation=none tests/native-field-catalogue.test.js
```

Le script écrit la preuve JSON puis échoue si une ressource manque, si un des 339 terrains ne s’initialise pas ou si un scénario de règles échoue. Les tests ne contiennent aucun `skip` conditionné à l’absence d’assets. Le runner sans isolation affiche individuellement les assertions de la suite.

## Contrat pour l’intégration navigateur

Le mode **Duel libre** possède une recherche dans **14 355 cartes uniques** issues des ressources CDB/Lua, notamment les partenaires des terrains qui dépassent la bibliothèque locale. `NativeCardCatalogue` conserve en priorité les 390 templates locaux avec leurs illustrations et traductions, puis produit les autres templates à partir des faits CDB. Les cartes sans visuel local utilisent une image PNG neutre ; aucun téléchargement de milliers d’illustrations n’est nécessaire. L’absence de script est admise uniquement pour un Normal Monster ordinaire sans procédure supplémentaire. Tokens, Skill, Rush et scopes incompatibles avec les duels standards sont exclus du Deck ; les Tokens créés par le moteur possèdent un template de présentation distinct.

Cette recherche étendue est réservée à `mode='native'`. Les cartes supplémentaires portent `supportedInStrict=false` et `banlistVerified=false` ; leur présence dans la CDB ne constitue pas une vérification des banlists Advanced. Le mode strict conserve les 390 templates locaux et leurs règles d’éligibilité. Les cartes OCG et annoncées peuvent être sélectionnées en Duel libre. Les correspondances des passcodes prerelease, les illustrations alternatives et les doublons de versions beta sont normalisés. Le contrôle des trois copies utilise l’alias réel CDB, notamment pour Umi et les différentes Harpie Lady, avec une identité cumulée dans Main, Extra et Side.

Charger les ressources locales avant le duel, puis laisser le moteur gérer les phases, coûts, matériaux, cibles, restrictions et chaînes. L’interface traduit la dernière décision native en contrôles et renvoie exactement le type et les indices proposés par cette décision. Elle ne doit pas sélectionner automatiquement une réponse pour faciliter un scénario. Les contrôles de sélection/unselection de Fusion doivent préserver les choix de matériaux, et les zones sont limitées au masque envoyé par le moteur.

Construire les zones visibles à partir des requêtes natives après les messages. Conserver la propriété, le contrôleur, la position, les compteurs, l’alias et l’identité physique pendant les changements de zone ; l’identifiant canonique sert à retrouver les illustrations et textes du catalogue. Les cartes placées dans l’Extra Deck au lancement sont face verso, sauf les Pendulum qui y seraient légalement face recto. Initialiser les vrais duels avec la seed CSPRNG du runtime.

Pour revendiquer `integrationTested`, conserver séparément une preuve navigateur contenant les clics sur les décisions proposées, les messages natifs obtenus, une requête après résolution et les erreurs de console. Le scénario doit fonctionner via les contrôles publics du duel. Le rapport [native-duel-integration-2026-10-07.md](native-duel-integration-2026-10-07.md) décrit cette intégration ; la matrice de ce fichier reste volontairement une matrice de vérification du moteur.
