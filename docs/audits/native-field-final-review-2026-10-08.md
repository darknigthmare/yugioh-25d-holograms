# Revue indépendante finale des règles et de leur provenance — 8 octobre 2026

Les six lots couvrent **224 IDs assignés, tous distincts et complets**, avec **225 scénarios natifs réussis**. Les 128 scénarios antérieurs portent la matrice courante à **353 scénarios / 339 Terrains**. Chaque nouvel ID possède un résultat significatif réellement interrogé après une chaîne native : changement de statistiques, coût, destination, recherche, pioche, compteur, restriction, Invocation, phase, combat ou négation. La présence d’une carte ou sa seule activation ne suffisent pas. Les autres branches restent explicitement non certifiées dans les documents de chaque lot.

## Résultats et sources exécutées

| Lot | IDs assignés | Scénarios passés | Lua de fixture distincts | `modifiedScripts` |
| --- | --- | --- | --- | --- |
| A | 37 | 37/37 | 99 | true — c11808215.lua |
| B | 38 | 38/38 | 71 | false |
| C | 37 | 37/37 | 74 | false |
| D | 38 | 39/39 | 84 | false |
| E | 37 | 37/37 | 77 | false |
| F | 37 | 37/37 | 79 | true — c43940008.lua |

Les six exports ont été rapprochés des affectations d’origine et des IDs contenus dans leurs preuves, sans chevauchement ni omission. B–F ont été réexécutés indépendamment après extraction des inputs et gel des corps de scénario ; A a été réexécuté par son propriétaire, puis son résultat et ses dépendances ont été vérifiés par cette revue. Les scénarios conservent messages, décisions avec indices d’origine, requêtes, fixtures, seed et équipes exactes. Tous sont `passed`, leurs diagnostics sont vides, leurs messages ne contiennent aucun `RETRY`, et leurs modes natifs sont MR5 + `TCG_SEGOC_NONPUBLIC` + `TCG_SEGOC_FIRSTTRIGGER` (`12885092352`).

Les fixtures sont ajoutées uniquement avant `start`, dans un nouveau duel fermé par le runner. La façade interdit les ajouts après démarrage. Les modules n’emploient ni Debug/TestMode, ni Lua inventé pour déclencher un effet, ni injection de résultat dans le duel, ni moteur de règles JavaScript. Les mouvements et Invocations revendiqués après démarrage sont obtenus par les vrais choix du core. Les cartes déjà posées, invoquées ou au Cimetière dans une fixture ne certifient pas leur parcours antérieur ni un Deck de tournoi.

Chaque rapport archive **23 dépendances avec SHA-256 et taille** : module de lot, chargeur partagé, harness, runtime, registre central, deux gardes de correction, intégrité SHA-256, compatibilité Lua, lecteurs, wrapper et archives. Toutes ces empreintes ont été confrontées aux fichiers courants après gel. Chaque Lua de fixture possède les octets et SHA de la source originale et de la source effective ; les métadonnées n’effacent pas le script d’origine. `modifiedScripts` est calculé uniquement depuis les `scenario.scriptCorrections` réellement enregistrées : A utilise Dice Dungeon, F utilise Duel Tower, B/C/D/E n’appliquent aucune correction.

| Lua | Octets originaux | SHA-256 original | Octets effectifs | SHA-256 effectif |
| --- | --- | --- | --- | --- |
| `c11808215.lua` | 2948 | `bdabb87f4746b36edb8a88d6e5620e426cc97e4317a67439faa120e55466c86e` | 2992 | `ec1b64aa682d4ff098fcc3ef8239eece2a03a479511e79006fdee09cd6c6832c` |
| `c43940008.lua` | 3582 | `43d4454ff05c1e05ec47eb69023e45750b4e0e9bf186c4b718e72432ba0f1460` | 3683 | `32bfc7a639718a0f1631dd6eec0ee9018334e7273aeabb09065d5e0eb213a11e` |

Les archives `scripts.json` (35 549 984 octets), `card-data.json` (7 601 872 octets) et `ocgcore.sync.wasm` (935 745 octets) ont été comparées directement à `HEAD` : **byte-identiques**. Leurs SHA concordent avec le manifeste/build et `upstreamArchiveBytesModified` reste `false`. Les deux corrections modifient explicitement les chaînes de source remises au core ; elles ne sont pas présentées comme des scripts amont inchangés.

