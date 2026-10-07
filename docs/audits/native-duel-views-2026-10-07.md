# Vues du duel natif — 7 octobre 2026

Le build final compilé passe le parcours **compacte → arène → réelle** sur **1280 × 900** et **390 × 844**, avec la CSP de production. Les **22 états publics** vérifiés conservent LP, cartes de la main, identité de l’instance invoquée et statistiques. Une activation en attente ne remplace pas le décor avant sa résolution.

La preuve complète est dans [report.json](artifacts/native-duel-views-2026-10-07/report.json). La relance a employé les véritables fichiers servis du build final figé, comparés avant et après les parcours et au manifeste de livraison. Les noms et les SHA-256 du HTML et du JavaScript sont explicitement séparés : `testedIndexHtmlSha256` concerne le HTML, `testedIndexSha256` l’entrée JS ; `testedHtmlSha256` conserve un alias du HTML. Aucun autre build ni changement applicatif n’a eu lieu pendant l’audit.

| Artefact testé | Fichier servi | SHA-256 |
| --- | --- | --- |
| HTML | `/index.html` | `9092b61cae2f9f267fc6f35c4f90594220bc123ff9681d9b251e5973b1c1c06f` |
| Entrée JavaScript | `/assets/index-CkdHwDWv.js` | `7173898cef8206cb9f0e12525376ad03e857a22e40fca40ea97c0623e0fdb9fd` |
| CSS | `/assets/index-BbUkbKmn.css` | `71afb732ab7152dc319dfb6b72812913e23121c24f251ef80e0b69c61e0e749e` |
| Façade native | `/assets/NativeDuelGame-ZSLU0meg.js` | `292967a9fa2eab1eed43a2f0ce172a3e1364eeb86f1c66d1a63e55fb49777980` |
| Wrapper core | `/assets/ocgcore-D2udBA3b.js` | `1dc7719c0b30b566be8c833ea2b4e65e4e84f68e77849f05c76a8a362c0775fd` |
| WASM | `/native/ocgcore.sync.wasm` | `0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026` |

Le WASM reste celui qui vérifie le choix de zone adverse d’Angelechy. Chromium utilise WebGL via SwiftShader. Les captures de vue réelle attendent la fin de la transition caméra et 900 ms supplémentaires pour laisser les observateurs de taille et la projection CSS3D se stabiliser ; il s’agit uniquement d’une attente de capture, sans modification du jeu, de la caméra ni du moteur. Les seize captures finales desktop et mobile ont été ouvertes pour inspection. Le délai maximal de capture est de 60 secondes afin de permettre les captures SwiftShader lorsque plusieurs audits partagent la machine ; toutes les assertions restent actives.

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

Ce parcours confirme l’intégration du modèle Blue-Eyes et des deux sources publiques au duel natif ; il ne certifie pas une reconstruction intégrale 1:1. Les **339 scripts disponibles**, **339 initialisations vérifiées** et **128 scénarios sur 115 Terrains** restent des preuves distinctes, décrites dans [l’audit des règles](native-field-rules-2026-10-07.md). Les lots [Aquatic](field-aquatic-references-2026-10-07.md), [Engineering](field-engineering-references-2026-10-07.md) et [Frontier](field-frontier-references-2026-10-07.md) possèdent leurs propres tests et comparaisons de géométrie.

Captures desktop : [Mausolée et Blue-Eyes](artifacts/native-duel-views-2026-10-07/native-mausoleum-real-1280.png), [Terrain posé](artifacts/native-duel-views-2026-10-07/native-zombie-world-set-real-1280.png), [activation en attente](artifacts/native-duel-views-2026-10-07/native-zombie-world-pending-real-1280.png), [Zombie World résolu](artifacts/native-duel-views-2026-10-07/native-zombie-world-real-1280.png).

Captures mobile : [Mausolée et Blue-Eyes](artifacts/native-duel-views-2026-10-07/native-mausoleum-real-390.png), [Terrain posé](artifacts/native-duel-views-2026-10-07/native-zombie-world-set-real-390.png), [activation en attente](artifacts/native-duel-views-2026-10-07/native-zombie-world-pending-real-390.png), [Zombie World résolu](artifacts/native-duel-views-2026-10-07/native-zombie-world-real-390.png). Les vues compacte et arène conservent un plateau défilant sur mobile ; les captures représentent la fenêtre visible et ne montrent pas simultanément toutes les zones. Leurs captures sont également conservées dans le même dossier, soit **16 captures finales**, avec leurs SHA-256 dans le rapport. Le modal de réponse masque le plateau dans les captures en attente ; l’état du décor sous-jacent est vérifié par le DOM public et consigné dans le rapport.

```sh
python3 scripts/audit-native-duel-views.py
```

Le script suppose `dist` déjà compilé et le sert avec les headers de `vercel.json`. `--base-url` permet de vérifier le même parcours sur une URL existante ; `--desktop-only` sert à diagnostiquer le parcours sans répéter le mobile. La provenance est prélevée sur les réponses effectivement servies, puis vérifiée à nouveau après le parcours.
