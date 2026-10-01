# Couverture des règles — 1er octobre 2026

Ce document décrit la couverture réellement testée, pas une certification exhaustive TCG. Le mode strict repose sur un registre explicite de 50 cartes locales (45 Main, 5 Extra). Le catalogue de 336 décors de Terrain est **visuel** : il ne signifie pas que 336 effets de cartes sont implémentés.

## Deuxième lot du 1er octobre 2026

- Insecte Mangeur d’Hommes et Magicien de la Foi : effets Flip obligatoires, cibles légales à l’activation, revalidation d’instance, destruction ou récupération. Le monstre condamné par le combat ne peut pas devenir la cible de l’effet Flip après le calcul des dommages.
- Sangan : déclenchement du Terrain vers le Cimetière, recherche sans cible à la résolution, révélation et mélange du Deck, limite par nom et joueur une fois par tour ; les cartes et effets du nom recherché ne peuvent pas être activés durant le reste du tour. Cette restriction ne bloque pas leur Invocation.
- Événements collectés depuis les transitions de zones et les révélations. Les quatre groupes SEGOC sont placés avant les réponses rapides, avec choix de l’ordre par le contrôleur dans chaque groupe. Une Invocation ou un envoi au Cimetière pendant une résolution attend la fin de la chaîne. Quitter puis revenir dans la zone ne réutilise pas un ancien événement.
- Flip pendant le combat : activation après le calcul des dommages, puis envoi des monstres détruits au Cimetière et résolution des nouveaux déclencheurs à la fin du Damage Step. Stardust peut annuler une activation destructrice dans ces fenêtres, conformément à son ruling officiel.
- IA normale/difficile : valeur réelle des sacrifices, utilité des cartes Flip, choix des terrains selon bénéfice net, attaques prudentes contre les cartes cachées et défausse choisie dans sa propre main. Aucun accès aux statistiques ou à l’identité des cartes adverses cachées pour ces décisions.
- Interface : actions des cartes posées disponibles au toucher et au clavier ; décisions obligatoires sans annulation ; décisions périmées rejetées ; changements de vue conservant les sélections d’invocation ; dernier choix de défausse immédiatement reflété ; aucun passage automatique de phase lorsqu’une Invocation Extra est encore légale.
- Rendu : 17 cartes et 16 familles de monstres, poses GPU lors des actions, effets Flip/récupération/recherche distincts, 45 terrains avec accessoires spécifiques. Les accessoires utilisent au plus 17 appels de rendu par terrain et dix matériaux dans le catalogue audité.

Validation du deuxième lot : **59 fichiers de tests réussis**, dont 31 scénarios de déclencheurs et 11 parcours d’IA ; `npm run check`, audit npm à zéro vulnérabilité, syntaxe et `git diff --check` réussis. Chromium : Flipo-Invocation via le menu de zone, destruction de Dragon Blanc, récupération de Raigeki, recherche de Kuriboh avec interdiction d’activation du nom, choix obligatoires sans annulation, conservation d’un sacrifice sélectionné lors du changement de vue, une seule scène WebGL et aucune largeur excessive à 390 × 844. Les fixtures utilisent le hook DEV existant. Le décor Runick Fountain est contrôlé avec une fixture visuelle résolue, sans prétendre implémenter son effet de carte. Les shaders de pose et d’ombres ont été compilés dans Chromium sans erreur WebGL. Le chunk Vue Réelle reste à environ 694 ko minifiés / 186 ko gzip et conserve l’avertissement Vite de 500 ko.

## Reprise du 1er octobre 2026

- Deux nouvelles cartes explicitement scriptées : Typhon d’Espace Mystique et Livre de la Lune, incluses dans les trois presets stricts. Typhon détruit sa cible sans annuler automatiquement son effet ; Livre cible un monstre face recto non-Lien et non-Jeton, et le retourne face verso en Défense.
- Réponses Jeu Rapide depuis la Main seulement pendant son propre tour, ou depuis une carte Posée lors d’un tour antérieur ; cibles et sources revalidées après chaque décision asynchrone.
- Fenêtres d’Effets Rapides de Pioche, Standby, entrée/sortie de Battle et sortie de Main, après chaîne et après Invocation réussie sans chaîne ; restrictions du Damage Step et première Main Phase 2 inaccessible sans Battle Phase.
- Ciblage des cartes adverses face verso anonymisé, sans passcode, nom réel ni statistiques dans le choix UI. Modèles et effets décoratifs utilisent uniquement les monstres révélés sur le Terrain.
- IA normale/difficile : réponses défensives Livre de la Lune, Typhon et Stardust, ciblage de la menace exacte et décision fondée sur les informations publiques. L’IA facile conserve ses décisions simplifiées.
- Mise en scène Vue Réelle : modèles et effets distincts, géométrie de 25 familles de Terrain, 336 profils et 21 repères spécifiques. Les 336 illustrations préexistantes sont présentes et auditées ; elles ne représentent pas 336 scripts de cartes.

Validation du lot du 1er octobre : **573 cas réussis dans 52 fichiers de tests**, audit des 336 illustrations/raccords de Terrain, build, syntaxe et `git diff --check` réussis ; audit npm à zéro vulnérabilité. Chromium desktop/mobile : choix puis résolution de Livre de la Lune, destruction de Yami par Typhon et retour au décor de base, attaque de la première Zone Main vers une Zone Extra (1500 dégâts et envoi au Cimetière), effet 3D effectivement lancé et changements de vue sans recréer le Duel. Les fixtures de rendu utilisent uniquement le hook DEV existant, absent du build publié. Le chunk paresseux Vue Réelle mesure environ 665 ko minifiés / 176 ko gzip ; l’avertissement de taille Vite persiste.

