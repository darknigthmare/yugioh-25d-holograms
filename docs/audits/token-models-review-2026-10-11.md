# Revue indépendante de la vague Jetons — 11 octobre 2026

## Résultat et périmètre

**PASS : revue finale des sources, des preuves locales compilées et de la liste de livraison.** Les constats de navigation obsolète, de chemins d’images manquants et de propriétés héritées ont été traités. Aucun blocage connu ne subsiste dans le périmètre relu. Ce rapport ne remplace pas les futures observations CI et Vercel sur le nouveau SHA distant réellement publié.

Le réviseur a lu les différences applicatives, les tests, les logs et les artefacts produits, puis vérifié leurs octets et empreintes. Il n’a exécuté aucun test, core WASM, build, navigateur ou publication et n’a édité aucun fichier applicatif, test, script, asset ou preuve historique. Son seul fichier suivi modifié est ce rapport. Les exécutions ci-dessous appartiennent aux producteurs de preuves ; les contrôles d’empreintes, de frontières et de cohérence ont été répétés indépendamment.

Le socle local reste `82d8ef5bffb6eef01d197ea00a8cb2694e2e2870`, le parent distant prévu est `f2b610cf3242c473905c8bb86861db55e7484011` et leur arbre est `a5c236b626b194ed1ec3116e4bda9d00506f0f5c`. Master est épinglé séparément à `025f8ebd928cd8881c0e5e0d626dda63c933bf31`, arbre `19cb3d9a194f911d0042b0d88c737b45ad7d6650`. La livraison prévue utilise la branche existante et la PR nº 3 ; elle n’autorise aucune fusion ou promotion en production.

## Contrôles effectifs et gel

| Preuve relue | Résultat effectif |
| --- | --- |
| [Contrôle complet final](artifacts/token-delivery-gates-2026-10-11/check-final.txt) | Reporter Node spec : 2 731 tests, 2 731 réussites ; zéro échec, annulation, skip ou todo. Build Vite : 146 modules. |
| [Audit sécurité conservé](artifacts/token-delivery-gates-2026-10-11/security-final.txt) | Zéro vulnérabilité. Audit effectivement exécuté précédemment ; `package.json` et `package-lock.json` sont byte-identiques au socle. Aucune nouvelle exécution n’est déduite du dernier durcissement. |
| [Gel final](artifacts/token-delivery-gates-2026-10-11/build-freeze.json) | 653 fichiers source et assets gelés, 24 fichiers compilés HTML/JS/CSS, 478 assets statiques supplémentaires ; tous les octets et SHA256 correspondent aux fichiers présents. Les 653 pins sont identiques au snapshot avant contrôle complet. |
| [Rapport Chromium compilé](artifacts/token-model-browser-2026-10-11/browser-compiled/report.json) | PASS global : neuf parcours, 50 captures, 653 sources et 505 corps HTTP identiques avant/après. |
| [Index navigateur](artifacts/token-model-browser-2026-10-11/browser-compiled/delivery-index.json) | 63 chemins épinglés exacts ; les 53 originaux, dont 50 PNG, sont byte-identiques au miroir extérieur du producteur. |
| [Preuve géométrique](token-model-geometry-review-2026-10-11.md) | 240 constructions, 42 familles ; 36 modèles hors Jetons conservés. Pins et copies des artefacts modèles conformes au gel. |
| [Conservation historique](artifacts/token-delivery-gates-2026-10-11/historical-after.json) | 1 847 fichiers, 492 607 582 octets : mêmes SHA256 que le snapshot antérieur et mêmes Git blobs que HEAD. |

Empreintes du gel effectivement certifié :

- Gel final : `1ee6840a88bdab54193f4edf6db3b09ff18524cb42ed5cf5c584fce320c3069d`.
- Entrée `assets/index-Dm3uaqMp.js`, 974 597 octets : `c4033f703dd088c0cb8b77a78678522c904191dad2c23d16a10c1b5df8b03a0f`.
- Log du contrôle complet : `5f34940fd331f57aa21e8a85d1ecfc176ab66e5c91252165764c9d8e0d47029e`.
- Rapport navigateur : `540c5c7c2aa3400f28b7ca751172c6e2e8be2d09fe0d5e2105a88a193e3e7c19`.
- Pilote : `7941755771e8745ad4ea17f5d8df2cb86d81cc8e5904a860f7b8f9dd258159ca`.
- Index navigateur : `67b03d039b15c8307be54ff3c84cca22935bedc4a3e1788476962e908a66b229`.

