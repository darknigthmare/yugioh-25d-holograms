# Vérification des quatre terrains dans le navigateur — 7 octobre 2026

Les quatre scénarios passent dans la vraie application Vite, en mode TCG strict et Vue Réelle. Le script commence par le bouton de démarrage et la décision « JE COMMENCE ». Le hook QA disponible uniquement en développement prépare ensuite les positions initiales avec les modèles `CardState` officiels. L’activation du Terrain, l’Invocation Normale, les attaques et la sortie de Battle Phase passent par les boutons et zones du jeu. Aucun résolveur, délai ou résultat de combat n’est remplacé.

| Scénario | Résultat observé |
| --- | --- |
| Plaines Marécageuses | Terrain activé et résolu ; Crapaud Slime invoqué normalement : ATK 1 900, DEF 500. |
| Gratte-Ciel | Sparkman conserve ATK 1 600 avant/après le combat ; le cinematic émis pendant `calc` porte +1 000 et ATK calculée 2 600. Assaillant à la Hache, ATK 1 700, est détruit et son contrôleur perd 900 LP. |
| Le Sanctuaire Céleste | Sphère Mystique Lumineuse, ATK 500, attaque Assaillant à la Hache, ATK 1 700. Les 1 200 dommages sont empêchés ; le joueur garde 8 000 LP et la Sphère est tout de même détruite. |
| Forêt Ancienne | Insecte Mangeur d’Hommes et Magicien de la Foi, initialement cachés en Défense, passent face recto en Attaque sans leurs cinematics d’effets FLIP. Monster Reborn reste au Cimetière. L’Insecte attaque puis est détruit à la sortie de Battle Phase ; Sparkman, qui n’a pas attaqué, reste sur le Terrain. |

L’observateur appelle la méthode originale `RealDuelScene3D.playCombatEffect`. Les profils `skyscraper-boost`, `sanctuary-protection` et `ancient-forest-destruction` sont acceptés par la scène réelle et présents dans sa liste d’effets pendant les captures. Ils conservent la référence de la zone Terrain comme source et la zone du monstre comme cible de pose. Les images montrent aussi les cartes Terrain sources et les modèles publics ; une capture instantanée ne représente pas tous les temps d’un effet.

Les quatre illustrations de Terrain actives utilisent leurs JPEG locaux d’origine, `background-size: contain` et `filter: none`. À 390 × 844, le corps de page mesure 390 pixels et un seul canvas existe. Le passage compacte → réelle conserve la même instance, génération, cartes et LP. Le focus sur la zone du Crapaud Slime actualise l’inspecteur à ATK 1 900.

Inter et Orbitron sont chargées depuis les WOFF2 locaux : `document.fonts.load` retourne une face `loaded` pour chaque famille, avec le texte `éèŒœ`. Les premières réponses sont HTTP 200 ; une relance du tirage initial utilise ensuite le cache HTTP 304. La dernière passe n’enregistre aucune requête Google Fonts, aucune requête échouée, aucune erreur JavaScript, console ou message WebGL. Le précédent échec TLS du CSS Google Fonts (`ERR_CERT_AUTHORITY_INVALID`, sans réponse HTTP) a été corrigé par l’hébergement local des polices avant cette dernière passe.

## Preuves

- [Mesures, événements et résultats du navigateur](artifacts/official-fields-browser-2026-10-07.json)
- [Wetlands résolu et Slime invoqué](artifacts/official-field-wetlands-resolved-2026-10-07.png)
- [Viewport mobile 390 × 844](artifacts/official-field-wetlands-mobile-390-2026-10-07.png)
- [Skyscraper résolu](artifacts/official-field-skyscraper-resolved-2026-10-07.png) ; [combat](artifacts/official-field-skyscraper-effect-2026-10-07.png)
- [Sanctuary résolu](artifacts/official-field-sanctuary-resolved-2026-10-07.png) ; [combat](artifacts/official-field-sanctuary-effect-2026-10-07.png)
- [Forest après révélation](artifacts/official-field-ancient-forest-resolved-2026-10-07.png) ; [sortie de Battle Phase](artifacts/official-field-ancient-forest-effect-2026-10-07.png)

## Reproduction et limites

Lancer Vite en développement, puis exécuter depuis le dépôt :

```sh
python scripts/verify-official-fields-browser.py --base-url http://127.0.0.1:5174
```

Python Playwright et `/usr/bin/chromium` sont nécessaires. Le script utilise Chromium avec SwiftShader, ferme son navigateur et écrit les captures ainsi que le JSON. Le port peut être changé avec `--base-url`.

Ces positions contrôlées vérifient les interactions et les règles indiquées, sans démontrer un duel complet depuis une liste mélangée, toutes les réponses possibles d’une Chaîne, tous les appareils mobiles ou les performances sur un GPU physique. Les volumes de monstres et terrains restent des interprétations procédurales ; ces preuves ne constituent pas une reproduction 3D 1:1.
