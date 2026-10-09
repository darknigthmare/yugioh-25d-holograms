# TCG Advanced : liste complète et règles de Deck/Match — 8 octobre 2026

La nouvelle validation applique les **222 noms restreints de la liste Advanced officielle courante** : 121 interdits, 94 limités à une copie et 7 semi-limités à deux copies. Les 9 noms récemment revenus à trois copies sont également vérifiés. Chaque limite se compte dans **Main + Extra + Side ensemble**, y compris illustrations alternatives et noms permanents du CDB de confiance.

Ce périmètre concerne la construction du Deck, la disponibilité du catalogue et le déroulement du Match. Il ne certifie pas à lui seul toutes les interactions entre cartes pendant un Duel. Ces interactions sont exécutées et vérifiées dans les autres audits du moteur natif.

## Sources et reproduction

- [Liste officielle effective le 21 septembre 2026](https://www.yugioh-card.com/en/limited/list_2026-09-21/) : HTML réellement reçu, 65 695 octets ; digest et date de récupération UTC dans [sources.json](artifacts/tcg-complete-2026-10-08/sources.json). Les noms ont été résolus après normalisation de casse Unicode et des espaces, sans utiliser les valeurs de banlist d'un fournisseur.
- [Règles de construction Konami](https://www.yugioh-card.com/en/limited/) et [livret officiel v10](https://www.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf) : Main 40–60, Extra 0–15, Side 0–15, conservation des effectifs lors des échanges.
- [Politique KDE-E v2.5](https://img.yugioh-card.com/eu/wp-content/uploads/2025/09/Official-KDE-E-Yu-Gi-Oh-TRADING-CARD-GAME-Tournament-Policy-Version-2.5.pdf), pages imprimées 30, 44, 49–54 : choix du premier joueur, échanges du Side, publication territoriale et Match Swiss. PDF reçu le 8 octobre 2026 à 21:49 UTC, SHA-256 `01b419dde56ac142c5f290758e5a48a443c50e309ba1486cb6ce34aeb95a175c`.
- CDB inchangé, commit BabelCDB `fdf92aea31033cd6c44afa89987c5e00665205e2` : identités physiques, alias permanents, classification Main/Extra et indicateurs régionaux. L'indicateur TCG demeure une preuve du relevé fournisseur ; il n'établit pas la publication européenne de chaque promotion.

Le script `python scripts/generate-tcg-complete-format.py` reconstruit le module à partir du [HTML archivé](artifacts/tcg-complete-2026-10-08/official-advanced-list.html.txt), vérifie son digest et résout les **231 lignes officielles sans aucun nom manquant**. Le [résultat résolu](artifacts/tcg-complete-2026-10-08/resolved-advanced-list.json) conserve chaque nom, statut, code physique et date effective. Les 453 liaisons de codes proviennent uniquement du CDB et des quatre liaisons canoniques déjà auditées.

Mind Master et Elder Entity Norden reviennent à trois copies le **28 septembre**, malgré la date générale du 21 septembre. Une politique datée du 27 septembre les rejette encore ; cette correction est exécutée dans la validation Match et dans le builder, pas seulement affichée.

## Corrections exécutables

`MatchEngine` remplace son ancien sous-ensemble de sept restrictions par la liste courante complète. Les noms ou propriétés `nativeAlias` fournis par un objet de Deck ne peuvent pas modifier une limite. Les passcodes numériques, imprimés avec zéros, entourés d'espaces et les illustrations alternatives ont la même identité. Un identifiant de format ou de banlist inconnu produit désormais une erreur de validation au lieu d'une liste silencieusement libre.

La politique `createTcgFormatPolicy(resources)` utilise les Maps CDB préchargées. Elle sépare disponibilité régionale et restriction de copies, vérifie la classification de confiance et rejette les cartes OCG, prépublications non confirmées, Tokens, Skills et cartes hors format. Une publication officielle datée d'un Terrain peut remplacer l'indicateur régional du fournisseur. Le **8 octobre**, Angelechy Endgame Problem devient ainsi admissible en Europe selon sa publication officielle conservée dans le projet.

Sur les **14 355 entrées canoniques consultables** du catalogue natif, **13 847** satisfont cette politique de publication ; **508** sont exclues (486 sans sortie TCG confirmée, 6 Terrains OCG, 16 prépublications inconnues). Ce nombre inclut les cartes interdites consultables : leur ajout au Deck reste refusé par la liste Advanced. Le mode Duel libre conserve ses trois copies et son accès aux cartes natives hors TCG.

Le builder strict accepte maintenant le prédicat du catalogue complet associé à cette politique. Le Match utilise la même résolution lors de l'enregistrement, du Side et de la restauration. Les masques de Race natifs sur 64 bits deviennent des chaînes décimales dans la sauvegarde JSON ; le moteur du Duel retrouve les données CDB exactes par passcode.

Les échanges du Side préservent les tailles exactes des trois sections et le pool physique enregistré. Ils refusent aussi une modification de nom, texte, statistiques, classification ou métadonnées. Les coordonnées et identifiants d'instance de présentation ne changent pas la définition d'une carte. Un refus laisse les Decks, le Side en préparation et le choix du premier joueur intacts.

Le premier à deux victoires reste le Match normal : un Duel nul ne compte pas comme victoire et peut mener à un quatrième Duel. Après un nul, une nouvelle méthode aléatoire attribue le choix ; après une défaite, le perdant décide. La nouvelle méthode `rematch({firstPlayerId, initialDecisionPlayerId})` exige une décision fraîche, restaure les Decks originaux et remet le score à zéro sous la liste courante. Les sauvegardes de l'ancien relevé local de mai gardent leur banlist historique pendant le Match enregistré.

## Match Swiss optionnel

`startMatch({tournamentPolicy:'TCG_EU_SWISS',timeLimitMinutes:50})` active explicitement la politique Swiss de la source KDE-E reçue. `controller.endMatchAtTime()` termine un Match inachevé en **double défaite**, sans ajouter un faux Duel ni une victoire et sans modifier les résultats antérieurs. La restauration valide ce résultat, y compris lorsque la dernière manche est interrompue.

Le view model expose `completionReason:'time_limit'`, `isDoubleLoss:true`, `winnerId:null`, `isDrawnMatch:false` et `timeLimitMinutes:50`. Un Match sans cette option reste sans limite. L'expiration ne peut pas réécrire un résultat terminé. La source courante impose l'arrêt des actions à l'expiration ; elle ne décrit pas une fin de phase ou un décompte de tours supplémentaires. Le compteur et les interactions de l'application sont intégrés et vérifiés séparément par le chantier principal.

## Vérification

Le [rapport exécutable](artifacts/tcg-complete-2026-10-08/report.json) est produit par `node scripts/audit-tcg-complete-format.mjs` :

- **231 lignes officielles** : limite autorisée acceptée, copie supplémentaire rejetée entre les sections, accord builder/Match et alias vérifiés.
- **14 parcours de Match et validation** : CDB réel, Side Main/Extra, mutation refusée, restauration, choix du perdant, nouveau tirage après nul, quatrième Duel, rematch, deux expirations Swiss et garde du relevé régional lors de la restauration.
- **8 reproductions avant/après** : Maxx « C », Apollousa, Mystic Mine, Summon Sorceress, Reinforcement of the Army, Terraforming, Solemn Judgment et Droll & Lock Bird. Le validateur exact de la version précédente accepte trop de copies ; la nouvelle version refuse.
- Les **3 presets** (Main, Extra et Side) et les **24 Decks de campagne** passent la liste complète, sans remplacement.
- **281 tests ciblés réussis**, zéro échec, zéro test ignoré ; [commande et digest du journal](artifacts/tcg-complete-2026-10-08/targeted-tests.json). Il s'agit de tests de registration et de Match utilisant les cartes réelles du catalogue, distincts des Duels WASM et des preuves navigateur.
- CDB, scripts Lua, manifest natif, banlist historique des Terrains et règles de nom Umi **byte-identiques** à la version de départ ; les digests sont dans le rapport.

Les règles d'événement physique portant sur les pochettes, cartes marquées, documents de traduction, présence et décisions du juge nécessitent un organisateur et ne sont pas des actions du simulateur. La légalité territoriale des anciennes promotions dépourvues de date officielle reste une limite explicitement signalée du relevé fournisseur.