Les premières tentatives et leurs échecs sont conservés séparément. Le contrôle de 2 729 tests/build 144 modules avant correction des images, le gel intermédiaire `23c404…` et son PASS compilé avant durcissement ne certifient pas le build final. Les résultats avatars de 2 671 tests/build 131 modules appartiennent à leur vague historique.

## Frontière native et données publiques

[NativeDuelVisualEvents.js](../../src/core/native/NativeDuelVisualEvents.js) conserve un motif de MOVE lorsque la destination native est la localisation zéro, l’ancien emplacement est une zone monstre face visible et le cache public connaît déjà la carte comme Jeton. L’identité détruite demeure celle du cache public précédent. Cette condition n’ajoute aucune query vers la localisation inexistante et ne lit aucun passcode supprimé pour reconstruire une identité.

Les [tests adversariaux](../../test/native-token-rules-2026-10-11.test.js) interdisent les lectures de query0, d’identité privée, de code supprimé et de motif non prouvé. Une seconde réception après consommation du cache ne produit pas de destruction supplémentaire. Sources inconnues, cachées ou non-monstres et destination non nulle ne bénéficient pas du nouveau motif.

La [preuve native distincte](token-rules-2026-10-11.md) établit quatre réussites/sept échecs avant correction, puis 11 réussites/zéro échec, avec 42 tests ciblés. Les comparaisons de paquets et décisions sont complètes pour dix scénarios ; Ojama compare seulement le préfixe effectivement exécuté avant l’ancien échec. Script de scénario et fixtures restent identiques. Ces fixtures de core ne revendiquent ni Decks de tournoi contemporains ni exercice runtime individuel des 240 Jetons.

Archives WASM/CDB/Lua, vendor et façade `NativeDuelGame.js` restent byte-identiques au socle. Le moteur natif demeure l’autorité des créations, statistiques effectives, restrictions de matériaux, contrôleurs et replays.

[RealDuelScene3D.js](../../src/ui/RealDuelScene3D.js) construit `fieldHologramProfiles` à partir des modèles effectivement présents, avec douze entrées au maximum. Son allowlist est `owner`, `zoneType`, `zoneIndex`, `cardId`, `profileId`, `anatomy`, `position`. Le contrôleur courant et les codes déjà publics n’exposent aucune propriété initiale privée. UID, clés techniques, ATK/DEF, effets, compteurs et identités cachées restent exclus de cet inventaire. Le dataset ne change que lorsque son JSON change et est vidé à la destruction. Les [tests de projection](../../test/real-duel-token-model-projection.test.js), puis les vrais duels compilés, vérifient ces limites et la dissimulation adverse.

## Constats levés

| Constat concret | Traitement relu et preuve |
| --- | --- |
| Import Atlas tardif après Campagne puis retour à la même fenêtre source | `main.js` incrémente `dialogNavigationRevision` à l’ouverture/fermeture active. La demande capture cette révision avant import et la recontrôle après await ainsi qu’avant l’annonce d’erreur. Le vrai chunk compilé retardé prouve l’annulation de l’ouverture obsolète et une nouvelle ouverture réussie. |
| Dix 404 d’images transitoires pendant Scapegoat/Dark Hole | Les vrais helpers de `cards.js` utilisent les références vérifiées ; [LocalCardImagePaths.js](../../src/LocalCardImagePaths.js) borne les anciens JPEG à exactement 400 miniatures/83 crops présents dans HEAD. Les 240 Jetons sont exercés dans le véritable `CardState` transitoire ; les neuf parcours finaux n’enregistrent aucun 404. |
| `__proto__`, `constructor`, `toString` provoquaient une TypeError | [NativeCardReferenceArt.js](../../src/core/native/NativeCardReferenceArt.js) exige désormais `Object.hasOwn` avant lookup. Le test réel exige `null`, puis le dos neutre dans les deux helpers pour les trois identifiants. Ce durcissement est inclus dans le contrôle complet et le gel compilé final. |
| Marges de zones interceptant le clic sur le Cimetière adverse | Le wrapper utilise `pointer-events: none` et ses rangées `auto`. Les parcours compilés ouvrent les quatre piles publiques par clic normal, sans contournement clavier ni modification des permissions d’inspection. |

