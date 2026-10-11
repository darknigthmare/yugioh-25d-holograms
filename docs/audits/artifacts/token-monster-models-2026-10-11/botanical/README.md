# Jetons végétaux et insectes — 11 octobre 2026

Constructeur isolé : `buildTokenBotanicalAnatomy(profile, helpers) → boolean`, exporté par `src/ui/HologramTokenBotanicalModels.js`. Les helpers de construction restent ceux de HologramMonsterModels ; géométries fusionnables dans les cinq matériaux existants, sans lecture du duel ni boucle d’animation.

Familles couvertes : flower, seed, ivy, maize, ant, mantis, spider, beetle, worm. Le cas egg est traité uniquement pour Insect Monster émergeant (code 91512836 / variant insect-monster). Les œufs purs et autres familles renvoient false sans produire de géométrie.

23 profils du registre contrôlés, maximum 5 234 triangles et 4 matériaux ; bornes positives en Y et inférieures à ±2 sur X/Z, positions et normales finies. Les 6 tests ciblés passent. La galerie juxtapose 16 illustrations locales et les constructions rendues en WebGL, avec maximum 4 appels de rendu et aucune erreur JavaScript.

Les modèles sont des interprétations procédurales stylisées. La fidélité photographique 1:1 et le comportement dans le duel complet ne sont pas démontrés par ces preuves. Les profils native-definition ne possèdent aucune illustration Token dans ce pool et utilisent une interprétation de leur anatomie déclarée.

Les détails vérifiés incluent les pétales concentriques incurvés des roses et leurs épines ; le duvet, les yeux brunrouge et la tige fine des Fluff ; les grandes feuilles et bottes bleues de Plant ; les sept tentacules et l’œil rouge de Lekunga ; l’épi à grains, feuilles et sourire de Maize ; les tiges violettes et pousses vertes de Wicked Plant ; l’écharpe rouge, visage pâle et pieds bouclés de Horseytail ; les aiguilles fines ; les six pattes de l’Ant ; les huit pattes et la toile de Spider ; le scarabée vert émergeant d’une coquille tachetée ; les segments olive, tête de crâne et motifs rouges de Worm.

## Fichiers

- `construction-audit.json` : 23 constructions, statistiques et empreintes des sources avant/après.
- `reference-model-gallery.png` : capture comparative 16 illustrations/constructions.
- `reference-model-gallery.json` : mesures WebGL, empreintes des illustrations et des sources avant/après.
- `test-output.txt` : sortie réelle de la dernière exécution 6/6.
- `construction-audit.mjs` et `render-gallery.py` : scripts reproductibles, serveur Vite local 5208 pour la galerie.
- `manifest.json` : empreintes des preuves et des deux fichiers possédés.

Cette livraison n’a lancé aucun build ni publication et n’a modifié ni catalogue, ni factory, ni scène. Les empreintes du catalogue et de CombatVisualProfiles sont des instantanés ; ces fichiers sont possédés par les autres chantiers.
