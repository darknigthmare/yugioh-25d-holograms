# Actions sur le terrain et perspective des décors — 15 octobre 2026

Les décisions dont les cartes ou zones sont visibles s’effectuent directement sur le terrain : la main, les monstres, les Magies/Pièges et les destinations autorisées sont surlignés. Un bandeau permet de confirmer une sélection, de passer la priorité ou de choisir une action contextuelle sans masquer le duel. Les listes restent disponibles pour les recherches, les piles et les choix qui ne possèdent pas de cible visible distincte.

Cette présentation utilise les réponses proposées par le moteur natif. Les indices de réponse ne sont pas interprétés comme des identités de cartes ; les adresses spatiales ne donnent accès ni à l’ordre du Deck ni à la main adverse. Les choix obligatoires restent obligatoires et les sélections multiples sont validées avant leur transmission au moteur. Les contrôles de phase attendent la résolution du choix en cours.

Les illustrations de terrain sont désormais traitées comme des décors distants. Leur plan conserve l’orientation du point de vue du joueur et sa projection suit la caméra réelle du duel, y compris lors d’un changement de vue ou de taille d’écran. L’illustration reste en deux dimensions ; le sol de l’arène garde sa géométrie indépendante et les bâtiments conservent l’orientation de l’image.

## Vérification

`npm run check` réussit : **2 878 tests sur 2 878**, aucun échec, annulation ou saut ; les audits des assets de terrain passent et le build compile **154 modules**. Les suites ciblées couvrent les adresses publiques, les sélections autorisées, le contrôleur de décisions et la projection du décor.

Les parcours du build compilé passent en **1 440 × 1 000** et **390 × 844**, avec **40 captures finales** : 18 pour le duel, 10 pour les actions groupées et la défausse, 12 pour la perspective. Ils utilisent les contrôles réels pour invoquer un monstre, activer un Terrain, répondre en End Phase depuis la main, placer une Magie et sélectionner sa cible sur le plateau, passer par le repli explicite en liste, résoudre l’effet natif, laisser jouer l’IA et retrouver un tour jouable. Une attaque déclenchée en cliquant la zone adverse inflige réellement 1 800 dommages et consomme l’attaque du monstre pour ce tour.

Les contrôles supplémentaires couvrent le retour et l’annulation des actions groupées, la défausse obligatoire d’une main de sept cartes, le clavier, le tactile, le blocage des clics hors cible et des changements de phase prématurés, ainsi que la confidentialité de la main adverse. Les trois vues de caméra sont contrôlées sur deux décors, avec les matrices et les coordonnées projetées. Aucun débordement horizontal, erreur de page, requête native en échec ou violation CSP n’est rapporté dans les parcours concernés.

Le contrôle global précède un dernier ajustement CSS de réduction de la grille sur grand écran. Cet ajustement est suivi d’un build réussi et de l’ensemble des parcours navigateur finaux ci-dessus. L’entrée finale vérifiée est `assets/index-C2oJ87XU.js`, SHA256 `5635421467f0317569b193212be3bd5cf85d4dc18a8f3d365d4b26e5dda07e83`.

Les preuves sont conservées hors du dépôt : `yugioh-board-gameplay-check-2026-10-15.log` et, sous `yugioh-board-gameplay-2026-10-15/`, les rapports suivants :

- `final-gameplay/report.json` : 37 327 octets, SHA256 `6e4fbab5e64b7822a4cc23678d241e8b6b765a9fb9a82fb4e6c6d3ab8ffc337c` ;
- `final-supplement/report.json` : 28 474 octets, SHA256 `ed6c1f132042a6fe9c8b3bc2cef79dec246f3d01c490a6c9f84cc12025d6026f` ;
- `final-perspective/report.json` : 15 439 octets, SHA256 `4aaf75d65b5eef3fc77f34f588dfc73e87313fb897140135bfc103243a5b8b8f`.

Le reçu consolidé `final-browser-receipt.json` mesure 16 359 octets, SHA256 `4786efa6a225dfc1986bd3a25fba9db3c176b2cd80ba7a5700b2bf7546a0a3ee`. Il épingle les réponses HTTP, les rapports, les captures et les fichiers compilés contrôlés.
