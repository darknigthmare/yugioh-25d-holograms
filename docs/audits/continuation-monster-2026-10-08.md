# Trois silhouettes jouables supplémentaires — 8 octobre 2026

Battle Ox (`5053103`, passcode imprimé `05053103`), Saggi the Dark Clown (`66602787`) et Curse of Dragon (`28279543`) utilisent désormais des anatomies dédiées. Ces cartes existent déjà dans `STARTER_CARDS` et dans les decks réellement fournis aux missions solo. Le catalogue passe de **25 à 28 profils**, avec les **17 familles de secours préservées**.

Les trois JPEG crop locaux ont été ouverts avant la construction. Les six variantes crop/small sont ensuite chargées et décodées dans Chromium pour la comparaison. L’illustration n’est jamais plaquée sur un plan : les corps utilisent des volumes, des couleurs de sommets et des pièces fusionnées par matériau.

## Motifs visibles et adaptations

- **Battle Ox** : museau bovin brun, narines sombres, casque rouge à visière en V, longues cornes dorées, grands épauliers rouges bordés de rivets, deux poings sur un manche vert et hache argentée à deux tranchants balayés. L’ancien guerrier humain à épée et bouclier disparaît. L’illustration est un buste : jambes, sabots, ceinture et protections inférieures sont des continuations déclarées.
- **Saggi** : masque blanc/bleu asymétrique, étoile jaune sur l’œil gauche, œil droit oblique, nez rouge, sourire denté, oreilles argentées pointues, col rouge à pointes et grelots, manches bleues, avant-bras blancs et longues mains violettes ouvertes. Le chapeau conserve une pointe gauche nue et une courbe droite portant un grelot ; la couronne rouge est dentelée. L’ancien bâton et chapeau conique disparaissent. La tunique inférieure, les chaussures et les jambes sont extrapolées depuis le buste.
- **Curse of Dragon** : corps serpentin olive continu et bouclé, plaques ventrales rouges, crâne allongé et effilé, cornes longues, mâchoire inférieure crochue, fentes rouges sur crâne/ailes, grandes ailes pleines à bords balayés et épines. Aucune patte de dragon générique n’est conservée. L’orientation de la courbe, le verso et les profondeurs restent adaptés au rendu 2,5D.

Les reliefs faciaux, les reflets, les surfaces des ailes et les petits ornements sont simplifiés. Ces anatomies améliorent la correspondance des silhouettes et des motifs ; elles ne constituent pas une reproduction spatiale intégrale 1:1.

## Rendu mesuré

| Carte | Ancien profil | Triangles au repos/en action | Triangles avec défense | Appels de dessin |
|---|---|---:|---:|---:|
| Battle Ox | `generic-warrior-earth` | 5 088 | 5 656 | 5 |
| Saggi | `generic-magician-dark` | 5 288 | 5 856 | 5 |
| Curse of Dragon | `generic-dragon-dark` | 4 820 | 5 388 | 5 |

Les appels et triangles de repos/action proviennent de `WebGLRenderer.info.render`, aux trois angles. La défense est contrôlée sur les géométries construites par les tests. La galerie active le rendu couleur sans passage d’ombre ; ses chiffres ne comprennent pas un plateau, des effets simultanés ou des ombres.

Les deux bras, poings et la hache de Battle Ox partagent WEAPON. Les deux mains et avant-bras de Saggi partagent STAFF. Curse utilise les joints distincts LEFT_WING, RIGHT_WING et JAW. Toutes les poses utilisent les uniforms GPU existants : aucune géométrie ni palette n’est téléversée à nouveau pendant l’action. Les actions finies, la réduction des mouvements et la libération des matériaux d’ombre restent couvertes.

## Vérification et préservation

```sh
node --test --test-isolation=none test/continuation-monster-2026-10-08.test.js test/hologram-reference-anatomy.test.js test/hologram-pose-animation.test.js test/real-duel-hologram-models.test.js
python scripts/audit-continuation-monster-2026-10-08.py
```

