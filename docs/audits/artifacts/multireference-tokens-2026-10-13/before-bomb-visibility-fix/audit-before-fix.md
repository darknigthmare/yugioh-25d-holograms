# Jetons : références croisées et modèles corrigés — 13 octobre 2026

Les références ont conduit à **16 géométries corrigées** et à **14 nouvelles associations avec une vraie carte Jeton imprimée**. Les 240 codes natifs sont toujours distincts ; les règles, les statistiques, les scripts Lua, la façade native et le WASM restent inchangés. Aucun modèle n’est déclaré certifié 1:1 : les dos, les surfaces cachées et certains sujets de compositions restent interprétés.

## Recherche bornée et provenance

L’API YGOPRODeck relue le 13 octobre contient encore 106 fiches et 120 images ; aucun nouvel art n’a été ajouté par cette API. Les 111 codes dont la preuve antérieure ne proposait qu’un générateur ou aucune image correspondent à 95 noms distincts. Les 95 pages ont été recherchées : 88 réponses GET 200 et 7 réponses GET 429 initiales. Une seule reprise ultérieure des 7 requêtes, avec deux connexions, a obtenu 7 réponses 200. Les deux registres restent séparés : les échecs initiaux sont conservés.

Les images principales de 11 pages sont des dos de cartes, rejetés. Les 84 autres sont des pistes ; **une image de jeu ne prouve pas automatiquement l’anatomie propre du Jeton**. Beaucoup réutilisent la carte génératrice ou un équipement. Quatre pistes de jeux issues de la reprise n’ont pas été téléchargées, car aucune nouvelle carte Jeton imprimée n’y apparaissait.

Les registres contiennent 92 téléchargements d’originaux, soit 90 empreintes de fichiers différentes, pour 54 733 306 octets avec les doublons. Ces nombres **ne comptent pas les poses ni les illustrations indépendantes**. Les statuts GET, URLs, formats, dimensions et SHA256 sont enregistrés ; les recipes exécutés sont archivés sous `recipes/` en texte. Les scans restent byte-identiques ; le root a ajouté leurs copies de présentation dans `public/tokens/reviewed/`.

- [13 références imprimées initiales](artifacts/multireference-tokens-2026-10-13/verified-printed-token-references.json).
- [14e référence G Golem, obtenue après le GET 429](artifacts/multireference-tokens-2026-10-13/additional-printed-g-golem-reference.json).
- [Classifications, déduplication et manques conservés](artifacts/multireference-tokens-2026-10-13/reference-review-and-coverage.json).
- [Inventaire initial des 95 requêtes](artifacts/multireference-tokens-2026-10-13/missing-direct-art-page-probes.json) et [reprise bornée des sept réponses 429](artifacts/multireference-tokens-2026-10-13/missing-direct-art-page-retries.json).

Les 14 identités imprimées sont Gadget, Jurraegg, Bomb, Ogdoadic, Primal Being, Generaider, Prank-Kids, Ice Barrier, Trickstar, Crystal Beast, Duel Dragon, Mask, Dual Avatar Spirit et G Golem. Le lien s’appuie sur le nom imprimé, la définition Type/Attribut/Niveau/ATK/DEF et les générateurs natifs vérifiés. Ces cartes Jeton n’affichent pas nécessairement un passcode numérique imprimé : l’association avec le code technique natif est documentée, sans prétendre que ce nombre est visible sur le scan.

Les 14 associations réduisent de 111 à **97** les codes encore sans illustration propre acceptée dans cette recherche. La nouvelle référence d’une carte ne signifie pas que son modèle entier a désormais une forme fixe certifiée.

## Références différentes effectivement comparées

- Lamb : les deux Jetons imprimés et Stray Lambs confirment les cornes en croissant tournées vers le haut. Les cornes de Sheep sont des spirales complètes. Le générateur réemploie l’art des lambs : sa composition n’est pas comptée comme un nouvel angle.
- Kuriboh : le Token imprimé et le monstre Kuriboh 40640057 fournissent des dessins différents du même sujet ; ils montrent des griffes séparées aux mains et aux pieds. Multiply est aussi archivé, mais sa figure stylisée n’est pas reprise comme nouvelle anatomie.
- Ojama Red et Blue : leurs cartes Jeton et Ojama Duo montrent des poses distinctes. Red a une grimace, un foulard jaune et un index levé ; Blue possède un long visage resserré, des yeux inclinés, des lèvres mauves et des bras croisés. Ojama Trio corrobore les autres variantes ; leurs réemplois ne deviennent pas des angles supplémentaires.
- World Legacy : OP15, 20TP, TK03 et TK05 répètent une seule composition de Galatea spectrale. Legacy of the Duelist montre une autre version, la machine World Lance. Ces deux versions ne sont pas fusionnées en un modèle prétendument vu sous deux angles.

## Corrections des silhouettes

Les deux Lamb reçoivent leurs croissants pointus et leurs petits sabots arrière. Kuriboh reçoit ses griffes de pieds et ses griffes de mains courbées. Ojama Red et Blue ont des visages, des postures et des accessoires propres.

Gadget devient le drone blanc à deux fourches et câbles bouclés du TK04, sans corps humain. Ogdoadic devient le serpent liquide sombre sortant d’un tourbillon, sans cornes ni bras. Primal Being utilise la météorite et l’impact de la composition imprimée ; les silhouettes de victimes à l’arrière-plan ne deviennent pas les membres d’un golem inventé. Cette reconstruction de l’objet d’impact demeure une interprétation de la composition.

