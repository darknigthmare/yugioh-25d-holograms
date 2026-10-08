# Terrains de communauté — 7 octobre 2026

47 JPG originaux ont été ouverts individuellement avant conception. Les 141 images source / baseline / nouvelle géométrie ont été rendues dans Chromium et inspectées sur 12 planches. Les octets des illustrations sont inchangés et leurs SHA sont contrôlés par les tests.

Le lot reconstruit les tours rondes et coupoles d’Allure Palace et d’Artmage, la fosse étagée et le dessous suspendu de Babylon, le grand escalier et les maçonneries de Doll House, les ruelles et guirlandes de Purrely, le pont suspendu de Ninjitsu, les tables et vitrines des salles, les deux livres Toon réellement courbés, les cités miniatures Vaylantz et les architectures d’Hero City. Chaque carte dispose de formes identifiées dans son image source. La première inspection a conduit à ouvrir la fosse de Babylon, renforcer les plis et couvertures des livres, préciser les marches, affiner les ondes transparentes de Symph et rendre les fissures et échafaudages de Therion plus lisibles.

Ces volumes adaptent le décor observable à la périphérie du duel. Leur position, leur échelle et leur éclairage ne reproduisent pas la peinture en 3D à l’identique. Les personnages, lettrages, illustrations des écrans, portraits, véhicules et reliefs figuratifs complexes restent dans la source peinte. Les scènes dominées par des figures — notamment Archfiend Strategy, Fairy Tail Ball, Magician’s Salvation, Onomatopia, R.B. Funk Dock et Castle Link — ajoutent seulement les repères de décor et de lumière réellement observés. Castle Link conserve ses dragons dans la peinture ; aucun château n’y est inventé. Treasures, Walls of the Imperial Tomb et Wedju Temple gardent leurs sculptures détaillées dans la peinture.

9 tests utilisent la vraie factory intégrée et le namespace Three borné. Ils vérifient les détails physiques (coupoles, portique, pages courbes, fosse, pont, guirlandes, vitrines), les SHA source, les buffers finis, indices et normales, la totalité de chaque instance hors du couloir et les ressources libérées exactement une fois. Tous les décors restent sous les budgets de 220 primitives, 18 appels et 10 matériaux, avec une extension horizontale inférieure à 48 unités depuis l’origine. Les maxima mesurés sont 183 primitives, 17 appels Chromium et 2 matériaux. Aucune texture n’est projetée sur les volumes.

