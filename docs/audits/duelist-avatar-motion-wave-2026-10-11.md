# Avatars articulés et choix d’invocation — 11 octobre 2026

Le sélecteur des 192 personnages comprend un studio WebGL plein corps. Le joueur tourne le modèle à la souris, au toucher ou avec les flèches du clavier et les boutons ; Début ou Recentrer rétablit la vue initiale. Les personnages verrouillés peuvent être examinés. Leur utilisation conserve la condition de déblocage existante.

Le studio se charge à la première demande de Vue 3D. Il utilise un seul renderer et remplace le modèle dans le même canvas. La fermeture, le retour au portrait et les chargements tardifs libèrent leurs ressources. La visibilité de la page, du studio et la réduction des animations contrôlent sa boucle de rendu. Une indisponibilité WebGL ramène au portrait local.

## Personnages et gestes

Les 192 identités, huit séries et conditions de déblocage sont conservées. Les tenues, couleurs et accessoires de plusieurs héros et personnages de SEVENS et GO RUSH!! sont corrigés à partir des références officielles inspectées. Les nouveaux champs de vêtement restent facultatifs : un profil non vérifié conserve ses anciens réglages. Les portraits et modèles représentent également les formes animales de Nyandestar et Bochi. Ces modèles restent des interprétations stylisées.

Le [registre de corrections et références](artifacts/avatar-catalogue-review-2026-10-11/README.md) distingue 55 profils dont les traits appliqués ont une référence primaire et deux classifications de données seulement. Il conserve les modifications avant/après, URLs, empreintes, planches inspectées et limites de vérification ; il ne certifie pas les 137 autres apparences ni tous les costumes d’une même identité.

Les bras ont des articulations d’épaule, coude, poignet et disque de duel. Les géométries partagent un squelette par avatar et restent groupées par matériau. Sept gestes couvrent invocation, activation, attaque, dégâts, victoire, défaite et match nul. Aucun matériau ni géométrie n’est créé à chaque image. La destruction du modèle libère également la texture GPU du squelette.

Les [preuves CPU et galeries WebGL](artifacts/duelist-avatar-models-2026-10-11/DELIVERY-INDEX.md) contrôlent les 192 signatures distinctes, au maximum **9 lots et 9 764 triangles**, et 56 poses dont tous les sommets transformés restent finis. Trois galeries montrent 24 gestes, douze personnages corrigés avec leurs portraits et douze vues de détail. Les 24 textures de squelette effectivement allouées sont libérées une fois ; les renderers des galeries finissent avec zéro géométrie et zéro texture. Ces rendus isolés sur sources sont distingués des Duels compilés.

La scène utilise les événements publics validés du moteur. Un coût en LP ou une simple mise à jour des LP ne déclenche pas le geste de dégâts. L’annulation d’une ancienne attaque ne supprime pas un geste plus récent. La victoire, la défaite et le match nul affichent des poses statiques, y compris après un changement de personnage ou le retour à la Vue Réelle. Le résultat public est transmis par une API séparée ; le résumé du plateau conserve exactement ses huit champs, sans identité de carte cachée ni contenu de la main adverse.

## Collection portable

Exporter ma collection produit un fichier JSON versionné des acquisitions et du personnage choisi. Importer ma collection valide le fichier avant tout changement et fusionne les acquisitions avec celles déjà présentes dans le navigateur. L’import ne change ni les statistiques, ni les missions, ni les Decks, ni le Duel en cours.

Un choix humain plus récent annule un import encore en lecture. Une victoire réellement enregistrée pendant cette lecture reste incluse dans la fusion. Les fichiers invalides, inconnus, incompatibles, trop volumineux ou contenant une sélection non acquise sont refusés. Si le stockage local échoue, la collection importée reste utilisable pendant la session avec un message explicite.

Les compteurs servant aux déblocages sont normalisés sans créer de résultat : les victoires, défaites et matchs nuls ne peuvent pas dépasser les Duels enregistrés. Un profil avec 30 victoires et zéro Duel ne rapporte donc aucune victoire effective. Les profils contenant des champs supplémentaires, accesseurs ou Proxy révoqués sont refusés sans exception. La collection reste une préférence locale modifiable par son propriétaire, sans compte ni classement sécurisé.

