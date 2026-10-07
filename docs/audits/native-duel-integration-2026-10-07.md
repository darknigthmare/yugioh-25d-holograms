# Intégration du moteur natif et des visuels publics — 7 octobre 2026

Les **339 Magies de Terrain du catalogue disposent de leurs données et scripts natifs, et les 339 initialisations ont été vérifiées**. Le moteur WASM exécute les véritables scripts Lua de Project Ignis ; la façade JavaScript projette les zones, statistiques et décisions. Les **29 effets de Terrain précédemment écrits en JavaScript restent comptés séparément**. **20 scénarios natifs passent sur 18 Terrains distincts** ; ces essais ne certifient pas toutes les branches des 339 scripts.

| Preuve | Résultat | Source |
| --- | ---: | --- |
| Données CDB et scripts Lua locaux | 339 / 339 Terrains | [Manifeste des ressources](../../public/native/manifest.json), [audit des ressources](native-card-resources-2026-10-07.md) |
| Initialisation native sans erreur Lua | 339 / 339 | [Matrice native complète](artifacts/native-field-runtime-2026-10-07.json) |
| Terrains exercés par des scénarios de règles | 18 / 339 | [20 scénarios et limites de preuve](native-field-rules-2026-10-07.md) |
| Projection des messages vers les animations et objectifs | 18 tests de protocole, 1 vrai duel WASM | [Tests publics](../../test/native-duel-visual-events.test.js), [test avec le moteur](../../test/native-duel-visual-events-runtime.test.js) |
| Clics et rendu du navigateur | Desktop 1280 × 900 et mobile 390 × 844, avec CSP de production | [Rapport UI et captures](native-duel-ui-2026-10-07.md). La matrice Node conserve sa preuve distincte `integrationTested: false` par Terrain. |

## Autorité des règles et données affichées

[NativeDuelRuntime.js](../../src/core/native/NativeDuelRuntime.js) crée et détruit les handles, précharge les ressources synchrones, avance jusqu’à une décision du moteur et envoie des réponses typées. Le WASM utilise l’API OCG 11.0 et les flags MR5 et SEGOC TCG décrits dans l’audit des règles. Le moteur natif est compilé depuis le commit `38d04c9feb1a26617407091380634c87262fe3f8`, avec Emscripten 4.0.9 et Lua épinglé. La provenance est publiée dans [core-build.json](../../public/native/core-build.json) ; les correctifs du wrapper et leurs sources sont décrits dans [NOTICE.md](../../src/core/native/vendor/ocgcore/NOTICE.md).

[NativeDuelGame.js](../../src/core/native/NativeDuelGame.js) expose l’interface du duel à partir des requêtes natives et de ses commandes disponibles. Les valeurs ATK, DEF, Niveau, Rang et compteurs viennent du moteur. Les actions, phases, coûts, cibles, matériaux et fenêtres de chaîne viennent des décisions natives, traduites par [NativeDuelDecisions.js](../../src/core/native/NativeDuelDecisions.js). Cette route n’appelle pas les effets, calculs de combat ni bonus continus du moteur JavaScript précédent. Les quatre correspondances entre passcode canonique et code natif de prépublication conservent les identités, données et scripts amont exacts.

Une Magie de Terrain face verso reste posée, puis son activation devient en attente. Sa résolution réussie est publiée après le message natif `CHAIN_SOLVED`. Une chaîne annulée ou une source partie du Terrain ne produit pas de nouvelle activation réussie. Le renderer ne déduit aucun bonus de la présence d’un Terrain ni de son texte.

## Frontière publique des animations

[NativeDuelVisualEvents.js](../../src/core/native/NativeDuelVisualEvents.js) reconstruit les événements de présentation au lieu de transmettre les messages bruts ou les instances de cartes. Une pioche et une pose face verso publient uniquement le camp et la zone. Les passcodes des pioches, poses et déplacements vers une destination cachée ne sont pas lus par le traducteur. Une identité visible arrive par une invocation face recto, une activation déclarée, un mouvement vers une zone publique ou un message explicite de révélation. Une confirmation d’identité ne crée pas de monstre holographique dans une zone face verso.

Les événements d’attaque conservent les références des deux camps et des Main/Extra Monster Zones ; l’identité d’un défenseur face verso reste absente. Les Extra Monster Zones partagées sont inversées selon le contrôleur. Les Terrains sont normalisés à partir de `SZONE` séquence 5 ou `FZONE`. Les matériaux Xyz conservent un index de superposition distinct du monstre hôte, y compris pour l’index 0. La destruction se fonde sur le résultat de combat ou le flag natif de raison ; un Tribute ou coût envoyé au Cimetière ne devient pas artificiellement une destruction.

Les requêtes visuelles filtrent les statistiques publiques et écartent les identités d’équipements, cibles et autres matériaux. Si une requête de fin de lot concerne déjà une autre carte à cette position, ses données ne sont pas attribuées à la carte d’un message antérieur. Les getters qui échouent sur les identités cachées constituent des tests de non-lecture, en complément des assertions sur les données sérialisées.

Le vrai duel du test charge le WASM, CDB et Lua livrés sans modifier les effets. Il vérifie une pioche adverse anonyme, l’activation d’Ancient Forest et le changement de position public qu’elle provoque, une invocation normale de Celtic Guardian avec comparaison aux ATK/DEF natives, puis une pose adverse de Book of Moon sans identité dans l’animation. Les choix passent par le protocole typé du moteur.

