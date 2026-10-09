# Avatars de duellistes — 9 octobre 2026

Le joueur humain choisit désormais son apparence dans la préparation du duel ou les options. La sélection change son nom dans le HUD et son personnage 3D en Vue Réelle, conserve son deck et le même Duel en cours, et survit au rechargement du navigateur.

## Catalogue et progression

| Série | Apparences |
| --- | ---: |
| Duel Monsters | 28 |
| GX | 28 |
| 5D’s | 24 |
| ZEXAL | 24 |
| ARC-V | 28 |
| VRAINS | 20 |
| SEVENS | 20 |
| GO RUSH!! | 20 |
| Total | 192 |

Yugi, Kaiba, Joey, Téa, Jaden, Yusei, Yuma, Yuya, Playmaker, Yuga et Yudias sont disponibles dès le départ. Les 181 autres apparences ont une condition explicite : 69 par victoires, 65 par duels terminés, 31 par médailles et 16 par mission précise. Les seuils vont jusqu’à 30 victoires, 30 duels ou 36 médailles. Les douze missions existantes permettent réellement d’atteindre tous les seuils de campagne.

Le module de progression lit les compteurs et résultats existants. Il ne crée ni victoire, ni duel, ni médaille. Les résultats de fin de Duel conservent leur garde de déduplication ; une expiration Swiss sans résultat de Duel ne rapporte pas un faux résultat. Un avatar acquis reste disponible après réinitialisation ou import d’une progression de campagne plus faible. L’ouverture du sélecteur collecte aussi les conditions déjà remplies par une progression importée.

La préférence versionnée `ygo_duelist_avatar_v1` valide les identifiants, la forme du profil et les acquisitions. Les sauvegardes invalides ne sont pas écrasées automatiquement ; un choix explicite remplace cette seule préférence cosmétique. Si le navigateur refuse le stockage, le choix reste utilisable pendant la session et le sélecteur indique l’échec de sauvegarde. Cette progression est locale et modifiable par son propriétaire ; elle ne constitue pas un compte ou un classement sécurisé.

## Présentation

Les 192 profils déclarent coiffure, palette, coupe de vêtement, accessoire, stature, carrure et pose. Les portraits SVG utilisent les mêmes profils canoniques. Le sélecteur propose recherche avec alias et accents, filtres par série et disponibilité, huit pages de 24 personnages, aperçu des avatars verrouillés, condition et barre de progression. Seule leur utilisation reste désactivée tant que la condition n’est pas remplie.

Les modèles WebGL comprennent visage, cheveux en volume, mains, jambes, chaussures, vêtements, accessoires et disque de duel. Les silhouettes emblématiques ont des détails dédiés : coiffure tricolore et Puzzle de Yugi/Atem, manteau blanc et frange courte de Kaiba, frange blonde de Joey, veste rouge de Jaden, mèches dorées de Yusei, cheveux rouges/verts et lunettes de Yuya, costume de Playmaker. Les apparences sont des interprétations stylisées ; le catalogue ne prétend pas inclure tous les figurants, toutes les transformations ou reproduire les personnages intégralement en 1:1.

La [galerie WebGL de quatorze apparences emblématiques](artifacts/duelist-avatars-2026-10-09/model-gallery-2026-10-09.png) montre les modèles effectivement rendus. Le contrôle des 192 modèles trouve 192 signatures géométriques distinctes, couleurs exclues, avec au maximum **9 lots et 9 688 triangles** par avatar.

Deux personnages sont visibles en Vue Réelle. Les géométries sont fusionnées par matériau et partie animée pour limiter les appels de rendu. Le changement d’apparence libère les anciennes géométries et les matériaux. Les animations légères respectent la réduction des mouvements, la visibilité de la page et la fin du duel. Les portraits et modèles ne chargent aucun asset distant supplémentaire.

Les identifiants cosmétiques sont transmis séparément des données de Duel. Le résumé public du plateau garde exactement ses huit champs agrégés ; les avatars n’obtiennent aucune identité de carte cachée, main adverse ou ordre du Deck.

## Vérification

Les suites ciblées exercent le catalogue complet, les seuils, missions et sauvegardes, le refus d’un avatar inconnu ou verrouillé, les acquisitions conservées, la sélection en mémoire lorsque le stockage échoue, le chargement différé de la Vue Réelle, la séparation du GameState et la libération des ressources 3D. Le [contrôle local final](artifacts/duelist-avatars-2026-10-09/check-final.txt) réussit **2 600 tests sur 2 600**, sans échec, annulation ni cas ignoré, puis les audits de Terrains et le build Vite de **128 modules**. L’[audit des dépendances](artifacts/duelist-avatars-2026-10-09/security-final.txt) rapporte zéro vulnérabilité.

Le [gel du build](artifacts/duelist-avatars-2026-10-09/build-freeze.json) lie 157 fichiers applicatifs et les 14 fichiers HTML/JS/CSS compilés à leurs octets et SHA-256. L’entrée courante est `/assets/index-u38YK6zY.js`, **742 088 octets**, SHA-256 `de12db2a24b25bcc3d16f82c882d887d3597922ea8ca8f4c37cc9daaeb7b5ebd`. La façade native et les archives Lua/CDB/WASM conservent leurs empreintes de référence.

Le [rapport navigateur compilé](artifacts/duelist-avatars-2026-10-09/browser/report.json), produit par [le driver reproductible](../../scripts/audit-duelist-avatars-browser.py), réussit **quatre parcours et dix-huit captures**, sans erreur JavaScript ni échec d’asset natif. Le serveur local applique les headers de production ; les parcours desktop/mobile ne signalent aucune violation CSP. Les 17 corps HTTP HTML/JS/CSS/WASM/CDB/scripts correspondent au build local avant et après le contrôle, et les fichiers applicatifs restent identiques.

Les parcours desktop 1280 × 900 et mobile 390 × 844 vérifient les huit séries, la pagination complète, la recherche avec alias/accents, les verrouillages consultables, la sélection persistante, le retour au bon dialogue par Échap, le parcours Tab et la conservation du focus après Entrée. Un changement Jaden → Kaiba pendant un duel natif préserve la main avec ses UIDs, les LP, la phase, les cimetières et le journal. Une Invocation Normale réelle réussit ensuite sur les deux tailles.

Un parcours précharge deux défaites avant bootstrap, puis effectue une vraie concession via le bouton du jeu : le troisième duel terminé débloque Tristan, qui reste sélectionnable après rechargement. Un autre prépare un Main de 40 cartes valide Advanced, avec les cinq parties uniques d’Exodia et un tirage déterministe défini avant bootstrap : le moteur natif produit réellement `WIN/Exodia`, les statistiques deviennent duel 1 / victoire 1 et Mokuba est acquis, annoncé et sélectionnable après rechargement. Aucune partie démarrée n’est injectée ou modifiée. Ces fixtures sont documentées séparément des résultats effectivement produits.

La [revue indépendante](duelist-avatar-review-2026-10-09.md) contrôle la progression, les modales, le chargement différé, la confidentialité et la destruction des ressources. Le correctif de préférence d’animation est testé dans les deux directions, et le changement d’avatar conserve maintenant le focus sur la vignette sélectionnée.

Les archives Lua/CDB/WASM, les anciens profils de monstres et les matrices historiques de règles/Terrains appartiennent à la livraison précédente. Cette modification porte sur la présentation et la progression des avatars.
