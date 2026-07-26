# Design QA — Vue Réelle

## Parcours vérifié

Le joueur démarre un Duel dans la vue Compacte, sélectionne explicitement la Vue Réelle, retrouve exactement le même état de partie, puis voit l’environnement changer uniquement après la résolution réussie d’une Magie de Terrain. Il peut revenir à la vue Compacte sans réinitialisation.

## Sources et preuves

| Preuve | Dimensions / densité | État vérifié |
| --- | --- | --- |
| `C:\Users\chuck\AppData\Local\Temp\codex-clipboard-17fb1912-6c03-4e8a-9061-bb6e14b89135.png` | 499 × 375 / source 1× | Référence clairière : console proche, longue plateforme, terminal opposé, végétation périphérique |
| `C:\Users\chuck\AppData\Local\Temp\codex-clipboard-fa235bd6-20ad-4696-848c-0e63c496a499.png` | 499 × 375 / source 1× | Référence grotte : plateforme épaisse, racines et rochers, consoles intégrées au décor |
| `C:\Users\chuck\Documents\antigravity\nifty-bohr\.codex-compact-1920-final.png` | 1920 × 1080 / navigateur 1× | Vue Compacte initiale, aucune couche immersive montée |
| `C:\Users\chuck\Documents\antigravity\nifty-bohr\.codex-real-clearing-1920-final.png` | 1920 × 1080 / navigateur 1× | Sandbox, Vue Réelle, aucune Magie de Terrain résolue, base Clairière |
| `C:\Users\chuck\Documents\antigravity\nifty-bohr\.codex-real-cave-1920-final-v2.png` | 1920 × 1080 / navigateur 1× | Même Duel, Vue Réelle, base Grotte sélectionnée dans les paramètres |
| `C:\Users\chuck\Documents\antigravity\nifty-bohr\.codex-real-mobile-390-v2.png` | 390 × 844 / navigateur 1× | Vue Réelle mobile, terrain panoramique tactile et commandes accessibles |
| `C:\Users\chuck\Documents\antigravity\nifty-bohr\.codex-design-comparison.png` | 1920 × 1080 / comparaison 1× | Les deux références et les deux rendus finaux jugés dans une même image |

## Correspondance visuelle

- La hiérarchie console du joueur → plateforme centrale → console adverse est immédiatement lisible dans les deux décors.
- La plateforme possède une épaisseur, des rails, des dalles et une perspective stable tout en conservant les zones modernes du moteur.
- Les décors originaux entourent réellement l’arène ; aucune capture de l’anime n’est employée comme texture finale.
- La main reste un vrai composant DOM lisible et interactif sur la console, au-dessus du décor décoratif non interactif.
- Les cartes cachées adverses restent anonymisées et la perspective ne révèle aucune face privée.
- À 390 × 844, la couche de décor suit le plateau panoramique au lieu de rester attachée au viewport.
- `prefers-reduced-motion` réduit les transitions et animations à une durée quasi instantanée.

## Itérations effectuées

1. Remplacement du premier décor procédural par deux visuels bitmap originaux 1920 × 1080.
2. Recalage responsive de la plateforme et des consoles pour les formats desktop et mobile.
3. Passage de la couche mobile de `fixed` à `absolute` pour suivre le terrain défilant.
4. Ajout d’un secours de hit-test fondé sur les coordonnées pour les zones CSS 3D aplaties par certains navigateurs.
5. Rafraîchissement ciblé de la main et de la Zone Terrain pendant une chaîne, sans appliquer prématurément le nouvel environnement.

## Revue finale des écarts

| Priorité | Résultat |
| --- | --- |
| P0 | Aucun blocage visible ou fonctionnel |
| P1 | Aucun écart majeur de composition |
| P2 | Aucun problème restant de lisibilité, interaction, confidentialité ou responsive |
| P3 | Écarts intentionnels : console plus large pour une main jouable, terrain 16:9 et zones modernes plutôt que reproduction exacte du plateau ancien 4:3 |

Final result: passed
