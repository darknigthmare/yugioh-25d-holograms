# Continuation des Terrains et du duel natif — 7 octobre 2026

Cette continuation ajoute **44 reconstructions de volumes depuis des illustrations inspectées**, élargit les preuves des règles officielles et corrige trois écarts réels de l’interface/protocole : le choix Pendule depuis l’Extra Deck face recto, l’identification de la procédure Xyz et le nom des sacrifices adverses déjà publics.

## Terrains et comparaisons visuelles

| Lot | Sources inspectées et reconstruites | Images source / ancien / nouveau | Maximum primitives / appels / matériaux |
| --- | ---: | ---: | ---: |
| [Urbain et architecture](urban-terrain-references-2026-10-07.md) | 14 | 42 | 112 / 13 / 8 |
| [Technologie et industrie](field-technology-references-2026-10-07.md) | 16 | 48 | 196 / 14 / 7 |
| [Mystique et dimensions](field-mystical-references-2026-10-07.md) | 14 | 42 | 126 / 11 / 8 |

Les 132 images sont regroupées en onze planches. Les comparaisons emploient la même caméra et la même lumière pour chaque paire avant/après ; les audits décrivent précisément leurs baselines. Les illustrations locales conservent leurs octets et leurs proportions. Les tests utilisent les seuls constructeurs Three disponibles dans le build, contrôlent les buffers et indices finis, les limites, le corridor libre et la libération répétée des ressources. Les captures Chromium n’ont signalé aucune erreur.

Le catalogue atteint **119 décors dédiés, 94 références inspectées et 70 reconstructions depuis leurs sources**. La [matrice courante des 339 cartes](artifacts/field-coverage-continuation-2026-10-07.json), régénérée par [audit-field-coverage.mjs](../../scripts/audit-field-coverage.mjs), distingue chaque niveau visuel et chaque preuve native. Quatorze des 44 nouvelles reconstructions remplacent des repères déjà dédiés, ce qui explique la hausse de 30 dans le premier compteur. Les personnages et détails peints demeurent dans les illustrations originales ; ces volumes périphériques ne constituent pas une reproduction spatiale complète 1:1 des 339 cartes.

## Règles et procédures réellement exercées

| Preuve | Résultat | Portée |
| --- | ---: | --- |
| [Matrice des Terrains](artifacts/native-field-runtime-2026-10-07.json) | 339 initialisations, 47 scénarios sur 41 Terrains | Véritables Lua archivés, partenaires d’archétypes, recherches, coûts, restrictions, remplacement de destruction, pioche, compteurs et jetons. |
| [Procédures d’Invocation](../../tests/native-duel-summoning.test.mjs) | 20 cas | Fusion, Rituel, Synchro, Xyz, Lien, Pendule et Flip ; matériaux, superpositions, zones MR5, annulation, réanimation légale et restrictions. |
| [Fenêtres de décision](native-rule-windows-2026-10-07.md) | 15 scénarios officiels + 1 garde de confidentialité | Déclarations, ordre du Deck, sommes exactes/minimales, poids alternatifs, compteurs, effets obligatoires simultanés et Damage Step. |
| [Paquet natif MOVE](../../tests/native-move-protocol.test.js) | 3 cas | Raison non signée conservée, consommation complète du payload Xyz, sources amont inchangées. |
| [Procédure Pendule dans l’interface](native-pendulum-ui-2026-10-07.md) | Desktop et mobile | Échelles → MST → Extra face recto → nouvelle Échelle → choix Main + Extra → placements natifs → limite une fois par tour. |

Les nouveaux cas chargent le même WASM, CDB et Lua que l’application. Ils ne remplacent pas les scripts officiels par des effets simplifiés. La suite d’Invocation vérifie également qu’une Fusion envoyée directement au Cimetière depuis l’Extra Deck n’est pas proposée à Monster Reborn, et qu’une Invocation Lien annulée ne publie pas d’animation de succès.

Le bouton Pendule de l’Extra Deck ouvre la procédure globale du moteur sans prédéfinir un UID. Les candidats de la main et de l’Extra sont choisis dans sa vraie décision. Les références de sacrifice sans champ de position peuvent recevoir leur nom seulement si la projection courante atteste qu’elles sont publiques ; les références cachées restent anonymes.

## Effets de présentation

Fusion, Synchro, Xyz, Lien, Rituel, Pendule et Flip possèdent désormais sept motifs distincts, déclenchés par les confirmations natives réussies. Les raisons authentiques de matériaux permettent de distinguer une véritable Fusion d’une réanimation. Les identités cachées ne sont pas nécessaires au rendu.

La [planche des sept procédures](artifacts/native-summon-effects-2026-10-07/summon-procedures.jpg) et son [rapport](artifacts/native-summon-effects-2026-10-07/report.json) vérifient 14 images à 30 % et 65 % de progression, au maximum **14 appels de rendu**, puis zéro géométrie ou texture restante. Ce rendu isolé vérifie la présentation ; la légalité des procédures est prouvée séparément avec le core réel.

## Gate final et build figé

Exécution sur Node **24.19.0**, sans modification de dépendances :

| Contrôle | Résultat |
| --- | --- |
| `npm run check` | **107 fichiers de tests réussis**, zéro échec, zéro ignoré ; audits des 339 sources et 339 replis ; build réussi, 89 modules. |
| `npm run audit:security` | Zéro vulnérabilité signalée. |
| [Parcours UI général](native-duel-ui-2026-10-07.md) | Bibliothèque, Deck persistant, vrais coûts et choix de Dragon Ravine, Invocation Normale, pose et tour de l’IA sur desktop/mobile. |
| [Trois vues](native-duel-views-2026-10-07.md) | 22 états publics ; Mausolée, Monde Zombie, statistiques et coûts natifs ; même canvas conservé. |
| Confidentialité et CSP | Les parcours compilés utilisent les headers de production ; aucun hook QA livré. Les audits conservent leurs erreurs, requêtes et empreintes. |

Build final : `assets/index-CNuJ3sB1.js`, SHA-256
`2b8993d189f7339198663a1fd54b013b561747d19d90dde37cb9c060c5b9d56f`.
La géométrie intégrée est dans `FieldEnvironmentRegistry-H1bnPYkF.js` ; la façade native dans `NativeDuelGame-COFVTauG.js`. Les rapports UI/Pendule/vues vérifient les octets effectivement servis par leur serveur local, après le dernier gel des modules.

Le WASM conserve exactement son SHA-256
`0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026`
et son loader
`f4523ad5c2e9f14c8736a91ad94e9e7f8283883a3607781f40afdeae27cdf828`.
Le patch `MOVE.reason` concerne le wrapper JavaScript et sa déclaration, avec reproduction par [apply-patches.mjs](../../src/core/native/vendor/ocgcore/apply-patches.mjs) ; les treize TypeScript amont, le core et les Lua archivés demeurent identiques. Les [sources et la recette publiques](../../public/native/sources/README.md) restent disponibles.

Les avertissements Vite sur les chunks de plus de 500 kB et l’URL de secours WASM restent présents ; le loader reçoit explicitement le binaire local. Les blancs amont exacts des licences, du README BabelCDB et du loader sont exclus du contrôle whitespace des fichiers rédigés.

Les scénarios ne certifient pas toutes les branches des 339 scripts, toutes les procédures alternatives ni les interactions des 14 355 identités du catalogue libre. Les preuves navigateur du build local sont distinctes du contrôle HTTP d’une prévisualisation Vercel protégée. La [livraison native précédente](native-release-2026-10-07.md) conserve son relevé historique de 100 fichiers de tests et 20 scénarios de Terrains.
