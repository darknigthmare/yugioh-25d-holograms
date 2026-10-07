# Fenêtres natives de décision — 7 octobre 2026

La nouvelle suite exécute **15 scénarios d’effets officiels archivés**, plus un contrôle des limites de visibilité : **16 tests réussis, aucune erreur Lua ni réponse `RETRY`**. Elle utilise le même WASM natif que l’application, avec MR5 et les deux règles TCG SEGOC, sans modifier les scripts ou les données de cartes.

## Correction vérifiée

`SELECT_TRIBUTE` et `SELECT_COUNTER` transportent une référence sans position. Le traducteur masquait donc un monstre adverse déjà public sous « Carte face verso ». Après l’activation de **Soul Exchange**, le sacrifice de **Dark Magician** adverse pour **Summoned Skull** reproduit le problème dans le protocole réel.

Le callback `isPublicCard(reference)` confirme uniquement la visibilité depuis la projection synchronisée du plateau. La façade renvoie un booléen pour une carte face recto en zone Monstre, Magie/Piège, bannie ou Extra. Le traducteur peut alors employer le nom public déjà archivé. Sans cette preuve, le libellé reste générique. Une position explicitement face verso, une main/un Deck adverses ou un passcode nul ne consultent pas ce callback et n’appellent pas le résolveur d’identité.

## Scénarios exécutés

| Carte ou interaction | Vérification dans le core réel |
| --- | --- |
| Prohibition | Déclaration valide du catalogue ; Dark Magician demeure en main et disparaît des commandes d’Invocation autorisées. |
| DNA Surgery | Déclaration Dragon transmise comme masque natif ; les Types des monstres des deux joueurs changent après résolution. |
| DNA Transplant | Déclaration FEU ; les Attributs des deux joueurs changent après résolution. |
| Wall of Revealing Light | L’option d’index 2 signifie 3000 LP ; le paiement intervient avant la fenêtre de réponse à la chaîne. |
| Spellbook Organization | Trois clics dans l’ordre 2, 0, 1 ; conversion indice → rang et ordre réel du dessus du Deck vérifiés. |
| Kaiser Sea Horse | Un seul monstre fournit les deux sacrifices LUMIÈRE ; le sacrifice de poids 1 est refusé et reste sur le Terrain. |
| Tokusano Shinkyojin | Somme de Niveaux exactement 10 ; coûts envoyés au Cimetière avant la réponse, puis deux cartes réellement piochées. |
| Machina Fortress | Somme minimale au moins 8 ; Niveaux 6 + 5 acceptés, carte supplémentaire inutile et somme insuffisante refusées. |
| Reasoning — Niveau concordant | L’adversaire annonce 4 par index ; le monstre excavé de Niveau 4 est envoyé au Cimetière. |
| Reasoning — Niveau différent | L’adversaire annonce 3 ; le même monstre de Niveau 4 est Invoqué Spécialement. |
| Defender / Royal Magical Library | Compteurs acquis par de vraies activations ; remplacement de destruction et répartition exacte de trois Compteurs Magie. |
| Sangan + Witch of the Black Forest | Deux effets obligatoires simultanés ; aucun passage disponible, ordre de chaîne choisi et deux recherches résolues. |
| Honest / Book of Moon | Book of Moon proposé avant la Damage Step ; Honest proposé dans celle-ci, Book exclu, coût payé depuis la main et 3000 dommages calculés. |
| Nekroz Mirror / Shurit | Poids natif alternatif 3 ou 6 ; Shurit seul remplit le Niveau Rituel 6 et les groupes incorrects sont refusés. |
| Soul Exchange | Référence adverse publique sans position ; nom correct, sacrifice adverse réel et monstre propre préservé. |

Le seizième test contrôle séparément que le callback ne dévoile ni une position face verso explicite, ni une main/un Deck adverses, ni une identité inconnue.

## Reproduction et limites

```sh
node --input-type=module -e "import('./tests/native-duel-rule-windows.test.mjs')"
```

La suite fait également partie de `npm test` / `npm run check`. Le [rapport JSON](artifacts/native-rule-windows-2026-10-07.json) contient le hash du WASM, la révision du core, les scripts et leurs empreintes ; le [journal d’exécution](artifacts/native-rule-windows-2026-10-07.txt) expose les résultats individuels.

Ces scénarios n’émettent pas de `SELECT_SUM` avec préfixe obligatoire. Cette forme du protocole reste vérifiée dans les suites de conformité existantes, dont le test Lua synthétique explicitement identifié comme tel. Les résultats ci-dessus ne certifient pas toutes les branches de toutes les cartes ni l’ensemble des règles de duel.
