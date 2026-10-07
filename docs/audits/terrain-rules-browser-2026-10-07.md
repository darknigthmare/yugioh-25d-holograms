# Douze Terrains supplémentaires — règles dans le navigateur, 7 octobre 2026

Quatorze scénarios vérifient les douze nouveaux Terrains dans l’application Vite, en TCG strict et Vue Réelle. Le manifeste réunit deux sessions : douze scénarios individuels validés, puis les deux combinaisons et le complément Océan/Stargazer après correction de la sélection des Pendules en main. Océan compte une seule fois dans les quatorze scénarios. Les moteurs de règles restent identiques entre ces deux sessions ; le correctif intermédiaire concerne la sélection dans `main.js`.

Le démarrage utilise le bouton de duel et « JE COMMENCE ». Le hook QA disponible en développement prépare uniquement les positions initiales avec les vraies définitions locales `CardState`. Activations, Invocations, coût du compteur Arcanite, cibles, effets, passages de priorité, attaques et sortie de tour utilisent les contrôles et décisions du jeu. Aucun résolveur, délai, Chaîne ou résultat n’est remplacé. Les observateurs appellent les callbacks et la méthode graphique originaux.

| Terrain / scénario | Résultat observé |
| --- | --- |
| Océan Légendaire — 295517 | Giga Gagagigo passe de Niveau 5 à 4 en main, devient invocable sans Sacrifice, puis affiche ATK 2 650 / DEF 1 700 / Niveau 4 dans les mesures moteur. Le Megalosmasher X adverse passe à 2 200 / 200 / Niveau 3. Le vrai événement d’Invocation indique zéro Sacrifice. |
| Chambre Forte du Sabre — 73787254 | Anapelera, Sabre X, Niveau 4, est invoqué normalement ; les exemplaires des deux camps passent à ATK 2 200 / DEF 700. |
| Monde Jurassique — 10080320 | Megalosmasher X est invoqué normalement ; les deux exemplaires passent à ATK 2 300 / DEF 300. |
| Pluie d’Acide — 35956022 | Assaillant à la Hache est invoqué à ATK 1 200 / DEF 1 550 ; le Gardien Celtique adverse passe à 900 / 1 600. |
| Mur de Magie Enchanteur — 81231742 | Le Gardien Celtique du contrôleur a 1 700 / 1 200 pendant son tour puis 1 400 / 1 500 après la vraie fin de tour. Le monstre adverse conserve 1 400 / 1 200. |
| Monde Zombie — 4064256 | Les monstres publics du Terrain et les monstres des deux Cimetières deviennent Zombie. Dragon Blanc reste Dragon en main et perd son autorisation d’Invocation par Sacrifice malgré deux matériaux disponibles. Saggi, Niveau 3, reste normalement invocable. |
| Village Secret des Magiciens — 68462976 | Avec seulement Saggi Magicien dans le camp du contrôleur, l’autorisation moteur des Magies adverses vaut faux. Le vrai Livre de la Lune retourne Saggi face verso : l’activation d’Umi et de l’Échelle Stargazer est alors désactivée. Umi peut être réellement POSÉE. |
| Forêt Interdite — 78082039 | Épée de l’Alligator du contrôleur gagne 200 ATK pour ses deux monstres au Cimetière ; l’exemplaire adverse reste à 1 500. Umi ne peut être activée. Le vrai effet Arcanite paie un compteur choisi et détruit la Forêt : le bonus disparaît, le verrou du tour reste. Umi peut être POSÉE ; son clic n’ouvre ensuite aucun menu d’activation pendant le verrou. |
| Temple de l’Oeil de l’Esprit — 92481084 | Les 300 dommages du combat Assaillant/Gardien deviennent 1 000 ; l’adversaire finit à 7 000 LP et son Gardien est détruit. |
| Canyon — 28120197 | Le Géant de Pierre adverse initialement caché est révélé par la vraie attaque : les 300 dommages reçus par l’attaquant deviennent 600, soit 7 400 LP. Les deux monstres survivent. |
| Château de Brume de Shien — 11102908 | Le Chambellan des Six Samouraïs initialement caché est révélé en Défense. L’ATK calculée de l’Assaillant descend de 1 700 à 1 200 ; son contrôleur perd 800 LP. L’ATK publique hors calcul reste 1 700. |
| Ville Ténébreuse — 53527835 | L’activation résout. Sparkman, HÉROS Élémentaire, ne reçoit aucun bonus Destiny HERO et perd contre l’Assaillant : son contrôleur finit à 7 900 LP. Aucun événement de bonus Dark City n’est émis. |
| Village + Monde Zombie adverse | Saggi devient Zombie et ne satisfait plus la condition Magicien. Umi reste inactivable mais peut être POSÉE. Stargazer est correctement désactivé dès la main car aucune de ses actions n’est légale dans cette combinaison. |
| Temple + Canyon adverse | Les valeurs suivent 300 → 600 → 1 000 ; l’attaquant finit à 7 000 LP. Les deux cinématiques désignent les zones Terrain de leurs contrôleurs respectifs. |

