# Revue indépendante de la nouvelle vague native — 8 octobre 2026

La revue a exécuté indépendamment les douze branches A et les sept cas de présentation publique. **23 tests ciblés passent**, sans `RETRY` ni erreur Lua. Les branches A utilisent les vraies Invocations, matériels, Sacrifices, destructions, paiements et décisions du core ; les assertions observées correspondent aux branches annoncées. Aucun résultat de duel fabriqué n'a été trouvé.

Les [preuves A](artifacts/native-field-branch-wave-a-2026-10-08.json) et [F](artifacts/native-field-branch-wave-f-2026-10-08.json) restent distinctes des [cas de présentation publique](artifacts/native-public-presentation-wave-2026-10-08.json). Les modules de branches restent gelés, sauf les mises à jour de provenance explicitement demandées après gel des dépendances communes.

## Contrôles indépendants de présentation

| Contrôle | Observation sur le vrai core |
| --- | --- |
| Succès d'une réanimation | Le mouvement depuis le Cimetière et la déclaration précèdent `SPSUMMONED` ; aucune animation réussie n'est produite avant cette confirmation. Une origine expirée ne qualifie pas une Invocation ultérieure indépendante. |
| Négation par Necrovalley | Le core conserve la cible au Cimetière et ne produit aucune réussite d'Invocation/réanimation. |
| Creature Swap | Les contrôleurs et statistiques sont relus aux vraies destinations. Une sonde mixte face recto/face verso garde le monstre face verso anonyme : aucune lookup de son identité et aucune query de ses statistiques ; le Dragon Blanc public conserve 3000 ATK à sa nouvelle destination. |
| Renumérotation du Cimetière | Le retrait réel par Monster Reborn invalide les anciennes identités de pile. La carte suivante atteint la séquence 0 et fournit ses statistiques correctes. |
| Renumérotation du bannissement | Soul Release puis D.D.R. retirent réellement le premier banni. La Jinn (`97590747`) devient la séquence 0 avec 1800 ATK, sans ancien code conservé pour ce slot. |
| Renumérotation de l'Extra Deck | Dark Hole crée de vraies cartes Pendule face recto dans l'Extra Deck. Harmonia récupère Dreamia ; Cutia fournit encore son vrai ATK 100 après renumérotation. La Fusion face verso non révélée ne déclenche aucune lookup ni query de statistiques. |
| Alias de Pseudo Space | Après copie de Wetlands, `QUERY_CODE` reste `77584012`, `QUERY_ALIAS` devient `2084239`, et le payload public garde l'identité physique avec son nom courant. L'alias revient à Pseudo Space à l'End Phase. |
| Inspection privée avec Spellbook Organization | Les deux contrôleurs utilisent un vrai `SORT_CARD`, sans révélation publique. Les identités privées du prompt ne passent pas au traducteur public. |
| Masque de queries de Game | Le masque demandé par le traducteur est transmis au WASM. Les flags de cible, équipement et identités des Matériels ne sont pas ajoutés par le défaut de Game. |

Les sondes supplémentaires ont été exécutées depuis `/tmp`, avec fixtures avant démarrage et sources officielles intactes. Elles complètent la lecture indépendante des modules sans modifier les lots A/F ou les sept cas de comparaison de présentation.

## Faille identifiée et correctif borné

La revue a trouvé une fuite réelle dans `CONFIRM_CARDS` : Smartfon en Défense inspecte son propre Deck, mais les noms étaient émis comme révélations publiques pour les deux projections. Diabolos prouve également le cas d'une inspection du Deck adverse : une simple comparaison au propriétaire aurait été insuffisante.

Le [correctif de confidentialité et sa preuve](native-confirmation-privacy-2026-10-08.md) limitent désormais les confirmations privées au destinataire natif. Ils conservent un événement `inspect` groupé sans log de nom, cache public ou query de statistiques. Les révélations publiques explicitement autorisées et les excavations publiques restent distinctes. **10 scénarios natifs et 13 tests dédiés passent.**

Après ce correctif, les cinq suites ciblées A, F, présentation publique, confidentialité et correction Duel Tower ont passé ensemble : **62/62 tests**, sans échec ni test ignoré. Cette validation précède le dernier ajout d'assertions des groupes d'inspection, lui-même vérifié par les 13 tests de confidentialité.

L'intégration UI locale gelée de `PrivateCardInspection.js` vérifie le destinataire natif et le groupe avant de lire `event.card`, demander son illustration ou créer son panneau. `main.js` consomme les événements `inspect` avant le tracker de campagne et les renderers publics. Six cartes réellement confirmées par Smartfon forment un seul groupe ; la fermeture, Échap, un groupe suivant, un nouveau duel et la fin du duel retirent les données locales. La description imprimée est enrichie depuis la CDB après autorisation, sans query du duel. Le rendu public retourne `null` pour cet événement.

