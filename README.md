# Yu-Gi-Oh! 2.5D Hologram Duel Simulator

Simulateur de duel solo dans le navigateur, inspiré des arènes holographiques de l’anime. Le projet fonctionne sans compte ni backend : l’état du duel reste dans la page et les préférences locales utilisent `localStorage`.

## Fonctionnalités vérifiées

- trois decks de 40 cartes et un constructeur personnalisé de 40 à 60 cartes ;
- duel contre une IA avec pioche, phases, invocations normales et par Sacrifice ;
- positions Attaque/Défense, combats, dégâts et conditions de victoire ;
- Fusion du Dragon Ultime aux Yeux Bleus et Synchro avec validation Syntoniseur/non-Syntoniseur ;
- effets scriptés pour Pot de Cupidité, Raigeki et Monster Reborn ;
- timings scriptés pour Force de Miroir et Trappe ;
- recherche YGOPRODeck en mode Sandbox pendant la Main Phase ;
- interface desktop et mobile, avec glisser-déposer ou sélection carte → zone ;
- navigation clavier : `Entrée`/`Espace` pour sélectionner et `R` pour changer une position.

## Limites assumées

Ce projet est un simulateur Sandbox, pas un moteur officiel complet du JCC. Les cartes récupérées par l’API peuvent être ajoutées à la main, mais seuls les effets listés ci-dessus sont exécutés. Les autres cartes Monstre utilisent leurs statistiques ; un effet non scripté est signalé dans le journal.

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

Le contrôle exécute les tests Node puis produit le build Vite dans `dist/`.

## Sources externes et propriété intellectuelle

Les données et images de cartes sont chargées depuis l’API/CDN public YGOPRODeck. Yu-Gi-Oh! et les éléments associés appartiennent à leurs ayants droit. Ce projet de démonstration non officiel n’est ni produit, ni approuvé, ni soutenu par Konami ou 4K Media.
