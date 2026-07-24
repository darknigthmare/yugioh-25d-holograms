# Yu-Gi-Oh! 2.5D Hologram Duel Simulator

Simulateur de duel solo dans le navigateur, inspiré des arènes holographiques de l’anime. Le projet fonctionne sans compte ni backend : l’état du duel reste dans la page et les préférences locales utilisent `localStorage`.

## Fonctionnalités vérifiées

- mode **TCG Advanced strict** par défaut : decks de 40 cartes validés, limite de trois copies, Pot de Cupidité interdit et Monster Reborn limité selon la liste du 18 mai 2026 ;
- mode **Anime Sandbox** séparé pour la recherche YGOPRODeck et l’expérimentation ;
- duel solo contre trois profils d’IA avec pioche, six phases, invocations normales, Sacrifice, Fusion et Synchro ;
- positions Attaque/Défense, Damage Step, dégâts, Deck Out, limite de six cartes en End Phase et conditions de victoire ;
- chaînes en résolution LIFO avec priorité, fenêtres de réponse et sélection explicite des cibles ;
- effets scriptés pour Raigeki, Monster Reborn, Polymérisation, Force de Miroir, Trappe, Magicienne Sombre, Magicien du Temps, Kuriboh, Robot Synchronique, Arcanite Magician et Stardust Dragon ;
- cartes face cachée adverses anonymisées dans le DOM et journal de pioche adverse sans fuite d’identité ;
- interface desktop/mobile, glisser-déposer, sélection carte → zone, parcours clavier, modales accessibles et réduction des animations ;
- préférences locales persistées : mode, difficulté, son, dos de carte, deck personnalisé et statistiques.

## Portée du moteur

Le mode strict applique les règles et la banlist au **sous-ensemble local explicitement pris en charge**. Il refuse les procédures non implémentées plutôt que de simuler un comportement faux. Les Invocations Xyz, Link, Pendule et Rituel, le Side Deck, les Matchs et le multijoueur ne sont pas encore jouables.

Les trois decks intégrés sont des presets légaux et équilibrés **inspirés** de Kaiba, Yugi et Joey ; ils ne reproduisent pas au détail près une liste historique de l’anime. En Sandbox, une carte issue de l’API peut être inspectée ou ajoutée pendant la Main Phase, mais seuls les effets listés ci-dessus possèdent une résolution dédiée.

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

Le contrôle exécute les tests Node de règles/régression puis produit le build Vite dans `dist/`.

## Sources externes et propriété intellectuelle

Les données et images de cartes sont chargées depuis l’API/CDN public YGOPRODeck. Yu-Gi-Oh! et les éléments associés appartiennent à leurs ayants droit. Ce projet de démonstration non officiel n’est ni produit, ni approuvé, ni soutenu par Konami ou 4K Media.