Le test historique de `CONFIRM_CARDS` a été adapté à ce contrat : la révélation publique exige une politique explicite vraie ; une politique fausse conserve l'inspection privée du destinataire ; l'autre projection ne lit aucune identité. La suite historique et les treize tests de confidentialité passent ensemble : **33/33**, sans modification supplémentaire du code applicatif.

## Revue des modèles, Terrains, effets et choix

La lecture indépendante a porté sur les nouvelles anatomies, leurs matériaux et leur fusion, les trois factories de détails de Terrain, les profils d'attaque, le manager de scène, le modèle des emplacements natifs et le routeur UI privé. Les sept suites ciblées modèles/Terrains/effets/annulation/inspection/confidentialité/F passent ensemble : **56/56**, sans échec ni test ignoré. Aucun autre défaut critique n'a été identifié dans ce périmètre.

| Périmètre | Contrôle indépendant et portée |
| --- | --- |
| Trois modèles | Les trois captures trois-quarts en action ont été ouvertes avec leurs références et anciennes silhouettes. La Jinn possède sa musculature verte, ses bijoux et sa volute ; Mystical Elf sa coiffe, ses mains jointes et ses cheveux ; Beaver Warrior son museau, ses incisives, sa lame et son bouclier. Les surfaces restent facettées et stylisées. La continuation de la robe de l'Elf demeure une extrapolation déclarée. Le catalogue compte 25 profils spécifiques. |
| Trois Terrains | Les trois planches de comparaison ont été ouvertes, soit neuf vues finales front/gauche/droite. Les 307 composants ajoutent des figures réellement volumétriques, en périphérie du corridor jouable. Les notes, roses et chérubin de Chorus, les véhicules et le visage de Chicken Game, et les trois faces de Palabyrinth sont visibles. Leurs proportions, matières et architecture restent adaptées ; ces captures ne prouvent pas un espace intégral 1:1. |
| Effets publics | Les deux galeries 390/1280 ont été ouvertes. Les quatre attaques ont des silhouettes distinctes ; destruction, annulation et réanimation correspondent à leurs descriptions publiques natives. Les identités cachées sont rejetées avant l'accès au passcode. Les ressources instanciées partagent la durée et la libération de l'effet existant. La galerie isolée ne certifie pas à elle seule l'intégration du bundle final. |
| Attaque annulée | Le manager annule seulement les effets d'attaque correspondant au contrôleur, au type et au numéro de zone validés, après `nativeAttackNegated: true`. Une négation de chaîne ne retire pas une attaque. Le nettoyage fonctionne même avec mouvement réduit ou document caché, en conservant une pose appartenant à un effet ultérieur distinct. |
| Choix natifs | Les libellés reposent exclusivement sur les références du prompt : les indices de réponse restent inchangés, les EMZ adverses sont inversées, les matériaux Xyz utilisent `overlay_sequence`, et aucun ordinal du Deck ou de Main adverse n'est publié. |

Les [preuves modèles](artifacts/model-wave-2026-10-08/measurements.json), [Terrains](artifacts/field-detail-wave-2026-10-08/report.json), [effets](artifacts/effects-wave-2026-10-08/render-comparison.json) et [choix](artifacts/native-gameplay-choice-locations-2026-10-08.json) ont été rapprochées de leurs fichiers courants : respectivement 13, 18, 7 et 27 empreintes de dépendances concordent. Les 19 empreintes du central natif et les 25 du lot F concordent également, y compris `NativeDuelPresentationModel.js`. Les preuves F et confidentialité ont été régénérées après gel des dépendances C/E : **12/12 et 10/10 scénarios natifs passent**.

Une comparaison indépendante des objets JSON complets a retrouvé les **353 scénarios historiques strictement identiques** dans les 377 cas courants, ainsi que les 339 lignes de matrice inchangées. Les deux fichiers d'entrée de la [preuve de préservation](artifacts/native-field-wave-preservation-2026-10-08.json) concordent également en taille et SHA-256. Cette comparaison en lecture seule ne réexécute pas ces 377 Duels ; elle vérifie la conservation des résultats archivés et l'ajout séparé des 24 branches.

## Vérification du build et des parcours navigateur

