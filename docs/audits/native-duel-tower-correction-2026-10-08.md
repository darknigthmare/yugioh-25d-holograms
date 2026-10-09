# Duel Tower : égalité des ATK — correction du 8 octobre 2026

**Le texte officiel autorise les deux joueurs à Invoquer Spécialement en cas d’égalité. Le Lua livré abandonnait la résolution avant toute Invocation.** La correction rétablit ce cas dans la source exécutée, avec les choix et les Invocations réellement traités par le core.

Sources Konami consultées avec HTTP 200, extraits et empreintes conservés dans la [preuve](artifacts/native-duel-tower-correction-2026-10-08.json) :

- [Texte français officiel, carte 17244](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=17244&request_locale=fr) : « le joueur qui a révélé le monstre avec la plus haute ATK (chaque joueur en cas d’égalité) peut Invoquer Spécialement 1 monstre depuis sa main ».
- [Texte anglais officiel](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=17244&request_locale=en) : « the player who revealed the monster with the highest ATK (each player, if tied) can Special Summon 1 monster from their hand ».

## Correction bornée et provenance

[NativeDuelTowerScriptCorrection.js](../../src/core/native/NativeDuelTowerScriptCorrection.js) accepte uniquement le SHA-256 de l’original connu :

- Carte : `43940008` ; fichier : `official/c43940008.lua`.
- Source originale : `43d4454ff05c1e05ec47eb69023e45750b4e0e9bf186c4b718e72432ba0f1460`.
- Source exécutée corrigée : `32bfc7a639718a0f1631dd6eec0ee9018334e7273aeabb09065d5e0eb213a11e`.

Une seule substitution remplace le bloc du gagnant unique, après les révélations et bannissements. Le code détermine la plus haute ATK, refuse le faux cas d’égalité où aucun monstre n’a été révélé, puis offre séparément l’Invocation à chaque joueur éligible. Le refus d’un joueur laisse à l’autre son choix. Une Zone Monstre principale libre et un monstre légal en main sont requis ; les choix et positions passent par les prompts natifs.

Les deux `Duel.SpecialSummonStep` acceptés se terminent par un seul `Duel.SpecialSummonComplete`, ce que vérifie un unique message `SPSUMMONED`. L’effet d’attaque directe est enregistré sur chaque vrai monstre invoqué. Le bloc de sélection privée des monstres du Deck, l’ordre joueur actif puis autre joueur et l’effet différé d’End Phase restent byte-identiques.

Les archives Lua, CDB et WASM demeurent inchangées. La transformation possède une provenance distincte de l’archive et refuse tout original dont le SHA diffère. Les comparaisons avant/après de cet audit utilisent un lecteur synchrone explicite sur une copie du Map de scripts, sans modifier l’archive. Le lecteur central de production est désormais intégré dans [NativeDuelRuntime.js](../../src/core/native/NativeDuelRuntime.js) et applique la correction à la lecture de la source originale. Son fonctionnement par défaut, les gardes et la conservation du Map sont vérifiés séparément dans [native-script-corrections-integrity.test.mjs](../../tests/native-script-corrections-integrity.test.mjs) ; ces contrôles ne sont pas comptés parmi les onze scénarios de comparaison ci-dessous.

## Vérifications réalisées

[Tests reproductibles](../../tests/native-duel-tower-correction.test.mjs) : **13 / 13 passent**, dont **11 scénarios de duel** exécutés contre le vrai WASM, sans RETRY ni diagnostic Lua/core :

| Scénario | Résultat natif vérifié |
| --- | --- |
| Original, ATK égales | Reproduit le défaut : aucun joueur n’invoque. |
| Correction, ATK égales | Les deux joueurs invoquent dans leur camp, avec un seul événement simultané. Chaque monstre attaque ensuite directement alors que l’autre reste sur le terrain. |
| Joueur 0 refuse | Seul le joueur 1 invoque. |
| Joueur 1 refuse | Seul le joueur 0 invoque. |
| Les deux refusent | Aucune Invocation ; les cartes restent en main. |
| Original, ATK inégales | Le joueur ayant révélé la plus haute ATK invoque seul. |
| Correction, ATK inégales | Même comportement et destinations légales. |
| Gagnant unique refuse | Aucune Invocation ; le perdant ne reçoit pas d’offre. |
| Personne ne révèle | Aucune Invocation malgré le marqueur d’absence égal sur les deux côtés. |
| Camp adverse plein | Le camp plein ne reçoit pas d’offre d’Invocation ; l’autre joueur peut invoquer. |
| Terrain contrôlé par l’autre joueur | Les deux joueurs éligibles invoquent ; l’éligibilité dépend des ATK révélées, pas du propriétaire du Terrain. |

Chaque scénario consigne les messages du core, réponses typées et indices, queries, cartes de fixtures, seed, équipes et SHA de la source effectivement exécutée. Toutes les fixtures sont ajoutées **avant** `start`, avec MR5 et SEGOC TCG, sans Debug/TestMode, ni injection après démarrage, ni RNG fabriqué.

La confidentialité est vérifiée sur les vrais messages projetés : les deux choix privés du Deck précèdent le premier `CONFIRM_CARDS`, les déplacements vers le bannissement face verso produisent `card: null`, et les monstres restés privés en main n’apparaissent ni dans les événements ni dans les logs publics. Les scénarios font une distinction entre la preuve de fixture, qui consigne volontairement son propre deck, et la sortie publique.

Commandes :

```bash
node --test --test-isolation=none tests/native-duel-tower-correction.test.mjs
node tests/native-duel-tower-correction.test.mjs --write-proof
```

Cette correction certifie les branches et contrôles indiqués. Elle ne constitue pas une vérification exhaustive de tous les effets différés, restrictions globales d’Invocation ou interactions de chaîne possibles de Duel Tower.
