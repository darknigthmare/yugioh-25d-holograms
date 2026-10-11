# Quatre exceptions illustrées — 11 octobre 2026

Nouveau module `src/ui/HologramTokenIllustratedExceptions.js`, export `buildTokenIllustratedExceptions(profile, helpers) → boolean`. Appeler avant `buildTokenSpiritAnatomy`. Dispatch par code exact uniquement ; les autres profils renvoient false sans produire de parties.

- Gift Fiend 93912846 : petite silhouette sombre, grande tête ronde, yeux bleus à pupille violette, bras croisés, ventre brun et trois orteils par pied.
- Metabo 49808197 : crinière brune longue, tête violet gris et paupières lourdes, quatre longues pattes recourbées, appendices buccaux et proboscis fin. Les tints bruns/violets sont directement tirés de l’illustration locale ; le registre visuel gelé possède encore la palette générique pour ce code.
- Grinder 75732623 : armure grise, épaules hautes et torse penché, tête cachée, crête de scie, gros gantelets, foret triangulaire et crochet opposé, chaînes, jambes fléchies et bottes carrées. Le foret est placé sur le côté du rig WEAPON, et le vrai crochet sur LEFT_PINCER ; cette orientation suit les conventions du rig existant.
- DarkSoul 8198621 : spectre en armure sombre marqué de vert, masque tordu, yeux et orbes rouges, grandes épaules, poings métalliques et bas déchiré flottant sans pieds humains.

Les quatre constructions sont finies et bornées, avec maximum 4 472 triangles et cinq matériaux. Quatre tests directs passent, dont le mapping du crochet et du foret au rig, le refus des faux profils par variante seule et l’absence de lecture de champs du duel. La galerie WebGL présente les quatre références locales face aux constructions : aucune erreur JavaScript et maximum cinq appels de rendu. Les empreintes des sources avant/après sont identiques dans les preuves CPU et WebGL.

Les constructions sont des interprétations procédurales stylisées ; cette preuve isolée ne démontre pas une fidélité photographique 1:1 ni le comportement du duel complet. Aucun build ou publication. Aucun module existant ni catalogue modifié ; Botanical reste à son empreinte gelée `550b8ae6973ff405c3abaf2898f74c281a942a3c939c30197d5d1326d0beb2b9`.

`construction-audit.json` contient les mesures CPU, `reference-model-gallery.png` et `.json` la capture et les mesures WebGL. Les scripts et l’archive `illustrated-exceptions.test.mjs.txt` sont dans ce dossier. `test-output.txt` provient de la dernière exécution réelle ; `manifest.json` fixe les empreintes.

## Correctif de portabilité CI

L’archive du test direct a été renommée de `illustrated-exceptions.test.mjs` en `illustrated-exceptions.test.mjs.txt` pour empêcher sa découverte automatique par `node --test`. Ses octets demeurent intacts : SHA-256 `943ba4c17bc9fa1997885a39297be1e7b4363f5a6a780b0fedbc508225205f41`. Le chemin original exécuté reste `/workspace/yugioh-token-models-2026-10-11/illustrated-exceptions/illustrated-exceptions.test.mjs`.

La couverture vivante se trouve désormais dans `tests/token-illustrated-exceptions.test.mjs`. Les quatre assertions sont conservées ; seules les quatre résolutions de modules ont été remplacées par `three` et des imports `../src/ui/...`. La nouvelle exécution ciblée réussit, 4/4 ; son log distinct est `../ci-portability-tests.txt`. Le log historique `test-output.txt`, les captures, les mesures et les modules géométriques n’ont pas été modifiés.

Ce README et le manifeste actif sont des métadonnées de livraison amendées, dérivées des originaux archivés dans `README.original-2026-10-11.md.txt` et `manifest.original-2026-10-11.json.txt`. Ces deux archives restent des copies aux octets identiques de leurs originaux exécutés, et `delivery-index.json` les distingue des métadonnées actives. Le commit antérieur conserve également la livraison originale.
