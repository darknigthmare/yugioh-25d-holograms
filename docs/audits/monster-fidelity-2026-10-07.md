# Audit des volumes de monstres — 7 octobre 2026

Les sept modèles ci-dessous ont été construits ou affinés après inspection des illustrations originales disponibles dans `public/cards/cropped/`. Les images de contrôle associent chaque illustration au volume réellement produit par les modules de l'application.

Les quatre modèles emblématiques portent désormais une anatomie propre : crânes allongés extrudés, colliers du cou, membranes complètes, griffes et nageoires latérales pour les dragons ; armure segmentée, bordures, peau, coiffure et accessoires pour les magiciens. Le bâton du Magicien Sombre est vert. La Magicienne des Ténèbres a des cheveux blonds, des yeux verts, une tenue bleue et rose et une baguette dorée. Les nouveaux modèles représentent l'armure bleue et or et les paumes électriques de Sparkman, la masse verte et la bouche tombante du Crapaud Slime, ainsi que l'orbe nacré sans visage de la Sphère Mystique Lumineuse.

| Carte | Appels de rendu couleur du modèle | Triangles |
| --- | ---: | ---: |
| Dragon Blanc aux Yeux Bleus | 5 | 4 160 |
| Dragon Noir aux Yeux Rouges | 5 | 4 520 |
| Magicien Sombre | 5 | 4 544 |
| Magicienne des Ténèbres | 5 | 4 692 |
| Sparkman, HÉROS Élémentaire | 5 | 3 868 |
| Crapaud Slime | 5 | 2 748 |
| Sphère Mystique Lumineuse | 3 | 1 940 |

Les appels sont mesurés dans Chromium avec `renderer.info.render.calls`, en isolant les passes couleur du modèle et en excluant le sol de l'audit. Les ombres ajoutent leurs passes habituelles. Les matériaux transparents utilisent `forceSinglePass` ; cinq meshes correspondent donc réellement à cinq appels couleur. Les modèles n'utilisent aucune texture de carte. La texture comptée par les vues de contrôle est la cible d'ombres du renderer.

Les variations de couleurs sont stockées dans des attributs de sommets fusionnés. Les ailes, bâtons, pinces, mains, reculs et apparitions continuent à utiliser les uniforms du rig GPU existant. Les tests vérifient que les poses ne remplacent pas les buffers de positions ou de couleurs et qu'elles reviennent à l'état neutre à leur fin. Le mouvement réduit, l'absence de modèle pour les cartes cachées et la libération des ressources restent couverts par les tests de scène.

Trois profils visuels supplémentaires correspondent aux actions réelles émises par le moteur : `sanctuary-protection`, `skyscraper-boost` et `ancient-forest-destruction`. Ils montrent respectivement un halo protecteur doré, une ascension avec chevrons et des racines. Ces modules ne changent aucune règle ou statistique de duel.

## Preuves et reproduction

- [Volumes au repos et illustrations originales](artifacts/monster-reference-rest-2026-10-07.png)
- [Volumes en pose de combat ou de lancement](artifacts/monster-reference-poses-2026-10-07.png)
- [Mesures enregistrées et erreurs du navigateur](artifacts/monster-reference-measurements-2026-10-07.json)

Le script `scripts/audit-monster-models.py` utilise Python Playwright, `/usr/bin/chromium` et les vrais modules servis par Vite. Lancer un serveur local puis exécuter :

```sh
python scripts/audit-monster-models.py --base-url http://127.0.0.1:5173
```

L'audit ouvre une page de contrôle isolée, sans état de duel, puis ferme son navigateur. Aucune erreur JavaScript ou WebGL n'a été enregistrée. Les suites ciblées de modèles, poses, confidentialité, boucle de rendu et tapis de console passent ; la compilation de production passe.

## Limites de fidélité

Ce sont des interprétations procédurales issues d'illustrations en deux dimensions, pas des modèles officiels ou une reproduction 3D exacte. Le visage, les articulations, les volumes de profil, les détails de vêtements et les matériaux restent simplifiés. Les ailes utilisent des membranes planes articulées et les corps ne disposent pas d'un squelette complet. La carte originale reste la référence pour l'identité visuelle.

Ces captures vérifient les volumes et les poses avec une caméra et un éclairage contrôlés. Elles ne démontrent pas à elles seules le placement dans chaque caméra du duel, la performance d'un terrain complet sur mobile, ou une fidélité universelle de toutes les cartes du jeu. Les autres cartes conservent leurs profils existants ou un modèle de famille.
