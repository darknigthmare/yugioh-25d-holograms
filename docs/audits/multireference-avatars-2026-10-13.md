# Avatars : références croisées et vues arrière — 13 octobre 2026

Cette vague corrige huit avatars existants : Yugi, Atem, Kaiba, Joey, Jaden, Yusei, Yuya et Playmaker. Les 192 modèles du catalogue restent sélectionnables selon leurs conditions habituelles. Les changements de modèles portent sur les volumes et les détails vérifiables dans de nouvelles illustrations ou photographies licenciées. Les proportions restent une reconstruction procédurale stylisée ; aucune source ne fournit une validation officielle 1:1 du maillage.

## Sources réellement consultées

Le [registre](artifacts/multireference-avatars-2026-10-13/reference-inventory.json) conserve **92 originaux téléchargés**, avec URL de l’image, page source, date UTC, dimensions, octets et SHA-256. **88 ont été utilisés** pour ces huit avatars et **quatre sont explicitement exclus** : les panneaux Ai et Roboppi ne décrivent pas Playmaker ; deux aperçus d’épisodes ne montrent pas le costume de Joey demandé. Les quatre planches de recherche sont des dérivés de consultation, pas des références supplémentaires.

Les champs `view`, `region`, `variant`, `angleGroup` et `usage` distinguent une nouvelle vue d’un gros plan, d’un éclairage différent ou d’une comparaison entre figurines. Le nombre d’images ne constitue donc pas un nombre de vues indépendantes. Les photographies représentent des sculptures licenciées, pas des planches de construction des animateurs.