| ID | Source | Primitives | Appels Chromium | Matériaux |
| --- | --- | ---: | ---: | ---: |
| 31322640 | Allure Palace | 56 | 12 | 2 |
| 90764871 | Archfiend Strategy | 32 | 7 | 1 |
| 74733322 | Artmage Academic Arcane Arts Acropolis | 132 | 8 | 1 |
| 4357063 | Chronomaly City Babylon | 53 | 9 | 1 |
| 11808215 | Dice Dungeon | 60 | 8 | 1 |
| 67331360 | Doll House | 173 | 12 | 1 |
| 60514625 | Ecole de Zone | 153 | 11 | 1 |
| 56725612 | Fairy Tail Ball | 38 | 5 | 1 |
| 38057522 | Grand Spiritual Art - Ichirin | 106 | 4 | 1 |
| 26232916 | Hidden Village of Ninjitsu Arts | 78 | 13 | 1 |
| 34771947 | Labyrinth Wall Shadow | 125 | 7 | 1 |
| 18890039 | Libromancer First Appearance | 109 | 4 | 1 |
| 35487920 | Live☆Twin Channel | 25 | 7 | 1 |
| 14001430 | Madolche Chateau | 83 | 9 | 1 |
| 95477924 | Magician's Salvation | 60 | 6 | 2 |
| 35815783 | Magikey World | 49 | 7 | 2 |
| 25807544 | Noble Arms Museum | 46 | 17 | 2 |
| 55742055 | Noble Knights of the Round Table | 52 | 9 | 1 |
| 3055018 | Obsidim, the Ashened City | 88 | 10 | 2 |
| 90011152 | Ojama Country | 86 | 11 | 1 |
| 26493435 | Onomatopia | 77 | 5 | 2 |
| 61557074 | Palace of the Elemental Lords | 46 | 8 | 1 |
| 16269385 | Prank-Kids Place | 26 | 11 | 1 |
| 78710386 | R.B. Funk Dock | 106 | 5 | 2 |
| 47870325 | Smile Action | 79 | 5 | 1 |
| 6909330 | Soul Binding Gate | 77 | 10 | 2 |
| 54631665 | SPYRAL Resort | 45 | 10 | 1 |
| 20212491 | Stray Purrely Street | 183 | 16 | 1 |
| 75304793 | Symph Amplifire | 39 | 7 | 2 |
| 84792926 | Therion Discolosseum | 47 | 17 | 2 |
| 20216608 | Tilted Try | 56 | 6 | 1 |
| 43175858 | Toon Kingdom | 57 | 12 | 1 |
| 7293697 | Toon World the Perfect World | 69 | 12 | 2 |
| 69299029 | Treasures of the Kings | 46 | 12 | 1 |
| 35550352 | Vanquish Soul, Start! | 29 | 5 | 1 |
| 75952542 | Vaylantz World - Konig Wissen | 109 | 7 | 1 |
| 49568943 | Vaylantz World - Shinra Bansho | 93 | 9 | 1 |
| 26984177 | Walls of the Imperial Tomb | 73 | 7 | 2 |
| 58924378 | Wattcastle | 41 | 7 | 1 |
| 63017368 | Wedju Temple | 40 | 7 | 1 |
| 32353566 | Witchcrafter Walpurgis | 90 | 9 | 2 |
| 93360904 | Yummyusment★Acroquey | 76 | 9 | 2 |
| 66975205 | Yummyusment☆Mignon | 86 | 10 | 1 |
| 64230128 | Zaralaam the Dark Palace | 42 | 10 | 1 |
| 4663194 | Dark City at Midnight | 135 | 9 | 1 |
| 47596607 | Skyscraper 2 - Hero City | 37 | 10 | 1 |
| 22198672 | Castle Link | 57 | 5 | 2 |

Baseline exacte `ba6c62a`, factory et toutes ses dépendances References archivées dans le dossier d’artefacts. Un seul renderer WebGL est réutilisé ; les positions de caméra, cibles, FOV et lumières sont identiques avant/après pour chaque carte. Babylon emploie une caméra plus haute pour rendre la fosse lisible, identique dans ses deux vues. Les paramètres par carte, mesures et empreintes sont détaillés dans le [rapport](artifacts/field-community-2026-10-07/report.json). La capture importe la factory centrale réelle.

Empreintes SHA-256 :

- Module Community : `498c7a20bb5d0d0d1d7c693c0225f87d0b9fdf6822c33cc98ffc2021722a04ef`.
- Factory intégrée de cette passe : `134b5a9e4cf1982b82a43e54f860522833cf1cea16013003b54153fc79dedb3c`.
- Baseline archivée : `b83bba7f70345735cdd0921503fbed0579fe71dba67e5c84fd0b849391e0b121`.
- Namespace Three borné : `f1ba391ea533f94a6795f160091077d7488c590cf2e42cf2686c7d0a01fe7e82`.
- Script : `a5e6703f7c8e857821e5ec84e297b3cf4c670ac643d1e16c47c467982955566f`.