Les événements d’invocation réussie reçoivent un identifiant public opaque et un numéro de tour, distincts des instances internes et des cartes cachées. [CampaignDuelTracker.js](../../src/content/CampaignDuelTracker.js) peut ainsi compter deux invocations légales différentes, une pose native anonyme et les dégâts réellement reçus ; les coûts en LP sont exclus des dégâts. Les types Fusion, Synchro, Xyz, Lien et Rituel exigent les flags natifs `REASON_MATERIAL` et le sous-type des matériaux récents, associés à une carte de type correspondant. Le type imprimé seul n’est jamais suffisant : une Fusion réanimée reste une invocation spéciale ordinaire. Le test rejoue les messages et requêtes authentiques des trois Fusions de Fusion Gate et vérifie ce compteur. La procédure Pendule provient de la commande native proposée et déclarée dans la façade, puis n’est comptée qu’après `SPSUMMONED`.

## Atlas et géométrie

[FieldSpellCoverage.js](../../src/ui/FieldSpellCoverage.js) conserve `gameplayImplemented` et `implementedRules` pour les **29 effets JavaScript historiques**, puis expose séparément présence du script natif, initialisation, disponibilité du moteur, scénarios d’effets et preuves navigateur. Le [snapshot compact](../../src/ui/NativeFieldCoverageSnapshot.js) provient des lignes individuelles de la matrice ; il ne transporte pas les Decks de tests dans l’interface. Le générateur refuse un résumé incohérent avec ses lignes.

L’atlas affiche **339 effets disponibles via le moteur natif** et **18 Terrains vérifiés en scénarios**. Le détail distingue une initialisation vérifiée d’un effet effectivement exercé. Les dates et formats de publication restent indépendants de cette disponibilité technique : la prépublication d’Angelechy Endgame Problem reste explicitement annoncée. Les illustrations conservent les passcodes canoniques, y compris lorsque le script natif utilise encore un code amont provisoire.

Les chiffres de géométrie sont inchangés : **89 décors dédiés**, **50 illustrations étudiées**, **26 reconstructions de volumes depuis leurs sources**. L’intégration des règles n’est pas une reconstruction 3D supplémentaire et ne revendique aucun nouveau modèle 1:1. Les volumes adaptés au plateau restent distincts des illustrations originales conservées. Les activations, destructions et annulations des 339 Terrains utilisent des profils génériques basés sur leur palette source ; les profils spécialisés des effets déjà connus restent explicites et ne sont pas déclenchés par une estimation de bonus.

## Sources et reproduction

L’offre de sources du moteur, Lua et wrapper est accessible depuis [`/native/sources/README.md`](../../public/native/sources/README.md), avec archives épinglées, SHA-256 et instructions de reconstruction. Les notices sont servies dans `/native/licenses/` et les scripts de cartes exacts dans `/native/scripts.json`. Les licences distinctes du moteur, wrapper, Lua et CardScripts restent celles décrites dans les audits de ressources et le `NOTICE.md` ; la présence des sources ne modifie pas la déclaration de licence de BabelCDB.

```sh
node scripts/audit-native-field-runtime.mjs
node scripts/generate-native-field-coverage.mjs
node --test --test-isolation=none \
  test/native-duel-visual-events.test.js \
  test/native-duel-visual-events-runtime.test.js \
  test/native-field-atlas-coverage.test.js \
  test/field-atlas-coverage.test.js
```

La commande ciblée ci-dessus passe avec **26 assertions de tests**, aucune ignorée. Les tests de l’atlas contrôlent les comptes distincts, les sources Lua exactes, les quatre correspondances de codes et le maintien des trois niveaux de géométrie. Les tests existants de suivi de campagne, combat public, confidentialité de scène et profils de monstres passent également.

## Preuves navigateur

Le [parcours du build compilé](native-duel-ui-2026-10-07.md) utilise les contrôles réels avec les headers de production, sur desktop et mobile. Il vérifie les 339 Terrains dans la bibliothèque, la recherche de partenaires dans les 14 355 identités natives, le remplacement d’une carte du Deck et sa conservation exacte après rechargement. Invocation Normale, pose de Magie, Extra Deck, fin de tour, actions de l’IA et pioche suivante traversent le moteur natif. Le DOM adverse reste anonyme ; aucun échec d’asset natif, erreur de page ni violation CSP n’a été observé.

Une preuve indépendante vérifie Necrovalley et les statistiques natives de Gravekeeper’s Spy sous la CSP exacte : [artefact CSP](artifacts/native-csp-2026-10-07.json). Les preuves navigateur restent séparées des 339 initialisations et des 20 scénarios. Elles ne certifient pas toutes les branches des scripts ni tous les parcours des 14 355 cartes.

L’[audit des trois vues](native-duel-views-2026-10-07.md) ajoute 22 états publics sur desktop et mobile : Mausolée paie réellement 2000 LP pour invoquer Blue-Eyes, puis Monde Zombie est posé et activé via son contrôle en vue réelle. La source du décor reste inactive pendant la pose et la réponse à la chaîne, puis s’applique après résolution. Les changements de vue conservent le même monstre à 3000 ATK / 2500 DEF, la main et les LP, avec une seule scène WebGL et un seul canvas.

La [régression Angelechy](artifacts/native-field-angelechy-zone-regression-2026-10-07.json) distingue un script simplement initialisé de son comportement réellement pris en charge : le moteur initial ignorait le choix de zone adverse ; le moteur mis à jour donne ce choix au contrôleur du Terrain. Le même Lua et les mêmes décisions de préparation sont utilisés dans les deux preuves. Les Main Decks sont mélangés avant la pioche initiale sur des copies, avec Fisher–Yates cryptographique sans biais ; les Decks enregistrés sont conservés.
