# Invocation Pendule native dans le navigateur — 8 octobre 2026

Le parcours complet passe sur **1280 × 900** et **390 × 844**, dans le même build final compilé. Les deux viewports ne rapportent aucune erreur de page, requête native échouée ou violation CSP.

Un Deck légal de 40 cartes et le véritable mélange déterministe du contexte isolé fournissent les cinq cartes d'ouverture. L'enregistrement exact du Deck reste inchangé après la procédure. Les actions utilisent les contrôles visibles :

1. **Odd-Eyes Pendulum Dragon (`16178681`)** et **Timegazer Magician (`20409757`)** deviennent les Échelles.
2. **Mystical Space Typhoon (`5318639`)** propose les deux Échelles ; Odd-Eyes est choisi, détruit et envoyé face recto dans l'Extra Deck. Seul MST rejoint le Cimetière. Sans Échelle basse, la procédure est absente.
3. **Stargazer Magician (`94415058`)**, Échelle 1, remplace l'Échelle détruite.
4. **CHOISIR LES MONSTRES PENDULE** dans la fenêtre Extra lance la procédure native. Le joueur sélectionne **La Jinn (`97590747`)** dans la main et Odd-Eyes dans l'Extra Deck face recto, sans UID prédéterminé.
5. Le moteur offre les **deux Extra Monster Zones** pour Odd-Eyes et les **cinq zones principales** pour La Jinn. Leurs placements respectifs et les positions sont confirmés dans les dialogues natifs, conformément à MR5.
6. L'Extra Deck face recto est vide après l'invocation ; les deux Échelles demeurent ; la procédure et son bouton disparaissent pour le reste du tour.

Le bouton conserve son fond magenta `rgba(255, 0, 204, 0.1)`, sa bordure `rgb(255, 0, 204)`, son retour à la ligne et une hauteur réelle/minimale de **44 px**. Les largeurs mesurées sont **438 px desktop** et **309 px mobile**.

Les trois audits datés du 8 octobre utilisent le même build final, sans recompilation pendant les parcours. Les sept fichiers essentiels du manifeste final ont été comparés aux réponses réellement servies : HTML, entrée, CSS, façade native, catalogue natif, registre des environnements et vue réelle. Le wrapper, le WASM, le CDB sérialisé et l'archive Lua portent le total à **11 fichiers**. Leurs empreintes concordent entre les trois audits et avec `dist`. La [comparaison finale](artifacts/native-duel-ui-2026-10-08/final-build-comparison.json) archive cette vérification et les sources des trois runners.

Les audits général et Pendule conservent les quatre jeux d'empreintes HTTP/local, avant/après, avec `immutableCompiledSnapshot: true`. Le runner des trois vues relit les mêmes réponses après son dernier cycle, compare toutes les valeurs et archive `buildUnchangedDuringAudit: true` ; son schéma de provenance 3 sépare explicitement l'empreinte du HTML de celle de l'entrée JavaScript. La CSP HTTP correspond exactement à `vercel.json` : compilation WASM autorisée par `'wasm-unsafe-eval'`, sans JavaScript `'unsafe-eval'`.

Les **six captures** ont été ouvertes pour inspection : [Extra desktop](artifacts/native-pendulum-ui-2026-10-08/native-pendulum-extra-1280.png), [choix desktop](artifacts/native-pendulum-ui-2026-10-08/native-pendulum-choices-1280.png), [plateau desktop](artifacts/native-pendulum-ui-2026-10-08/native-pendulum-board-1280.png), [Extra mobile](artifacts/native-pendulum-ui-2026-10-08/native-pendulum-extra-390.png), [choix mobile](artifacts/native-pendulum-ui-2026-10-08/native-pendulum-choices-390.png) et [plateau mobile](artifacts/native-pendulum-ui-2026-10-08/native-pendulum-board-390.png). Les candidats et contrôles sont lisibles. Odd-Eyes utilise le visuel neutre local des cartes hors bibliothèque illustrée ; cette preuve porte sur la procédure et les placements, pas sur un modèle 1:1 de ce monstre. Sur mobile, des zones sont hors du cadrage, avec le défilement indiqué ; les placements sont aussi vérifiés dans le DOM public.

Le [rapport JSON](artifacts/native-pendulum-ui-2026-10-08/report.json) conserve les choix et offres publics, les styles calculés, les empreintes HTTP/local avant/après et celles des captures. L'[audit général](native-duel-ui-2026-10-08.md) donne les noms, tailles et SHA-256 des 11 fichiers identiques.

```sh
python scripts/audit-native-pendulum-ui.py
```

La commande sert `dist` déjà compilé sur un port localhost éphémère avec les headers de `vercel.json`, Playwright Python et Chromium. Les fixtures sont préparées avant démarrage. Aucun hook QA, réponse moteur injectée, modification d'état natif après démarrage ou lecture de main adverse n'est utilisé. Aucun adversaire face verso n'est installé ici ; leur confidentialité est couverte par [l'audit général](native-duel-ui-2026-10-08.md). Les autres procédures Pendule et interactions restent hors de ce parcours.
