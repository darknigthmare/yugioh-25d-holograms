# Quatre cartes emblématiques et Ash Blossom en bonus

Cyber Dragon, Neos, Numéro 39 : Utopie et Soldat du Lustre Noir — Émissaire du Commencement disposent désormais d’anatomies dédiées. Ash Blossom, déjà construite au changement de priorité, est conservée comme bonus. Ces choix représentent des cartes reconnaissables ; aucun classement statistique récent de popularité n’est revendiqué.

| Carte / passcode CDB | Motifs reconstruits en volumes | Triangles repos / défense | Appels GPU repos / défense |
| --- | --- | ---: | ---: |
| Cyber Dragon — 70095154 | Serpent continu argenté, plaques articulées visuellement, coutures sombres, nageoires dorsales, mâchoire ouverte, crocs, yeux jaunes et câbles de joue | 2 596 / 3 164 | 5 / 5 |
| Neos — 89943723 | Anatomie argentée, lignes rouges du torse, orbe pectoral bleu, couronne allongée, épaulières pointues, ailerons des avant-bras et gants sombres | 2 760 / 3 328 | 5 / 5 |
| Utopie — 84013237 | Armure blanche et dorée, deux grandes épées, joyau vert, yeux rouges, couronne, bandes d’armure dorsales rainurées et numéro 39 en traits solides | 3 176 / 3 744 | 5 / 5 |
| Soldat du Lustre Noir — 72989439 | Armure bleue et violet sombre, hautes pointes dorées, gemmes rouges, lame argentée oblique et long bouclier sombre cerclé d’or | 3 396 / 3 964 | 5 / 5 |
| Ash Blossom — 14558127, bonus | Kimono fermé aux manches larges, jupe évasée, cheveux courts, yeux bruns, nœud orange, foulard rose et obi sombre | 3 000 / 3 568 | 5 / 5 |

Les cinq identités et statistiques sont vérifiées contre [la CDB locale](../../public/native/card-data.json). Le nouveau module [HologramPopularStapleModels.js](../../src/ui/HologramPopularStapleModels.js) fournit des profils figés et une construction compatible avec les cinq matériaux et le rig existants. Les mâchoires, bras tenant une arme et manches de lancement d’effet utilisent les joints existants. Aucun minuteur d’animation supplémentaire, aucune texture d’illustration ni panneau de silhouette n’est ajouté.

Les JPEG full, crop et small sont les illustrations exactes de chaque passcode, téléchargées depuis YGOPRODeck. [PopularStapleReferenceArt.js](../../src/ui/PopularStapleReferenceArt.js) indique URL, dimensions, longueur et SHA-256 de chaque variante. Treize fichiers sont ajoutés ; les anciens crop et small d’Utopie sont gardés byte pour byte. [Le contrôle de préservation](artifacts/popular-staples-models-2026-10-08/illustration-preservation.json) confirme que **les 470 JPEG précédents** du dépôt restent identiques au commit `b8e216cd53ccc640366c91755268291afb1840d2`, dont les références des Terrains.

## Vérification visuelle et technique

[Le script de comparaison](../../scripts/audit-popular-staples-models-2026-10-08.py) exécute les véritables modules THREE dans Chromium / SwiftShader. Chaque triptyque montre le crop exact, le modèle générique du commit précédent et le nouveau modèle, avec une caméra, un éclairage et une taille de canvas identiques. **Trente captures** couvrent les cinq cartes, trois angles — face, trois-quarts, profil — et deux poses — repos et action GPU à 40 %. [Le rapport complet](artifacts/popular-staples-models-2026-10-08/measurements.json) contient les SHA-256 de toutes les sources et captures, les compteurs GPU réels, les bounds, les noms de parties, les joints, les versions de buffers et les libérations de ressources.

Les cinq défenses sont également rendues et mesurées en GPU : toutes restent sous 6 000 triangles et cinq appels par frame couleur. Les anciennes 28 identités ont des profils, buffers construits — position, normale, couleur et joint —, échelles, noms de parties et propriétés de matériaux identiques avant/après. Les 17 familles de fallback gardent leur déclaration. Ce contrôle de buffers ne constitue pas une nouvelle capture des 28 anciennes cartes.

Les actions n’effectuent aucun upload des buffers. Chaque géométrie et chaque matériau, y compris les matériaux du rig pour les ombres, reçoit exactement une libération. Après retrait du modèle, les compteurs GPU géométrie et texture reviennent à zéro ; après destruction du renderer, ses programmes sont libérés. Aucune erreur JavaScript ou requête échouée n’est relevée.

[Les onze tests ciblés](../../test/popular-staples-models-2026-10-08.test.js) passent ; [leur journal](artifacts/popular-staples-models-2026-10-08/targeted-tests.txt) est conservé. Ils vérifient les identités CDB et JPEG, les motifs propres à chaque carte, l’absence de membres génériques inventés, les limites de rendu, les joints, le mode mouvement réduit, la libération exacte et la réutilisation des objets de scène. Un remplacement adverse face verso libère le modèle sans lire l’identité cachée.

Exemples contrôlés : [Cyber Dragon](artifacts/popular-staples-models-2026-10-08/70095154-three-quarter-rest.png), [Neos](artifacts/popular-staples-models-2026-10-08/89943723-front-rest.png), [Utopie](artifacts/popular-staples-models-2026-10-08/84013237-three-quarter-rest.png), [Soldat du Lustre Noir](artifacts/popular-staples-models-2026-10-08/72989439-three-quarter-rest.png), [Ash Blossom](artifacts/popular-staples-models-2026-10-08/14558127-front-rest.png). [Le relevé d’inspection](artifacts/popular-staples-models-2026-10-08/visual-inspection.json) précise les adaptations observées.

## Limites de fidélité

Ces modèles représentent les motifs visibles dans une illustration unique, avec des volumes et une profondeur interprétés. Ils ne certifient pas une fidélité spatiale intégrale 1:1. Les jambes, revers et proportions des portraits tronqués de Neos, Utopie et du Soldat du Lustre Noir sont adaptés. Le repos et le mouvement GPU ne reproduisent pas exactement la pose dessinée. La grande épée du Soldat du Lustre Noir passe devant une partie du visage sous certains angles. Le fond de cerisiers d’Ash reste dans l’illustration, sans décor inventé dans son anatomie.

Cet audit compare des modules réels sous éclairage fixe ; il ne certifie pas un duel natif joué ni des pixels d’attaque correspondant à un effet officiel. Les cinq modèles sont intégrés à la factory de l’application, avec leurs illustrations complètes pour le catalogue et l’inspecteur. [Le contrôle compilé séparé](tcg-catalogue-match-ui-2026-10-08.md) vérifie désormais les quatre cartes emblématiques par des procédures natives réelles, leurs statistiques et images exactes, ainsi que le catalogue complet et la restauration du Side Deck. Ash reste couverte par l’audit de modèles, sans Invocation testée dans ce contrôle compilé.
