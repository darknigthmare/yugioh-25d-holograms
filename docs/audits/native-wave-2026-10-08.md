# Règles, gameplay et détails graphiques — 8 octobre 2026

Cette vague porte la matrice à **377 scénarios sur les 339 Terrains**, ajoute **trois modèles dédiés**, enrichit **trois reconstructions de Terrain** et remplace sept motifs graphiques par des formes adaptées aux attaques ou aux effets. Les résultats du Duel restent ceux du moteur natif.

La [livraison précédente](native-completion-2026-10-08.md), ses 353 scénarios et ses captures restent archivés. Les nouvelles preuves utilisent leurs propres fichiers. La publication prolonge la PR draft #2 ; elle ne fusionne pas `master` et ne promeut pas la production.

## Règles et présentation native

Les lots [A](native-field-branch-wave-a-2026-10-08.md) et [F](native-field-branch-wave-f-2026-10-08.md) ajoutent **24 scénarios pour 13 Terrains** : capacités supplémentaires, coûts, limites, zones pleines, remplacements, protections, annulations, retours et resets. La [matrice courante](artifacts/native-field-runtime-wave-2026-10-08.json) conserve les 353 scénarios historiques et leurs messages, décisions, queries, fixtures et graines. Le [relevé géométrie/règles](artifacts/field-coverage-wave-2026-10-08.json) demeure à 339 illustrations exactes et 339 reconstructions dédiées.

Les [choix de cartes](gameplay-wave-c-2026-10-08.md) distinguent les exemplaires identiques par emplacement, contrôleur et position. Les indices envoyés au core restent inchangés. Les libellés de choix ne donnent pas l'ordre du Deck ni celui de la main adverse.

La [projection publique](native-public-presentation-wave-2026-10-08.md) exerce sept cas avec le vrai core : résurrection depuis les deux contrôleurs, annulation sous Necrovalley, changement de contrôle, carte retournée face verso, renumérotation du Cimetière et Invocation depuis la main. Une réanimation exige un déplacement natif depuis le Cimetière, suivi d'une Invocation Spéciale réellement réussie. Les requêtes statistiques respectent le masque public demandé ; aucune animation ne décide de la réussite d'un effet.

La [preuve d'audience](artifacts/native-confirmation-privacy-2026-10-08.json) exerce **dix cas natifs**, notamment Smartfon inspectant son Deck et Diabolos inspectant le Deck adverse, pour les deux contrôleurs. Le message désigne son destinataire ; l'interface n'en déduit pas une révélation publique. Les autres spectateurs n'accèdent pas aux métadonnées. Le [panneau local et l'arrêt des attaques annulées](native-presentation-corrections-2026-10-08.md) gardent ces informations hors des caches, logs, campagne et visuels publics. Les projectiles et poses de l'attaque annulée sont libérés avant impact, sans supprimer les effets voisins.

## Graphismes

Les [modèles de La Jinn, Mystical Elf et Beaver Warrior](model-wave-2026-10-08.md) portent les profils dédiés à **25**, avec **17 familles de repli**. Dix-huit comparaisons source/ancien/nouveau contrôlent trois angles au repos et en pose. Les volumes reprennent les silhouettes et motifs visibles des références locales exactes ; les parties invisibles et profondeurs restent interprétées.

Les [détails de Chicken Game, Chorus of Sanctuary et Archfiend Palabyrinth](field-detail-wave-2026-10-08.md) ajoutent personnages et visages sculptés, ailes, couronne, marques, structures et accessoires. Dix-huit captures et trois planches conservent caméra et éclairage avant/après. Les coûts mesurés du décor complet passent respectivement à 10, 8 et 9 appels WebGL ; les ressources sont libérées après inspection.

Les [effets de cette vague](effects-wave-2026-10-08.md) comprennent quatre attaques distinctes : souffle blanc/bleu du Dragon Blanc, flammes du Dragon Noir, lame du Gardien Celte et éclairs du Crâne Invoqué ; les trois autres formes représentent annulation, destruction et réanimation. Les quatre attaques ont une preuve de combat native. Les 84 captures du module graphique couvrent trois instants et deux tailles ; elles restent distinctes des parcours de jeu compilé.

## Vérification et portée

Le [contrôle global](artifacts/native-wave-checks-2026-10-08.json) passe : **134 fichiers de tests**, zéro échec, annulation, test ignoré ou todo, les **339 illustrations et 339 replis**, **Vite 108 modules**. L'audit de sécurité rapporte **zéro vulnérabilité**. Le total local décrit les fichiers exécutés ; le nombre de tests nommés de la CI est relevé séparément dans ses logs.

Entrée compilée gelée : `/assets/index-BAjs-Biw.js`, SHA-256 `ab8aece9cffe26026f69778ff4ddf9bba6a0bfc7abbe67435c725df23eed96b7`, 609 998 octets. Les sept fichiers principaux incluent le bridge OCG réel ; le catalogue est désormais compilé dans l'entrée et ne possède plus son propre chunk. Les notices non bloquantes du build sont conservées dans le relevé, sans masquer ses résultats.

Le [relevé consolidé](artifacts/native-wave-2026-10-08.json) identifie quinze preuves et les sources modifiées, avec tailles et SHA-256. La [preuve de conservation](artifacts/native-field-wave-preservation-2026-10-08.json) confirme l'identité intégrale des 353 scénarios historiques et de la matrice des 339 Terrains.

Les parcours du même build final passent :

- [Duel, modèles et annulation](native-wave-ui-2026-10-08.md) : **1280 × 900 et 390 × 844**, 24 captures, deux Invocations Normales autorisées par Double Summon, envoi au Cimetière par Foolish Burial, réanimation réelle du Castor, cinq caméras et trois vues conservant LP, identités et statistiques. Une vraie attaque de l'IA est annulée par le Piège proposé nativement ; la cible et les LP sont préservés. Les dix-sept réponses HTTP de fichiers compilés et d'assets natifs concordent avant/après, avec CSP exacte et QA absent. La capture après Reborn montre l'Invocation réussie ; elle ne certifie pas la présence de l'ankh à cet instant.
- [Choix Charity → Reborn](gameplay-wave-c-2026-10-08.md) : **1440 × 900 et 390 × 844**, six captures, vrais choix au clavier Espace/Entrée, copies différenciées en Main et au Cimetière, confirmations mesurées à 44 px. Les dix-sept corps HTTP et les dépendances restent identiques avant/après ; aucune erreur de page, ressource native ou CSP.
- [Inspection privée isolée](native-presentation-corrections-2026-10-08.md) : **1280 × 900 et 390 × 844**, quatre captures du vrai module UI avec six descripteurs issus du WASM et le catalogue imprimé. Groupes, destinataire 1, détails, clavier, fermeture et nettoyage passent. Cette preuve ne crée pas un Duel dans l'application ; trois cartes utilisent leur illustration locale, trois gardent le visuel neutre déclaré.

La [revue indépendante](native-wave-final-review-2026-10-08.md) distingue ces périmètres. Les preuves de publication, du SHA distant, de la CI et de l'aperçu Vercel sont ajoutées à la description de la PR après création du commit, pour éviter toute référence circulaire dans l'arbre source. Les preuves navigateur restent séparées entre application compilée et modules graphiques isolés.

Les 339 Terrains possèdent au moins une branche exercée ; les 377 scénarios ne certifient pas toutes leurs branches, toutes les interactions ni les milliers de cartes du catalogue. Les JPEG sources restent exacts. Les reconstructions 3D gardent des adaptations de profondeur, de cadrage et de budget pour le plateau et ne constituent pas une reproduction spatiale intégrale 1:1.
