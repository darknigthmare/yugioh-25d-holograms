# Couverture des règles — 7 octobre 2026

Les Duels **TCG Advanced strict** et **Duel libre** utilisent le moteur natif EDOPro/WASM et les scripts Lua de Project Ignis. Les **339 Magies de Terrain sont intégrées**, avec données et scripts locaux ; leurs **339 initialisations** passent sans erreur Lua. **47 scénarios exécutent des effets sur 41 Terrains**. Une initialisation prouve l’enregistrement des effets, pas toutes les branches du script ; ce document ne certifie pas le TCG complet.

## Autorité et modes

| Route | Cartes proposées | Règles et disponibilité |
| --- | --- | --- |
| Strict natif, par défaut | Bibliothèque statique de **390 cartes** : 80 identités précédentes + 310 Terrains supplémentaires, soit 385 Main et cinq Extra. | Main 40–60, Extra/Side 0–15, copies par nom cumulées, listes locales TCG et publication régionale connue. Le catalogue demeure inspectable même lorsqu’une carte est interdite ou pas encore sortie en TCG. |
| Duel libre natif | 339 Terrains, TCG/OCG/annoncés, plus le catalogue CDB chargé de **14 355 identités** normalisées. | Même format de Deck, trois copies par nom sans liste F&L. Les alias véritables regroupent variantes permanentes et illustrations alternatives. Les cartes partenaires restent soumises à la présence de données/scripts et à leur classification réelle. |
| Anime Sandbox historique | Pool JavaScript de **80 cartes**, dont **29 effets de Terrain**, avec inspection API. | Résolutions locales explicitement implémentées. La recherche de métadonnées n’ajoute pas automatiquement un script de carte. Les règles et tests historiques restent séparés du moteur natif. |

Le moteur natif possède phases, Invocations, coûts, cibles, matériaux, restrictions, fenêtres de décision, chaînes, déplacements, compteurs et calcul des dommages. La façade JavaScript envoie une réponse typée parmi les choix proposés et projette ses requêtes vers les vues. Les ATK/DEF, Niveaux/Rangs, Types actuels et positions viennent du moteur ; ni le renderer ni les anciens helpers de Terrain ne recalculent un effet sur cette route.

MR5 et les flags `TCG_SEGOC_NONPUBLIC | TCG_SEGOC_FIRSTTRIGGER` sont explicitement appliqués aux preuves de règles TCG. Les vrais Duels utilisent une seed issue du générateur cryptographique ; les tests utilisent une seed fixe et leurs positions initiales sont documentées. Les scripts Lua et données CDB ne sont pas réécrits pour réussir un scénario.

## Niveaux de preuve

| Contrôle | Résultat | Portée exacte |
| --- | --- | --- |
| Données et Lua locaux | **339 / 339 Terrains** | CDB, chemins sources, commits, SHA-256 et dépendances archivés. |
| Initialisation native | **339 / 339** | `initial_effect`, enregistrement, requête et démarrage de 339 handles distincts, sans diagnostic Lua. |
| Scénarios de règles | **47 scénarios / 41 Terrains** | Effets réellement exécutés, messages, réponses et requêtes natives assertés. |
| Procédures d’Invocation | **20 cas natifs** | Fusion, Rituel, Synchro, Xyz, Lien, Pendule et Flip, matériaux, restrictions, annulations et zones MR5. |
| Fenêtres de décision | **15 scénarios officiels + 1 garde de confidentialité** | Déclarations, sommes, compteurs, ordre du Deck, chaînes obligatoires et Damage Step. |
| Navigateur compilé | **Desktop 1280 × 900 et mobile 390 × 844** | Bibliothèque 390/339, lancement natif, Invocation Normale, pose de Magie, Extra Deck, IA/pioche suivante et confidentialité ; zéro erreur JS, asset natif en échec ou violation CSP. |
| Géométrie et source visuelle | **339 illustrations exactes, 119 décors dédiés, 94 références inspectées, 70 reconstructions** | Trois nouveaux lots reconstruisent 44 décors depuis les sources. La géométrie reste distincte de la preuve des règles et d’une reproduction spatiale intégrale 1:1. |

La [matrice native](docs/audits/artifacts/native-field-runtime-2026-10-07.json) garde `bundled`, `initialized`, `effectTested` et `integrationTested` distincts. Les 339 lignes de l’audit Node ne reçoivent pas artificiellement une preuve navigateur générale. Le [rapport navigateur](docs/audits/artifacts/native-duel-ui-2026-10-07/report.json) couvre son parcours public précis. L’atlas affiche séparément disponibilité du moteur, initialisation et scénario exercé, tout en conservant les 29 effets JavaScript historiques.

## Effets exercés dans le moteur natif

Les [47 scénarios et leur protocole complet](docs/audits/native-field-rules-2026-10-07.md) couvrent :

