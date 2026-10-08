# Catalogue des Terrains vérifié le 7 octobre 2026

Le catalogue visuel contient désormais **339 références canoniques**, contre 336 dans le relevé du 29 juillet. L’API YGOPRODeck renvoie 342 fiches uniques : trois emploient encore des identifiants provisoires à neuf chiffres et restent exclues des identités utilisées à l’exécution. Aucun retrait, doublon d’identifiant ou Terrain Rush Duel n’a été trouvé dans cette réponse.

| Passcode | Nouvelle référence | Source primaire | Publication |
|---|---|---|---|
| 12845564 | Angelechy Endgame Problem | [Konami, CID 23527](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=23527&request_locale=en) | Annoncée : Europe le 8 octobre, base anglaise et légalité tournoi nord-américaine le 9 octobre |
| 33700664 | Trirealm Rift Territory - Valvols | [Konami, CID 23563](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=23563&request_locale=ja) | OCG, 5 septembre 2026 |
| 88288421 | Field Power Bonus / 環境適応力 | [Konami, CID 23580](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=23580&request_locale=ja) | OCG, 26 septembre 2026 |

La date européenne est donnée par le [produit officiel Beyond the Brave](https://www.yugioh-card.com/eu/product/beyond-the-brave/). La [page nord-américaine](https://www.yugioh-card.com/en/products/betb/) distingue vente anticipée OTS et légalité tournoi. Une annonce, une illustration disponible ou une absence de restriction ne démontre pas la légalité d’une carte dans une région.

Les trois fiches provisoires sont Autumn (`101403071`), Deep Forest of the Winter Raven (`101403059`) et Reindsurm Carnation (`101403056`). L’API annonce une sortie OCG au 31 octobre ; ces nombres ne sont pas présentés comme des passcodes imprimés. Les fiches restent consultables dans l’archive de comparaison pour une prochaine vérification.

Quatre références existantes ont reçu un texte anglais actualisé : Ashtrashen, Atlantis, Barian’s Seventh Untopia et Dark City at Midnight. Les noms Ashtrashen – Gate to the Worlds Beyond et Barian’s Seventh Untopia remplacent les noms précédents. Les deux fichiers WebP concernés ont été renommés sans changer leurs bytes.

Les noms et textes anglais des cartes uniquement OCG sont ceux du fournisseur. Les textes japonais officiels sont archivés séparément. Pour Field Power Bonus, la traduction API ajoute « once per turn » au retour depuis le Cimetière, une phrase absente du texte japonais actuel : aucun script de gameplay n’est déduit de cette traduction.

Les **336 illustrations JPEG précédentes** ont été retéléchargées et comparées : 336 réponses HTTP 200, 336 fichiers identiques en SHA-256, taille et dimensions. Les trois nouveaux JPEG conservent également les bytes sources et leurs dimensions 624 × 624. Une illustration alternative de Ritual Sanctuary (`20250830`) est rattachée au même passcode `95658967` et n’ajoute pas de carte au catalogue.

Le rendu utilise **339 JPEG sources locaux**, sans filtre colorimétrique et avec proportions conservées. Les 336 WebP originaux restent des images de repli ; les trois nouvelles références utilisent leur JPEG source exact comme repli. Aucun décor généré supplémentaire ou modèle officiel n’est revendiqué. Les trois nouvelles références ne sont pas ajoutées au registre des cartes strictement jouables.

Les limites officielles vérifiées sont celles du [TCG Advanced du 21 septembre](https://www.yugioh-card.com/en/limited/list_2026-09-21/) et de l’[OCG du 1er octobre](https://www.yugioh-card.com/japan/event/limitregulation/?list=202610). Les Terrains sont recoupés par CID Konami afin de reconnaître les noms traduits ou renommés ; dix références sont restreintes dans au moins un format. Secret Village est à trois exemplaires en TCG et à un en OCG. Les exemplaires sont combinés entre Main, Extra et Side Deck, avec le nom toujours traité comme « Umi » pour A Legendary Ocean.

Preuves reproductibles : [réponse API exacte](artifacts/field-catalogue-api-2026-10-07.json), [journal des ajouts, dates, exclusions et traductions](artifacts/field-catalogue-refresh-2026-10-07.json), [comparaison des illustrations sources](artifacts/field-source-art-live-2026-10-07.json), [limites par CID](artifacts/field-banlists-2026-10-07.json). Le générateur de snapshot refuse les identifiants dupliqués, types incohérents et nouvelles identités inexpliquées.

Validation ciblée : les tests catalogue, manifestes et rendu passent ; l’audit des illustrations contrôle 339/339 JPEG et 336/336 WebP distincts, ainsi que les trois replis JPEG sources. Le contrat de géométrie accepte également ces trois sources de repli. Les modifications de géométrie, de règles, du pool jouable et de l’atlas font l’objet de vérifications séparées.
