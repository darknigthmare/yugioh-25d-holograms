# Arcane — 24 illustrations et reconstructions périphériques

Les 24 JPG locaux ont été ouverts individuellement avant conception. Les décors reproduisent leurs formes observables : la cour lumineuse de Dream Mirror of Joy remplace notamment l'ancien miroir inventé. Les êtres vivants, les équipements tenus et les motifs picturaux trop fins restent dans l'illustration exacte. Dimensions, orientation et profondeur sont adaptées à la périphérie du duel ; ces volumes ne constituent pas une copie spatiale intégrale 1:1.

## Vérifications et reproductibilité

- Module figé : `src/ui/FieldEnvironmentArcaneReferences.js` ; SHA-256 **88776075dac0a9fbc4644e6427a4d3cd49e0305693fb5826056b8f7b4a6d5e3e**.
- `node test/field-arcane-references.test.js` : **7 tests**, aucun échec. Namespace Three réellement utilisé par le produit, bornes transformées de chaque instance hors du corridor, buffers finis/index valides, formes et couleurs réelles, montée des routes, disposal exactement une fois.
- `python3 scripts/audit-field-arcane-references.py --capture` : **72 images**, **24 JPG exacts**, 48 PNG 600×600, **0 erreur Chromium**, aucun script actif dans la galerie exportée. Un renderer unique est réutilisé séquentiellement puis libéré.
- Maximum réel observé : **219 primitives / 17 appels de dessin / 9 matériaux**, limites 220/18/10 ; toutes les bornes horizontales restent sous 48.
- Factory commune intégrée de la capture finale : SHA-256 **134b5a9e4cf1982b82a43e54f860522833cf1cea16013003b54153fc79dedb3c** ; les SHA de tous les modules géométriques sont enregistrés et vérifiés avant/après capture.
- Comparaison avant exacte : commit **ba6c62aa6b3db8f15efad52e3ee8d5fcd143b601**. Les **16 modules** de sa factory, de son registre et de leurs imports transitifs sont archivés sans transformation dans `baseline-ba6c62a/`. Le manifeste donne leurs SHA. Aucun import géométrique de l'avant ne pointe vers les nouveaux modules.
- Les deux rendus de chaque ligne partagent caméra, focale et lumières. Ils isolent la géométrie et prouvent les silhouettes, reliefs et détails modélisés ; ils ne prouvent pas le rendu complet d'une partie ni une reproduction totale des figures peintes.

[Galerie autonome des 72 images](artifacts/field-arcane-2026-10-07/gallery.html) · [rapport et SHA de tous les artefacts](artifacts/field-arcane-2026-10-07/report.json)

Les quatre planches `field-arcane-gates`, `field-arcane-horizons`, `field-arcane-sanctuaries`, `field-arcane-phenomena` ont été inspectées. Les premiers rendus ont conduit à améliorer les prismes basaltiques, les couleurs des orbites et la continuité des bancs de nuages. La galerie finale a été rechargée dans Chromium : 72/72 images chargées, JPG originaux comparés octet par octet.

## Observations et limites par source

