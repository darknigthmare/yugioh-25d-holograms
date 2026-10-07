# Vingt reconstructions de sources aquatiques et associées — 7 octobre 2026

Le lot ajoute vingt reconstructions informées par les illustrations, après ouverture individuelle des vingt JPG locaux. Il ajoute dix-sept sources nouvellement étudiées : Umi, Umiiruka et Wetlands avaient déjà un profil étudié. Chaque carte reçoit un landmark distinct et son builder dans `FieldEnvironmentAquaticReferences.js`, intégré au vrai factory par le coordinateur. Ce résultat concerne ce lot de vingt cartes ; il ne signifie pas que les 310 restantes sont toutes terminées.

Les formes visibles servent de référence aux volumes périphériques : architectures, bassins, vagues, végétation, cristaux et appareils. Les JPG sont inchangés, leurs vingt SHA-256 correspondent exactement au commit `2bc79f1`, et les personnages, dragons, serpents, baigneurs et autres figures conservent leur illustration originale. Les dimensions, dispositions, détails et matériaux restent adaptés à la lisibilité du duel : aucune reproduction spatiale intégrale 1:1 n’est revendiquée.

## Preuves techniques

- `node --test test/field-aquatic-references.test.js` : **7/7 tests passent**, sans skip. Les vingt cartes passent par `createFieldEnvironmentGeometry(FIELD_GEOMETRY_THREE, getFieldEnvironmentForCardId(id))` ; les constructeurs de géométrie restent dans la whitelist réelle de production.
- Chaque AABB d’instance complète reste hors du corridor `[-9,-3,-18] → [9,30,17]`, et dans l’étendue horizontale 48. Positions, normales et indices sont finis et valides.
- Maximum mesuré : **209 primitives, 15 appels de rendu réels et 7 matériaux utilisés**, sous les plafonds 220/18/10. Les appels de la galerie sont relevés dans `renderer.info.render.calls`, indépendamment des compteurs déclarés par le factory.
- Les formes partagées sont instanciées. Tous les buffers, instances et matériaux utilisés sont libérés exactement une fois, y compris lors de deux appels successifs de disposal. Un test distinct trace aussi les matériaux créés puis inutilisés, notamment l’eau optionnelle des sources sèches.
- Chromium : **60 images (20 sources +20 anciens volumes +20 nouveaux volumes), zéro erreur de page ou réponse HTTP, un seul renderer réutilisé**. Après chacun des 40 rendus/disposal, `renderer.info.memory.geometries` vaut zéro. Cette mesure porte sur les géométries suivies par Three ; elle ne mesure pas toute allocation GPU extérieure à ce suivi.

## Comparaison et inspection

Le baseline est le fichier exact `git show 2bc79f1:src/ui/FieldEnvironmentGeometry.js`, archivé sans modification, avec ses cinq modules de références provenant du même commit. Une seconde copie réécrit seulement les URL d’import pour le serveur local. Avant/après emploient la même caméra, lumière, taille 600×600 et exposition pour chaque carte. Les coordonnées sont consignées dans le rapport. Le cadrage est centré sur les volumes étudiés : certains accessoires périphériques anciens sortent de ce cadre ; une colonne sombre ne prouve donc pas l’absence de géométrie dans toute l’ancienne scène.

Les cinq planches ont été ouvertes et relues. Les corrections issues de cette inspection comprennent les fenêtres de temples flottantes, les bandes cyan continues et nervures d’auvent de Magellanica, le panache de Pacifis, la teinte du dock, les roches de Perlegia, la nébuleuse granulaire, la densité des herbes et l’ouverture ovale du sanctuaire. Les nouvelles formes restent des volumes simplifiés ; les textures picturales, ornements fins, turbulences et figures ne sont pas reconstruits intégralement. Cette galerie vérifie le factory WebGL isolé, sans prétendre valider à elle seule un duel complet.

