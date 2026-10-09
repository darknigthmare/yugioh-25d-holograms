# Branches natives supplémentaires — vague F, 8 octobre 2026

Les **12 scénarios sur 7 Terrains passent avec le véritable core WASM, API 11.0**. Cette vague approfondit les conditions, les réponses, le combat et les destinations déjà exécutables par les scripts officiels. Elle complète les preuves antérieures sans modifier leurs rapports historiques et sans annoncer une couverture de toutes les branches.

Le runner est [`runNativeFieldBranchWaveF`](../../scripts/audit-native-field-branch-wave-f.mjs), exporté depuis un module indépendant. La preuve brute est [le rapport JSON](artifacts/native-field-branch-wave-f-2026-10-08.json) ; les assertions sont aussi exécutées par [le test natif](../../tests/native-field-branch-wave-f.test.mjs).

## Branches réellement exercées

| Terrain | Scénario, suffixe de `wf-` | Résultat natif vérifié |
| --- | --- | --- |
| Malefic World `27564031` | `malefic-four-card-pool-two-normal-draws-replaced` | Le choix offre 4 Malefic, en révèle exactement 3 et conserve leurs indices. Le hasard du core ajoute 1 des 3 révélés ; le quatrième reste au Deck. Avec `drawCountPerTurn: 2`, les deux pioches ordinaires sont remplacées par cet ajout unique. |
| Malefic World `27564031` | `malefic-insufficient-pool-preserves-normal-draw` | Avec seulement 2 Malefic, le trigger de remplacement n'est pas proposé. Le Terrain reste actif et le vrai événement `DRAW` ajoute le Magicien Sombre du dessus du Deck. |
| Dream Mirror of Joy `74665651` | `dream-joy-highest-level-targets-and-light-condition` | Avec Ikelos Sprite LUMIÈRE, Chaîne Démoniaque offre uniquement Morpheus Black Knight, Niveau 8, comme cible parmi trois Dream Mirror. Fissure détruit Sprite sans cibler. Livre de la Lune peut ensuite cibler Mara, Niveau 1, pendant que le Niveau 8 est encore face recto : la condition LUMIÈRE est bien nécessaire. |
| Dream Mirror of Terror `1050355`, Joy `74665651` | `dream-terror-per-event-damage-and-end-phase-exchange` | Deux Invocations Spéciales adverses de Gilasaurus infligent chacune 300, avec Mara TÉNÈBRES présent : LP adverses 8000 → 7700 → 7400. À la vraie End Phase adverse, Terror est banni comme coût et Joy passe du Deck à la Zone Terrain. L'échange n'inflige pas de dégâts supplémentaires. |
| Future Visions `87902575` | `future-visions-no-free-zone-at-return` | L'Invocation Normale de Jerry Beans Man provoque son bannissement temporaire. Appel de l'Être Hanté invoque ensuite le Dragon Blanc dans la cinquième zone. À la prochaine Standby du propriétaire, Jerry va au Cimetière avec `REASON_EFFECT`, sans destruction ; les cinq monstres restent en place. |
| Future Visions `87902575` | `future-visions-source-gone-no-delayed-return` | Après le bannissement temporaire, Typhon détruit le Terrain. À la prochaine Standby du propriétaire, Jerry reste banni : aucune chaîne de retour inexistante n'est inventée. |
| Metaphys Factor `20720928` | `metaphys-factor-one-free-summon-second-needs-tributes` | Double Invocation permet deux Invocations Normales. Armed Dragon utilise la procédure sans Sacrifice ; Tyrant Dragon exige ensuite deux vrais Sacrifices, dont les mouvements au Cimetière portent les raisons de libération, matériel et Invocation. À l'End Phase suivante, seul Armed Dragon est banni par Factor. |
| Metaphys Factor `20720928` | `metaphys-factor-response-blocked` | La chaîne de Ragnarok ne propose pas Illusionniste d'Effet à l'adversaire. Trois Armed Dragon sont bannis et Ragnarok atteint 2400 ATK. Illusionniste redevient proposé dans une fenêtre ultérieure après la résolution ; le test refuse cette activation distincte pour isoler la réponse interdite. |
| Metaphys Factor `20720928` | `metaphys-factor-response-allowed-control` | Avec les mêmes cartes et Factor encore en main, Illusionniste est proposé en réponse directe et devient le maillon 2 de Ragnarok. Son coût rejoint le Cimetière, Ragnarok est neutralisé à 1500 ATK et aucun monstre du Deck n'est banni. |
| Galloping Gaia `2106266` | `galloping-gaia-dragon-reveal-reverse-search-shared-limit` | Dragon Maudit, Niveau 5, est révélé sans quitter la main ; Gaia The Fierce Knight est ajouté du Deck. La recherche inverse consomme aussi la limite du premier mode, alors qu'un couple légal Gaia en main/Dragon au Deck est désormais disponible. |
| Galloping Gaia `2106266` | `galloping-gaia-real-fusion-battle-response-reenabled-after-mst` | Polymérisation réalise une vraie Fusion de Gaia the Dragon Champion avec les deux matériels en main. Sous Galloping Gaia, Force de Miroir n'est pas activable pendant son attaque : le combat inflige 850. Typhon retire le Terrain ; lors de l'attaque d'un tour ultérieur, le même Piège est proposé, se résout et détruit Gaia avant tout nouveau dommage. |
| Argostars – Home Stadium `2674965` | `argostars-trap-summon-damage-negation-reset-and-banished-condition` | Tydeu défausse réellement Typhon comme coût, passe de Piège Continu à monstre toujours Piège, et Stadium inflige 500. Avec Parthe banni face recto, l'effet de Tydeu en Zone Monstre déclenche une chaîne de Stadium qui neutralise Doom Lord. Tydeu retourne en Zone Magie/Piège et ne peut pas réutiliser sa transformation ce tour. La neutralisation expire à l'End Phase. Au tour suivant, Stadium paie 1000 pour récupérer Parthe ; Tydeu inflige à nouveau 500 en s'invoquant, mais son effet en Zone Monstre ne déclenche plus la neutralisation sans Argostars monstre banni. |

