# Terrains : 15 branches natives supplémentaires — continuation A

Exécution technique datée du **8 octobre 2026, UTC**. Le rapport enregistre l’horodatage exact dans `executedAtUtc`.

Les **15 scénarios passent sur six Terrains** avec le WASM OCG archivé et les scripts Lua du catalogue natif. Ils complètent les branches déjà présentes ; ils ne certifient pas toutes les interactions possibles de ces cartes.

La preuve complète contient les fixtures, décisions du protocole, messages OCG, requêtes natives et résultats : [continuation-field-a-2026-10-08.json](artifacts/continuation-field-a-2026-10-08.json). Les 377 anciens scénarios et leur matrice restent dans leur rapport historique, dont l’empreinte est enregistrée dans la provenance.

## Branches exécutées

| Terrain | Scénario | Résultat natif vérifié |
| --- | --- | --- |
| Chicken Game · 67616300 | `continuation-a-chicken-opponent-recovery-cost-and-response-lock` | Coût de 1000 LP, récupération de 1000 LP pour l’adversaire, interdiction de répétition et absence de réponse MST pendant la résolution de cette activation. LP finaux : 7000/9000. |
| Chicken Game | `continuation-a-chicken-destroy-option-removes-prevention` | Le mode de destruction consomme 1000 LP et détruit le Terrain par effet. Ookazi inflige ensuite réellement 800 au joueur à 7000 LP ; la prévention a disparu. |
| Chicken Game | `continuation-a-chicken-equal-lp-control-and-dynamic-prevention` | À égalité 8000/8000, un premier Ookazi inflige 800. Le second résout mais ne diminue plus les 7200 LP devenus inférieurs. |
| Gateway to Chaos · 40089744 | `continuation-a-gateway-six-counter-cap-cost-limit-and-reset` | La destruction simultanée de sept monstres sur les deux côtés donne six compteurs, le plafond. Une recherche retire trois ; une seconde reste interdite malgré les trois restants. Au prochain tour du contrôleur, la recherche devient utilisable et consomme les trois restants. |
| Gateway to Chaos | `continuation-a-gateway-deck-exclusion-hand-discard-and-activation-oath` | L’envoi Deck→GY par Foolish Burial ne donne aucun compteur. La défausse de Blue-Eyes pour l’Invocation du Tricky donne un compteur. Une autre copie du Terrain ne peut pas être activée ce tour, avec une cible Gaia encore légale dans le Deck. |
| Secret Village · 68462976 | `continuation-a-village-owner-without-spellcaster-recovers-on-normal-summon` | Sans Magicien, le contrôleur ne peut pas activer MST. L’Invocation Normale réelle de Mystical Elf fait disparaître cette restriction et MST détruit le Piège adverse. |
| Secret Village | `continuation-a-village-opponent-spellcaster-unlocks-own-spells` | L’adversaire sans Magicien est d’abord empêché d’activer MST. Après sa propre Invocation Normale de Mystical Elf, les deux joueurs ont un Magicien ; MST devient légal et détruit Village. |
| Black Garden · 71645242 | `continuation-a-garden-exact-plant-total-revival-exempts-halving` | Beaver est réellement Invoqué et passe de 1200 à 600 ATK ; un Jeton Rose adverse a 800 ATK. L’ignition détruit le Terrain et ce Plante, puis Invoque Mystical Elf à 800 ATK depuis le GY. Aucun nouveau Jeton. |
| Black Garden | `continuation-a-garden-full-opposing-zones-halves-without-token` | Les cinq zones principales adverses sont occupées. Monster Reborn Invoque Blue-Eyes et Garden le réduit de 3000 à 1500 ATK, sans créer de Jeton dans une zone occupée. |
| Black Garden | `continuation-a-garden-simultaneous-summon-halves-both-one-token` | Rescue Rabbit Invoque réellement deux monstres Normaux en même temps. Les deux passent de 2000 à 1000 ATK ; un seul Jeton Rose est créé pour cet événement. |
| Black Garden | `continuation-a-garden-second-active-copy-proves-revival-exemption` | Deux Gardens actifs réduisent Battle Ox de 1700 à 425 ATK et créent deux Jetons Rose, total 1600. L’un des Gardens les détruit et Invoque Ryu-Kishin Powered du GY à 1600 ATK. Le Garden adverse reste actif : il ne divise pas les ATK de cette Invocation particulière et ne crée aucun nouveau Jeton. |
| Fire King Island · 57554544 | `continuation-a-island-empty-field-hand-special-shared-limit-reset` | Sur terrain de monstres vide, le mode secondaire Invoque Garunix depuis la main. Les deux modes deviennent indisponibles ce tour. Après un tour adverse complet, l’autre mode détruit Beaver en main et recherche Barong ; Garunix reste sur le terrain. |
| Fire King Island | `continuation-a-island-banished-field-destroys-only-own-monsters` | Cosmic Cyclone paie 1000 LP et bannit Island. Le déclencheur obligatoire détruit les monstres du contrôleur d’Island et conserve le Dark Magician adverse. |
| Archfiend Palabyrinth · 63883999 | `continuation-a-palabyrinth-deck-summon-effect-banish-and-name-limit` | Le Cavalry Niveau 4 ciblé reste sur le terrain. La Jinn est banni par effet, sans raison de coût. Terrorking Niveau 4 est Invoqué depuis le Deck et gagne 500 ATK. L’ignition ne peut plus être répétée ce tour. |
| Archfiend Palabyrinth | `continuation-a-palabyrinth-full-zones-removal-frees-grave-revival` | Même avec cinq zones principales occupées, le bannissement d’un autre Démon libère une zone. Terrorking est réellement Invoqué depuis le GY, les cinq zones restent légalement occupées et ses ATK sont 2500. |

