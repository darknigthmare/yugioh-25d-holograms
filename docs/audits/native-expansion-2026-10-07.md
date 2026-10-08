# Expansion des Terrains et fiabilité du duel natif — 7 octobre 2026

Cette livraison ajoute **60 reconstructions de volumes depuis leurs illustrations inspectées**, **30 scénarios officiels de Terrain**, **21 scénarios de combat** et **8 parcours de choix officiels**. Elle corrige trois écarts reproduits : la cible d’une attaque réutilisée pour un effet ultérieur, les révélations prises pour des Invocations Flip et la résolution d’une description d’effet d’une carte adverse cachée.

## Volumes et preuves visuelles

| Lot | Cartes reconstruites | Images source / ancien / nouveau | Audit |
| --- | ---: | ---: | --- |
| Végétation, reliefs et ruines | 20 | 60 | [Wild](field-wild-references-2026-10-07.md) |
| Eau, villes et espaces | 20 | 60 | [Aquatic](field-aquatic-references-2026-10-07.md) |
| Forteresses, intérieurs et ténèbres | 20 | 60 | [Dark](field-dark-references-2026-10-07.md) |

Les 180 images sont regroupées en quatorze planches, avec la même caméra et lumière avant/après pour chaque carte. Les baselines sont les sources exactes du commit local `2bc79f1` et leurs dépendances épinglées. Chaque illustration conserve ses octets et ses proportions. Les volumes utilisent les constructeurs réellement disponibles en production, sans textures de cartes privées.

Les derniers affinements préservent les détails physiques : **600 lames d’herbe** dans Wetlands, **84 plis réels** dans les deux massifs asymétriques de Mountain, tronc, racines et large canopée de Gaia, et **huit tourelles secondaires / vingt-et-une arches** dans Labrynth. Les deux rampes de Labrynth dépassent réellement cinq unités de déviation par rapport à leur segment droit, montent de neuf et onze unités et restent entièrement hors du corridor du duel.

La [matrice courante](artifacts/field-coverage-expansion-2026-10-07.json) distingue **339 illustrations exactes, 155 décors dédiés, 141 références inspectées et 130 reconstructions depuis les sources**. Parmi les 60 reconstructions, 24 remplacent des repères déjà dédiés et 13 des références déjà étudiées. **209 cartes n’ont pas encore de reconstruction source des volumes.** Les figures et ornements peints restent souvent dans le JPG original ; la perspective, les proportions et le placement sont adaptés au plateau. Cette livraison ne constitue pas une reproduction spatiale intégrale 1:1 des 339 cartes.

## Règles et régressions réellement exécutées

| Preuve | Résultat | Portée |
| --- | ---: | --- |
| [Terrains natifs](native-field-rules-2026-10-07.md) | **339 initialisations ; 77 scénarios sur 65 Terrains** | Les 47 anciens scénarios restent présents. Les 30 nouveaux exercent notamment Domain, Toon Kingdom, Lair, Lemuria, Marincess, PSY-Frame, Salamangreat, Rikka, Triamid, Dark Sanctuary et Orichalcos. |
| [Combat](native-battle-timing-2026-10-07.md) | **21 scénarios** | Attaques, replays, révélations, dégâts perçants/doublés/redirigés, Honest, Kuriboh, Waboku, contrôle, coûts Xyz, deux attaques, pioche privée et match nul. |
| [Choix et confidentialité](native-choice-flows-2026-10-07.md) | **8 parcours officiels + 3 contrats wire** | Déclarations filtrées, options non consécutives, sommes, ajout/retrait et annulation ; préfixes obligatoires, poids alternatifs et description cachée vérifiés séparément au niveau du protocole. |
| [Invocations](../../tests/native-duel-summoning.test.mjs) | **20 cas conservés** | Fusion, Rituel, Synchro, Xyz, Lien, Pendule, Flip, zones MR5 et restrictions. |
| [Fenêtres de décision](native-rule-windows-2026-10-07.md) | **15 scénarios officiels + 1 garde conservés** | Déclarations, ordre du Deck, compteurs, coûts, chaînes obligatoires et Damage Step. |

Les données CDB et les Lua officiels archivés exécutent réellement ces branches. Les fixtures de moteur placent leurs cartes avant le démarrage, utilisent les flags MR5/TCG SEGOC et n’injectent aucun effet simplifié, `TEST_MODE` ou carte après le démarrage. Dark Sanctuary utilise deux graines enregistrées du vrai RNG ; aucun résultat de pièce n’est forcé.