Le [contrôle local complet](artifacts/native-wave-checks-2026-10-08.json) consigne **134 fichiers de tests réussis**, zéro échec/ignoré, les 339 illustrations/replis, un build de **108 modules** et zéro vulnérabilité rapportée par l'audit de sécurité. Cette revue n'a pas relancé le build global ; elle a vérifié les tailles et SHA-256 des sept fichiers compilés annoncés et du WASM original. L'entrée compilée est `assets/index-BAjs-Biw.js`, SHA-256 `ab8aece9cffe26026f69778ff4ddf9bba6a0bfc7abbe67435c725df23eed96b7`.

Les [choix dans le build compilé](artifacts/native-choice-locations-ui-compiled-2026-10-08/report.json) passent à 1440 × 900 et 390 × 844. Les six captures ont été ouvertes : les copies de Main/Cimetière restent lisibles, la sélection au clavier est visible et Monster Reborn invoque la copie choisie. Les 17 corps HTTP compilés sont identiques aux snapshots avant/après et aux fichiers `dist` ; les dix dépendances source concordent. Les confirmations mesurent 44 px. La preuve vérifie la CSP de production et l'absence de hook QA, sans prétendre exercer toutes les zones et cibles adverses dans le navigateur.

Le [panneau privé isolé](artifacts/private-card-inspection-ui-2026-10-08/report.json) passe à 1280 × 900 et 390 × 844. Ses quatre captures ont été ouvertes ; six confirmations natives archivées restent dans un seul panneau nonmodal, utilisable au clavier et défilable sur mobile. Trois illustrations locales sont disponibles et trois cartes emploient le repli neutre déclaré. Les 18 dépendances, les quatre captures et la trace native source concordent en SHA-256. Ce test de module ne crée pas un nouveau Duel et ne constitue pas une preuve de Smartfon joué dans l'application compilée.

Le [parcours natif compilé de la vague](artifacts/native-wave-ui-2026-10-08/report.json) passe à 1280 × 900 et 390 × 844. Ses **24 captures ont été ouvertes** : trois vrais monstres sont visibles, Beaver Warrior revient du Cimetière après Monster Reborn et Negate Attack conserve la Sphère sur le Terrain sans perte de LP. Les cinq caméras et les cycles Compact → Arène → Réelle conservent identités, statistiques et canvas. Les 17 réponses HTTP, 16 dépendances source, 24 empreintes PNG et le driver concordent ; les corps et le build restent identiques avant/après. La CSP est strictement identique à `vercel.json`, le hook QA est absent et aucun diagnostic navigateur ou échec d'asset natif n'est rapporté.

Les prises `native-revival-motion` et `native-attack-negated-motion` montrent les états réellement réussis/annulés ; cette revue n'y distingue pas les glyphes ankh/sceau cassé transitoires ni les pixels du projectile. Leur visibilité animée dans le Duel compilé reste donc non certifiée, conformément aux trois flags faux du rapport consolidé. Les primitives sont démontrées par la galerie de modules ; le retrait des attaques annulées est démontré par les tests du manager. Sur mobile, les plateaux Compact/Arène demandent le glissement indiqué ; la caméra Console rapproche certains libellés des commandes. Ces captures ne certifient pas une lisibilité intégrale de toutes les zones sous chaque angle.

## Porte de sortie de cette revue

**Avis indépendant favorable pour la publication draft prévue**, dans le périmètre déclaré. Le manifeste provisoire revu, SHA-256 `9764965ad01e076b248e56cffb923242033a3a3eb3eaf21c4e654a12864121ad`, contient **214 fichiers et 50 323 746 octets**. Chaque chemin est relatif et régulier ; chaque taille, SHA-256 et identifiant de blob Git correspond à ses octets. Aucun fichier de credentials, lien symbolique, clé privée ou motif de credential n'a été identifié parmi ces sources, preuves synthétiques et captures publiques. Les **239 liens locaux** des documents du manifeste existent et sont suivis ou prévus pour publication. La référence locale `251fec0197ed85e40bca2af03e4431db1fef11e5` et son arbre `576b0de96ece47ae4373f0670b436f3ed1fc4875` concordent.

Le lien de journal de tests des effets, initialement ignoré par Git, a été corrigé vers une copie publique `.txt` byte-identique. Le [rapport consolidé](artifacts/native-wave-2026-10-08.json) distingue les quinze preuves, le module UI isolé, les deux parcours compilés et les limites graphiques. Cette revue constitue la dernière mutation documentaire connue : le responsable régénère le manifeste final en ajoutant son empreinte, sans nouveau changement applicatif. Aucun résultat de CI, commit distant ou déploiement non observé n'est annoncé ici.

Cette revue ne revendique pas toutes les branches de règles, toutes les interfaces ni une fidélité graphique 3D 1:1. Aucun build global, commit ou publication n'a été lancé dans ce chantier de revue.