Les tests anciens adaptés conservent les assertions de gestes, d’invocation, de caractéristiques et de confidentialité. Ils distinguent les écritures de l’inventaire public des écritures de gestes ; Scapegoat attend ses quatre illustrations natives exactes. Le test de repli inconnu protège maintenant la silhouette neutre plutôt qu’une anatomie de chèvre inventée.

## Atlas et lifecycle

[TokenModelAtlas.js](../../src/ui/TokenModelAtlas.js) échappe les textes, borne les images aux chemins locaux sans `..` et les liens de référence à HTTP/HTTPS avec `noopener noreferrer`. Il ne reçoit aucun callback de mutation du Deck, du Duel ou de la progression. Noms, filtres, recherche et pagination ne modifient que la consultation. La pagination réelle est **24 présentations**.

Un seul renderer est réutilisé. Le preview dessine à la demande sans autoplay ni RAF continu, avec pixel ratio limité à 1,5. Il suspend les rendus hors écran, lorsque le document est caché ou l’hôte inactif ; géométries/matériaux remplacés, contrôles, observers, captures de pointeur et contexte sont libérés. Les ressources partagées sont dédupliquées. Les imports tardifs sont invalidés à la fermeture/disposition ; la préparation des commémoratives contrôle aussi demande, sélection, visibilité et génération.

Les parcours compilés vérifient rotation souris/tactile/clavier, poses, filtres, recherche vide, pagination, absence de débordement horizontal, pause/redessin, préférences de mouvement, perte de contexte et reprise. Tab/Maj+Tab restent dans la fenêtre avec l’aide ouverte ou fermée ; Escape rend le focus au parent. L’ouverture depuis les options conserve Deck, progression, phase, LP, UID publics, main du joueur et piles. La collection d’avatars reste une sauvegarde locale ; ce raccord n’ajoute ni compte distant ni nouvelle garantie d’authentification.

## Inventaire, illustrations et modèles

Le [catalogue](token-presentation-inventory-2026-10-11.md) distingue **240 identités de monstres natifs** (198 noms), **120 présentations API illustrées**, **quatre commémoratives** et **trois marqueurs techniques**, soit **367 présentations**. Les variantes imprimées recouvrent les identités natives ; ce total ne représente pas 367 espèces ni toutes les éditions physiques mondiales.

Le module compact comporte 240 profils/42 familles sans statistiques, effets, descriptions ou import du catalogue riche. Le catalogue riche reste chargé avec l’Atlas. Les 120 illustrations, 120 cadres et 120 miniatures conservent leurs octets API ; neuf alias rapprochent 129 codes natifs de ces références. Les 111 autres identités gardent un cadre neutre. Parmi leurs présentations riches, 110 références indirectes de générateur sont signalées comme telles ; elles ne deviennent pas une certification visuelle du Jeton.

Les six cartes ordinaires de support ajoutent 16 JPEG originaux et réutilisent deux crops antérieurs. Leurs 18 variantes, dimensions, empreintes et sources concordent. Le lookup natif totalise **145 références = 129 Jetons + dix cartes antérieures + six supports**, sans collision. Les dix références antérieures sont inchangées. Les **476 images de la vague** se répartissent en 120 crops, 120 cadres, 120 miniatures, 96 générateurs, quatre scans commémoratifs et 16 nouvelles images de support. Aucun import riche ou de façade native n’est introduit dans les helpers de références.

Les quatre cartes `YGLD-ENTKN`, `LDK2-ENT01/02/03` disposent de sources primaires Konami ; leur vue réutilise seulement Atem/Atem/Kaiba/Joey, sans passcode, statistiques, admissibilité au Deck ou monstre fabriqués. Le compagnon dessiné sur le scan n’est pas revendiqué comme reconstruit. Le relevé secondaire de 438 éditions multilingues, dont 383 avec image et 55 sans image, ainsi que les dix références Albaz Strike/Spirit Charmers restent un inventaire borné, non un recensement mondial.

La [revue géométrique indépendante](token-model-geometry-review-2026-10-11.md) a inspecté les 120 références et les 240 rendus finaux. Le présent contrôle vérifie pins, copies et mesures : constructions finies de 712 à 5 890 triangles, lots bornés, buffers stables, destruction sans résidu sur 13 galeries, conservation des 36 profils hors Jetons. Les 14 pins du manifest modèles sont inchangés au gel final. Les objets utilisent de vrais volumes et le rig existant, sans illustration plate comme corps ni lecture de statistiques/identités privées. Les références manquantes et parties cachées demeurent des interprétations stylisées ; aucun 1:1 spatial intégral n’est certifié, notamment pour les 111 identités sans illustration vérifiée.

