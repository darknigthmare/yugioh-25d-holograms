# Choix indépendant de l’emplacement — 11 octobre 2026

Le clic d’invocation conservait son emplacement jusqu’au prochain menu de
commande. Une invocation spéciale résolue entre-temps pouvait alors utiliser
ce même emplacement sans demander le choix du joueur. La façade consomme
désormais ce souhait au premier `SELECT_PLACE` pertinent, même si le moteur
refuse l’emplacement initial.

Les deux reproductions exécutent le vrai WASM et les scripts Lua locaux. Le
terrain initial est déclaré avec `addCard` avant `start`, sans injection après
le démarrage, script ajouté, drapeau `TEST_MODE` ou `PSEUDO_SHUFFLE`. Les petites
piles de cartes et le tirage désactivé servent à isoler cette interaction ;
elles ne constituent pas des Decks homologués pour un tournoi.

| Cas | Chaîne exécutée | Avant | Après |
| --- | --- | --- | --- |
| Souhait initial valide | Robot Synchronique invoqué en zone 0 ; son effet cible Magicien de la Foi ; Dispositif d’Évacuation Obligatoire renvoie Robot en main | Magicien revient silencieusement en zone 0 ; aucune question d’emplacement | Une question indépendante ; Magicien revient en zone 4 choisie par le joueur |
| Souhait initial refusé | Dragon Blanc occupe la zone 0 ; Robot doit être placé en zone 1 ; Dispositif renvoie Dragon en main | Le souhait refusé réapparaît : Magicien revient en zone 0 ; une question au total | Le souhait est consommé dès son refus ; deux questions indépendantes, Robot en zone 1 et Magicien en zone 4 |

Les traces conservent les messages natifs et les décisions. Dans les deux cas,
les Points de Vie restent à 8000 pour chaque joueur et aucun résultat de Duel
n’est produit. Les contrôles rejettent tout `RETRY` ou erreur Lua. Le moteur
demande deux emplacements dans chaque scénario ; seule la première réponse
valide peut provenir du clic initial.

Pour reproduire les résultats corrigés depuis la racine du dépôt :

```sh
node docs/audits/artifacts/native-placement-consent-2026-10-11/reproduce.mjs
```

Le programme vérifie les mêmes assertions que les deux nouvelles régressions
et régénère uniquement `valid-intent-after.json`, `rejected-intent-after.json`
et `summary.json` dans ce dossier. Les captures `*-before.json` viennent de
l’exécution réelle du code de base `ac18389`. La copie complète de cette façade
est conservée dans `NativeDuelGame-before.js.txt` ; ses empreintes sont dans le
résumé. Les métadonnées des captures décrivent explicitement le plateau initial.

Vérification ciblée exécutée avec succès :

```sh
node --test tests/native-command-placement-consent.test.mjs tests/native-duel-game.test.mjs tests/native-duel-continuation-gameplay.test.mjs tests/native-duel-summoning.test.mjs
```

Les quatre fichiers passent, dont les deux nouveaux cas de cette correction.
Le résumé enregistre les SHA-256 de la façade, des régressions, du WASM, des
données de cartes, de l’archive Lua et du manifeste. Aucun de ces trois actifs
natifs n’a été modifié. Cette preuve couvre cette interaction de placement ;
elle ne certifie pas toutes les combinaisons du catalogue.
