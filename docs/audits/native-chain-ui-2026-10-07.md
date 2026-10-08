# Pièges-Monstres dans le navigateur — 7 octobre 2026

Le parcours public de **Metal Reflect Slime et Embodiment of Apophis passe sur desktop 1280×900 et mobile 390×844**, avec le bundle final figé `index-CkdHwDWv.js`. Les deux cartes sont posées puis réellement activées, Slime change légalement de position au tour suivant, et les trois vues conservent les mêmes zones, positions, catégories, attributs et statistiques publiques.

Le [rapport structuré](artifacts/native-chain-ui-2026-10-07/report.json) et les 14 captures du dossier proviennent de [audit-native-chain-ui.py](../../scripts/audit-native-chain-ui.py). Le contrôle `--final` passe également : les spans ATK/DEF et leur texte restent dans les limites de l’inspecteur, pour les deux monstres et les deux tailles. Le rapport intermédiaire antérieur est conservé séparément dans [report-intermediate.json](artifacts/native-chain-ui-2026-10-07/report-intermediate.json).

## Parcours réellement joué

Chaque navigateur isolé reçoit uniquement un Deck personnalisé sauvegardé dans `localStorage` et le flux cryptographique déterministe partagé par les audits publics. Le Deck possède 40 cartes de Main, aucun Extra ni Side, et au plus trois exemplaires de chaque identité imprimée. Le constructeur affiche « Deck valide » en Duel libre natif. Le Deck sauvegardé garde exactement ses IDs et son ordre après le mélange initial et après le parcours.

Le joueur choisit de commencer depuis le vrai dialogue, avec IA facile. La première main mélangée contient Slime, Apophis, La Jinn, Waboku et Negate Attack. Les mouvements suivants utilisent exclusivement les contrôles rendus :

1. Tour 1 : sélection de Slime et Apophis depuis la main, deux destinations légales et bouton « Poser face cachée ».
2. Fin de tour réelle, actions de l’IA et pioche suivante. Les réponses facultatives proposées sont passées par le bouton visible de priorité.
3. Tour 3 : sélection du Piège Slime posé, menu « Activer face recto », puis choix d’une Zone Monstre native. Slime entre face recto en Défense et libère sa Zone Magie/Piège.
4. Nouveau tour de l’IA puis retour au joueur, tour 5 : menu du Monstre et « Changer la position de combat ». Slime passe réellement de Défense en Attaque.
5. Tour 5 : activation du Piège Apophis posé, choix de Zone Monstre et « Défense face recto ». La seconde Zone Magie/Piège est libérée.
6. Passage Compacte → Arène → Réelle → Compacte avec le bouton de vue. Les deux monstres, leurs statistiques et leurs positions restent identiques ; le canvas WebGL est visible uniquement dans la Vue Réelle.

| Carte publique | Contrat vérifié dans les deux tailles |
| --- | --- |
| Metal Reflect Slime, `26905245` | Catégorie `monster`, type `Trap Effect Monster`, hologramme `attr-water`, ATK 0, DEF 3000, dix étoiles natives. Défense après Invocation, puis Attaque au tour 5. |
| Embodiment of Apophis, `28649820` | Catégorie `monster`, type `Trap Normal Monster`, hologramme `attr-earth`, ATK 1600, DEF 1800, quatre étoiles natives, position de Défense choisie explicitement. |

Le texte de type et les statistiques sont lus dans l’inspecteur public ; les attributs et badges ATK/DEF sont lus dans les hologrammes publics. Aucun objet de jeu, pointeur WASM, réponse native injectée, hook QA, fixture après démarrage ou état privé adverse n’est utilisé. Les données enregistrées omettent les UID du duel. Trois cartes adverses encore cachées sont contrôlées pour l’absence d’identité, de statistiques, d’illustration recto et d’étiquette privée.

## Captures examinées

Les 14 captures positives ont été ouvertes et examinées. Les illustrations de Slime et Apophis utilisent le visuel neutre local du catalogue natif ; il ne s’agit pas de leur illustration officielle. Les caractéristiques et noms restent exacts. La Vue Réelle représente Slime avec le modèle Aqua cyan et Apophis avec le modèle Reptile doré.

