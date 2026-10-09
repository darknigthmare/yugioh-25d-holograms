# Trois modèles dans le duel natif compilé — 8 octobre 2026

Battle Ox (`5053103`), Saggi (`66602787`) et Curse of Dragon (`28279543`) ont été vérifiés dans l’application compilée, aux tailles **1280×900** et **390×844**. L’audit utilise un Duel libre natif, un deck isolé de quarante cartes et une graine initiale enregistrés avant le départ ; toutes les actions suivantes passent par les commandes visibles. Il ne modifie ni le jeu ni ses réponses après le départ.

Le build reste gelé : entrée `dist/assets/index-XmnwEEBj.js`, SHA256 `799145520bfd285b788d5f6573dde6a557ef82dadda4645a697f97f5d60882be`. Aucun build, correctif applicatif ou déploiement n’est exécuté par cet audit.

## Parcours réalisé

1. Le jeu accepte le deck isolé en mode Duel libre natif. Battle Ox est Invoqué Normalement ; Double Summon permet la seconde Invocation Normale de Saggi.
2. Foolish Burial propose réellement `Malédiction du Dragon — Votre Deck`. Cette sélection envoie Curse au Cimetière ; le panneau public du Cimetière confirme son identité avant la Résurrection.
3. Monster Reborn propose réellement `Malédiction du Dragon — Votre Cimetière · Carte 2`. La sélection, le choix offert de la Zone Monstre 3 et la position ATTAQUE FACE RECTO aboutissent à sa Résurrection native. Les trois monstres gardent respectivement **1700/1000**, **600/1500** et **2000/1500** ; les LP restent à 8000 pour chaque joueur.
4. Les cinq caméras Joueur, diagonale gauche, diagonale droite, Console et Globale, puis les trois vues Compacte, Arène et Réelle, préservent les identités/UID, statistiques, LP, main et Cimetière. La vue réelle conserve le même canvas ; un seul plateau, une seule main, une seule scène WebGL et une seule racine CSS3D sont présents.
5. Dans un duel séparé, une vraie Sphère Mystique Lumineuse à 500/500 est Invoquée et Negate Attack est Posé avant le tour adverse. L’IA déclare réellement une attaque ; l’interface propose Negate Attack, qui est choisi. Après sa résolution, la cible garde son UID, les deux camps gardent 8000 LP et le piège se trouve dans le Cimetière public.

Ces deux parcours sont réalisés indépendamment aux deux tailles. La fixture initiale et les décisions offertes figurent dans le rapport ; les observations portent uniquement sur le DOM public, sans inspection d’une main adverse ou d’un objet interne du moteur.

## Résultat et portée visuelle

- **24 PNG inspectés avec `view_image`**, dont 18 états nommés stables. Les autres captures observent la Résurrection, la réponse proposée à l’attaque et son résultat ; leurs noms contenant `motion` ne certifient pas des pixels d’animation transitoire.
- Les trois silhouettes dédiées sont effectivement visibles en volumes dans la vue réelle compilée. Les créatures du joueur sont tournées vers l’adversaire : leurs faces de référence sont examinées séparément dans la [galerie source](continuation-monster-2026-10-08.md).
- Les **17 ressources compilées et natives** — HTML, tous les JS/CSS, WASM, données et scripts — sont récupérées en véritables corps binaires HTTP. Leurs tailles et SHA256 sont exactement ceux du `dist`, avant et après les parcours. Les sept ressources essentielles sont identifiées séparément dans le rapport.
- CSP de production exacte ; `window.__YGO_QA__` absent ; aucun événement d’erreur de page, échec de requête native, violation CSP ou erreur Lua/RETRY observé. Les 19 dépendances source du rapport ont encore leurs mêmes empreintes après l’inspection.
- La première exécution s’est arrêtée parce que le sélecteur du pilote reconnaissait `Curse of Dragon|Dragon Maudit`, mais pas le nom français réellement affiché `Malédiction du Dragon`. Le [rapport, pilote et diagnostic originaux](artifacts/continuation-models-ui-2026-10-08/diagnostic-before-source-name-selection/reason.json) sont archivés. Seules les deux expressions de sélection du pilote ont été corrigées ; le build est identique.

La caméra Console sur desktop superpose partiellement ses badges de statistiques à la barre des caméras. La caméra Globale réduit les modèles et textes, particulièrement sur mobile. Les vues Compacte et Arène mobiles nécessitent le défilement annoncé dans l’interface ; leurs captures initiales ne montrent pas simultanément les trois monstres. Une partie des commandes inférieures et du journal continue sous le viewport mobile. Le corps de page ne déborde pas horizontalement.

La Résurrection native et l’annulation d’attaque sont confirmées par les décisions/résultats publics, mais ces captures n’isolent **ni l’Ankh de Résurrection, ni un projectile d’attaque, ni le sceau brisé**. Ces effets restent couverts séparément par les galeries et tests de modules. Ce parcours ne certifie pas une fidélité spatiale intégrale 1:1 ni toutes les règles/interactions ou la légalité TCG Advanced.

## Reproduire et consulter

```sh
python scripts/audit-continuation-models-ui.py --expected-entry-sha256 799145520bfd285b788d5f6573dde6a557ef82dadda4645a697f97f5d60882be
```

- [Rapport brut](artifacts/continuation-models-ui-2026-10-08/report.json), SHA256 `80d4a84ffb1717a7fdd932c1e19f565028de8d589b60e51210a89dae34018086`.
- [Inspection des 24 PNG et limites par capture](artifacts/continuation-models-ui-2026-10-08/visual-inspection.json), SHA256 `ffa6fc0d7d65310e5715afd0b21c211582317997f313437a2da6ce21e6f3ca6e`.
- Trois modèles réels : [desktop](artifacts/continuation-models-ui-2026-10-08/wave-three-models-real-1280.png), [mobile](artifacts/continuation-models-ui-2026-10-08/wave-three-models-real-390.png).
- Caméra Console : [desktop](artifacts/continuation-models-ui-2026-10-08/wave-camera-console-1280.png), [mobile](artifacts/continuation-models-ui-2026-10-08/wave-camera-console-390.png).
- Réponse réelle à l’attaque : [desktop](artifacts/continuation-models-ui-2026-10-08/wave-native-attack-before-negation-1280.png), [mobile](artifacts/continuation-models-ui-2026-10-08/wave-native-attack-before-negation-390.png).
- Après Negate Attack : [desktop](artifacts/continuation-models-ui-2026-10-08/wave-native-attack-negated-motion-1280.png), [mobile](artifacts/continuation-models-ui-2026-10-08/wave-native-attack-negated-motion-390.png).

Les autres captures et leurs empreintes figurent dans le rapport. Les preuves compilées et galeries antérieures sont préservées.
