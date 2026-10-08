# Yu-Gi-Oh! 2.5D Hologram Duel Simulator

Simulateur de duel solo dans le navigateur, inspiré des arènes holographiques de l’anime. Les modes **TCG Advanced strict** et **Duel libre** utilisent désormais le moteur EDOPro compilé en WebAssembly et les véritables scripts Lua de Project Ignis. Le projet fonctionne sans compte ni backend : le Duel reste dans la page, les préférences et les Matchs entre deux Duels utilisent `localStorage`.

## Modes et bibliothèque

| Mode | Moteur et cartes | Validation du Deck |
| --- | --- | --- |
| **TCG Advanced strict**, par défaut | Moteur natif ; bibliothèque statique de **390 cartes**, dont les **339 Terrains** du catalogue. | Main 40–60, Extra/Side 0–15, copies cumulées, restrictions TCG et disponibilité régionale du relevé du 7 octobre 2026. Les cartes OCG seulement ou à sortie TCG future restent consultables mais sont refusées. |
| **Duel libre** | Même moteur natif ; les 339 Terrains, y compris OCG et annoncés, et recherche dans le catalogue CDB local après son chargement. | Même taille et sections ; trois copies combinées par nom, sans liste Forbidden/Limited. Les véritables alias de nom et d’illustration partagent cette limite. |
| **Anime Sandbox** | Moteur JavaScript historique, pool local de **80 cartes** et recherche API pour l’expérimentation. | Les cartes distantes consultées ne reçoivent pas automatiquement un effet exécutable. Les **29 scripts de Terrain JavaScript** restent distincts des scripts natifs. |

Le catalogue de Duel libre contient **14 355 identités de cartes** après normalisation des illustrations alternatives et des doublons provisoires. Il accepte les cartes ordinaires dont les données et scripts sont présents, ainsi que les monstres Normal sans script nécessaire. Les jetons restent créés par le moteur pendant le Duel. Cette présence technique ne certifie pas toutes leurs interactions. Metal Reflect Slime et Embodiment of Apophis disposent de leurs deux références JPEG exactes réhébergées localement et de volumes dédiés ; les autres partenaires sans référence locale utilisent le repli explicitement inconnu, sans illustration inventée ni hotlink.

Le moteur natif décide des phases, Invocations, coûts, cibles, matériaux, zones, chaînes et résultats du combat. L’interface affiche ses décisions et les statistiques qu’il retourne. Les procédures particulières, dont Contact Fusion ou Invocations alternatives, appartiennent aux scripts amont ; leur présence dans le moteur ne vaut pas preuve d’un parcours UI complet pour chaque carte.

Les trois decks intégrés sont des presets légaux **inspirés** de Kaiba, Yugi et Joey. L’application propose trois profils d’IA, un constructeur Main/Extra/Side persistant, un Duel unique, un **Match au premier à deux victoires** en strict et un parcours original de **12 défis** avec médailles et progression locale. Les Duels nuls peuvent prolonger un Match ; la reprise persistante concerne les étapes entre Duels, pas la sauvegarde intégrale d’un Duel en cours.

L’interface reste **solo contre l’IA**. Le protocole WebRTC présent dans le dépôt constitue un socle testé ; il n’est pas annoncé comme un multijoueur complet. Les cartes adverses cachées sont anonymisées dans le DOM et les événements de présentation. La page propose contrôles clavier et tactiles, glisser-déposer, inspection des zones publiques, préférences audio et réduction des animations.

## Portée vérifiée

Les **339 Terrains possèdent leurs données et scripts locaux, s’initialisent sans erreur Lua et disposent d’au moins un effet natif réellement exercé**. La [nouvelle vague du 8 octobre](docs/audits/native-wave-2026-10-08.md) porte la preuve à **377 / 377 scénarios sur 339 / 339 Terrains** : elle conserve les **353 scénarios** de la première livraison du 8 octobre et ajoute **24 branches sur 13 Terrains**, documentées par les lots [A](docs/audits/native-field-branch-wave-a-2026-10-08.md) et [F](docs/audits/native-field-branch-wave-f-2026-10-08.md). Les 353 scénarios historiques avaient achevé les 224 Terrains restants avec 225 cas, après la baseline de 128. Statistiques, coûts, restrictions, chaînes, déplacements, compteurs, phases, Invocations et combats sont vérifiés pour les branches nommées ; les autres interactions restent non certifiées. Les quatre scripts provisoires conservent leur correspondance explicite vers leurs passcodes canoniques.

