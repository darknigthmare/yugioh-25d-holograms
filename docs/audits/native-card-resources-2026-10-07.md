# Ressources du moteur natif — 7 octobre 2026

L’archive locale contient **14 984 lignes de cartes amont**, **13 541 scripts de cartes officiels**, **135 scripts de prépublication** et **26 helpers Lua**. Les lignes viennent des bases TCG/OCG officielles, `release-*.cdb` et `prerelease-*.cdb`, hors Rush Duel, Speed Duel, anime et cartes non officielles. Le helper `unofficial/proc_unofficial.lua` est conservé parce que `utility.lua` le charge systématiquement. Aucun script de carte non officielle n’est ajouté.

Les ressources couvrent les **339 identités du catalogue de Terrains** et les **80 cartes du pool strict précédent**, ainsi que leurs partenaires et jetons présents dans ces bases. Cette couverture signifie données et sources archivées ; elle ne prouve pas l’exécution des effets et ne modifie aucune liste de cartes jouables. Les essais du moteur natif et les gates de l’interface sont séparés.

## Provenance et intégrité

- CardScripts : [ProjectIgnis/CardScripts, commit `37f270dc813a12d123707ae255f2bda7922999c4`](https://github.com/ProjectIgnis/CardScripts/tree/37f270dc813a12d123707ae255f2bda7922999c4).
- Bases : [ProjectIgnis/BabelCDB, commit `fdf92aea31033cd6c44afa89987c5e00665205e2`](https://github.com/ProjectIgnis/BabelCDB/tree/fdf92aea31033cd6c44afa89987c5e00665205e2).
- Le [manifeste servi](../../public/native/manifest.json) contient les commits, les SHA-256 et tailles des bases originales ainsi que les SHA-256 et tailles des archives JSON produites. [scripts.json](../../public/native/scripts.json) conserve le chemin, l’empreinte et la taille de chaque Lua. Les textes Lua sont copiés sans modification de leurs bytes UTF-8 après décodage JSON ; les commentaires et crédits individuels restent présents.
- Les noms, descriptions, seize libellés de choix et colonnes numériques proviennent directement de CDB. Les champs 64 bits `setcode` et `race` sont transportés comme chaînes décimales pour éviter la perte de précision JSON. Le loader restitue la race en `BigInt` et les archetypes en segments de 16 bits. Les niveaux et échelles Pendule sont extraits du niveau compacté ; les marqueurs Lien viennent du champ CDB `def`.

Deux noms anglais divergent entre CDB et le catalogue visuel : `2906939` porte `Ashtrashen - Gateway to the Worlds Beyond` chez Project Ignis et `Ashtrashen - Gate to the Worlds Beyond` dans le catalogue ; `39513225` porte `Seventh Barian's` chez Project Ignis et `Barian's Seventh Untopia` dans le catalogue. Le rapprochement se fait par passcode et les noms CDB restent tels quels dans les métadonnées natives.

## Quatre identités encore provisoires chez Project Ignis

**335 références possèdent leur passcode canonique dans la base et leur script officiel.** Les quatre autres références ont un passcode canonique dans le catalogue, mais Project Ignis conserve encore un code provisoire dans ce snapshot. Les correspondances sont explicites :

| Passcode canonique | Code natif amont | Nom CDB exact | Base | Script |
| --- | --- | --- | --- | --- |
| 12845564 | 101402095 | Angelechy Endgame Problem | prerelease-betb-en.cdb | pre-release/c101402095.lua |
| 46273941 | 100458006 | Pere-Zenet Em Heru | prerelease-dbgv.cdb | pre-release/c100458006.lua |
| 88288421 | 100459016 | Field Power Bonus | prerelease-yac1.cdb | pre-release/c100459016.lua |
| 33700664 | 100458039 | Trirealm Rift Territory - Valvols | prerelease-dbgv.cdb | pre-release/c100458039.lua |

`canonicalToNative` / `canonicalCodeToSource` et leurs maps inverses relient ces codes. Le lookup canonique pointe vers la même donnée que le lookup amont : `OcgCardData.code` et `alias` conservent leurs valeurs CDB. Le moteur insère le code amont ; l’interface peut projeter le passcode canonique par la map inverse. Les métadonnées conservent les deux identités. **Aucun alias CDB n’est inventé et aucun script n’est renommé ou réécrit.** Le véritable alias Umi de A Legendary Ocean reste `22702055`.

Les anciens noms anglais des commentaires de certains scripts restent inchangés : `Beresennet Em Heru` et `Xenovader△ Territory - Valvols`. Le nom CDB utilisé pour le rapprochement est celui de la table. Un script en prépublication ne constitue pas une attestation de sortie TCG/OCG ni une certification de conformité de toutes ses branches.

## Chargement et listes de restrictions

[NativeCardData.js](../../src/core/native/NativeCardData.js) exporte `loadNativeCardResources()` asynchrone. Il charge localement `card-data.json`, `scripts.json`, `manifest.json` et `field-banlists.json`, puis retourne les Maps `cards`, `scripts`, `metadata`, les correspondances de codes et `fieldBanlists`. Le chargement par défaut est partagé et une erreur réseau permet une nouvelle tentative. Les sources couvrent aussi les cartes créées et recherchées pendant le duel ; elles ne dépendent pas de l’API YGOPRODeck à l’exécution.

Les statuts TCG/OCG des 339 Terrains viennent du [relevé des listes du 7 octobre](artifacts/field-banlists-2026-10-07.json). La copie servie conserve dates, sources, noms et limites. `metadata.get(passcode).banlist` expose la même entrée. L’absence de restriction **ne prouve pas** la sortie régionale ou l’admissibilité d’un tournoi ; l’interface décide séparément du format actif.

## Licences et reproduction

CardScripts annonce **AGPL-3.0-or-later**, copyright des contributeurs Project Ignis. Le [texte COPYING exact](../../public/native/COPYING.CardScripts.txt) et [README original](../../public/native/CardScripts.README.md) sont servis avec les sources. Les liens des commits donnent accès aux Lua d’origine et à leur historique. Les éventuelles obligations de distribution de l’application et du moteur compilé sont traitées dans l’audit de publication ; cette archive ne revendique aucune exception.

BabelCDB ne contient **aucune déclaration de licence trouvée** dans son snapshot. Son [README original](../../public/native/BabelCDB.README.md), sa provenance et les empreintes des bases sont conservés. Cette absence n’est pas présentée comme une permission générale de redistribution des textes ou données ; l’audit de publication reste distinct.

Télécharger les deux tarballs des commits ci-dessus, les extraire puis exécuter :

```sh
python3 scripts/generate-native-card-resources.py \
  --scripts-dir /path/to/CardScripts-37f270dc813a12d123707ae255f2bda7922999c4 \
  --database-dir /path/to/BabelCDB-fdf92aea31033cd6c44afa89987c5e00665205e2
node --test test/native-card-resources.test.js
```

Le générateur exige les racines des tarballs aux commits indiqués, ou le même `HEAD` d’un checkout Git. Il refuse les collisions de données ou scripts, les dépendances Lua nommées absentes, une identité canonique sans données/script et un rapprochement de noms différent pour les quatre correspondances provisoires. Le test vérifie les SHA-256 de toutes les sources archivées, les 339 références, les 80 cartes précédentes, les quatre correspondances, la précision 64 bits, les échelles Pendule et marqueurs Lien, les libellés de choix, les listes et le chargement local.

Validation ciblée exécutée : `node --test test/native-card-resources.test.js` passe. La reproduction du générateur conserve les empreintes des quatre archives JSON à l’identique.

## Cadres de carte locaux

Les **339 Terrains disposent aussi de leur JPEG de carte complet** dans `public/cards/small/<passcode-canonique>.jpg`. **316 cadres ont été téléchargés**, tous avec HTTP 200 et Content-Type `image/jpeg`, et **23 images locales précédentes ont été conservées**. Six des 29 Terrains du pool précédent n’avaient pas encore ce fichier local ; ils font partie des 316 compléments. Taille totale des 339 JPEG : **9 298 756 octets**.

Le [relevé des cadres](artifacts/native-field-small-assets-2026-10-07.json) contient les URL sources `https://images.ygoprodeck.com/images/cards_small/<passcode>.jpg`, SHA-256, tailles et dimensions, avec distinction entre nouvelle réponse HTTP et fichier déjà local. Les 23 images antérieures sont validées localement sans prétendre à une comparaison réseau fraîche. Le [script d’archivage](../../scripts/archive-native-field-small-assets.py) utilise au maximum quatre requêtes en parallèle, le proxy de session et TLS vérifié, contrôle le JPEG par décodage complet puis écrit atomiquement les bytes sources. Il ne remplace pas de fichier présent. Aucun recadrage, redimensionnement, filtre ou remplacement d’image n’est appliqué.

Les quatre codes de prépublication du moteur ne sont pas utilisés pour les illustrations : noms de fichiers et URL gardent les **passcodes canoniques imprimés**. Aucun nouveau `cards/cropped` n’est téléchargé ; les 339 JPEG d’illustrations originales déjà conservés dans `environments/field-art` restent disponibles pour ce rendu.

Validation ciblée exécutée : `node --test test/native-field-small-assets.test.js` contrôle les 339 identités, tous les hashes et dimensions, l’unicité des cadres et la provenance des 316 nouvelles réponses. Aucun échec de téléchargement n’est enregistré.

## Bibliothèque native et validation du constructeur

[NativeCardRegistry.js](../../src/core/native/NativeCardRegistry.js) ajoute une bibliothèque statique de **390 cartes** : les 80 identités précédentes et les 310 Terrains supplémentaires, soit 385 cartes Main et cinq cartes Extra. Les 339 templates de Terrain utilisent le texte anglais exact du snapshot, les images locales, les flags et véritables alias CDB et les codes de scripts natifs. Les templates sont compatibles avec `CardState`. Les noms français déjà présents sont conservés pour les 29 Terrains précédents ; les autres noms anglais ne sont pas présentés comme des traductions officielles. `STARTER_CARDS` et `STRICT_CARD_REGISTRY` conservent leur pool de 80 cartes.

Le [petit index généré](../../src/core/native/NativeCardRegistryData.js) distingue les formats et dates déclarés par le fournisseur, l’OT CDB, les correspondances de scripts et les preuves de publication Konami disponibles pour les trois ajouts du catalogue. Il permet l’édition du Deck avant le chargement de l’archive Lua. L’index n’invente aucune date manquante et ne transforme pas une ligne de restriction en preuve de sortie.

[DeckBuilderRules.js](../../src/ui/DeckBuilderRules.js) garde ses paramètres précédents et accepte une option supplémentaire : `getDeckBuilderCopyLimit(card, mode, options)`, `canAddDeckBuilderCard(deck, card, section, mode, options)` et `validateCustomDeck(deck, mode, options)`. En `strict` avec `{native:true, format:'TCG'}`, il valide la bibliothèque native, les restrictions de Terrain complètes et les restrictions antérieures des autres cartes. Les cinq noms toujours traités comme Umi partagent leur limite dans Main, Extra et Side. Le relevé du 7 octobre bloque cinq sorties TCG futures (`12845564`, `2906939`, `38391684`, `39513225`, `4663194`) et six Terrains sans sortie TCG dans les éléments disponibles (`88288421`, `46273941`, `60600821`, `7293697`, `33700664`, `32353566`). Les raisons indiquent la preuve primaire ou le snapshot fournisseur ; ces formats historiques ne constituent pas une certification universelle de tournoi.

Le mode `native` (**Duel libre**) permet les 339 Terrains, sans liste de restrictions, avec trois copies combinées par nom et les tailles normales **Main 40–60, Extra 0–15, Side 0–15**. L’option `isSupportedCard(card, expectedSection)` peut étendre ce mode aux partenaires du catalogue CDB chargé, par un prédicat vérifiant les données réellement présentes et leur classification. Elle est ignorée en mode strict. Une simple propriété `supportedInNative` sur une carte inconnue ne l’ajoute pas à la bibliothèque. Les contrôles de sections et de copies s’appliquent aussi à toutes les cartes admises par le prédicat.

L’option `getCopyIdentity(card)` s’applique également uniquement au mode `native`. L’interface lui fournit l’identité dérivée des données CDB chargées (`alias` véritable ou code, avec normalisation des correspondances canoniques). Elle regroupe les noms permanents et les illustrations alternatives pendant l’ajout et la validation, dans Main, Extra et Side. Deux Harpie Lady 1 et deux Harpie Lady 2 sont refusées pour quatre copies du même nom ; les variantes d’illustration de Dark Magician partagent également leur plafond de trois. Les règles legacy et strict continuent d’utiliser leur helper Umi existant.

Validation ciblée exécutée : `node --test test/native-card-registry.test.js test/deck-builder-rules.test.js test/strict-card-registry.test.js test/native-card-resources.test.js` passe. Les cas couvrent la séparation des bibliothèques, les 339 flags archivés, les limites Forbidden/Limited/Semi-Limited, Umi, les sorties futures et OCG, les tailles de Deck, ainsi que l’extension de Duel libre avec un partenaire réellement présent dans CDB.
