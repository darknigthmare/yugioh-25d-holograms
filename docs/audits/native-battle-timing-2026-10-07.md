# Combats et fenêtres natives — 7 octobre 2026

Les **21 scénarios officiels** de [native-duel-battle-timing.test.mjs](../../tests/native-duel-battle-timing.test.mjs) passent avec le core et les Lua effectivement livrés. Ils contrôlent les LP, zones, coûts, cibles, décisions et événements publics de la façade. Une erreur de sélection dans la façade et une erreur de présentation des révélations ont été reproduites puis corrigées.

Les [résultats structurés](artifacts/native-battle-timing-2026-10-07.json) conservent, pour chaque cas, les LP finaux, cartes publiques et zones, comptes des messages natifs, familles de décisions, statistiques exactes de calcul et animations publiques. Ils ne conservent pas de UID privé, de code de carte piochée ni d’identité de défenseur encore caché.

## Méthode et sources réellement utilisées

Chaque test déclare ses zones avec l’API native ordinaire avant `Start`, puis joue à travers `NativeDuelGame`. Il charge le CDB et les scripts archivés, les lecteurs du runtime et le WASM local. Aucun script de carte simplifié, API Debug, `TEST_MODE`, `PSEUDO_SHUFFLE` ou ajout de carte après le démarrage n’intervient.

Le mode est TCG MR5, avec SEGOC non public et premier déclencheur ; son masque réel est `12885092352`. Le camp autonome commence : son premier tour n’a pas de Battle Phase, puis le joueur peut attaquer au deuxième tour. Toutes les réponses humaines sont validées contre le prompt courant ; les cibles et quantités sont celles émises par le core. Le camp autonome suit également les commandes et choix natifs proposés.

Les fixtures déclarent un petit Deck initial, zéro pioche automatique et des cartes de main/terrain préparées. La validation des tailles de Deck est explicitement remplacée pour ces tests isolés. Cela ne constitue pas une validation de Deck de tournoi. Les invocations ayant placé les monstres initiaux ne sont pas rejouées ici ; la [suite des 20 procédures](../../tests/native-duel-summoning.test.mjs) vérifie séparément Fusion, Rituel, Synchro, Xyz, Lien, Pendule et Flip. Le scénario Solemn Strike de ce lot réalise néanmoins une vraie procédure Xyz avant son combat.

Le core reste la révision officielle EDOPro `38d04c9feb1a26617407091380634c87262fe3f8`, ABI 11.0. L’archive produite par le test contient les empreintes du wrapper, de la façade, du CDB et de chaque Lua utilisé. L’absence de Lua d’un Monstre Normal est indiquée par `sha256: null` ; ses caractéristiques proviennent du CDB.

| Ressource inchangée | SHA-256 |
| --- | --- |
| WASM local | `0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026` |
| CDB sérialisé, `card-data.json` | `4d663cc458934cff2b944204f641838f03803bffac3d12106082171d9dee5d8d` |
| Archive Lua, `scripts.json` | `a4f1769decc033e95e7033df8475c6cf7b9efa110fe2a662963c22913566b45f` |
| Wrapper local, `index.js` | `0b46ae83e05a0b6d4ebf85e4422c6f64bea0a5613ea3c649b6eee50d275bc919` |

## Comportements exercés

Les LP sont présentés dans l’ordre joueur / adversaire. Les différences numériques ci-dessous sont les résultats du core, jamais un calcul appliqué par la façade.

| Scénario et cartes officielles | Résultat natif vérifié |
| --- | --- |
| 1. Blue-Eyes White Dragon, attaque directe | 8000 / 5000 ; une seule attaque offerte, deuxième commande refusée. |
| 2. Blue-Eyes contre La Jinn en Attaque | 8000 / 6800 ; seul La Jinn est détruit. |
| 3. La Jinn contre Dark Magician en Défense | 7700 / 8000 ; aucun monstre détruit, dégâts au joueur attaquant. |
| 4. Deux La Jinn, ATK identiques | 8000 / 8000 ; les deux monstres sont détruits, aucun message de dégâts. |
| 5. Blue-Eyes contre Mystical Elf face verso | Révélation native pendant le Damage Step, destruction sans dégâts perçants ; aucun Flip Summon. |
| 6. Spear Dragon contre La Jinn en Défense | 8000 / 7100 ; dégâts perçants de 900, puis Spear Dragon passe en Défense. |
| 7. Blue-Eyes Chaos MAX contre La Jinn en Défense | 8000 / 2000 ; double dégâts perçants de 6000, ATK de calcul exactement 4000. |
| 8. Amazoness Swords Woman contre Blue-Eyes | 8000 / 6500 ; dégâts redirigés vers l’adversaire et Amazoness détruite. |
| 9. Waboku pendant l’attaque de Blue-Eyes | LP et La Jinn préservés ; attaque déclarée et calcul de combat conservés, aucune annulation d’attaque. |
| 10. Negate Attack contre une attaque directe | `ATTACK_DISABLED` natif, fin de Battle Phase, aucun début de Damage Step ni dégât. |
| 11. Scapegoat répond à une attaque directe | Replay natif vers un Jeton nouvellement invoqué ; deux messages `ATTACK`, trois Jetons restants et aucun dégât. |
| 12. Compulsory retire La Jinn ciblé | Replay natif de l’attaque de Blue-Eyes en attaque directe ; joueur à 5000 LP. Le retour en main ne publie pas de carte privée. |
| 13. Book of Moon retourne La Jinn ciblé | Une seule déclaration d’attaque ; passage face verso puis révélation de combat, destruction sans dégâts ni Flip Summon. |
| 14. Honest pendant le Damage Step | ATK de calcul exactement 7500, dégâts de 3000 ; bonus conservé jusqu’à la End Phase puis ATK natif revenu à 3000. |
| 15. Kuriboh pendant le calcul des dégâts | Défausse réelle, dégâts nuls ; aucune annulation d’attaque ni message `ATTACK_DISABLED`. |
| 16. Compulsory retire le propre attaquant | Choix d’effet indépendant de la cible d’attaque ; Blue-Eyes retourne en main, combat arrêté sans replay ni dégât. |
| 17. Enemy Controller prend l’attaquant | La Jinn payé comme coût, Blue-Eyes change réellement de contrôleur ; combat arrêté sans annulation, contrôle rendu à la End Phase. |
| 18. Solemn Strike contre l’effet d’Utopia | Vraie Invocation Xyz, matériel détaché et coût de 1500 LP conservés ; `CHAIN_NEGATED`, Utopia détruite, aucune annulation d’attaque. |
| 19. Cyber Twin Dragon | Deux attaques offertes, deux dégâts de 2800 ; troisième attaque refusée par la liste native. |
| 20. Airknight Parshath | Dégâts perçants de 900 puis une vraie pioche ; animation sans carte, code ou UID de la pioche. |
| 21. Self-Destruct Button | Deux LP à zéro, résultat natif final « draw », une seule notification de fin et aucune action ultérieure. |

