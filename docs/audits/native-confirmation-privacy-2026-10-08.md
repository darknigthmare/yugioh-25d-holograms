# Destinataires des confirmations natives — 8 octobre 2026

La revue indépendante a reproduit une fuite dans `CONFIRM_CARDS` : l'effet de Morphtronic Smartfon en Défense permet de consulter son propre Deck, mais le traducteur annonçait les cartes à l'autre joueur comme révélations publiques. Le cas Diabolos confirme que la même question existe lors d'une inspection du Deck adverse ; la propriété de la carte ne suffit donc pas à déterminer son audience.

Le correctif est limité au bloc `CONFIRM_CARDS` de [NativeDuelVisualEvents.js](../../src/core/native/NativeDuelVisualEvents.js). Il conserve les résultats décidés par le core et les archives Lua/CDB/WASM originales.

## Contrat corrigé

Par défaut, `message.player` désigne le seul destinataire. Le contrôle précède les lectures de métadonnées et les queries. Le destinataire reçoit un événement `inspect` avec `private: true`, `audienceController`, `nativeAudienceConfirmed: true`, `publicReveal: false` et un `inspectionGroupId` partagé par les cartes du même message. Le descripteur contient l'identité imprimée consultable, sans requête de statistiques. Aucun cache public et aucun log de nom n'est alimenté. L'autre projection ne lit aucune identité et ne reçoit aucun de ces événements.

Une politique de présentation explicitement autorisée par `isPublicReveal(message, location) === true` peut produire un vrai `reveal` public. Les tests l'appliquent exclusivement aux chaînes de Gaia et Duel Tower dont les textes officiels archivés autorisent la révélation. Cette politique est déclarée comme politique d'audit ; le défaut de production reste l'inspection réservée au destinataire. `CONFIRM_DECKTOP` et `CONFIRM_EXTRATOP` conservent leur traitement précédent.

Les événements `inspect` sont rejetés par `createPublicCombatVisual`. Leur présentation locale privée appartient au module UI dédié ; elle ne doit pas passer par le rendu public ou le suivi de campagne, ni fabriquer une réponse du core.

## Preuves avant/après sur le vrai core

Le [runner indépendant](../../scripts/audit-native-confirmation-privacy.mjs) produit [10 scénarios natifs](artifacts/native-confirmation-privacy-2026-10-08.json), chacun projeté pour les deux contrôleurs selon trois variantes : traducteur avant correction, défaut corrigé, politique publique explicitement autorisée. Les fixtures sont déclarées avant `start()` ; tous les coûts, Invocations, dés, révélations et résultats proviennent du WASM.

| Cas, pour les contrôleurs 0 et 1 | Résultat vérifié |
| --- | --- |
| Smartfon réellement invoqué en Défense en bannissant Celfon | Le snapshot avant publie les cartes de son propre Deck auprès de l'autre projection. Après correction, seul le destinataire obtient l'inspection ; zéro lookup/query sur l'autre projection et aucun log de nom. Le contrôleur 1 obtient un vrai résultat de dé de 6 et six cartes regroupées sous un seul ID d'inspection. |
| Diabolos réellement invoqué avec deux Sacrifices TÉNÈBRES | Son vrai effet avant la pioche consulte le dessus du Deck adverse. La correction suit le destinataire, même lorsqu'il n'est pas le propriétaire du Deck. Le propriétaire exclu ne reçoit pas de révélation de son dessus de Deck. |
| Smartfon réellement invoqué en Attaque | L'excavation publique reste un `CONFIRM_DECKTOP` et reste visible pour les deux projections. Le dé natif reste inchangé et les révélations avant/après correspondent. |
| Galloping Gaia, coût de révélation puis recherche | Le coût et l'ajout sont exécutés normalement. Par défaut, le destinataire obtient les deux confirmations privées. Avec la politique publique explicite liée à la chaîne officielle, les deux projections conservent les deux véritables révélations. |
| Duel Tower, Terrain contrôlé alternativement par 0 et 1 | Les choix privés, confirmations, bannissements face verso et Invocation légale du gagnant sont décidés par le core. Chaque projection reçoit sa confirmation adressée ; la politique publique explicite permet les deux révélations. Les mouvements vers le bannissement face verso restent anonymes et l'Invocation réussie reste annoncée. |

Les trois tests complémentaires vérifient une audience invalide sans lecture d'identité, l'absence de cache public après inspection et une politique publique explicitement fausse. Résultat : **10/10 scénarios, 13/13 tests**, sans `RETRY` ni diagnostic Lua.

```sh
node scripts/audit-native-confirmation-privacy.mjs
node --test --test-isolation=none tests/native-confirmation-privacy.test.mjs
```

## Provenance et limites

Le [snapshot avant correction](artifacts/native-confirmation-privacy-before-2026-10-08.js.txt) possède le SHA-256 `6f8848708ce939600357f8d48f768fc9d3aaac76fe82ce26f68b05d67dbdc8dc`. Son adaptation d'import pour le comparatif ne modifie pas le corps du traducteur et possède sa propre empreinte. Le corps actuel ne diffère de ce snapshot que dans le bloc de confirmation.

La preuve conserve les textes complets du CDB livré, leur origine et leur SHA-256, les empreintes originales/effectives des scripts de Smartfon, Diabolos, Gaia et Duel Tower, les scripts de chaque fixture et les dépendances de présentation/exécution. La correction Lua locale de Duel Tower demeure celle déjà documentée ; cette tâche n'en ajoute aucune. L'archive officielle, les données de cartes et le WASM sont vérifiés contre leurs empreintes de référence.

Ce correctif certifie l'audience des confirmations et leur séparation du rendu public. Il n'ajoute aucune règle de carte en JavaScript et ne constitue pas une certification de toutes les inspections possibles ni de toute l'interface navigateur. L'intégration UI privée et le manifeste final de la vague possèdent leurs propres contrôles.
