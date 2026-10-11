# Revue indépendante du correctif CI Jetons — 11 octobre 2026

**PASS pour la correction locale, la conservation des preuves et sa liste de livraison.** La première CI distante reste explicitement FAILED. Une nouvelle CI doit être observée sur le SHA correctif réellement publié ; aucun résultat de cette future exécution n’est revendiqué ici.

La revue lit sources, tests, métadonnées et logs, et compare les fichiers par octets, SHA256 et Git blob. Aucun test, build, navigateur, commit, upload ou déploiement n’a été exécuté par le réviseur. Son seul nouveau fichier suivi est ce rapport. La [revue précédente](token-models-review-2026-10-11.md) reste byte-identique, SHA256 `fcd50f26995951641b3ae20f45bfb606b3efd862c791e808316d0ab80bc7cbc8`.

## Incident et correction

La [CI du premier commit Jetons](https://github.com/darknigthmare/yugioh-25d-holograms/actions/runs/38164643761), job `114544557525`, a réellement échoué sur `ec8cae1f5534e78985f48fe116cb0b9f44b45da9`. Les [logs conservés](artifacts/token-ci-portability-2026-10-11/ci-failed-ec8cae1.txt) et le [rapport FAILED](artifacts/token-ci-portability-2026-10-11/ci-failed-ec8cae1.json) indiquent Node 24.21.0, installation/audit sécurité réussis, 2 728 tests comptés : 2 727 réussites et un échec de chargement, zéro annulation/skip/todo. Le build n’a pas été atteint.

`npm test` utilise la découverte automatique `node --test`. Elle exécutait une copie d’archive nommée `illustrated-exceptions.test.mjs`, dont quatre imports absolus désignaient le workspace du producteur. Le runner GitHub ne possède pas ce chemin. Le défaut concerne la portabilité de la suite, sans changement de modèle, de règle native ou d’application.

Le correctif sépare le script historiquement exécuté du [test portable vivant](../../tests/token-illustrated-exceptions.test.mjs). La copie devient [illustrated-exceptions.test.mjs.txt](artifacts/token-monster-models-2026-10-11/illustrated-exceptions/illustrated-exceptions.test.mjs.txt), hors découverte automatique, avec exactement les mêmes 6 211 octets et SHA256 `943ba4c17bc9fa1997885a39297be1e7b4363f5a6a780b0fedbc508225205f41`.

Le test vivant, 6 057 octets, SHA256 `c25ed906fdfce0c350bedc8f1aa6c6caa00eceb289046109834f9508d7d734d8`, ne diffère que par les quatre imports : package `three` et chemins relatifs `../src/ui/`. Les quatre tests et toutes leurs assertions restent strictement identiques. Ils protègent géométries finies et bornées, détails des exceptions, articulation Grinder et refus des états privés. Une seconde relecture statique indépendante confirme cette comparaison ; aucune assertion n’est supprimée ou affaiblie.

## Contrôles effectifs et ressources inchangées

| Preuve produite puis relue | Résultat vérifié |
| --- | --- |
| [Tests ciblés](artifacts/token-monster-models-2026-10-11/ci-portability-tests.txt) | Quatre tests portables réussis. |
| [Contrôle complet correctif](artifacts/token-ci-portability-2026-10-11/check-final.txt) | Reporter spec : 2 731 tests, 2 731 réussites, zéro échec/annulation/skip/todo ; build Vite de 146 modules. Log SHA256 `f60e4a9f94ee2d0d1d01c3b09cb677f796cd39d0049e4603ecb9bd4454354913`. |
| [Vérification du gate](artifacts/token-ci-portability-2026-10-11/verification.json) | SHA256 `2193d00e294e4aae11e373e54a439a15849e1117658c0d7ad07bd7b1c5495346` ; ses fichiers et pins correspondent aux octets présents. |
| [Gel applicatif original](artifacts/token-delivery-gates-2026-10-11/build-freeze.json) | SHA256 `1ee6840a88bdab54193f4edf6db3b09ff18524cb42ed5cf5c584fce320c3069d`, toujours identique. Les 653 fichiers gelés, 24 compilés HTML/JS/CSS et 478 assets statiques correspondent intégralement aux mêmes pins. |
| [Rapport Chromium original](artifacts/token-model-browser-2026-10-11/browser-compiled/report.json) | SHA256 `540c5c7c2aa3400f28b7ca751172c6e2e8be2d09fe0d5e2105a88a193e3e7c19`, inchangé : neuf parcours/50 captures sur ces mêmes octets compilés. |

Le snapshot avant contrôle correctif égale les 653 pins originaux ; aucun fichier de `test/` ou `tests/` n’appartient à ce gel applicatif. Ajouter le test portable n’ajoute donc pas une prétendue 654e source applicative au rapport navigateur historique. L’entrée reste `assets/index-Dm3uaqMp.js`, 974 597 octets, SHA256 `c4033f703dd088c0cb8b77a78678522c904191dad2c23d16a10c1b5df8b03a0f`.

Les trois archives natives, la façade, les 14 sources de modèles préexistantes et les assets restent inchangés. Les 1 847 fichiers historiques, 492 607 582 octets, correspondent au snapshot antérieur après restauration des deux JSON automatiquement régénérés. Dépendances inchangées : l’audit local précédemment exécuté et celui de la CI FAILED indiquent zéro vulnérabilité ; aucune nouvelle exécution locale de sécurité n’est déduite du correctif.

Le rapport Chromium est réutilisé parce que l’application et ses 24 corps compilés sont identiques. Il n’est ni réécrit ni présenté comme une nouvelle exécution navigateur, et ne prétend pas tester le nouveau fichier Node. Ses limites demeurent : modèles stylisés, 111 Jetons sans cadre vérifié, quatre commémoratives montrant seulement le duelliste, et aucun recensement mondial des impressions physiques.

## Conservation de la provenance

Les [métadonnées modèles actives](artifacts/token-monster-models-2026-10-11/delivery-index.json) sont explicitement amendées. Les **60 originaux copiés** conservent leurs octets, SHA256 et `originalExecutedPath`. Seuls trois `deliveredPath` redirigent le test, le README et le manifeste enfant vers leurs archives. Le README original SHA256 `cf8bfcc994d70555e14a4b31cf9060523dd2d55bc4bf631506079ee405e3c11c` et le manifeste original SHA256 `821940222ff1959bbf723a488aa188398b343a14b436e1c629123688d3205bc2` sont conservés intégralement. Les captures, mesures et logs historiques ne changent pas. Les versions antérieures des métadonnées dérivées restent accessibles dans le commit de base et la sauvegarde extérieure identifiée par le producteur.

## Manifest et frontière de publication

Le draft vérifié avant ajout de ce rapport est `989fef9d93bf7c3ea4059c6c4b6326c28c8dbbcb7abb85a0c5dd6fb541e0105b`, `safeToPublish: false`, **19 chemins/839 135 octets d’upserts**. La liste est exactement celle des changements Git ; tous les octets/SHA256/Git blobs correspondent. Aucun secret reconnaissable par les motifs contrôlés n’a été détecté. La seule cible Markdown alors manquante était le présent rapport, désormais créé. Le manifest doit être régénéré avec son pin, puis scellé extérieurement sans rééditer ce document.

L’unique suppression est l’ancien chemin `.test.mjs`, dont le contenu reste dans l’archive : SHA256 `943ba4c1…`, Git blob `60270dda18e62f749997689c59b2e6743f16156e`, 6 211 octets. Le helper correctif vérifie précisément ce chemin et ses anciens bytes/SHA/Git blob, impose l’arbre de base moins cette suppression plus les upserts revus et conserve tous les autres chemins/modes.

Pins de publication : local `86bfc0e359916b6b87c010e8b6384f90c5726a9d`, parent distant `ec8cae1f5534e78985f48fe116cb0b9f44b45da9`, arbre `2a76faa61692c6c9faa572808ca8dc0cff726b08`. Master reste distinct : `025f8ebd928cd8881c0e5e0d626dda63c933bf31`, arbre `19cb3d9a194f911d0042b0d88c737b45ad7d6650`.

Le publisher SHA256 `70517d532221127f14a377849ed0180125de7662e89b8111f48c218ac177980d` vérifie aussi son propre SHA, celui du présent rapport, la liste exacte et les références/octets avant et après uploads immuables et arbres. L’index est isolé, chaque sous-arbre distant est vérifié, et seul le ref de branche est avancé avec `force: false`. Aucun endpoint master, merge ou production n’est écrit. La future CI doit mesurer les vrais logs du nouveau SHA et confirmer l’arbre effectivement checkouté ; les résultats FAILED précédents demeurent conservés.
