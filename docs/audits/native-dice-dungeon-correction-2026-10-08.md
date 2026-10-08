# Dice Dungeon — correction native documentée, 8 octobre 2026

**Dice Dungeon applique maintenant à chaque joueur son propre résultat de dé**, y compris quand le joueur du tour ne contrôle pas le Terrain. Le défaut du Lua fournisseur est reproduit avant correction ; les archives originales ne sont pas remplacées.

Le texte de la carte 11808215 indique : « each player rolls a six-sided die and applies the result to all monsters they control ». Dans la source d'origine, `s.diceop` lance le premier dé pour `Duel.GetTurnPlayer()` et le second pour l'autre joueur, puis applique systématiquement le premier résultat aux monstres de `tp`, contrôleur du Terrain. Les résultats sont donc inversés entre les joueurs pendant la Battle Phase adverse.

| Preuve native, Terrain joueur 0 et Battle Phase joueur 1 | Source fournisseur | Source effective corrigée |
| --- | --- | --- |
| Dé du joueur 1 | 2 | 2 |
| Dé du joueur 0 | 1 | 1 |
| Jerry Beans Man du joueur 0, 1750 ATK imprimés | 2750 ATK | **750 ATK** |
| Blue-Eyes du joueur 1, 3000 ATK imprimés | 2000 ATK | **4000 ATK** |
| Après l'End Phase | 1750 / 3000 ATK | 1750 / 3000 ATK |

La graine de cette comparaison est `[14417597170776629353, 4841133560403876232, 8260047010386786192, 9272791722834923846]`. Les messages `TOSS_DICE` avant/après sont identiques. Les dés ne sont ni choisis par une réponse, ni remplacés par une valeur forcée.

## Modification locale et provenance

[NativeDiceDungeonScriptCorrection.js](../../src/core/native/NativeDiceDungeonScriptCorrection.js) insère une seule ligne immédiatement après les deux vrais appels `Duel.TossDice` :

```lua
if turn_p~=tp then res1,res2=res2,res1 end
```

Les appels RNG, messages de jets, groupes de cibles, six modificateurs d'ATK et réinitialisations d'End Phase restent les mêmes. Quand le joueur du tour contrôle le Terrain, la ligne n'inverse aucun résultat.

| Source | Octets UTF-8 | SHA-256 |
| --- | --- | --- |
| `c11808215.lua` d'origine | 2948 | `bdabb87f4746b36edb8a88d6e5620e426cc97e4317a67439faa120e55466c86e` |
| Source effective corrigée | 2992 | `ec1b64aa682d4ff098fcc3ef8239eece2a03a479511e79006fdee09cd6c6832c` |

Le transformateur exige la première empreinte et vérifie la seconde. Une source inconnue ou déjà transformée est refusée. Le reader normal applique cette transformation à la source du Map d'archives intact ; un reader explicite reste maître de sa source, ce qui permet de conserver la preuve antérieure. Les scripts des autres cartes ne sont pas modifiés par ce transformateur.

## Vérifications reproductibles

**28 tests nommés passent.** Commande : `node --test --test-isolation=none tests/native-dice-dungeon-correction.test.mjs`.

La [preuve JSON](artifacts/native-dice-dungeon-correction-2026-10-08.json) conserve les décisions typées, messages, requêtes et fixtures avant `start()`, les empreintes des fichiers d'exécution, le texte de référence et les sources originale/effective. **24 duels corrigés** couvrent les deux contrôleurs du Terrain, les deux joueurs du tour et six graines produisant réellement tous les résultats de 1 à 6. Les attentes viennent de la table imprimée, indépendamment de l'ordre des deux jets. Les phases du propriétaire sont aussi comparées à la source fournisseur pour vérifier leur conservation.

Les tests vérifient les changements d'ATK, les deux chaînes du Terrain, l'absence de RETRY et de diagnostics Lua, puis le retour aux ATK imprimées à l'End Phase. Une comparaison dédiée vérifie également le reader de production sans Map corrigé ni reader de test. MR5 et les deux options TCG SEGOC restent actifs ; aucun Debug/Test, injection après démarrage, callback RNG ni changement de CDB/WASM n'est utilisé. Les empreintes complètes de `scripts.json`, `card-data.json` et du WASM sont identiques avant et après.

Les interactions avec relance ou substitution de dés et avec d'autres modificateurs simultanés ne sont pas certifiées par cet audit. Il s'agit d'une correction locale explicite d'une source fournisseur, et non d'une nouvelle version du script officiel.