## Revue du lecteur, des gardes et des inputs

Le [chargeur partagé](../../scripts/native-field-audit-inputs.mjs) charge les ressources locales avant le duel, conserve le binding canonique/source des cartes provisoires, vérifie le SHA du WASM et n’importe aucun module de lot ni l’audit principal. Les CLIs dépendent donc des inputs sans boucle d’import. Le [lecteur central](../../src/core/native/NativeDuelRuntime.js) accepte les chemins natifs et officiels, laisse les autres sources intactes, applique uniquement les deux transformations enregistrées et archive celles réellement lues. Le cache est invalidé lorsque les octets source changent ; une source révisée est alors refusée par la garde plutôt que de réutiliser un résultat ancien.

Les gardes vérifient le SHA-256 de l’original et du résultat. Dice Dungeon conserve les deux appels RNG et attribue ensuite chaque dé à son joueur. Duel Tower conserve les choix privés, révélations et bannissements ; il ajoute l’offre aux deux joueurs éligibles en cas d’égalité d’ATK, sans considérer l’absence de révélation comme une égalité valide. Les zones et monstres légaux restent contrôlés par le core. Un lecteur synchrone explicite reste une dépendance fournie par l’appelant ; les comparaisons avant/après des audits dédiés l’utilisent en déclarant fidèlement leur source.

Validation indépendante : `node --test --test-isolation=none tests/native-script-corrections-integrity.test.mjs tests/native-shuffle-set-protocol.test.js` — **13/13 tests réussis**, zéro cas ignoré. Ils confrontent le SHA synchrone à Node et aux vecteurs NIST, vérifient UTF-8, limites de blocs, sources altérées et déjà corrigées, chemins voisins, cache, lecture du Map complet sans mutation et reader réel de production. Seuls les deux Lua enregistrés diffèrent de leurs sources dans la lecture de l’archive complète.

## Confidentialité de la permutation des cartes posées

La comparaison byte à byte du wrapper contre `HEAD` montre **un seul remplacement exact**, celui de `case 36` : `MSG_SHUFFLE_SET_CARD` contient un compte `uint8`, puis toutes les positions source, puis toutes les positions destination. Le lecteur consomme ce format sans décaler le message suivant. Les cinq fichiers générés du wrapper correspondent aussi aux SHA de [sa reproduction archivée](artifacts/native-wrapper-reproduction-2026-10-08.json).

La vraie preuve de Call of the Forgotten contient trois cartes posées et trois destinations masquées (`location: 0`). [NativeDuelGame](../../src/core/native/NativeDuelGame.js) oublie les anciennes identités de projection et annotations. [NativeDuelVisualEvents](../../src/core/native/NativeDuelVisualEvents.js) efface les caches publics de cartes et de codes, produit `card: null`, `hidden: true`, `faceDown: true` et ne demande aucune identité cachée. Le test interdit explicitement toute requête de carte ou de métadonnées durant cette projection. Une permutation masquée ne devient pas une association publique entre identité et zone.

## Contrôles renforcés durant la revue

Les quatre preuves de limite de pioche du lot C laissent assez de vraies cartes au Deck pour une nouvelle pioche complète : Rainbow Ruins et Fairy Tale Prologue conservent trois cartes ; les deux Paradise conservent deux cartes. World Legacy Scars garde aussi un partenaire de défausse en main et une carte au Deck. L’absence de deuxième activation n’est donc pas expliquée par l’épuisement des ressources.

Way Where There’s a Will du lot D annonce réellement deux cartes, choisit l’une des deux cartes excavées par son index natif, replace une autre carte distincte depuis la main et trie les deux cartes au bas du Deck. La requête vérifie les identités exactes de la main et du bas du Deck ; Magikey World vérifie également le véritable index inférieur du Deck. Ces contrôles remplacent des assertions d’état trop faibles.

## Revue de contenu préparé pour publication

La première revue du diff et de l’union du manifeste initial avec les fichiers modifiés/non suivis portait sur **95 fichiers, 23 479 742 octets**, dont 75 fichiers texte. Aucun fichier du manifeste n’est manquant. Le scan de clés privées, jetons GitHub/OpenAI/AWS, JWT et paramètres d’URL signée n’a produit aucun résultat. Les URLs présentes désignent des sources publiques ou un serveur local d’audit. Aucun fichier de credentials ni configuration d’environnement privée n’entre dans cette sélection.