## Invocation suivante dans une chaîne

La façade native conservait le souhait d’emplacement du clic initial jusqu’au prochain menu. Si une deuxième carte était invoquée dans cette même chaîne, elle pouvait être placée automatiquement dans la zone de la première carte, devenue libre entre-temps. Le souhait est désormais consommé au premier SELECT_PLACE pertinent, même lorsqu’il est refusé : l’invocation suivante demande son propre emplacement.

Les [deux reproductions WASM avant/après](artifacts/native-placement-consent-2026-10-11/README.md) utilisent Robot Synchronique, Magicien de la Foi et Dispositif d’Évacuation Obligatoire. Elles vérifient séparément un clic initial valide et un clic refusé puis corrigé. Magicien revient en zone 4 choisie par le joueur dans les deux cas, sans RETRY ni erreur Lua. Les petits plateaux sont déclarés avant le démarrage pour isoler cette interaction ; aucun Duel déjà commencé n’est modifié. Les archives Lua, CDB et WASM conservent leurs empreintes ; seule la façade de consentement change.

La [revue indépendante](duelist-avatar-motion-review-2026-10-11.md) et les contrôles navigateur compilés sont finalisés avant publication de cette vague. Les preuves des 8 et 9 octobre restent historiques et inchangées.

## Vérification du build final

Le [check final](artifacts/duelist-avatar-motion-2026-10-11/check-final.txt) passe **2 671 tests sur 2 671**, sans échec, annulation ou cas ignoré, puis les audits de Terrains et le build de **131 modules**. L’[audit des dépendances](artifacts/duelist-avatar-motion-2026-10-11/security-final.txt) rapporte zéro vulnérabilité. Les anciennes fixtures de tests des cinématiques de Terrain construisent maintenant une véritable RealDuelView ; elles gardent leurs assertions de confidentialité et vérifient aussi la déduplication du même événement.

Le [gel applicatif](artifacts/duelist-avatar-motion-2026-10-11/build-freeze.json) lie les sources et les **17 fichiers HTML/JS/CSS compilés** à leurs tailles et SHA-256. L’entrée est `/assets/index-BdRAqqlF.js`, **762 921 octets**, SHA-256 `3e73212c9b5dd12c7a3dc62746bc66e552bddaf908c208fed65f07178d1de57c`. Le changement de SHA de la façade native est explicite ; les trois archives natives restent identiques.

Le parcours d’activation native a identifié une illustration locale absente : `/cards/small/43422537.jpg`, Double Summon. Le [JPEG original référencé](artifacts/duelist-avatar-motion-2026-10-11/double-summon-illustration.json) est ajouté sans transformation : **19 651 octets, 268 × 391**, SHA-256 `c238fa23bbc6ebe686e0e44482114cdf8376af364dc1b0b4cfc0795f63434809`. Son activation conserve l’image imprimée au lieu de demander un fichier absent.

Cet ajout d’image est intervenu après le check complet. Le [nouveau build](artifacts/duelist-avatar-motion-2026-10-11/build-after-illustration.txt) passe avec 131 modules ; les **160 sources applicatives testées et les 17 fichiers HTML/JS/CSS restent identiques octet pour octet**. Le gel final couvre ces sources, le JPEG ajouté et sa copie dans dist : **161 fichiers source, 17 fichiers compilés de texte et une illustration statique supplémentaire**. Les comptes de tests proviennent du check exécuté sur le code applicatif identique ; aucun nouveau résultat de test n’est attribué au seul ajout du JPEG.

Le piège de focus écarte les contrôles masqués d’une section details fermée, même lorsque Chromium conserve leurs rectangles de layout. Le [contrôle source avant/après](artifacts/duelist-avatar-focus-2026-10-11/after-report.json) passe quatre contextes et 36 assertions sur desktop/mobile, avec et sans checkVisibility. Les parcours compilés vérifient ce comportement séparément.