- **25 tests réussis**, aucun échec, annulation, test ignoré ou TODO ; quatre nouveaux tests couvrent les cartes jouables, le passcode complété de Battle Ox, volumes/palettes/budgets, cohérence des joints, poses finies, mode réduit et destruction des modèles devenant face verso.
- Une carte dissimulée n’entraîne aucune lecture d’identité, même avec un getter qui lève une erreur. La scène réutilise les objets publics identiques et libère leurs géométries lors du masquage.
- **18 triptyques réels** : trois cartes × face/trois-quarts/profil × repos/action à 0,4. Les deux renderers utilisent les mêmes lumières, matériaux de scène, taille de canvas et caméra, avec un rayon de 7,0 pour garder toutes les extrémités visibles.
- Baseline complète : `5971495fb9425b96416b5e07bfeb6d28ec9bd43c`. Ses modules sont servis par `git show` ; les nouveaux modules viennent du workspace. Toutes les importations ESM transitives, les illustrations, le script et le test sont empreintés ; leurs empreintes restent stables pendant les captures.
- Les **25 modèles exacts précédents** ont des empreintes avant/après identiques pour leurs profils, pièces nommées, échelles, attributs géométriques complets — positions, normales, couleurs, UV et joints — et propriétés de matériaux. Cette préservation compare les buffers construits ; elle ne prétend pas rendre les 25 anciens modèles dans la galerie.
- Les **18 captures finales ont été ouvertes avec `view_image`**. L’inspection a conduit au raccord de la tunique de Saggi, à la correction du chapeau asymétrique, à l’effilement réel du crâne du serpent et à l’ajustement identique des deux caméras avant les captures finales.
- Aucun événement d’erreur navigateur ni requête échouée. Les six modèles avant/après libèrent tous les événements `dispose` attendus ; après retrait, la mémoire WebGL compte **0 géométrie et 0 texture** ; après libération du renderer, **0 programme**. Chaque rig est libéré et le contexte est perdu explicitement.

Cette galerie source prouve l’apparence et l’articulation mécanique. Elle ne certifie pas un duel natif, un nouvel effet de carte ni l’application compilée. Aucun build global, commit ou déploiement n’est exécuté par ce chantier. Les profils d’attaque `blade`, `dark-magic` et `dragon-burst` sont conservés.

## Preuves

- [Mesures, provenance, illustrations et préservation](artifacts/continuation-monster-2026-10-08/measurements.json), SHA256 `b6c100b8e09547512dad8a6346ad0943f335ef8956753cb7f92da15fb0b3bee5`.
- [Inspection des 18 captures](artifacts/continuation-monster-2026-10-08/visual-inspection.json), SHA256 `8dbccfda97e312519405384179f2ae398d17b41479dfafc65af29f5b31928966`.
- [Résultats ciblés](artifacts/continuation-monster-2026-10-08/targeted-tests.json) et [journal exact](artifacts/continuation-monster-2026-10-08/targeted-tests.txt).
- Battle Ox : [face au repos](artifacts/continuation-monster-2026-10-08/5053103-front-rest.png), [trois-quarts en action](artifacts/continuation-monster-2026-10-08/5053103-three-quarter-attack.png), [profil en action](artifacts/continuation-monster-2026-10-08/5053103-side-attack.png).
- Saggi : [face au repos](artifacts/continuation-monster-2026-10-08/66602787-front-rest.png), [trois-quarts en action](artifacts/continuation-monster-2026-10-08/66602787-three-quarter-attack.png), [profil en action](artifacts/continuation-monster-2026-10-08/66602787-side-attack.png).
- Curse of Dragon : [face au repos](artifacts/continuation-monster-2026-10-08/28279543-front-rest.png), [trois-quarts en action](artifacts/continuation-monster-2026-10-08/28279543-three-quarter-attack.png), [profil en action](artifacts/continuation-monster-2026-10-08/28279543-side-attack.png).

Les autres angles/poses, les six JPEG et toutes les empreintes PNG figurent dans le JSON. Les rapports et captures des vagues précédentes restent inchangés.
