# Audit complet de préparation commerciale — 8 septembre 2026

## Verdict exécutif

**Prêt comme fan game public amélioré : oui, après les contrôles de livraison.**
**Prêt à être vendu ou monétisé : non.** Le principal P0 est juridique : aucun
contrat ou fichier du dépôt n’accorde une licence commerciale Yu-Gi-Oh!, et la FAQ
KONAMI consultée tolère généralement certains usages de fans seulement dans un cadre
non commercial tout en se réservant le retrait du contenu. Ceci est un constat de
release, pas un avis juridique.

Le logiciel possède une vraie boucle jouable, trois vues partageant le même Duel,
une IA, des Matchs, un constructeur, 45 cartes locales, 336 décors illustrés et
maintenant 12 défis persistants. Il n’est pas un simulateur universel du TCG : les
milliers de cartes, rulings et interactions absents empêchent toute affirmation de
compatibilité complète ou officielle.

## Parcours vérifié

| Étape | État observé | Santé |
| --- | --- | --- |
| Configuration | Portée réelle, Duel libre, modes, IA et formats visibles ; haut du dialogue non coupé | Bon |
| Parcours | 12 défis lisibles, un seul défi initialement accessible, détails et objectifs consultables | Bon |
| Duel | Le défi emploie le plateau, l’IA, les cartes et les phases existants ; aucun second moteur | Bon |
| Résultat | Bronze, déverrouillage, reprise du même défi et accès direct au parcours | Bon |
| Persistance | Résultat conservé après rechargement ; export testé sans erreur navigateur | Bon |
| Accessibilité auto | Axe 4.12.1 : 0 violation A/AA sur le parcours mobile après corrections | Bon avec contrôle manuel restant |

Captures locales non versionnées de cette passe : `.codex-audit-04-campaign-entry.jpg`,
`.codex-audit-05-campaign-list.jpg`, `.codex-audit-06-campaign-duel.jpg`,
`.codex-audit-07-campaign-result.jpg`, `.codex-audit-09-mobile-campaign.jpg` et
`.codex-audit-10-mobile-duel.jpg`. Elles documentent des états courants, pas une
certification multi-navigateur.

## Correctifs intégrés pendant l’audit

### Règles et intégrité du duel

- Extra Link complet : Monstre entrant projeté, chemin co-lié réciproque, deux
  Zones Monstre Extra, revalidation après choix et aucun coût si l’état change.
- Les actions proposées tiennent compte de la phase, chaîne, capacité, Sacrifices,
  emplacement de Magie et interdictions d’activation/Invocation Spéciale.
- Polymérisation, Rituel, Monster Reborn et Magies joueur/IA revalident source,
  cible et destination après les décisions asynchrones.
- En mode strict, Magicien du Temps demande seulement l’appel ; le moteur produit
  le lancer. Sandbox conserve une issue imposable pour les scénarios.
- Événements explicites Normal/Pose/Sacrifice pour le suivi sans lire les journaux.

### Contenu, onboarding et sauvegarde

- Parcours de 12 défis, 3 chapitres, 24 Decks Main dédiés, 36 médailles.
- Brief, plan adverse, conseil et deux objectifs bonus par défi.
- État versionné, validation structurelle, historique idempotent et borné.
- Export/import JSON ; une erreur de quota ou stockage est annoncée, jamais masquée.
- Explication visible des limites : 45 cartes strictes, 336 décors visuels, pas de
  multijoueur public ni reprise d’un Duel interrompu.
- Focus initial remonté, dialogue limité à la hauteur utile, CTA mobile non couvrant,
  fond des dialogues externes `inert`, piège de focus pour les dialogues internes,
  journal et guide défilables au clavier, phases compactes avec noms accessibles complets.
- Deck IA facile sans Pièges qu’il ne sait pas Poser, défi Lien rééquilibré,
  objectifs Or variés et finale limitée aux procédures réellement disponibles.

### Fiabilité, sécurité et livraison

- Les 45 cartes locales ont priorité sur le cache distant ; entrées API reconstruites
  par liste de champs, images non sûres refusées, mode strict jamais injecté.
- Cache catalogue borné, réponses bornées, délai maximal de huit secondes, annulation
  et vérification exacte des passcodes.
- Audio facultatif : API absente, autoplay refusé, onglet caché et contexte fermé ne
  cassent plus une action ou ne déclenchent une rafale de notes.
- Nanoid/PostCSS corrigés sans mise à niveau majeure ; `npm audit` revenu à zéro.
- CI en lecture seule, actions épinglées, délai de 15 minutes, audit de sécurité puis
  contrôle complet.

## Matrice de maturité

