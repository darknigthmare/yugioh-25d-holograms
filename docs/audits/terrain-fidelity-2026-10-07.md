# Décors de Terrain — inspection du 7 octobre 2026

Sept profils sont affinés à partir des **JPG sources locaux réellement ouverts**. Ancient Forest est revu et capturé sans modification de ses volumes. Les illustrations sources restent intactes. Ce lot améliore des objets et des silhouettes identifiables ; il ne constitue pas une reconstruction spatiale 3D 1:1.

Le Sanctuaire Céleste utilise **56433456**, confirmé par le catalogue et la recherche de carte par nom. `11324436` n'est pas le passcode de ce Terrain. Wetlands utilise **2084239**, soit `02084239` imprimé. Les JPG de ces quatre Terrains devenus jouables correspondent octet pour octet aux images de carte téléchargées pour le pool strict : Wetlands, Sanctuary, Skyscraper et Ancient Forest. Leurs règles et leur activation sont vérifiées séparément par le moteur de jeu.

## Comparaison et changements

Chaque capture juxtapose **l'illustration source**, **les volumes du commit 6c0232f**, puis **les volumes actuels**. Le cadrage est identique avant/après pour chaque carte. Aucun fond illustré ne masque les volumes dans les deux colonnes géométriques.

| Carte / capture | Ce qui a été réellement observé et reconstruit | Primitives / appels couleur / matériaux | Limites visibles de la reconstruction |
| --- | --- | --- | --- |
| [Mystic Plasma Zone — 18161786](artifacts/field-geometry-18161786-2026-10-07.png) | Large vortex violet enroulé autour d'une lumière cyan, éclairs ramifiés, mince sol rocheux en bas à droite. L'ancien anneau de nuages disjoints est remplacé par une spirale continue de 2,4 tours, avec lèvres, filaments, 24 lobes attachés, relief irrégulier et rainures. | **71 / 11 / 5** | La spirale demeure une forme tubulaire adaptée. Les lobes ajoutent du relief, mais ne reproduisent ni l'épaisseur atmosphérique, ni les innombrables filaments peints, ni la luminosité diffuse de l'orage. Les éclairs restent des segments solides statiques. |
| [Mountain — 50913601](artifacts/field-geometry-50913601-2026-10-07.png) | Deux massifs brun/ardoise, grand pic droit et crête gauche plus basse, pentes longues striées, brume de vallée. Deux surfaces déformées distinctes remplacent les cônes lisses ; 96 segments de stries, replis angulaires et teintes par sommet détaillent les versants. Les grosses roches éparses sont retirées. | **110 / 4 / 3** | La construction des massifs reste radiale et pointue. Les crêtes ne reproduisent pas encore les multiples sommets cassés, les vallées profondes ou les fissures exactes de l'image. La brume est représentée par des volumes blancs simples plutôt que par une atmosphère bleue continue. |
| [Labrynth Labyrinth — 33407125](artifacts/field-geometry-33407125-2026-10-07.png) | Palais blanc/cyan, toits bleus, accès courbes en hauteur, grand glyphe rose suspendu. Les deux anciens tubes droits deviennent des passerelles larges qui montent en arc autour du palais, avec balustres et garde-corps. Un emblème rose simplifié est ajouté. | **162 / 7 / 3** | Tours et façades cylindriques restent peu ornées. Les passerelles sont deux arcs ascendants adaptés, sans reproduction de l'ensemble des spirales et croisements du dessin. Le glyphe ressemble à un cœur/couronne ; ses arabesques, pointes et armes ne sont pas modélisées. |
| [Molten Destruction — 19384334](artifacts/field-geometry-19384334-2026-10-07.png) | Volcan noir très large, cratère irrégulier, coulées orange ramifiées, éruption jaune et roches éjectées. Le cône octogonal régulier est remplacé par un relief asymétrique à 64 secteurs et 24 rangées, un vrai sommet ouvert, des parois de cratère et un bassin incandescent. Huit coulées sinueuses de 12 segments et huit branches de 6 segments suivent la surface rendue. | **180 / 6 / 4** | Les coulées restent des tubes segmentés, moins larges et moins denses que les nappes de lave du dessin. L'éruption est géométrique et statique ; ciel incandescent, fumée turbulente et particules dynamiques restent dans l'illustration. Le relief ne reproduit pas chaque ravin. |
| [Wetlands — 2084239](artifacts/field-geometry-2084239-2026-10-07.png) | Herbes vert vif très denses au premier plan, pluie oblique, bande d'eau sombre horizontale, montagnes cyan dans la brume. Les arbres, bassins maçonnés, nénuphars et massettes inventés sont retirés. 120 touffes composées de **600 lames courbées**, eau peu profonde, horizon bas et 40 traits de pluie remplacent ces accessoires. | **172 / 6 / 6** | Le corridor reste volontairement ouvert. Les bandes latérales sont moins denses que toute la prairie peinte ; les montagnes demeurent des pointes régulières et la pluie fine n'est pas animée. Le sol central et le cadrage ne reproduisent pas la vue à hauteur d'herbe de la source. |
| [The Sanctuary in the Sky — 56433456](artifacts/field-geometry-56433456-2026-10-07.png) | Temple grec beige/crème ruiné, îlot rocheux suspendu, escalier frontal, terrasse circulaire latérale, monument à orbe et nuages. L'architecture générique et les grandes arches dorées absentes du dessin sont retirées. Temple, fronton, colonnes brisées, îlot avec pointes inférieures, escalier, terrasse et monument sont reconstruits individuellement. | **64 / 12 / 5** | L'île est plus plate et moins découpée que le rocher source. Maçonnerie, pavage, bas-reliefs et rampes secondaires sont simplifiés. Le monument n'a pas toutes ses sculptures et la mer de nuages n'est pas continue. |
| [Skyscraper — 63035430](artifacts/field-geometry-63035430-2026-10-07.png) | Immeubles gris foncé encadrant une rue en vue ascendante, fenêtres jaunes, flèche centrale Art déco, grande lune et faisceaux blancs croisés. La skyline aléatoire est remplacée par six façades alignées, fenêtres tournées vers la rue, bandeaux, tour centrale étagée, lune avec accents de cratère et quatre projecteurs. | **118 / 7 / 6** | La lune est plus petite et beaucoup plus simple que l'astre peint. Les façades et fenêtres ne reproduisent pas chaque travée, et les faisceaux coniques restent nets plutôt que diffus. Leur transparence utilise un seul passage de rendu pour conserver le budget. |
| [Ancient Forest — 87624166](artifacts/field-geometry-87624166-2026-10-07.png) | Contrôle du profil existant : grands troncs encerclants, canopée turquoise en hauteur, trouée et rayons blancs. **Aucun changement de volume dans ce lot.** | **66 / 3 / 3** | Canopée et branches restent clairsemées et simplifiées face à la vue ascendante dense de l'illustration. La capture avant/après permet de constater l'absence de modification. |