## Authenticité et provenance

Chaque scénario possède son propre handle natif, détruit à sa fin, ses cartes placées **uniquement avant `start()`**, ses réponses typées avec indices, ses messages et ses queries. Les flags sont `MODE_MR5`, `TCG_SEGOC_NONPUBLIC` et `TCG_SEGOC_FIRSTTRIGGER`. Les équipes exactes et la graine native figurent dans chaque preuve. Les conditions de pioche des deux cas Malefic sont des options d'équipe fournies avant le démarrage ; le hasard n'est pas remplacé.

Il n'y a aucun mode Debug/Test, aucune injection après démarrage, aucune erreur Lua, aucun `RETRY`, aucune modification de l'archive Lua, des données de cartes ou du WASM. Les 31 scripts de cartes utilisés ont chacun leur SHA-256 original et effectif complet ; ils sont identiques pour cette vague. Les empreintes des scripts de démarrage `constant.lua` et `utility.lua`, du bootstrap de compatibilité existant, du module, du test, du harness, des lecteurs, du wrapper natif et des archives complètes sont conservées dans `provenance`. Les deux corrections locales Dice Dungeon/Duel Tower restent déclarées dans la dépendance commune, mais aucun de ces scripts n'est utilisé ici.

WASM original : `0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026` — 935745 octets. Le runner compare les empreintes des archives de cartes, scripts et banlists au manifeste, ainsi que celle du WASM au fichier de construction.

Les listes de cartes privées dans les fixtures, décisions et queries constituent les données internes de cet audit. Ce rapport ne certifie pas leur présentation publique dans l'interface.

## Validation reproductible

```sh
node scripts/audit-native-field-branch-wave-f.mjs
node --test --test-isolation=none tests/native-field-branch-wave-f.test.mjs
```

Résultat : **12/12 scénarios natifs**, **13/13 tests**, 0 échec, 0 scénario ignoré. Le premier appel renouvelle le JSON avec son horodatage UTC et les empreintes des sources effectivement lues. Aucun build global, commit ou déploiement ne fait partie de cette vague.

## Branches qui restent non certifiées par cette vague

- Malefic World : perte de relation du Terrain pendant la résolution, concurrence avec d'autres remplacements de pioche et différents retraits des cartes sélectionnées. MST n'est pas proposé par le core en réponse au `EVENT_PREDRAW` de cette fixture ; ce chemin n'est donc pas présenté comme exécuté.
- Dream Mirror : restrictions des cibles d'attaque de Joy, égalités entre plusieurs plus hauts Niveaux, absence de TÉNÈBRES pour les dégâts de Terror, invocation simultanée de plusieurs monstres, échange depuis la main et échange Joy → Terror.
- Future Visions : plusieurs retours simultanés avec moins de zones disponibles, Terrain remplacé/réactivé et carte bannie retirée de sa destination avant le retour.
- Metaphys Factor : disparition du monstre marqué avant l'End Phase prévue, nouvelle utilisation gratuite sur un autre tour et réponses de plusieurs propriétaires dans des chaînes plus complexes.
- Galloping Gaia : champion dont le nom actuel devient Gaia par son propre effet, perte du champion au milieu de la Battle Phase, toutes les catégories de réponses adverses et égalités/renvois au sein du même combat.
- Argostars : plusieurs effets de Pièges dans une même chaîne, plusieurs Pièges invoqués simultanément, perte de relation de la cible de neutralisation et autres partenaires Argostars.

Les résultats décrivent les branches exécutées par les sources officielles archivées et le core actuel. Ils ne revendiquent ni certification complète de tous les rulings, ni passage de toutes les interfaces, ni fidélité graphique 3D de ces Terrains.
