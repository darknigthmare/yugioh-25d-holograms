# Terrains natifs — lot D, 8 octobre 2026

Ce lot exerce **38 Terrains dans 39 scénarios réellement exécutés contre le WASM**. Il conserve les données CDB, les scripts Lua archivés et le binaire du core. Les décisions utilisent exclusivement les réponses typées du protocole natif. Chaque scénario possède ses messages, réponses, requêtes natives, cartes de fixture et empreintes des scripts ; les duels sont séparés et fermés après chaque cas.

Commande reproductible : `node scripts/audit-native-field-batch-d.mjs`.

Le [rapport JSON](artifacts/native-field-batch-d-2026-10-08.json) archive les empreintes du module, du harness, de la façade, du décodeur, des archives CDB/Lua et du WASM. Les fixtures sont créées avant `start`, avec les modes MR5 et SEGOC. Aucun mode Debug/TestMode, script remplacé, carte modifiée ou ajout après le démarrage n'est utilisé. Il s'agit de fixtures de règles, pas d'une certification de listes de Deck de tournoi ni d'une vérification navigateur.

## Effets effectivement exercés

| ID | Terrain | Résultat natif vérifié | Branches restant non certifiées par ce lot |
| --- | --- | --- | --- |
| 15635751 | Camelot | Banish temporaire, pose de Round Table depuis le Deck, recherche de Gallatin, retour à la Standby suivante et envoi de Round Table par règle. | Remplacement de destruction, invocation d'Artorigus, autres sources et interférences. |
| 36742774 | Synchro World | MST adverse détruit le Terrain ; sa chaîne de destruction invoque Crimson Dragon depuis l'Extra Deck. | Pose de compteurs par Synchro et paiements de 4, 7 ou 10 compteurs. |
| 5063379 | Flavian | Défausse réelle par coût, recherche d'un Gladiator Beast et absence d'une deuxième ignition malgré un autre discard et une autre cible encore disponibles. | Invocation à l'attaque adverse, protection de combat, Set de Piège à la End Phase. |
| 2906939 | Ashtrashen | Cible face cachée, recherche d'une carte Ashtra, puis envoi de la cible encore cachée au GY par effet. | Plusieurs cibles/noms, cible devenue visible, renvoi après un nouvel événement Set. |
| 19162134 | Dueltaining | Soul Charge invoque simultanément cinq monstres de cinq Niveaux différents ; pioche exacte de deux cartes et coût de 5000 LP. | Cinq combats, chaîne de rang 5, dés/pièces et seuil de dommages. |
| 26534688 | Magellanica | Augmentation native de Niveau d'un WATER de 2 à 3, puis retour à 2 en fin de tour. | +2, ordre du Deck à l'activation, bannissement temporaire après Synchro WATER. |
| 7293697 | Toon World the Perfect World | Nom natif Toon World, recherche de Toon Briefcase, limite de la copie visible malgré une deuxième cible admissible encore au Deck. | Autres copies et limite partagée de trois, bannissement temporaire avant résolution. |
| 60884672 | Gold Golgonda | Défausse Springans par coût, invocation d'Exblowrer depuis l'Extra Deck et ATK de 1600 à 2600. | Interdiction d'attaque après départ d'un Xyz, interférences et autres partenaires. |
| 94243005 | Chaos Zone | Soul Release bannit deux monstres et une Magie ; exactement deux Chaos Counters, la Magie étant exclue. | Paiement des compteurs, invocation de monstre banni, recherche après départ adverse. |
| 14442329 | JJ “Kewl Tune” | Sacrifice d'un Tuner par coût, recherche Kewl Tune, Gilasaurus offert avant et interdit après la restriction aux Tuners. | Invocation au lieu d'ajout, Normal Summon supplémentaire et bonus Loudness War. |
| 93031067 | Plunder Patroll Shipyarrrd | Défausse par coût, recherche Plunder Patroll, ignition limitée malgré un autre discard et une autre cible admissible. | Bonus par cartes en S/T, retour depuis le GY et renvoi de sa cible. |
| 3055018 | Obsidim | Destruction du Terrain par MST, chaîne qui invoque Shaman of the Ashened City depuis le Deck. | Départ par bannissement, conversion en Pyro, recyclage et pioche à la End Phase. |
| 91880660 | Way Where There's a Will | Deux cartes excavées pour deux cartes adverses, un ajout puis placement de l'autre et d'une carte de main au bas du Deck. | Excavation de neuf cartes et mélange global à la End Phase. |
| 30761649 | Barian Untopia | Number 101 survit à Raigeki adverse ; Dark Magician, contrôle négatif, est détruit par effet. | Protection contre ciblage, autres séries admissibles, attachement après Rank-Up-Magic. |
| 22555834 | Stairway to a Fabled Realm | Envoi facultatif de Fabled Ashenveil depuis le Deck au GY par l'effet d'activation. | Défausse de deux et récupération, bonus en Damage Calculation. |
| 3129133 | Delta of Invitation | Envoi d'un Zombie de Niveau 7 par effet ; invocation d'un vrai Delta Token Zombie/DARK/Niveau 5 lorsque Zombie présent. | Retour du Terrain depuis le GY après récupération de monstre. |
| 80749819 | Call of the Forgotten | Trois Call of the Haunted posés, positions natives cachées et restriction d'invocation ; scénario supplémentaire avec vraie chaîne Haunted, envoi de Blue-Eyes adverse au GY et réanimation d'un Zombie. | Durée complète de la restriction, autres sources des Pièges, annulations/interférences. |
| 33700664 | Valvols | Cinq cartes bannies face cachée par coût, puis récupération d'une Trirealm Rift cachée. Identité native source 100458039 conservée. | Paiement mixte Deck/GY, verrou d'activation avec Deck vide et monstre de Niveau 5+. |
| 9547962 | Euler's Circuit | Bannissement du Terrain depuis le GY et défausse Tindangle par coût ; ajout d'une autre copie depuis le Deck. | Verrou d'attaque avec trois Tindangle et changement de contrôle en Standby. |
| 9597987 | Tenchi Kaimei | MST adverse détruit le Terrain de son propriétaire ; le trigger du GY réanime Ninja Grandmaster Sasuke face cachée en défense. | Destruction après dommages de combat, plusieurs Ninjas de noms distincts, départ par bannissement. |
| 269012 | Mound of the Bound Creator | Destruction réelle par MST ; le trigger ajoute un monstre DIVINE depuis le Deck. | Protections Niveau 10+, dommages de 1000 après destruction de combat. |
| 81788994 | Curse of the Shadow Prison | Envoi de Shaddoll par Foolish Burial : un Spellstone Counter ; Dark Magician adverse reste à 2500 au tour du propriétaire puis passe à 2400 au tour adverse. | Fusion avec matériau adverse contre trois compteurs, envois multiples et autres timings. |
| 22751868 | Karakuri Showdown Castle | Destruction du Terrain par MST, puis réanimation d'un Karakuri de Niveau 4 ciblé dans le GY. | Changement de position de la cible d'attaque et limites de Niveau. |
| 35815783 | Magikey World | Recherche de Clavkiys à l'activation ; ignition ajoute Maftea et replace Clavkiys du côté réel du Deck. | Protection de destruction des Normal non-Token et interférences pendant le replacement. |
| 56074358 | Morphtronic Map | Destruction du Terrain par MST ; trigger ciblé qui réanime Morphtronic Cameran depuis le GY. | Compteurs de changement de position, bonus ATK par compteur. |
| 56111151 | Kyoutou Waterfront | MST envoie le Piège adverse par effet puis lui-même par règle : deux cartes quittent le terrain pour le GY, donc deux Kaiju Counters. | Maximum de cinq, recherche avec trois, remplacement de destruction par paiement. |
| 44710391 | Earthbound Geoglyph | Monstre de Niveau 10 présent : Heavy Storm détruit le Piège adverse mais ne détruit pas Geoglyph. | Protection contre ciblage, double sacrifice Synchro, recherche après invocation Synchro. |
| 42461852 | Cynet Storm | Link Spider dans l'Extra Monster Zone pointe vers Dark Magician : ATK/DEF 3000/2600 ; Jerry non lié reste à 1750. | Non-annulation de Link Summon, excavation et invocation après 2000 dommages. |
| 32391631 | Savage Colosseum | End Phase réelle : Dark Magician n'ayant pas attaqué est détruit ; Jerry en défense survit. | Obligation d'attaque et gain de 300 LP après attaque. |
| 72043279 | Supreme King's Castle | Chaîne pendant le Damage Step : Evil HERO de Niveau 6 envoyé de l'Extra Deck par coût ; Fiend passe de 1600 à 2800, détruit Jerry, puis revient à 1600 à la fin du tour. | Dérogation de procédure Dark Fusion, autres partenaires et fenêtres de négation. |
| 4357063 | Chronomaly City Babylon | Bannissement d'un Chronomaly de Niveau 3 par coût et réanimation d'un autre Niveau 3 ; le Niveau 4 du GY reste exclu. | Cas avec élimination remplaçant le GY, indisponibilité de cible après activation. |
| 15854426 | Divine Wind of Mist Valley | Compulsory renvoie un WIND visible en main ; la chaîne du Terrain invoque un WIND Niveau 4 depuis le Deck. | Damage Step, autres conditions précédentes, deuxième événement du tour. |
| 67328336 | Meklord Fortress | Destruction du Terrain par MST ; trigger qui ajoute Meklord Emperor Wisel depuis le Deck. | Interdiction de ciblage par effets de Synchro et contrôles inverses. |
| 18890039 | Libromancer First Appearance | Recherche de Geek Boy avec Fire contrôlé ; le Fire de même nom dans le Deck est exclu de la vraie sélection. | Ritual Summon, surpaiement de Niveaux et autres sources de matériaux. |
| 53819808 | Temple of the Six | Normal Summon Samurai : un Bushido Counter et -100 ATK adverse ; Monster Reborn d'un autre Samurai : deux compteurs et -200 ATK. | Invocation simultanée de plusieurs Samurai et interactions d'immunité. |
| 53527835 | Dark City | Diamond Dude attaque Jerry : bonus de 1000 uniquement au calcul, destruction de Jerry, 650 dommages adverses ; ATK de Diamond Dude immédiatement revenue à 1400. | Attaque contre ATK inférieure, défense, cartes non Destiny HERO et autres timings. |
| 23424603 | Wasteland | Dinosaur des deux joueurs, Zombie et Rock gagnent 200 ATK/DEF ; Spellcaster inchangé. | Changements de race, immunités et effets concurrents. |
| 10080320 | Jurassic World | Dinosaur des deux joueurs gagnent 300 ATK/DEF ; Zombie, Rock et Spellcaster restent inchangés. | Changements de race, immunités et effets concurrents. |

