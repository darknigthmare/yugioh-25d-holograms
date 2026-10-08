# Call of the Forgotten — parcours navigateur, 8 octobre 2026

Le script [audit-native-multi-set-ui.py](../../scripts/audit-native-multi-set-ui.py) a vérifié les trois Sets dans le bundle final compilé, sur ordinateur 1280 × 900 et mobile 390 × 844 : **2 parcours réussis et 14 captures inspectées**. Entrée servie : `index-DNwe3FSS.js`, SHA-256 `38c428237545d8290e07229c5efdda93441dd1088234c31e64aa6ef3f8b59321`. Les premières projections stables sont contrôlées avant toute action sur la caméra, puis après le clic sur GLOBALE et lors d'une seconde entrée réelle.

Commande : `python scripts/audit-native-multi-set-ui.py`.

Le Deck est enregistré localement avant le lancement du duel : 40 cartes, au plus trois copies par nom, trois Call of the Haunted restant dans le Deck et Call of the Forgotten dans la main initiale mélangée. Le flux crypto déterministe appartient exclusivement au contexte d'audit ; le mélange et les règles restent ceux de l'application.

Le parcours exécuté utilise uniquement les contrôles visibles :

1. Vérifier que l'invocation spéciale de Gilasaurus est réellement proposée avant le Terrain.
2. Activer Call of the Forgotten depuis la main et accepter son effet facultatif.
3. Sélectionner les trois copies distinctes de Call of the Haunted par les indices 2, 0 et 1, puis confirmer 3/3.
4. Choisir trois zones Magie/Piège distinctes à mesure que le core les propose.
5. Vérifier les trois Pièges cachés et le Terrain résolu ; l'invocation spéciale de Gilasaurus est désormais absente tandis que son invocation normale reste proposée.
6. Vérifier le même état dans le cycle compacte → arène → 3D → compacte → arène → 3D → compacte. À chaque entrée 3D, attendre par lectures publiques les dimensions CSS3D et caméra égales au host, une matrice caméra non identité et deux frames stables. Contrôler le défilement interne nul, l'alignement du canvas, la barre de caméras visible et les trois propres Sets dans le cadre avant toute action caméra ; cliquer GLOBALE et les vérifier à nouveau.
7. Terminer le tour par le bouton public, laisser l'IA jouer, puis vérifier au tour suivant le retour de l'invocation spéciale de Gilasaurus et l'anonymat des deux cartes adverses réellement Posées.

Le [rapport exécuté](artifacts/native-multi-set-ui-2026-10-08/report.json) archive les empreintes de 17 fichiers : HTML, CSS, tous les chunks JS, WASM et archives. Ces empreintes sont identiques avant et après l'audit. Aucune erreur JavaScript, défaillance de ressource native ou violation CSP n'a été relevée. Le code privé des cartes adverses cachées n'est pas lu.

Avant le premier clic caméra, le host mobile mesure 390 × 560 et les trois Sets mesurent au moins 31 × 27 pixels ; sur ordinateur, le host mesure 840 × 820 et les Sets au moins 63 × 55. Après le clic réel sur GLOBALE, les trois Sets mobiles mesurent respectivement 20, 19 et 18 pixels de large sur 21 de haut ; sur ordinateur, les dimensions minimales sont 36 × 42. Le canvas reste aligné et tous les centres sont dans le host. Les deux entrées passent avec `scrollTop = scrollLeft = 0`.

L'audit initial avait révélé un défilement mobile résiduel de 220 pixels, qui poussait le canvas et les caméras hors cadre. La [preuve avant correctif](artifacts/native-multi-set-framing-before-2026-10-08.json) et sa [capture](artifacts/native-multi-set-framing-before-2026-10-08.png) sont conservées. Le correctif app remet le défilement à zéro à l'activation réelle et empêche un callback de positionnement compacte tardif de le réappliquer.

Un [diagnostic public de capture du build FINAL2](artifacts/native-multi-set-projection-final2-2026-10-08.json) a aussi observé un état transitoire : les classes réelles, la couche active et `aria-busy=false` étaient déjà présents, alors que le host mobile conservait 300 pixels de haut et le parent caméra CSS3D une matrice identité. La [sonde des animations CSS](artifacts/native-multi-set-projection-cascade-final2-2026-10-08.json) explique cet état : transitions hauteur 300 → 560 et transformation `none` → perspective à `currentTime=0`, avant leur première frame. Une sonde indépendante a confirmé la projection correcte au tick suivant sans clic caméra. Le gate de l'audit attend maintenant la projection stable avant les assertions ; aucune nouvelle modification app n'a été nécessaire pour ce transitoire.

Aucun objet de jeu, hook QA, réponse native injectée, identité privée adverse ou ajout de fixture après démarrage n'est utilisé. L'audit navigateur couvre cette branche des trois Sets, sa restriction immédiate et son expiration après un vrai tour adverse ; la chaîne ultérieure Call of the Haunted est exercée séparément dans le lot D natif. La reproduction spatiale exhaustive de l'illustration n'est pas certifiée par ce parcours.
