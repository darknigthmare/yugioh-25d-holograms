# Initialisation du catalogue TCG complet dans le vrai cœur

Les **13 847 identifiants du catalogue TCG consultable** ont été initialisés séparément dans le cœur WASM : **13 847 réussites, zéro diagnostic Lua, zéro `RETRY`**. Le [rapport compact complet](artifacts/tcg-catalogue-initialization-2026-10-08.json) contient un résultat pour chaque carte, son type, sa section de Deck, sa requête native, ses messages et les sources Lua consultées. Le temps mesuré est de **223,75 secondes**.

Ce contrôle mesure la compatibilité d'initialisation, notamment l'enregistrement natif des effets. Il ne joue pas chaque branche d'effet de chaque carte. Dans le [core épinglé](https://github.com/edo9300/ygopro-core/blob/38d04c9feb1a26617407091380634c87262fe3f8/interpreter.cpp#L145-L159), `register_card` appelle `initial_effect` ; cet appel est obligatoire pour les cartes non-Normales et les Pendules. Le fichier `interpreter.cpp` extrait de l'archive publique possède SHA-256 `6c56fb5872d482312ad2b4972ab62a90107a2be33be222f178185604096589cd`.

Le catalogue vient des fonctions publiques `createNativeTcgCardTemplate` et `getNativeTcgCardCatalogueCount`. Tous les identifiants canoniques admissibles sont dédupliqués ; le nombre mesuré doit correspondre exactement au compteur de la façade. Les cartes interdites restent consultables et sont donc initialisées dans cet audit. Leur ajout à un Deck de tournoi reste refusé séparément par la politique TCG.

## Conditions de mesure

Un seul WASM est créé. Chaque carte reçoit ensuite son propre handle de Duel et son propre état Lua, avec les helpers habituels chargés, les drapeaux TCG modernes et la graine `[1n, 2n, 3n, 4n]`. Tous les handles sont détruits après leur requête. Le handle de préparation du lecteur est également détruit.

Une seule carte est déclarée **avant** `start()` dans son Main Deck ou son Extra Deck approprié. Les deux équipes commencent avec zéro carte tirée et zéro pioche normale. Après traitement natif, la requête `CODE | TYPE | POSITION` doit retrouver le code source et le type attendus. Aucune carte ni commande de debug n'est injectée après le démarrage. Les diagnostics restent intacts et font échouer la mesure. Les onze sources contrôlées avant et après le balayage, dont le runtime, le catalogue, les règles de format, le driver et les archives, possèdent exactement les mêmes octets.

Le [test négatif](../../tests/tcg-catalogue-initialization.test.mjs) retire volontairement le lecteur Lua d'Ash Blossom & Joyous Spring pour un Duel isolé : le vrai cœur signale l'absence du script et le probe refuse la carte. Les archives publiques restent inchangées. Ce test évite qu'un probe qui se contente de lire les statistiques annonce à tort une compatibilité Lua.

## Fenêtres natives avant le premier choix de Main Phase

La [première passe intégrale](artifacts/tcg-catalogue-initialization-2026-10-08/initial-empty-chain-window/report.json) conservée contenait déjà zéro diagnostic Lua et zéro `RETRY`. Son premier driver exigeait cependant que le tout premier choix soit `SELECT_IDLECMD`. **Black Luster Soldier – Legendary Swordsman, 70551291**, ouvrait une fenêtre `SELECT_CHAIN` vide et facultative ; cette attente trop stricte du driver classait donc un prompt légal comme un échec.

Le probe corrigé décline uniquement une chaîne réellement vide avec `forced:false`, par la réponse typée `{ type: SELECT_CHAIN, index: null }`. Pour 70551291, le cœur émet deux fenêtres de ce type, joueurs 0 puis 1, avant son vrai `SELECT_IDLECMD`. Le rapport final contient les deux prompts et réponses. Un choix non vide, forcé ou d'un autre type n'est pas automatiquement accepté par ce probe. Les diagnostics et erreurs conservent leur effet bloquant.

Après cette correction du driver, **la totalité des 13 847 cartes a été rejouée**, et non simplement la carte 70551291. Le [driver initial archivé](artifacts/tcg-catalogue-initialization-2026-10-08/initial-empty-chain-window/audit-driver-before.mjs.txt) correspond exactement à son empreinte dans le premier rapport. L'[échantillon initial de 100 cartes réparties dans le catalogue](artifacts/tcg-catalogue-initialization-2026-10-08-sample-100.json), exécuté avant les deux balayages complets, reste conservé comme mesure de durée et de compatibilité préliminaire.

## Preuves compactes et reproductibilité

Les sources des 27 premiers helpers sont identiques dans toutes les lignes. La [sérialisation](../../scripts/compact-tcg-catalogue-initialization.mjs) conserve leur préfixe partagé puis les indices des lectures supplémentaires, avec un dictionnaire de **13 874 références de scripts**. Elle ne supprime aucune ligne, requête, réponse, empreinte ni diagnostic. Une expansion vérifie que le JSON original est restauré **octet pour octet**, soit **77 099 307 octets** et SHA-256 `81124a85379b6ad4e05b419f9d11c430fb3856f1bb822dff5dc64a178451c6a4`.

Le [JSON brut compressé exact](artifacts/tcg-catalogue-initialization-2026-10-08-raw.json.gz) reste disponible : **1 901 843 octets**, SHA-256 `4178b786852363374c181adf663d887ee11ed235829aa69eaac9045d70ca0d57`. Le JSON compact est simplement une présentation plus petite des mêmes observations. Le driver de mesure est resté figé pendant les deux exécutions ; la compaction intervient après leur achèvement.

Les archives Lua et CDB, le core et le WASM sont inchangés. Le lecteur effectif inclut le correctif de Duel Tower déjà approuvé avant ce chantier : `c43940008.lua` effectif possède SHA-256 `32bfc7a639718a0f1631dd6eec0ee9018334e7273aeabb09065d5e0eb213a11e`. L'archive originale reste intacte ; ce rapport n'introduit aucun nouveau remplacement de script de carte.

Pour reproduire la mesure puis sa présentation compacte :

```bash
node scripts/audit-tcg-catalogue-initialization.mjs
node scripts/compact-tcg-catalogue-initialization.mjs --input=docs/audits/artifacts/tcg-catalogue-initialization-2026-10-08.json --output=docs/audits/artifacts/tcg-catalogue-initialization-2026-10-08.json
```

Les [huit tests ciblés du probe](artifacts/tcg-catalogue-initialization-2026-10-08/targeted-tests.txt) passent : cinq catégories de cartes, les fenêtres natives de 70551291, l'échec Lua réel attendu et la compaction sans perte d'un rapport réel. Les [70 scénarios d'Invocation](tcg-summoning-complete-2026-10-08.md) restent une preuve distincte d'effets et procédures effectivement joués.

Cette mesure porte sur le snapshot TCG actuel du projet. Un Deck d'une seule carte avec pioche désactivée est une sonde de compatibilité, pas un Deck de tournoi valide. Les éventuelles différences territoriales de publication déjà documentées dans la politique de format, les branches d'effets non jouées et les captures de l'application restent hors de cette preuve d'initialisation.
