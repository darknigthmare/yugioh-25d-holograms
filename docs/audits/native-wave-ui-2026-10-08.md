# Audit navigateur natif — modèles, réanimation, annulation et vues — 2026-10-08

**PASS : desktop 1280 × 900 et mobile 390 × 844 ; 24 captures inspectées ; 18 états de vues/caméras vérifiés.** Le pilote utilise le build de production gelé, sans reconstruction. Deux parcours indépendants par taille : trois nouveaux modèles et une réanimation réelle, puis une attaque adverse réellement annulée par Negate Attack. Zéro erreur JavaScript, échec de ressource native ou violation CSP.

Le format est **Duel libre natif**, avec un Deck isolé de 40 cartes accepté par le validateur de ce mode ; aucune certification de légalité TCG Advanced. Deck et RNG initial sont enregistrés avant le démarrage ; décisions et changements de vues passent ensuite par les contrôles publics. Aucun accès au moteur privé ou aux objets Three.js, aucune injection de carte après démarrage, aucun Debug/TestMode ou hook QA. Les archives CDB/Lua/WASM restent inchangées.

## Parcours natifs effectivement exercés

Le premier Deck ouvre La Jinn (97590747), Double Summon (43422537), Mystical Elf (15025844), Foolish Burial (81439173) et Monster Reborn (83764718). La Jinn est invoqué normalement ; Double Summon se résout et permet l'invocation normale supplémentaire d'Elf. Foolish Burial choisit Beaver Warrior (32452818) dans le Deck : son passage au Cimetière est vérifié dans la liste publique. Monster Reborn choisit ce même Beaver au Cimetière et le réanime. Résultat natif : trois monstres, main vide, trois Magies au Cimetière, LP 8000/8000. Le modèle vert de La Jinn, l'Elf en prière et Beaver en armure bleue apparaissent ensemble en vue Réelle aux deux tailles, avec ATK/DEF respectivement 1800/1000, 800/2000 et 1200/1500.

Le second Deck ouvre une Mystical Shine Ball (39552864, 500/500) et Negate Attack (14315573). La Sphère est invoquée normalement, le Piège est Posé et le tour est terminé. L'IA invoque Timegazer Magician (20409757) puis déclare une attaque réelle, constatée dans le retour public DOM `combat-lunge`. Le core propose alors Negate Attack dans « RÉPONDRE À LA CHAÎNE » ; le pilote choisit ce bouton. La Chaîne se résout, le Piège rejoint le Cimetière, le duel revient au Main Phase 1 du joueur, les LP restent 8000/8000 et l'UID de la cible subsiste. Ce parcours est passé indépendamment sur desktop et mobile ; le rapport conserve l'offre, les états avant/après et les références publiques.

## Première projection et transitions

Avant chaque capture Réelle, le pilote attend `aria-busy=false`, la couche active, l'absence de transition de caméra, les dimensions CSS3D root/cameraParent correspondant à l'hôte et une matrice/perspective calculée valide, puis deux RAF identiques. La première entrée avant Monster Reborn, puis la vue avec les trois modèles sont vérifiées. Les quatre caméras supplémentaires (diagonale gauche/droite, console, globale) et le cycle Compacte → Arène → Réelle conservent LP, main, identités/UID, positions, ATK/DEF et Cimetière. Une seule scène, un seul canvas WebGL, un seul root CSS3D, un seul plateau et une seule main ; le canvas est conservé pendant les changements. Les rectangles publics projetés et le cadrage sont archivés par état. La vue joueur et la vue globale contiennent les trois centres de zones ; les autres caméras ont leurs rectangles complets enregistrés.

Les 20 captures du parcours principal et les quatre du parcours d'annulation ont été ouvertes et inspectées. Sur mobile, Compacte/Arène affichent le plateau défilable : certaines zones demandent un défilement horizontal/vertical. Les captures Réelles de première entrée et de retour montrent bien les trois modèles ; le scroll des vues précédentes ne décale pas la projection. Sur desktop, la caméra console peut placer une partie des étiquettes de statistiques derrière sa barre ; le rapport certifie leurs valeurs DOM et le cadrage des modèles, pas une lisibilité parfaite de chaque étiquette sous chaque caméra.

## Effets : ce que prouvent les captures

