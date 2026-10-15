# Revue indépendante des géométries de Jetons — 11 octobre 2026

La revue des sources et des rendus est achevée pour les **240 codes de monstres Jetons présents dans la base native**, répartis en **42 familles anatomiques**. Les erreurs de dispatch et d’articulation signalées pendant la revue ont été corrigées. Aucun blocage géométrique connu ne subsiste dans cette livraison.

Cette conclusion porte sur la construction des modèles et les galeries WebGL. La vérification du Duel complet, de l’Atlas compilé, de GitHub et de Vercel fait l’objet des autres contrôles de la livraison. Aucun test, build ou navigateur de validation finale n’a été relancé par cette revue en lecture seule.

## Couverture réellement inspectée

- Lecture de `HologramMonsterModels.js`, `CombatVisualProfiles.js`, `HologramPoseAnimation.js`, du catalogue compact et des sept fichiers `HologramToken*.js`.
- Comparaison visuelle des **120 illustrations exactes**, réunies sur quatre planches de référence, avec les branches correspondantes. Ces références couvrent **129 profils natifs**, dont certains partagent une illustration par alias ; **111 profils** portent explicitement `visualBasis: "native-definition"` et n’ont pas d’illustration de Jeton dans ce pool.
- Inspection des **240 rendus finaux**, dans `final/all-tokens-01.png` à `final/all-tokens-10.png` : neuf pages de 25 profils et une page de 15. Les 240 IDs rendus sont uniques et correspondent exactement aux 240 IDs de la preuve de construction.
- Inspection complémentaire des 25 profils du comparatif avant/après, des 42 familles, des planches végétaux/insectes et des neuf constructions mécaniques corrigées.

Il s’agit de 240 codes pris en charge, avec des gabarits réutilisés et des variantes de présentation ; ce nombre ne désigne ni 240 espèces distinctes ni toutes les éditions physiques de cartes commémoratives. Les modèles restent des **interprétations procédurales stylisées**. La reproduction graphique 1:1 de chaque illustration n’est pas certifiée par cette revue, et les 111 profils sans référence ne peuvent recevoir une telle certification.

## Corrections vérifiées

| Cas | Résultat final vérifié dans les sources et les rendus |
| --- | --- |
| Metal Fiend `24874631` | Les noms des deux crochets correspondent aux joints gauche et droit ; la preuve finale contient les joints 7 et 8. |
| Squid Ink `65500516` | L’exception précède le gabarit Slime ; le manteau et les huit tentacules sont présents. |
| Shinobird `25415053`, `52900001` | Sceau flottant avec trois plumes, sans bec ni pattes d’oiseau ajoutés. |
| Vilepawn Salmon `27882994` | Corps horizontal, nageoires et queue de poisson ; le serpent à cornes est remplacé. |
| Spinos `44689689` | La branche dinosaure est accessible malgré la famille `serpent` du catalogue ; corps, pattes, mâchoire, queue et crête sont visibles. |
| Fox `27198002` | Neuf queues remplaçant la queue unique du gabarit animal. |
| Blackwing `9925983` | Coquille cassée et marques colorées ajoutées au petit oiseau. |
| Chewbone Jr. `7392746` | Crâne, squelette quadrupède et grandes cornes courbes. |
| Gift Fiend, Metabo, Grinder, Dark Soul | Quatre exceptions illustrées remplacent le même humanoïde générique : petit démon aux bras croisés, parasite à longue crinière et quatre pattes, machine avec scie/outils/chaînes, apparition armurée flottante. |
| Multi `35514097`, Dragonoid `28053764` | Module laser et créature ailée à œil unique sur une coupe ; les robots génériques sont remplacés. |
| Siphon `70391589`, Wicked `65810490` | Tronc végétal tordu avec lianes et orbes ; figure dorée à quatre yeux, œil rouge de poitrine, globe et queue enroulée. |
| Engine `82556059`, Synchron `62125439` | Moteur compact et câbles distincts du moteur en V à ailettes vertes. |
| Small Fire, Wild Fire, Option | Les visages inventés sont supprimés ; flammes et engin contenu dans l’orbe suivent les motifs de leurs références. |

## Géométrie, animation et destruction

Les 42 noms du dispatcher correspondent exactement aux 42 familles du catalogue. Les deux profils `unknown-echo` — Parasomnia `44092305` et Epigonos `51611042` — utilisent une construction neutre explicite. Aucun profil reconnu ne retombe sur l’ancien modèle de chèvre.

Les constructeurs lisent des métadonnées visuelles publiques, avec des codes et couleurs fixes. Ils ne consultent ni statistiques, ni texte d’effet, ni état du Duel et ne tirent aucune variation aléatoire du passcode. La géométrie est construite une fois et fusionnée dans les cinq matériaux existants ; les couleurs et joints sont conservés comme attributs de sommets. Les buffers indexés sont normalisés avant fusion, les géométries temporaires sont libérées et les matériaux inutilisés sont détruits. Le rig partagé libère aussi ses matériaux de profondeur et de distance une seule fois.

Les preuves finales produites par le chantier modèles, puis lues pendant cette revue, montrent : **240 constructions finies**, **712 à 5 890 triangles**, **3 à 5 lots/appels GPU**, buffers stables pendant les actions et aucun résidu de géométrie, texture ou programme après destruction sur les 13 galeries. Aucun message d’erreur WebGL n’est enregistré. Le journal ciblé contient **17 tests réussis sur 17**. La preuve de non-régression conserve les buffers et matériaux des **36 modèles non-Jetons** comparés à leurs sources originales archivées.

Les **11 empreintes sources** de `final/webgl-audit.json` sont égales avant et après capture et correspondent aux fichiers présents au moment de cette revue. Les SHA-256 des preuves finales lues sont :

| Preuve | SHA-256 |
| --- | --- |
| `final/webgl-audit.json` | `b6eebc397c373f6902c5f32b22c9b3c450974b1af014db4fafcf50444415d4b3` |
| `final/construction-audit.json` | `b132dfd4f597605acbd8d8ad95c32c5e84c6e393bd2ea0dcef811c6b7395ef01` |
| `final/non-token-regression.json` | `58adf29a153d08c3be9bbaa575215336e8079a4ab991ab84bd5c89f59fe8c4a8` |
| `final/tests.txt` | `2f78ef7aad537ff87a5a7951d123526b0eb8ba76bf1d5ddd94141d22b1b07143` |

Les captures, leurs sources reproductibles, les preuves originales et leur index de copie sont conservés dans [les artefacts du chantier modèles](artifacts/token-monster-models-2026-10-11/).
