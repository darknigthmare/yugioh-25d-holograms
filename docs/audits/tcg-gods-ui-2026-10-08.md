# Trois Dieux — six duels TCG strict dans l’application compilée

**Les six parcours passent**, à 1280 × 900 et 390 × 844 : trois activations réelles de Fiend’s Sanctuary, trois Jetons natifs, sélection des trois Sacrifices, puis Invocation Normale de Slifer, Obelisk ou Ra. Les **20 captures finales** comprennent les Jetons, les caméras joueur/globale et les deux choix OUI/NON de Ra. Le [rapport complet](artifacts/tcg-gods-ui-2026-10-08/report.json) porte le SHA256 `c75a24ec117abe73b20121f1858cca7c1d1532c9d00ef86f6b420694372d2fba`.

| Dieu invoqué | Résultat natif affiché, desktop et mobile | LP du joueur | Main restante / Cimetière |
| --- | --- | ---: | --- |
| Slifer the Sky Dragon — 10000020 | ATK 1000 / DEF 1000 | 8000 | 1 carte / 3 Magies |
| Obelisk the Tormentor — 10000000 | ATK 4000 / DEF 4000 | 8000 | 1 carte / 3 Magies |
| The Winged Dragon of Ra — 10000010 | ATK 7900 / DEF 7900 après OUI | 100 | 1 carte / 3 Magies |

Chaque [fixture distincte](artifacts/tcg-gods-ui-fixtures-2026-10-08.json) contient un Main Deck de 40 cartes, sans Extra ni Side, avec au plus trois copies par nom permanent vérifié. Elle passe la validation Advanced complète datée du 8 octobre 2026, liste `TCG_EU_2026_09_21`, puis le Deck Builder strict de l’application affiche « Deck valide » et les tailles exactes. Le Deck sauvegardé et le générateur aléatoire initial sont enregistrés **avant Démarrer**. Après ce point, le driver utilise uniquement les boutons et choix proposés par l’interface ; il ne remplace aucune carte, statistique, décision ou règle.

Fiend’s Sanctuary est retrouvé par son vrai nom dans `cards.cdb` : passcode **24874630**, Magie normale TCG autorisée à trois exemplaires. Son script `c24874630.lua` crée un **Metal Fiend Token 24874631** par résolution. Sa seule limite d’usage concerne l’entretien du Jeton en Standby Phase ; elle ne limite pas les trois activations de Magie dans cette Main Phase 1. L’interface propose ensuite exactement les trois Jetons comme Sacrifices. La confirmation vide est désactivée ; les trois sélections puis la confirmation native permettent l’Invocation Normale. Les Jetons disparaissent sans entrer au Cimetière : les trois cartes au Cimetière sont les trois Magies, et la Main conserve un seul monstre normal.

## Ra : choix réel et paiement confirmé

Le vrai prompt natif est `SELECT_EFFECTYN`, pour le Ra public déjà invoqué. Le core utilise la **description système 221**, et l’interface affiche exactement « ACTIVER OU CONFIRMER ? », « Choix de l’effet », OUI/NON. Les captures et le rapport conservent ce texte générique ; ils ne lui ajoutent aucune description de coût. Le texte officiel du paiement figure bien dans la CDB et dans l’inspecteur de Ra. Le [diagnostic WASM séparé](artifacts/tcg-gods-ui-2026-10-08/ra-description-protocol-diagnostic.json) confirme l’indice 221, le message `PAY_LPCOST` de 7900 et la query native 7900/7900. Ce diagnostic ne remplace pas les parcours navigateur.

Sur les deux formats, le driver clique le véritable bouton OUI, mesuré à **44 px de hauteur**, puis observe **8000 → 100 LP** et **0/0 → 7900/7900**. Il attend la fin du compteur LP animé de 800 ms avant de relire les faits publics. La carte est reconnue par son passcode public, après les trois Sacrifices ; aucune décision n’est injectée après le démarrage.

- [Ra : OUI/NON réellement proposé, desktop](artifacts/tcg-gods-ui-2026-10-08/god-10000010-ra-payment-offered-1280.png)
- [Ra : 100 LP et modèle réel, mobile](artifacts/tcg-gods-ui-2026-10-08/god-10000010-god-player-camera-390.png)
- [Slifer : invocation native et illustration officielle, desktop](artifacts/tcg-gods-ui-2026-10-08/god-10000020-god-player-camera-1280.png)
- [Obelisk : modèle réel, mobile](artifacts/tcg-gods-ui-2026-10-08/god-10000000-god-player-camera-390.png)

## Build, images et état conservés

