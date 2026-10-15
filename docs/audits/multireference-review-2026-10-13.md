# Revue indépendante des modèles multi-références — 13 octobre 2026

## Décision et périmètre

**Revue scellée favorable (safeToPublish: true) pour le candidat exact ci-dessous.** Les contrôles locaux de source, géométrie, build, navigateur et charge sont refermés. La correction de légende PV325 et le lien obligatoire candidat → rapport → manifeste ont été vérifiés. Aucun résultat distant n'est prétendu dans cette revue.

```json
{
  "safeToPublish": true,
  "candidateSha256": "3067ee7ad4b32703f3225719f8408c24b7c67479b4be1bae1607e62859aced73",
  "publicationHelperSha256": "057d6e2898ca09a6312e0f583c41c50b6095e45f0fa37234b402dac27a18e968"
}
```

Cette vague améliore **42 identités sur 468 modèles** : huit avatars, 18 monstres et 16 Jetons. Quatorze scans de cartes Jeton imprimées sont ajoutés comme références visuelles vérifiables. Elle ne termine pas la reproduction spatiale 1:1 de toute la collection et ne constitue pas une nouvelle implantation de l'intégralité des règles TCG. Les visages, proportions et surfaces cachées restent en partie stylisés ou reconstruits.

Le réviseur a lu les différences de source, tests, recettes, registres, images et journaux produits par les autres agents ; il a recalculé les empreintes des preuves et fichiers candidats. Il n'a lancé ni test, build, navigateur, moteur WASM, requête distante ou publication. Ses seuls fichiers édités sont ce rapport et le snapshot extérieur initial. Une seconde lecture statique indépendante du helper et du candidat confirme la limite de branche et l'identité de leurs fichiers.

## Socle et historique protégés

Le HEAD local reste baabe9f94863159053e4ad37be4c038104da5e23. Le parent distant attendu est d9323b7cfb1a55a2028ee3acb586db08f80b3d7c, avec le même arbre 8d4bf15626abcf2c721ee6b2ba3b59fd301880f4. Le master attendu est 025f8ebd928cd8881c0e5e0d626dda63c933bf31, arbre 19cb3d9a194f911d0042b0d88c737b45ad7d6650. Les identifiants distants sont des entrées à recontrôler par le coordinateur, et non une consultation distante du réviseur.

Le snapshot /workspace/yugioh-multiref-protected-baseline-2026-10-13.json, **1 311 263 octets**, SHA256 d0990366dcc94101768748c3edb8044867e6261a94ef7d7f4c1b04a0b4badeaf, provient des blobs Git : **4 422 fichiers, 831 840 252 octets**. Il classe **4 013 fichiers protégés, 823 295 108 octets**. Leur dernière vérification indépendante retrouve exactement tous les octets : assets et preuves historiques, documentation scellée, fixtures originales, vendor, dépendances et modules du core natif. Les deux JSON natifs réécrits par les vérifications ont été restaurés au HEAD avant ce contrôle final.

Le core WASM, la base de cartes et les scripts Lua gardent respectivement les SHA256 0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026, 4d663cc458934cff2b944204f641838f03803bffac3d12106082171d9dee5d8d et a4f1769decc033e95e7033df8475c6cf7b9efa110fe2a662963c22913566b45f. Aucune nouvelle lecture de données cachées, modification de règle native, statistique ou identité de carte n'est ajoutée.

## Provenance et fidélité

Les [avatars](multireference-avatars-2026-10-13.md) disposent de **92 images conservées, 88 utilisées et quatre exclues**. Les URL d'origine, corps téléchargés, SHA256, dimensions, versions, régions et groupes de vues concordent. Les sources Konami/TV Tokyo et photographies licenciées sont distinguées. La veste verte de Joey est corroborée par une image officielle de 240 × 180 pixels ; elle ne documente pas son dos. Le costume antique d'Atem reste distinct de Yami moderne. Le produit Kotobukiya **PV325 / 190526065888** est attribué par son fabricant à **Yugi Muto**, distinct du PV324 Yami Yugi : la légende de la comparaison finale est corrigée en conséquence, sans remplacer l'image ni modifier le modèle.

