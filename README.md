# Yu-Gi-Oh! 2.5D Hologram Duel Simulator

Simulateur de duel solo dans le navigateur, inspiré des arènes holographiques de l’anime. Le projet fonctionne sans compte ni backend : l’état du Duel reste dans la page, tandis que les préférences et les Matchs entre deux Duels utilisent `localStorage`.

## Fonctionnalités vérifiées

- mode **TCG Advanced strict** par défaut : Main Deck de 40 à 60 cartes, Extra et Side de 0 à 15, limites de copies cumulées entre les trois sections et liste limitée/interdite du 21 septembre 2026 pour le sous-ensemble local ; les Matchs sauvegardés avec la liste de mai restent compatibles ;
- mode **Anime Sandbox** séparé pour la recherche de métadonnées YGOPRODeck et l’expérimentation ;
- duel unique ou **Match au premier à deux victoires**, avec score, Side Deck et choix réglementaire du premier joueur ; les Duels nuls peuvent prolonger le Match au-delà de trois Duels ;
- **parcours solo de 12 défis** en trois chapitres, avec 24 constructions de Deck dédiées, objectifs issus des événements réels, 36 médailles et progression exportable/importable ;
- duel solo contre trois profils d’IA avec pioche, six phases, Invocations Normale, Sacrifice, Rituel, Fusion, Synchro, Xyz, Lien et Pendule ;
- Zones Monstre Extra partagées, Matériels Xyz, Monstres Pendule face recto dans l’Extra Deck et limitation d’une Invocation Pendule par tour ;
- positions Attaque/Défense, Damage Step, attaques directes, dégâts, Deck Out, limite de six cartes en End Phase et conditions de victoire ;
- chaînes en résolution LIFO, fenêtres de réponse et sélection explicite des cibles pour les effets locaux pris en charge ;
- rejeu d’attaque après modification du Terrain adverse, fenêtre d’Effets Rapides à la déclaration, calcul des combats commun au joueur et à l’IA ;
- flèches Lien dans les huit directions, depuis les Zones Main et Extra des deux camps, partagées par les procédures Lien et Pendule ;
- effets scriptés pour Raigeki, Monster Reborn, Polymérisation, Force de Miroir, Trappe, Magicienne des Ténèbres, Magicien du Temps, Kuriboh, Robot Synchronique, Magicien des Arcanes, Dragon Poussière d’Étoile et Numéro 39 : Utopie ;
- Typhon d’Espace Mystique et Livre de la Lune : choix de cible, réponses depuis la Main pendant son tour ou depuis une carte Posée un tour précédent, revalidation de la cible et restrictions du Damage Step ;
- **29 Magies de Terrain entièrement scriptées** : 20 effets continus de statistiques et 9 Terrains avec restrictions, changements de Type/position ou calculs particuliers du combat ; Océan modifie aussi les Niveaux et partage le nom réglementaire « Umi » ;
- constructeur de Deck disponible en strict et en Match : bibliothèque locale, copie des presets, Main/Extra/Side persistés et validation avant le lancement ;
- IA normale/difficile capable de répondre avec Livre de la Lune, Typhon et Stardust, sans lire les cartes adverses cachées ;
- cartes adverses cachées anonymisées dans le DOM et snapshots réseau expurgés des informations privées ;
- interface desktop/mobile, glisser-déposer, sélection carte → zone, plateau mobile panoramique, parcours clavier, zones publiques inspectables, modales accessibles et réduction des animations ;
- préférences locales persistées : mode, difficulté, son/voix, dos de carte, deck personnalisé, statistiques, progression solo et reprise d’un Match entre deux Duels ;
- cache distant borné et validé, délai réseau maximal, audio facultatif résilient, dépendances auditées et CI de livraison épinglée.

## Portée et fidélité

Le mode strict applique les règles officielles au **sous-ensemble local explicitement pris en charge**. Le moteur refuse une procédure absente au lieu d’inventer une résolution. Il ne constitue pas un arbitre universel : les milliers de cartes et interactions du TCG complet ne sont pas toutes scriptées.

Le pool local comporte désormais **80 cartes distinctes** (75 Main Deck, 5 Extra Deck), indépendamment du nombre de copies dans un deck de duel. Les 29 Terrains comprennent désormais Océan Légendaire, Monde Zombie, Village Secret des Magiciens, Forêt Interdite, Temple de l’Oeil de l’Esprit, Canyon, Château de Brume de Shien, Ville Ténébreuse, Chambre Forte du Sabre, Monde Jurassique, Pluie d’Acide et Mur de Magie Enchanteur. Anapelera, Chambellan des Six Samouraïs, Mégalobroyeur X et Giga Gagagigo fournissent des partenaires jouables supplémentaires. Insecte Mangeur d’Hommes, Magicien de la Foi et Sangan possèdent des effets Flip et déclenchés : ciblage à l’activation, collecte des événements et ordre SEGOC, déclencheurs différés après la chaîne et pendant le Damage Step. Arcanite place ses compteurs par un effet obligatoire en Chaîne ; ses coûts et cibles sont revérifiés après chaque choix. Un effet annulé de Magicien du Temps reste activable, mais sa résolution est annulée. Voir [la couverture détaillée des règles et ses limites](RULES_COVERAGE.md).