La comparaison [avant correction](artifacts/native-battle-target-intent-before-2026-10-07.json) exécute l’ancienne façade exacte avec les mêmes ressources : Compulsory renvoyait silencieusement la cible de l’attaque puis provoquait une attaque directe et 3000 dommages. La façade corrigée demande le choix d’effet et renvoie le propre attaquant sélectionné, sans dommage. L’intention est consommée au message natif `ATTACK` ; les règles de replay et les cibles restent celles du core.

La description d’un candidat caché n’est plus résolue. `POS_CHANGE` produit une révélation publique distincte, tandis que seuls les messages de confirmation d’une vraie procédure déclenchent l’Invocation Flip. La synchronisation et la rotation d’un monstre restent limitées à ses zones : une Magie ou un Piège révélé ne rafraîchit pas sa carte à la place.

## Présentation et interface

Les résolutions publiques réussies de Terrains ont quatre motifs supplémentaires : **ondes, croissance, ombres et lumière**. La déclaration de chaîne conserve sa rune ; un Terrain caché, en attente ou annulé ne déclenche pas le motif de résolution. Ces motifs sont des effets de présentation, distincts des calculs de règles et d’une reconstruction exacte de chaque attaque.

La [planche des motifs et de la révélation](artifacts/native-field-visuals-2026-10-07/field-motifs.jpg) et son [rapport](artifacts/native-field-visuals-2026-10-07/report.json) vérifient dix images à 30 % et 65 %, au maximum douze appels de rendu, puis zéro géométrie ou texture suivie restante. La [planche des sept Invocations](artifacts/native-summon-effects-2026-10-07/summon-procedures.jpg) a été régénérée sur les mêmes sources finales : quatorze images, sept formes distinctes, au maximum quatorze appels, et libération complète des ressources suivies.

Les valeurs de matériaux et de sacrifices sont celles du prompt natif. Le total affiché inclut les cartes obligatoires ; le validateur du protocole garde l’autorité sur la réponse. La recherche d’annonce accepte nom ou passcode, normalise les accents et affiche explicitement son plafond de cent résultats. Prohibition et le coût de Tokusano sont exercés par les vrais contrôles sur desktop et mobile.

## Vérification du build final

`npm run check` : **113 fichiers de tests passent**, zéro échec, ignoré ou annulé ; audit des 339 JPG et 339 replis ; build Vite réussi, **92 modules**. `npm run audit:security` : **zéro vulnérabilité signalée**, sans modification de dépendances.

Le build figé charge `assets/index-Bf3sQIDw.js` avec SHA-256 `6de409c77e47c3853b1a554553776a13f576e265824187d6d21b809fd4c7ce33`. HTML : `ca7254cd1cc1b1b0c6bf9c96782429d47443c7b1a0da5febe6801762b2360ee2`. CSS `assets/index-WwbnQBsq.css` : `5103d13e4c93cce8f60e430ade9bce9aace0233e3b71dfb7786e11b7bf3c58a1`.

Les quatre parcours suivants passent sur ces mêmes octets et la CSP de production, en **1280 × 900 et 390 × 844** : [duel général](native-duel-ui-2026-10-07.md), [Pendule](native-pendulum-ui-2026-10-07.md), [trois vues](native-duel-views-2026-10-07.md) (22 états publics) et [choix](native-choice-flows-2026-10-07.md). Leurs captures finales sont inspectées, sans erreur JavaScript, requête native échouée ni violation CSP. Les rapports conservent les empreintes réelles ; les contrôles avant/après attestent que le build est resté figé. Les captures des trois vues attendent la stabilisation de la projection. Aucun hook QA n’est livré.

Le WASM reste `0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026`, et son loader reste `f4523ad5c2e9f14c8736a91ad94e9e7f8283883a3607781f40afdeae27cdf828`. Les CDB, Lua, core, archives et recettes publiques restent inchangés. Les avertissements de taille de chunk et d’URL de secours WASM restent visibles ; le loader reçoit explicitement le binaire local.

Les scénarios ne certifient pas toutes les branches des 339 scripts ni toutes les interactions du catalogue libre. Les audits du navigateur compilé local avec headers de production sont distincts de la comparaison HTTP de la prévisualisation Vercel protégée. Le [lot précédent de 44 décors](native-continuation-2026-10-07.md) conserve son relevé historique et son commit public.