- **Zombie World, Necrovalley, Molten Destruction, Gaia Power, Wetlands et A Legendary Ocean** : changements de Type/Niveau et statistiques, plancher de DEF, alias Umi et Monster Reborn légalement activé puis annulé à la résolution par Necrovalley.
- **Dragon Ravine et Gateway to Chaos** : défausse en coût distincte de l’envoi par effet, choix du mode, recherche du véritable monstre Rituel et ajout depuis le Deck.
- **Fusion Gate et Extra Net** : choix de Fusion et matériaux, bannissement des trois Blue-Eyes, Invocation Fusion native, trois Fusions successives dans les Main Monster Zones MR5 et pioche déclenchée de l’adversaire.
- **Summon Breaker et Venom Swamp** : troisième Invocation déclenchant le passage en End Phase ; trigger d’End Phase, compteur et perte d’ATK vérifiés par requête.
- **Mausoleum of the Emperor, Harpies’ Hunting Ground et Geartown** : paiement natif de LP pour une Invocation sans Sacrifice, cible/destruction obligatoire après Invocation et effet déclenché depuis le Cimetière après Typhon.
- **Magical Citadel of Endymion et Black Garden** : compteur créé par résolution puis consommé dans un choix de remplacement de destruction ; ATK divisée par deux et véritable Rose Token adverse créé par le script.
- **Union Hangar, Lost World, Pacifis, Dragonic Diagram, Revolving Switchyard, Runick Fountain et Sky Striker Airspace – Area Zero** : équipement et restrictions, remplacement de destruction, jeton et verrou de type, recherche conditionnée à une véritable destruction, limite partagée, recyclage/pioche et effet depuis le Cimetière. Les partenaires réellement utilisés et leurs scripts sont archivés avec les scénarios.

Les [fenêtres natives](docs/audits/native-rule-windows-2026-10-07.md) vérifient notamment Honest dans la Damage Step, Book of Moon exclu de cette réponse, l’ordre de Sangan/Witch obligatoires, les choix de Type/Attribut et les sommes des coûts. La [suite d’Invocations](tests/native-duel-summoning.test.mjs) distingue les vraies procédures de leurs réanimations. Le [parcours Pendule du navigateur](docs/audits/native-pendulum-ui-2026-10-07.md) complète cette preuve sur desktop et mobile.

La présence du moteur et des scripts amont apporte aussi les procédures de Contact Fusion, Invocations alternatives et recettes particulières que le moteur JavaScript historique n’implémentait pas universellement. Elles ne sont plus présentées comme absentes de cette route. Les scénarios ci-dessus ne prouvent toutefois pas chaque recette, fenêtre ou combinaison ni chaque sélection de l’interface.

## Identités, disponibilité TCG et ressources

Les **335 Terrains dont Project Ignis connaît déjà le passcode canonique** utilisent leur source officielle correspondante. Quatre références conservent des scripts de prépublication :

| Canonique affiché | Code natif amont | Carte |
| --- | --- | --- |
| 12845564 | 101402095 | Angelechy Endgame Problem |
| 46273941 | 100458006 | Pere-Zenet Em Heru |
| 88288421 | 100459016 | Field Power Bonus |
| 33700664 | 100458039 | Trirealm Rift Territory - Valvols |

Ces correspondances conservent le code et le véritable alias CDB, le contenu Lua et les descriptions sources ; les images utilisent les passcodes canoniques. Un script provisoire ne confirme ni sortie TCG ni admissibilité de tournoi.

Le constructeur strict applique les restrictions des **339 Terrains** datées du 21 septembre 2026 en TCG et conserve leurs statuts OCG comme métadonnées séparées. Le relevé du 7 octobre refuse cinq sorties TCG futures et six Terrains sans sortie TCG dans les éléments disponibles. Les dates/formats du fournisseur restent distingués des preuves Konami disponibles pour les trois ajouts récents. La sortie primaire d’Angelechy Endgame Problem est annoncée au **8 octobre en Europe / 9 octobre en Amérique du Nord**. Une absence dans une liste Forbidden/Limited ne prouve pas une disponibilité régionale.

Dans tous les modes natifs, les cinq noms toujours traités comme **Umi** partagent leur limite Main/Extra/Side. En Duel libre, les autres noms permanents et variantes d’illustration sont également regroupés par leur alias CDB réel : deux Harpie Lady 1 et deux Harpie Lady 2 font quatre copies du même nom et sont refusées. L’identité physique du passcode reste disponible pour le moteur, l’inventaire et la présentation.

