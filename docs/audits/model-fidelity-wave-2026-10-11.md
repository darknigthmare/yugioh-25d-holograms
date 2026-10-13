# Fidélité des modèles 3D — 11 octobre 2026

La vague affine les 468 modèles déjà pris en charge : 192 avatars, 240 identités natives de Jetons réparties en 42 familles, et 36 autres monstres. Les variantes imprimées de l’Atlas restent des présentations distinctes ; elles ne deviennent pas des espèces ou des cartes jouables supplémentaires.

## Modifications

Les surfaces rondes gagnent des contours lissés ; les ailes, feuilles, pétales, vêtements, mèches et pointes organiques ont un volume courbe. Les plaques métalliques conservent leurs arêtes. Les détails des personnages emblématiques et les anatomies des monstres prioritaires sont ajustés aux références disponibles. Les accessoires restent associés à leur articulation ; les animations utilisent les buffers existants.

La revue visuelle a permis de corriger l’occlusion des yeux par certaines calottes de cheveux, les pièces de main rattachées à un autre joint, les petites normales discontinues et des différences de couleur. Les studios Avatar et Jetons partagent une lumière plus neutre ; le terrain conserve son ambiance issue de sa propre référence.

Les budgets s’appuient sur les mesures du socle local `1371c5ba679d336f5df478720e6f9c4265d08e9d`, arbre `f3d7fb5c348d6cf32cacca225f7c759dd5f04ab4`. Chaque identité et pose reste sous cinq fois son ancien nombre de triangles. Les Jetons restent également sous 29 450 triangles et cinq lots de matériaux. Les augmentations portent sur les courbes et détails visibles plutôt que sur les faces planes.

## Preuves actuelles

Le contrôle global réel réussit : **2 783 tests**, aucun échec, annulation ou saut, audits des Terrains et build Vite de **146 modules**, sortie zéro. Le [journal courant](artifacts/model-fidelity-2026-10-11/coordinator/full-check.txt) et le [gel exact](artifacts/model-fidelity-2026-10-11/coordinator/build-freeze.json) épinglent 736 sources, 24 fichiers compilés et 561 assets statiques. Les 3 652 fichiers protégés (742 180 159 octets), comprenant WASM, CDB, Lua, façade, images originales et preuves précédentes, sont identiques au socle.

Les [20 galeries avant](artifacts/model-fidelity-2026-10-11/before/report.json) et [20 galeries après](artifacts/model-fidelity-2026-10-11/after/report.json) rendent réellement les **468 modèles** dans WebGL, sous les mêmes caméras, pose et lumière. **454 géométries changent** ; 14 formes simples ou neutres sont volontairement préservées. Les buffers restent identiques jusque dans leurs octets après les gestes, les sources restent stables et la destruction ramène géométries et textures à zéro. Aucun échec JavaScript ou HTTP n’est relevé.

| Groupe | Triangles maximum, Attaque/Défense | Hausse maximale par identité et pose | Lots de rendu maximum |
| --- | ---: | ---: | ---: |
| 240 Jetons, 480 poses | 20 260 | 4,936× | 5 |
| 192 avatars | 20 964 | 2,769× | 9 |
| 36 autres monstres, 72 poses | 12 932 | 4,031× | 5 |

Les [mesures des Jetons](artifacts/token-fidelity-2026-10-11/manifest.json), [avatars](artifacts/duelist-avatar-fidelity-2026-10-11/cpu-audit.json) et [monstres](artifacts/monster-fidelity-2026-10-11/refined-models.json) distinguent les constructions des identités et les poses. Le [stress contrôlé de scène](artifacts/model-fidelity-2026-10-11/stress/report.json) compare les mêmes douze monstres lourds et deux avatars en desktop 1280 et mobile 390 : 73 736 → 218 576 triangles (2,965×), appels de rendu inchangés (72 desktop, 68 mobile), buffers stables et zéro géométrie ou texture restante après destruction. En mobile, le cadrage laisse un avatar hors champ : les 14 modèles sont alloués, mais 13 sont visibles. Ce n’est donc pas une mesure de quatorze modèles entièrement visibles sur téléphone. Les quatre programmes encore présents avant la destruction du renderer sont son cache interne ; aucun zéro programme après destruction n’est prétendu mesuré. Ces timings SwiftShader ne certifient pas les FPS d’un téléphone. Les neuf parcours compilés Jetons ont réussi (50 captures, sources et 588 corps HTTP identiques avant/après). La reprise du 13 octobre confirme les mêmes octets du build et des archives. Deux tentatives de suite complète Avatar ont rendu les 192 modèles puis relevé un redessin ponctuel, au contrôle de pause puis à la transition hors écran ; leurs rapports échoués restent conservés. Les diagnostics courts passent, sans établir avec certitude la cause de ces anciens écarts. La nouvelle recette mesure la pause après une capture stabilisée et synchronise le contrôle hors écran sur l’événement public de non-intersection, avec un compteur synchrone dans le navigateur, zéro dessin et pixels identiques exigés. La [suite finale Avatar du 13 octobre](artifacts/model-fidelity-2026-10-11/browser-compiled-avatars-final-2026-10-13/report.json) réussit ses huit parcours et 52 captures, avec les contrôles stricts sur ordinateur/mobile et les gestes, progression native et transferts de collection. Le [bilan compilé courant](artifacts/model-fidelity-2026-10-11/coordinator/browser-delivery-summary-2026-10-13.json) compte **17 parcours et 102 captures**, avec 736 sources et 588 corps HTTP identiques avant/après dans chaque suite ; la [revue indépendante](model-fidelity-review-2026-10-11.md) ne sera scellée qu’après leurs résultats. Les résultats historiques restent archivés séparément et ne valent pas validation de ces modifications.

## Limites de fidélité

Les modèles restent des constructions procédurales stylisées. Une illustration frontale ne décrit pas le dos, les volumes occultés ou tous les angles d’un personnage. Les 111 identités de Jetons dépourvues d’illustration propre conservent leur limite explicite ; une image de carte génératrice est une référence indirecte. Les personnages sans référence primaire utilisent les traits documentés du catalogue. Cette vague ne certifie pas une fidélité 1:1 intégrale, ni un nombre d’images par seconde sur les téléphones réels.

Le moteur, les cartes, scripts Lua, statistiques et règles de création des Jetons restent ceux du socle natif. La nouvelle géométrie suit la présentation publique du Duel ; elle ne lit pas les identités cachées.
