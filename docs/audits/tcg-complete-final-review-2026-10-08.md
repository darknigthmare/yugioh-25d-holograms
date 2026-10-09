# Revue finale des sources et preuves — 8 octobre 2026

**Avis favorable : aucun blocage identifié dans le périmètre figé.** Cette revue porte sur les sources, les preuves exécutées, les captures finales et le mécanisme prévu de publication sur la branche de travail. Elle n’exécute ni nouvelle compilation, ni publication, ni fusion. Le seul fichier ajouté par cette étape est ce document.

## Fichiers réellement revérifiés

Le manifest provisoire contient **397 fichiers, 125 990 488 octets**, SHA-256 `b55982ab202afba05c5fcc3361d760e86d2dbb6854de309ecae7ef15dcb46a3c`. Pour chacun, la revue a recalculé la taille, SHA-256 et SHA-1 Git du blob ; l’ensemble correspond exactement aux fichiers modifiés et nouveaux du checkout. Aucun chemin absolu ou sortant, composant interdit, fichier d’environnement, lien symbolique ou mode inattendu n’est inclus. Tous les fichiers sont sous la limite GitHub de 100 MB et les modes vérifiés sont `100644`.

La recherche de motifs d’identifiants GitHub/AWS, de JWT et de clés privées n’a produit aucun résultat, y compris dans les archives gzip décompressées. Ce contrôle constitue une recherche de motifs définis, pas une preuve universelle d’absence de secret. Le script de livraison lit son identifiant depuis l’environnement et n’en contient pas de valeur littérale.

Le [registre des preuves](artifacts/tcg-complete-source-ledger-2026-10-08.json), SHA-256 `874dd13c1bcb97237f3c51f51b875a0411620299b1eea5f72d98e1222d2273b5`, a été revérifié : les **10 rapports**, leurs dépendances exécutées, les **127 sources applicatives figées**, les quatre dépendances de la coupure Swiss et les sept assets compilés correspondent aux octets présents. Les cinq fichiers historiques protégés correspondent également aux blobs du HEAD de départ, dont CDB/Lua/WASM et les archives de 406 et 377 scénarios. Aucun lien local des documents inclus dans le manifest provisoire ne manque.

| Élément figé | SHA-256 revérifié |
| --- | --- |
| `main.js` | `b1ad9601ee5d785e30fe532a463bc6adf458cea0115ec27d8b2ecf994df913d0` |
| `src/core/native/NativeDuelGame.js` | `04a3219a0b59bec1aab199efc72fc25069c68acb17233190a898c530add0813f` |
| Entrée compilée `assets/index-CaFyNlVq.js` | `075c1dd21968352631c5a88c85272c1dbcaa09f36f80bf3939c1c5abc5137c51` |
| [Contrôle global](artifacts/tcg-complete-checks-2026-10-08/report.json) | `fe59fa225b6a33f70ac02594ed8d2ca7690d867ddc6a21700d338bf4ae4be28e` |

Le manifest final attendu reprend ces 397 entrées sans changement et ajoute uniquement ce document, soit 398 fichiers. Son contrôle et son empreinte doivent être établis après cet ajout ; ce document ne prétend pas les connaître à l’avance.

## Intégration et données privées

La relecture de `NativeCardCatalogue`, `NativeDuelGame`, `main.js`, `MatchController`, `TCGMatchClock` et de la politique Advanced confirme l’utilisation du profil TCG partagé, des classifications/alias issus des données de confiance et de la liste datée. Les interdits restent inspectables sans pouvoir être ajoutés. Les validations cumulées Main/Extra/Side, les transactions Side et les métadonnées restaurées s’appuient sur les identités officielles ; une sauvegarde ne fournit pas les noms et descriptions du Duel. La sérialisation décimale de Race64 évite de passer un BigInt brut à JSON.

Les défauts trouvés lors de la revue ont été corrigés puis vérifiés : restauration forcée en strict, conservation de la liste historique du Match, brouillon Side et effectifs du pool, préférences enregistrées avant l’arrêt d’une restauration expirée, refus d’une sauvegarde Swiss sans chrono, et invalidation des démarrages asynchrones devenus obsolètes. Le chronomètre reste commun aux Duels, au Side et au rechargement ; la restauration ne lui redonne pas 50 minutes.

La vérification de session précède maintenant les cinq routes de réponses natives, le démarrage et chaque progression du runtime. Après une attente, génération, session et fermeture sont revérifiées avant de traiter les messages ou d’envoyer une réponse. Les **six cas réels WASM** de coupure attestent **zéro réponse et zéro progression après l’échéance**, avant tout tick d’interface ou pendant un choix SELECT_PLACE déjà ouvert. Aucune victoire native ni résultat de Duel n’est inventé ; le Match Swiss inachevé reçoit la double défaite prévue. Une reproduction indépendante du bord d’échéance a également confirmé la correction.

