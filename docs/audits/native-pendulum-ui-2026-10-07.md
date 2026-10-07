# Invocation Pendule native dans l’interface — 7 octobre 2026

Le parcours complet passe sur **1280 × 900** et **390 × 844** dans le build
compilé figé `index-CkdHwDWv.js`, avec la CSP de production. Chromium ne rapporte
aucune erreur de page, requête native échouée ou violation CSP.

Le bouton de procédure conserve le style magenta de l’interface : le style
calculé confirme un fond `rgba(255, 0, 204, 0.1)`, une bordure
`rgb(255, 0, 204)`, une hauteur réelle et minimale de **44 px**, et un retour
à la ligne autorisé. Sa largeur est de 438 px sur desktop et 309 px sur mobile.
Le champ `procedureButtonStyle` du rapport conserve ces mesures du build final.
Les six captures Pendule ont été inspectées après ce contrôle.

Un Deck légal de 40 cartes fournit les cinq cartes requises dans la main
initiale par le véritable mélange déterministe du navigateur isolé. Son
enregistrement dans localStorage reste identique avant et après la procédure.
Les actions utilisent exclusivement les contrôles visibles :

1. Odd-Eyes Pendulum Dragon (`16178681`) et Timegazer Magician (`20409757`)
   sont activés comme Échelles.
2. Mystical Space Typhoon (`5318639`) propose les deux Échelles comme cibles.
   Le joueur sélectionne Odd-Eyes ; sa destruction le place face recto dans
   l’Extra Deck. Seul MST atteint le Cimetière.
3. Stargazer Magician (`94415058`), Échelle 1, remplace l’Échelle détruite.
4. Le nouveau bouton **CHOISIR LES MONSTRES PENDULE** dans la fenêtre Extra
   lance la procédure du moteur. Le joueur choisit explicitement La Jinn
   (`97590747`) dans la main, puis Odd-Eyes dans l’Extra Deck face recto.
   Aucun UID de monstre n’est prédéterminé par ce bouton.
5. Le moteur propose uniquement les deux Extra Monster Zones pour Odd-Eyes,
   puis les cinq zones principales pour La Jinn. Les choix et positions sont
   confirmés dans les dialogues natifs : Odd-Eyes arrive en Extra Monster Zone
   et La Jinn en zone principale, conformément à MR5.
6. L’Extra Deck face recto est vide après l’invocation. La procédure et son
   bouton disparaissent pour le reste du tour ; les deux Échelles demeurent.

Le [rapport JSON](artifacts/native-pendulum-ui-2026-10-07/report.json) conserve
les offres et choix publics du moteur, les vérifications des deux viewports et
les empreintes exactes du build. SHA-256 de l’entrée :
`7173898cef8206cb9f0e12525376ad03e857a22e40fca40ea97c0623e0fdb9fd`.
SHA-256 WASM :
`0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026`.

SHA-256 CSS (`index-BbUkbKmn.css`) :
`71afb732ab7152dc319dfb6b72812913e23121c24f251ef80e0b69c61e0e749e`.
SHA-256 HTML :
`9092b61cae2f9f267fc6f35c4f90594220bc123ff9681d9b251e5973b1c1c06f`.

Les empreintes de l'entrée, du HTML, du CSS, de la façade native, du wrapper et
du WASM sont identiques avant et après les trois audits navigateur finaux. Les
huit fichiers surveillés comprennent aussi le CDB et l’archive Lua, avec leurs
tailles exactes. Ce rapport, le [rapport général](artifacts/native-duel-ui-2026-10-07/report.json)
et le [rapport Pièges-Monstres](artifacts/native-chain-ui-2026-10-07/report.json)
conservent les mêmes empreintes et `immutableCompiledSnapshot: true`.
La façade compilée est `NativeDuelGame-ZSLU0meg.js`, SHA-256
`292967a9fa2eab1eed43a2f0ce172a3e1364eeb86f1c66d1a63e55fb49777980`.

Captures desktop : [Extra Deck et procédure](artifacts/native-pendulum-ui-2026-10-07/native-pendulum-extra-1280.png),
[candidats natifs](artifacts/native-pendulum-ui-2026-10-07/native-pendulum-choices-1280.png),
[plateau final](artifacts/native-pendulum-ui-2026-10-07/native-pendulum-board-1280.png).
Captures mobile : [Extra Deck et procédure](artifacts/native-pendulum-ui-2026-10-07/native-pendulum-extra-390.png),
[candidats natifs](artifacts/native-pendulum-ui-2026-10-07/native-pendulum-choices-390.png),
[plateau final](artifacts/native-pendulum-ui-2026-10-07/native-pendulum-board-390.png).
Sur mobile, le plateau conserve son défilement prévu pour atteindre les zones ;
les placements sont vérifiés dans le DOM public même lorsque certaines zones
sont hors du cadrage de la capture.

```sh
npm run build
python scripts/audit-native-pendulum-ui.py
```

Le script sert `dist` sur un port localhost éphémère avec les headers de
`vercel.json`. Il exige Playwright Python et Chromium. Le flux crypto et le Deck
local concernent uniquement les contextes de test. Aucun hook QA, réponse
moteur injectée, changement de Lua ou lecture de main adverse n’est utilisé.
Ce scénario n’installe aucune carte adverse face verso ; la confidentialité de
ces cartes est couverte par l’[audit UI général](native-duel-ui-2026-10-07.md).
