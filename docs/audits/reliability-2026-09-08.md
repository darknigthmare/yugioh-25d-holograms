# Audit fiabilité, sécurité et livraison — 8 septembre 2026

## Périmètre et verdict

Revue ciblée du client catalogue YGOPRODeck, cache navigateur, audio Web Audio,
dépendances npm, CI et configuration de sécurité Vercel. Les règles de duel,
la progression et les écrans sont traités par les autres volets de l'audit.

Les défauts P1 ci-dessous sont corrigés et couverts par des tests comportementaux.
Aucun incident ni exploitation effective n'a été démontré. Ce rapport ne constitue
ni un test d'intrusion complet, ni une certification de commercialisation.

## Défauts corrigés

| Priorité | Constat initial | Correction et preuve |
| --- | --- | --- |
| P1 | Un cache courant pouvait supplanter une carte locale de référence. | Les 45 définitions locales sont prioritaires, y compris pour les passcodes préfixés de zéros. Test avec faux Dragon Blanc à 900 000 ATK. |
| P1 | Les cartes réhydratées depuis le cache conservaient des propriétés arbitraires ; `//hôte` passait le contrôle d'image locale. | Cache v4, identité/date/structure contrôlées, illustration locale imposée et reconstruction par liste de champs. `supportedInStrict` est toujours faux pour les cartes API. |
| P1 | Une recherche normalisait et persistait toute la réponse, même au-delà des 30 cartes affichées. | Limite maximale de 50 résultats ; seule la partie utile est normalisée/persistée ; maximum 150 entrées du namespace catalogue. Aucune suppression de decks ou préférences. |
| P1 | Aucun délai réseau maximal, y compris lors de la lecture du JSON. | Deadline de 8 secondes par défaut, annulation propagée, retrait des listeners/timers, repli local borné. Une annulation volontaire ne réaffiche pas de résultats obsolètes. |
| P1 | Types inattendus ou mauvais identifiant API pouvaient provoquer des erreurs ou renvoyer une autre carte. | Identifiants et métadonnées validés, textes bornés, nombres finis, vérification exacte de l'identité retournée. Cache trop volumineux/corrompu ignoré et retiré. |
| P1 | Absence de périphérique Web Audio ou refus d'autoplay pouvaient casser un gestionnaire d'action ou produire un rejet de promesse non géré. | Audio facultatif, échec silencieux sans bloquer le duel, traitement du refus asynchrone et possibilité de recréer un contexte fermé. |
| P1 | Après un blocage du thread, le séquenceur pouvait tenter de jouer toutes les notes manquées. | Reprise au temps courant ; test simulant une heure de retard, moins de 20 nœuds créés au tick. |
| P2 | Unmute démarrait la musique même sans duel ; arrêt partiel du bourdonnement après une erreur. | Intention musicale préservée séparément de mute ; démontage de tous les nœuds persistants même si `stop()` échoue. |

Le cache v4 invalide uniquement l'accélérateur du catalogue distant. Les decks,
réglages, progression et cartes locales ne sont pas migrés ni effacés.

## Dépendances et chaîne de livraison

Avant correction, `npm audit --json` remontait 2 alertes transitives de développement :

- nanoid 3.3.16, sévérité haute, boucle sur génération personnalisée de taille zéro :
  [avis GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8).
- PostCSS 8.5.20, sévérité modérée, lecture de sourcemaps non sûres dans certaines
  utilisations : [avis GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp).

`npm audit fix --ignore-scripts`, sans `--force`, a mis à jour uniquement PostCSS
vers 8.5.28 et nanoid vers 3.3.18. Vite reste 8.1.5 et Three.js n'a pas changé.
L'audit complet après correction retourne **0 vulnérabilité connue**. Ce résultat
est daté : il ne garantit pas l'absence de vulnérabilités encore inconnues.

CI locale renforcée :

- Node 24 au lieu de Node 20.19.0 ; validation locale sous Node 24.15.0.
- Actions checkout/setup-node v6 épinglées à leurs SHA complets, résolus directement
  sur leurs dépôts officiels par `git ls-remote`.
- Jeton `contents: read` conservé ; `persist-credentials: false` explicite.
- Délai maximal de 15 minutes, annulation des anciennes vérifications de même ref.
- `npm ci`, puis `npm run audit:security` (seuil modéré), puis `npm run check`.

