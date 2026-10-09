# Duel natif dans le navigateur — 8 octobre 2026

Le parcours du build final compilé passe sur **1280 × 900** et **390 × 844**, avec les headers de production. Les deux parcours ne rapportent aucune erreur de page, aucune requête native échouée et aucune violation CSP. Les contrôles réellement affichés pilotent le moteur WASM/Lua.

Les vérifications couvrent :

- La bibliothèque illustrée de **390 cartes**, dont **339 Terrains**, le filtre Terrain et la recherche par passcode.
- La recherche du catalogue natif `Dark World`, l'ajout de Broww (`79126789`) avec son illustration locale neutre, le maintien d'un Main Deck légal de 40 cartes et la persistance exacte des Main/Extra/Side après rechargement.
- Le démarrage natif, le véritable mélange initial sans modification du Deck enregistré, une Invocation Normale, une Magie de Terrain Posée et l'inspection de l'Extra Deck.
- Le tour de l'IA, le retour au joueur et la pioche suivante.
- Deux cartes adverses face verso par viewport : aucune identité, UID, illustration privée, type ou libellé privé exposé dans le DOM.
- Le corps de page contenu dans le viewport et l'absence du hook de développement `__YGO_QA__`.

Un parcours desktop distinct active **Dragon Ravine (`62265044`)**, puis son effet d'ignition. Le moteur paie réellement la défausse avant de proposer l'option et le choix du Deck. **Blue-Eyes White Dragon (`89631139`)** rejoint le Cimetière, le coût reste payé, l'action une fois par tour disparaît et le Cimetière public s'affiche.

Les trois audits datés du 8 octobre utilisent le même build final, sans recompilation pendant les parcours. Les sept fichiers essentiels du manifeste final ont été comparés aux réponses réellement servies : HTML, entrée, CSS, façade native, catalogue natif, registre des environnements et vue réelle. Le wrapper, le WASM, le CDB sérialisé et l'archive Lua portent le total à **11 fichiers**. Leurs empreintes concordent entre les trois audits et avec `dist`. La [comparaison finale](artifacts/native-duel-ui-2026-10-08/final-build-comparison.json) archive cette vérification et les sources des trois runners.

Les audits général et Pendule conservent les quatre jeux d'empreintes HTTP/local, avant/après, avec `immutableCompiledSnapshot: true`. Le runner des trois vues relit les mêmes réponses après son dernier cycle, compare toutes les valeurs et archive `buildUnchangedDuringAudit: true` ; son schéma de provenance 3 sépare explicitement l'empreinte du HTML de celle de l'entrée JavaScript. La CSP HTTP correspond exactement à `vercel.json` : compilation WASM autorisée par `'wasm-unsafe-eval'`, sans JavaScript `'unsafe-eval'`.

| Fichier servi | Octets | SHA-256 |
| --- | ---: | --- |
| `/index.html` | 35408 | `30bf78a66cda62f4a4b7b6617ad330ee2c983e5564a51dfff539882b75d3baaf` |
| `/assets/index-DNwe3FSS.js` | 598690 | `38c428237545d8290e07229c5efdda93441dd1088234c31e64aa6ef3f8b59321` |
| `/assets/index-BbUkbKmn.css` | 82371 | `71afb732ab7152dc319dfb6b72812913e23121c24f251ef80e0b69c61e0e749e` |
| `/assets/NativeDuelGame-DocEeHOq.js` | 83510 | `045f647667c998076ba0d3e63433f3015c27cae705bf17546faf49f708e144fb` |
| `/assets/NativeCardCatalogue-DYOc9sug.js` | 54064 | `52372b0fa09af406267d3091d1c476e20572bc62b9f4ecb499f19bb9dd6d1e2b` |
| `/assets/FieldEnvironmentRegistry-Bv70irwA.js` | 595263 | `bfc14aa98ac8ac1e7ddbdfed7949539c51a6e6b9e3866c0af7190a6d084db062` |
| `/assets/RealDuelView-P3kgZYMk.js` | 135163 | `8eff318aa606a12673082fdc532b2640f66eebb177b0849f2103370e0fe4e463` |
| `/assets/ocgcore-CUv6jKK5.js` | 1746 | `2dc99ca041097a1040c9a3cf509ff7f8c7a25e6dda9999b961bbea6649f582e3` |
| `/native/ocgcore.sync.wasm` | 935745 | `0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026` |
| `/native/card-data.json` | 7601872 | `4d663cc458934cff2b944204f641838f03803bffac3d12106082171d9dee5d8d` |
| `/native/scripts.json` | 35549984 | `a4f1769decc033e95e7033df8475c6cf7b9efa110fe2a662963c22913566b45f` |

Les **cinq captures** ont été ouvertes pour inspection : [builder desktop](artifacts/native-duel-ui-2026-10-08/native-builder-1280.png), [builder mobile](artifacts/native-duel-ui-2026-10-08/native-builder-390.png), [duel desktop](artifacts/native-duel-ui-2026-10-08/native-duel-1280.png), [duel mobile](artifacts/native-duel-ui-2026-10-08/native-duel-390.png) et [Dragon Ravine](artifacts/native-duel-ui-2026-10-08/native-ravine-cost.png). Le catalogue et les décisions restent lisibles. Les trois libellés d'action du duel desktop sont serrés ; les contrôles audités fonctionnent. Sur mobile, des zones sont hors du cadrage initial et le message de défilement reste visible ; la capture montre la fenêtre accessible, pas tout le plateau simultanément.

La fixture est un Deck légal enregistré avant le démarrage dans un contexte navigateur isolé, avec un flux initial de hasard déterministe. Aucun hook QA, réponse moteur injectée, changement d'état natif après démarrage ou lecture de main adverse n'est utilisé. Le parcours confirme les actions décrites et leur intégration ; il ne certifie pas toutes les branches de règles ni une reproduction graphique intégrale 1:1.

```sh
python scripts/audit-native-duel-ui.py
```

La commande suppose `dist` déjà compilé, Playwright Python et Chromium. Elle sert ce build sur un port localhost éphémère avec les headers de `vercel.json`. [Rapport JSON complet](artifacts/native-duel-ui-2026-10-08/report.json).
