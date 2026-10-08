# Pièges-Monstres dans le navigateur — 8 octobre 2026

**PASS sur desktop 1280×900 et mobile 390×844**, après `BUILD_FINAL2`, avec les illustrations réelles et les deux nouveaux modèles. Le [rapport final](artifacts/native-chain-ui-2026-10-08/report.json) provient de `python scripts/audit-native-chain-ui.py --final`, sur le `dist` déjà construit et figé. Les preuves du [7 octobre](native-chain-ui-2026-10-07.md) sont conservées.

Le parcours utilise un Main Deck personnalisé de 40 cartes, au plus trois copies par identité, aucun Extra ni Side, sauvegardé avant démarrage dans un contexte navigateur isolé. Le constructeur valide ce Deck. Le flux cryptographique déterministe partagé affecte le vrai mélange initial ; aucun objet de jeu, réponse moteur injectée, hook QA ou fixture après démarrage n'est utilisé. Les interactions passent par les contrôles affichés, dont le focus et Entrée sur les zones propres projetées en Réelle.

Les deux Pièges sont posés au premier tour. Après un vrai tour adverse, Slime est activé et invoqué en Défense dans une Zone Monstre native. Au tour propre suivant, son menu propose légalement le changement de position ; il passe en Attaque. Apophis est ensuite activé et invoqué en Défense. Les deux Zones Magie/Piège sont libérées. Les choix de chaîne, zone et position sont archivés dans le rapport.

| Carte | Projection native vérifiée dans les deux tailles |
| --- | --- |
| Metal Reflect Slime `26905245` | Monstre, `Trap Effect Monster`, WATER, ATK 0 / DEF 3000, dix étoiles, Défense après invocation puis Attaque au tour suivant. |
| Embodiment of Apophis `28649820` | Monstre, `Trap Normal Monster`, EARTH, ATK 1600 / DEF 1800, quatre étoiles, Défense choisie dans le dialogue natif. |

Les quatre contrôles des limites ATK/DEF passent : le texte et ses spans restent dans l'inspecteur. Les noms/types/attributs et badges sont lus uniquement dans les éléments publics. Les trois vues Compacte, Arène et Réelle, puis les trois caméras Joueur, Diag. G et Console, conservent les mêmes monstres, statistiques, positions et zones. Le contrôle des cartes cachées adverses vérifie l'absence d'identité, de statistiques privées et d'illustration recto. Le Deck enregistré reste identique après le parcours.

Les **six JPEG locaux** sont réellement chargés avec HTTP 200 : chaque carte a sa référence complète 813×1185, son crop 624×624 et sa variante small 268×391. L'inspecteur décode la référence complète et l'hologramme 2D décode le crop exact. Le modèle de Vue Réelle utilise ses primitives et couleurs de sommets ; ses détails, ses budgets de 4700 triangles/4 draw calls pour Slime et 5980/5 pour Apophis, ses poses mécaniques et sa libération complète sont documentés dans l'[audit des modèles](trap-monster-models-2026-10-08.md).

Avant les captures Réelle, le harness attend un affichage actif, sans changement de caméra en cours, avec host/CSS3D/cameraElement de mêmes dimensions, matrices finies avec perspective et stabilité sur **deux frames d'animation**. Les trois presets ont un canvas et une barre caméra dans les limites du host ; leur bouton sélectionné est visible dans le viewport et reçoit réellement le pointeur. Le rapport conserve les rectangles et matrices DOM publiques. En desktop, host/canvas/CSS3D/cameraElement mesurent **840×820** ; en mobile, **390×560**, `scrollTop=scrollLeft=0`.

Trois cycles supplémentaires Compacte → Arène → Réelle passent par taille, sans modifier le duel ni créer de contexte WebGL supplémentaire. Les compteurs GPU restent à **215 buffers, 6 textures, 15 programmes, 0 shader vivant, 4 framebuffers, 1 renderbuffer et 117 vertex arrays**, pour chaque cycle et chaque taille. Le renderer Réelle est volontairement conservé dans le cache en Compacte ; cette preuve porte sur l'absence de croissance sur les cycles, et la preuve de libération complète des modèles est séparée.