Le contexte annonce `reduced-motion: no-preference`, afin que les effets du renderer puissent être joués. Réanimation et annulation sont réellement résolues par le core et intégrées au parcours de production compilé. Les fichiers nommés `native-revival-motion` montrent déjà l'état après la courte animation : cet audit ne certifie pas les pixels de l'ankh, de la colonne, du sceau de négation, ni la disparition d'un projectile encore visible. La preuve détaillée des profils/temps d'effets et de leurs budgets est distincte dans [l'audit des effets](effects-wave-2026-10-08.md). Les modules de routage, profils et renderer utilisés sont enregistrés avec SHA/tailles ici ; les octets HTTP du build réellement exécuté sont vérifiés avant et après. Les modèles restent des reproductions procédurales documentées, sans revendication d'une géométrie officielle exhaustive 1:1.

## Build et intégrité

Entrée gelée : `/assets/index-BAjs-Biw.js`, **609998 octets**, SHA256 `ab8aece9cffe26026f69778ff4ddf9bba6a0bfc7abbe67435c725df23eed96b7`. Le catalogue est intégré dans cette entrée (marqueurs `/cards/native-unknown.png` et `normal-no-script-needed`) ; le bridge partagé `ocgcore-DWqJvtmv.js` charge le wrapper natif. Aucun chunk autonome NativeCardCatalogue n'est revendiqué.

Les **17 ressources réellement reçues par HTTP** (HTML, tous les JS/CSS émis et les trois archives natives) concordent avec `dist` avant/après, SHA256 et tailles exactes. Les sept essentiels sont :

| Ressource | Octets | SHA256 |
| --- | ---: | --- |
| `index.html` | 35567 | `d146d6c588bd5207c99fff9e2c77b3215e230d55ae986612190c595bc611d08f` |
| `assets/index-BAjs-Biw.js` | 609998 | `ab8aece9cffe26026f69778ff4ddf9bba6a0bfc7abbe67435c725df23eed96b7` |
| `assets/index-CYDbbnpQ.css` | 84286 | `29e128bc7f48c78871612a098b6cfff175098fb60ab19a9c1f42b0f0b9c094e8` |
| `assets/NativeDuelGame-CMcxLKS8.js` | 86287 | `e167d3547e594a26874546f26c03cf03251be4ef85af89363927fb022e5ae48c` |
| `assets/FieldEnvironmentRegistry-Tp8xcD3U.js` | 611689 | `b3159d4f38a47411cd674576f2ed13d18706e35406c77b6ddc1a678ce4dcb800` |
| `assets/RealDuelView-BO5VQkMT.js` | 156240 | `a49774039d88bc071d44bce8ca286f52a80c6347927356645d489f26fb385bb4` |
| `assets/ocgcore-DWqJvtmv.js` | 46501 | `dd1e9936f49901fb5f53efd6d25b19ab5755af65169fee4ef34600a1cfbe5349` |

Le CSP est lu sur la réponse HTML et concorde exactement avec les en-têtes de production ; `wasm-unsafe-eval` est permis et `unsafe-eval` absent. Le hook `window.__YGO_QA__` est absent avant/après. Les cartes adverses cachées restent anonymes dans le DOM public. Les 16 dépendances sources et le pilote ont été revérifiés à la revue finale et concordent avec leurs empreintes de début de session. Le snapshot compilé et les réponses HTTP sont identiques avant/après. Aucun changement application ou rebuild pendant ce travail.

Le premier échec provenait du pilote ancien : il sélectionnait/désélectionnait une Zone au lieu de cliquer **CONFIRMER (1/1)**. Le DOM natif était correct. Le nouveau pilote traite la confirmation et attend deux RAF ; le diagnostic et sa capture restent séparés dans [diagnostic-before-place-confirmation](artifacts/native-wave-ui-2026-10-08/diagnostic-before-place-confirmation/driver-initial-diagnostic.json). Aucun correctif application n'en découle ; les anciens scripts et preuves sont conservés.

## Reproduction et preuves

```sh
python scripts/audit-native-wave-ui.py --expected-entry-sha256 ab8aece9cffe26026f69778ff4ddf9bba6a0bfc7abbe67435c725df23eed96b7
```

[Rapport JSON et empreintes des 24 captures](artifacts/native-wave-ui-2026-10-08/report.json) — SHA256 `d6582a57edb07c35d8994112d34842f1cdf1b2f16b7d4a0983f0a3fe95d7b2e3`. Pilote : SHA256 `60661a551b648802655d1c78a685adbbaea94015b18273ac5a7cf2ca837bd475`. Les fixtures complètes, choix obligatoires, offres de Chaînes, états publics, cadrages et matrices de projection sont dans ce rapport. Cette vague certifie les états nommés et ces deux parcours natifs aux deux tailles ; elle ne certifie pas toutes les interactions du duel ou tous les Terrains en interface.