## Défaut corrigé lors de l'exécution

Le scénario des trois Sets de Call of the Forgotten reproduisait une exception `eof` dans le décodeur `SHUFFLE_SET_CARD`, après trois réponses `SELECT_PLACE` pourtant acceptées par le core. Un seul Set passait ; deux ou trois échouaient. Le décodeur a été corrigé séparément à partir du protocole du core épinglé, sans changement du WASM, de la CDB ou des Lua.

Le scénario exige maintenant trois origines distinctes 0/1/2 et trois destinations masquées à zéro, telles que le core les émet pour le mélange de cartes cachées. Les requêtes ultérieures confirment trois Pièges présents face cachée. La restriction non-Zombie et la chaîne Haunted font également partie des résultats vérifiés.

**La couverture est celle des branches décrites dans le tableau.** Elle ne certifie pas toutes les interactions possibles des 38 cartes, ni les autres branches listées. Les cartes chargées directement sur le terrain avant le démarrage servent aux états initiaux ; elles ne sont pas comptées comme des invocations natives réalisées pendant le duel.

## Provenance du passage final du 8 octobre

Le CLI a été réexécuté après l'extraction du chargeur partagé [native-field-audit-inputs.mjs](../../scripts/native-field-audit-inputs.mjs) : **39/39 scénarios passent**  avec 1 809 messages  587 réponses  123 requêtes et 231 cartes de fixture. Aucun `RETRY` ni diagnostic Lua/core n'apparaît. Le corps des scénarios est conservé ; seules les métadonnées du rapport ont été complétées.

Le JSON conserve 23 dépendances avec leur taille et SHA-256 : module  inputs  harness  runtime  registre et deux gardes de correction  intégrité SHA-256  compatibilité Lua  lecteurs  wrapper et archives. Les empreintes de l'archive Lua  des données CDB et des banlists correspondent au manifeste amont ; le WASM correspond à son build. Pour chaque Lua de fixture  `scriptSha256`/`scriptBytes` désignent la source originale et `effectiveScriptSha256`/`effectiveScriptBytes` la source réellement fournie au core. Les listes `provenance.fixtureScripts` et `provenance.officialFieldScripts` rendent les deux sources explicites.

`modifiedScripts: false` reflète l’absence de correction enregistrée dans les scénarios de ce lot : les sources originales et effectives de ses fixtures sont identiques. Le lecteur central possède deux corrections sous garde SHA-256, documentées séparément ; aucune ne concerne une source effectivement utilisée ici. `upstreamArchiveBytesModified: false`, `modifiedCardData: false` et `testMode: false` restent distincts de cette propriété.
