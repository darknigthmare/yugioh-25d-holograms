# Interactions de chaînes natives — 7 octobre 2026

Les **25 scénarios officiels** de [native-duel-chain-interactions.test.mjs](../../tests/native-duel-chain-interactions.test.mjs) passent avec le WASM, le CDB et les Lua livrés. Ils jouent les activations et les décisions à travers `NativeDuelGame` et contrôlent les coûts, cibles, résolutions, zones, contrôleurs et caractéristiques natives. Trois erreurs de projection ont été reproduites puis corrigées : les identités après `SWAP`, la catégorie des Pièges devenus monstres et le nom courant de Pseudo Space. Les descripteurs d’animation des Pièges-Monstres ont également été corrigés dans le traducteur.

Les [résultats structurés](artifacts/native-chain-interactions-2026-10-07.json) conservent les états publics finaux, certaines observations intermédiaires, comptes des messages, familles de décisions et animations. Les [preuves avant correction](artifacts/native-chain-projection-before-2026-10-07.json) exécutent réellement les deux anciennes projections avec les mêmes ressources officielles. Aucun UID de duel n’est enregistré ; les comparaisons d’identité sont des booléens. Les mains et Decks sont représentés par leurs tailles, et les cartes encore face verso restent anonymes. L’inventaire des scripts identifie les cartes déclarées par les fixtures, sans associer une carte privée à un résultat de pioche ou à sa position.

## Méthode et périmètre

Les zones initiales sont déclarées avec l’API ordinaire `NewCard` **avant** `Start`. Toutes les activations suivantes passent par les méthodes de la façade, les actions du prompt natif et le callback de décisions. Les réponses sont validées contre le prompt courant. Aucun script simplifié, effet JavaScript, appel Debug, `TEST_MODE`, `PSEUDO_SHUFFLE` ni injection après le démarrage n’intervient.

Le masque effectivement injecté est `12885092352` : TCG MR5, SEGOC non public et premier déclencheur. Les petits Decks et zéro pioche automatique sont des paramètres explicites de fixtures ; la validation des tailles de Deck est remplacée uniquement dans ces tests. Le camp autonome joue son premier tour, puis le joueur agit au deuxième tour. Ses réponses respectent les possibilités natives et passent les chaînes optionnelles lorsqu’aucune réponse n’est choisie.

Les monstres initiaux sont déclarés sur le terrain ou au Cimetière ; leur procédure préalable n’est pas rejouée. Les tests de [20 invocations](../../tests/native-duel-summoning.test.mjs) vérifient séparément les historiques et matériaux de Fusion, Rituel, Synchro, Xyz, Lien, Pendule et Flip. Ce lot réalise néanmoins l’Invocation spéciale réelle des deux Pièges-Monstres puis une vraie Invocation Lien avec Apophis. Les [21 combats](../../tests/native-duel-battle-timing.test.mjs) couvrent séparément les replays, dégâts, Damage Step et annulations d’attaque.

## Résultats natifs vérifiés

Les variations de LP, ATK, types et contrôleurs ci-dessous proviennent des messages et requêtes du core. La façade ne les recalcule pas.

