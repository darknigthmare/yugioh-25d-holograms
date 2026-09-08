# Couverture des règles — 8 septembre 2026

Ce document décrit la couverture réellement testée, pas une certification exhaustive TCG. Le mode strict repose sur un registre explicite de 45 cartes locales. Le catalogue de 336 décors de Terrain est **visuel** : il ne signifie pas que 336 effets de cartes sont implémentés.

## Corrections de cette version

| Domaine | Comportement intégré et testé |
| --- | --- |
| Combat | Même calcul pour les deux camps ; Attaque/Défense, égalités dont 0 contre 0, dégâts directs, protections et remplacements, dégâts perçants uniquement via propriété scriptée ; fin du duel immédiate à 0 LP. |
| Rejeu d’attaque | Apparition, disparition ou remplacement d’un monstre adverse, y compris mutation transitoire ; passage attaque directe/cible et inverse ; aucune seconde déclaration ni second coût. |
| Fenêtres de réponse | Déclaration d’attaque sans chaîne préexistante : priorité au joueur du tour puis à son adversaire, deux passes pour fermer ; vitesses 2/3 et interdiction de répondre pendant la résolution. |
| Identité des cartes | Déplacements Main/Extra et changement de contrôle conservent l’instance sur le Terrain, compteurs et usage d’attaque ; quitter et revenir renouvelle l’instance ; les anciennes cibles ne suivent pas une nouvelle instance. |
| Déplacements | Retour au propriétaire au Cimetière/exil ; les Jetons cessent d’exister en quittant le Terrain et ne peuvent pas être bannis face verso ; les Matériels Xyz vont au Cimetière quand leur hôte quitte le Terrain pour le Cimetière/exil. |
| Chaînes | LIFO ; une destruction n’annule pas automatiquement l’effet ; Magies/Pièges persistants exigent la même source face recto ; cartes non persistantes nettoyées à la fin de la chaîne ; distinction annulation de carte/effet. |
| Stardust | Sacrifice au coût, négation et destruction conditionnelle sur l’instance exacte ; retour End Phase par un effet déclenché de vitesse 1 auquel on peut répondre, sans retour si la carte quitte le Cimetière en réponse. |
| Statistiques | Les bonus extérieurs subsistent quand les effets du bénéficiaire sont annulés ; même recalcul Main/Extra ; pas de bonus aux monstres face verso ; pas de DEF inventée pour les Liens. |
| Terrains classiques | Yami, Umi, Forêt, Montagne, Sogen, Terre Dévastée : +200/-200 selon le Type courant, sur les deux camps ; cumul de deux Terrains valides ; aucun bonus avant résolution ou sous annulation. |
| Synchro/Rituel | Matériaux distincts, contrôle, Niveaux et recettes ; validation du nombre de Syntoniseurs/non-Syntoniseurs ; pas de sacrifices rituels superflus ; pas de carte Rituel utilisée pour son propre coût. |
| Lien | Contributions 1 ou valeur Lien, recette exacte, Jetons autorisés pour LANphorhynchus ; graphe des huit flèches, orientation adverse, liens Main/Extra et retrait des matériaux avant le calcul des destinations. |
| Pendule | Niveaux strictement compris entre deux échelles, une fois par tour ; destinations pointées partagées avec le graphe Lien ; historique d’Invocation correcte des hybrides conservé face recto dans l’Extra Deck. |
| Conditions de victoire | LP/Deck Out immédiats ; Exodia vérifié à la fin d’un effet et non au milieu ; raison Exodia affichée et enregistrée séparément. Exodia n’est pas ajouté au pool strict. |

Les règles déjà existantes de phases, Invocations Normales/Sacrifices, Fusion, Xyz, Main/Extra/Side Deck, liste Advanced locale, Match et confidentialité restent couvertes par les suites de régression.

## Ce qui reste à implémenter pour viser le TCG complet

