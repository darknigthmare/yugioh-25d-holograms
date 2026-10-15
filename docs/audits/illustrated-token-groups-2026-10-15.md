# Groupes illustrés des Jetons — 15 octobre 2026

Deux illustrations imprimées disposent désormais d'une composition 3D dédiée au lieu d'un animal ou d'une flamme générique. Les sources consultées sont les scans locaux inchangés de [Prank-Kids TK05-JP050](../../public/tokens/reviewed/43664495.png) et de [Crystal Beast SDCB-EN049](../../public/tokens/reviewed/58371672.png).

Il s'agit de reconstructions procédurales. Cette livraison ne certifie pas une fidélité 1:1 : les petites silhouettes occultées, les accessoires minuscules et les faces arrière restent interprétés.

## Composition reconstruite

- **Prank-Kids, `43664495`** : grand personnage violet à l'arrière gauche, chien brun à gauche, petit personnage vert devant à gauche, personnage aux cheveux de feu devant au centre et personnage bleu levant les bras devant à droite. Vingt-cinq petites figures supplémentaires ont leur propre géométrie et position sur le toit incliné, le sol, les murs et les bâtiments lointains. Les couleurs de coiffure et de vêtement les distinguent. **Trente est l'inventaire du modèle, pas un décompte canonique certifié de tous les personnages de l'image** : certaines parties de la foule imprimée sont composites ou occultées.
- **Crystal Beast, `58371672`** : sept pierres distinctes, sans corps d'animal ajouté. Violet en haut à gauche, pierre bleu-violet pâle en haut au centre, verte en haut à droite, rouge au centre, jaune à gauche, ambre en bas à gauche et bleue en bas à droite. Les tailles, hauteurs et espacements viennent du scan. Le saphir a une silhouette de prisme avec un plateau clair ; les pierres jaune et ambre ont deux contours de goutte différents.
- **Effets visibles de l'illustration** : deux bouffées de vapeur au-dessus du grand personnage violet, traits de vent près du personnage vert, étincelles et quinze étoiles blanches sur les arêtes des gemmes. Ces effets utilisent les mêmes buckets de matériaux que la géométrie. Ils ne créent aucun effet de jeu supplémentaire. Leur déplacement suit le rig commun ; ce ne sont pas des simulations de particules indépendantes.

Les volumes et accessoires des cinq grands sujets restent schématiques. Les cinq sujets dominants et les sept pierres sont présents ; les formes et détails précis des personnages secondaires demandent encore du travail pour rejoindre l'illustration.

## Budgets et stabilité

Les limites restent celles des mesures originales du **11 octobre 2026**, multipliées par cinq une seule fois. Aucun budget intermédiaire n'est utilisé comme nouvelle référence.

| Jeton | Pose | Triangles | Référence originale | Plafond global ×5 | Batches |
| --- | --- | ---: | ---: | ---: | ---: |
| Prank-Kids | ATK | 10 964 | 2 196 | 10 980 | 5 |
| Prank-Kids | DEF | 11 532 | 2 764 | 13 820 | 5 |
| Crystal Beast | ATK | 2 354 | 2 128 | 10 640 | 4 |
| Crystal Beast | DEF | 2 922 | 2 696 | 13 480 | 4 |

Les quatre cas ne présentent aucune valeur non finie ni normale nulle ou non unitaire. Les animations d'attaque, d'invocation, d'effet et de victoire conservent les buffers, leurs objets et leurs versions. Les ressources visibles, de profondeur et de distance sont détruites une seule fois.

Le constructeur est appelé avant les familles génériques pour ces deux codes seulement. Les lignes natives, statistiques, identités de cartes et règles ne changent pas. `getTokenIllustrationFrame(code)` expose le cadre imprimé dans les coordonnées du factory pour cadrer les instances de l'Atlas ; le constructeur de duel garde ses cercles de projection et sa pose ATK/DEF.

## Vérifications et preuves

Le [journal ciblé](artifacts/illustrated-token-groups-2026-10-15/targeted-tests.txt) contient **22 tests réussis, 0 échec** : neuf nouveaux tests de composition et les suites Jetons existantes, dont le contrôle des 240 Jetons dans les deux poses ATK/DEF. Les positions sont mesurées sur les géométries produites. Les tests ne se limitent pas à vérifier l'existence des noms de pièces.

La [preuve géométrique](artifacts/illustrated-token-groups-2026-10-15/proof.json) contient les mesures, les inventaires, les empreintes des sources et scans, les attributs et les limites explicites. La [recette](artifacts/illustrated-token-groups-2026-10-15/recipe.mjs.txt) et le [test archivé](artifacts/illustrated-token-groups-2026-10-15/composition.test.js.txt) sont enregistrés avec une extension non exécutable pour éviter leur redécouverte par `node --test`.

L'inspection WebGL indépendante a repéré un grand disque de lueur à bord net et des silhouettes incorrectes de gemmes dans une première version. Le disque a été supprimé, les halos réduits, et les contours du saphir et des deux gouttes corrigés. Les traits du visage et les accessoires Prank-Kids ont également été replacés devant leurs volumes. La recapture indépendante de cette version est suivie dans l'audit visuel général du 15 octobre ; les versions intermédiaires ne valent pas validation des pixels finaux.