## Parcours navigateur compilés

Le [rapport final compilé](artifacts/duelist-avatar-motion-2026-10-11/browser-compiled/report.json) passe **huit parcours et 52 captures**, avec le gel `ac66a4463fc67f5590662b835318d0e8f34efc0b8871c539c7a66445b8921e92`. Ses **161 sources et 21 corps HTTP** restent identiques avant/après : les 17 HTML/JS/CSS, trois archives natives et le JPEG Double Summon. Le driver et ses trois helpers restent également identiques ; aucune API QA ni objet applicatif n’est utilisé, et aucun Game démarré n’est injecté ou modifié. Le [compte rendu navigateur](duelist-avatar-motion-browser-2026-10-11.md) et l’[index de livraison](artifacts/duelist-avatar-motion-2026-10-11/browser-compiled/delivery-index.json) distinguent les 63 originaux exécutés des fichiers de vérification et documentent leurs empreintes.

| Parcours | Résultat vérifié |
| --- | --- |
| Ordinateur, 1 280 × 900 | Les 192 modèles exigent chacun un nouveau rendu réel avec leur ID et libellé public, dans le même canvas. Rotation clavier/souris/boutons, pause hors écran, réduction des animations, reprise, fermeture et perte WebGL passent. Le changement de personnage pendant le Duel conserve son état public ; invocation, activation, attaque et dégâts natifs sont observés. |
| Mobile, 390 × 844 | Dix personnages emblématiques, aperçu verrouillé, rotation tactile et absence de débordement horizontal. Les actions natives restent jouables sous mouvement réduit ; les gestes transitoires sont omis. |
| Progression par concession | Deux pertes sont déclarées avant bootstrap, puis une concession réellement jouée enregistre le troisième Duel et débloque Tristan. Sa sélection persiste après rechargement et produit un téléchargement réel. |
| Victoire Exodia | Un Deck légal isolé est choisi avant bootstrap ; le moteur natif termine réellement par Exodia. Le résultat, Mokuba acquis, sa sélection après rechargement et les poses tenues de victoire/défaite passent. |
| Import/export pendant le Duel | Les deux téléchargements réellement obtenus fusionnent Tristan et Mokuba. Le Duel public et le Deck restent identiques ; null, JSON mal formé, identité inconnue et fichier trop volumineux sont refusés. |
| Stockage refusé | Une panne limitée à la préférence d’avatar laisse la collection importée en mémoire, annonce la portée de session et permet son export réel. |
| Focus sans checkVisibility | Les boucles Tab/Shift+Tab passent aux deux tailles avec les sections de sauvegarde ouvertes ou fermées, même lorsque cette capacité DOM manque avant bootstrap. |
| WebGL réellement désactivé | Chromium est lancé avec `--disable-webgl` et `--disable-3d-apis`. Le portrait utilisable remplace le studio, sans canvas restant, et le personnage verrouillé reste refusé. |

La boucle exhaustive applique temporairement une préférence de mouvement réduit pour supprimer les animations d’ambiance ; elle exige un nouveau dessin effectif après chaque clic et restaure la préférence initiale. Les dix captures emblématiques par taille gardent la préférence originale. Elle ne remplace pas le renderer ni les interactions publiques.

Le modal de résultat couvre la scène sur la capture de victoire. Les datasets publics, observés stables pendant 500 ms dans le parcours compilé, attestent les états terminaux ; la galerie WebGL articulée distincte montre leurs poses. Le maintien après changement de préférence ou de vue est couvert séparément par les tests source. Cette capture de résultat n’est donc pas une inspection visuelle du squelette derrière le modal.

Tous les parcours ont zéro erreur HTTP, JavaScript, CSP ou requête native et zéro erreur console inattendue. Le seul navigateur volontairement privé de WebGL conserve exactement trois diagnostics THREE attendus, deux refus de création de contexte et un échec de création ; les autres contextes n’en produisent aucun. Les tentatives diagnostiques interrompues ou échouées restent hors du dépôt et ne sont pas reprises comme preuve finale.
