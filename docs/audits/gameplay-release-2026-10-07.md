# Gameplay et vérification — 7 octobre 2026

Le pool strict passe de 57 à **64 cartes** : 59 Main et 5 Extra. Les **17 Magies de Terrain** jouables sont explicitement enregistrées ; le catalogue de 336 illustrations ne représente pas 336 effets scriptés. La liste Advanced du 21 septembre reste celle applicable au sous-ensemble local lors de cette vérification.

## Parcours réels du navigateur

Les scripts utilisent Chromium avec SwiftShader et les modules de l’application. Les états initiaux des combats sont préparés avec le hook DEV existant, absent du build public ; les activations, Invocations, attaques et changements de phase utilisent ensuite les vrais boutons et le même moteur. Les profils sont observés en appelant les méthodes originales de la scène, sans remplacer les effets par des mocks.

| Parcours | Résultat contrôlé | Preuve |
| --- | --- | --- |
| Plaines Marécageuses | Activation, Invocation Normale de Crapaud Slime en Attaque : **1900 ATK / 500 DEF**. Changement Compacte/Réelle conservant moteur, génération, cartes et LP ; une seule scène et page de 390 pixels sur mobile. | [Mobile](artifacts/official-field-wetlands-mobile-390-2026-10-07.png) |
| Gratte-Ciel | Sparkman reste à 1600 ATK hors calcul ; bonus +1000 au calcul contre Assaillant à la Hache 1700, **900 dégâts**, cible détruite. Profil `skyscraper-boost` effectivement lancé depuis le Terrain vers le bon monstre. | [Effet en partie](artifacts/official-field-skyscraper-effect-2026-10-07.png) |
| Le Sanctuaire Céleste | Sphère Mystique Lumineuse attaque et est détruite contre 1700 ATK ; ses **1200 dégâts sont prévenus**, joueur à 8000 LP. Profil `sanctuary-protection` effectivement lancé. | [Protection en partie](artifacts/official-field-sanctuary-effect-2026-10-07.png) |
| Forêt Ancienne | Insecte Mangeur d’Hommes et Magicien de la Foi passent de Défense face verso à Attaque sans effets Flip. L’Insecte ayant attaqué est détruit en sortie de Battle Phase, Sparkman n’ayant pas attaqué reste en place. Profil `ancient-forest-destruction` effectivement lancé. | [Fin de Battle Phase](artifacts/official-field-ancient-forest-effect-2026-10-07.png) |
| Constructeur strict | Bibliothèque 64 cartes, Main 40 / Extra 3 / Side 7, Pot de Cupidité interdit, Monster Reborn limité, copies cumulées, persistance et contrôle de largeur à 390 × 844. | [Bibliothèque mobile](artifacts/custom-deck-builder-mobile-library-2026-10-07.png) |
| Match personnalisé | Enregistrement réel, fin du Duel 1 via fixture DEV (défaite), score 0–1, brouillon local effacé, deux rechargements, identité custom et choix du joueur conservés ; échange Plaines Marécageuses Main↔Side puis Duel 2 depuis les Decks enregistrés, tailles inchangées. | [Rapport du parcours Match](artifacts/custom-deck-browser-2026-10-07.json) |

Les quatre illustrations actives sélectionnent leur JPEG local, avec `contain` et sans filtre. Les rapports complets sont [Terrains](artifacts/official-fields-browser-2026-10-07.json) et [constructeur/Match](artifacts/custom-deck-browser-2026-10-07.json).

Reproduction depuis un serveur DEV local, avec Python Playwright et Chromium installés :

```sh
npm run dev -- --host 127.0.0.1
python scripts/verify-official-fields-browser.py --base-url http://127.0.0.1:5173
python scripts/verify-custom-deck-browser.py --base-url http://127.0.0.1:5173
```

## Corrections et limites

Gate finale locale : **76 fichiers de tests réussis**, zéro échec ; `npm run check` et `npm run audit:security` réussis. Les deux audits contrôlent 336/336 JPEG sources inchangés et 336/336 WebP de repli distincts. Le build contient 61 modules ; JS principal 418,16 ko, Vue Réelle chargée à la demande 763,14 ko (213,05 ko gzip), CSS 78,39 ko. Le seul avertissement de build concerne la taille du chunk Vue Réelle. Le hook DEV `__YGO_QA__` n’apparaît pas dans les bundles publiés.

Les décisions de combat de l’IA partagent le calcul du moteur et tiennent compte des nouveaux Terrains. Magicien du Temps annulé reste activable ; Magicien des Arcanes revalide les décisions asynchrones, coûts et cibles. La restauration du Match conserve le Deck personnalisé et utilise ses snapshots enregistrés même si le brouillon du constructeur est devenu invalide.

Le chargement distant Google Fonts a échoué avec `ERR_CERT_AUTHORITY_INVALID` dans le navigateur de vérification. Inter et Orbitron sont désormais servies localement en WOFF2, avec axes et glyphes conservés, licences OFL et [provenance](../../public/fonts/provenance.json). Aucun contournement TLS n’est ajouté.

La dépendance vulnérable source-map-js est remplacée par le [correctif officiel 1.2.2](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), via PostCSS 8.5.29. Les trois tests de sécurité vérifient la dépendance réellement résolue, avec sous-processus bornés ; le seuil d’audit reste inchangé.

Les sources primaires et secondaires sont distinguées dans [RULES_COVERAGE.md](../../RULES_COVERAGE.md). Le cumul de deux Gratte-Ciel et le replay abandonné de Forêt Ancienne ont des corroborations OCG/EDOPro secondaires, sans FAQ Konami TCG spécifique trouvée. Les règles de toutes les cartes TCG et la reproduction spatiale 3D intégrale 1:1 restent incomplètes. Les [captures de modèles](monster-fidelity-2026-10-07.md) et [comparaisons de terrains](terrain-fidelity-2026-10-07.md) documentent les simplifications restantes.