| Avatar et apparence conservée | Sources croisées | Ce que les vues apportent | Limites restantes |
| --- | --- | --- | --- |
| Yugi Muto, uniforme bleu | [Konami](https://www.konami.com/yugioh/duel_links/en/series/dm/), [profil officiel](https://www.yugioh.com/characters/yugi-muto), [Kotobukiya PV325](https://kotobukiya-us.com/products/190526065888) | Face, profil et dos de la coiffure ; ourlet de veste et détails de ceinture | La sculpture PV325 est attribuée à **Yugi Muto** par le fabricant, distincte du Yami Yugi PV324. Le dessin de visage reste estimé. |
| Atem, Pharaon antique | Tête Konami du Yami moderne, [First 4 Figures](https://first4figures.com/products/atem-definitive-edition) | Costume antique : tunique courte, cape bleue, bandeau avec œil, col et ornements dorés | Le costume moderne de Yami n’est pas copié ; certains dos sont partiellement cachés par la cape ou le décor. |
| Kaiba, manteau blanc de Battle City | Konami, [profil officiel](https://www.yugioh.com/characters/seto-kaiba), [Kotobukiya](https://kotobukiya-us.com/products/190526065895) | Dos de manteau continu, revers, plis, mèches de nuque et bottes hautes | Tension du tissu en pose de duel estimée ; pas de modèle neutre officiel. |
| Joey, veste verte de Duelist Kingdom | [Épisode officiel](https://www.yugioh.com/yu-gi-oh/journey-to-the-duelist-kingdom/207), têtes Konami/profil officiel, [Kotobukiya](https://kotobukiya-us.com/products/190526065901) | Le petit aperçu primaire confirme veste verte, tee-shirt blanc et pantalon bleu. Les vues de figurine recoupent les cheveux de côté et de dos. | L’image verte est limitée à 240×180. La figurine porte un autre tee-shirt : ses vêtements ne sont pas copiés. Le dos précis de la veste verte reste à documenter. |
| Jaden, veste de Slifer Red | [Konami](https://www.konami.com/yugioh/duel_links/en/series/gx/), [AMAKUNI](https://amakuni.info/product/index01240000.html) | Empiècement blanc arrière, liseré, deux pans de veste, mèches arrière et chaussures rouges à brides sombres | La déformation de veste et les plis du pantalon sont interprétés pour la pose du rig. |
| Yusei, veste de pilote | [Konami](https://www.konami.com/yugioh/duel_links/en/series/5ds/), [AMAKUNI](https://amakuni.info/product/index01890000.html) | Nuque, dos et bas de veste, liseré, protections orange des coudes/genoux, bottes marron hautes | Les plis et la couture centrale sont approximatifs ; les photos ne donnent pas des cotes officielles. |
| Yuya, tenue de spectacle | [Konami](https://www.konami.com/yugioh/duel_links/en/series/arcv/), [TV Tokyo](https://www.tv-tokyo.co.jp/anime/yugioh-arcv/chara/) | Frange rouge et couronne verte, pantalon olive, poches, chaussure rouge et sombre, bord jaune, lunettes dorées et pendentif | Pas de vue arrière indépendante de cette tenue ; le mantelet reste une interprétation du dessin public. |
| Playmaker, avatar LINK VRAINS | [Konami](https://www.konami.com/yugioh/duel_links/en/series/vrains/), [TV Tokyo](https://www.tv-tokyo.co.jp/anime/yugioh-vrains/chara-a/) | Plastron vert/noir, col sombre angulaire, lignes lumineuses et coiffe angulaire au lieu d’une calotte | Les deux illustrations sont surtout frontales. Les plaques arrière et les proportions ne sont pas certifiées. |

Les téléchargements ordinaires de certaines pages japonaises Kotobukiya ont renvoyé une réponse 403 ou une page de file d’attente. Les images de leur boutique américaine officielle, liée par le fabricant, ont été utilisées. Les réponses bloquées et les chemins erronés sont documentés dans le registre.

## Changements de géométrie

Les vêtements ajoutés possèdent une face avant, une face arrière et une tranche fermée. Leurs contours varient sur plusieurs rangées et décrivent de vrais pans courbes, plutôt que d’augmenter la subdivision de rectangles plats. La revue indépendante a identifié une orientation de triangles initialement inversée ; elle a été corrigée sur les deux faces et sur les pièces symétriques. Un test contrôle les normales extérieures sur les géométries finales effectivement regroupées.

Les mèches de dos donnent du relief à l’étoile de Yugi/Atem et aux coiffures de Kaiba, Joey, Jaden et Yusei. Le dos des vestes, leurs empiècements, les bottes, les poches et les brides sont visibles en rotation. Les détails de bras gardent les mêmes joints que leurs manches, protections ou mains. Aucun nouveau modèle ne reçoit l’état privé du duel.

Atem porte désormais une tunique qui se termine au-dessus du genou et une cape bleue, avec bras nus et bandeau du Pharaon. Playmaker conserve des pièces vertes et sombres plutôt que le grand plastron et les protège-tibias dorés génériques. Le catalogue et le portrait de Jaden/Yuya ont été corrigés séparément par l’intégrateur pour garder leurs couleurs cohérentes avec les modèles.

## Vérifications exécutées

Le [rapport CPU](artifacts/multireference-avatars-2026-10-13/cpu-audit.json) compare les 192 factories Three.js réelles à une copie indépendante de la version livrée avant cette vague. **Huit signatures de géométrie/couleur changent**. Les plafonds individuels demeurent ceux de la [mesure originale du 11 octobre](../../test/fixtures/duelist-avatar-triangle-baseline-2026-10-11.json), multipliés par cinq : ils ne repartent pas de la dernière version déjà affinée.

- 12 348 à **21 932 triangles** par avatar ; rapport maximal **3,434840×** par rapport à son propre modèle original, pour Yusei.
- **Neuf regroupements de rendu maximum** ; 3 830 160 octets maximum d’attributs de géométrie CPU.
- Positions finies, normales unitaires, joints rigides valides ; les gestes conservent les buffers et la destruction libère chaque ressource une seule fois.
- **32 tests ciblés réussis**, dont quatre nouveaux contrôles : normales extérieures des vêtements/pans symétriques, costume antique d’Atem, pantalon/frange de Yuya et plastron de Playmaker. [Journal](artifacts/multireference-avatars-2026-10-13/targeted-tests.txt).

La QA visuelle indépendante a comparé ces huit avatars sous quatre angles à caméra, pose et lumière constantes, avec leurs originaux à proximité. Elle confirme des volumes arrière lisibles et les corrections de costume, sans défaut bloquant signalé. Les preuves visuelles et la QA du navigateur compilé sont conservées dans le dossier séparé [de cette vague](artifacts/multireference-qa-2026-10-13/). Les mesures CPU ne sont pas une mesure de fréquence d’images sur téléphone ; le contrôle compilé final et la livraison GitHub/Vercel sont des étapes séparées.

Les **184 autres avatars** conservent leur géométrie de la vague précédente. Il reste notamment à trouver et recouper leurs variantes de tenue, les profils et les dos manquants, puis à reconstruire les visages et les plis sans les confondre avec des variantes dérivées. L’existence de tous les avatars sélectionnables ne signifie pas que leur fidélité 1:1 est terminée.
