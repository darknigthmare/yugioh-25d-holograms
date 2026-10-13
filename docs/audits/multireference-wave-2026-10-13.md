# Modèles et références croisées — 13 octobre 2026

Cette vague reprend les formes encore approximatives avec des illustrations originales et des photos de figurines licenciées sous plusieurs angles. Les rééditions, recadrages et gros plans d’une même image sont distingués des véritables vues différentes. Les variantes de costume et d’illustration restent identifiées.

Les huit avatars prioritaires sont Yugi, Atem, Kaiba, Joey, Jaden, Yusei, Yuya et Playmaker. Leurs coiffures et vêtements sont repris de profil et de dos ; Atem porte sa tenue antique courte et sa cape bleue, distinctes de Yami Yugi moderne. Les couleurs de pantalon et de chaussures de Jaden et Yuya sont aussi partagées avec les portraits. Le [rapport avatars](multireference-avatars-2026-10-13.md) consigne 92 images conservées, dont 88 utiles, leurs angles et leurs limites.

Les monstres corrigés reçoivent des formes propres à leurs illustrations : armures et ailes, coques dorsales, visages, membres, cornes et accessoires. Le Dragon Ultime aux Yeux Bleus et le Dragon Poussière d’Étoile ont désormais des anatomies dédiées. Le [rapport monstres](multireference-monsters-2026-10-13.md) compare les poses Attaque et Défense au budget original.

La recherche des Jetons manquants a retrouvé **quatorze illustrations imprimées absentes de l’API utilisée**, recoupées avec le nom, les caractéristiques et les cartes génératrices natives. L’atlas affiche leurs scans originaux intacts, leur édition et un lien vers leur source. Les comptes historiques de 106 cartes et 120 illustrations de l’API restent ceux de cette API ; ces nouvelles références ne créent ni identité native ni nouvelle espèce. Voir les [treize premières associations documentées](artifacts/multireference-tokens-2026-10-13/verified-printed-token-references.json) et le [complément G Golem](artifacts/multireference-tokens-2026-10-13/additional-printed-g-golem-reference.json).

| Jeton | Code natif | Édition retenue |
| --- | --- | --- |
| Gadget | 645088 | TK04 |
| Jurraegg | 17228909 | SR04 |
| Bomb | 22411610 | OP26 |
| Ogdoadic | 23837055 | OP18 |
| Primal Being | 27204312 | OP12 |
| Generaider | 38053382 | OP13 |
| Prank-Kids | 43664495 | TK05 |
| Ice Barrier | 44308318 | OP17 |
| Trickstar | 51208047 | OP10 |
| Crystal Beast | 58371672 | SDCB |
| Duel Dragon | 60025884 | OP11 |
| Mask | 60514626 | OP19 |
| Dual Avatar Spirit | 87669905 | OP14 |
| G Golem | 98875864 | MAMA |

Un scan frontal ne documente pas le dos du monstre. Les modèles restent des interprétations procédurales, avec les zones reconstruites signalées dans les rapports ; aucune certification de fidélité intégrale 1:1 n’est déduite de cette vague. Les 184 autres avatars n’ont pas reçu de nouvelle reconstruction complète. Les présentations World Legacy imprimée et Legacy of the Duelist divergent, donc aucun nouvel alias visuel n’est imposé au code technique 69811711. Les Jetons dont l’apparence dépend d’un monstre copié gardent cette limite.

Les plafonds restent ceux des fixtures originales du 11 octobre : **cinq fois les triangles initiaux de chaque identité et de chaque pose**, sans nouvelle multiplication du modèle déjà affiné. Les moniteurs de géométrie vérifient aussi les lots de matériaux, les normales, les articulations, la stabilité des buffers après les gestes et la libération des ressources.

Le contrôle complet final réussit : **2 798 tests**, zéro échec, annulation ou test ignoré ; **147 modules** compilés. L’entrée compilée est `assets/index-CoVIKYEb.js` (974 601 octets, SHA256 `7921ecd5d82732d65f780fc7f43bf2ecd0544c15f7552228ce9135618ccd8e34`). Le [dossier de coordination](artifacts/multireference-delivery-2026-10-13/coordinator/manifest.json) conserve aussi les essais antérieurs et les corrections réellement vérifiées.

La comparaison finale porte sur **468 modèles** : 192 avatars, 240 Jetons et 36 autres monstres ; **42 modèles ont changé** dans cette vague. Quarante-quatre modèles sont contrôlés sous quatre angles, dont deux témoins. Les normales sont unitaires, les buffers restent stables pendant les gestes et les ressources de géométrie et de texture sont libérées. Le ratio maximal demeure inférieur à cinq fois la fixture originale. Les **17 parcours compilés du navigateur passent**, avec 102 captures ; l’atlas dessine réellement ses 364 modèles et les 192 avatars sont rendus. Le [rapport QA final](multireference-visual-qa-2026-10-13.md) et son [manifeste de 361 preuves](artifacts/multireference-qa-2026-10-13/final-proof-manifest.json) distinguent ces parcours des comparaisons de source. La scène chargée de quatorze objets passe sur les deux largeurs contrôlées : triangles de 207 344 à 223 652, appels de rendu stables, buffers inchangés après gestes et libération de géométrie et textures. Ces mesures de rendu logiciel ne certifient pas les performances d’un téléphone physique.

Les deux cartes commémoratives Yami Yugi réutilisent encore l’avatar du Pharaon antique alors que leurs impressions montrent sa tenue moderne. Leur reproduction complète reste à reprendre ; elle n’est pas comptée comme une nouvelle fidélité 1:1.