Planches source / baseline / nouvelle géométrie : [1](artifacts/field-community-2026-10-07/field-community-board-1-2026-10-07.jpg) · [2](artifacts/field-community-2026-10-07/field-community-board-2-2026-10-07.jpg) · [3](artifacts/field-community-2026-10-07/field-community-board-3-2026-10-07.jpg) · [4](artifacts/field-community-2026-10-07/field-community-board-4-2026-10-07.jpg) · [5](artifacts/field-community-2026-10-07/field-community-board-5-2026-10-07.jpg) · [6](artifacts/field-community-2026-10-07/field-community-board-6-2026-10-07.jpg) · [7](artifacts/field-community-2026-10-07/field-community-board-7-2026-10-07.jpg) · [8](artifacts/field-community-2026-10-07/field-community-board-8-2026-10-07.jpg) · [9](artifacts/field-community-2026-10-07/field-community-board-9-2026-10-07.jpg) · [10](artifacts/field-community-2026-10-07/field-community-board-10-2026-10-07.jpg) · [11](artifacts/field-community-2026-10-07/field-community-board-11-2026-10-07.jpg) · [12](artifacts/field-community-2026-10-07/field-community-board-12-2026-10-07.jpg).

Passe finale effectuée après gel des six nouveaux modules. Les 14 imports References de la factory sont contrôlés avant et après les captures. Toutes les planches finales ont les mêmes SHA que celles déjà inspectées visuellement. Quelques captures PNG individuelles ont des octets différents ; leurs scènes figurent dans ces planches inchangées. Les empreintes finales de chaque artefact sont enregistrées dans le rapport. Les 16 tests Stage et Community passent ensemble sur cette factory.

| Dépendance intégrée | SHA-256 |
| --- | --- |
| FieldEnvironmentAquaticReferences.js | `fc2308aafce72862a97b759cfe25b6818b38580ebde74125af3bdc5c074858b2` |
| FieldEnvironmentArcaneReferences.js | `88776075dac0a9fbc4644e6427a4d3cd49e0305693fb5826056b8f7b4a6d5e3e` |
| FieldEnvironmentArchitecturalReferences.js | `e9bfe454fd75e9934917ba60d431aaf5549f75c20769290cd5dffc929b8895b1` |
| FieldEnvironmentCommunityReferences.js | `498c7a20bb5d0d0d1d7c693c0225f87d0b9fdf6822c33cc98ffc2021722a04ef` |
| FieldEnvironmentDarkReferences.js | `f32d83bdeb1f2a3d51f3d405c0b8e546a3a5ad96132d2d0d79e7281bc45a2066` |
| FieldEnvironmentEngineeringReferences.js | `566328be75b756765ffd33c2eb7738f4825b8d4cdd48c8acec807505d674c8ce` |
| FieldEnvironmentFrontierReferences.js | `926e4873ff5e4c2a038f310eb6d5c702ed8dbe3d92bced322b88fe1cb21997af` |
| FieldEnvironmentMysticalReferences.js | `1e6ec73411e3dd624542edee60000110bd22f38c6f9e90176f18ce071c7da2cc` |
| FieldEnvironmentNatureReferences.js | `0d44bdf0379837717ea1be71599d5572edb9209565cf93bfc5ee5d3768f7c824` |
| FieldEnvironmentRitualReferences.js | `78d9ce8368ffb8102507d15ba6d12fac74181073c73fa61c6a2d42e415e47bd8` |
| FieldEnvironmentStageReferences.js | `27b49bb47872ac935dc3d1e064d792843e24a4d79fb9fdfe0134daed311f1f5e` |
| FieldEnvironmentTechnologyReferences.js | `930d3121814e730d9274a6d2087bcd301c1b18b07250cff1de9abb70676b4742` |
| FieldEnvironmentUrbanReferences.js | `b3d94d8d9f427315fec3b0d36c775fc337d827b92ca6a8fd7de8d8665e5e61c9` |
| FieldEnvironmentWildReferences.js | `b8db1cfd37d85dfd222d0b6c9a89934cc1f9c0d0ce7ae3e95325efafdb07d0c7` |

Reproduction : `node --test --test-isolation=none test/field-community-references.test.js`, puis `python3 scripts/audit-field-community-references.py --capture`.
