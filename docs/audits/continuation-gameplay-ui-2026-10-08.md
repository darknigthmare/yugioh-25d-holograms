# Ravine, Gateway et échelles MR5 dans l’application compilée — 8 octobre 2026

**Six parcours réels passent**, trois sur **1280 × 900** et les mêmes trois sur **390 × 844**. Ils utilisent le build final gelé par le coordinateur, des Decks de 40 cartes enregistrés avant le démarrage et uniquement les contrôles visibles. Les dix-huit captures ont été inspectées visuellement.

Entrée compilée : `assets/index-XmnwEEBj.js`, SHA-256 `799145520bfd285b788d5f6573dde6a557ef82dadda4645a697f97f5d60882be`. [Rapport et traces DOM](artifacts/continuation-gameplay-ui-2026-10-08/report.json), SHA-256 `9ca27559d654768545c3540f31218d0bfdf4088803760052328af4fc654b4dc7`.

## Comportements vérifiés

| Parcours | Actions réellement jouées | Résultat observé |
| --- | --- | --- |
| Dragon Ravine | Activation du Terrain ; activation de son effet ; défausse du Magicien Sombre ; sélection clavier du second effet ; sélection du Dragon Blanc dans le Deck | Les deux options reprennent exactement `strings[1:3]` de la CDB officielle. Le coût passe au Cimetière avant le choix. Le Dragon Blanc rejoint réellement le Cimetière, le Deck passe de 35 à 34 et la commande une fois par tour disparaît. |
| Échelles MR5 | Dragonpulse Magician en Zone Magie/Piège 0 ; Dragonpit Magician en Zone 4 ; MST dans la Zone 2 ; sélection de Dragonpulse | La gauche seule ne fournit pas de procédure Pendule ; les deux cartes occupent les deux zones extérieures distinctes. Après MST, la gauche est vide, la droite conserve Dragonpit et Dragonpulse apparaît face recto dans l’Extra Deck. Seul MST rejoint le Cimetière. |
| Gateway of the Six | Activation de Gateway ; invocation normale de Kageki ; son effet invoque un Kizan ; invocation spéciale native du second Kizan ; Foolish Burial envoie Great Shogun Shien ; ouverture/annulation/réouverture du menu ; sélection de la recherche | Trois effets aux libellés CDB distincts sont proposés après les trois invocations réelles. ANNULER préserve strictement l’état public, puis les mêmes options peuvent être rouvertes. L’effet à quatre compteurs ajoute réellement Kageki à la main. Le menu ne propose ensuite que l’effet à deux compteurs. |

Les trois effets Gateway proposés permettent de constater leur disponibilité native ; ce parcours n’exécute que la recherche à quatre compteurs. L’audit ne lit aucun compteur à travers un objet de moteur. Le résultat et l’offre restante confirment le coût et la disponibilité dans l’interface, tandis que les compteurs exacts sont vérifiés dans [le lot de gameplay natif](continuation-gameplay-2026-10-08.md).

L’annulation testée ferme le **menu public des actions natives**. Le rejet d’une réponse absente au callback interne préalable au lancement de l’effet appartient aux tests du runtime ; cet audit navigateur ne revendique pas l’avoir provoqué depuis l’interface.

## Captures

- Ravine : [options ordinateur](artifacts/continuation-gameplay-ui-2026-10-08/gameplay-ravine-official-options-1280.png), [options mobile](artifacts/continuation-gameplay-ui-2026-10-08/gameplay-ravine-official-options-390.png), [résultat mobile](artifacts/continuation-gameplay-ui-2026-10-08/gameplay-ravine-resolved-390.png).
- Échelles : [deux zones ordinateur](artifacts/continuation-gameplay-ui-2026-10-08/gameplay-scales-paired-outer-zones-1280.png), [deux zones mobile](artifacts/continuation-gameplay-ui-2026-10-08/gameplay-scales-paired-outer-zones-390.png), [destination Extra face recto](artifacts/continuation-gameplay-ui-2026-10-08/gameplay-scales-face-up-extra-390.png).
- Gateway : [trois effets ordinateur](artifacts/continuation-gameplay-ui-2026-10-08/gameplay-gateway-three-official-effects-1280.png), [trois effets mobile](artifacts/continuation-gameplay-ui-2026-10-08/gameplay-gateway-three-official-effects-390.png), [recherche résolue](artifacts/continuation-gameplay-ui-2026-10-08/gameplay-gateway-resolved-390.png).

Les cartes natives sans illustration locale affichent le visuel neutre déclaré : notamment les échelles et les Samurai de ce Deck. Leurs textes et choix proviennent de la CDB. Cet audit ne présente pas ce fallback comme une reproduction de leurs illustrations.

Sur mobile, certains éléments du journal et de la barre d’actions dépassent la hauteur des captures de viewport. Les commandes nécessaires ont effectivement été atteintes et cliquées par le navigateur, avec son défilement normal. Les options Ravine et le menu Gateway sont visibles et lisibles dans leurs captures. Ce contrôle ne certifie pas la lisibilité simultanée de tous les éléments du plateau.

## Build, routage et confidentialité

Les **17 corps HTTP** — index, fichiers JS/CSS et trois ressources natives — possèdent exactement les tailles et SHA-256 du répertoire compilé avant et après l’audit. La CSP appliquée est celle de `vercel.json`, avec autorisation WASM et sans JavaScript `unsafe-eval`. Les fichiers du build restent identiques pendant toute l’exécution.

Chaque duel conserve le même canvas, une seule scène, un seul plateau et une seule main. Les états 3D capturés attendent une projection publique stable pendant deux frames. Aucun accès à `game`, au core, aux états privés adverses ou à une API QA ; aucun état ou réponse native n’est injecté après le démarrage. Les ressources WASM, CDB et scripts officiels sont réellement chargées. Zéro erreur JavaScript, requête de ressource échouée ou violation CSP.

Les deux boutons d’options Ravine mesurent **44 px de haut sur ordinateur** et **50 px sur mobile**, et restent entièrement dans la largeur du viewport. Le second effet est sélectionné avec Entrée sur le bouton réellement proposé. Les propres Decks enregistrés restent inchangés après le duel ; les éventuelles cartes adverses face cachée restent sans identité DOM révélée.

Les fixtures respectent 40 cartes et au plus trois copies, dans le mode **Duel libre natif**. Elles ne certifient pas un Deck réglementaire TCG Advanced ni toutes les interactions possibles. La seule branche Ravine résolue ici envoie un Dragon ; l’autre libellé est vérifié, sans revendiquer une seconde résolution navigateur. Le parcours d’échelles vérifie les zones et la destination de destruction ; une nouvelle invocation Pendule complète n’est pas revendiquée.

## Reproduction

[audit-continuation-gameplay-ui.py](../../scripts/audit-continuation-gameplay-ui.py) exige l’empreinte de l’entrée gelée et ne construit pas l’application :

```sh
python scripts/audit-continuation-gameplay-ui.py --expected-entry-sha256 799145520bfd285b788d5f6573dde6a557ef82dadda4645a697f97f5d60882be
```

Les empreintes du script, de ses helpers et des dépendances applicatives réellement observées figurent dans le rapport. Ce lot ne modifie pas l’application et ne réalise ni commit ni publication.

Une annotation documentaire après capture corrige le mot « requis » du rapport original ; le callback préalable est annulable. Le runner exécuté, son empreinte, les traces et la clé historique `internalRequiredEffectModalDismissalCertified: false` sont conservés. Le [rapport original](artifacts/continuation-gameplay-ui-2026-10-08/diagnostic-before-limit-terminology/report.json) reste disponible.