- **Scripts de cartes** : les milliers de cartes absentes du registre strict, leurs coûts, cibles, restrictions, conditions et exceptions. Le parser PSCT analyse du texte ; il ne transforme pas arbitrairement une description en effet exécutable.
- **Événements et timing universels** : SEGOC connecté à une file complète de déclencheurs, effets Flip/fin de combat, chaque fenêtre de phase, annulation d’Invocation hors chaîne et règles de timing propres à chaque carte. Les helpers existants ne suffisent pas à revendiquer toute cette couverture.
- **Procédures alternatives** : Contact Fusion/substitutions, Rituels utilisant l’ATK ou d’autres sources de matériaux, Rank-Up/Xyz alternatifs, Niveaux de remplacement d’hybrides Xyz-Pendule, Invocations Normales additionnelles.
- **Extra Link** : le graphe calcule les liens/co-liens, mais la validation de l’occupation simultanée des deux Zones Monstre Extra avec le monstre entrant n’est pas encore exposée. Le garde conservateur empêche cette procédure au lieu de l’autoriser à tort.
- **Effets génériques complexes** : superposition de substitutions/protections, réinitialisations propres à chaque texte, restrictions par nom de carte et durées. Les limites d’usage par joueur/effet et les conjonctions PSCT disposent de tests de primitives, pas de scripts universels.
- **Formats et plateforme** : distinctions complètes TCG/OCG, Rush/Speed Duel, règlement de tournoi chronométré, multijoueur jouable et sauvegarde intégrale d’un duel ne sont pas livrés par cette version.

Le mode Sandbox permet de consulter des cartes hors registre ; cela ne garantit pas la résolution de leurs effets. Ne pas élargir automatiquement le registre strict à partir du seul type générique d’une carte.

## Architecture et points d’extension

- `ClassicFieldSpellEffects.js` contient les six règles continues, identifiées par passcode canonique. `GameStateStabilizer` les applique au même état de duel dans toutes les vues. Le décor ne calcule jamais de statistiques.
- `LinkZoneRules.js` fournit une projection pure des zones et flèches ; les procédures Lien et Pendule consomment ces destinations après retrait virtuel des matériaux.
- `BattleEngine.js` calcule le résultat symétrique du combat ; `DuelGame` orchestre décisions, chaînes, Damage Step et animations.
- `FieldState` et `CardState` contrôlent destinations, propriétaire et identité d’instance. Les protections sont décrites par `DefensiveEngine`, pas déduites de mots présents dans la description.
- Pour ajouter une carte : texte/ruling officiel → données locales → procédure/effet et fenêtres → tests positifs/négatifs et deux camps → ajout explicite au registre strict → test du parcours UI. Ajouter un décor seul ne suffit pas.

## Validation reproductible

```sh
npm run check
node --check src/game.js
node --check main.js
git diff --check
```

`check` lance tous les tests Node, l’audit des 336 WebP de Terrain puis le build. Aucun script lint/typecheck séparé n’existe. Le chunk chargé paresseusement de la Vue Réelle reste au-dessus de l’avertissement Vite de 500 kB ; il n’est pas chargé au démarrage de la vue Compacte.

Résultats du lot : **410 tests réussis (147 supplémentaires)**, 336/336 illustrations distinctes valides, build de production et vérifications syntaxiques réussis. Parcours Chromium isolé à 1366 × 768 : choix du premier joueur, Invocation via carte → zone → action, activation de Yami via la Zone Terrain (+200 ATK), Vue Réelle avec le WebP dédié, retour Compacte conservant phase/LP/cartes ; aucune erreur JavaScript sur ce parcours. Le fixture de test utilise le hook de développement existant, absent du build public.

## Sources primaires consultées

- [Règlement officiel Konami](https://img.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf) : phases, combat, Invocations et destinations.
- [Damage Step](https://www.yugioh-card.com/eu/play/damage-step-rules/) et [Fast Effect Timing](https://www.yugioh-card.com/en/play/fast-effect-timing/) : séquence du combat et priorité.
- [PSCT, conjonctions](https://www.yugioh-card.com/en/play/psct/psct-7/) : dépendance des parties d’un effet.
- Base officielle : [Yami](https://www.db.yugioh-card.com/yugiohdb/card_search.action?cid=4341&ope=2&request_locale=en), [Umi](https://www.db.yugioh-card.com/yugiohdb/card_search.action?cid=4340&ope=2&request_locale=en), [Forêt](https://www.db.yugioh-card.com/yugiohdb/card_search.action?cid=4336&ope=2&request_locale=en), [Montagne](https://www.db.yugioh-card.com/yugiohdb/card_search.action?cid=4338&ope=2&request_locale=en), [Sogen](https://www.db.yugioh-card.com/yugiohdb/card_search.action?cid=4339&ope=2&request_locale=fr), [Terre Dévastée](https://www.db.yugioh-card.com/yugiohdb/card_search.action?cid=4337&ope=2&request_locale=fr), [LANphorhynchus](https://www.db.yugioh-card.com/yugiohdb/card_search.action?cid=13530&ope=2&request_locale=en).
- [Ruling d’un hybride Pendule non correctement invoqué](https://www.db.yugioh-card.com/yugiohdb/faq_search.action?fid=15418&ope=5&request_locale=ja).