Le dossier [monstres](multireference-monsters-2026-10-13.md) conserve **83 illustrations de cartes, dont 47 nouvelles**, et **128 photographies licenciées correspondant à 126 corps binaires distincts**. Quatre modèles n'ont qu'un art propre ; 14 modèles ont plusieurs illustrations. Les 90 photos utiles à l'anatomie sont séparées des 38 images de contexte, effets ou publicité. Les trois promotions identiques des Dieux ne comptent pas pour trois vues. Les 175 nouveaux GET repris avec mesure HTTP donnent un statut 200, un MIME image et les mêmes corps que les premiers téléchargements.

La recherche [Jetons](multireference-tokens-2026-10-13.md) couvre 95 noms / 111 codes auparavant sans art propre. Les sept réponses 429 initiales et leur reprise bornée restent enregistrées. Les **14 scans imprimés acceptés** sont identiques, octet par octet, aux copies publiques ajoutées ; leur nom, type, attribut, niveau, caractéristiques et générateur permettent une association de présentation. Aucun passcode imprimé n'est certifié par cette association. Les comptes historiques de l'API, **106 cartes / 120 images**, restent inchangés ; **97 codes natifs** restent sans référence propre acceptée.

Une réimpression, un recadrage ou un éclairage différent de la même composition n'est pas un angle supplémentaire. Les photos de sculptures licenciées montrent une adaptation tridimensionnelle et ne constituent pas un turnaround officiel de l'anime. Les scans frontaux ne certifient pas les surfaces arrière. Les variantes et limites restent dans les inventaires, sans fusion arbitraire des costumes.

## Corrections relues et essais conservés

Les drapés avatars ont été corrigés pour orienter leurs grandes faces vers l'extérieur, y compris les pans miroirs et caps ; les matériaux FrontSide peuvent ainsi montrer les dos. Les boucles de Kaiba sont maintenant portées par une tige de botte suffisamment haute. Les dorsales d'Obelisk et le menton/crocs de Dual Avatar suivent le BODY. Les trois mâchoires du Dragon Ultime partagent des axes neutres compatibles avec le rig. L'audit CPU avatars utilise désormais des copies indépendantes des octets, avec contrôle séparé des identités et versions des attributs ; les 192 modèles avant/après ont effectivement été remesurés.

Le profil géométrique historique TokenMonsterModelProfiles.js est restauré byte pour byte au HEAD. Le nouveau module de références applique un overlay uniquement dans les couches de présentation/combat, avec garde Object.hasOwn. Les blocs natifs, imprimés et commémoratifs restent identiques. Les seules modifications du catalogue des duellistes concernent les couleurs de pantalon et de chaussures de Jaden et Yuya. Noms, identifiants, alias, conditions de déblocage et progression sont préservés.

Le premier contrôle global a échoué sur trois attentes devenues inexactes : anciens landmarks de Faith/LAN, nombre live de références génératrices et import dans le profil pur. Les corrections conservent les assertions de famille, activation, finitude et budget ; le compteur live distingue 14 références imprimées et 96 génératrices tout en conservant les 110 de l'archive. Ce journal d'échec reste archivé. Un second contrôle réussi précède le correctif Bomb et ne vaut pas validation finale.

La croûte de Bomb était enfouie dans son noyau arrondi malgré des invariants techniques réussis. Le correctif minimal conserve position et échelle, réduit le détail du noyau et retire 108 triangles. Le test sur les vrais meshes reproduit **zéro croûte visible avant**, puis **132 / 225** rayons atteignant les panneaux et 82 interstices de face, **125 / 225** et 75 interstices en trois quarts. Les nouvelles captures inspectées montrent les plaques et fractures. Les anciens fichiers, journaux et mesures sont conservés dans un dossier avant correction ; Bomb utilise désormais **5 912 triangles ATK**. Le premier dispatch G Golem erroné, détecté par la mesure de tous les codes, reste également documenté.

## Vérifications locales finales

