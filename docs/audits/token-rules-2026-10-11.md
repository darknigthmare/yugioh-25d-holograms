# Jetons : règles natives et présentation, 11 octobre 2026

Les 11 parcours exécutés par le vrai WASM et les scripts Lua officiels passent. Ils vérifient sept générateurs : Tetherwolf, Scapegoat, Dandylion, Fires of Doomsday, Ojama Trio, Black Garden et Gorz. Aucun Jeton n’est ajouté aux Decks ou au plateau par les fixtures ; leur création résulte des effets natifs. Le socle de scénario existant est réutilisé sans modification.

Une correction est apportée à `NativeDuelVisualEvents.js`. Un Jeton quitte le plateau avec un message `MOVE` vers `location: 0`, puisqu’il cesse d’exister. Le raccord public ignorait alors son motif natif : les destructions n’émettaient pas leur réaction, le matériau de Link Spider était présenté comme une Invocation Spéciale générique et le tribut d’un Jeton comme une Invocation Normale. Le raccord conserve désormais ce motif uniquement pour un ancien Jeton connu face visible. Il réutilise son identité publique, ne lit pas le passcode supprimé et ne requête jamais la zone inexistante.

| Vérification native | Résultat |
| --- | --- |
| Stats, Niveau, Type, Attribut et position à la création | Valeurs exactes interrogées dans le core puis projetées par la façade |
| Quatre moutons Scapegoat | Codes actuels 73915052–73915055 et quatre zones publiques distinctes, malgré les alias natifs |
| Destruction, bannissement et consommation de matériau | Disparition ; aucune entrée Jeton en Cimetière, banni, main, Deck ou Extra Deck |
| Face verso et matériaux Xyz | Book of Moon et l’Invocation Xyz correspondante refusés par le core |
| Restrictions de tribut | Dandylion interdit le tribut durant son tour de création ; Fires exige DARK ; Ojama interdit son utilisation pour une Invocation par Sacrifice |
| Matériaux Link et Synchro | Jetons autorisés selon les restrictions natives ; invocation publique de la procédure effectivement réalisée |
| ATK/DEF et contrôle | Gorz 1800/1800 après 1800 dégâts réels ; Rose Token 2400/2400 équipé ; Change of Heart et Creature Swap déplacent le contrôleur exact |
| Replay après apparition de défenseurs | Scapegoat pendant une attaque directe ; replay offert puis accepté, même identifiant d’attaque, trois survivants et aucune seconde attaque disponible |

Le même scénario étendu donne **4 réussites et 7 échecs avant la correction**, puis **11 réussites et aucun échec après**. Tous les préfixes de messages et de décisions natifs sont identiques. Le seul SHA applicatif différent dans ces deux audits est celui du raccord public. Les preuves contiennent les paquets, décisions typées, requêtes, versions et empreintes des sources.

Les tests ciblés passent : **42/42**, comprenant les 11 scénarios natifs, deux contrôles adversariaux de confidentialité et les suites existantes de projection/invocation publique. Le contrôle de destruction rejoue un paquet après consommation du cache public : aucune seconde destruction ni lecture d’identité supprimée n’en résulte. Des sources inconnues, cachées, non-monstres ou une destination non nulle ne peuvent introduire le nouveau motif de matériau.

Preuves de cette vague : [verification.json](artifacts/token-rules-2026-10-11/verification.json), [native-rules.json](artifacts/token-rules-2026-10-11/native-rules.json), [sortie des tests](artifacts/token-rules-2026-10-11/targeted-tests.txt) et [reproduction avant correction](artifacts/token-rules-2026-10-11/diagnostic-before-public-token-reason-fix/expanded-native-rules.before.json). Les diagnostics initiaux sont conservés séparément avec leur version exacte du script : le premier audit de neuf cas vérifiait les règles et la projection, avant l’ajout des assertions de présentation. Un brouillon intermédiaire attendait un MOVE pour Creature Swap ; le paquet réel est SWAP (55), comme l’atteste le scénario corrigé.

Reproduction :

```sh
node scripts/audit-token-rules-2026-10-11.mjs
node --test --experimental-test-isolation=none --test-reporter=spec test/native-token-rules-2026-10-11.test.js test/native-duel-visual-events.test.js test/native-duel-visual-events-runtime.test.js test/native-summon-visuals.test.js test/public-duel-visuals.test.js
```

Ces fixtures contrôlées prouvent les comportements de règles de cartes historiques ; elles ne constituent pas des Decks de tournoi de 40 cartes conformes à la banlist courante. Cette preuve porte sur le core, la façade et les événements publics. Elle ne revendique aucune capture de duel navigateur, aucune vérification visuelle des modèles 3D et aucune exécution individuelle des 240 cartes Jeton.