Le complément Stargazer commence sans aucun monstre du joueur. Le Magicien Observateur des Étoiles, Niveau 5, est absent des autorisations d’Invocation Normale mais reste sélectionnable pour sa procédure Pendule. Les vrais clics activent son Échelle dans la zone gauche ; `location` devient `pendulum_zone`, `isPendulumScale` vaut vrai et le quota d’Invocation Normale utilisé reste zéro. L’Invocation de Giga après Océan réussit ensuite normalement.

Les profils `temple-minds-eye`, `canyon-damage` et `shien-mist-reduction` sont acceptés une fois par changement par la scène réelle. Leurs événements sont émis pendant `calc` et leurs données publiques portent respectivement 1 000, ×2 et −500, avec les valeurs de calcul et les références Terrain/monstre attendues. Les cibles initialement cachées n’apparaissent dans les mesures publiques qu’après leur révélation de combat.

Les douze illustrations finales utilisent leur JPEG source local, `background-size: contain` et `filter: none`, après le décodage réel et la transition WebP. Le cas Canyon à 390 × 844 conserve instance, génération, cartes et LP : un canvas et largeur de page de 390 pixels. Les deux sessions rapportent **zéro erreur JavaScript, zéro erreur console et zéro requête échouée**.

## Preuves et reproduction

- [Manifeste incrémental des 14 scénarios](artifacts/terrain-rules-browser-2026-10-07.json)
- [Session complémentaire après le correctif Pendule](artifacts/terrain-rules-follow-up-2026-10-07.json)
- [Océan, Stargazer et Giga dans la Vue Réelle](artifacts/terrain-rules-ocean-desktop-2026-10-07.png)
- [Canyon après combat, viewport mobile](artifacts/terrain-rules-canyon-mobile-2026-10-07.png)

Avec Vite en développement, Python Playwright et `/usr/bin/chromium`, lancer depuis le dépôt :

```sh
python scripts/verify-terrain-rules-browser.py --base-url http://127.0.0.1:5174 --check-activation-controls --check-free-pendulum-scale
```

Le script utilise Chromium et SwiftShader, conserve les délais du jeu et ferme son navigateur. `--cases`, `--output-dir` et `--report-name` permettent un contrôle ciblé sans écraser une autre preuve.

## Sources et limites

Les définitions et textes français des douze Terrains renvoient à leurs fiches Konami dans [ClassicFieldSpellEffects.js](../../src/core/ClassicFieldSpellEffects.js). L’ordre du calcul et les suppléments Temple sont référencés dans [AdvancedFieldSpellRules.js](../../src/core/AdvancedFieldSpellRules.js), dont la [FAQ Temple/doublement](https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=21&request_locale=ja) et l’[ordre des modifications de dommages](https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=23824&keyword=&tag=-1&request_locale=ja). Les cas de copies et de mélanges sans FAQ primaire spécifique restent explicitement indiqués comme inférences dans ce module.

Le pool pris en charge ne contient aucun Destiny HERO : le cas positif de Ville Ténébreuse est vérifié au moteur avec une fixture contrôlée dans [combat-field-spell-rules.test.js](../../test/combat-field-spell-rules.test.js). Le navigateur vérifie ici son activation et son absence de bonus hors archétype. Ces positions contrôlées couvrent les interactions décrites ; elles ne démontrent pas toutes les réponses possibles, un duel complet depuis un deck mélangé, tous les appareils ou un GPU physique. Les volumes procéduraux et les captures ne constituent pas une reproduction 3D 1:1.