Les changements applicatifs inspectés portent sur la lecture/correction de sources, le décodage et la confidentialité, le catalogue d’illustrations locales, les deux profils de modèles et la couverture factuelle des Terrains. Les six JPEG locaux des nouveaux Pièges-Monstres — complets, recadrés et miniatures — concordent avec leurs SHA, tailles et dimensions archivés. Les deux miniatures exactes mesurent 268 × 391 pixels, pour 30 149 et 28 004 octets. Les deux recadrages conservent seulement les métadonnées temporelles de leur source publique, sans GPS ou identité personnelle. Le catalogue choisit l’illustration par identité physique, sans changer d’image à cause d’un nom ou Type courant copié. La documentation distingue illustration exacte, motifs reconstruits et branches de règles exercées ; elle ne certifie ni une 3D intégrale 1:1, ni toutes les interactions TCG.

Cette revue porte sur les fichiers et preuves mentionnés. Le manifeste exact de publication, les empreintes compilées et les preuves navigateur finales sont contrôlés dans le [gate de livraison](native-completion-2026-10-08.md) ; aucun build, déploiement ou publication n’a été effectué par cette revue.

## Atlas final : inspection des 40 captures

Les **40 captures finales** du [rapport de l’atlas](artifacts/field-atlas-ui-2026-10-08/report.json) ont été ouvertes et inspectées : six Terrains sous trois angles, sur ordinateur 1280 × 900 et mobile 390 × 844, puis quatre vues publiques d’ensemble. Leurs SHA correspondent tous au rapport. L’audit parcourt **339 IDs uniques sur 29 pages**, mesure les filtres de disponibilité/reconstruction et trouve zéro Terrain natif restant à vérifier en scénario. Les six représentants sont Chicken Game (`67616300`), Dream Mirror of Joy (`74665651`), Ignister A.I.Land (`59054773`), Toon Kingdom (`43175858`), The Seal of Orichalcos (`48179391`) et Fire King Island (`57554544`).

Les aperçus sont présents et les trois angles montrent la même géométrie attendue : relief et arbres de Chicken Game ; tours, ponts et marches de Dream Mirror ; château, grande roue, attraction et feux d’artifice d’Ignister ; château sur livre de Toon Kingdom ; cercle et étoile d’Orichalcos ; relief volcanique, végétation et nuages de Fire King Island. Les vues mobiles conservent le couple illustration/aperçu et les contrôles d’angle dans la largeur disponible. Les vues publiques sont des fenêtres d’une page qui se déroule ; la partie du texte située plus bas ne constitue pas une disparition de contenu. Aucun aperçu noir, défaut d’asset, décalage de caméra ou défaut de débordement horizontal n’est identifié dans ces captures.

Les limites spatiales sont visibles : personnages et véhicules de Chicken Game ne sont pas modélisés ; détails, matériaux, lumière et composition des références sont simplifiés. Le sceau d’Orichalcos, construit comme un motif plan, devient presque une ligne dans l’angle de côté. Ces images prouvent les aperçus sous plusieurs angles et leur présentation responsive ; elles ne démontrent pas une reproduction 3D intégrale 1:1 des illustrations, ni une inspection visuelle détaillée des 339 géométries.

Les six JPEG sources de cet échantillon ont également été ouverts et comparés directement à `HEAD` : leurs octets sont inchangés. Les empreintes du HTML, des chunks, du CSS et des ressources natives de l’atlas correspondent au bundle final, dont l’entrée est `/assets/index-DNwe3FSS.js`, SHA-256 `38c428237545d8290e07229c5efdda93441dd1088234c31e64aa6ef3f8b59321`. Le rapport conserve zéro erreur JavaScript, requête échouée ou violation CSP et confirme la destruction du canvas à la fermeture/réouverture.

Les derniers correctifs mobiles ont été relus : le callback de panoramique revalide le mode et la largeur au moment de son exécution ; l’entrée en Vue Réelle remet les deux offsets de défilement à zéro avant les redimensionnements WebGL/CSS3D. Les régressions exécutent la fonction de production et l’activation réelle, conservent le panoramique mobile ordinaire et vérifient aussi la réentrée. Passage indépendant de `test/real-duel-ui.test.js` et `tests/native-card-catalogue.test.js` : **35/35 tests réussis, zéro cas ignoré**.