Le [gel du coordinateur](artifacts/multireference-delivery-2026-10-13/coordinator/yugioh-multireference-build-freeze-2026-10-13.json), **262 420 octets**, SHA256 a6b09fd0912636c84243b3b3136fac5f5db217020c148adeb8bd316f73ac735a, correspond à **751 sources, 323 entrées de validation, 24 fichiers compilés et 575 assets statiques**. Tous ont été recalculés indépendamment sans divergence. Le [contrôle complet final](artifacts/multireference-delivery-2026-10-13/coordinator/yugioh-multireference-full-check-2026-10-13.txt), **281 841 octets**, SHA256 86923a08df51e654610c34f532792d73a4d1788b33959eb6dd8f51691adbf14f, réussit **2 798 tests**, zéro échec, annulation, ignore ou todo ; **147 modules** sont compilés. Les suites ciblées ne sont pas additionnées une seconde fois à ce total.

La [galerie finale](artifacts/multireference-qa-2026-10-13/source-after-retry2/report.json), SHA256 9ffd23eb3b86037957f89b97b114c81b4fd1f6ae95e94d1a0ee16d5daaec72df, mesure **240 Jetons, 192 avatars et 36 monstres**, sur les 167 fichiers src stables. Elle retrouve exactement 42 signatures modifiées et 426 préservées. Les six rapports ciblés couvrent **44 identités uniques et 352 vues** : 176 avant et 176 après, aux mêmes quatre caméras, sans doublon. World Legacy 69811711 et Sheep 73915052 restent identiques dans chaque angle. Les planches finales des huit avatars, des deux dragons spécialisés et de Bomb ont été inspectées ; les améliorations sont visibles et les limites de stylisation restent explicites.

Les **14 388 906 normales** respectent la tolérance de longueur 0,0002, sans valeur hors tolérance. Tous les buffers restent finis et stables pendant les gestes. Le maximum est **4,986667 fois la fixture originale du 11 octobre par identité et pose**, inférieur au plafond ×5 ; ce plafond n'est jamais multiplié à partir du modèle déjà affiné. Les plafonds de cinq lots couleur pour les hologrammes et neuf pour les avatars sont conservés. La mesure d'ancrage de Faith retrouve 0,077291, inférieur au rayon nominal de manche 0,122, sans séparation visible ; elle n'est pas présentée comme preuve complète de collision volumétrique.

Les rapports du build compilé [Jetons](artifacts/multireference-qa-2026-10-13/browser-compiled-tokens/report.json), SHA256 3e4113071eecd7428306735c3a02c24c1f26c010aaec6a30f8c96a1a49cd4fc0, et [avatars](artifacts/multireference-qa-2026-10-13/browser-compiled-avatars/report.json), SHA256 d701aa43806fc3e2c178a78404c31d234da4e76332b0cc340b4819ece93c8741, réussissent **9 + 8 parcours et 50 + 52 captures**. Les 102 PNG ont été recalculés. Chaque suite retrouve les **751 sources et 602 corps HTTP exacts avant/après** : 24 compilés, 575 statiques et trois natifs. L'entrée est assets/index-CoVIKYEb.js, **974 601 octets**, SHA256 7921ecd5d82732d65f780fc7f43bf2ecd0544c15f7552228ce9135618ccd8e34.

Les parcours utilisent les contrôles publics et les vrais Duels natifs : Scapegoat et destruction des Sheep, Tetherwolf et matériel Lien, Creature Swap, Rite de l'Aramesir, avatars humains, invocation et combat. L'atlas rend ses 364 modèles et les 192 avatars sont parcourus. Les fenêtres de suspension vérifient strictement zéro clear durant 350 ms, pixels identiques, reprise et nouveau callback d'intersection négative, en 1280 et 390 pixels. Pertes de contexte, destruction, fichiers d'import/export, persistance et fallback sans WebGL sont couverts. Aucun message page/HTTP/CSP/native/console inattendu n'est relevé ; les messages attendus du cas sans WebGL sont distingués.

La [charge finale](artifacts/multireference-qa-2026-10-13/stress-final/report.json), **144 773 octets**, SHA256 4f3f74629fc6caa4427267e66792c80207f6327b725bbff2ddc964e291695187, construit les mêmes 12 hologrammes et deux avatars aux deux largeurs. Les triangles passent de **207 344 à 223 652 (+7,865 %)** ; les attributs de **30 721 728 à 33 225 312 octets**. Les appels couleur restent **75 desktop / 70 mobile** et les attributs ne changent pas pendant les poses. Les géométries et textures reviennent à zéro. Quatre programmes restent dans le cache avant renderer.dispose() ; aucun zéro post-dispose non mesuré n'est affirmé. La scène est synthétique et le rendu SwiftShader ne certifie ni une combinaison de plateau légalement atteignable ni les FPS d'un téléphone physique.

