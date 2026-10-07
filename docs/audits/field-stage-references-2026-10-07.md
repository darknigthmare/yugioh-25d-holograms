# Terrains civiques et scéniques — 7 octobre 2026

24 JPG originaux ont été ouverts individuellement avant conception. Les 72 images source / baseline / nouvelle géométrie ont été rendues dans Chromium et inspectées sur six planches. Les illustrations restent inchangées.

Le lot reconstruit notamment les disques d’Argostars, les ailettes du campus, les contreforts de Duel Tower, les trois étages d’arcades de Savage Colosseum, les parcours F.A., les grilles Gouki, les fenêtres et escaliers du restaurant, les rideaux, les haut-parleurs et les équipements lumineux observés. La première inspection a conduit à épaissir les maçonneries du musée et du colisée et à rendre les panneaux HUD translucides.

Les proportions et la position des formes sont adaptées à la périphérie du duel et au couloir libre. Les personnages, véhicules, fossiles, lettrages et reliefs complexes restent dans la peinture source. Les scènes dominées par des figures (Giant Ballpark, Dueltaining, Harmonia) ne prétendent pas reproduire ces figures en 3D. Il s’agit de géométrie informée par les références, avec une fidélité spatiale 1:1 limitée.

7 tests intégrés passent via le namespace Three borné : détails physiques, SHA des JPG, buffers finis, indices, normales, limites de chaque instance entière, budgets et libération des ressources exactement une fois. Les appels ci-dessous sont ceux réellement mesurés par Chromium, transparence comprise. Aucune texture n’est projetée sur les volumes.

| ID | Source | Primitives | Appels Chromium | Matériaux |
| --- | --- | ---: | ---: | ---: |
| 2674965 | Argostars - Home Stadium | 56 | 7 | 2 |
| 67616300 | Chicken Game | 36 | 7 | 2 |
| 5833312 | Duel Academy | 83 | 15 | 2 |
| 91002901 | Duel Evolution - Assault Zone | 27 | 6 | 2 |
| 43940008 | Duel Tower | 36 | 7 | 1 |
| 19162134 | Dueltaining | 39 | 6 | 1 |
| 39838559 | F.A. Circuit Grand Prix | 91 | 14 | 2 |
| 1061200 | F.A. City Grand Prix | 97 | 6 | 2 |
| 2144946 | F.A. Off-Road Grand Prix | 71 | 12 | 2 |
| 58012707 | Giant Ballpark | 67 | 5 | 1 |
| 85638822 | Gouki Cage Match | 72 | 7 | 2 |
| 32391631 | Savage Colosseum | 212 | 7 | 2 |
| 5063379 | Flavian - Colosseum of the Gladiator Beasts | 120 | 7 | 1 |
| 90173539 | World Dino Wrestling | 73 | 10 | 2 |
| 38053381 | Generaider Boss Stage | 70 | 6 | 1 |
| 7617062 | Ghostrick Museum | 49 | 9 | 1 |
| 29400787 | Ghostrick Parade | 105 | 8 | 1 |
| 15388353 | Nouvelles Restaurant “At Table” | 104 | 12 | 1 |
| 49370016 | P.U.N.K. JAM Extreme Session | 68 | 5 | 1 |
| 55553602 | Performapal Dramatic Theater | 36 | 7 | 1 |
| 29650040 | Solfachord Harmonia | 78 | 5 | 2 |
| 63492244 | Trickstar Light Arena | 120 | 7 | 2 |
| 51208046 | Trickstar Live Stage | 47 | 9 | 2 |
| 35371948 | Trickstar Light Stage | 88 | 6 | 1 |

Baseline exacte `ba6c62a`, factory et dépendances References archivées dans le dossier d’artefacts. Un seul renderer WebGL est réutilisé ; les positions de caméra, cibles, FOV et lumières sont identiques avant/après pour chaque carte, détaillés dans le [rapport](artifacts/field-stage-2026-10-07/report.json). La capture importe la vraie factory intégrée et non un builder isolé.

Empreintes SHA-256 :

- Module Stage : `27b49bb47872ac935dc3d1e064d792843e24a4d79fb9fdfe0134daed311f1f5e`.
- Factory intégrée de cette passe : `134b5a9e4cf1982b82a43e54f860522833cf1cea16013003b54153fc79dedb3c`.
- Baseline archivée : `b83bba7f70345735cdd0921503fbed0579fe71dba67e5c84fd0b849391e0b121`.
- Namespace Three borné : `f1ba391ea533f94a6795f160091077d7488c590cf2e42cf2686c7d0a01fe7e82`.
- Script : `302c60144d86cd0ca52f93d99cad25257f02f880e0f6a64d7042d22efd8f6fcf`.

[Planche 1](artifacts/field-stage-2026-10-07/field-stage-board-1-2026-10-07.jpg) · [2](artifacts/field-stage-2026-10-07/field-stage-board-2-2026-10-07.jpg) · [3](artifacts/field-stage-2026-10-07/field-stage-board-3-2026-10-07.jpg) · [4](artifacts/field-stage-2026-10-07/field-stage-board-4-2026-10-07.jpg) · [5](artifacts/field-stage-2026-10-07/field-stage-board-5-2026-10-07.jpg) · [6](artifacts/field-stage-2026-10-07/field-stage-board-6-2026-10-07.jpg).

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

Reproduction : `node --test --test-isolation=none test/field-stage-references.test.js`, puis `python3 scripts/audit-field-stage-references.py --capture`.
