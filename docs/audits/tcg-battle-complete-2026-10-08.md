# Combat, tours et résultat du Duel TCG — 8 octobre 2026

Les règles restent exécutées par le core natif API 11, révision `38d04c9feb1a26617407091380634c87262fe3f8`, avec `MODE_MR5` et les deux options SEGOC TCG. Cette livraison ajoute la projection publique des phases et du cycle de combat, reconnaît les replays sans les compter comme une deuxième déclaration et affiche un résultat provenant exclusivement de `MSG_WIN`. Elle ne calcule aucun dégât ni aucune permission en JavaScript.

Le [rapport natif](artifacts/tcg-battle-complete-2026-10-08.json) contient **56 Duels réellement exécutés**, soit 28 familles exercées avec les contrôleurs 0 et 1. Chaque trace conserve les fixtures avant `Start`, tous les messages et réponses typées, les scripts effectivement chargés et leurs SHA-256 d’origine et d’exécution, les options, les valeurs de PV attendues et les événements publics produits. Aucun `TEST_MODE`, `PSEUDO_SHUFFLE`, accès de débogage Lua ou ajout de carte après `Start` n’est utilisé. Les fixtures représentent des situations de milieu de Duel avec Decks réduits et respectent la borne de trois copies ; elles ne sont pas présentées comme des Decks de tournoi de 40 cartes. `Self-Destruct Button`, carte interdite, apparaît uniquement dans une fixture explicitement libre afin d’exécuter le résultat natif de PV simultanément nuls.

| Règle ou interaction | Résultat natif contrôlé |
|---|---|
| Première pioche et première Battle Phase | Aucune pioche du premier joueur au premier tour, Battle Phase indisponible ; pioche obligatoire et Battle Phase proposées aux tours suivants. |
| ATK contre ATK | Différences positives et négatives, égalité avec destruction des deux monstres, égalité à zéro sans destruction ni dégâts. |
| ATK contre DEF | DEF inférieure, égale ou supérieure ; aucun dégât au défenseur sans effet perçant ; aucune destruction du monstre attaquant lorsque DEF est supérieure. |
| Zéro ATK contre zéro DEF | Aucun dégât et aucun monstre détruit. |
| Monstre face cachée | Identité et DEF révélées dans le Damage Step par le core, puis destruction native. |
| Attaque directe et perçante | 1 900 dégâts de Luster Dragon ; 1 500 dégâts de Gravekeeper’s Spear Soldier contre 0 DEF. |
| Positions et invocation | Pas de changement manuel le tour de l’invocation, pas de deuxième changement manuel, changement possible au tour suivant, impossible après attaque en Main Phase 2. |
| Replay facultatif | Ajout d’un monstre par Call of the Haunted : nouvelle cible acceptée ou replay refusé ; une seule déclaration consommée. |
| Replay obligatoire | Berserk Gorilla doit attaquer : second `MSG_ATTACK` dans la même commande native, sans question oui/non. |
| Retrait de l’attaquant | Compulsory Evacuation Device renvoie l’attaquant en main ; arrêt sans Damage Step ni dégâts. |
| Retrait de la cible | Compulsory renvoie la cible ; replay accepté vers une attaque directe de 3 000 dégâts. |
| Annulation de l’attaque | Negate Attack émet `ATTACK_DISABLED`, quitte le combat et atteint Main Phase 2 sans Damage Step ni dégâts. |
| Protection au combat | Waboku empêche les dégâts et la destruction des deux monstres qui combattent. |
| Fenêtre du Damage Step | Honest proposé dans le Damage Step, envoyé au Cimetière comme coût ; Book of Moon proposé auparavant et absent dans cette fenêtre ; 3 000 dégâts natifs modifiés. |
| End Phase | Sept cartes en main : sélection native d’une carte, défausse réelle et six cartes restantes. |
| PV à zéro | Victoire native du joueur attaquant, raison 1. |
| Deck vide | Le Deck vide seul ne termine pas la première Main Phase ; échec de la pioche obligatoire, victoire adverse, raison 2. |
| Exodia | Upstart Goblin pioche réellement la cinquième pièce ; victoire raison 16. Quatre pièces n’émettent aucune victoire. |
| Exodia simultané | One Day of Peace pioche réellement les deux cinquièmes pièces ; résultat nul, joueur natif 2 et raison 16. |
| PV simultanément nuls | Self-Destruct Button exécuté par son script officiel ; résultat nul, joueur 2 et raison 1. |