## Corrections de la version du 8 septembre

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
| Extra Link | Projection du Monstre Lien entrant, chemin co-lié réciproque entre les deux Zones Monstre Extra, revalidation après le choix asynchrone et transaction sans mutation en cas d’échec. |
| Pendule | Niveaux strictement compris entre deux échelles, une fois par tour ; destinations pointées partagées avec le graphe Lien ; historique d’Invocation correcte des hybrides conservé face recto dans l’Extra Deck. |
| Conditions de victoire | LP/Deck Out immédiats ; Exodia vérifié à la fin d’un effet et non au milieu ; raison Exodia affichée et enregistrée séparément. Exodia n’est pas ajouté au pool strict. |

Les règles déjà existantes de phases, Invocations Normales/Sacrifices, Fusion, Xyz, Main/Extra/Side Deck, liste Advanced locale, Match et confidentialité restent couvertes par les suites de régression.

## Ce qui reste à implémenter pour viser le TCG complet

- **Scripts de cartes** : les milliers de cartes absentes du registre strict, leurs coûts, cibles, restrictions, conditions et exceptions. Le parser PSCT analyse du texte ; il ne transforme pas arbitrairement une description en effet exécutable.
- **Événements et timing universels** : la collecte, le SEGOC et les effets Flip sont connectés pour les scripts explicites du pool ; restent les autres types de déclencheurs, les conditions « lorsque / si », chaque fenêtre de phase, les annulations d’Invocation hors chaîne et les exceptions propres aux cartes absentes. La présence d’un moteur extensible ne certifie pas tous ces comportements.
- **Procédures alternatives** : Contact Fusion/substitutions, Rituels utilisant l’ATK ou d’autres sources de matériaux, Rank-Up/Xyz alternatifs, Niveaux de remplacement d’hybrides Xyz-Pendule, Invocations Normales additionnelles.
- **Effets génériques complexes** : superposition de substitutions/protections, réinitialisations propres à chaque texte, restrictions par nom de carte et durées. Les limites d’usage par joueur/effet et les conjonctions PSCT disposent de tests de primitives, pas de scripts universels.
- **Formats et plateforme** : distinctions complètes TCG/OCG, Rush/Speed Duel, règlement de tournoi chronométré, multijoueur jouable et sauvegarde intégrale d’un duel ne sont pas livrés par cette version.

Le mode Sandbox permet de consulter des cartes hors registre ; cela ne garantit pas la résolution de leurs effets. Ne pas élargir automatiquement le registre strict à partir du seul type générique d’une carte.

## Architecture et points d’extension

- `ClassicFieldSpellEffects.js` contient les six règles continues, identifiées par passcode canonique. `GameStateStabilizer` les applique au même état de duel dans toutes les vues. Le décor ne calcule jamais de statistiques.
- `LinkZoneRules.js` fournit une projection pure des zones et flèches ; les procédures Lien, Extra Link et Pendule consomment ces destinations après retrait virtuel des matériaux.
- `BattleEngine.js` calcule le résultat symétrique du combat ; `DuelGame` orchestre décisions, chaînes, Damage Step et animations.
- `TriggerEventEngine.js` garde les snapshots d’événements et leur frontière de résolution ; `ClassicMonsterEffectScripts.js` contient les trois effets explicites. `FieldState.onTransition` observe les déplacements terminés. `DuelGame` vérifie les sources et cibles, construit les quatre groupes SEGOC puis offre les réponses rapides.
- `AIStrategy.js` classe les plans légaux fournis par le moteur à partir de la main propre et du Terrain public. Il ne décide pas de la légalité d’une action et ne lit pas les cartes cachées adverses.
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

Résultats du gate du 8 septembre : **506 tests réussis**, 336/336 illustrations distinctes valides, build de production et vérifications syntaxiques réussis. Parcours Chromium isolés desktop et mobile : configuration, défi solo, fin de Duel, médaille, déverrouillage et persistance après rechargement ; aucune erreur JavaScript observée. Le fixture de fin de Duel utilise le hook de développement existant, absent du build public.

## Sources primaires consultées

- [Règlement officiel Konami](https://img.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf) : phases, combat, Invocations et destinations.
- [Damage Step](https://www.yugioh-card.com/eu/play/damage-step-rules/) et [Fast Effect Timing](https://www.yugioh-card.com/en/play/fast-effect-timing/) : séquence du combat et priorité.
- [Ruling officiel Stardust, effet①](https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=7734&request_locale=ja) : activation possible pendant le Damage Step.
- [PSCT, conjonctions](https://www.yugioh-card.com/en/play/psct/psct-7/) : dépendance des parties d’un effet.
- Base officielle : [Yami](https://www.db.yugioh-card.com/yugiohdb/card_search.action?cid=4341&ope=2&request_locale=en), [Umi](https://www.db.yugioh-card.com/yugiohdb/card_search.action?cid=4340&ope=2&request_locale=en), [Forêt](https://www.db.yugioh-card.com/yugiohdb/card_search.action?cid=4336&ope=2&request_locale=en), [Montagne](https://www.db.yugioh-card.com/yugiohdb/card_search.action?cid=4338&ope=2&request_locale=en), [Sogen](https://www.db.yugioh-card.com/yugiohdb/card_search.action?cid=4339&ope=2&request_locale=fr), [Terre Dévastée](https://www.db.yugioh-card.com/yugiohdb/card_search.action?cid=4337&ope=2&request_locale=fr), [LANphorhynchus](https://www.db.yugioh-card.com/yugiohdb/card_search.action?cid=13530&ope=2&request_locale=en).
- [Ruling d’un hybride Pendule non correctement invoqué](https://www.db.yugioh-card.com/yugiohdb/faq_search.action?fid=15418&ope=5&request_locale=ja).
