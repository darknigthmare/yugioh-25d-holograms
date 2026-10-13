# Monstres : références croisées et corrections du 13 octobre 2026

Cette vague corrige **18 des 36 modèles de monstres non Jetons** par rapport au commit `baabe9f94863159053e4ad37be4c038104da5e23`. Le registre compare **83 illustrations distinctes** correspondant exactement à ces 36 codes natifs, dont **47 images alternatives nouvellement conservées**, et **128 photos originales de produits licenciés pour 10 identités**. Ces chiffres comptent des fichiers et des compositions, pas 83 ou 128 angles indépendants.

Les [83 références imprimées](artifacts/multireference-monsters-2026-10-13/card-reference-manifest.json), [128 photos classées](artifacts/multireference-monsters-2026-10-13/licensed-reference-manifest.json) et [couverture par carte](artifacts/multireference-monsters-2026-10-13/reference-coverage.json) donnent URL, code/artID, taille, dimensions, SHA256, version, usage et exclusions. Les octets téléchargés sont conservés sans retouche. Les planches contact sont des dérivés d’inspection identifiés séparément. Un second GET a contrôlé les **175 nouvelles images** : HTTP 200, type image, taille et SHA256 identiques aux premiers téléchargements ([preuve binaire](artifacts/multireference-monsters-2026-10-13/reference-download-verification.json)).

La recherche YGOPRODeck par `name` expose ici les illustrations alternatives ; la requête par `id` ne renvoyait que l’image correspondant à cet identifiant. Les réponses originales par nom restent archivées dans `api/`, avec le registre [card-art-sources.json](artifacts/multireference-monsters-2026-10-13/card-art-sources.json). Les reprints, un crop et son full, ou un changement d’éclairage d’une même pose ne valent pas une nouvelle vue. Les trois fichiers promotionnels des Dieux partagent exactement un seul corps binaire et sont exclus des vues anatomiques. **90 photos** corroborent des structures ; **38** sont gardées comme contexte, effets, montages, accessoires ou démonstrations de taille. Les 128 photos ont **126 corps binaires distincts**.

## Sources visuelles supplémentaires consultées

Les vues de produits viennent des fabricants, avec droits/licence indiqués sur les pages originales. Elles décrivent une interprétation commerciale de l’anime, et ne certifient pas la géométrie originale de la carte.

