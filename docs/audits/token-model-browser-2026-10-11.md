# Jetons 3D — audit navigateur compilé du 11 octobre 2026

**PASS : neuf parcours, 50 captures, 367 présentations parcourues et 364 modèles effectivement dessinés.** L’audit utilise le build final figé, servi localement avec la CSP de production. Ce rapport ne constitue pas un audit du déploiement Vercel.

Les preuves exécutées sont dans [browser-compiled](artifacts/token-model-browser-2026-10-11/browser-compiled/README.md), avec le [rapport brut](artifacts/token-model-browser-2026-10-11/browser-compiled/report.json), le [gel original](artifacts/token-model-browser-2026-10-11/browser-compiled/build-freeze.json) et l’[index de livraison](artifacts/token-model-browser-2026-10-11/browser-compiled/delivery-index.json). Le [pilote Chromium](../../scripts/audit-token-models-browser.py) reste identique pendant l’exécution et après sa livraison.

## Périmètre et intégrité

| Contrôle exécuté | Résultat |
| --- | --- |
| Présentations de l’Atlas | 367 : 240 identités natives de Duel, 120 variantes illustrées, quatre cartes commémoratives et trois repères techniques |
| Modèles dessinés | 364 ; les trois repères n’ont aucun canvas |
| Tailles | Desktop 1280 × 900 et mobile 390 × 844 |
| Parcours / captures | 9 / 50 |
| Sources figées | 653, identiques avant/après et à la livraison |
| Build HTML/JS/CSS / assets statiques / archives natives | 24 / 478 / 3 |
| Corps HTTP vérifiés | 505, tous HTTP 200, octets et SHA identiques aux fichiers locaux avant/après |
| Erreurs HTTP, JavaScript, CSP, requêtes natives et console inattendue | Aucune |
| Diagnostics de capacité provoqués | Exactement trois messages dans le seul Chromium lancé sans WebGL |

Le rapprochement indépendant avec la base native trouve 243 entrées portant TOKEN, dont 240 monstres. Les trois repères sont `9995767`, `10000110`, `10000120`. Les codes et présentations restent distincts même lorsque leur nom ou alias est partagé. Le [snapshot du catalogue](artifacts/token-model-browser-2026-10-11/browser-compiled/catalogue-snapshot.json) conserve les 367 enregistrements lus depuis le module figé.

Empreintes finales :

- Gel : `1ee6840a88bdab54193f4edf6db3b09ff18524cb42ed5cf5c584fce320c3069d`.
- Entrée `/assets/index-Dm3uaqMp.js`, 974 597 octets : `c4033f703dd088c0cb8b77a78678522c904191dad2c23d16a10c1b5df8b03a0f`.
- Pilote, 71 910 octets : `7941755771e8745ad4ea17f5d8df2cb86d81cc8e5904a860f7b8f9dd258159ca`.
- Rapport, 1 378 948 octets : `540c5c7c2aa3400f28b7ca751172c6e2e8be2d09fe0d5e2105a88a193e3e7c19`.

## Parcours réels

| Parcours | Comportements vérifiés |
| --- | --- |
| Import Atlas différé | Requête JS réellement retardée, clic Atlas puis aller-retour Campagne : l’ouverture obsolète est annulée ; une nouvelle ouverture fonctionne. |
| Atlas exhaustif desktop | Les 367 identifiants sont parcourus ; chaque modèle disponible déclenche un vrai dessin géométrique WebGL après sa sélection, avec le bon identifiant public et une seule instance de canvas entre modèles. |
| Atlas mobile | Échantillons emblématiques et quatre commémoratives, filtres, pagination, rotation par vrai toucher Chromium, clavier, poses et absence de débordement horizontal. |
| Scapegoat desktop | Quatre vrais Sheep Tokens, images et inspecteurs, options/Atlas sans redémarrage du Duel, destruction et clics normaux sur les piles. |
| Scapegoat mobile | Même scénario natif et mêmes vérifications à 390 × 844. |
| Tetherwolf puis Link Spider | Invocation Normale par véritable glisser-déposer, génération native du Jeton et choix réel comme matériau Link. |
| Creature Swap | L’adversaire commence réellement ; génération du Jeton MPB, changement de contrôle réel, destruction et inspection des quatre piles publiques. |
| Rite of Aramesir | Activation réelle, création d’Adventurer Token avec ses caractéristiques effectives, puis disparition par Dark Hole. |
| WebGL indisponible | Références et métadonnées utilisables, fermeture propre ; exactement deux diagnostics de création interdite et un « Error creating WebGL context. ». |

Les parcours Atlas vérifient recherche par code, alias et accents, filtres de catégorie/race/attribut, résultat vide, pagination précédente/suivante et sélection au clavier. Rotation souris/tactile, flèches, boutons et recentrage sont exercés. Les poses Attack/Defense sont contrôlées pour les Jetons ; les commémoratives restent en portrait sans statistiques ou poses de combat.

Le rendu est statique à la demande avec les deux préférences de mouvement : aucune animation continue au repos, dessin après interaction, pause hors écran et redessin au retour. La traversée exhaustive utilise temporairement le mouvement réduit après les captures emblématiques et restaure la préférence initiale avant les autres scénarios. Perte réelle du contexte WebGL, fallback, reprise avec un nouveau canvas, fermeture, recherche vide et passages Jeton→commémoratif→Jeton vérifient le nettoyage. Tab et Maj+Tab bouclent correctement avec l’aide ouverte ou fermée ; Escape retourne au parent et restaure le focus.

