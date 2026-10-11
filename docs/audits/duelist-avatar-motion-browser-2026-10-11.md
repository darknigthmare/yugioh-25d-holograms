# Studio et gestes des avatars — audit navigateur compilé du 11 octobre 2026

**PASS : huit parcours, 192 modèles effectivement rendus et 52 captures.** Le [rapport original](artifacts/duelist-avatar-motion-2026-10-11/browser-compiled/report.json), les [logs](artifacts/duelist-avatar-motion-2026-10-11/browser-compiled/logs.txt) et la [vérification indépendante des fichiers](artifacts/duelist-avatar-motion-2026-10-11/browser-compiled/proof-verification.json) correspondent au même build figé. Les 63 fichiers originaux sont copiés sans modification dans le dépôt : 52 PNG, dix JSON et un fichier de logs `.txt`.

Le navigateur est Chromium headless avec SwiftShader. Il sert les fichiers de production dans un serveur local avec les en-têtes CSP de production ; aucune preuve Vercel n’est attribuée à ce parcours. Aucun build n’est exécuté par le driver. Les actions passent par les boutons, cartes, clavier, souris, événements tactiles Chromium, téléchargements réels et sélecteur de fichiers. Aucun hook QA ni objet applicatif privé n’est appelé, et aucun Duel démarré n’est injecté ou modifié par le driver.

## Parcours exécutés

| Parcours | Actions et résultats vérifiés |
| --- | --- |
| Desktop, 1280 × 900 | Catalogue, recherche et alias, huit séries, pagination, refus des personnages verrouillés, sélection au clavier et focus, persistance ; dix personnages emblématiques en studio, rotation souris/clavier/boutons, rendu des 192 modèles dans le même canvas ; pauses/reprises, fermeture et perte réelle de contexte WebGL ; Duel WASM avec changement Jaden → Kaiba, invocation, activation, attaque et dégâts. |
| Mobile, 390 × 844, mouvement réduit | Même catalogue et sélection ; dix modèles plein corps, rotation tactile native, clavier et boutons, cycle du studio ; changement d’avatar pendant un Duel WASM et invocations/activation réelles. Les gestes transitoires restent omis sous mouvement réduit. |
| Progression après une concession réelle | Fixture déclarée de deux défaites avant bootstrap ; abandon via le bouton du Duel ; trois Duels/trois défaites enregistrés, Tristan annoncé comme acquis, utilisable après rechargement et exporté. |
| Victoire native Exodia | Deck légal Main 40 / Extra 3 / Side 0 déclaré avant bootstrap et validé Advanced par l’interface. Quatre parties ouvrent la main ; la cinquième arrive à la pioche suivante après Fin du tour et le tour IA. Le moteur attribue une vraie victoire Exodia : un Duel/une victoire, Mokuba acquis, annoncé, sélectionnable après rechargement et exporté. |
| Import/export dans un Duel actif | Export téléchargé puis import par véritable FileChooser. Fusion des collections réellement obtenues par concession et victoire : Tristan et Mokuba conservés. État public du Duel et chaîne enregistrée du Deck identiques avant/après. Refus de `null`, JSON malformé, personnage inconnu et fichier de 64 001 octets, sans altérer la collection. |
| Refus du stockage | Fixture avant bootstrap : seule l’écriture de la clé avatar déclenche QuotaExceededError. La collection importée reste disponible dans la session, le stockage initial est préservé et un vrai téléchargement exporte la collection en mémoire. |
| Focus sans checkVisibility | Méthode DOM rendue indisponible avant bootstrap ; aucun Duel démarré. Piège de focus vérifié aux deux largeurs, détails fermés et ouverts, Tab et Shift+Tab. |
| WebGL indisponible | Nouveau Chromium lancé avec `--disable-webgl --disable-3d-apis`. Échec réel de création WebGL, retour au portrait visible, aucun canvas conservé et utilisation d’Atem toujours refusée. |

Le catalogue affiche **192 identités**, **11 disponibles** et **181 verrouillées**. Les séries comptent respectivement : Duel Monsters 28, GX 28, 5D’s 24, ZEXAL 24, ARC-V 28, VRAINS 20, SEVENS 20 et GO RUSH!! 20. Le refus d’Atem conserve sa condition de douze médailles et le profil inchangé. Les recherches accentuées et alias japonais, les résultats vides, la pagination et l’absence de débordement horizontal passent aux deux largeurs.

La sélection avec Entrée conserve le focus sur la vignette choisie. Échap revient au démarrage ou aux options avec leur déclencheur focalisé. Avec les détails d’aide fermés, Tab depuis le résumé revient à Fermer ; avec les détails ouverts, Tab depuis Importer revient à Fermer et Shift+Tab depuis Fermer revient à Importer. Le champ fichier masqué reste hors du cycle. Ces parcours passent avec la méthode DOM native et son fallback.

