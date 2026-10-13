# Sculptures des monstres — 11 octobre 2026

Les modèles utilisent davantage de polygones pour leurs contours et leurs détails visibles. Les comparaisons prennent les illustrations originales présentes dans le dépôt : une augmentation de résolution seule ne suffit pas à reproduire une carte. Les 36 identités de monstres hors Jetons gardent leurs passcodes, profils de jeu et joints GPU. Le Soldat de Pierre conserve sa surface facettée ; les surfaces rondes des autres corps, articulations et visages sont lissées. Les Jetons et avatars disposent de vérifications séparées.

Les douze cartes emblématiques reçoivent des modifications anatomiques :

- Slifer : corps serpentin courbé continu et queue progressivement effilée, deux mâchoires distinctes, crocs et défenses courbes, coutures du cou et nervures des ailes.
- Obelisk : masque et sourcils anguleux, bords pectoraux, jointures et doigts fermés, pouce et rainures des plaques d'avant-bras.
- Ra : panneaux du cou superposés, courbes et anneaux des pivots des ailes, yeux dans leur orbite et dents supérieures attachées au crâne.
- Dragon Blanc et Dragon Noir : crânes fermés avec sections de largeur et hauteur variables, longs museaux effilés, cavités buccales, mandibules et dents distinctes, paupières et plaques latérales.
- Magicien Sombre : menton adulte plus anguleux, joues moins rondes, armure pectorale, ornements courbes des épaules et gants. Magicienne des Ténèbres : mèches blondes balayées, contours des yeux, doigts et décolleté.
- Cyber Dragon : segments de carapace réellement courbes sur une ligne continue, lèvres arrondies des anneaux, bec dorsal, contour des yeux, dents et articulations latérales.
- Néos : biceps et avant-bras sculptés, contours rouges pectoraux et faciaux, cuisses et motif pelvien.
- Utopie et Soldat du Lustre Noir : anneaux et joints d'armure, contours des casques, mains et coutures dorées ; les ornements du bras droit suivent son joint d'animation.
- Ash Blossom : menton affiné, yeux en amande, petit nez, mèches courbes et nœud fermé, plis de manches et jupe modelés. Les anciens triangles de cheveux donnant une impression d'oreilles pointues sont retirés.

Kuriboh possède des mains et pieds verts, des griffes dorées, des anneaux dorés autour des yeux et une fourrure plus fine limitée aux contours et au dos. Sangan conserve trois yeux dorés à pupille fendue, ajoute ses mains levées et ses griffes argentées. Bébé Dragon reçoit un visage plus rond et des yeux bleus. Robot Synchron remplace le soldat mécanique générique par un torse riveté, un haut chapeau cylindrique orange, un masque, un foulard blanc et des chaussures orange arrondies. Ces quatre cartes utilisent leurs crops originaux existants.

Le rendu distingue les matières : fourrure, peau et tissu diffusent une lumière mate ; les armures métalliques conservent leur réponse propre. Les nouvelles géométries utilisent les cinq lots de matériau existants. Les tubes et crânes ajoutés sont fermés avec des caps réutilisant leurs anneaux de bord ; les coutures de normales sont lissées après les modifications de rayon ou du menton. Les actions utilisent toujours le shader du rig, sans modifier les buffers.

Les [72 mesures](artifacts/monster-fidelity-2026-10-11/refined-models.json) couvrent chaque identité au repos et en défense. Le plafond se calcule à partir du [budget exact précédent de chaque carte et pose](../../test/fixtures/hologram-triangle-budgets-2026-10-11.js), multiplié par cinq. La mesure maximale est **12 932 triangles**, avec au plus cinq lots GPU couleur ; la croissance maximale est **×4,031** pour Robot Synchron au repos. Les 36 surfaces sont finies et les quatre actions ne réécrivent aucun buffer. Le [journal ciblé](artifacts/monster-fidelity-2026-10-11/targeted-tests.txt) contient **61 tests réussis**, incluant 36 régressions sur les deux poses, la libération exacte des ressources, les joints des nouveaux ornements, les matières et la fermeture des tubes. Les sources et copies avant modification sont épinglées dans le [manifeste](artifacts/monster-fidelity-2026-10-11/manifest.json).

Ces contrôles de modules et de géométrie ne remplacent pas les comparaisons Chromium réalisées séparément avec les mêmes caméra, éclairage et poses avant et après. Les illustrations déterminent les motifs visibles ; le dos, les zones cachées et la profondeur restent interprétés. Les proportions et les poses demeurent des adaptations procédurales. Une fidélité spatiale intégrale 1:1 n'est pas certifiée. Aucune règle, statistique native, archive WASM, CDB ou script de carte n'est modifié.
