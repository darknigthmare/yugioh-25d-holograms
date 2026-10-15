# Audit visuel indépendant — 15 octobre 2026

Les six présentations contrôlées rendent leurs sujets et effets en vraie géométrie WebGL : Yami seul, les trois couples duelliste/monstre, la rue Prank-Kids et les sept pierres Crystal Beast. Les contrôles source et compilés passent. Les formes restent des interprétations procédurales stylisées ; cet audit ne certifie pas la fidélité 1:1.

## Build et parcours compilés

Le build contient **151 modules**. Entrée `assets/index-BdSgQu77.js` : **974 595 octets**, SHA-256 `784f6b5967c04d18d8ea01239741004a3594bc16ebed7c0fc598808d1fabeed1`. Gel coordinateur : 450 829 octets, SHA-256 `4f8afb0b592df16365c41b5e68b6b0730b1a603550a4dd15aa79554185ad2dca`.

| Contrôle | Résultat |
|---|---|
| Jetons | 9 parcours PASS, 98 captures ; 367 présentations parcourues, 364 modèles réellement dessinés |
| Avatars | 8 parcours PASS, 52 captures ; 192 avatars dessinés dans le studio |
| Empreintes | Dans chaque audit : 1 895 sources et 603 ressources HTTP identiques avant/après au gel (25 compilées, 575 statiques, 3 natives) |
| Erreurs | Aucune erreur page, HTTP, CSP ou requête native ; aucune erreur console inattendue |
| État et confidentialité | Contrôles publics, hook de développement absent, main adverse cachée, état natif conservé pendant le changement d’avatar |

Les quatre scénarios natifs passent avec de vrais Decks et des actions publiques : Scapegoat puis destruction (desktop/mobile), Tetherwolf → Link Spider, Creature Swap puis destruction du Jeton transféré, et Aventurier créé puis détruit. Les parcours avatars vérifient aussi une victoire Exodia légale, la progression, l’export/import, le stockage indisponible, le focus et le repli WebGL. Les erreurs attendues de capacité WebGL sont distinguées des erreurs inattendues.

Les six illustrations passent en **1 280 px et 390 px** : capture, 350 ms de stabilisation, fenêtre stricte de 350 ms sans aucun `clear`, seconde capture et encore 350 ms sans redessin. Les PNG restent identiques. Une rotation change les pixels ; Début retrouve exactement l’image initiale. Hors écran, un nouvel événement natif `IntersectionObserver` faux et un rectangle hors viewport précèdent une fenêtre stricte de 350 ms sans dessin ; le retour à l’écran dessine à nouveau. Le studio d’avatars passe les mêmes pauses strictes sur les deux largeurs.

L’instrumentation délègue les vrais appels et callbacks, sans supprimer de rendu ni lire un objet Game. Les pilotes historiques restent inchangés. L’adaptation en mémoire précise uniquement le nouveau contrat commémoratif : noms, libellé de composition, compteur de sujets et pose « illustration ». Les contrôles natifs, erreurs, HTTP et CSP restent actifs.

## Références et géométrie

La copie AVANT vient de `195fcfdd68055162a9b6f80a6b03d160c5839a03`. Les scans sont inchangés. Les [repères indépendants](artifacts/illustration-compositions-2026-10-15/qa-reference-landmarks.json) et leur [planche](artifacts/illustration-compositions-2026-10-15/qa-reference-landmarks-commemorative.png) décrivent des positions approximatives dans les cadres imprimés.

Les **24 vues AVANT et 24 APRÈS** couvrent face, trois-quarts, profil et dos. Les 171 fichiers `src` mesurés APRÈS correspondent au gel. Les six présentations changent de géométrie ; **11 isolations** montrent séparément les sept sujets commémoratifs et quatre ensembles VFX. Aucun maillage mesuré n’utilise une texture de carte pour simuler un corps. Valeurs et normales sont valides, buffers stables, géométries/textures entièrement libérées après destruction.

La capture réelle confirme Yami devant à droite et Magicien Sombre derrière à gauche, carte/main levées et bâton diagonal ; Kaiba/Dragon Blanc et Joey/Dragon Noir sont aussi présents avec leurs foyers lumineux attachés aux bouches. Prank-Kids conserve quatre grands sujets, un bleu plus petit et des silhouettes d’arrière-plan ; Crystal conserve sept pierres distinctes et leurs étoiles. Le disque opaque d’un essai intermédiaire a été retiré.

Le nouveau cadrage orthographique reprend le rectangle imprimé : la caméra évolue entre les deux versions, sans prétention de comparaison pixel à pixel sous une caméra identique. L’Atlas retire uniquement le socle des deux Tokens groupés : 10 308 triangles Prank et 1 698 Crystal ; en Duel, les modèles conservent 10 964 et 2 354 triangles, socle compris.

La galerie complète couvre **468 modèles** (240 Tokens, 192 avatars, 36 monstres). Seuls les deux Tokens groupés changent. Les **14 393 712 normales** sont unitaires ; buffers et libération des ressources passent. Le budget reste comparé au véritable 11 octobre : maximum **4,992714×** (10 964 contre 2 196 triangles Prank), sous ×5.

## Preuves et limites

Le [manifeste final](artifacts/illustration-compositions-2026-10-15/qa-final-proof-manifest.json) épingle 64 fichiers archivés et 360 fichiers conservés hors dépôt : **82 351 octets**, SHA-256 `bd0f5357876b6b616a144c8bad25d2b81d3af3a9b6a986c3def314bf47e2ac41`.

- Six scènes : [AVANT](artifacts/illustration-compositions-2026-10-15/before/report.json) / [APRÈS](artifacts/illustration-compositions-2026-10-15/after/report.json), six fronts archivés par phase.
- Galerie complète : [AVANT](artifacts/illustration-compositions-2026-10-15/full-models-before-report.json) / [APRÈS](artifacts/illustration-compositions-2026-10-15/full-models-after-report.json).
- [Compilé Jetons](artifacts/illustration-compositions-2026-10-15/browser-compiled-tokens/report.json) : SHA-256 `4819eca423e4c9a3a20aa0ed16e2787082f360fc9d8125e5980d2e050338c75c`.
- [Compilé avatars](artifacts/illustration-compositions-2026-10-15/browser-compiled-avatars/report.json) : SHA-256 `4e0965b5812ffc1b3cc28224dbd7406bdca1a87163ad17e85833a9ccd47fc058`.
- [Recette finale](artifacts/illustration-compositions-2026-10-15/qa-recipe.py.txt) et [recette AVANT](artifacts/illustration-compositions-2026-10-15/qa-before-recipe.py.txt) conservées : résolution des caches Vite isolés, isolations et audits compilés ajoutés ensuite, sans assouplir les assertions. Les essais interrompus sont aussi épinglés hors dépôt.

Visages, coiffures, anatomies, plis et petites figures restent stylisés. Profils, dos et surfaces cachées sont inférés depuis des vues imprimées planes. L’inventaire des miniatures Prank partiellement occultées est interprétatif. Les points approximatifs ne mesurent pas la ressemblance complète des silhouettes ; SwiftShader ne garantit aucun FPS matériel. La fidélité 1:1 complète et l’intégralité des illustrations restent à poursuivre.
