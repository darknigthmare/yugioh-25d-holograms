# Gate de livraison du moteur natif — 7 octobre 2026

Les 310 effets de Terrain qui manquaient au moteur JavaScript disposent maintenant de leur route d’exécution native dans le duel. Le catalogue conserve ses **339 Terrains**, leurs illustrations locales et leurs scripts Lua amont exacts. Les modes TCG strict et duel libre utilisent le moteur natif ; le Sandbox historique conserve son moteur JavaScript.

## Contrôles du lot final

Exécution sur Node **24.19.0**, sans changement de dépendances :

| Contrôle | Résultat |
| --- | --- |
| `npm run check` : tests Node | **100 fichiers réussis**, zéro échec, zéro ignoré |
| Audits visuels inclus dans `check` | 339 illustrations sources, 339 replis locaux |
| Build Vite inclus dans `check` | Réussi, 86 modules |
| `npm run audit:security` | Zéro vulnérabilité signalée |
| Contrôle whitespace du diff de livraison | Réussi sur les fichiers rédigés ; blancs amont conservés dans les licences, le README BabelCDB et le loader généré |
| [Initialisations et scénarios natifs](native-field-rules-2026-10-07.md) | 339 / 339 initialisations ; 20 scénarios sur 18 Terrains |
| [Compatibilité du core](native-core-api-compatibility-2026-10-07.md) | Aucun appel API de Field absent, aucun code d’effet non pris en charge détecté |
| [UI compilée](native-duel-ui-2026-10-07.md) | Desktop et mobile, recherche, Deck persistant, vrais choix et coût de Dragon Ravine |
| [Trois vues compilées](native-duel-views-2026-10-07.md) | 22 états publics, coûts et statistiques natifs, décor après résolution, même canvas |

Les parcours navigateur utilisent les headers de production. Aucun échec de ressource native, erreur de page ni violation CSP n’a été observé. Le build conserve l’avertissement de taille de chunks ; le loader WASM reçoit explicitement le binaire local, malgré l’avertissement Vite concernant son URL de secours. Les blancs de fin de ligne de quelques fichiers amont sont conservés pour respecter leur contenu exact ; ils sont exclus du contrôle whitespace des fichiers rédigés.

## Sources et limites

Le [manifeste du build reproductible](../../public/native/core-build.json) épingle le core `38d04c9feb1a26617407091380634c87262fe3f8`, sa chaîne de compilation, les sources et les empreintes. Un second build propre reproduit exactement le WASM et son loader. Les [sources, licences et recette](../../public/native/sources/README.md) sont servies avec l’application. L’alias local et conditionnel `Group.NewGroup` est testé dans un vrai scénario Rituel Dogmatikamacabre ; les scripts Lua archivés restent inchangés.

Les 20 scénarios ne certifient pas toutes les branches des 339 scripts, ni tous les parcours des 14 355 identités du catalogue libre. Les contrôles de format et de publication du mode TCG restent distincts de la disponibilité technique du catalogue libre.

La géométrie conserve **89 décors dédiés, 50 illustrations étudiées et 26 reconstructions depuis leurs sources**. Ce lot ne prétend pas terminer la reproduction 3D 1:1 de tous les Terrains. Les preuves de cette livraison distinguent les règles exécutables, les illustrations originales et les volumes reconstruits.
