# Trois anatomies de monstres — 8 octobre 2026

La Jinn (97590747), Mystical Elf (15025844) et Beaver Warrior (32452818), présents dans les cartes de départ et les fixtures publiques de duel, quittent leurs anciennes silhouettes de famille. Le catalogue passe de 22 à 25 profils exacts. Les illustrations existantes ont été ouvertes avant la construction ; les modèles utilisent de vraies primitives et couleurs de sommets, sans texture de carte plaquée.

## Motifs reproduits et portée

- **La Jinn** : peau verte musclée, tête chauve à petit bonnet bleu/rouge/or, moustache et barbe fines, yeux fermés, bijoux dorés, poings et volute verte amincie avec spirales pâles. Le précédent squelette ailé violet était sans rapport avec l’illustration. Aucune lampe ou paire de jambes n’est inventée d’après le nom.
- **Mystical Elf** : peau bleue, visage serein aux yeux clos, cheveux blonds longs, coiffe blanche courbe en V, mains et doigts joints, croissants blancs aux épaules. L’illustration montre un buste : la continuation en robe verte est une extrapolation déclarée. Le précédent chapeau de mage et bâton ont disparu.
- **Beaver Warrior** : corps et museau violets, yeux rouges et deux incisives, oreilles pointues, casque/armure/bottes bleus, lame pentagonale avec gemme verte, bouclier épais à deux ouvertures réelles et queue fine segmentée. La lame reste du côté de l’illustration. Le précédent guerrier humain doré ne décrivait pas cette anatomie.

La profondeur, les proportions de plein corps, les surfaces facettées et les faces cachées sont adaptées au rendu 2,5D. Les détails fins du visage, de la musculature et du relief du bouclier restent simplifiés. Ces modèles ne constituent pas une reproduction spatiale intégrale 1:1. Les JPEG archivés constituent la référence exacte de cette comparaison.

## Résultat mesuré

| Carte | Nouveau profil | Ancien profil au commit de référence | Triangles | Appels de dessin |
|---|---|---|---:|---:|
| 97590747 | la-jinn | generic-fiend-dark | 4744 | 4 |
| 15025844 | mystical-elf | generic-magician-light | 4752 | 4 |
| 32452818 | beaver-warrior | generic-warrior-earth | 4052 | 5 |

Ces chiffres proviennent de `WebGLRenderer.info.render` et des géométries réellement rendues aux trois angles, au repos et en action. Les variantes de défense sont aussi contrôlées par les tests : au plus 5 lots et 6000 triangles. Aucun passage d’ombre n’est activé dans la galerie ; les matériaux de profondeur/distance du rig sont cependant présents et leur libération est mesurée.

Les mains de l’Elf partagent le joint STAFF ; le poing, le bras et la lame de Beaver utilisent WEAPON. Les positions géométriques ne sont pas renvoyées au GPU pendant la pose, les palettes restent stables et les uniforms demeurent finis. Les propriétés de surface de ces trois modèles sont adaptées à la peau/aux cheveux/à l’ivoire, avec les valeurs précédentes conservées par défaut pour les anciens modèles. Les familles et profils d’attaque existants restent respectivement `fiend/impact`, `magician/dark-magic` et `warrior/blade`.

## Vérification réelle

```sh
node --test --test-isolation=none test/hologram-reference-anatomy.test.js test/hologram-pose-animation.test.js test/real-duel-hologram-models.test.js
python scripts/audit-model-wave.py
```

- Tests ciblés : **21 réussis, 0 échec, 0 ignoré**. Les deux nouveaux tests couvrent l’identité publique, les palettes, la profondeur du corps, les joints, les positions/normales finies, les budgets attaque/défense et la libération des ressources.
- Chromium/SwiftShader : **18 captures réelles**, 3 monstres × face/trois-quarts/profil × repos/action à 0,4, avec les mêmes caméra, éclairages, matériaux de scène et taille de viewport pour ancien et nouveau modèle.
- Baseline : `251fec0197ed85e40bca2af03e4431db1fef11e5` ; ses modules sont servis directement par `git show`, tandis que les nouveaux modules sont ceux du workspace. Aucun build global, commit ou publication n’a été exécuté pour cet audit.
- Les six JPEG crop/small sont effectivement chargés/décodés dans Chromium. Aucune erreur navigateur ou requête échouée. Les sources et illustrations ont les mêmes empreintes avant et après les captures.
- Les 18 triptyques finaux ont été ouverts avec `view_image`. L’inspection initiale a conduit à relier les bottes de Beaver, supprimer le chevauchement du plastron, affiner la coiffe de l’Elf, raccorder sa robe et amincir la volute du génie avant ces captures finales.
- Pour les six modèles ancien/nouveau, tous les événements `dispose` attendus surviennent, y compris sur les matériaux d’ombre partagés. Après retrait : **0 géométrie et 0 texture** dans la mémoire WebGL ; après libération du renderer : **0 programme**. Le rig est marqué libéré, puis le contexte est perdu explicitement.

La pose à 0,4 prouve l’articulation mécanique du modèle, sans certifier une attaque native ni un effet de carte nouveau. Cette galerie utilise les modules source et ne remplace pas la QA finale de l’application compilée.

