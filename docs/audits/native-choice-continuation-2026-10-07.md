# Choix officiels supplémentaires — 7 octobre 2026

**13 parcours officiels réussis avec le WASM livré, sans erreur Lua ni réponse RETRY.** Les données CDB et les scripts archivés restent inchangés. Les positions initiales passent uniquement par l’API native avant le démarrage ; aucun script artificiel ni injection après `start` n’est utilisé.

## Frictions reproduites et corrections

L’effet officiel de **Hazy Flame Sphynx** produit `SELECT_OPTION` avec les descriptions système 70, 71 et 72. Le traducteur les affichait toutes sous « Choix de l’effet » : l’utilisateur ne pouvait distinguer une déclaration Monstre, Magie ou Piège. Le [test avant correction](artifacts/native-choice-continuation-2026-10-07/type-options-before.txt) et la [capture du bundle précédent](artifacts/native-choice-continuation-2026-10-07/before-ui/field-choice-kind-1280.png) reproduisent cette ambiguïté.

Le traducteur donne désormais les libellés **MONSTRE**, **MAGIE** et **PIÈGE** aux trois descriptions système. Un résolveur personnalisé garde sa priorité. Les réponses restent les indices 0, 1 et 2 ; les trois tests Hazy exécutent chacune des branches officielles et vérifient l’Invocation du monstre FEU après l’envoi du dessus de Deck approprié au Cimetière.

La déclaration de Type d’**Array of Revealing Light** affichait aussi « Dragon — Niv. — — Main » : les énumérations sans `label` déclenchaient le rendu destiné aux cartes. La [capture avant](artifacts/native-choice-continuation-2026-10-07/before-ui/field-choice-race-1280.png) et son [rapport](artifacts/native-choice-continuation-2026-10-07/before-ui/report.json) consignent ce défaut. Les candidats `ANNOUNCE_RACE` et `ANNOUNCE_ATTRIB` reçoivent maintenant un libellé explicite égal à leur nom. Les masques et les règles de sélection ne changent pas.

Ces deux corrections sont limitées à `NativeDuelDecisions.js`. Les choix déjà validés, les règles du core et la façade ne sont pas modifiés pour ce lot.

## Parcours exécutés

| Interaction officielle | Vérification dans le core |
| --- | --- |
| Hazy Flame Sphynx, Monstre | Les trois catégories sont distinctes ; index 0, monstre réellement envoyé depuis le Deck, puis Invocation FEU. |
| Hazy Flame Sphynx, Magie | Index 1, Umi envoyé depuis le Deck, puis Invocation FEU. |
| Hazy Flame Sphynx, Piège | Index 2, Mirror Force envoyé depuis le Deck, puis Invocation FEU. |
| Array of Revealing Light | Dragon déclaré ; une Invocation normale Dragon du tour disparaît des commandes d’attaque, Sangan conserve son attaque. |
| The Hidden City, Attaque | Position choisie parmi les deux positions face recto ; le Subterror posé est révélé en Attaque. |
| The Hidden City, Défense | Même vrai prompt, réponse Défense ; le monstre est révélé sans message d’Invocation Flip. |
| Adamancipator Laputite | Trois cartes choisies parmi quatre Adamancipator ; elles seules sont placées au-dessus après le mélange, dans l’ordre humain. |
| Way Where There’s a Will | Index 2 annonce trois excavations ; une carte choisie reste en main, une carte de la main rejoint les autres au bas du Deck, dans l’ordre choisi. |
| Materiactor Meltthrough | Six cartes réellement excavées et remises au-dessus dans l’ordre non trivial 5, 1, 4, 0, 3, 2. |
| Doll House | Deux paires distinctes Cimetière/Deck, prompts d’ajout/retrait réels ; les deux copies du Deck sont Invoquées en Niveau 6 TÉNÈBRES, les cibles du Cimetière restent en place. |
| Miracle Restoring | Deux Power Stone acquièrent chacune trois vrais compteurs ; allocation 0 puis 2, coût payé avant la cible et résurrection de Dark Magician. |
| Herald of the Abyss | Paiement de 1500 LP avant Type et Attribut ; l’adversaire envoie uniquement le Dragon LUMIÈRE admissible, son Magicien reste. |
| DNA Checkup | Deux Attributs distincts annoncés par l’adversaire ; doublons et sélection incomplète refusés, confirmation de la carte posée puis deux pioches pour le bon joueur. |

Le [journal](artifacts/native-choice-continuation-2026-10-07/native-choice-tests.txt) expose les 13 résultats. Les [preuves de protocole](artifacts/native-choice-continuation-2026-10-07/native-protocol.json) enregistrent le hash du WASM et des scripts utilisés, les fixtures déclarées avant démarrage, les types/quantités/réponses natives et les compteurs RETRY/Lua. Elles ne recopient aucune identité cachée depuis un prompt ou une main/un Deck adverse.

## Interface et reproduction

Le script `audit-native-field-choice-ui.py` emploie un Deck légal de 40 cartes et un flux crypto isolé au navigateur. Il suit trois interactions avec des clics publics : Type d’Array, révélation Défense par Hidden City, puis Double Summon, sacrifice du monstre révélé et catégorie de Hazy Sphynx. Le préflight sur le bundle précédent complète les deux premières interactions et reproduit l’ambiguïté des catégories dans la troisième.

Les trois parcours passent dans Chromium **1280 × 900 et 390 × 844** sur le bundle de production final `/assets/index-CkdHwDWv.js`, SHA-256 `7173898cef8206cb9f0e12525376ad03e857a22e40fca40ea97c0623e0fdb9fd`. Le [rapport GUI](artifacts/native-field-choice-ui-2026-10-07/report.json) consigne le WASM exact `0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026`, la CSP de production et zéro erreur de page, requête native échouée ou violation CSP. Les huit captures finales ont été ouvertes et inspectées : les énumérations affichent leurs seuls noms, les deux positions face recto se distinguent et les trois catégories restent lisibles aux deux tailles. La [position desktop](artifacts/native-field-choice-ui-2026-10-07/field-choice-position-1280.png) et les [catégories mobile](artifacts/native-field-choice-ui-2026-10-07/field-choice-kind-390.png) montrent les contrôles testés.

Une première relance mobile a expiré avant démarrage, lorsque Playwright attendait la stabilité du bouton de mode natif. Une nouvelle exécution complète de cet audit, lancée seule sur le même bundle, passe aux deux tailles sans changement de script, d’assertion ou de produit. La cause de cette expiration isolée n’a pas été établie.

```sh
node tests/native-duel-choice-continuation.test.mjs
node --test tests/native-duel-choice-continuation.test.mjs tests/native-duel-choice-flows.test.mjs tests/native-duel-decisions.test.mjs tests/native-duel-decisions-core.test.mjs tests/native-duel-rule-windows.test.mjs tests/native-duel-summoning.test.mjs
python3 scripts/audit-native-field-choice-ui.py
```

Toute modification du bundle demande une nouvelle exécution GUI pour lier les captures au SHA exact testé. Ces 13 parcours ne couvrent pas toutes les branches des cartes ; aucun nouveau `SORT_CHAIN` n’est revendiqué. L’ordonnancement des déclenchements simultanés reste couvert par la suite de fenêtres natives existante.
