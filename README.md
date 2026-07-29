# Yu-Gi-Oh! 2.5D Hologram Duel Simulator

Simulateur de duel solo dans le navigateur, inspiré des arènes holographiques de l’anime. Le projet fonctionne sans compte ni backend : l’état du Duel reste dans la page, tandis que les préférences et les Matchs entre deux Duels utilisent `localStorage`.

## Fonctionnalités vérifiées

- mode **TCG Advanced strict** par défaut : decks de 40 cartes validés, limite de trois copies et liste de cartes limitée/interdite du 18 mai 2026 pour le sous-ensemble local ;
- mode **Anime Sandbox** séparé pour la recherche de métadonnées YGOPRODeck et l’expérimentation ;
- duel unique ou **Match au premier à deux victoires**, avec score, Side Deck et choix réglementaire du premier joueur ; les Duels nuls peuvent prolonger le Match au-delà de trois Duels ;
- duel solo contre trois profils d’IA avec pioche, six phases, Invocations Normale, Sacrifice, Rituel, Fusion, Synchro, Xyz, Lien et Pendule ;
- Zones Monstre Extra partagées, Matériels Xyz, Monstres Pendule face recto dans l’Extra Deck et limitation d’une Invocation Pendule par tour ;
- positions Attaque/Défense, Damage Step, attaques directes, dégâts, Deck Out, limite de six cartes en End Phase et conditions de victoire ;
- chaînes en résolution LIFO, fenêtres de réponse et sélection explicite des cibles pour les effets locaux pris en charge ;
- effets scriptés pour Raigeki, Monster Reborn, Polymérisation, Force de Miroir, Trappe, Magicienne des Ténèbres, Magicien du Temps, Kuriboh, Robot Synchronique, Magicien des Arcanes, Dragon Poussière d’Étoile et Numéro 39 : Utopie ;
- cartes adverses cachées anonymisées dans le DOM et snapshots réseau expurgés des informations privées ;
- interface desktop/mobile, glisser-déposer, sélection carte → zone, plateau mobile panoramique, parcours clavier, zones publiques inspectables, modales accessibles et réduction des animations ;
- préférences locales persistées : mode, difficulté, son/voix, dos de carte, deck personnalisé, statistiques et reprise d’un Match entre deux Duels.

## Portée et fidélité

Le mode strict applique les règles officielles au **sous-ensemble local explicitement pris en charge**. Le moteur refuse une procédure absente au lieu d’inventer une résolution. Il ne constitue pas un arbitre universel : les milliers de cartes et interactions du TCG complet ne sont pas toutes scriptées.

Les trois decks intégrés sont des presets légaux et équilibrés **inspirés** de Kaiba, Yugi et Joey ; ils ne reproduisent pas au détail près une liste historique de l’anime. En Sandbox, une carte issue de l’API peut être inspectée ou ajoutée pendant la Main Phase, mais seuls les effets listés ci-dessus possèdent une résolution dédiée. Une carte distante non intégrée affiche un visuel local neutre afin de ne pas hotlinker le CDN du fournisseur.

L’interface publiée reste **solo contre l’IA**. Le dépôt contient un protocole WebRTC pair-à-pair, une session avec accusés de réception/résynchronisation et des snapshots publics testés, mais ce socle n’est pas présenté comme un multijoueur jouable : combat, chaînes/effets, Fusion et Rituel distants demandent encore une autorité de jeu commune et des décisions privées sûres.

La reprise persistante concerne le Match entre deux Duels. Un Duel en cours n’est pas sérialisé intégralement ; quitter la page déclenche donc un avertissement.

## Vues du duel et environnements

La vue **Compacte** reste la vue initiale et conserve son plateau historique. La vue **Arène** reste disponible. La **Vue Réelle**, chargée seulement à son premier affichage, propose une mise en scène inspirée des arènes de l’anime : console et tapis du joueur au premier plan, plateforme physique en perspective et duelliste adverse debout au fond, sans seconde console. Les trois vues consomment la même instance du moteur ; changer de vue ne recrée ni le Duel, ni les cartes, ni l’IA.

La Vue Réelle possède deux décors de base sélectionnables dans les paramètres : **Clairière KaibaCorp** et **Grotte / Ruines**. Une Magie de Terrain utilise sa Zone Terrain dédiée. Une carte simplement Posée ou une activation encore en chaîne ne révèle pas et ne change pas le décor. Le nouvel environnement apparaît uniquement après une résolution réussie ; une négation conserve le décor précédent et le retrait ou remplacement de la carte restaure l’environnement approprié.

Le catalogue `src/ui/FieldSpellEnvironmentCatalog.js` couvre les **336 Magies de Terrain TCG/OCG connues au 29 juillet 2026** par passcode canonique. Elles sont réparties dans 24 familles visuelles originales, puis branchées au rendu par `src/ui/FieldEnvironmentRegistry.js`. Une nouvelle carte absente du snapshot reçoit toujours le terrain holographique générique au lieu de casser la Vue Réelle.

Pour ajouter un environnement :

1. placer un visuel original optimisé dans `public/environments/` ;
2. ajouter l’entrée `[passcode, nom d’audit, environmentId]` au catalogue ;
3. créer une famille immuable dans `FieldEnvironmentRegistry.js` uniquement si aucune famille existante ne convient ;
4. compléter les tests du catalogue et du résolveur, puis vérifier les états face verso, en chaîne, résolu, négation, retrait et remplacement.

Les 25 décors sont des créations originales générées avec OpenAI pour le projet. Les captures de l’anime ont servi uniquement de références de composition et ne sont pas utilisées comme textures. Le catalogue est visuel : il ne prétend pas ajouter au mode strict les effets de cartes qui ne sont pas encore scriptés.

## Développement

Prérequis : Node.js 20.19 ou plus récent.

```bash
npm ci
npm run dev
```

Contrôle complet :

```bash
npm run check
```

Le contrôle exécute les tests Node de règles, Match, réseau et régression, puis produit le build Vite dans `dist/`.

## Références de règles

- [Official Rulebook](https://img.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf)
- [Tournament Policy v2.5](https://www.yugioh-card.com/en/downloads/penalty_guide/YGOTCG_Tournament_Policy_v_2_5.pdf)
- [Master Rule 2020](https://www.yugioh-card.com/japan/howto/masterrule2020/)
- [Liste Advanced du 18 mai 2026](https://www.yugioh-card.com/en/limited/list_2026-05-18/)

## Données, images et propriété intellectuelle

Les métadonnées Sandbox proviennent de l’API YGOPRODeck et sont mises en cache localement pour limiter les requêtes. Les deux variantes d’images nécessaires aux 39 cartes du pool local sont réhébergées dans `public/cards/`, conformément à la [consigne de téléchargement et réhébergement de YGOPRODeck](https://api.ygoprodeck.com/api-guide/). L’application ne hotlinke plus leurs images.

Yu-Gi-Oh! et les cartes associées appartiennent à leurs ayants droit. Ce projet de démonstration fan, non commercial et non officiel n’est ni produit, ni approuvé, ni soutenu par Konami ou ses sociétés affiliées.