| Capture | Desktop | Mobile |
| --- | --- | --- |
| Pièges posés | [1280](artifacts/native-chain-ui-2026-10-07/chain-set-1280.png) | [390](artifacts/native-chain-ui-2026-10-07/chain-set-390.png) |
| Slime dans l’inspecteur | [1280](artifacts/native-chain-ui-2026-10-07/chain-slime-details-1280.png) | [390](artifacts/native-chain-ui-2026-10-07/chain-slime-details-390.png) |
| Apophis dans l’inspecteur | [1280](artifacts/native-chain-ui-2026-10-07/chain-apophis-details-1280.png) | [390](artifacts/native-chain-ui-2026-10-07/chain-apophis-details-390.png) |
| Compacte | [1280](artifacts/native-chain-ui-2026-10-07/chain-compact-1280.png) | [390](artifacts/native-chain-ui-2026-10-07/chain-compact-390.png) |
| Arène | [1280](artifacts/native-chain-ui-2026-10-07/chain-arena-1280.png) | [390](artifacts/native-chain-ui-2026-10-07/chain-arena-390.png) |
| Réelle | [1280](artifacts/native-chain-ui-2026-10-07/chain-real-1280.png) | [390](artifacts/native-chain-ui-2026-10-07/chain-real-390.png) |

Sur mobile, l’inspecteur est atteint par le défilement normal et les captures de détails montrent toutes les valeurs. Le plateau Compacte/Arène est prévu pour défiler ; les labels de zone situés hors du cadrage ne sont pas présentés comme une disparition de la carte. Le canvas Réelle donne une vue d’ensemble des deux créatures. La preuve ne lit pas les objets internes WebGL ; elle compare les projections DOM publiques et le canvas visible, complétés par l’examen des captures.

Le préflight intermédiaire révélait une troncature réelle sur desktop : ATK 0 débordait à gauche de l’inspecteur lorsque les dix étoiles de Slime partageaient sa ligne. La [mesure avant correction](artifacts/native-chain-ui-2026-10-07/inspector-bounds-before.json) conserve le span ATK 0 de 33 px hors du cadre ; `--final` refusait cet ancien bundle. Dans le bundle final, ATK/DEF gardent leur ligne et les étoiles occupent la ligne suivante. Les quatre contrôles de bornes passent, et les captures de détails montrent les valeurs complètes sur desktop et mobile.

## Empreintes du bundle final

Les huit fichiers compilés surveillés ont les mêmes tailles et SHA-256 avant et après les deux parcours. Les rapports chaînes, général et Pendule contiennent les mêmes huit empreintes et `immutableCompiledSnapshot: true`.

| Fichier testé | SHA-256 |
| --- | --- |
| HTML | `9092b61cae2f9f267fc6f35c4f90594220bc123ff9681d9b251e5973b1c1c06f` |
| `/assets/index-CkdHwDWv.js` | `7173898cef8206cb9f0e12525376ad03e857a22e40fca40ea97c0623e0fdb9fd` |
| `/assets/index-BbUkbKmn.css` | `71afb732ab7152dc319dfb6b72812913e23121c24f251ef80e0b69c61e0e749e` |
| `/assets/NativeDuelGame-ZSLU0meg.js` | `292967a9fa2eab1eed43a2f0ce172a3e1364eeb86f1c66d1a63e55fb49777980` |
| WASM | `0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026` |

La source de façade finale est `21e568426e8069e5fe91de8d332d248f3f7a98711c6108b58b558f3a9abc7166`. Le bundle inclut les correctifs de nom courant de Pseudo Space, d’événement public de Terrain et de lisibilité de l’inspecteur. Les [25 preuves de chaînes](native-chain-interactions-2026-10-07.md) documentent séparément leurs résultats natifs ; le scénario navigateur porte sur les deux Pièges-Monstres, sans attribuer une preuve GUI à Pseudo Space.

Résultat final : **zéro erreur JavaScript, zéro requête native échouée et zéro violation CSP**, sur les deux tailles. Le navigateur charge réellement le WASM, `card-data.json` et `scripts.json`. La CSP de production autorise `wasm-unsafe-eval` et garde `unsafe-eval` JavaScript absent. Le hook de développement est absent.

Une première tentative finale a expiré pendant la capture WebGL desktop, avec un délai de 30 secondes ; la capture de diagnostic a également expiré. Les contrôles de duel et de bornes déjà exécutés passaient, mais cette tentative n’est pas comptée comme une réussite. Le script utilise désormais explicitement 60 secondes pour les captures, sans modifier les assertions. La relance intégrale desktop/mobile passe et fournit les 14 captures finales examinées. La cause de cette expiration n’est pas établie.

Les trois commandes ont été relancées après `BUILD_FINAL`, dans cet ordre : `python3 scripts/audit-native-chain-ui.py --final`, `python3 scripts/audit-native-duel-ui.py`, puis `python3 scripts/audit-native-pendulum-ui.py`. Elles utilisent le même `dist` figé. Aucun build, changement applicatif ou publication n’a été effectué par cet audit.