Deux défauts de résolution sont corrigés localement d’après les textes : [Dice Dungeon](docs/audits/native-dice-dungeon-correction-2026-10-08.md) attribue à chaque joueur son propre dé ; [Duel Tower](docs/audits/native-duel-tower-correction-2026-10-08.md) permet aux deux joueurs d’invoquer en cas d’égalité. Les archives Lua/CDB/WASM restent byte-identiques. Le lecteur applique des transformations bornées à deux sources exécutées, avec vérification SHA-256 de l’original et du résultat et provenance séparée. Le moteur continue de résoudre les effets et de proposer les choix ; ces corrections ne simulent pas les résultats dans la façade.

Le parcours **archivé du 7 octobre**, sur son build de production en **desktop 1280 × 900 et mobile 390 × 844**, vérifie la bibliothèque, le lancement natif, Invocation Normale, pose de Magie, accès Extra Deck, tour de l’IA, pioche suivante et confidentialité adverse, sans erreur JavaScript, échec d’asset natif ni violation CSP. Ces preuves ne sont pas étendues automatiquement aux 339 branches de scripts ou à toutes les cartes du catalogue complet.

Les [21 nouveaux scénarios de combat](docs/audits/native-battle-timing-2026-10-07.md) contrôlent replays, Damage Step, coûts, changement de contrôle et match nul. Le choix de cible d’un effet ne réutilise plus la cible de l’attaque précédente. Les [8 parcours officiels de choix et 3 contrats](docs/audits/native-choice-flows-2026-10-07.md) vérifient déclarations, sommes et confidentialité.

Les suites exécutent aussi **20 cas de procédures d’Invocation** et **15 scénarios de fenêtres de décision**, avec les mêmes données et scripts officiels. Elles couvrent matériaux, zones MR5, coûts, restrictions, annulation d’Invocation et réponses de Damage Step. Le [parcours Pendule desktop/mobile](docs/audits/native-pendulum-ui-2026-10-07.md) invoque réellement depuis la main et l’Extra Deck face recto via les choix du moteur.

Les [25 scénarios de chaînes du 7 octobre](docs/audits/native-chain-interactions-2026-10-07.md) conservent leurs preuves de Creature Swap et des Pièges devenus monstres. La [suite validée du 8 octobre compte 26 cas réussis](docs/audits/artifacts/native-chain-interactions-2026-10-08.json), dont le 26e est déjà confirmé par le [gate de la première livraison](docs/audits/native-completion-2026-10-08.md) : Call of the Forgotten Pose trois Pièges, impose sa restriction native et masque la permutation des cartes face verso. Le wrapper décode le compte `uint8` puis les deux blocs de positions de `MSG_SHUFFLE_SET_CARD` ; une destination masquée ne divulgue aucune association entre identité et zone. Les [13 parcours supplémentaires de choix](docs/audits/native-choice-continuation-2026-10-07.md) exercent options, positions, compteurs, sommes, Types et Attributs. Les noms et caractéristiques actuels viennent des requêtes natives, sans changer l’identité physique de la carte. Les libellés de Hazy Flame Sphynx et les statistiques de l’inspecteur sont corrigés.

Voir [la couverture et ses limites](RULES_COVERAGE.md), [le gate de la vague courante](docs/audits/native-wave-2026-10-08.md), [la matrice native de 377 scénarios](docs/audits/artifacts/native-field-runtime-wave-2026-10-08.json), [le gate historique de la première livraison du 8 octobre](docs/audits/native-completion-2026-10-08.md), [l’audit précédent des règles](docs/audits/native-field-rules-2026-10-07.md), [les fenêtres de décision](docs/audits/native-rule-windows-2026-10-07.md), [l’intégration et les visuels publics](docs/audits/native-duel-integration-2026-10-07.md) et [le rapport navigateur compilé](docs/audits/artifacts/native-duel-ui-2026-10-07/report.json). Le projet ne constitue pas une certification exhaustive TCG ni un arbitre de tournoi.

Les [choix de copies de même nom](docs/audits/gameplay-wave-c-2026-10-08.md) affichent les emplacements et positions fournis par le moteur, y compris les Zones Monstre Extra adverses inversées, sans changer les indices des réponses ni révéler l’ordre du Deck ou les identités cachées. La [présentation publique corrigée](docs/audits/native-public-presentation-wave-2026-10-08.md) distingue une vraie réanimation — mouvement Cimetière → Zone Monstre suivi de `SPSUMMONING` puis `SPSUMMONED` — d’une Invocation Spéciale ordinaire ou annulée. Les inspections privées ne deviennent pas des révélations publiques ; une attaque réellement annulée retire son projectile et son impact différé. Les preuves ciblées et la validation du nouveau navigateur restent distinguées dans le gate courant.

