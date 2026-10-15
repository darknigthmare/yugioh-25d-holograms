# Fidélité des volumes des 192 avatars — 11 octobre 2026

Cette vague améliore les 192 modèles du catalogue existant. Elle ne change ni le catalogue, ni les portraits, ni les conditions de déblocage, ni les gestes, ni les règles du duel. Les volumes restent des interprétations procédurales : les illustrations consultées ne fournissent pas les vues de côté et de dos nécessaires à une attestation 1:1.

## Changements visibles

- Le visage possède désormais un contour de mâchoire, des tempes et un menton effilé. Les yeux ont une sclère en amande, un contour de paupière et une iris moins bombée ; 21 profils explicites différencient notamment le grand regard violet de Yugi, le regard plus fin d’Atem, les yeux bleus de Kaiba et leurs proportions de mâchoire. Les autres profils utilisent les proportions du catalogue.
- Les mèches ont une section lenticulaire, une courbure et une pointe progressive. Les volumes longs suivent des courbes au lieu d’être des ellipsoïdes empilés. Les doublons de normales des coutures radiales sont moyennés avant le regroupement des géométries.
- Le torse possède une taille et des épaules dessinées par un profil. Les bottes, talons, plis de pantalon et coutures de manches donnent des détails lisibles de côté et de dos. Les doigts possèdent une phalange terminale ; les petites pièces métalliques restent peu coûteuses.
- Yugi et Atem conservent une étoile noire pleine et extrudée, bordée de magenta, plutôt que sept pyramides minces séparées. Yugi possède les longues mèches dorées latérales, le col scolaire haut et un Puzzle à quatre faces avec son œil.
- Kaiba possède une frange coiffée en neuf mèches, la doublure rouge du manteau, les brides de bras et son pendentif. Joey possède des mèches larges balayées sur le côté et le tee-shirt clair. Jaden possède ses mèches orangées et le col à boutons de Slifer ; Mai possède des mèches ondulées et des boucles latérales.
- Bakura et Yami Bakura portent l’Anneau du Millénium avec ses cinq pointes. Marik et Atem conservent leurs accessoires dorés. Yusei possède ses pointes latérales et diagonales, la marque de joue et les éléments orange de sa veste.
- Le Duel Gazer de Yuma occupe un seul œil à hauteur du regard ; sa Clé de l’Empereur possède une tige et des dents. Yuya possède sa mèche relevée et le mantelet blanc de spectacle. Playmaker possède sa coiffe angulaire dorée et mauve, ses lignes lumineuses de costume et ses repères de gants. Yuga possède la capuche blanche et les poches du short. Yudias conserve le casque noir, le manteau blanc, sa doublure rouge, le mantelet bleu et ses ornements dorés.

Les ajouts de bras utilisent les mêmes groupes articulés que les pièces qu’ils accompagnent. Les nouveaux détails du visage et de la chevelure restent dans les groupes de tête et de cheveux. Aucun modèle ne reçoit les cartes ou l’état privé du duel.

## Références et limites

Les sources primaires conservées dans [l’inventaire de références](artifacts/avatar-catalogue-review-2026-10-11/references-used.json) ont servi de point de départ. Les originaux Konami de Yugi, Kaiba, Joey, Jaden, Yusei, Yuma, Yuya et Playmaker, la planche Duel Monsters et la planche TV Tokyo de SEVENS/GO RUSH!! ont été inspectés visuellement pour les corrections de cette vague. Les couleurs hexadécimales demeurent des approximations, et les tenues du catalogue représentent parfois une autre apparence que l’illustration consultée. Le portrait vectoriel du catalogue ne constitue pas une référence officielle de fidélité.

Le fichier exploratoire extérieur `playmaker-official.png` est mal nommé et montre Yuya. Il a été écarté pour Playmaker ; l’image correcte consultée est l’original Konami `vrains01.png` décrit dans l’inventaire.

La première capture intermédiaire a révélé une occlusion réelle : l’ancien dôme de cheveux traversait les deux yeux, particulièrement visible avec le nouveau contour du visage. La surface avant du dôme a été ouverte au-dessus du regard en conservant le scalp arrière. La recapture indépendante de douze visages a confirmé la disparition de cette bande. Les preuves visuelles complètes de la vague sont produites séparément avec caméra, pose et lumière constantes.

La reconstruction n’établit pas une ressemblance exacte pour tous les 192 personnages, notamment pour les visages sans références inspectées, les détails des revers, les plis et les vues arrière. Les adaptations bipèdes de Nyandestar et Bochi restent celles du système de duel existant.

## Mesures exécutées

Le modèle antérieur a été copié avant toute édition hors du dépôt, puis les 192 géométries ont été mesurées : 5 734 à 9 764 triangles, moyenne 7 086,5. Son SHA-256 est `cd7ff30ab0da574185932f6062a101d14f90de3fe239449ff3ad55efd527376d`.

Les modèles finaux contiennent 12 348 à 20 964 triangles, moyenne 15 505,43. Le rapport maximal par rapport au même avatar est **2,768617×**, pour Yusei ; les 192 modèles restent sous le plafond individuel **5×**. Le plafond est vérifié à partir d’une [mesure antérieure figée](../../test/fixtures/duelist-avatar-triangle-baseline-2026-10-11.json), et non d’une estimation globale. Le maximum reste de neuf regroupements de rendu. La mémoire des attributs de géométrie atteint au maximum 3 371 808 octets pour un avatar ; cette mesure CPU ne constitue pas un résultat de fréquence d’images sur téléphone.

Le [rapport CPU final](artifacts/duelist-avatar-fidelity-2026-10-11/cpu-audit.json) enregistre les 192 résultats, les enveloppes, les buffers et sept empreintes de sources. Toutes les positions sont finies, toutes les normales sont unitaires et les attaches rigides restent valides. Les 192 silhouettes géométriques restent distinctes.

Les [28 tests ciblés](artifacts/duelist-avatar-fidelity-2026-10-11/targeted-tests.txt) ont réussi : budget et géométrie du catalogue, variantes canoniques, articulations et attaches, gestes et ressources stables, mâchoires, détail du Duel Gazer, accessoires emblématiques et attaches des signaux de gants. Les anciens plafonds absolus de 12 000/14 000 triangles ont été remplacés par les plafonds individuels mesurés ×5, en conservant les assertions de forme, de sélection, de rendu, d’articulation et de destruction.

Source finale `src/ui/DuelistAvatarModels.js` : 61 047 octets, SHA-256 `993b8d3b0d3da294b3752edd3d7b3487a1f59ed82ce07065ffba7500d880507e`. Le catalogue conserve son empreinte initiale `9c665ed069cfcd0829f1f4a85a6b3c635f1ebab9c96c1f892b78823f8ce4e68c`. Les tests complets, la vérification navigateur compilée et la livraison GitHub/Vercel restent des contrôles distincts, décrits par leurs propres preuves.
