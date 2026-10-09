# Inspection privée Smartfon : navigateur du build gelé

Le 8 octobre 2026, de **21:21:11 à 21:22:45 UTC**, deux duels natifs ont parcouru l'interface compilée en **1280 × 900** et **390 × 844**. Les deux parcours réussissent, avec **quatre cartes effectivement reçues** dans le panneau privé et six captures contrôlées visuellement. Les dates sont des horodatages techniques UTC de cette exécution.

L'entrée servie est `dist/assets/index-XmnwEEBj.js`, SHA-256 `799145520bfd285b788d5f6573dde6a557ef82dadda4645a697f97f5d60882be`. Les **17 fichiers compilés et ressources natives** sont identiques localement et dans les réponses HTTP avant/après ; les **19 dépendances source** sont également inchangées. Le serveur applique la CSP exacte de production. Aucune reconstruction n'a été effectuée.

Le [rapport JSON](artifacts/continuation-private-ui-2026-10-08/report.json) contient la recette complète, les choix réellement présentés, les mesures DOM, les erreurs, les empreintes et les captures. Le [pilote](../../scripts/audit-continuation-private-ui.py) exige l'empreinte du build gelé :

```sh
python3 scripts/audit-continuation-private-ui.py --dist dist --expected-entry-sha256 799145520bfd285b788d5f6573dde6a557ef82dadda4645a697f97f5d60882be
```

## Parcours réellement joué

Le deck enregistré **avant le démarrage** contient 40 cartes natives, sans Extra ni Side, dont trois Smartfon `15521027`, un Foolish Burial `81439173` et trois **Morphtronic Celfon `93542102`**. Le code `53573406` désigne Masked Chameleon et n'est pas utilisé comme Celfon. La recette et le flux initial varié de `crypto` servent à reproduire la main d'ouverture ; le jet de dé demeure exécuté par le core. Aucun état de jeu, événement d'inspection ou résultat du dé n'est injecté après le démarrage.

1. Choisir le mode natif libre et la recette personnalisée valide, puis « JE COMMENCE ».
2. Activer Foolish Burial depuis la main et sélectionner Celfon dans le vrai `SELECT_CARD`, avec Espace et Entrée. Celfon et Foolish sont ensuite visibles au Cimetière public.
3. Choisir l'invocation spéciale de Smartfon dans « EFFETS ET INVOCATIONS », sélectionner Celfon comme coût de bannissement, la Zone Monstre 1 et « DÉFENSE FACE RECTO ». Smartfon apparaît avec ATK 100 / DEF 100 ; le Cimetière contient une carte et la pile bannie contient Celfon.
4. Activer l'effet de défense « Excavate and arranje », choisir « Top of deck » dans le vrai `SELECT_OPTION`, puis répondre aux quatre choix successifs `SORT_CARD` : Magicien Sombre, Celfon, Guerrier Castor, Bœuf de Combat.
5. Consulter les quatre cartes autorisées regroupées dans « Inspection privée », sélectionner la dernière carte au clavier et lire son détail. Fermer par le bouton visible sur ordinateur et par Échap sur mobile, dans deux duels distincts.

Les observations proviennent des contrôles et du DOM visibles. Le pilote ne consulte aucun objet natif, Deck caché brut ou main adverse. Le panneau utilise `role="region"` sans modalité ; les cartes et le bouton Fermer ont une cible d'au moins 44 pixels. Les images sont chargées, le panneau reste dans l'écran et la page ne déborde pas horizontalement.

## Confidentialité et conservation de l'état

Pendant l'inspection, la main du joueur, le Smartfon en défense, les deux LP à 8000 et les compteurs Deck 34 / Cimetière 1 / bannissement 1 sont conservés. La sélection d'une autre carte **dans le panneau privé** ne change pas l'inspecteur public existant. L'inspecteur public peut changer avant l'arrivée du panneau à la suite des interactions ordinaires avec les cartes déjà visibles ; le rapport conserve ces deux instantanés au lieu d'affirmer leur égalité pendant l'activation.

Le seul ajout au journal public est `Chaîne 1 : activation Morphtronic Smartfon.`. Aucun panneau de confirmation publique n'est créé et aucun nom nouvellement inspecté n'est ajouté au journal. Celfon était déjà public dans la pile bannie ; Smartfon et Foolish avaient également été exposés auparavant. Ces identités déjà connues sont explicitement distinguées dans le contrôle du journal. La fermeture conserve les mêmes faits publics et rend disponible le bouton de fin de tour. Le deck enregistré reste intact et `window.__YGO_QA__` est absent.

Aucune erreur JavaScript, violation CSP ou requête native échouée n'est observée. Les ressources WASM, CDB projetée et scripts natifs sont effectivement chargées par les deux duels.

## Captures et limites constatées

| Affichage | Panneau groupé | Détail au clavier | Après fermeture |
| --- | --- | --- | --- |
| 1280 × 900 | [Capture](artifacts/continuation-private-ui-2026-10-08/private-smartfon-grouped-1280.png) | [Capture](artifacts/continuation-private-ui-2026-10-08/private-smartfon-keyboard-details-1280.png) | [Capture](artifacts/continuation-private-ui-2026-10-08/private-smartfon-closed-board-1280.png) |
| 390 × 844 | [Capture](artifacts/continuation-private-ui-2026-10-08/private-smartfon-grouped-390.png) | [Capture](artifacts/continuation-private-ui-2026-10-08/private-smartfon-keyboard-details-390.png) | [Capture](artifacts/continuation-private-ui-2026-10-08/private-smartfon-closed-board-390.png) |

Les six images ont été ouvertes et contrôlées visuellement. Trois cartes disposent d'une illustration locale ; Celfon conserve l'image neutre connue, avec son identité et son texte officiels. Le détail mobile nécessite un défilement interne ; l'en-tête et son bouton Fermer ne sont pas fixes pendant ce défilement. La fermeture mobile est prouvée par Échap. Le plateau mobile conserve son défilement horizontal propre : la carte Smartfon est hors du cadrage de la dernière capture mobile, tandis que son identité, sa position et ses statistiques sont contrôlées dans le DOM public.

Cette preuve couvre le destinataire natif contrôleur 0 à ces deux dimensions, avec un deck libre de 40 cartes et les scripts officiels. Elle ne certifie pas la légalité TCG Advanced de cette recette, tous les résultats possibles du dé, toutes les tailles d'écran ou tous les effets d'inspection. **Quatre cartes** ont été observées dans chaque duel ; le pilote accepte le résultat natif de un à six et ne présume jamais six cartes.