## Limites restantes et publication

Les 184 autres avatars n'ont pas reçu de nouvelle reconstruction complète. Les deux cartes commémoratives Yami Yugi modernes réutilisent encore l'avatar du Pharaon antique ; cette tenue reste à reprendre. Les scans World Legacy de Galatea et la capture LOD2 World Lance divergent : le code 69811711 ne reçoit aucun nouvel alias. Les copies Parasomnia et Epigonos gardent une représentation neutre, et les Jetons à statistiques/apparence variables ne reçoivent pas d'espèce ou de valeur fixe inventée.

Le candidat final /workspace/yugioh-multireference-publication-candidate-final-2026-10-13.json, **301 927 octets**, SHA256 **3067ee7ad4b32703f3225719f8408c24b7c67479b4be1bae1607e62859aced73**, comprend **940 fichiers / 281 563 207 octets**, à l'exclusion de ce seul rapport afin d'éviter une dépendance circulaire. Leurs SHA256 et SHA1 Git blob sont tous recalculés ; l'ensemble correspond exactement aux différences Git et fichiers nouveaux. Aucun doublon, symlink, suppression ou chemin protégé n'est présent. Les huit ajouts depuis le premier candidat sont uniquement les archives de correction de légende, son nouveau config et l'ancien helper conservé.

La légende corrigée PV325 modifie seulement les pixels de son bandeau, sans changer les modèles, captures sources ou les deux autres planches. Les 21 inputs QA initialement gelés et l'intégralité du gel de build sont inchangés. Le [manifeste QA final](artifacts/multireference-qa-2026-10-13/final-proof-manifest.json), **64 480 octets**, SHA256 **a7d13b80963ce52e96ae651d8f4791d285b2b49b4297d2122a4df7e9e64d3df8**, possède **361 pins tous exacts**. Les 104 pins avatars, 287 pins monstres, 150 pins Jetons et 16 archives du coordinateur concordent aussi. Les états antérieurs restent consultables et ne remplacent pas ces dernières preuves.

Le helper /workspace/yugioh-multireference-publication-helper-2026-10-13.py, **17 404 octets**, SHA256 **057d6e2898ca09a6312e0f583c41c50b6095e45f0fa37234b402dac27a18e968**, a été relu sans exécution. Il exige les trois valeurs du bloc JSON de cette revue, le pin du candidat fixé, ses socles exacts et la liste finale égale au candidat plus ce seul rapport. Il recontrôle les cinq preuves ci-dessous, l'intégrité historique et les sources avant toute mutation ; les SHA des blobs et arbres Git locaux/distants sont comparés. L'index isolé conserve toutes les entrées non revues. Une avance rapide avec force:false est la seule modification de ref prévue.

| Porte locale | Octets | SHA256 |
| --- | ---: | --- |
| Contrôle complet final | 281841 | 86923a08df51e654610c34f532792d73a4d1788b33959eb6dd8f51691adbf14f |
| Historique protégé final | 303 | 01262ccd4e01c7faaebef8da45df69c2c728e5ea6c2feebccaef9be536e3f33a |
| Manifeste géométrie/QA final | 64480 | a7d13b80963ce52e96ae651d8f4791d285b2b49b4297d2122a4df7e9e64d3df8 |
| Synthèse navigateur compilé | 2429 | dd52bb2e88dfbfeb857d501d295a2bba247ec9ccda84033d8ba51c46be992343 |
| Gel de source et build | 262420 | a6b09fd0912636c84243b3b3136fac5f5db217020c148adeb8bd316f73ac735a |

Le manifeste final doit encore être créé par le coordinateur avec **941 fichiers**, exactement ces 940 entrées et ce rapport scellé, avant publication. Son helper refusera toute autre liste ou empreinte. La publication couverte est limitée à la branche codex/duel-fidelity-2026-10-01 ; master doit rester inchangé et la PR 3 en brouillon. Aucun merge ni promotion de production n'est couvert par ce scellement. La correspondance distante, la CI et la preview seront vérifiées séparément par le coordinateur ; les résultats de la livraison précédente ne sont pas réutilisés comme preuves nouvelles.
