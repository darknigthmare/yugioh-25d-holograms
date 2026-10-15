# Revue indépendante des compositions — 15 octobre 2026

La revue de code ne relève aucun blocage sur les six compositions de cette vague. Les quatre éditions commémoratives construisent réellement les sujets imprimés, avec les tenues modernes propres aux scans. Farce-Gamins comporte cinq grands sujets et vingt-cinq petites silhouettes positionnées ; Cristal comporte sept gemmes. Les présences sont contrôlées par la géométrie, les coordonnées et les rendus, sans déduire la fidélité de simples noms de pièces.

Cette revue concerne une continuation procédurale et stylisée des illustrations. Les visages, les plis, les coiffures, les détails minuscules et les dos inférés ne constituent pas une reproduction intégrale 1:1. Le nombre de petites silhouettes Farce-Gamins décrit cette reconstruction ; ce n’est pas un inventaire officiel de personnages distincts.

## Contrats du rendu et identités

Les quatre compositions conservent respectivement un, deux, deux et deux sujets : Yami Yugi ; Yami Yugi avec le Magicien Sombre ; Kaiba avec le Dragon Blanc ; Joey avec le Dragon Noir. Le compositeur place les repères de visage dans le cadre des scans et fixe les charges lumineuses à la bouche après la pose et la transformation des dragons. Les illustrations sans charge n’en reçoivent pas. Les shaders personnalisés participent explicitement aux quatre plans de découpe.

Les acteurs possèdent des copies de leurs buffers et matériaux. Le costume moderne de Yami reste distinct du Pharaon sélectionnable ; la tenue bleue de Joey ne remplace pas son avatar jouable. Le catalogue conserve ses 192 avatars et leurs conditions de déblocage. Les 240 identités natives de Jetons, les 120 présentations d’illustration imprimée, les quatre commémoratifs et les trois marqueurs techniques restent distincts. Les métadonnées commémoratives existantes conservent leurs codes et statistiques nuls. Les passcodes des monstres compagnons servent à construire des instances visuelles et ne deviennent pas des identités natives de ces cartes commémoratives.

L’Atlas retire le socle et applique son cadre orthographique uniquement à ses propres instances illustrées. Les deux Jetons de groupe gardent leur socle, leurs positions Attaque/Défense et leurs statistiques dans le Duel. Le moteur, la base de cartes et les scripts natifs restent inchangés. Les plafonds des modèles restent comparés aux mesures originales du 11 octobre, sans multiplier à nouveau un budget déjà augmenté.

## Cycle de vie et tests indépendants

Le chargement des acteurs reste différé jusqu’à la sélection d’une commémorative. L’aperçu conserve un seul renderer, ne crée aucune boucle RAF et garde les protections de fermeture pendant un import. Les rendus sont conditionnés par la visibilité du document, celle de l’aperçu et son IntersectionObserver. La libération d’une composition inclut acteurs, monstre, rig, matériaux d’ombre et effets ; les ressources possédées ne sont pas partagées entre instances. Le retour « Vue illustration » rétablit la pose sans reconstruire les buffers à chaque image.

Une exécution indépendante des cinq suites ciblées a réussi **46 tests sur 46**, sans échec, annulation, saut ou tâche en attente. Elle couvre les acteurs, les deux groupes, les effets, les compositions et les protections existantes de l’Atlas. Le journal est conservé séparément sous `yugioh-illustration-independent-targeted-tests-2026-10-15.txt` : 5 514 octets, SHA256 `0d0d6df3b737d468d6d7b6c7f0ab3941e1ad90f0b89c7a3c1ed2266eafbeb41e`.

Le contrôle global existant [npm run check](artifacts/illustration-compositions-2026-10-15/full-check.txt) rapporte **2 835 tests réussis**, zéro échec et **151 modules** compilés. La revue ne présente pas cette exécution globale comme une seconde exécution indépendante : elle en vérifie le journal et le gel correspondant.

## Gel vérifié

Le [gel du build](artifacts/illustration-compositions-2026-10-15/build-freeze.json), 450 829 octets, SHA256 `4f8afb0b592df16365c41b5e68b6b0730b1a603550a4dd15aa79554185ad2dca`, a été recalculé puis comparé aux fichiers réels :

- 1 895 fichiers source et 296 entrées de validation : aucune différence ;
- 25 fichiers compilés et 575 assets statiques supplémentaires : aucune différence ;
- 5 343 fichiers protégés, soit 1 112 530 727 octets : SHA256, SHA de blob Git et modes identiques au snapshot de référence.

Les deux journaux historiques régénérés par les tests ont été restaurés depuis HEAD. Le moteur `src/core/native/NativeDuelGame.js` conserve ses 62 598 octets et son SHA256 `8c61bad0482d49babd7d20187b12251a2af11f967b83fc58cd5b4aeb1c4d6c01`. Les fixtures originales, données natives, scripts historiques et anciennes preuves restent protégés.

La preuve de recalcul indépendante `yugioh-illustration-independent-review-check-2026-10-15.json` conserve les résultats et l’inventaire des fichiers observés : 21 963 octets, SHA256 `7ffb39e60b79f49525ce24156dec646ca3e022e3f317cb90f984d28b68a7163c`. Ce relevé intermédiaire n’est pas la candidate finale de publication.

## Préparation de la publication et portée de la revue