Les **24 captures positives** ont été examinées avec `view_image` ; la [trace d'inspection et leurs SHA-256](artifacts/native-chain-ui-2026-10-08/visual-inspection.json) distingue les 12 images identiques à une inspection précédente des 12 images finales rouvertes.

| Capture | Desktop | Mobile |
| --- | --- | --- |
| Enregistrement | [1280](artifacts/native-chain-ui-2026-10-08/chain-registration-1280.png) | [390](artifacts/native-chain-ui-2026-10-08/chain-registration-390.png) |
| Pièges posés | [1280](artifacts/native-chain-ui-2026-10-08/chain-set-1280.png) | [390](artifacts/native-chain-ui-2026-10-08/chain-set-390.png) |
| Slime après invocation résolue | [1280](artifacts/native-chain-ui-2026-10-08/chain-slime-native-summon-pose-1280.png) | [390](artifacts/native-chain-ui-2026-10-08/chain-slime-native-summon-pose-390.png) |
| Inspecteur Slime | [1280](artifacts/native-chain-ui-2026-10-08/chain-slime-details-1280.png) | [390](artifacts/native-chain-ui-2026-10-08/chain-slime-details-390.png) |
| Apophis après invocation résolue | [1280](artifacts/native-chain-ui-2026-10-08/chain-apophis-native-summon-pose-1280.png) | [390](artifacts/native-chain-ui-2026-10-08/chain-apophis-native-summon-pose-390.png) |
| Inspecteur Apophis | [1280](artifacts/native-chain-ui-2026-10-08/chain-apophis-details-1280.png) | [390](artifacts/native-chain-ui-2026-10-08/chain-apophis-details-390.png) |
| Compacte | [1280](artifacts/native-chain-ui-2026-10-08/chain-compact-1280.png) | [390](artifacts/native-chain-ui-2026-10-08/chain-compact-390.png) |
| Arène | [1280](artifacts/native-chain-ui-2026-10-08/chain-arena-1280.png) | [390](artifacts/native-chain-ui-2026-10-08/chain-arena-390.png) |
| Réelle | [1280](artifacts/native-chain-ui-2026-10-08/chain-real-1280.png) | [390](artifacts/native-chain-ui-2026-10-08/chain-real-390.png) |
| Caméra Joueur | [1280](artifacts/native-chain-ui-2026-10-08/chain-real-camera-player-1280.png) | [390](artifacts/native-chain-ui-2026-10-08/chain-real-camera-player-390.png) |
| Caméra Diag. G | [1280](artifacts/native-chain-ui-2026-10-08/chain-real-camera-diagonal-left-1280.png) | [390](artifacts/native-chain-ui-2026-10-08/chain-real-camera-diagonal-left-390.png) |
| Caméra Console | [1280](artifacts/native-chain-ui-2026-10-08/chain-real-camera-console-1280.png) | [390](artifacts/native-chain-ui-2026-10-08/chain-real-camera-console-390.png) |

Les fichiers appelés `native-summon-pose` montrent les modèles après l'invocation native résolue, sans dialogue devant le canvas. Ils ne certifient pas un frame d'animation active. Slime ne peut pas attaquer selon sa règle officielle ; aucune attaque de Slime n'est jouée ici. Les caméras de duel montrent notamment le dos des monstres propres orientés vers l'adversaire ; les détails de face sont examinés séparément dans les triptyques source/ancien/nouveau de l'audit des modèles. Profondeur et proportions sont adaptées, sans promesse de fidélité spatiale intégrale 1:1.

Deux limites visuelles restent visibles dans les captures : en Console desktop, certains badges flottants de statistiques passent partiellement derrière la barre caméra, et les cadrages Compacte/Arène mobile montrent seulement la portion courante du plateau défilable. Les valeurs de l'inspecteur restent complètes dans les deux tailles.

Le résultat final contient **zéro erreur JavaScript, zéro requête échouée pour les ressources natives/cartes/bundles et zéro violation CSP**. La CSP de production autorise `wasm-unsafe-eval` et n'autorise pas `unsafe-eval` JavaScript. Les **23 fichiers compilés/art** et les deux scripts de l'audit gardent leurs empreintes avant/après.

| Élément figé | SHA-256 |
| --- | --- |
| `/assets/index-DNwe3FSS.js` | `38c428237545d8290e07229c5efdda93441dd1088234c31e64aa6ef3f8b59321` |
| WASM | `0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026` |
| `audit-native-chain-ui.py` | `a16f297df2c3e92e72076136c188ea24e2ccdf0573ea746902c40115e7b29fca` |
| Helper `audit-native-duel-ui.py` | `0dd4443ef82f496fb398587b9be06c99d953f57c4a48e48cd470fdacbb311c18` |

Les essais préalables sont conservés séparément : [délai 40 s](artifacts/native-chain-ui-2026-10-08/preflight-40s-report.json), [deux variantes small manquantes](artifacts/native-chain-ui-2026-10-08/preflight-missing-small-art-report.json) et [capture interceptée par un dialogue](artifacts/native-chain-ui-2026-10-08/preflight-overlay-frame-report.json). Ils ne sont pas comptés comme réussites. L'audit utilise désormais un délai de retour natif de 120 s sans changer ses critères, et capture après la résolution visible de la chaîne. Les deux assets small et le correctif de scroll mobile ont été intégrés par root avant `BUILD_FINAL2`. La dernière relance renforce aussi la stabilité CSS3D sans changement applicatif ni rebuild.
