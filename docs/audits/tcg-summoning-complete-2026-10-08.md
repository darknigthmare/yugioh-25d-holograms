# Invocations TCG : procédures, restrictions et historique natif

Le runtime isolé choisit désormais le même profil TCG que le jeu : `MODE_MR5 | TCG_SEGOC_NONPUBLIC | TCG_SEGOC_FIRSTTRIGGER`. Avant cette correction, le runtime directement créé sans `flags` choisissait seulement `MODE_MR5`. La façade navigateur possédait déjà les deux options TCG ; elle partage maintenant leur définition dans [NativeTCGRuleProfile.js](../../src/core/native/NativeTCGRuleProfile.js). Un profil explicitement fourni, par exemple MR4, reste transmis tel quel.

La décision d'autoriser une Invocation, ses matériels, ses zones et sa réanimation appartient au cœur WASM et aux scripts officiels. Aucun moteur de règles JavaScript supplémentaire n'a été introduit. Les actions de la façade répondent aux vrais choix offerts par ce cœur.

Les références officielles consultées le 8 octobre 2026 sont le [livret TCG version 10](https://img.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf), pages imprimées 12–25 et 49, et la [mise à jour TCG de 2021](https://www.yugioh-card.com/en/play/2021_rules_update/), accessible depuis la [page actuelle du livret](https://www.yugioh-card.com/en/rulebook/). Le livret présente les procédures, les matériels, les Sacrifices et les restrictions de réanimation. La mise à jour complète les règles de placement Fusion/Synchro/Xyz : elles peuvent utiliser une Zone Monstre Main libre ; les restrictions des Liens et Pendules face recto de l'Extra Deck persistent.

## Preuves réelles

Le [rapport actuel](artifacts/tcg-summoning-complete-2026-10-08.json) contient **70 scénarios natifs**, soit **35 cas exécutés séparément pour les contrôleurs 0 et 1**. Chaque décision et commande contient la réponse typée et le prompt réellement émis. Aucun `Debug`, `TEST_MODE`, `PSEUDO_SHUFFLE`, remplacement de Lua de scénario ou injection après `start()` n'est utilisé. Tous les cas terminent sans `RETRY` ni erreur Lua.

Deux replays supplémentaires exécutent le [runtime antérieur archivé](artifacts/tcg-summoning-complete-2026-10-08/NativeDuelRuntime-before.js.txt), extrait du commit `b8e216cd53ccc640366c91755268291afb1840d2`. Ils confirment les drapeaux transmis à `createDuel` : `190464` avant et `12885092352` après. L'Invocation Normale et son compteur restent identiques dans ces deux comparaisons. Ce résultat prouve la correction du profil par défaut ; il ne prétend pas mesurer à lui seul tous les effets SEGOC.

| Famille du livret | Vérifications nouvelles dans le cœur | Preuves déjà conservées |
| --- | --- | --- |
| Invocation Normale / Pose | Compteur partagé, une seule opération ordinaire, champ Main plein, refus sans Sacrifice ; Double Summon accorde exactement une opération supplémentaire | [Tests existants](../../tests/native-duel-summoning.test.mjs) |
| Sacrifice / Pose Sacrifice | Niveaux 5 et 6 : un matériel ; niveau 8 : deux ; propre monstre face verso admis ; cartes consommées et destination vérifiées | Soul Exchange, Sacrifice adverse public et confidentialité d'un monstre posé |
| Invocation Flip / position | Refus le tour de la Pose, autorisation au tour suivant, face recto Attaque, deuxième changement de position refusé | Invocation Flip native et événement public confirmé |
| Fusion | Trois Dragon Blanc face verso contrôlés utilisés par Polymerization ; mauvais matériels refusés ; première Invocation en Main avec les deux zones Extra occupées | Fusion dans un champ Main initialement plein, bonne réanimation d'un Fusion |
| Rituel | Invocation effective par Black Luster Ritual, Sacrifice de niveau natif, destruction puis réanimation du Soldat correctement invoqué | Sélection `SELECT_SUM` et refus de niveaux insuffisants |
| Synchro | Tuner + non-Tuner avec somme exacte, mauvais niveau ou Tuner posé refusé ; Jetons non-Tuner admis ; destination Main MR5 et historique de réanimation | Stardust, annulation des matériels, restriction Vanity's Fiend |
| Xyz | Matériels face recto, face verso refusé ; Rang et valeur Lien ne deviennent pas des Niveaux ; Jetons refusés ; MR5 Main ; réanimation sans matériels attachés | Deux matériels réels sous Utopia, détachement et projection du Rang |
| Lien | Flèche de Link Spider permettant une deuxième Invocation en Main ; Lien-2 compté comme 2 ou comme 1 ; conditions de type vérifiées ; ni Défense ni Book of Moon | Zone Extra partagée, mauvais matériel posé refusé, zone occupée, Invocation annulée par Solemn Judgment |
| Pendule | Niveaux strictement entre les Échelles, Échelles égales refusées ; compteur d'une fois par tour ; destination Extra face recto des monstres et Échelles détruits ; restriction d'historique d'un Xyz/Pendule | Main + Extra face recto dans une vraie Invocation Pendule et zones MR5, deux zones Extra occupées, échelles gauche/droite distinctes |
| Invocation par effet / réanimation | Rituel, Synchro, Xyz et Lien correctement invoqués puis détruits admis par Reborn dans une zone Main ; toutes ces familles et Fusion improprement invoquées refusées | Fusion correctement invoqué réanimé, annulation de Reborn par Necrovalley |
| Jetons | Quatre Jetons issus du vrai Scapegoat ; Xyz refusé ; après sa restriction du tour, Link Spider et Junk Warrior consomment les matériels permis ; aucun Jeton envoyé au Cimetière | Créations natives de Jetons liées aux effets de Terrains |

Une carte Pendule ordinaire envoyée de la main au Cimetière ne devient pas une carte exigeant une première Invocation spéciale correcte : le cas Odd-Eyes Pendulum Dragon vérifie sa réanimation autorisée. La restriction du Xyz/Pendule concerne son historique d'Invocation Xyz ; la façade n'applique donc pas une interdiction générale incorrecte aux Pendules.

Le lecteur de scripts est également utilisé pendant l'initialisation par la politique de révélation publique. Les empreintes enregistrent ces accès de vérification, dont l'ancien correctif gardé de Duel Tower : original `43d4454f…` et effectif `32bfc7a6…`. Aucun scénario de ce rapport ne contient cette carte. Les scripts des cartes jouées et les procédures d'Invocation sont inchangés ; les archives publiques Lua, le WASM et les données de cartes sont conservés.

Les **406 scénarios Terrains antérieurs restent byte-identiques**, avec SHA-256 `420219317a89ab1dc1c7dbd8d766c8e042d972e58176a0d2d4ba2c366ecaa3ac`. Ils ne sont ni recomptés parmi les 70 nouveaux cas, ni remplacés par ce rapport.

## Validation et limites

Commande ciblée : `node --test tests/tcg-summoning-complete.test.mjs tests/native-tcg-rule-profile.test.mjs tests/native-duel-runtime.test.js tests/native-duel-summoning.test.mjs`. Les [99 tests ciblés](artifacts/tcg-summoning-complete-2026-10-08/targeted-tests.txt) passent : 70 nouveaux cas WASM, deux contrôles de transmission du profil, sept contrats du runtime et vingt tests d'Invocation déjà présents. Le [script du rapport](../../scripts/audit-tcg-summoning-complete.mjs) exécute en supplément les deux duels avant/après décrits ci-dessus.

Les fixtures sont des positions de milieu de Duel déclarées avant le démarrage, avec tirages désactivés et petits Decks de support. Chaque contrôleur a au plus trois exemplaires d'un même identifiant dans les cartes de fixture. Il ne s'agit pas de Decks certifiés pour un tournoi ni de parcours navigateur. Les tests couvrent les familles générales d'Invocation et leurs contre-exemples précis ; ils ne constituent pas une certification exhaustive de chaque interaction de toutes les cartes TCG. Le build, le contrôle global et les captures visuelles sont consignés dans le gate de livraison du parent.