Le helper local de préparation a été relu : SHA256 `edf1dc9cf3ee42efa80ea7caefd43180933ecc7ab9537d38c2dca0d66e8e9272`, 24 869 octets. Il ne lit aucun identifiant d’accès et n’effectue aucune requête réseau, opération de ref ou mise en staging normale. Les objets Git et l’index de calcul sont isolés hors du dépôt. Les blobs sont construits à partir des octets bruts, sans filtres Git, puis transmis en base64 ; les morceaux du transport sont réunis en un blob complet par contenu. Le payload final contient une seule création d’arbre aplatie sur le `base_tree` attendu, dont le SHA doit égaler l’arbre Git calculé localement.

Les douze contrôles du helper couvrent notamment un binaire de 524 288 octets transféré par un vrai PTY, l’absence d’écho et de conversion de fins de ligne, et le rejet d’un fichier protégé modifié, d’une source postérieure au gel, d’un chemin supplémentaire ou d’un morceau altéré. Son validateur recontrôle toutes les sources, les protections, la liste complète des changements, les blobs, les morceaux, l’arbre et l’index avant les écritures distantes coordonnées séparément.

L’inspection des changements courants n’a trouvé aucun fichier suivi modifié hors de l’allowlist. Le contrôle de motifs n’a trouvé aucune clé privée, aucun identifiant GitHub/AWS ni paramètre d’URL de contournement Vercel. Cette recherche est un contrôle complémentaire des contenus et de leur provenance, pas une preuve universelle d’absence de tout secret. Les nouveaux contenus examinés sont du code, des recettes, des mesures synthétiques et des captures des références déjà publiques.

## Résultats navigateur finaux et gel de cette revue

Les deux rapports compilés finaux réussissent **17 parcours et 150 captures** : neuf parcours Jetons avec 98 captures, huit parcours avatars avec 52 captures. Chacun des 17 parcours porte un résultat positif. Les rapports ne contiennent aucune erreur de page, requête HTTP, CSP ou requête native inattendue ; les erreurs de capacité WebGL attendues sont distinguées des erreurs inattendues. Les 1 895 sources avant et après chaque scope sont exactement celles du gel. Les **603 ressources HTTP** avant et après chaque scope reproduisent exactement les 25 fichiers compilés, 575 assets statiques et trois fichiers natifs épinglés.

La revue a recalculé tous les pins du [manifeste QA final](artifacts/illustration-compositions-2026-10-15/qa-final-proof-manifest.json) : **64 archives et 360 fichiers conservés hors dépôt**, sans différence. Le manifeste mesure 82 351 octets, SHA256 `bd0f5357876b6b616a144c8bad25d2b81d3af3a9b6a986c3def314bf47e2ac41`. Il relie les six scènes source et les 468 modèles contrôlés aux recettes, références, captures, rapports et limites de fidélité. Les 24 angles et 11 isolations de sujets/effets complètent les contrôles publics des six scènes. Les 14 393 712 normales contrôlées sont valides ; le ratio de triangles maximal face à la fixture originale est 4,992714×.

Les rapports compilés relus et recalculés sont :

- [Jetons](artifacts/illustration-compositions-2026-10-15/browser-compiled-tokens/report.json), 2 211 466 octets, SHA256 `4819eca423e4c9a3a20aa0ed16e2787082f360fc9d8125e5980d2e050338c75c` ; son [wrapper](artifacts/illustration-compositions-2026-10-15/browser-compiled-tokens/illustration-wrapper.json), 23 616 octets, SHA256 `7aadc5d40d459f04aa4ec90a3f2a16b0267aaa7f77afde5747e0e44fb7556e0e` ;
- [Avatars](artifacts/illustration-compositions-2026-10-15/browser-compiled-avatars/report.json), 1 558 871 octets, SHA256 `4e0965b5812ffc1b3cc28224dbd7406bdca1a87163ad17e85833a9ccd47fc058` ; son [wrapper](artifacts/illustration-compositions-2026-10-15/browser-compiled-avatars/illustration-wrapper.json), 23 168 octets, SHA256 `f93ca09ba191998825505cb6f54d83c76e36b01389d98b9b0218043595c9724a`.

Les parcours gardent les protections de fermeture pendant un chargement, les replis sans stockage/WebGL, les règles natives de création/destruction/transfert et l’intégrité des informations cachées de l’adversaire. Les contrôles de pause et de hors-écran conservent leurs fenêtres strictes de 350 ms et l’identité des pixels ; les drivers historiques restent inchangés. Le journal indépendant `yugioh-illustration-independent-browser-check-2026-10-15.json`, 2 579 octets, SHA256 `4295cadfd8d2e984fba149f81d905788506c6dd7873401e43fa64d9ad582d050`, consigne le recalcul des archives, fichiers externes, captures, sources et réponses HTTP. L’entrée compilée vérifiée est `assets/index-BdSgQu77.js`, 974 595 octets, SHA256 `784f6b5967c04d18d8ea01239741004a3594bc16ebed7c0fc598808d1fabeed1`.

**Aucun blocage de code, de cycle de vie, d’identité ou de preuve locale n’est relevé.** Ce document est désormais gelé. Le verdict portant sur la candidate exacte sera écrit uniquement hors du dépôt après sa constitution, pour éviter toute référence circulaire. La livraison autorisée conserve la branche existante et la PR en brouillon, sans fusion ni promotion de la production ; la vérification des refs distantes et des réponses de publication appartient à cette étape ultérieure.