Références : [checkout](https://github.com/actions/checkout),
[setup-node](https://github.com/actions/setup-node),
[versions Node](https://nodejs.org/en/about/previous-releases).
Le workflow modifié n'a pas été exécuté sur GitHub pendant ce volet local : son
résultat distant devra être vérifié après le push.

## Sécurité des données et du déploiement

Les helpers `escapeHtml` et `safeImageUrl` sont conservés et testés : textes rendus
inertes et refus des schémas `javascript:`, `data:text/html`, `file:` et `vbscript:`.
La recherche affiche les noms via `textContent`. Les illustrations API restent
sur le placeholder local ; aucun hotlink vers le CDN de cartes n'est introduit.

Les headers Vercel existants sont conservés et couverts par un contrat de test :
scripts limités à l'origine, aucune exécution inline/eval, objets et framing
interdits, `nosniff`, formulaires/base limités à l'origine et caméra/micro/géolocalisation
désactivés. La connexion API externe est limitée à `db.ygoprodeck.com`.
Les styles inline et les images HTTPS arbitraires restent autorisés pour les
transformations CSS et les images personnalisées déjà proposées par le produit.

Cette vérification porte sur `vercel.json`, pas sur des headers HTTP de la nouvelle
release : la validation du domaine publié appartient à la vérification finale.
La configuration externe Vercel/GitHub n'a pas été modifiée par ce volet.

Aucun nouveau service de télémétrie, compte, backend, paiement, analytics ou collecte
d'identifiants n'a été ajouté. L'API distante reçoit les noms recherchés/passcodes
demandés ; le duel local ne nécessite pas cette API.

## Vérifications réalisées

| Commande | Résultat observé |
| --- | --- |
| `node --test test/reliability-api.test.js test/reliability-audio.test.js test/reliability-release.test.js test/card-assets.test.js test/tcg-conformance.test.js` | 59/59 tests réussis, aucun échec ni skip. |
| `npm run build` | Build production final réussi ; Vite 8.1.5, 45 modules transformés. |
| `npm run audit:security` | 0 vulnérabilité connue, dépendances de développement comprises. |
| `npm audit --json` | Objet `vulnerabilities` vide, 47 dépendances au total dans les métadonnées du lockfile. |
| `npm ls postcss nanoid vite` | Vite 8.1.5 → PostCSS 8.5.28 → nanoid 3.3.18. |
| `git diff --check` | Aucun problème d'espacement détecté. |

24 nouveaux tests : 13 API/sécurité, 8 audio et 3 contrats de livraison. La suite
complète du dépôt doit encore être exécutée dans la validation finale après
intégration des modifications des autres volets. Aucun lint indépendant n'existe
dans le dépôt ; tests et compilation ne sont pas présentés comme un passage ESLint.

## Limites restantes et suivi

- **P2 — Hors ligne :** repli sur le catalogue embarqué et cache de consultation
  exact fonctionnels ; pas de service worker ni garantie de redémarrage complet
  sans réseau. Les recherches distantes attendent au plus la deadline avant repli.
- **P2 — Budget graphique :** lors du build mesuré, le chunk paresseux Vue Réelle
  pèse 586,57 ko minifié / 151,37 ko gzip. L'avertissement > 500 ko reste visible.
  Le chunk principal final pèse 354,52 ko / 95,91 ko gzip. Ces mesures peuvent évoluer
  avec les autres modifications ; pas de garantie FPS/mobile sans mesures navigateur.
- **P2 — Audio :** tests sur doublure Web Audio, pas sur chaque pilote/navigateur.
  Les sons brefs déjà démarrés peuvent terminer leur enveloppe après mute ; pas de
  mixeur de volume général ni de calibration de loudness ajoutés.
- **P2 — Sauvegarde :** aucune garantie de sauvegarde cloud ou de persistance si le
  navigateur efface son stockage ; le nettoyage du cache respecte les autres clés.
- **P2 — Chaîne d'approvisionnement :** audit npm et SHA pinning sont des garde-fous,
  pas une revue manuelle de chaque dépendance. Les SHA CI nécessitent un suivi de
  maintenance ; aucune automatisation externe n'a été créée.
- **Hors périmètre :** backend autoritaire multijoueur, anti-triche distant,
  authentification, comptes, observabilité serveur et validation juridique des droits
  de commercialisation. Le projet reste un fan game non officiel.
