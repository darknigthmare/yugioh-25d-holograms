# Présentation publique native — nouvelle passe du 8 octobre 2026

Sept scénarios du vrai moteur reproduisent trois défauts de présentation, puis vérifient les résultats corrigés. Les règles, les archives Lua/CDB et le WASM ne sont pas modifiés. La [preuve JSON](artifacts/native-public-presentation-wave-2026-10-08.json) contient fixtures, réponses typées, messages, requêtes et projections avant/après du même duel.

| Parcours | Résultat vérifié |
| --- | --- |
| Monster Reborn, chacun des deux contrôleurs | Le véritable mouvement depuis le Cimetière adverse précède `SPSUMMONING`, puis `SPSUMMONED`. Cette réussite seule ajoute `nativeRevivalConfirmed` et la référence publique du Cimetière d'origine. Le type d'Invocation reste `special` ; le renderer choisit le profil de réanimation. |
| Necrovalley contre Monster Reborn | La négation réelle conserve le monstre au Cimetière ; aucune réussite ni réanimation n'est annoncée. |
| Creature Swap | Les deux cartes révélées restent associées aux destinations annoncées, avec contrôleurs, positions et ATK/DEF réels. La baseline perdait ces caches et renvoyait des statistiques publiques nulles après l'échange. |
| Book of Moon après réanimation | La mise face verso oublie la carte et son ancien code public ; les événements restent anonymes et une demande de statistiques cachées ne déclenche aucune requête. |
| Retrait d'une carte du Cimetière | La réanimation du premier monstre renumérote la pile ; l'ancien code du slot 0 ne doit pas masquer les statistiques du monstre suivant. La baseline renvoyait null, la projection corrigée lit ses 1800 ATK natives. |
| Gilasaurus depuis la main | Cette vraie Invocation Spéciale conserve le profil ordinaire et ne reçoit aucun marqueur de réanimation. |

La comparaison archive les octets exacts du traducteur de la baseline locale `251fec0197ed85e40bca2af03e4431db1fef11e5`, dont l'arbre est identique au commit distant `560c107287c2f5284819c3f738f1f47e014aad92`. Le [fichier archivé](artifacts/native-visual-events-before-wave-2026-10-08.js.txt) conserve SHA-256 `02c6a63d73a3d25c2257539090d7893b487e5c0b106a418e5609d985d007d075`. Seul son import relatif est adapté en URL de fichier pour exécuter la comparaison ; les deux empreintes documentent cette adaptation. Aucun sous-processus Git ni commit local absent de GitHub n'est nécessaire pour rejouer l'audit.

Les deux traducteurs reçoivent exactement les mêmes messages et effectuent des requêtes en lecture seule. Le lecteur de sources Lua et les choix de règles restent ceux du core MR5/SEGOC. Les piles publiques Cimetière, bannissement et Extra Deck invalident leurs identités de slots lorsqu'un mouvement renumérote leur contenu. Une identité oubliée n'est pas réinventée à partir d'une permutation cachée.

La suite [native-public-presentation-wave.test.mjs](../../tests/native-public-presentation-wave.test.mjs) ajoute les gardes du préfixe avant réussite, de l'origine expirée à une nouvelle action et du masque de requête transmis par la vraie façade `NativeDuelGame` au WASM. Le renderer ne reçoit ni UID natif, ni identité de matériel privé, ni résultat de règle calculé en JavaScript. Le test du masque utilise une fixture pré-démarrage et une requête réelle ; il ne constitue pas un parcours navigateur.

Les événements de réanimation alimentent le profil graphique dédié, contrôlé séparément dans la passe d'effets. Les preuves navigateur du build intégré sont consignées dans le bilan de cette nouvelle passe. Les captures et rapports de la livraison précédente conservent leur provenance historique.