| Identité | Sources supplémentaires | Ce qu’elles permettent de comparer |
| --- | --- | --- |
| Dragon Blanc aux Yeux Bleus | [Tamashii 14516](https://tamashiiweb.com/item/14516/?wovn=en), huit arts de carte | Crâne long, grandes ailettes arrière, cou segmenté et ailes, y compris vue arrière du sculpt |
| Dragon Noir aux Yeux Rouges | [Tamashii 14733](https://tamashiiweb.com/item/14733/?wovn=en), six arts de carte | Crâne pointu, nageoires/cornes balayées, denture et ailes opaques |
| Magicien Sombre | [Tamashii 15129](https://tamashiiweb.com/item/15129/?wovn=en), neuf arts de carte | Visage adulte, casque fermé, épaulettes relevées et pans d’armure ; costumes noirs/monochromes exclus des couleurs canoniques |
| Slifer | [Kotobukiya 4934054028436](https://shop.kotobukiya.co.jp/shop/g/g4934054028436/), trois arts de carte | Double gueule, long corps enroulé, face ventrale noire côtelée et épines dorsales |
| Obelisk | [Kotobukiya 4934054028498](https://shop.kotobukiya.co.jp/shop/g/g4934054028498/), trois arts de carte | Grandes coques dorsales, armure des jambes, trois griffes aux pieds et gemme frontale |
| Râ | [Kotobukiya 4934054028467](https://shop.kotobukiya.co.jp/shop/g/g4934054028467/), trois arts de carte | Éventail de vanes d’or fermées, anneau derrière la couronne et gemme turquoise |
| Cyber Dragon | [Kaiyodo KD107](https://kaiyodo.co.jp/items/others/kd107/), deux arts de carte | Serpent mécanique, pointes du crâne et panneaux d’armure latéraux qui se recouvrent |
| Néos | [Kaiyodo NR041](https://kaiyodo.co.jp/items/revoltech/nr041/), deux arts de carte | Plaques du masque, inserts bleus aux genoux/chevilles et lignes rouges à l’arrière |
| Floraison de Cendres | [AMAKUNI 02940000](https://amakuni.info/product/index02940000.html), deux arts de carte | Pieds nus, oreilles pointues, nœud orange relevé et plis/teintes du kimono |
| Crâne Invoqué | [Good Smile 56081](https://www.goodsmile.com/en/product/56081/POP%2BUP%2BPARADE%2BSummoned%2BSkull%2BL%2BSize), quatre arts de carte | Cornes de bélier, coque osseuse sur muscles violets, ailes bleues opaques et jambes/griffes |

Les pages portail Kotobukiya qui renvoyaient une salle d’attente Cloudflare en HTTP 200 sont explicitement marquées inutilisables. Seules les pages boutique et images originales effectivement obtenues servent ici d’éléments visuels.

## Corrections intégrées

| Modèles | Correction principale |
| --- | --- |
| Blue-Eyes, Red-Eyes | Ailettes arrière du crâne balayées, membranes aux bords courbes, plaques du cou ; rangée inférieure de dents de Red-Eyes |
| Blue-Eyes Ultimate | Trois crânes longs et trois cous armurés, ailes pleines, plaques ventrales et griffes ; les trois mâchoires gardent un axe neutre commun compatible avec le rig |
| Stardust | Corps propre à la carte, long cimier, gemmes violettes aux épaules et neuf vanes par aile ; remplacement du dragon générique |
| Slifer, Obelisk, Râ | Boucle ventrale côtelée sur tout le corps, coques dorsales rigides attachées au corps d’Obelisk, plumes d’armure fermées et anneau de Râ |
| Magicien Sombre | Casque/jupes d’armure réellement devant le corps, épaulettes hautes, pans arrière et sourcils adultes |
| Cyber Dragon, Néos, Utopie | Pointes/panneaux mécaniques, inserts du costume, déplacement du numéro 39 vers la coque d’épaule blanche au lieu d’un disque inventé derrière la tête |
| Floraison de Cendres | Suppression des chaussettes et sandales inventées, pieds nus et orteils, oreilles pointues, kimono gris/lavande et détail arrière des cheveux |
| Géant de Pierre | Casque et visière gravés, cylindres près du cou, épaules/blocs de pierre et grande épée ; remplacement de la silhouette de robot rond |
| Gardien Celte | Oreilles d’elfe, marques bleues, cheveux blonds, casque vert à ailettes ivoire, épaulières/cape et habits bruns |
| Magicienne de la Foi | Palette originale rouge/violet/magenta, visage et oreilles, queue de cheveux, cape et bâton à croissant ; suppression du halo et du joyau de poitrine sans référence |
| LANphorhynchus | Serpent mécanique ailé sans jambes, long bec, charnières et panneaux d’aile ; remplacement du dragon bipède |
| Magicien du Temps | Visage bleu/jaune avec deux yeux, aiguilles vertes, chapeau cylindrique plat, rouages et roulette sur bâton ; suppression du chapeau conique et des graduations inventées |
| Crâne Invoqué | Anatomie musculaire/osseuse propre, cornes courbées, clavicules/côtes et ailes bleues opaques ; remplacement du squelette générique |

## Vérification et limites

Les **73 tests ciblés** passent, dont quatre nouvelles régressions vérifiant l’absence des accessoires inventés, les coques dorsales rigides, l’axe commun des trois mâchoires, les nouveaux corps distincts et les budgets. Une régression supplémentaire mesure le pivot du shader réellement installé : le déplacement de l’ancre de la manche droite pendant l’incantation reste couvert par son rayon, tandis que le bras et le bâton bougent. La recette visuelle dédiée a observé dix poses front/¾ sans détachement, avec un écart maximal de 0,077291 pour un rayon de manche de 0,122 ; aucun déplacement artificiel de l’épaule n’a été ajouté. Les contrôles existants vérifient aussi les deux positions, les normales des Dieux, les attributs finis, les lots, les animations sans modification des buffers et la libération complète. Les [mesures de géométrie](artifacts/multireference-monsters-2026-10-13/geometry-measurements.json) distinguent les 72 constructions de leurs 36 identités. Le plafond reste **cinq fois la mesure originale du 11 octobre**, et ne repart pas de la vague déjà affinée. Magicien du Temps atteint 7 480 triangles en attaque pour un plafond de 7 500. Les modèles restent limités à cinq lots. Aucun changement du moteur natif, CDB, Lua, données cachées ou règles n’est compris dans ce travail.

La revue WebGL et les comparaisons front/profil/dos/¾ sont coordonnées séparément par la recette visuelle commune ; ce document ne prétend pas que les tests CPU établissent la fidélité visuelle ou les performances matérielles.

**La reproduction 1:1 intégrale n’est pas certifiée.** Quatorze modèles corrigés ont plusieurs illustrations imprimées ; les quatre autres — Géant de Pierre, Magicienne de la Foi, LANphorhynchus et Magicien du Temps — ont une seule illustration dans cet ensemble vérifié. Leurs surfaces cachées restent interprétées. Les sculptures licenciées restent des références secondaires avec leur propre stylisation. Le modèle utilise une pose neutre adaptée aux animations ; il ne reproduit pas la perspective différente de chaque dessin. Les illustrations alternatives divergentes et les éléments non confirmés restent documentés, et leur mélange n’est pas présenté comme fidèle.