Jurraegg devient le groupe de six œufs aux marques irrégulières qui épousent leur coquille. Bomb est une pierre brûlante à croûtes pentagonales et fissures, sans yeux ni sourire. Ice Barrier représente deux sceaux hexagonaux ouverts, avec un vrai trou central, à la place des anciennes pointes octaédriques.

Generaider devient l’automate argenté à croissant, halo et lames ; Trickstar devient le cœur crânien ailé ; Mask reçoit sa forme de masque vert-gris et ses petits membres ; Dual Avatar Spirit devient le lion gardien spectral assis. Son menton et ses crocs restent attachés au BODY : le pivot JAW des dragons ne correspond pas à cette anatomie et n’est pas utilisé pour créer une ouverture incorrecte.

G Golem devient la roche sombre flottante à facettes de MAMA-EN103. La comparaison complète a détecté que son premier branchement avait été placé dans la famille `gadget` alors que son profil est `cyber-polyhedron`. Le branchement exact par code a été remonté hors de cette condition ; la mesure finale constate maintenant les **16 changements réellement exécutés**. L’état précédent de 15 changements est conservé dans `geometry-before-ggolem-dispatch-fix.json`.

## Mesures finales

Comparaison sur **480 constructions** : 240 codes en ATK et DEF, par rapport aux sources immuables du commit `baabe9f94863159053e4ad37be4c038104da5e23`. Les limites sont calculées depuis les fixtures **originales** du 11 octobre, et ne sont pas multipliées à nouveau à partir des modèles déjà densifiés. La signature prend en compte indices, positions, normales et joints ; la signature complète ajoute les couleurs.

| Code | Jeton | Triangles avant ATK | Triangles après ATK | Limite originale ×5 | Lots GPU |
| --- | --- | ---: | ---: | ---: | ---: |
| 645088 | Gadget | 5,388 | 6,972 | 8,160 | 5 |
| 14470846 | Ojama Red | 5,668 | 8,776 | 9,980 | 4 |
| 14470847 | Ojama Blue | 5,648 | 7,436 | 9,880 | 4 |
| 17228909 | Jurraegg | 5,056 | 4,664 | 7,780 | 3 |
| 22411610 | Bomb | 5,644 | 6,020 | 10,980 | 4 |
| 23837055 | Ogdoadic | 2,892 | 7,284 | 7,760 | 3 |
| 27204312 | Primal Being | 2,324 | 5,572 | 6,220 | 4 |
| 38053382 | Generaider | 10,380 | 6,316 | 13,830 | 5 |
| 40703223 | Kuriboh | 10,192 | 10,808 | 11,180 | 5 |
| 44308318 | Ice Barrier | 712 | 2,000 | 3,560 | 3 |
| 51208047 | Trickstar | 10,380 | 6,544 | 13,830 | 5 |
| 60514626 | Mask | 4,912 | 8,832 | 8,920 | 4 |
| 60764582 | Lamb rose | 7,800 | 8,920 | 12,000 | 4 |
| 60764583 | Lamb blanc | 7,800 | 8,920 | 12,000 | 4 |
| 87669905 | Dual Avatar Spirit | 6,256 | 11,588 | 11,690 | 5 |
| 98875864 | G Golem | 960 | 1,376 | 4,800 | 4 |

Tous les 480 modèles restent sous la limite par code et pose, avec au plus cinq lots GPU ; maximum mesuré : 20 260 triangles. Le rapport maximal aux triangles d’origine est 4.956373. Plusieurs modèles utilisent moins de triangles que leur ancienne anatomie incorrecte : la fidélité dépend des formes modélisées, pas d’une subdivision automatique.

- [Mesure finale de toutes les poses](artifacts/multireference-tokens-2026-10-13/geometry-before-after-240-two-poses.json).
- [22 tests ciblés : 22 passent, 0 échec](artifacts/multireference-tokens-2026-10-13/targeted-tests-final.txt).
- [Preuve spécifique des quatre modèles Spirit, 532 assertions](artifacts/multireference-tokens-2026-10-13/spirit-models/geometry-report.json).

Le premier contrôle du nouveau test avait confondu le nom `hornless` avec une présence de cornes ; son expression de contrôle a été corrigée et le journal de cette étape est conservé. Le rapport de 22 tests final couvre les contraintes géométriques des 240 codes, la distinction des anatomies imprimées, les buffers immuables durant l’animation, la libération des ressources visibles et des ressources d’ombres, ainsi que les exceptions et les protections existantes. La revue WebGL sous quatre angles et les parcours compilés sont effectués indépendamment par le chantier QA ; leurs résultats ne sont pas déduits de ces seules mesures de géométrie.

## Limites conservées

World Legacy 69811711 ne reçoit pas de nouvelle association de forme : les versions sont ambiguës. Parasomnia 44092305 et Epigonos 51611042 gardent leur écho neutre ; les images de leur générateur ne révèlent pas l’identité copiée. Crystal Beast et Duel Dragon gardent leurs définitions et apparences variables : la carte imprimée sert de présentation, sans figer les propriétés du monstre copié. Prank-Kids montre un groupe de personnages ; aucune figure unique arbitraire n’est imposée.

Les 97 codes sans art propre accepté, les détails cachés, les dos et les différences entre versions restent explicitement à compléter. Une vue frontale de carte, même officielle, ne suffit pas à certifier une reproduction 3D 1:1 complète.