## Rendu, gestes et confidentialité

Les dix personnages photographiés en studio sont Yugi, Kaiba, Jaden, Yusei, Yuma, Yuya, Playmaker, Yuga, Yudias et Atem. Chaque sélection parmi les 192 exige un nouveau rendu observé avec son ID public et le libellé du canvas, ainsi que l’identité du même élément canvas. Le compteur enveloppe les méthodes WebGL `clear` originales avant bootstrap, conserve leurs arguments, leur `this` et leur résultat, et observe uniquement le canvas public du studio. Il n’expose aucun objet Game.

La boucle complète dure **96,8 secondes**. Elle utilise temporairement la préférence de mouvement réduit ; les dix captures emblématiques précédentes gardent la préférence initiale. Cette préférence est rétablie et contrôlée avant les parcours suivants. À chaque largeur, les deux captures du studio sous mouvement réduit sont identiques octet pour octet. Les rendus s’arrêtent aussi hors de la vue, reprennent lorsque le studio redevient visible, puis sont libérés au retour au portrait et à la fermeture. Une réouverture demande explicitement Vue 3D, puisque l’interface revient au portrait.

Sur desktop, l’invocation de Bœuf de Combat, l’activation de Double Summon, la seconde invocation de Saggi et une attaque légale proviennent des contrôles du Duel WASM. La perte adverse de LP est **8 000 → 7 500** ; les transitions publiques `summon`, `casting`, `attack` et `damage` sont enregistrées par les datasets de la scène. Les deux cartes adverses face cachée restent dissimulées lors du contrôle après combat. Le changement d’avatar préserve la main publique du joueur, les LP, cimetières, phase, journal et identité de l’avatar adverse.

Les résultats natifs conservent les datasets de pose terminale pendant au moins 500 ms : `victory/defeat/player` après Exodia, et `defeat/victory/opponent` après concession. Le modal de fin couvre la scène dans les captures de résultat ; ces images attestent l’annonce et les datasets attestent la pose tenue. Les [galeries de modèles séparées](artifacts/duelist-avatar-models-2026-10-11/DELIVERY-INDEX.md) documentent visuellement les poses articulées.

Les modèles restent des interprétations stylisées. Cet audit contrôle leur rendu et les interactions ; il ne certifie pas une reproduction graphique 1:1 de toutes les identités ni l’intégralité des règles TCG. Les corrections visuelles référencées et leur périmètre figurent dans le [registre distinct](artifacts/avatar-catalogue-review-2026-10-11/README.md).

## Erreurs et empreintes

**Zéro erreur inattendue** de console, HTTP, JavaScript, CSP ou chargement natif dans les huit parcours. Le seul contexte dont WebGL est volontairement désactivé produit exactement trois diagnostics conservés dans le rapport : deux messages THREE « A WebGL context could not be created… disabled by enterprise policy or commandline switch », et un « Error creating WebGL context ». Aucun autre message, ni aucun 404, n’est accepté.

L’illustration locale Double Summon ajoutée après le diagnostic est servie avec HTTP 200 et MIME `image/jpeg`, avant et après le parcours. Ses 19 651 octets gardent le SHA-256 `c238fa23bbc6ebe686e0e44482114cdf8376af364dc1b0b4cfc0795f63434809` dans la source, dist et les deux lectures HTTP.

Les **161 fichiers source figés**, **17 fichiers HTML/JS/CSS compilés**, les **trois archives natives** et l’illustration sont identiques avant et après. Les lectures HTTP épinglent donc **21 corps**. Le driver et ses trois helpers restent aussi identiques pendant l’exécution.

| Preuve | Taille | SHA-256 |
| --- | ---: | --- |
| Rapport compilé | 419 127 octets | `ed8bfe7aec40bcfa3caa3abf200be16de2ab092828a23e783c1870dd5e2d4951` |
| Driver navigateur | 64 829 octets | `5f9f5dd25cbb51edaadbed3ea965091dadc1ed2073309fde043f4b62a417c49c` |
| Gel final | 30 413 octets | `ac66a4463fc67f5590662b835318d0e8f34efc0b8871c539c7a66445b8921e92` |
| Entrée index-BdRAqqlF.js | 762 921 octets | `3e73212c9b5dd12c7a3dc62746bc66e552bddaf908c208fed65f07178d1de57c` |
| Téléchargement Mokuba après Exodia | 91 octets | `cf75f7f274f46db4c96693ba7e60e6b2835b05e982107b320bb91699de12dc3a` |

Les essais sur source et les deux tentatives compilées antérieures restent des diagnostics externes. La première avait une mauvaise attente du driver à la réouverture en portrait ; la deuxième identifiait le JPEG local absent. Leurs résultats globaux FAILED ne sont pas intégrés aux preuves PASS. Les preuves des 8 et 9 octobre restent inchangées.
