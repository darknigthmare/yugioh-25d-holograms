# Continuation native et Terrains — 7 octobre 2026

Cette livraison ajoute les **209 reconstructions de volumes restantes** aux 130 déjà réalisées : **339 Terrains sur 339 ont une géométrie dédiée construite à partir de leur illustration inspectée**. Les 339 JPEG et leurs proportions sont préservés. Les images sont exactes ; la profondeur, les échelles et le placement sont adaptés à la périphérie du duel. Les personnages et certains ornements restent peints. Il ne s’agit pas d’une reconstruction spatiale intégrale 1:1.

| Lot | Terrains | Comparaisons source/avant/après | Primitives max. | Appels Chromium max. | Matériaux max. |
| --- | ---: | ---: | ---: | ---: | ---: |
| [Stage](field-stage-references-2026-10-07.md) | 24 | 72 | 212 | 15 | 2 |
| [Arcane](field-arcane-references-2026-10-07.md) | 24 | 72 | 219 | 17 | 9 |
| [Engineering](field-engineering-references-2026-10-07.md) | 24 | 72 | 178 | 18 | 9 |
| [Community](field-community-references-2026-10-07.md) | 47 | 141 | 183 | 17 | 2 |
| [Ritual](field-ritual-references-2026-10-07.md) | 45 | 135 | 166 | 12 | 9 |
| [Frontier](field-frontier-references-2026-10-07.md) | 45 | 135 | 208 | 18 | 8 |

Les **627 comparaisons** emploient la factory commune réelle, le namespace Three borné, les mêmes caméras et lumières avant/après, et la baseline exacte `ba6c62aa6b3db8f15efad52e3ee8d5fcd143b601`. Les six rapports finaux archivent les empreintes de leurs 14 dépendances intégrées et de la factory `134b5a9e4cf1982b82a43e54f860522833cf1cea16013003b54153fc79dedb3c`. Les buffers, normales, indices, bounds de toutes les instances et ressources libérées sont vérifiés. Les plafonds restent 220 primitives, 18 appels et 10 matériaux, avec le corridor des zones de duel dégagé.

L’atlas expose les volumes reconstruits séparément de la preuve des règles. Il garde ses 339 références sur 29 pages, propose les filtres reconstruits/restants et ses commandes de trois angles. L’inspection des premières captures a révélé un cadrage latéral incorrect : la caméra tourne maintenant autour des bounds du décor et ajuste sa distance au champ de vue et au ratio écran, au lieu de tourner autour du plateau. Aucune géométrie du duel n’a été déplacée pour corriger cet aperçu. Le [contrôle indépendant](artifacts/field-final-framing-2026-10-07.json) appelle la vraie méthode de cadrage sur les 339 groupes Three : **3 051 combinaisons d’angle et de ratio**, zéro débordement du frustum ; il vérifie également **18 386 instances** hors corridor.

## Règles et défauts corrigés

La [matrice native](artifacts/native-field-runtime-2026-10-07.json) compte **339 données/scripts locaux, 339 initialisations, 128 scénarios réussis et 115 Terrains distincts avec un effet exercé**. Cette continuation ajoute 51 scénarios et 50 Terrains ; elle conserve les 77 cas précédents. Les 224 autres Terrains possèdent leur script et une initialisation vérifiée, sans scénario d’effet déclaré artificiellement. Les branches non couvertes figurent dans [l’audit](native-field-rules-2026-10-07.md).

Les [25 scénarios de chaînes](native-chain-interactions-2026-10-07.md) exécutent les scripts officiels. Creature Swap conserve maintenant les identités physiques et contrôleurs quand le protocole émet un SWAP ou une paire de MOVE. Metal Reflect Slime et Embodiment of Apophis sont projetés comme monstres lorsque leur type natif contient MONSTER et TRAP ; leurs caractéristiques actuelles sont affichées. Pseudo Space prend réellement le nom Wetlands puis le réinitialise en End Phase. L’événement de décor après résolution relit également ce nom, tout en conservant passcode, UID, propriétaire et illustration imprimés.

Les [13 parcours de choix supplémentaires](native-choice-continuation-2026-10-07.md) exercent positions, options, compteurs, ordre du Deck, déclarations et sommes. Hazy Flame Sphynx propose MONSTRE/MAGIE/PIÈGE avec les indices natifs inchangés ; les Types/Attributs sont présentés par leur vrai libellé. L’inspecteur conserve ATK et DEF entièrement visibles et distingue Niveau, Rang et valeur de Lien. Les cartes adverses cachées restent anonymisées avant toute lecture d’alias ou de métadonnées.

Les scripts Lua, le CDB et le WASM ne sont pas modifiés pour réussir ces scénarios. MR5 et les flags SEGOC TCG sont conservés. Le SHA-256 du WASM demeure `0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026`.

## Vérification locale

`npm run check` passe : **121 fichiers de tests, zéro échec et zéro skip**, audit des 339 JPEG sources et 339 replis, compilation Vite de **99 modules**. `npm run audit:security` signale zéro vulnérabilité. La correction finale de cadrage a ensuite été recompilée et fait l’objet du parcours navigateur de l’atlas. Aucun lint/typecheck séparé n’est défini.

Les parcours finaux sont effectués sur le même bundle de production et la CSP de `vercel.json`, en desktop **1280 × 900** et mobile **390 × 844**, uniquement via les commandes publiques. Tous identifient l’entry JS et le WASM testés. Les rapports atlas, chaînes, duel général, Pendule et trois vues enregistrent aussi HTML, CSS et chunks natifs avant/après et refusent une mutation pendant le parcours. Les deux rapports de choix ne revendiquent pas cette vérification élargie. Les captures et résultats finaux sont reliés depuis le [relevé consolidé](artifacts/native-progress-2026-10-07.json).

- [Atlas public, 339 références et six décors à trois angles](artifacts/field-atlas-ui-2026-10-07/report.json).
- [Chaînes et inspecteurs des Pièges devenus monstres](native-chain-ui-2026-10-07.md).
- [Choix Array, Hidden City et Hazy Flame](artifacts/native-field-choice-ui-2026-10-07/report.json).
- [Choix Prohibition et Tokusano](artifacts/native-choice-ui-2026-10-07/report.json).
- [Duel général](artifacts/native-duel-ui-2026-10-07/report.json), [Pendule](artifacts/native-pendulum-ui-2026-10-07/report.json) et [trois vues](artifacts/native-duel-views-2026-10-07/report.json).

Entry final : `/assets/index-CkdHwDWv.js`, SHA-256 `7173898cef8206cb9f0e12525376ad03e857a22e40fca40ea97c0623e0fdb9fd`.

Les comptes de la [livraison précédente](native-expansion-2026-10-07.md) restent historiques. Son aperçu Vercel a depuis atteint READY et ses sept fichiers essentiels ont été vérifiés par HTTP dans [le relevé de récupération](artifacts/native-expansion-preview-recovered-2026-10-07.json) ; cette preuve ne décrit pas la présente livraison. La publication de cette continuation utilise une branche de travail et un aperçu, sans fusion ni promotion de production.

La couverture des scripts et des règles n’est pas exhaustive ; les interactions de toutes les cartes, tous les parcours complexes de choix et la reproduction de chaque figure en 3D demeurent à compléter.