| Domaine | État | Verdict / manque principal |
| --- | --- | --- |
| Boucle de jeu | Vert | Duel solo, victoire/défaite/nul, Match et campagne reliés |
| Fidélité locale | Vert/ambre | Très testée pour 45 cartes ; pas le TCG complet |
| Contenu initial | Ambre | 12 défis + 3 presets ; durée réelle non mesurée |
| IA | Ambre | 3 profils fonctionnels ; pas d’analyse d’équilibrage à grande échelle |
| Vue Réelle | Ambre | Fidèle et paresseuse ; chunk ~586,57 ko minifié, profil GPU à compléter |
| UX desktop/mobile | Vert/ambre | Parcours principal vérifié ; matrice appareils incomplète |
| Accessibilité | Ambre | Clavier, inert, focus et axe ; revue humaine lecteur d’écran/contraste requise |
| Sauvegarde | Ambre | Progression/Match locaux et export ; pas de reprise Duel/cloud/migration de compte |
| Sécurité client | Vert/ambre | CSP, cache, entrées et dépendances durcis ; pas de pentest indépendant |
| Réseau | Rouge commercial | Socle WebRTC testé mais aucun multijoueur exposé/autoritaire/anti-triche |
| Observabilité | Rouge commercial | Aucun crash reporting, SLO, analytics consentis ni support incident |
| Localisation | Rouge commercial | Interface française dominante, pas de pipeline i18n complet |
| Exploitation | Ambre | Vercel/CI ; rollback, staging, compatibilité et support à formaliser |
| Droits/IP | **Rouge P0** | Licence commerciale et inventaire des droits absents |
| Paiement/économie | Non applicable | Volontairement non ajouté tant que les droits bloquent la monétisation |

## Bloquants et priorités restantes

### P0 — avant toute vente ou monétisation

1. Obtenir des autorisations écrites couvrant marque, personnages, règles exprimées,
   textes, illustrations de cartes, musique/sons et territoires ; sinon convertir le
   produit en jeu original avec identité et contenu entièrement nouveaux.
2. Ne pas présenter le mode strict comme arbitre Yu-Gi-Oh! officiel ou TCG complet.
   Industrialiser les scripts/rulings, versions de liste et tests de conformité avant
   une telle promesse.
3. Établir inventaire de provenance/licence pour chaque image, police, son, donnée et
   dépendance, plus mentions légales, confidentialité et conditions adaptées au marché.

### P1 — avant une release commerciale candidate

1. Sauvegarde complète et migrable d’un Duel, récupération après crash, sauvegarde
   cloud facultative et tests de corruption/migration sur plusieurs versions.
2. Si le multijoueur est retenu : autorité serveur, décisions privées, reconnexion,
   anti-triche, modération, protection des mineurs et tests de charge. Le socle WebRTC
   présent ne suffit pas.
3. Playtests chronométrés et équilibrage statistique des 12 défis/IA ; tutoriels
   contextuels pour chaînes, Damage Step, Extra Deck et Pendule.
4. Matrice Chrome/Edge/Firefox/Safari, Android/iOS, clavier/tactile/manette,
   lecteurs d’écran et daltonisme ; aucun audit automatisé ne certifie seul WCAG.
5. Profilage FPS/mémoire/GPU de la Vue Réelle, fractionnement du chunk Three.js,
   budgets de chargement, réseau lent et appareils bas de gamme.
6. Crash reporting respectueux du consentement, métriques de disponibilité,
   environnement staging, procédures rollback/incidents et canal de support.
7. i18n, relecture professionnelle, formats régionaux et gestion de mise à jour des
   textes/règles sans modifier le moteur à la main partout.

### P2 — profondeur et longévité

- davantage de Decks et cartes réellement scriptées plutôt que des décors seuls ;
- variantes de missions, personnalités IA, défis quotidiens hors économie prédatrice ;
- journal de collections/objectifs, statistiques explicables et récompenses cosmétiques
  originales si les droits le permettent ;
- mode hors ligne/PWA, réglages de volumes, remappage et manette ;
- tests utilisateurs récurrents, pipeline de contenu versionné et calendrier éditorial.

## Validation reproductible de ce lot

```sh
npm run check
npm run audit:security
node --check main.js
git diff --check
```

Gate final local avant publication : **506 tests réussis**, aucun échec ni test
ignoré, 336/336 WebP distincts audités et build Vite réussi (45 modules). Le chunk
principal mesure 354,52 ko minifié / 95,91 ko gzip ; la Vue Réelle paresseuse
586,57 ko / 151,37 ko. Vite signale encore ce dernier chunk au-dessus de 500 ko.

## Sources primaires

- [KONAMI — Copyrights, permissions et usage non commercial](https://eu-support.konami.com/hc/en-gb/articles/9648771731479-Copyrights-Career-Opportunities-Goodies)
- [INPI — droit d’auteur, reproduction, représentation et adaptation](https://www.inpi.fr/ressources/propriete-intellectuelle/droit-dauteur)
- [KONAMI — liste Advanced effective au 18 mai 2026](https://www.yugioh-card.com/en/limited/list_2026-05-18/)
- [Règlement officiel](https://img.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf)

La partie juridique est un signal de blocage produit fondé sur les sources ci-dessus,
pas une consultation personnalisée. Un professionnel compétent doit valider les
droits et obligations de la juridiction visée.