Les choix de chaîne privés sont masqués avant lecture de leur identité, description ou résolveur. La confirmation publique d’Exodia exige le gagnant et WIN natif 16 dans le même batch ainsi que le script original/exécuté épinglé. Les six archives de façade conservent batches, réponses, événements et scripts ; les répétitions du cœur restent archivées tandis que callback et annonce de résultat ne se répètent pas. Les confirmations ne rendent pas persistantes les identités cachées. Les tests négatifs et le nettoyage des panneaux couvrent l’absence de lecture des getters privés.

## Portée des preuves exécutées

Les résultats consignés distinguent **70 cas d’invocation, 17 de chaîne et 56 de combat**, les six Exodia de façade, les six coupures Swiss et l’initialisation réelle de **13 847 cartes**. Cette dernière mesure vérifie enregistrement, chargement des scripts et requêtes ; elle ne démontre pas toutes les branches de ces cartes. Le cœur EDOPro WASM et les scripts Project Ignis restent l’autorité des résolutions.

Le contrôle global archivé exécute `npm run check` : **2 557/2 557 tests, 152 fichiers**, aucun échec ni test ignoré, assets validés et **123 modules** compilés en 475 ms. L’audit des dépendances rapporte zéro vulnérabilité. La revue a contrôlé ces journaux et empreintes sans relancer le build figé.

Les rapports finaux [Dieux](artifacts/tcg-gods-ui-2026-10-08/report.json) et [Catalogue/Match](artifacts/tcg-catalogue-match-ui-2026-10-08/report.json), SHA-256 respectifs `c75a24ec117abe73b20121f1858cca7c1d1532c9d00ef86f6b420694372d2fba` et `c420ebca586494fff82f223ff0ab134d35507f5436002f9961b0d9e465b59cfb`, restent conformes. Leurs **34 PNG** ont été individuellement rehachés. Les 36/43 dépendances et les 28/32 assets servis sont identiques avant/après. Les dix parcours n’ont aucune erreur JavaScript, violation CSP ou requête native échouée enregistrée. Les drivers utilisent les commandes publiques avec des fixtures de Deck/RNG établies avant démarrage ; aucune mutation native après démarrage n’est utilisée.

La lecture visuelle indépendante de Râ mobile confirme 100 LP après le paiement natif et de l’invocation Xyz d’Utopia desktop confirme 2 500 ATK/2 000 DEF. Les huit nouveaux profils et les 48 comparaisons de modèle sont documentés séparément. Les parcours compilés couvrent invocations des trois Dieux, Catalogue/Match, Cyber Dragon, Neos, BLS et Utopia ; ils ne revendiquent pas une invocation navigateur d’Ash Blossom ou un parcours Swiss navigateur.

## Livraison prévue et limites

Le script de livraison relu a SHA-256 `9d8e3dddccc26a498ea90eb2a6f2b669abcb8510a5a5a984bdda6e52cdca0760`. Il exige avant et après l’envoi des blobs immuables les octets du manifest, HEAD local `b8e216cd53ccc640366c91755268291afb1840d2`, parent distant `f3230cabdbb7b5c456935f490061c4a17e3e41e2` et leur arbre commun `443136fea09b370e03732bd4eb7349e12f043336`. Il vérifie aussi master `e595f1fa5ef8d39f460e0ed3f825546d8652191a` et son arbre `fdb043e23b488e978f8eebaf01b0b0311055738b`. Le commit local et le commit distant doivent avoir le même arbre. La seule référence mise à jour est `codex/duel-fidelity-2026-10-01`, avec `force:false`, après une nouvelle vérification de son parent. Aucune commande de fusion ou promotion Vercel n’est présente. Cette revue vérifie ces gardes dans le code ; les contrôles HTTP de livraison restent à exécuter par le responsable de publication.

Les [limites de la vague](tcg-complete-wave-2026-10-08.md) sont conservées : snapshot territorial fournisseur lorsque la référence primaire manque, interactions TCG non exhaustivement jouées, règlement matériel avec juges hors simulateur, et politique Swiss KDE-E optionnelle. Le prompt de paiement de Râ reste générique avec son coût officiel consultable. Les illustrations publiées sont préservées, mais les profondeurs et parties invisibles des modèles sont interprétées ; aucune reconstruction spatiale intégrale 1:1 ni homologation Konami n’est certifiée. Ces limites ne contredisent pas les preuves présentées et ne constituent pas un blocage pour la livraison de la branche et de son aperçu.