Les archives locales contiennent **14 984 lignes CDB** et **13 702 Lua**, avec 13 541 scripts officiels, 135 scripts de prépublication et 26 helpers. Le catalogue de sélection normalise les variantes, filtre les scopes et types hors Duel ordinaire et demande un script réel, sauf pour un monstre Normal simple. Les jetons sont présents dans les données du moteur mais ne sont pas sélectionnables comme cartes de Deck. Voir [ressources, licences et reproduction](docs/audits/native-card-resources-2026-10-07.md).

## Projection publique et limites

Les [événements visuels natifs](docs/audits/native-duel-integration-2026-10-07.md) reconstruisent une projection publique. Les pioches adverses, poses face verso et mouvements vers des zones cachées ne publient pas leur passcode. Les positions Extra Monster Zones et superpositions Xyz sont conservées ; une carte déplacée en coût ne devient pas une destruction inventée. Un Terrain apparaît après résolution réussie, puis réagit à son retrait, remplacement ou annulation.

Les limites restantes concernent la preuve et la plateforme : les milliers de scripts et leurs interactions n’ont pas tous été exercés ; tous les parcours de choix complexes ne sont pas couverts dans le navigateur ; le catalogue libre ne possède pas une vérification exhaustive des listes ou dates territoriales de toutes ses cartes. Rush Duel, Speed Duel, règlement de tournoi chronométré, multijoueur complet et sauvegarde intégrale d’un Duel ne sont pas annoncés comme livrés. Le jeu solo et les modèles procéduraux ne constituent pas une certification Konami ni une reproduction de l’anime 1:1.

Le moteur historique garde ses régressions, ses 29 effets de Terrain et leurs sources/rulings antérieurs. Les [audits du lot JavaScript](docs/audits/terrain-rules-release-batch2-2026-10-07.md) restent consultables comme historique ; leurs chiffres de couverture ne décrivent plus le mode natif par défaut.

## Architecture et validation reproductible

- [NativeDuelRuntime](src/core/native/NativeDuelRuntime.js) possède le handle, les readers synchrones, les décisions typées et les requêtes de l’OCG core.
- [NativeDuelGame](src/core/native/NativeDuelGame.js) projette l’état natif et orchestre les décisions du joueur, de l’IA et des vues ; [NativeDuelDecisions](src/core/native/NativeDuelDecisions.js) traduit les sélections.
- [NativeCardData](src/core/native/NativeCardData.js), [NativeCardRegistry](src/core/native/NativeCardRegistry.js) et [NativeCardCatalogue](src/core/native/NativeCardCatalogue.js) séparent données factuelles, bibliothèque statique et catalogue du Duel libre.
- [DeckBuilderRules](src/ui/DeckBuilderRules.js) conserve les defaults historiques et exige l’option native explicite, avec prédicats de support et identité issus des ressources chargées pour le catalogue libre.

```sh
npm run audit:security
npm run check
node scripts/audit-native-field-runtime.mjs
node scripts/generate-native-field-coverage.mjs
git diff --check
```

`check` exécute les tests Node, audite les 339 JPEG sources et les 339 replis locaux, puis compile Vite. Les assertions natives utilisent le WASM et les scripts réellement livrés, sans mock d’effets ni `skip` en cas d’asset absent. Les tests du constructeur couvrent restrictions, publications, Umi et alias du catalogue libre, sans modifier les tests stricts historiques. Les preuves détaillées et captures restent liées depuis les audits ; le gate global de publication est enregistré séparément.

## Sources et licences

- [Project Ignis CardScripts, commit épinglé](https://github.com/ProjectIgnis/CardScripts/tree/37f270dc813a12d123707ae255f2bda7922999c4) et [BabelCDB, commit épinglé](https://github.com/ProjectIgnis/BabelCDB/tree/fdf92aea31033cd6c44afa89987c5e00665205e2).
- [Offre complète de sources](public/native/sources/README.md), [notice du sous-système natif](public/native/NOTICE.md) et [NOTICE du wrapper corrigé](src/core/native/vendor/ocgcore/NOTICE.md) : AGPL-3.0-or-later pour le moteur, CardScripts et les nouveaux adaptateurs ; notices MIT propres au wrapper et à Lua. La licence des données et illustrations n’est pas remplacée par celle du code.
- [Rulebook officiel](https://img.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf), [Master Rule 2020](https://www.yugioh-card.com/japan/howto/masterrule2020/), [Fast Effect Timing](https://www.yugioh-card.com/en/play/fast-effect-timing/) et [Damage Step](https://www.yugioh-card.com/eu/play/damage-step-rules/).
- [Liste Advanced TCG du 21 septembre 2026](https://www.yugioh-card.com/en/limited/list_2026-09-21/) et [liste OCG du 1er octobre 2026](https://www.yugioh-card.com/japan/event/limitregulation/?list=202610), avec sources et rapprochement détaillés dans [le relevé des 339 Terrains](docs/audits/artifacts/field-banlists-2026-10-07.json).