## Vues et Terrains

La vue **Compacte** reste initiale ; **Arène** et **Vue Réelle** partagent le même Duel. La Vue Réelle est chargée à son premier affichage : console et tapis du joueur, plateforme en perspective et adversaire derrière son terminal. Elle propose les décors de base **Clairière KaibaCorp** et **Grotte / Ruines**.

Les **339 illustrations originales** de Terrain sont réhébergées localement, entières, avec proportions et octets JPEG préservés, sans filtre de couleur. Leurs URL, dimensions, palettes et SHA-256 sont archivés. Les **339 cadres de carte complets** sont également locaux. Une carte posée ou encore en chaîne ne devient pas un décor actif ; l’environnement suit la résolution native réussie, son annulation, retrait et remplacement.

La géométrie compte désormais **339 décors dédiés**, **339 références inspectées** et **339 reconstructions depuis leurs sources**. Les six lots du **7 octobre** ont achevé les **209 Terrains restants** : scènes et architectures, espaces mystiques, machines, villes et jardins, sanctuaires et phénomènes naturels. Leurs **627 comparaisons avant/source/après** sont archivées avec leurs empreintes. Ces volumes ne revendiquent pas une reconstruction 3D intégrale 1:1. Les volumes restent adaptés à la lisibilité du plateau. Les 336 WebP originaux servent de repli ; les trois nouvelles références utilisent leur JPEG exact en repli. Les captures de l’anime ne sont pas utilisées comme textures.

Le bouton **EXPLORER LES TERRAINS** distingue illustration exacte, géométrie étudiée, volumes reconstruits, script natif disponible, initialisation vérifiée et scénario d’effet exercé. Ses filtres et ses 29 pages donnent accès aux 339 Terrains. Les profils de monstres comptent maintenant **25 modèles dédiés et 17 familles de repli**. [La Jinn, Mystical Elf et Beaver Warrior](docs/audits/model-wave-2026-10-08.md) ajoutent trois anatomies volumétriques issues de leurs JPEG inspectés, avec **18 comparaisons source/ancien/nouveau** sur trois angles au repos et en pose. Ils complètent les [modèles Slime et Apophis](docs/audits/trap-monster-models-2026-10-08.md), dont la livraison historique avait porté le total de 20 à 22 et conservé 12 comparaisons. Le rig et le mouvement réduit sont pris en compte ; les modèles n’utilisent aucune plaque d’illustration comme corps. Leurs profondeurs/proportions restent adaptées et la robe basse de Mystical Elf est extrapolée : aucun 1:1 spatial intégral n’est certifié. Les procédures Fusion, Synchro, Xyz, Lien, Rituel, Pendule et Flip disposent de sept effets visuels distincts, déclenchés par la procédure native réussie ; une Fusion réanimée reste une Invocation Spéciale et reçoit le motif de réanimation lorsque son retour du Cimetière est confirmé par le core. Les personnages de certaines illustrations ne possèdent pas tous un modèle 3D. Quatre motifs de résolution de Terrain (ondes, croissance, ombres, lumière) complètent ces effets. Les révélations de combat ou par effet utilisent une présentation distincte d’une Invocation Flip. Voir [l’audit des modèles](docs/audits/monster-fidelity-2026-10-07.md), les nouvelles références [urbaines](docs/audits/urban-terrain-references-2026-10-07.md), [technologiques](docs/audits/field-technology-references-2026-10-07.md), [mystiques](docs/audits/field-mystical-references-2026-10-07.md) ainsi que les nouveaux lots [végétaux](docs/audits/field-wild-references-2026-10-07.md), [aquatiques](docs/audits/field-aquatic-references-2026-10-07.md), [sombres](docs/audits/field-dark-references-2026-10-07.md) et [les détails visuels restants](TERRAIN_REFERENCE_AUDIT.md).

La [passe de détails des Terrains](docs/audits/field-detail-wave-2026-10-08.md) enrichit **Chicken Game, Chorus of Sanctuary et Archfiend Palabyrinth** avec personnages, véhicules, chérubin, signes musicaux et visages sculptés : **18 captures avant/après**, sans remplacer leurs illustrations exactes ni certifier les détails des 336 autres Terrains. Une [passe distincte de sept formes d’attaque et d’effet](docs/audits/effects-wave-2026-10-08.md) affine les attaques du Dragon Blanc, du Dragon Noir, du Gardien Celte et du Crâne Invoqué, ainsi que destruction, réanimation et négation. Les quatre attaques sont réellement exercées par le core ; la comparaison graphique reste distincte du parcours compilé de la [nouvelle vague navigateur](docs/audits/native-wave-ui-2026-10-08.md).