## Preuve compilée et limites d’exécution

Les neuf parcours couvrent import différé, Atlas exhaustif desktop, contrôles/lifecycle mobile, Sheep desktop/mobile, Tetherwolf puis matériau Link, Creature Swap, Adventurer et absence volontaire de WebGL. Les 367 IDs sont uniques ; chacun des **364 IDs modélisés** correspond à au moins un vrai dessin géométrique observé, et aucun des trois marqueurs techniques à un dessin de modèle. La traversée réutilise un seul canvas entre modèles et restaure la préférence de mouvement après sa boucle réduite.

Les cinq parcours de Duel installent uniquement Deck légal Main 40/Extra 1/Side 0 et crypto déterministe avant bootstrap, puis utilisent les vraies actions publiques, dont glisser-déposer et clics normaux. Aucun Jeton n’est placé dans le Deck, aucune carte injectée après démarrage, aucun objet Game/QA ou main adverse privée consulté. Les Sheep restent quatre codes/UID distincts ; le transfert MPB conserve le même UID public ; les retraits par destruction ou matériau ne créent aucune entrée de Jeton dans les piles. Les modèles publics suivent le terrain. Les captures Sheep mobile, MPB desktop et Kaiba commémoratif ont aussi été consultées pendant cette revue ; elles restent des observations ponctuelles, distinctes de l’inspection géométrique complète.

Rapport et index démontrent zéro erreur HTTP/JavaScript/CSP/native/console inattendue. Les trois diagnostics THREE sont exactement deux refus de création de contexte et un `Error creating WebGL context`, uniquement dans le contexte lancé avec `--disable-webgl --disable-3d-apis`. Ils ne sont pas supprimés. Les 505 corps, sources, pilote, helper et preuves historiques sont identiques avant/après et lors de l’indexation. Cette exécution concerne le build local compilé et sa CSP ; elle ne revendique pas une exécution navigateur sur Vercel.

## Liste de livraison et publication

Le draft final avant la présente mise à jour, SHA256 `ed3f43a007aa09716f798ebd56972a85699b32773b21791909057fd4dab49cde`, porte `safeToPublish: false`, **698 fichiers/91 841 791 octets**. La liste égale exactement les chemins Git modifiés/non suivis. Tous les octets, SHA256 et Git blobs correspondent ; aucun symlink ou chemin sortant du dépôt, secret reconnaissable par les motifs contrôlés ou cible Markdown locale absente n’a été trouvé. La présente mise à jour du seul rapport implique la régénération de son pin dans le manifest ; le sceau du manifest régénéré est une vérification extérieure séparée, sans nouvelle édition de ce document.

Les **1 847 fichiers historiques** correspondent simultanément au snapshot antérieur et aux Git blobs du socle. Les deux JSON automatiquement régénérés par le contrôle ont été restaurés byte pour byte ; aucune ancienne preuve n’est livrée avec des octets changés. Archives natives, façade, images ordinaires antérieures et modèles non-Jetons protégés restent conservés.

Le publisher extérieur, SHA256 `b8c9be2fc433963ab7b03c0acd43a1d91f6b0a4e7dc288b5681ae742dca826c3`, vérifie parent distant/local, arbres branche/master, `safeToPublish`, chemin/SHA de ce rapport, liste exacte et chaque octet/SHA256/Git blob avant uploads puis après blobs et arbres immuables. L’index temporaire construit l’arbre depuis la base ; chaque chemin non revu et chaque mode sont comparés. Les sous-arbres API sont vérifiés par leur SHA et l’arbre du commit local doit être exact. La seule mise à jour de ref cible la branche de livraison, avec `force: false`. Aucun endpoint master/merge/production n’est écrit.

Le préchargement extérieur de 539 blobs statiques a été relu séparément : 476 images et 63 fichiers de preuves modèles, tous pins exacts ; seulement des blobs immuables et références inchangées avant/après, sans arbre, commit, ref, PR ou déploiement écrits. Cette préparation ne constitue pas une publication. La CI et la préversion devront être attestées sur le nouveau SHA réellement publié, avec les métriques de ses propres logs et les empreintes du présent gel.