Les trois decks intégrés sont des presets légaux **inspirés** de Kaiba, Yugi et Joey ; ils ne reproduisent pas au détail près une liste historique de l’anime. En Sandbox, une carte issue de l’API peut être inspectée ou ajoutée pendant la Main Phase, mais seuls les effets explicitement pris en charge par le moteur possèdent une résolution dédiée. Une carte distante non intégrée affiche un visuel local neutre afin de ne pas hotlinker le CDN du fournisseur.

L’interface publiée reste **solo contre l’IA**. Le dépôt contient un protocole WebRTC pair-à-pair, une session avec accusés de réception/résynchronisation et des snapshots publics testés, mais ce socle n’est pas présenté comme un multijoueur jouable : combat, chaînes/effets, Fusion et Rituel distants demandent encore une autorité de jeu commune et des décisions privées sûres.

La reprise persistante concerne le Match entre deux Duels. Un Duel en cours n’est pas sérialisé intégralement ; quitter la page déclenche donc un avertissement.

Le parcours solo est un entraînement original, pas une adaptation des épisodes. Une victoire suffit toujours à avancer ; Argent et Or récompensent la maîtrise sans bloquer la progression. Aucune durée en heures n’est revendiquée sans campagne de playtests chronométrés.

## Vues du duel et environnements

La vue **Compacte** reste la vue initiale et conserve son plateau historique. La vue **Arène** reste disponible. La **Vue Réelle**, chargée seulement à son premier affichage, propose une mise en scène inspirée des arènes de l’anime : console et tapis du joueur au premier plan, plateforme physique en perspective, console adverse réduite au fond et duelliste adverse placé derrière son terminal. Les trois vues consomment la même instance du moteur ; changer de vue ne recrée ni le Duel, ni les cartes, ni l’IA. La console adverse est une géométrie publique : elle n’embarque ni main, ni face de carte, ni identifiant privé.

La Vue Réelle possède deux décors de base sélectionnables dans les paramètres : **Clairière KaibaCorp** et **Grotte / Ruines**. Une Magie de Terrain utilise sa Zone Terrain dédiée. Une carte simplement Posée ou une activation encore en chaîne ne sélectionne pas son illustration. Le nouvel environnement apparaît uniquement après une résolution réussie. Remplacer un Terrain retire immédiatement l’ancienne source et ses bonus, avant les réponses à la nouvelle activation ; une activation annulée ne devient jamais une source de décor.

Le catalogue `src/ui/FieldSpellEnvironmentCatalog.js` couvre **339 références canoniques de Magie de Terrain TCG/OCG**, actualisées depuis le catalogue du 7 octobre 2026, dont une carte officiellement annoncée pour le 8 octobre en Europe. Les trois identifiants provisoires du fournisseur sont archivés séparément et ne sont pas traités comme des passcodes imprimés. Chaque carte sélectionne maintenant son illustration principale exacte, téléchargée depuis YGOPRODeck et réhébergée dans `public/environments/field-art/`. Les octets JPEG, dimensions, URL source et empreintes SHA-256 sont conservés dans un snapshot d’audit. L’image est affichée entière, avec ses proportions conservées, sans filtre de couleur ni surimpression atmosphérique. Les lumières et matériaux 3D utilisent une palette analysée dans cette source. Une carte absente du catalogue reçoit le décor générique.

La Vue Réelle ajoute des modèles procéduraux pour **20 cartes emblématiques et 17 familles de repli**, avec attaques de dragon, magie, foudre, lames, protections, invocations, Typhon et Livre de la Lune. Sept modèles sont construits ou affinés à partir de leurs illustrations, avec anatomie et couleurs par sommet ; [les captures et mesures](docs/audits/monster-fidelity-2026-10-07.md) documentent leurs limites. Les ailes, bâtons, épées et pinces s’animent sur GPU lors des actions. Les effets de Terrain ciblent les monstres et dégâts concernés : halo protecteur, chevrons, racines et quatre cinématiques pour Ville Ténébreuse, Shien, Canyon et le Temple, avec les valeurs réellement appliquées. Les poses conservent les ancrages des zones, s’arrêtent avec les effets et respectent le mouvement réduit. Chaque modèle utilise au plus cinq appels couleur, hors ombres. Les monstres face verso ne produisent aucun modèle identifiable.