## Développement

Prérequis : Node.js 20.19 ou plus récent.

```sh
npm ci
npm run dev
```

Contrôle complet :

```sh
npm run audit:security
npm run check
```

`check` exécute les tests Node, les audits des 339 JPEG sources et des 339 replis, puis produit le build Vite dans `dist/`. Aucun script lint/typecheck séparé n’est défini. Les tests natifs chargent les assets WASM, CDB et Lua livrés ; ils ne simulent pas les résultats des scripts de carte. Le [gate courant](docs/audits/native-wave-2026-10-08.md) consigne **134 fichiers de tests réussis**, le build de **108 modules**, zéro vulnérabilité et les parcours du bundle gelé sur ordinateur/mobile. Les preuves de publication sont relevées séparément sur leur SHA distant réel. Le [gate historique de la première livraison du 8 octobre](docs/audits/native-completion-2026-10-08.md) conserve ses **125 fichiers de tests réussis** et son build de **104 modules** ; ces comptes ne sont pas ceux du nouveau build. Le [gate du 7 octobre](docs/audits/native-progress-2026-10-07.md) conserve ses **121 fichiers de tests réussis**, comparaisons visuelles et preuves navigateur sur son build historique. Le [gate précédent](docs/audits/native-expansion-2026-10-07.md) conserve son relevé historique de 113 fichiers de tests. La [continuation précédente](docs/audits/native-continuation-2026-10-07.md) conserve son relevé historique de 44 décors.

Pour régénérer les preuves du moteur :

```sh
node scripts/audit-native-field-runtime.mjs
node scripts/generate-native-field-coverage.mjs
```

Les archives contiennent **14 984 lignes CDB** et **13 702 sources Lua**, dont 13 541 scripts officiels, 135 de prépublication et 26 helpers. La provenance, les correspondances et les instructions de reproduction figurent dans [l’audit des ressources](docs/audits/native-card-resources-2026-10-07.md). Le chargement natif reste local, sans API distante pendant le Duel.

## Sources, licences et images

Le nouveau sous-système natif, le moteur EDOPro et CardScripts sont distribués sous **AGPL-3.0-or-later**. Le wrapper amont et l’interpréteur Lua conservent leurs notices **MIT**. Les attributions et la portée des licences sont décrites dans [la notice native](public/native/NOTICE.md) ; [le texte de licence du sous-système](public/native/licenses/native-subsystem-AGPL-3.0.txt) est livré avec les assets. Les déclarations des composants historiques restent distinctes.

L’[offre de sources accessible depuis l’application](public/native/sources/README.md) fournit les archives complètes épinglées du moteur, Lua et wrapper, les empreintes et les instructions de reconstruction. Les sources de l’application, interfaces portées, loaders et correctifs sont accessibles dans [le dépôt public](https://github.com/darknigthmare/yugioh-25d-holograms/tree/codex/duel-fidelity-2026-10-01). Les Lua exacts et leurs crédits sont servis dans `/native/scripts.json`, avec leur texte COPYING. BabelCDB ne déclare pas de licence dans le snapshot amont : sa provenance ne remplace pas une autorisation de redistribution des données ou textes.

Les métadonnées Sandbox proviennent de YGOPRODeck. Les images locales suivent sa [consigne de téléchargement et réhébergement](https://api.ygoprodeck.com/api-guide/) ; l’application ne hotlinke pas les illustrations de Terrain. Yu-Gi-Oh!, les cartes et marques associées appartiennent à leurs ayants droit. Ce projet fan, non commercial et non officiel n’est ni produit, ni approuvé, ni soutenu par Konami. L’[audit de préparation commerciale](docs/audits/commercial-readiness-2026-09-08.md) conserve les prérequis de droits distincts des licences du code.

## Références de règles

- [Official Rulebook](https://img.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf)
- [Tournament Policy v2.5](https://www.yugioh-card.com/en/downloads/penalty_guide/YGOTCG_Tournament_Policy_v_2_5.pdf)
- [Master Rule 2020](https://www.yugioh-card.com/japan/howto/masterrule2020/)
- [Liste Advanced du 21 septembre 2026](https://www.yugioh-card.com/en/limited/list_2026-09-21/)