## Méthode et ressources

[native-field-continuation-a.mjs](../../scripts/native-field-continuation-a.mjs) utilise le harness natif existant. Chaque session démarre avec ses cartes déjà disposées ; toutes les activations, Invocations, défausses, destructions, recherches, variations de LP et créations de Jetons passent ensuite par les réponses typées du moteur. Aucune carte n’est ajoutée après `start`, aucune règle n’est simulée en JavaScript et aucun résultat natif n’est remplacé.

Le protocole conserve MR5 et les deux options TCG SEGOC existantes. Le mode de test OCG n’est pas activé. Les seeds sont `1/2/3/4`, les LP initiaux 8000/8000 et les pioches initiales/par tour sont désactivées uniquement dans ces fixtures déterministes. Cette désactivation ne modifie pas les règles ou pioches des parties de l’application.

Le rapport contient les empreintes des dépendances, du WASM, des Lua originaux et effectivement lus, des bootstraps `constant.lua`/`utility.lua` et de la compatibilité Lua déjà présente. **Aucun Lua de carte de ces fixtures n’a été corrigé ; aucune archive Lua/CDB/WASM n’a été modifiée.** Les empreintes officielles sont comparées au manifeste natif. Le test compare en plus les archives et le rapport historique de 377 scénarios avant et après les sessions.

Chaque joueur utilise au maximum trois copies d’une même identité dans ces nouvelles fixtures. Les sept monstres du test du plafond de Gateway et les cinq monstres qui occupent les zones face à Garden sont des monstres Normaux distincts, sans déclencheur secondaire ; ce choix conserve exactement les conditions de compteurs et d’occupation testées. Les fixtures déterministes ne sont pas présentées comme des Decks complets homologués pour un format ou une banlist.

## Validation reproductible

```sh
node scripts/native-field-continuation-a.mjs
node --test --test-reporter=tap tests/native-field-continuation-a.test.mjs
node --test --test-isolation=none --test-reporter=tap tests/native-field-continuation-a.test.mjs
```

Le passage `node --test` par défaut, exécuté avec l’override autorisé du sandbox décrit ci-dessous, compte **16 tests nommés réussis** : un test parent et les 15 scénarios. Aucun échec, annulation, saut ou TODO. Voir [targeted-tests.txt](artifacts/continuation-field-a-2026-10-08/targeted-tests.txt). Le passage sans isolation a également exécuté ces 16 tests nommés.

Dans le sandbox par défaut de cet environnement, les sous-processus Node 24 renvoient un diagnostic `EPERM` et peuvent perdre leur sortie standard ; le comptage limité au nom du fichier ne constitue pas la preuve des 15 branches. L’exécution de la commande via l’override de sandbox `with_additional_permissions` et `network.enabled=true`, autorisé par les outils du runtime, restaure le lancement des sous-processus et les résultats nommés. Le passage direct sans isolation fournit le même comptage. Le test utilise directement le moteur et le CLI fournit un autre passage complet avec les messages et requêtes natifs. Aucun changement du lancement global des tests ou de `package.json` n’est inclus dans cette contribution.

Le premier pilote comportait deux attentes de fixture incorrectes, corrigées avant cette preuve finale : une zone vide est représentée par `{}` par la requête native, et le Beaver 32452818 du CDB archivé a **1200 ATK**, donc 600 après Garden. Les attentes finales vérifient l’absence de code dans la zone vide et cette moitié exacte. Ces corrections ne modifient aucun comportement du jeu. Le diagnostic pilote reste dans `/tmp/continuation-field-a-initial-2026-10-08.json`, séparé du rapport réussi.

## Portée

Cette contribution ajoute des branches de coût, choix, plafond, restrictions continues, limite par nom, retour au prochain tour et conditions d’Invocation. Elle ne modifie ni les 377 scénarios historiques, ni `NativeFieldCoverageSnapshot`, ni la matrice consolidée, ni les anciennes preuves. Elle n’ajoute pas de règle parallèle au moteur OCG.

Elle ne constitue pas une certification des rendus du navigateur, de toutes les interactions TCG, de tous les effets de ces six Terrains ou d’une fidélité visuelle intégrale 1:1. La consolidation avec les autres chantiers doit citer le rapport nouveau et préserver le rapport historique.