| Carte / ID | Formes observées reconstruites | Primitives | Appels | Matériaux |
| --- | --- | ---: | ---: | ---: |
| Atlantis, City of the Sea Dragon — 38391684 | Temples à degrés, tour rouge effilée percée de fenêtres, portique rouge et bassin de blocs moussus ; dragon conservé en peinture. | 57 | 6 | 5 |
| Gunkan Sushipyard Seaside Supper Spot — 62200831 | Deux jetées, 14 portiques en A, trois grues à croisillons, comptoirs et bol cerclé ; navire peint conservé. | 103 | 10 | 7 |
| Lemuria, the Forgotten City — 34103656 | Fronton triangulaire sur six colonnes, tambour à coupole, trois pavillons ronds et trois coupoles submergées. | 96 | 9 | 6 |
| Magellanica, the Deep Sea City — 26534688 | Cinq bâtiments ronds, 15 balcons et bandes cyan, trois auvents à nervures et deux longues arches supérieures. | 209 | 9 | 4 |
| Marincess Battle Ocean — 91027843 | Plateforme, enceinte courbe, trois colonnes d’eau ouvertes et ondulées, quatre torches et échelle métallique. | 49 | 11 | 7 |
| Ogdoadic Origin — 60448701 | Neuf arcs de remous noirs, pics d’horizon et nuages d’orage ; aucune reconstruction des deux serpents centraux. | 32 | 4 | 4 |
| Pacifis, the Phantasm City — 2819435 | Huit côtés ruinés, trois escaliers, douze colonnes fracturées, deux arches ouvertes et panache continu ondulé. | 127 | 15 | 5 |
| Plunder Patroll Shipyarrrd — 93031067 | Atelier jaune à deux tourelles bleues, balcon, volets, portes rouges, jetée sur pieux et berceau courbe de chantier. | 76 | 10 | 5 |
| Primeval Planet Perlereino — 77103950 | Cinq disques elliptiques à hauteurs décalées, dix fines chutes, rebords lumineux et rochers émergents. | 48 | 7 | 4 |
| Spider Web — 69408987 | Toile à 18 rayons et 126 cellules, cinq cristaux violets avec éclats secondaires et plafond de grotte. | 196 | 5 | 4 |
| Tearlaments Perlegia — 34225426 | Dalles grises fracturées, eau turquoise, gerbe diagonale effilée, gouttelettes et faibles rides ; personnages conservés. | 26 | 9 | 4 |
| The Most Distant, Deepest Depths — 8794055 | Bande diagonale de poussière colorée (4 000 petites faces dans un buffer), 130 étoiles et cinq croix lumineuses ; aucun fond marin inventé. | 141 | 5 | 3 |
| Umi — 22702055 | Quatre nappes de houle déformées, nappe inférieure continue, quatre crêtes de mousse courbes et nuages d’horizon. | 17 | 7 | 2 |
| Umiiruka — 82999629 | Trois faces de vague courbes et nervurées de mousse, trois nappes supérieures, rivage lointain et gerbe ; dauphin conservé. | 55 | 10 | 5 |
| Wetlands — 2084239 | 120 touffes de cinq lames continues (600 lames), lit végétal, sept crêtes lointaines et 28 traits de pluie ; aucun bassin ni arbre. | 156 | 5 | 5 |
| Hidden Springs of the Far East — 94317736 | Bassin naturel vert, 22 rochers périphériques, berge boisée, feuillage arrondi et vapeur basse ; baigneurs conservés. | 60 | 7 | 6 |
| Runick Fountain — 92107604 | Vasque circulaire, 64 traits gravés, deux arches courbes, deux rideaux d’eau et cristal ; figure centrale conservée en peinture. | 84 | 11 | 5 |
| The Hidden City — 5697558 | Cinq plateaux aux ravins coupés, petite cité lumineuse, cinq flèches sombres, spirale continue et chemins étroits. | 107 | 11 | 5 |
| Ursarctic Big Dipper — 89264428 | Deux longues pistes sombres, six moyeux latéraux à dix rayons, traverse arrière, passerelle et antenne fourchue. | 109 | 7 | 5 |
| Shrine of Mist Valley — 4215636 | Trois escaliers parallèles, murs latéraux, toiture rose courbe aux deux extrémités retroussées, panneaux verts et ouverture ovale. | 117 | 11 | 7 |

## Artefacts et reproductibilité

Commande : `python3 scripts/audit-field-aquatic-references.py --capture`. Chromium système et Playwright déjà installés ; aucune dépendance npm ajoutée. Le script utilise uniquement un serveur local de fichiers, la géométrie publique et les images de référence. Aucun core, WASM, script Lua, comportement de règles ni image source n’a été modifié par ce lot.

- [Rapport JSON détaillé](artifacts/field-aquatic-2026-10-07/report.json)
- [Baseline original exact](artifacts/field-aquatic-2026-10-07/baseline-2bc79f1-original.js)
- [Copie servie du baseline](artifacts/field-aquatic-2026-10-07/baseline-2bc79f1-served.js)
- [Planche 1 : source / ancien / nouveau](artifacts/field-aquatic-2026-10-07/aquatic-source-before-after-1.jpg)
- [Planche 2 : source / ancien / nouveau](artifacts/field-aquatic-2026-10-07/aquatic-source-before-after-2.jpg)
- [Planche 3 : source / ancien / nouveau](artifacts/field-aquatic-2026-10-07/aquatic-source-before-after-3.jpg)
- [Planche 4 : source / ancien / nouveau](artifacts/field-aquatic-2026-10-07/aquatic-source-before-after-4.jpg)
- [Planche 5 : source / ancien / nouveau](artifacts/field-aquatic-2026-10-07/aquatic-source-before-after-5.jpg)

Empreintes SHA-256 du lot figé :

- Module : `fc2308aafce72862a97b759cfe25b6818b38580ebde74125af3bdc5c074858b2`
- Tests : `bd0ca9ddb0a94df26f52ad5d4bfef15d355e7327945e4662b4785168bfe873ca`
- Factory mesuré : `b83bba7f70345735cdd0921503fbed0579fe71dba67e5c84fd0b849391e0b121`
- Baseline original : `5c5d86bee1abaf9244ded5e7dfed65bdb88678e15acffbd896824f502387601a`

Le rapport donne également les SHA-256 des cinq dépendances du baseline, de chaque JPG local (actuel et baseline) et des cinq captures finales. Les liens de provenance des vingt illustrations sont conservés dans les profils et le rapport.
