# Diagnostic de la transition hors écran, 13 octobre 2026

Les deux diagnostics valides réalisent chacun huit transitions du studio, quatre à 1280 px et quatre à 390 px. Ils exigent des dessins WebGL réellement observés avant les mesures. Les appels `clear` gardent la méthode originale, le contexte, les arguments et le retour. Les constructeurs natifs d’IntersectionObserver et ResizeObserver délèguent leurs callbacks sans en supprimer ni en changer les arguments, le contexte ou la valeur de retour. Seuls les événements du stage public du studio sont enregistrés. Aucun objet de l’application ou Duel démarré n’est exposé ou modifié.

Le dernier diagnostic compte les appels `clear` directement dans le navigateur, de manière synchrone, et garde aussi les messages console reçus en Python. Dans les huit transitions, le compteur navigateur reste exactement constant pendant 350 ms après un nouvel événement natif `isIntersecting=false`. Aucun appel horodaté après cet événement n’est observé. Le retour à l’écran entraîne de vrais dessins. Les fenêtres historiques courtes ne reproduisent ni les deux dessins supplémentaires, ni un écart de livraison Python. Ces résultats vérifient la pause ; ils ne prouvent pas la cause des échecs complets antérieurs.

L’ancien contrôle complet du 11 octobre fixe son compteur avant la capture initiale : il échoue à `(1256, 1258)`. Le premier contrôle complet du 13 octobre passe la pause et rend les 192 avatars, puis échoue à `(1244, 1246)` après l’attente fixe hors écran de 300 ms. Ces deux échecs sont conservés, avec les wrappers réellement exécutés archivés sous `.py.txt`.

Le premier diagnostic d’observers est invalide : une erreur de concaténation JavaScript dans l’instrumentation empêchait l’installation du compteur WebGL. Ses mesures zéro ne servent pas de preuve de pause. Le script corrigé, livré dans un autre dossier, exige l’absence d’erreur et un compteur positif avant de poursuivre.

La nouvelle recette complète attend le nouvel événement natif de non-intersection et vérifie que la boîte publique du stage se trouve sous le viewport. Elle observe ensuite une fenêtre fixe de 350 ms et exige exactement zéro dessin. Elle refuse aussi tout appel horodaté après cet événement de non-intersection. Le compteur synchrone du navigateur détermine ces fenêtres ; la liste Python complète est conservée pour examiner le transport. Le contrôle de pause après une première capture stabilisée, l’égalité stricte des PNG et les contrôles de reprise restent actifs. Aucun seuil de tolérance et aucune suppression d’observer ne sont introduits.

Les sources et assets compilés gelés, les drivers historiques et les fichiers des échecs antérieurs sont identiques avant et après chaque diagnostic valide.

| Exécution | `ok` | Résultat | SHA-256 du rapport |
| --- | --- | --- | --- |
| 11 octobre | False | (1256, 1258) | `c8ce9590ea536c30ddbf5d8be335e29ade024e581d09f7f88e34353c8682f17d` |
| 13 octobre, premier contrôle complet | False | (1244, 1246) | `533761250032f38da0919ef22cc9dfc6a476775953e93a0674ab1753f2bafb61` |
| diagnostic observers invalide | False |  | `27f53fbe1912cf4554a353d6c4b565d9653d2a11f7c70d8749bb12a0642dac54` |
| diagnostic observers corrigé | True | Aucun échec | `e2f4aa35b8115ef57b081d9010236cdbc293da3fb6f16d7d331e235e90cfb3c5` |
| diagnostic avec compteur synchrone | True | Aucun échec | `6f70344ffc439b1e5617c751abe4fecd0ad3637f61f3050e6165a5f4fa84ada4` |
