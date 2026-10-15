# Quatre exceptions illustrées — 11 octobre 2026

Nouveau module `src/ui/HologramTokenIllustratedExceptions.js`, export `buildTokenIllustratedExceptions(profile, helpers) → boolean`. Appeler avant `buildTokenSpiritAnatomy`. Dispatch par code exact uniquement ; les autres profils renvoient false sans produire de parties.

- Gift Fiend 93912846 : petite silhouette sombre, grande tête ronde, yeux bleus à pupille violette, bras croisés, ventre brun et trois orteils par pied.
- Metabo 49808197 : crinière brune longue, tête violet gris et paupières lourdes, quatre longues pattes recourbées, appendices buccaux et proboscis fin. Les tints bruns/violets sont directement tirés de l’illustration locale ; le registre visuel gelé possède encore la palette générique pour ce code.
- Grinder 75732623 : armure grise, épaules hautes et torse penché, tête cachée, crête de scie, gros gantelets, foret triangulaire et crochet opposé, chaînes, jambes fléchies et bottes carrées. Le foret est placé sur le côté du rig WEAPON, et le vrai crochet sur LEFT_PINCER ; cette orientation suit les conventions du rig existant.
- DarkSoul 8198621 : spectre en armure sombre marqué de vert, masque tordu, yeux et orbes rouges, grandes épaules, poings métalliques et bas déchiré flottant sans pieds humains.

Les quatre constructions sont finies et bornées, avec maximum 4 472 triangles et cinq matériaux. Quatre tests directs passent, dont le mapping du crochet et du foret au rig, le refus des faux profils par variante seule et l’absence de lecture de champs du duel. La galerie WebGL présente les quatre références locales face aux constructions : aucune erreur JavaScript et maximum cinq appels de rendu. Les empreintes des sources avant/après sont identiques dans les preuves CPU et WebGL.

Les constructions sont des interprétations procédurales stylisées ; cette preuve isolée ne démontre pas une fidélité photographique 1:1 ni le comportement du duel complet. Aucun build ou publication. Aucun module existant ni catalogue modifié ; Botanical reste à son empreinte gelée `550b8ae6973ff405c3abaf2898f74c281a942a3c939c30197d5d1326d0beb2b9`.

`construction-audit.json` contient les mesures CPU, `reference-model-gallery.png` et `.json` la capture et les mesures WebGL. Les scripts et `illustrated-exceptions.test.mjs` sont dans ce dossier. `test-output.txt` provient de la dernière exécution réelle ; `manifest.json` fixe les empreintes.
