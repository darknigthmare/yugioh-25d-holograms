# Choix natifs et interface — 7 octobre 2026

**11 contrôles réussis : 8 parcours avec les scripts officiels et le WASM livré, puis 3 contrats de traduction et de confidentialité.** Aucun parcours officiel ne produit de réponse `RETRY` ni d’erreur Lua. Deux parcours d’interface — déclaration de Prohibition et coût de Tokusano Shinkyojin — passent sur le bundle de production, en 1280 × 900 et 390 × 844, sous la CSP de production.

## Changements vérifiés

Les choix `SELECT_SUM` montrent les valeurs proposées par le prompt natif, y compris les alternatives telles que « 3 ou 6 ». Les sacrifices montrent `release_param`. Une ligne suit le total courant et l’objectif exact ou minimal. Les cartes obligatoires déjà incluses sont identifiées et comptées dans ce total ; seuls les indices des cartes facultatives entrent dans la réponse. Le résumé ne décide pas de la validité : la validation du protocole existante conserve cette responsabilité.

La déclaration de carte garde la liste autorisée par les opcodes du core. Le champ de recherche reçoit le focus, accepte nom ou numéro et normalise les accents. Le plafond de 100 résultats devient explicite : Prohibition affiche « 100 sur 14339 cartes. Précisez votre recherche. ». Une recherche vide de résultats affiche un message et reste modifiable.

Une description d’effet encodée pouvait encore être résolue alors que le candidat adverse restait inconnu ou face verso. Le traducteur ne résout maintenant cette description que si l’identité peut être affichée. Le contrôle dédié vérifie qu’aucun résolveur de nom ni d’effet n’est appelé pour une carte adverse face verso, en main ou de code nul. Cette preuve porte sur le contrat de traduction ; elle ne prétend pas qu’un script officiel du parcours produit une fuite de cette forme.

L’interface accepte aussi une sélection multiple sans candidat facultatif lorsque le core inclut déjà les matériaux obligatoires et qu’une réponse vide est valide. La synchronisation d’illustration reconnaît `toggle-position` avec `publicReveal`, pour les révélations publiques qui ne constituent pas une Invocation Flip.

## Nouveaux contrôles

| Parcours ou contrat | Preuve |
| --- | --- |
| Crossout Designator | Les opcodes offrent seulement les deux codes admissibles du Deck propre ; la déclaration d’Umi bannit réellement sa copie. |
| Lullaby of Obedience | Spells et monstres Extra exclus ; un nom de catalogue absent du Deck adverse reste déclarable sans lecture de ce Deck et sans résolveur de miroir. Le coût réel de 2000 LP précède l’annonce. |
| Ancient Gear Gadget | Filtre d’archétype, de Type Monstre et exclusion du nom actuel appliqués ensemble. |
| Tribe-Infecting Virus | Seuls Aqua et Dragon sont proposés depuis les monstres face recto ; le Magicien adverse face verso n’ajoute aucun Type. |
| Magical Exemplar | Options natives non consécutives « 2 » et « 4 » ; réponse par index 1, paiement de quatre vrais Compteurs Magie, Invocation du Niveau 4. |
| Tokusano Shinkyojin | Résumé natif 0 → 6 → 10 ; sélection incomplète, doublons et indices incorrects refusés avant toute réponse. |
| Kozmo Dark Planet, retrait | Ajout d’un matériau, retrait du même matériau, ajout de 6 + 4 puis confirmation ; seuls les deux matériaux retenus sont bannis. |
| Kozmo Dark Planet, annulation | Annulation native de la procédure ; aucune carte bannie ni Invocation. |
| Préfixe obligatoire de somme | Contrat wire distinct : le total inclut le préfixe, la réponse contient uniquement les indices facultatifs ; préfixe seul accepté si min/max valent zéro. |
| Poids alternatifs et sacrifice caché | Contrat wire distinct : valeurs 3 ou 6 et poids de sacrifice 2 affichés sans résoudre l’identité cachée ; annulation de sacrifice conservée. |
| Description d’effet cachée | Contrat wire distinct : aucune résolution d’identité/description ; chaîne forcée sans réponse de passage. |

Les huit parcours officiels emploient MR5 et les règles TCG SEGOC. Les positions initiales utilisent uniquement `addCard` avant `start`, avec les données et scripts archivés inchangés. Les trois derniers contrôles sont des fixtures de messages typés ; aucun script artificiel n’est présenté comme une carte officielle.

## Parcours d’interface

Une inscription locale de 40 cartes respecte les limites de trois exemplaires. Le flux crypto déterministe est isolé au navigateur d’audit et laisse le vrai mélange produire la main prévue. Toutes les actions passent ensuite par les contrôles rendus.

1. Activer Prohibition, vérifier le focus et le compteur de résultats, chercher un terme absent, puis le numéro 46986414 et déclarer Dark Magician.
2. Activer Tokusano Shinkyojin avec Blue-Eyes (8), La Jinn (4) et Summoned Skull (6) proposés par le core. À 0 ou 6, confirmer reste désactivé et aucun coût n’est payé. À 4 + 6, confirmer devient disponible. Les deux cartes sont réellement envoyées au Cimetière, Blue-Eyes reste en main et deux cartes sont piochées.

Les [résultats GUI](artifacts/native-choice-ui-2026-10-07/report.json) enregistrent les hashes du bundle et du WASM testés, les décisions publiques et les deux tailles d’écran. La relance finale est réussie sur `/assets/index-CkdHwDWv.js`, SHA-256 `7173898cef8206cb9f0e12525376ad03e857a22e40fca40ea97c0623e0fdb9fd`. Le WASM livré conserve le SHA-256 `0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026`.

Aucun échec de requête native, erreur JavaScript ni violation CSP n’est observé. Les six captures de déclaration, de sélection pondérée et de plateau final ont été inspectées visuellement aux deux tailles ; [déclaration desktop](artifacts/native-choice-ui-2026-10-07/native-choice-declaration-1280.png) et [somme mobile](artifacts/native-choice-ui-2026-10-07/native-choice-sum-390.png) illustrent les nouveaux contrôles. L’assertion de focus attend son application au frame suivant par `openDialog`, puis vérifie strictement le champ actif. Le contrôle de cartes adverses face verso sur le Terrain ne rencontre aucune carte dans ce parcours ; les garanties de masquage proviennent donc des contrôles de traduction et des audits de duel existants.

## Reproduction

```sh
node tests/native-duel-choice-flows.test.mjs
node --test tests/native-duel-decisions.test.mjs tests/native-duel-decisions-core.test.mjs tests/native-duel-rule-windows.test.mjs tests/native-duel-summoning.test.mjs
npm run build
python3 scripts/audit-native-choice-ui.py
```

Le [journal des 11 contrôles](artifacts/native-choice-ui-2026-10-07/native-choice-tests.txt) complète le rapport GUI. La suite participe également à `npm test`. Les préfixes obligatoires et les descriptions cachées sont contrôlés au niveau du protocole ; le parcours GUI n’exécute pas ces deux formes. Cet audit n’affirme pas couvrir toutes les branches du catalogue.