| Scénario et cartes officielles | Résultat contrôlé |
| --- | --- |
| 1. MST en chaîne à Pot of Greed | Pot détruit, mais deux cartes piochées ; ni `CHAIN_NEGATED` ni `CHAIN_DISABLED`. Animation de pioche sans carte privée. |
| 2. MST en chaîne à Call of the Haunted | Piège Continu détruit avant sa résolution ; Blue-Eyes reste au Cimetière, aucune Invocation spéciale. |
| 3. MST en chaîne à Axe of Despair | Équipement détruit avant sa résolution ; aucune relation `EQUIP`, Blue-Eyes reste à 3000 ATK. |
| 4. D.D. Crow contre Monster Reborn | Crow quitte la main comme coût avant le bannissement de la cible ; Blue-Eyes adverse est banni, Reborn ne l’invoque pas. |
| 5. Monster Reborn depuis le Cimetière adverse | Blue-Eyes devient contrôlé par le joueur, garde son propriétaire adverse, son UID de projection et 3000 ATK ; confirmation native d’Invocation spéciale. |
| 6. Twin Twisters, puis MST | Défausse de Blue-Eyes payée ; deux Pièges ciblés. MST détruit le premier, puis Twin Twisters détruit le second restant. Coût conservé. |
| 7. Solemn Judgment contre Pot of Greed | Activation annulée par `CHAIN_NEGATED`, coût natif de 4000 LP payé, aucune pioche. |
| 8. Imperial Order contre Pot of Greed | Effet désactivé par `CHAIN_DISABLED`, aucune annulation d’activation ni pioche ; Imperial Order reste face recto. |
| 9. Magic Jammer contre Pot of Greed | Défausse de Blue-Eyes effectuée avant l’annulation native de l’activation ; aucun retour du coût en main. |
| 10. Skill Drain puis MST | Coût de 1000 LP ; statut natif désactivé d’Obnoxious Celtic Guard, puis statut restauré quand Skill Drain est détruit, UID inchangé. |
| 11. Call of the Haunted résolu, puis MST | Blue-Eyes réellement invoqué, puis détruit par le lien natif de Call of the Haunted lorsque le Piège est détruit. |
| 12. Call of the Haunted, Trap Stun, puis MST | Le Piège désactivé est détruit, mais son ancien monstre lié reste sur le terrain avec le même UID et 3000 ATK. |
| 13. Axe of Despair résolu, puis MST | Relation native d’équipement vers la Zone Monstre ; ATK 4000 puis 3000, identité du monstre conservée. L’effet facultatif de récupération d’Axe est refusé explicitement. |
| 14. Compulsory sur Blue-Eyes équipé | Monstre renvoyé en main ; Axe envoyé au Cimetière par les règles, aucune carte d’équipement restante. Événement de retour en main masqué. |
| 15. Snatch Steal puis MST | Contrôle pris avec propriétaire adverse conservé ; destruction de l’équipement rend le monstre à son propriétaire, même UID et caractéristiques natives. |
| 16. Change of Heart | Contrôle temporaire d’un Blue-Eyes en Défense ; contrôle rendu à la End Phase, propriétaire et UID conservés, aucune nouvelle Invocation spéciale. |
| 17. Shrink | ATK et ATK de base requêtés à 1500 ; retour exact à 3000 après la End Phase, même UID. |
| 18. Forbidden Lance sur Blue-Eyes équipé | Axe reste face recto mais son bonus cesse de s’appliquer : ATK natif 2200. Fin de l’immunité à la End Phase : ATK 4000. |
| 19. Creature Swap, destinations inchangées | Message natif `SWAP`, contrôleurs et propriétaires corrects, les deux UID conservés ; changement de position interdit par les actions natives du tour. |
| 20. Dimensionhole | Blue-Eyes temporairement banni puis rendu à la prochaine Standby Phase du joueur ; même UID, aucun `SPSUMMONED` ni fausse confirmation d’Invocation. |
| 21. Metal Reflect Slime | Piège devenu Monstre à Effet Aqua/EAU de Niveau 10, ATK 0/DEF 3000, type natif `131365` ; Zone Magie/Piège libérée, vrai succès d’Invocation spéciale. |
| 22. Embodiment of Apophis puis Link Spider | Monstre Normal Piège Reptile/TERRE, Niveau 4, ATK 1600/DEF 1800, type natif `131349`. Matériel légal proposé par le core pour Link Spider ; Apophis au Cimetière retrouve sa catégorie Piège. |
| 23. Creature Swap, autre destination choisie | Le core émet deux `MOVE` au lieu de `SWAP` ; Blue-Eyes entre en Zone Monstre 1 choisie, contrôleurs et les deux UID conservés. |
| 24. Seven Tools contre Raigeki Break | La défausse de Dark Magician pour Raigeki Break reste payée malgré l’annulation de son activation. Seven Tools paie 1000 LP ; Blue-Eyes ciblé reste inchangé. |
| 25. Pseudo Space copie Wetlands | Wetlands est réellement banni du Cimetière comme coût. `CODE` reste `77584012`, `ALIAS` devient `2084239`, le nom courant devient Wetlands et Slime Toad passe de 700 à 1900 ATK. Nom et ATK reviennent à Pseudo Space / 700 à la End Phase ; passcode, UID et illustration restent inchangés. |

## Comparaison avant et après

La preuve isolée charge une copie de la façade avant modification et du traducteur public du commit `ba6c62a`. Seuls leurs imports sont convertis en chemins absolus pour les exécuter hors de l’arbre applicatif ; les mêmes lecteurs CDB/Lua et WASM sont utilisés. Leurs octets originaux ont les empreintes suivantes :

- Façade : `384aad03eaa7cd886a7dcfcd880204acee5fe8aed9c15549092c1d186df1a1ce`.
- Traducteur public : `43e560f075e421ec99d9942c900542b0f006e30c7767416335d4a24a285319e8`.

| Observation réelle | Avant | Après |
| --- | --- | --- |
| Creature Swap : identités des deux cartes conservées | `false`, `false` malgré contrôleurs natifs corrects | `true`, `true` ; même `SWAP`, mêmes résultats natifs |
| Metal Reflect Slime : catégorie de projection | `trap` / `Trap Card`, malgré type natif `131365` | `monster` / `Trap Effect Monster` |
| Apophis : catégorie de projection | `trap` / `Trap Card`, malgré type natif `131349` | `monster` / `Trap Normal Monster` |
| Descripteur public des deux Invocations | Carte toujours classée Piège, attribut vide | Carte classée Monstre, races Aqua/Reptile et attributs Water/Earth natifs |

`NativeDuelGame` transfère maintenant les identités atomiquement entre les deux emplacements antérieurs fournis par `SWAP`. Les contrôleurs, propriétaires, positions et valeurs restent ceux des requêtes natives suivantes. Les deux `MOVE` émis lorsque la destination change n’exigent pas de correctif supplémentaire et disposent d’un scénario séparé.