Les scènes utilisent 25 familles de géométrie et des repères propres à **89 cartes de Terrain**, dont **50 références inspectées**. Le second lot du 7 octobre reconstruit 26 références naturelles, architecturales et magiques depuis leurs illustrations, en complément des sept affinements précédents. Les accessoires statiques sont regroupés par géométrie et matériau. La texture source est exacte ; les volumes et leur placement restent adaptés à la lisibilité du duel. Les personnages et créatures de certaines illustrations ne possèdent pas tous un modèle de Terrain 3D. Voir les comparaisons [naturelles](docs/audits/nature-terrain-references-2026-10-07.md), [architecturales](docs/audits/terrain-architecture-batch2-2026-10-07.md), les [sept affinements précédents](docs/audits/terrain-fidelity-2026-10-07.md) et [l’audit des détails encore manquants](TERRAIN_REFERENCE_AUDIT.md).

Pour ajouter un environnement :

1. ajouter l’entrée `[passcode, nom d’audit, environmentId]` au catalogue ;
2. actualiser l’instantané de données avec `scripts/generate-field-spell-card-data-snapshot.mjs` ;
3. archiver le JPEG source sans modification dans `/environments/field-art/<passcode>.jpg`, enregistrer provenance/empreinte/dimensions dans `FieldSpellReferenceArtSnapshot.js` et sa palette dans `FieldSpellReferenceArtPalettes.js` ; choisir un repli local explicite, le JPEG exact étant utilisable sans nouvelle génération ;
4. créer une famille immuable dans `FieldEnvironmentRegistry.js` uniquement si aucun profil matériel existant ne convient ;
5. compléter les tests du catalogue, du manifeste et du résolveur, puis vérifier les états face verso, en chaîne, résolu, négation, retrait et remplacement.

Les anciens 336 WebP et les décors de base sont des compositions originales générées pour le projet. Le WebP reste visible pendant le décodage d’une illustration source ou si son chargement échoue. Les captures de l’anime ne sont pas utilisées comme textures. Le catalogue est visuel : seuls les **29 Terrains explicitement enregistrés** possèdent leurs effets de carte dans le mode strict.

Le bouton **EXPLORER LES TERRAINS** ouvre le catalogue complet : recherche par nom français/anglais ou passcode, filtres des effets jouables et décors étudiés, illustration originale et un aperçu 3D orientable. Le catalogue distingue les silhouettes dédiées, les décors réellement inspectés et les effets restant à implémenter. Les ressources de l’aperçu sont libérées à chaque changement et à la fermeture.

## Développement

Prérequis : Node.js 20.19 ou plus récent.

```bash
npm ci
npm run dev
```

Contrôle complet :

```bash
npm run audit:security
npm run check
```

Le contrôle exécute les tests Node de règles, Match, réseau et régression, audite les 339 JPEG sources et les 336 WebP de repli de Terrain (les trois nouveautés utilisent leur JPEG exact en repli), puis produit le build Vite dans `dist/`. Le second lot du **7 octobre passe 86 fichiers de tests sans échec**, et l’audit npm constate zéro vulnérabilité. Le projet JavaScript ne définit pas de script lint ou typecheck séparé. Les [parcours navigateur et preuves du lot](docs/audits/terrain-rules-release-batch2-2026-10-07.md) complètent ces contrôles.

L’[audit de préparation commerciale du 8 septembre 2026](docs/audits/commercial-readiness-2026-09-08.md) distingue les correctifs livrés des prérequis encore bloquants. Le projet doit rester non commercial tant qu’aucune autorisation appropriée des ayants droit n’a été obtenue.

## Références de règles

- [Official Rulebook](https://img.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf)
- [Tournament Policy v2.5](https://www.yugioh-card.com/en/downloads/penalty_guide/YGOTCG_Tournament_Policy_v_2_5.pdf)
- [Master Rule 2020](https://www.yugioh-card.com/japan/howto/masterrule2020/)
- [Liste Advanced du 21 septembre 2026](https://www.yugioh-card.com/en/limited/list_2026-09-21/)

## Données, images et propriété intellectuelle

Les métadonnées Sandbox proviennent de l’API YGOPRODeck et sont mises en cache localement pour limiter les requêtes. Les variantes petites/cadrées des cartes locales sont réhébergées dans `public/cards/`, conformément à la [consigne de téléchargement et réhébergement de YGOPRODeck](https://api.ygoprodeck.com/api-guide/). Les 339 références de Terrain sont également servies localement ; elles représentent environ 49,19 Mo de fichiers statiques, et seule la référence du décor sélectionné est chargée. L’application ne hotlinke pas leurs images.

Yu-Gi-Oh! et les cartes associées appartiennent à leurs ayants droit. Ce projet de démonstration fan, non commercial et non officiel n’est ni produit, ni approuvé, ni soutenu par Konami ou ses sociétés affiliées.