## Captures et preuves

- [Mesures JSON](artifacts/model-wave-2026-10-08/measurements.json), SHA256 `16dcbec3ac3972e7ddb25425bafbe8d89cb1e14247fad6e2bdcb20c2397218cb`.
- [Inspection des 18 captures](artifacts/model-wave-2026-10-08/visual-inspection.json), SHA256 `1a19eef650661a17cc2e7903c63c0c983963af2b196910e389f222dca8905a76`.
- [La Jinn — face au repos](artifacts/model-wave-2026-10-08/97590747-front-rest.png), [trois-quarts en action](artifacts/model-wave-2026-10-08/97590747-three-quarter-attack.png), [profil en action](artifacts/model-wave-2026-10-08/97590747-side-attack.png).
- [Mystical Elf — face au repos](artifacts/model-wave-2026-10-08/15025844-front-rest.png), [trois-quarts en action](artifacts/model-wave-2026-10-08/15025844-three-quarter-attack.png), [profil en action](artifacts/model-wave-2026-10-08/15025844-side-attack.png).
- [Beaver Warrior — face au repos](artifacts/model-wave-2026-10-08/32452818-front-rest.png), [trois-quarts en action](artifacts/model-wave-2026-10-08/32452818-three-quarter-attack.png), [profil en action](artifacts/model-wave-2026-10-08/32452818-side-attack.png).

Les autres angles/poses et chaque empreinte PNG figurent dans le JSON. Les rapports précédents Slime/Apophis et Chain UI datés du 7/8 octobre sont préservés.

## Provenance transitive des modules

L’audit suit toutes les importations ESM des modèles/animations, y compris Three et BufferGeometryUtils. La même fermeture transitive est archivée pour le commit de référence. Le fichier de test modifié a pour SHA256 `610fe04395b847f4cbe07b1f4ca7c1d02092c7ec9fd21cff4a5c16819a3e8ca1`.

| Fichier réellement utilisé | SHA256 |
|---|---|
| `node_modules/three/build/three.core.js` | `eb077d2417f61d3e6d9264c317cabc4ea35769ed6b0ab533067292a550784c20` |
| `node_modules/three/build/three.module.js` | `c8211c69345d2e9949dc7a8ac969380497aa0600a5a8ac6a459c8cd02dd9cb8a` |
| `node_modules/three/examples/jsm/utils/BufferGeometryUtils.js` | `fda7e946b8e0b5ab39b779206589e7a1079a22eb24efb89d7223e03fdfb1f751` |
| `src/ui/CombatVisualProfiles.js` | `17eccd4166d0bf142cb264100bf7b0c0e334f96b966a041259ceb6ad98c5e11f` |
| `src/ui/FieldSpellEnvironmentCatalog.js` | `37bf5157ca5a8fbfb6c1d93898a3d2efcb3fd620b3c5e61e63f26d46225aee33` |
| `src/ui/FieldSpellReferenceArtPalettes.js` | `39d7a5073366407942497b92de7afe5e319b87957edb19068671bee83f7fbb88` |
| `src/ui/HologramMonsterModels.js` | `934b5b07bcbb035d5b2354783fe599bd8e4e572ffeb737e5ba2f7f67f460135b` |
| `src/ui/HologramPoseAnimation.js` | `0fd60c0f319ee7a413049ac05199d44e06ab356a94174bc2dc35958b22b8729c` |
| `src/ui/HologramReferenceAnatomy.js` | `ef5f77fa3df875df02007323b9756b8e8b0f257cfe751d6e95fdb31470af24fe` |
| `scripts/audit-model-wave.py` | `ff416b2799040f808730ca1a1cd1834687d51011e2e69304bc93ec46f6f2e55c` |
| `package.json` | `fd474067a364cdd85f372a57555e92b47c2a66f064bf299ca1ee29f334400d4e` |
| `package-lock.json` | `5e139fa57cab722513f61d244ae90cf1eda873a4edd84810ce6e64e19b909810` |
| `node_modules/three/package.json` | `aa42494664dba4cf76d89c6975ee38321a402f09a048672e190bad6f13beec93` |

## Illustrations archivées et inspectées

| Carte | Variante | Dimensions | Octets | SHA256 |
|---|---|---|---:|---|
| 97590747 | cropped | 624×624 | 98527 | `64185c1dcbb5446ddfdfe2b5e6e23f98109f91f6889a369ad78f68380f717374` |
| 97590747 | small | 268×391 | 23132 | `9badc06982c5fa131ee2252b1e454701598a2529841bc5f85688fd060c8abe41` |
| 15025844 | cropped | 624×624 | 63708 | `8c8af1fe5a9442fa57115e5ac4b8244c71242c00974e171d4c630b2034d586c2` |
| 15025844 | small | 268×391 | 20231 | `a06f827ea1d035f3e0ddc835cb71b7aae45483eba904bf0ddcdc797d2e3dbd43` |
| 32452818 | cropped | 624×624 | 98870 | `26e5dfde049976291121af687690e9691255bafd1042a94b5d148508ae6daa71` |
| 32452818 | small | 268×391 | 25092 | `cc52fd3c4edc3286a0767668c91791de65d9e5fd3820615cb6cc6285b8832415` |