| Carte | Détails observés reconstruits et éléments conservés peints |
| --- | --- |
| Advanced Dark (`12644061`) | blue smoky backdrop with a large white upper rune arc ; fine violet lightning and grey curved vapor trails ; dragon and seven Crystal Beasts remain painted. |
| Amorphous Persona (`23160024`) | tall grey rotunda columns under a curved circular lintel ; floating thin silver ceremonial staff with forked crown red jewel and violet tip ; branched violet lightning; armored figures remain painted. |
| Ashtrashen - Gate to the Worlds Beyond (`2906939`) | two red gold-inscribed pillars supporting sharply upswept dark cyan eaves ; drooping rope and white paper tassels four red lanterns and central eye medallion ; red banners and crooked pagoda at right; archer remains painted. |
| Barian Untopia (`30761649`) | dense angular crimson crystal spires outlined with fine gold facet edges ; round stacked projecting ledges on the tall left spire ; orange and gold curved sky vortex around a dark opening with a small blue core. |
| Barian's Seventh Untopia (`39513225`) | central ascending gold stone stairs between high golden brick walls ; uneven block courses and hairline cracks beneath a red swirling sky ; three large armored beings and their equipment remain painted. |
| Delta of Invitation (`3129133`) | purple flat-sided basalt ridges and pale layered mountains ; bright pink branching channels separating long grey finger ridges ; thin white branching lightning above the canyon. |
| Earthbound Geoglyph (`44710391`) | dense aerial modern building grid with dark rows of windows and rooftop boxes ; white violet angular geoglyph traces loops zigzags and long parallel street lines ; thin upright violet light traces rising from the lit city paths. |
| Earthbound Prison (`71089030`) | massive bent five-finger green stone formation with banded knuckles and recessed purple palm ; many smaller rocky hands emerge from cracked ground ; three oval white violet wisps with long curling trails. |
| Dream Mirror of Joy (`74665651`) | cream cylindrical towers with gold pointed roofs and thin blue windows ; layered curved arched galleries and a round columned pavilion ; curling pale tree trunks with mint foliage and pink blossoms; ornate picture border stays painted. |
| Celestia (`43912676`) | large globe encloses overlapping white icy faceted slabs ; thin colorful elliptical orbit rings with large four-point stars ; separate small spiral galaxy at lower right. |
| Hexatellarknight (`70422863`) | large tilted lavender hexagonal shield with bright rim and round white perimeter nodes ; white circular pointed geometric motif at shield center ; wooded grey green canyon under gold sky; fighters and distant creatures stay painted. |
| Light Barrier (`73206827`) | dense gold white vertical light curtain and four-point white stars ; bright horizontal platform rings below the hovering figure ; black gold mechanical entity and claws remain painted. |
| Impcantation Thanatosis (`13482262`) | purple draped curtains framing a gold-edged black shutter and ornate horizontal scrollwork ; dark ritual desk with circular diagram cards glass flasks and open golden drawers ; side shelves two candle cups and a feather holder; animated objects retain painted faces. |
| Realm of Light (`36099620`) | two huge cream round towers wrapped by external ascending spiral routes ; dense terraced hillside city with many thin windows arched viaduct and gabled temple ; left waterfall trees and white diagonal sunlight shafts. |
| Oracle of Zefra (`32354768`) | tall white circuit-like obelisk framed by intertwined tree trunks canopy and roots ; ten round colored medallions connected by a branching white gold diagram ; curved silver side hooks and blue radiating rays. |
| Peaceful Planet Calarium (`82460246`) | broad flowering cherry tree above cracked grey stone plaza ; sweeping gold curved energy around the small foreground figure and blue flowing trails at right ; fighter and large armored figure remain painted. |
| Perfect Sync - A-Un (`13764602`) | blue white lightning at left and magenta branching lightning at right ; radiating blue and red straight luminous rays behind the central meeting ; two armored figures and dragon-shaped energy images remain painted; no temple is depicted. |
| The Weather Forecast (`18720257`) | layered white lavender cloud banks surrounding an upright segmented white cyan back ; tall rounded panels with deep vertical notches below a bright round overhead sun ; small stars and rainbow light below; all seven figures stay painted. |
| Vaalmonica, the Agathokakological Voice (`39210885`) | horizontal ribbed silver blue instrument on four curled ornate legs above rippling water ; two shallow goblets and small candle flames beneath an open suspended book ; cyan end jewels horned book frame and separate dark and light wings remain painted. |
| Way Where There's a Will (`91880660`) | curved cyan holographic grid behind multiple red circle-and-slash warning signs ; wide diagonal yellow white lanes converge toward a bright overhead point ; armored runners tiny unreadable labels and foreground lens rim remain painted. |
| Stairway to a Fabled Realm (`22555834`) | dark violet angular cave wall behind a red descending or ascending curved stair mouth ; concentric red stone ground steps and narrow radial seams around the central opening ; fine pink cracks and shafts; winged figure and masked small creatures remain painted. |
| The Nordic Lights (`50433147`) | wide green gold aurora curtains curl into horizontal upper folds ; dark angular overlapping mountain ridges below a bright central sun ; large thin four-point stars and smaller gold green sky points. |
| World of Spirits (`5414777`) | green rolling flowered meadow with pink white and yellow tiny blooms ; layered blue mountain horizon and soft white clouds under cyan sky ; all five whimsical creatures and the hovering figure remain painted. |
| Xyz Override (`32999573`) | high red cylindrical gantry with diagonal cross bracing and gold horizontal crane rails ; gold hoist frames with long thin vertical suspension cables and yellow bay lights ; planes vehicles and mecha remain painted; architecture and empty lifting hooks are modeled. |

Les petites inscriptions sont des traits courts sans texte inventé ; les facettes, tracés lumineux, arches et objets de décor sont de véritables buffers/matrices. La densité de particules, les feuillages et l'usure des pierres sont simplifiés. Les métadonnées déclarent précisément les motifs étudiés et ne promettent aucune modélisation de personnages.

## Gel final commun des dépendances

Les captures finales ont été régénérées après le gel des six nouveaux modules. La factory reste `134b5a9e4cf1982b82a43e54f860522833cf1cea16013003b54153fc79dedb3c` ; Engineering = `566328be75b756765ffd33c2eb7738f4825b8d4cdd48c8acec807505d674c8ce`, Frontier = `926e4873ff5e4c2a038f310eb6d5c702ed8dbe3d92bced322b88fe1cb21997af`. Tous les autres SHA géométriques du rapport correspondent aussi aux fichiers livrés. Aucun fichier produit ni build n’a été changé lors de cette recapture.