Le build réellement servi utilise **`/assets/index-CaFyNlVq.js`**, SHA256 **`075c1dd21968352631c5a88c85272c1dbcaa09f36f80bf3939c1c5abc5137c51`**. Les **28 fichiers HTTP** contrôlés incluent tous les JS/CSS compilés, l’HTML, le WASM, les données/scripts natifs, manifest/liste et les neuf JPG des Dieux. Leurs octets correspondent aux fichiers locaux gelés, avant et après les six duels. Les **36 dépendances sources** mesurées restent aussi identiques. Le module God conserve le SHA256 `7e095ad4bab594756d846b6794add8afb540f962494b7168589d0bc80851f121`.

Les trois portraits complets et les trois crops sont réellement décodés dans l’inspecteur et l’hologramme : chemins `/cards/reference/PASSCODE.jpg` et `/cards/cropped/PASSCODE.jpg`, dimensions originales contrôlées. Les trois petites images sont aussi servies et hashées. Les trois Jetons puis chacun des Dieux ont une représentation 3D publique rendue. Les deux caméras conservent l’identité native de la carte, la Main, les LP et les statistiques. Un seul plateau, une seule scène, un seul canvas et une seule Main sont présents ; les centres des zones des Dieux restent dans leur hôte projeté et la page ne déborde pas horizontalement.

Le WASM, `scripts.json` et `card-data.json` sont chargés dans chaque parcours. **Zéro erreur de page, requête native échouée ou violation CSP** est observé. La CSP de production est utilisée, et `window.__YGO_QA__` reste absent avant et après les actions. Ces contrôles lisent le DOM public, sans accès aux objets privés du moteur ou de Three.js.

Les [18 comparaisons de modèles](popular-gods-models-2026-10-08.md) sont un audit distinct : baseline Git, JPEG source, trois angles, deux poses, vrais appels GPU et libération du renderer. Elles établissent la conservation des 28 anciens modèles et des 470 anciens JPG. Elles ne sont pas comptées parmi les 20 captures de ces six duels compilés.

## Périmètre et essais conservés

Cette preuve couvre trois Invocations Normales à trois Sacrifices, les Jetons, le paiement de Ra, les statistiques courantes, les images et le rendu public de ces situations. Elle ne couvre pas toutes les interactions des Dieux, toutes les cartes TCG, les effets visuels transitoires ni une fidélité spatiale intégrale 1:1. Les modèles restent des interprétations volumétriques de leurs illustrations. Les cartes de support, dont Fiend’s Sanctuary et son Jeton, utilisent leur remplacement graphique neutre déclaré. Le prompt de Ra garde actuellement un libellé générique malgré le texte officiel disponible dans l’inspecteur.

Les essais antérieurs sont archivés avec leurs pins et drivers réellement utilisés. Ils ne gonflent pas le total final :

| Archive | PNG conservés | Situation observée |
| --- | ---: | --- |
| [Premier diagnostic](artifacts/tcg-gods-ui-2026-10-08/diagnostic-before-cropped-selector-scope/report.json) | 2 | Slifer invoqué ; sélecteur du crop trop restreint dans le driver, corrigé pour son vrai parent DOM |
| [Pause avant priorité des références](artifacts/tcg-gods-ui-2026-10-08/intermediate-before-trusted-reference-metadata-fix/pause-note.json) | 9 | Pause demandée avant nouveau build ; aucun rapport global final revendiqué |
| [Pause avant garde de délai Swiss](artifacts/tcg-gods-ui-2026-10-08/intermediate-before-swiss-input-deadline-fix/checkpoint-report.json) | 14 | Quatre cas complets ; Ra offre bien OUI/NON, ancien driver exigeant un texte de coût dans le libellé générique |
| [Compteur LP avant stabilisation](artifacts/tcg-gods-ui-2026-10-08/diagnostic-before-ra-lp-counter-settle/report.json) | 19 | Cinq cas complets ; Ra mobile déjà 7900/7900, compteur LP lu pendant son animation ; attente du compteur corrigée dans le driver |

La relance finale sur le build définitif termine les six cas, contrôle tous les pins avant/après et produit les **20 PNG définitifs**. Aucun build ni code applicatif n’a été modifié par ce driver.

Reproduction : `python scripts/audit-tcg-gods-ui-2026-10-08.py --expected-entry-sha256 075c1dd21968352631c5a88c85272c1dbcaa09f36f80bf3939c1c5abc5137c51`. La préparation des fixtures utilise `node scripts/prepare-tcg-gods-ui-fixtures.mjs` ; le diagnostic de description séparé utilise `node scripts/probe-ra-prompt-description-2026-10-08.mjs`.