## Artefacts reproductibles

- [Planche des huit comparaisons](artifacts/field-geometry-comparison-2026-10-07.png).
- [Mesures complètes, SHA-256 des sources et paramètres de caméra](artifacts/field-geometry-2026-10-07.json).
- [Module de référence archivé au commit 6c0232f](artifacts/field-geometry-baseline-6c0232f.js).
- [Script autonome d'audit et de capture](../../scripts/audit-field-geometry-2026-10-07.mjs).

Exécution depuis la racine du dépôt :

```sh
node scripts/audit-field-geometry-2026-10-07.mjs
node scripts/audit-field-geometry-2026-10-07.mjs --capture
```

L'audit numérique utilise les dépendances déjà présentes. La capture exige Chromium et `playwright-core`, sans ajouter de dépendance à l'application. `PLAYWRIGHT_MODULE` peut désigner un module installé ; `CHROMIUM_PATH` peut choisir le navigateur. Le script sert uniquement les modules autorisés et les illustrations locales sur une adresse de boucle locale, lance une page statique sans Vite/HMR, puis ferme navigateur et serveur. La version initiale est l'artefact archivé, pas un fichier provisoire de `/tmp`.

Les huit lignes chargent **24 images**, sans erreur JavaScript ni WebGL. Chaque volume est rendu dans Chromium avec le même éclairage neutre et les mêmes paramètres avant/après, puis ses ressources et son contexte sont libérés. Les captures sont des vues isolées à cadrage propre au sujet : elles ne prouvent pas la superposition finale entre l'illustration, les modèles et les consoles du duel. Certains accessoires périphériques peuvent sortir de ces cadrages de comparaison.

## Contrôles et budgets

Les **336 terrains** sont reconstruits et contrôlés individuellement. Leurs sommets transformés et les bornes de chaque instance restent hors du corridor `x = [-9, 9]`, `y = [-3, 30]`, `z = [-18, 17]`, avec un horizon borné à moins de 48 unités sur x/z. Maximum global : **180 primitives avant regroupement, 17 appels de rendu, 10 matériaux et 33 300 triangles**. Les sept scènes modifiées ont au plus 12 appels couleur mesurés dans Chromium. Les quantités sont bornées ; aucun débit d'images sur un téléphone réel n'est déduit de ces mesures.

« Primitive » désigne ici un maillage représenté avant l'instanciation, pas une face ou un triangle. Une touffe Wetlands est un maillage partagé contenant cinq lames ; les 600 lames sont regroupées dans trois lots de matériau. Les 172 primitives de cette scène ne signifient donc pas seulement 172 brins d'herbe.

Les **11 tests de géométrie** passent, notamment :

- toutes les familles et tous les 336 raccords illustration/profil ;
- invariance du décor pour Terrain posé, caché, en attente ou annulé ;
- source et motifs concrets des **24 références inspectées**, contre 21 précédemment ;
- continuité de la spirale, reliefs asymétriques striés et parcours courbes de Labrynth ;
- **2 448 échantillons de lave** projetés par Raycaster sur le relief réellement rendu, avec rayon entier dégagé et raccords de branches continus ;
- validité des attributs et indices des nouveaux buffers ; libération unique des géométries, matériaux et buffers d'instances, y compris après remplacement répété.

Les exports publics du registre et les 66 associations de landmarks sont conservés. Le compteur de références inspectées passe à 24. Aucun nouveau constructeur Three n'est demandé au module principal : les formes sont déformées à partir des primitives déjà fournies. Les volumes restent statiques, publics et dépourvus de textures de cartes privées.

Une seconde revue visuelle indépendante confirme les sujets et les corrections, ainsi que les limites signalées dans le tableau. **L'illustration 2D intacte et ces volumes adaptés ne constituent pas une reproduction intégrale 3D 1:1.**