## Scénarios natifs et confidentialité

Les seules fixtures sont **un Deck légal enregistré et un flux crypto déterministe, installés avant bootstrap**. L’interface valide réellement le format Advanced : « Deck valide », Main 40 / Extra 1 / Side 0. Aucun Jeton n’est mis dans le Deck. Toutes les actions suivantes utilisent les contrôles publics réels ; aucun objet Game/QA, aucune carte injectée après démarrage et aucune lecture de main adverse privée ne sont utilisés.

Scapegoat `73915051` produit les quatre codes `73915052`, `73915053`, `73915054`, `73915055`, avec quatre UID publics et quatre zones distinctes, en Défense, Niveau 1, Bête/TERRE, ATK 0/DEF 0. Les quatre profils `token-<code>` sont effectivement dessinés. Chaque image de terrain CSS et d’inspecteur est décodée depuis son vrai fichier `/tokens/cards/<code>.jpg`. Dark Hole `53129443`, légal le même tour, retire les quatre cartes et modèles sans Jeton au Cimetière ou parmi les cartes bannies. Les piles s’ouvrent par clic normal, sans contournement clavier.

Tetherwolf `67922702` crée le Jeton `67922703` (alias natif `31533705`), Machine/VENT/Niveau 3/0/0. Le choix de Défense et le Niveau 7 effectif de Tetherwolf sont vérifiés. Link Spider `98978921` consomme ce vrai Jeton : il disparaît sans entrer dans les piles, Tetherwolf revient au Niveau 4 et le Link apparaît dans une Zone Monstre Extra. Le scénario évite la restriction de Scapegoat interdisant cette invocation le tour de son activation.

Creature Swap `31036355` transfère ce même Jeton au camp adverse en conservant son UID public, sa position et ses caractéristiques. Le profil est dessiné côté adversaire, Tetherwolf revient au Niveau 4, puis Dark Hole retire le Jeton sans entrée dans les piles publiques des deux joueurs. L’observation navigateur concerne le contrôleur actuel ; elle ne prétend pas exposer la propriété initiale privée.

Rite of Aramesir `3285551` crée réellement Adventurer Token `3285552`, Elfe/TERRE/Niveau 4/2000/2000, avec le profil `token-3285552`. Sa destruction retire carte et modèle sans entrée de Jeton dans les piles.

Pendant les deux parcours Sheep, l’Atlas ouvert depuis les options ne modifie ni Deck, ni phase, LP, UID, cartes publiques, main du joueur ou piles. Les références publiques des modèles, limitées à douze entrées, contiennent uniquement `owner`, `zoneType`, `zoneIndex`, `cardId`, `profileId`, `anatomy`, `position` et correspondent aux cartes réellement visibles. La main adverse et les cartes cachées restent masquées. Les compteurs WebGL observent seulement les canvases publics, en appelant les méthodes originales avec le même contexte, les mêmes arguments et la même valeur de retour.

## Références et limites vérifiées

Les 120 variantes API disposent de cadres complets, miniatures et illustrations recadrées locales. Le lookup couvre 129 codes natifs exacts, aliases compris. Les 111 identités natives sans cadre de Jeton vérifié utilisent une image neutre ; cela inclut ici les Jetons MPB et Adventurer. Les 110 références de type `generator` sont explicitement des cartes génératrices, pas des illustrations de Jeton. Les six cartes nécessaires aux scénarios ont leur vraie illustration locale sous `/tokens/duel-cards/` et `/tokens/duel-small/`, avec leurs crops vérifiés. Toutes ces images sont épinglées et servies sans 404.

Les commémoratives `YGLD-ENTKN`, `LDK2-ENT01`, `LDK2-ENT02`, `LDK2-ENT03` montrent les silhouettes Atem/Atem/Kaiba/Joey. Elles n’inventent aucun code, statistique ou monstre de Duel ; les compagnons présents sur les scans physiques ne sont pas annoncés comme modélisés dans ce viewer. Ce catalogue documente ces quatre cartes, sans prétendre recenser toutes les éditions physiques. Les modèles 3D sont stylisés : cet audit prouve leur identité, leur rendu et leur intégration native, sans certification graphique pixel pour pixel.

## Conservation des preuves

Les 50 captures, le rapport, le log brut et le gel — **53 originaux** — sont conservés octet pour octet aussi dans `/workspace/yugioh-token-browser-final-2026-10-11/`. L’index inclut leurs empreintes, le pilote, le helper natif, la documentation et cinq preuves historiques avatars inchangées. Le pilote/helper, les 653 sources, les 505 corps servis et ces cinq preuves sont identiques avant/après le parcours final et lors de l’indexation.

Les diagnostics Vite, la première incompatibilité de l’API Playwright corrigée seulement dans le pilote, les vrais 404 ensuite corrigés dans l’application et le parcours pré-durcissement restent hors du dossier final. Leurs dossiers extérieurs `yugioh-token-browser-compiled-driver-diagnostic-v1-2026-10-11`, `yugioh-token-browser-compiled-http-diagnostic-v2-2026-10-11`, `yugioh-token-browser-http-initiators-2026-10-11` et `yugioh-token-browser-prehardening-2026-10-11` ne sont pas utilisés comme certification finale. Le build certifié comprend le raccord des images exactes et le durcissement `Object.hasOwn` des références natives.
