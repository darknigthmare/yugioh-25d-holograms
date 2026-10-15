# Comparaison visuelle des modèles — 11 octobre 2026

La preuve de référence est terminée : **468 modèles rendus en WebGL réel**, soit 240 codes de Jetons, 192 avatars et 36 autres monstres. La comparaison finale des nouveaux modèles et les parcours du build compilé sont réalisés séparément ; aucun résultat futur n’est attribué à cette référence.

## Méthode et référence avant modification

Le [script de galerie](../../scripts/audit-model-fidelity-2026-10-11.py) ne démarre aucun Duel et ne reçoit aucun objet Game. Il importe les vrais constructeurs dans un navigateur Chromium avec Three.js et SwiftShader. Un seul renderer est utilisé par planche ; chaque modèle conserve la même pose neutre, les mêmes lumières et la même caméra enregistrée par ID avant et après les modifications. Les illustrations originales placées en vignette sont distinguées des portraits SVG du catalogue.

La référence est extraite du commit `1371c5ba679d336f5df478720e6f9c4265d08e9d`, avant les éditions : 168 sources immuables sont indexées dans le [manifeste de référence](artifacts/model-fidelity-2026-10-11/baseline-manifest.json). Les 18 modules réellement utilisés par la galerie sont aussi conservés octet pour octet avec un suffixe `.txt`, dans le [manifeste des copies](artifacts/model-fidelity-2026-10-11/before-sources-manifest.json). Les illustrations et la dépendance Three.js sont lues dans leurs pools locaux existants.

Le [rapport avant](artifacts/model-fidelity-2026-10-11/before/report.json), SHA-256 `5d120f17a238ce7b423b2957587b3287d8a43f3b88046493357adae24f046698`, passe 20 planches : dix pour les 240 Jetons, huit pour les 192 avatars et deux pour les 36 monstres. Les 18 sources restent identiques avant/après l’exécution. Aucun message d’erreur navigateur, HTTP ou WebGL n’est enregistré. Les caméras, bornes, parties anatomiques, empreintes des attributs, appels GPU et mesures sont conservés par modèle.

| Groupe | Modèles | Triangles avant, pose neutre | Maximum d’appels de rendu |
| --- | ---: | ---: | ---: |
| Jetons | 240 | 712–5 890 | 5 |
| Avatars | 192 | 5 734–9 764 | 9 |
| Autres monstres | 36 | 1 500–5 980 | 5 |

Le contrôle des buffers compare leurs références, leurs versions **et leurs octets** avant/après une vraie action du contrôleur d’animation. Chaque destruction laisse zéro géométrie et zéro texture allouées au renderer. Une [mesure CPU distincte](artifacts/model-fidelity-2026-10-11/baseline-cpu-two-poses.json) conserve les 552 constructions des 276 hologrammes en attaque et en défense ; le maximum ancien des Jetons est de 6 458 triangles en défense. Les budgets doivent donc être comparés par code et par pose.

## Contrôle des détails et limites

Les références primaires locales de personnages, les 120 illustrations exactes de Jetons et les cartes emblématiques servent à juger les volumes, silhouettes, vêtements, cheveux, ailes, griffes et matériaux. Les portraits SVG restent des représentations du catalogue et ne constituent pas des sources officielles supplémentaires.

Une inspection provisoire a révélé que le nouveau dôme de cheveux masquait les yeux des personnages. La découpe avant a été corrigée, puis une paire de vues frontales contrôlées de douze personnages a confirmé la disparition de la bande de cheveux et la lisibilité des iris, sourcils et mâchoires. Les retours sur les museaux des dragons, le visage de Floraison de Cendres, la queue de Slifer et les pattes de Kuriboh/Sangan ont également été confrontés aux cartes originales avant la capture finale.

Les modèles sont des interprétations procédurales. Les 111 codes de Jetons sans illustration exacte et les apparences de personnages non couvertes par les références primaires retenues ne peuvent être certifiés en fidélité 1:1. Une illustration plane ne renseigne pas toutes les surfaces arrière ou la profondeur. L’augmentation des triangles seule ne certifie aucune ressemblance.

Les temps SwiftShader mesurent une comparaison contrôlée du rendu logiciel. Ils ne garantissent pas un nombre d’images par seconde sur un téléphone physique. La [fixture de charge](../../scripts/audit-model-fidelity-stress-2026-10-11.py) conserve douze hologrammes et deux avatars simultanément, avec les mêmes IDs sélectionnés parmi les candidats les plus lourds, sur desktop et mobile. Elle est synthétique et ne revendique pas une combinaison de cartes légalement atteignable dans un Duel.

## Build compilé

Le [nouveau wrapper navigateur](../../scripts/audit-model-fidelity-browser-2026-10-11.py) réutilise les deux drivers historiques sans les modifier. Il transmet la liste des assets statiques du nouveau gel au driver avatars, qui vérifiait auparavant un pool plus petit. La reprise du 13 octobre adapte explicitement sa recette de suspension : première capture stabilisée avant la mesure, attente de l’événement public de non-intersection, puis fenêtre de 350 ms mesurée dans le navigateur. Le critère demeure strict : aucun dessin et pixels identiques, sans tolérance sur les compteurs. L’instrumentation est installée avant le démarrage, délègue les APIs originales et n’accède à aucun objet Game. Les versions exécutées des wrappers et les rapports échoués sont conservés séparément ; les diagnostics n’ont pas prouvé la cause exacte des deux redessins historiques. Les vérifications strictes des sources, corps HTTP, CSP, confidentialité et Duels natifs restent actives. Les suites Jetons et avatars utilisent des dossiers de sortie séparés ; le wrapper enregistre ses propres empreintes et celles des drivers avant/après.

Les premiers réglages du script isolé, dont la libération prématurée du canvas et le favicon absent du serveur de référence, sont conservés comme diagnostics extérieurs. Ils ne sont pas présentés comme des validations. Les preuves historiques de la précédente livraison ne sont pas réécrites.

## Résultats de la reprise du 13 octobre

La comparaison finale rend les 468 modèles dans 20 nouvelles planches, aux mêmes caméras que la référence : 454 géométries changent et 14 formes simples ou neutres restent préservées. Les octets des buffers demeurent stables après gestes, sans erreur et sans géométrie ou texture restante après destruction. Le stress conserve 14 modèles construits ; les 14 sont visibles en desktop et 13 en mobile. Ses appels couleur sont 72 et 68, inchangés avant/après. Les quatre programmes mesurés avant renderer.dispose() sont son cache interne ; aucun zéro programme post-dispose n’est prétendu mesuré.

Les [neuf parcours Jetons](artifacts/model-fidelity-2026-10-11/browser-compiled-tokens/report.json) et [huit parcours Avatar finaux](artifacts/model-fidelity-2026-10-11/browser-compiled-avatars-final-2026-10-13/report.json) réussissent, avec 102 captures. Les 736 sources et les 588 corps HTTP concordent exactement avant/après dans chacune des suites. Les états de pause et de non-intersection utilisent les compteurs synchrones, zéro dessin pendant 350 ms, des pixels identiques, une reprise réelle et aucun clear après le nouvel événement de non-intersection. Le balayage final rend réellement les 192 avatars en 104,5 secondes. Les deux anciens échecs et les diagnostics, dont celui invalide, sont conservés avec leur provenance ; aucune cause historique incertaine n’est présentée comme prouvée.