Self-Destruct Button émet deux messages `WIN` dans le même traitement : le premier accompagne la première mise à zéro, le dernier annonce le match nul. La façade termine avec ce dernier résultat et notifie une fois. Ce test n’infère pas le vainqueur depuis les LP. Le statut de traitement bas niveau n’est pas assimilé au résultat de duel ; les commandes de la façade sont terminées par les messages natifs reçus.

## Correction de l’intention d’attaque : comparaison réelle

Le scénario 16 a d’abord échoué avec le fichier de façade du commit `2bc79f1`. Blue-Eyes attaquait La Jinn adverse ; le joueur activait Compulsory Evacuation Device et voulait choisir son propre Blue-Eyes. L’intention de cible de l’attaque restait active et répondait silencieusement au `SELECT_CARD` du Piège. Le choix d’effet du joueur n’était donc jamais demandé.

La [preuve avant correction](artifacts/native-battle-target-intent-before-2026-10-07.json) a été produite en exécutant une copie exacte de cette ancienne façade avec les mêmes CDB, Lua et core. Seuls ses imports ont été convertis en chemins absolus pour l’isoler ; aucun module courant ni effet natif n’a été remplacé. L’empreinte de ses octets Git originaux est `3026c4a9cb0008e23fb2e647228b57cbd5372b04c919fc12ea5b03bdcade6f32`.

| Observation réelle | Avant, façade `2bc79f1` | Après, scénario 16 |
| --- | --- | --- |
| Callback du choix d’effet | 0 ; ancienne cible sélectionnée silencieusement | Choix explicite du propre Blue-Eyes parmi les cibles natives |
| Carte renvoyée en main | La Jinn adverse | Blue-Eyes du joueur |
| Monstre restant sur le terrain | Blue-Eyes du joueur | La Jinn adverse |
| Messages `ATTACK` | 2 : cible initiale, puis attaque directe | 1 : déclaration initiale puis retrait de l’attaquant |
| Dégâts natifs | 3000 à l’adversaire | Aucun |
| LP finaux | 8000 / 5000 | 8000 / 8000 |

La modification de [NativeDuelGame.js](../../src/core/native/NativeDuelGame.js) consomme seulement l’intention de cible au message natif `ATTACK`, quand sa déclaration est confirmée. Les cibles des effets et des replays deviennent alors des décisions indépendantes. Elle ne modifie ni les règles de replay, ni les cibles légales, ni les dégâts.

## Révélation publique et Invocation Flip

Le scénario 5 a confirmé un second écart : le core émettait `POS_CHANGE` pour révéler Mystical Elf durant le combat, sans `FLIPSUMMONED`, alors que le traducteur publiait une animation `flip-summon`. Book of Moon reproduisait la même fausse qualification au moment de la révélation de La Jinn.

Le correctif de présentation coordonné dans `NativeDuelVisualEvents` publie maintenant `toggle-position` avec `publicReveal: true`. Le profil `card-reveal` présente cette révélation sans confirmation d’invocation. Les tests 5 et 13 refusent tout `flip-summon` dans ces transitions ; le véritable Flip confirmé demeure couvert par la suite d’Invocation. Les changements de position d’un Piège posé lors de son activation sont également distingués des changements du monstre.

## Validation et limites

Commande reproductible : `node tests/native-duel-battle-timing.test.mjs`. Résultat final : **21 réussites, zéro échec**, aucun message `RETRY`, aucune erreur native ou Lua. Chaque cas vérifie les flags réellement injectés. Les régressions de la façade et des procédures d’Invocation sont relancées après cette correction.

Ces preuves portent sur les scénarios déclarés et leurs prompts effectifs. Elles ne certifient pas toutes les branches des scripts du catalogue, les multiples attaques alternatives de chaque archétype, tous les niveaux de priorité ou toutes les combinaisons de Damage Step. Les animations vérifiées sont les événements publics produits par la façade ; une capture du rendu navigateur final reste une preuve distincte.