La façade et le traducteur utilisent désormais les mêmes libellés de [NativeCardCharacteristics.js](../../src/core/native/NativeCardCharacteristics.js), issus des enums officiels. Le bit `MONSTER` prime lorsque `TRAP` coexiste : cela présente un Piège-Monstre selon son état actuel. Cette modification de présentation n’ajoute aucune règle de transformation.

Pour Slime et Apophis, les tests contrôlent également le vrai callback de succès natif et `createPublicCombatVisual` : descripteur de Monstre, race/attribut/type actuels et profil `special-summon`. Link Spider reçoit la qualification `link` dans son événement confirmé. Les requêtes publiques du traducteur restent conditionnées à la visibilité et à la correspondance de code ; aucune identité privée n’est consultée pour qualifier une animation.

### Nom courant et identité imprimée de Pseudo Space

La [preuve avant correction du nom](artifacts/native-chain-alias-before-2026-10-07.json) utilise la façade déjà corrigée pour SWAP et Pièges-Monstres, SHA-256 `c589de6c54eab8a3067db0d91b42a834c9b9ac8772b79cd8130112ebf1c3d45c`. Son vrai core renvoie `code: 77584012`, `alias: 2084239` et l’ATK 1900 de Slime Toad après le paiement du coût, mais `getName()` reste alors « Pseudo Space ». Le retour à l’alias `77584012` et à 700 ATK est également rejoué dans cette preuve.

La projection suit maintenant `QUERY_ALIAS` pour `name`, `name_en` et `getName()`. `nativeAlias` conserve la valeur brute du core et `currentNameCode` son code courant canonique. `printedName` et `printedName_en` conservent le nom imprimé ; `id`, `nativeCode`, UID et illustration restent ceux de la carte physique Pseudo Space. Les identités utilisées pour les limites de copies continuent ainsi de dépendre du passcode imprimé. Le scénario vérifie également que l’action d’ignition disparaît après son utilisation native du tour.

Une [seconde preuve réelle](artifacts/native-chain-field-event-before-2026-10-07.json) a identifié un nom périmé dans le seul événement de Terrain après résolution : la façade avait déjà « Wetlands », `ALIAS` valait `2084239` et Slime Toad avait 1900 ATK, mais `field-source-change` réutilisait le descripteur « Pseudo Space » capturé au début de la chaîne. Le Terrain était correctement marqué actif et non annulé. Cette preuve isole le traducteur précédent en inversant uniquement le nouveau rafraîchissement du payload ; les effets, ressources natives et projections de nom corrigées restent identiques.

À `CHAIN_SOLVED`, le traducteur calcule d’abord la présence avec le même pointeur conservé, puis reconstruit uniquement le payload public du Terrain encore présent et non annulé depuis la requête sûre actuelle. Il ne remplace ni la carte du lien ni le cache utilisé par la comparaison de présence. Le scénario 25 exige maintenant « Wetlands » dans `name` et `name_en` de cet événement, « Pseudo Space » dans les deux noms imprimés, le passcode physique `77584012` et les états `resolved: true`, `active: true`, `negated: false`. L’observation correspondante figure dans le JSON principal.

## Sources, validation et limites

Le core reste EDOPro `38d04c9feb1a26617407091380634c87262fe3f8`, ABI 11.0. Les ressources suivantes sont inchangées ; le JSON du lot archive aussi le SHA-256 de chaque Lua utilisé, des projections et du fichier de tests. Un Monstre Normal sans script spécifique est indiqué par `sha256: null` et provient du CDB.

| Ressource | SHA-256 |
| --- | --- |
| WASM local | `0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026` |
| CDB sérialisé, `card-data.json` | `4d663cc458934cff2b944204f641838f03803bffac3d12106082171d9dee5d8d` |
| Archive Lua, `scripts.json` | `a4f1769decc033e95e7033df8475c6cf7b9efa110fe2a662963c22913566b45f` |
| Wrapper local, `index.js` | `0b46ae83e05a0b6d4ebf85e4422c6f64bea0a5613ea3c649b6eee50d275bc919` |

Commande détaillée : `node --test --test-isolation=none tests/native-duel-chain-interactions.test.mjs`. Résultat : **25 réussites, zéro échec**, aucun `RETRY`, aucune erreur native ou Lua. La façade, les invocations, les combats et ce lot passent également ensemble : **82 tests nommés**, zéro échec. Avec l’isolation normale de Node 24, la sortie regroupe ces tests par fichier tout en propageant leurs échecs.

Ces preuves couvrent les branches déclarées et les choix effectivement produits par le core, y compris des réponses à ses propres cartes légalement proposées. Elles ne certifient pas toutes les combinaisons de priorité, les effets de chaque archétype, les équipements changeant de cible, les swaps de cartes encore cachées ou toutes les annulations possibles. Elles vérifient les callbacks de présentation et le contrat public, pas un nouveau rendu navigateur. Aucune construction de `dist` ni modification du core, du wrapper ou des Lua n’a été effectuée pour ce lot.