## Corrections de présentation

`NativeBattleLifecycle.js` observe le protocole public sans lecteur de métadonnées ni requête de carte. Le replay facultatif est annoncé par `SELECT_YESNO` description 30. Un effet « must attack » saute cette question : le second `MSG_ATTACK` appartient alors à la même fenêtre ouverte par `SELECT_BATTLECMD`, avant le Damage Step et sans retour de commande. Les attaques ordinaires suivantes possèdent leur propre frontière native et leur propre identifiant. Les replays conservent `nativeAttackId` et augmentent uniquement `replayCount`. Le retour du core à une commande après un replay refusé ou la disparition de l’attaquant arrête la projection ; il ne crée pas de dégâts ni d’« annulation d’effet » fictive.

Les frontières `NEW_PHASE` restent les frontières exactes du protocole. `SELECT_BATTLECMD`, `DAMAGE_STEP_START`, `BATTLE` et `DAMAGE_STEP_END` fournissent les états publics « Battle Step », « Damage Step » et « calcul des dommages ». `BATTLE` prouve que le core a calculé les statistiques ; il ne certifie pas que l’interface expose séparément toutes les cinq sous-étapes officielles du Damage Step. Une valeur de PV affichée, une différence de statistiques ou le nom d’une carte ne peut produire un gagnant.

Le cas Exodia simultané émet quatre `WIN` identiques et huit confirmations dans la file native. La projection émet une seule annonce `native-victory`, conserve tous les messages bruts et ne republie aucune identité privée. La reconnaissance d’une confirmation Exodia publique par la politique de l’adaptateur du jeu fait l’objet de l’intégration distincte du chantier TCG général ; ces fixtures de combat testent le résultat et la projection, avec la politique de confirmation par défaut.

L’[ancien traducteur archivé](artifacts/tcg-battle-before-2026-10-08.js.txt) provient exactement du commit `b8e216cd53ccc640366c91755268291afb1840d2`, SHA-256 `8b2f692bbf099a62c26244098dadfaa10842ce94d4cb0291d9a2e1e0c54af242`. Six comparaisons rejouent les mêmes messages natifs de replay et d’Exodia dans cette version : aucune phase publique, aucun identifiant de replay et aucune annonce native de victoire n’y étaient exposés. Ces comparaisons concernent la projection du protocole, et ne prétendent pas exécuter six anciens Duels distincts ni comparer toutes les statistiques des cartes.

## Sources et validation

Le [Rulebook officiel v10](https://www.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf), pages imprimées 32–43 et 50, décrit les résultats, phases, replays, restrictions de position, fin de tour et combats à 0 ATK. Le [diagramme officiel de timing des effets rapides](https://www.yugioh-card.com/en/play/fast-effect-timing/) complète les fenêtres de réponse. Les réponses HTTP et empreintes de ces références sont conservées dans le [registre de sources officielles partagé](artifacts/tcg-chain-official-sources-2026-10-08.json). La preuve d’exécution conserve également les scripts officiels de chaque effet utilisé.

Les [extraits du core](artifacts/tcg-battle-core-protocol-2026-10-08.json) sont reproduits par `scripts/audit-tcg-battle-source-protocol-2026-10-08.py` depuis l’archive source immuable, SHA-256 `eb2e32d213c58f23cb9efc3297abfce632d94dca40e4f388e0bb73fff26abc84`. Ils rendent vérifiables les déclarations d’attaque, le replay facultatif/obligatoire, les calculs à zéro, la première pioche et les raisons de victoire. Le WASM réellement exécuté mesure 935 745 octets, SHA-256 `0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026`.

La commande ciblée `node --test tests/tcg-battle-complete-2026-10-08.test.mjs test/native-duel-visual-events.test.js test/native-duel-visual-events-runtime.test.js test/public-field-combat-visuals.test.js` réussit : **90 tests, zéro échec, zéro abandon, zéro test ignoré**. Le nouveau fichier contient 56 preuves natives et neuf gardes de protocole ; les 25 tests de projection précédents restent valides. La commande du rapport est `node scripts/tcg-battle-complete-2026-10-08.mjs`.

Cette couverture ne certifie pas toutes les interactions possibles de toutes les cartes TCG, le fonctionnement des Decks de tournoi via ces fixtures, ni un parcours de navigateur compilé. Les preuves historiques de 406 scénarios Terrain restent intactes.
