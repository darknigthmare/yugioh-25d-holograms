# Preuves navigateur compilées — Jetons 3D, 11 octobre 2026

**PASS final : neuf parcours, 50 captures, 367 présentations inspectées, 364 modèles effectivement dessinés.** Cette exécution utilise le build figé servi localement avec sa CSP de production ; elle est distincte d’une validation Vercel.

- [Rapport brut](report.json) : toutes les assertions et observations publiques.
- [Gel original](build-freeze.json) : 653 sources, 24 fichiers compilés, trois archives natives et 478 assets statiques.
- [Catalogue exact](catalogue-snapshot.json) : 240 identités natives de Duel, 120 variantes illustrées, quatre commémoratives et trois repères sans modèle.
- [Log original](logs.txt) et [index des empreintes](delivery-index.json).
- [Compte rendu détaillé](../../../token-model-browser-2026-10-11.md).

Les 505 corps HTTP sont tous servis avec succès et identiques aux fichiers locaux avant/après. Le pilote, son helper et cinq preuves avatars historiques restent inchangés. Aucune erreur HTTP, JavaScript, CSP, requête native ou console inattendue. Le seul contexte Chromium avec `--disable-webgl --disable-3d-apis` conserve exactement deux messages « A WebGL context could not be created » et un « Error creating WebGL context. », avec fallback utilisable.

Les fixtures natives installent avant bootstrap uniquement un Deck légal Main 40 / Extra 1 / Side 0 et un flux crypto déterministe. L’interface valide réellement Advanced. Les effets Scapegoat, Tetherwolf, Creature Swap, Rite of Aramesir, Dark Hole et l’Invocation Link utilisent ensuite les vrais contrôles publics. Aucun Jeton dans le Deck, aucune injection post-démarrage, aucun objet Game/QA ni lecture privée de main adverse.

L’Atlas vérifie les 367 identifiants, le vrai dessin WebGL, le canvas unique, les références, filtres, recherche, pagination, souris/tactile/clavier, poses, mouvement réduit, focus, import différé, perte/reprise du contexte et nettoyage. Les scénarios natifs prouvent quatre Sheep Tokens distincts, leurs images et caractéristiques, la disparition hors des piles, le matériau Link et le changement de contrôle public. Les quatre commémoratives affichent seulement la silhouette du duelliste imprimé, sans code/statistique de Duel. Les modèles sont stylisés ; les cadres non documentés restent neutres et les références de générateur sont signalées.

Captures utiles :

- [Quatre vrais Sheep Tokens, desktop](tokens-native-four-sheep-1280.png) et [mobile](tokens-native-four-sheep-390.png).
- [Jeton MPB natif](tokens-native-tetherwolf-and-token.png) puis [matériau Link](tokens-native-link-spider-token-material.png).
- [Changement de contrôle](tokens-native-creature-swap-opponent-token.png).
- [Adventurer Token natif](tokens-native-adventurer-created.png).
- [Commémorative Kaiba](tokens-atlas-commemorative-LDK2-ENT02-1280.png).
- [Fallback WebGL provoqué](tokens-atlas-webgl-unavailable-reference.png).

Empreintes : gel `1ee6840a88bdab54193f4edf6db3b09ff18524cb42ed5cf5c584fce320c3069d` ; entrée `c4033f703dd088c0cb8b77a78678522c904191dad2c23d16a10c1b5df8b03a0f` ; pilote `7941755771e8745ad4ea17f5d8df2cb86d81cc8e5904a860f7b8f9dd258159ca` ; rapport `540c5c7c2aa3400f28b7ca751172c6e2e8be2d09fe0d5e2105a88a193e3e7c19`.

Les 53 fichiers originaux (50 PNG, rapport, log, gel) sont également préservés octet pour octet dans `/workspace/yugioh-token-browser-final-2026-10-11/`. Les diagnostics source, tentatives FAILED et parcours pré-durcissement restent extérieurs ; aucune capture d’échec n’est incluse ici.

Reproduction future depuis la racine du dépôt, avec le dist correspondant au gel et une nouvelle sortie distincte des preuves scellées :

```sh
python -u scripts/audit-token-models-browser.py --phase compiled --stage full --freeze docs/audits/artifacts/token-model-browser-2026-10-11/browser-compiled/build-freeze.json --expected-entry-sha256 c4033f703dd088c0cb8b77a78678522c904191dad2c23d16a10c1b5df8b03a0f --output /tmp/yugioh-token-model-browser-reproduction
```
