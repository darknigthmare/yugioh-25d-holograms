# Vues du duel natif — 7 octobre 2026

Le build compilé passe le parcours **compacte → arène → réelle** sur **1280 × 900** et **390 × 844**, avec la CSP de production. Les **22 états publics** vérifiés conservent LP, cartes de la main, identité de l’instance invoquée et statistiques. Une activation en attente ne remplace pas le décor avant sa résolution.

La preuve complète est dans [report.json](artifacts/native-duel-views-2026-10-07/report.json). Le dernier parcours a été relancé sur le build final figé : `index-CNuJ3sB1.js` et `NativeDuelGame-COFVTauG`, incluant l’alias Lua `Group.NewGroup`. Le document `dist/index.html` testé porte le SHA-256 `e7b9fa63bcc4e5356034d77feb1365abadae5bfb13ab401718a32a83b3a18e0e`. Le WASM testé porte le SHA-256 `0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026`. L’entrée JavaScript `index-CNuJ3sB1.js` porte le SHA-256 `2b8993d189f7339198663a1fd54b013b561747d19d90dde37cb9c060c5b9d56f`. Le moteur est celui mis à jour pour le choix de zone adverse d’Angelechy. Chromium utilise WebGL via SwiftShader pour ces captures.

Le CSS final `index-Edane65D.css` porte le SHA-256 `557d05b0cb6a7c8a0a8e82e7309a1a63f83205bd4dc41fab99b468c4e9312d02`.

| Étape réelle dans l’interface | Vérification |
| --- | --- |
| Activation de Mausoleum of the Emperor depuis la main | Terrain face recto ; source visuelle `80921533` dans la famille `temple-sanctuary` |
| Effet proposé par le moteur, sélection de Blue-Eyes, position et zone | Paiement de **2000 LP**, invocation légale sans Tribute ; **6000 / 8000 LP**, **3000 ATK / 2500 DEF** |
| Passage des trois vues | Main identique, même UID public du monstre ; modèle Blue-Eyes présent en vue réelle |
| Remplacement par Zombie World posé face verso | Mausolée quitte le Terrain ; retour au décor de base `clearing`, aucune source Zombie World active |
| Activation du Terrain posé depuis son contrôle en vue réelle | Le bouton **ACTIVER FACE RECTO** ouvre la chaîne ; Book of Moon fournit une réponse légale que le joueur peut passer |
| Activation face recto en attente d’une réponse | Décor de base conservé ; aucune illustration active de Zombie World |
| Réponse passée, puis résolution | Source visuelle exacte `/environments/field-art/4064256.jpg`, famille `graveyard` |
| Deux nouveaux cycles des trois vues | Main inchangée, LP et statistiques inchangés ; un plateau, une main, une scène WebGL, un canvas et une racine CSS3D au maximum |

Le script utilise un Deck local légal de 40 cartes, enregistré dans un contexte navigateur isolé, et un flux RNG déterministe. Toutes les réponses passent par les boutons réellement proposés. Il ne modifie ni les scripts Lua ni les messages ou réponses du moteur, n’utilise aucun hook QA de production et ne lit aucune identité adverse privée. Les vérifications de DOM concernent les cartes du joueur et les éléments publics. Aucun adversaire face verso n’est présent dans ce scénario ; la [preuve UI distincte](native-duel-ui-2026-10-07.md) et les [tests de protocole](../../test/native-duel-visual-events.test.js) couvrent cette confidentialité.

Aucune erreur de page, aucun échec de requête native et aucune violation CSP n’ont été observés. Les cycles réutilisent exactement le même objet canvas. La preuve de mémoire porte sur ce maintien et l’absence de duplication des racines DOM après les changements de vue. Le rapport conserve aussi une estimation du heap JavaScript ; il ne mesure pas les allocations GPU et ne prétend pas exclure toute fuite mémoire.

Les modèles et la géométrie existants sont conservés. Ce parcours confirme leur intégration au duel natif ; il n’ajoute pas de reconstruction 1:1. Les **339 scripts disponibles**, **339 initialisations vérifiées** et **47 scénarios sur 41 Terrains** restent des preuves distinctes, décrites dans [l’audit des règles](native-field-rules-2026-10-07.md).

Captures desktop : [Mausolée et Blue-Eyes](artifacts/native-duel-views-2026-10-07/native-mausoleum-real-1280.png), [Terrain posé](artifacts/native-duel-views-2026-10-07/native-zombie-world-set-real-1280.png), [activation en attente](artifacts/native-duel-views-2026-10-07/native-zombie-world-pending-real-1280.png), [Zombie World résolu](artifacts/native-duel-views-2026-10-07/native-zombie-world-real-1280.png).

Captures mobile : [Mausolée et Blue-Eyes](artifacts/native-duel-views-2026-10-07/native-mausoleum-real-390.png), [Terrain posé](artifacts/native-duel-views-2026-10-07/native-zombie-world-set-real-390.png), [activation en attente](artifacts/native-duel-views-2026-10-07/native-zombie-world-pending-real-390.png), [Zombie World résolu](artifacts/native-duel-views-2026-10-07/native-zombie-world-real-390.png). Les captures compacte et arène sont également conservées dans le même dossier.

```sh
npm run build
python scripts/audit-native-duel-views.py
```

Le serveur local sert `dist` avec les headers de `vercel.json`. `--base-url` permet de vérifier le même parcours sur une URL existante ; `--desktop-only` sert à diagnostiquer le parcours sans répéter le mobile.
