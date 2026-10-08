# Présentation native : attaque annulée et inspection privée — 8 octobre 2026

Cette passe corrige deux conséquences visuelles d'un résultat déjà établi par le moteur natif. Elle ne modifie aucune règle Lua, requête de statistiques ou réponse au core.

## Une attaque annulée s'arrête avant l'impact

`ATTACK_DISABLED` produisait un effet d'annulation tandis que le projectile d'attaque précédent continuait jusqu'à son impact. La frontière publique distingue maintenant `attack-negated` confirmé avec `nativeAttackNegated: true` d'une simple annulation de maillon de Chaîne.

Le [gestionnaire réel](../../src/ui/RealDuelScene3D.js) retire uniquement les effets d'attaque dont le triplet public `sourceRef.owner / zoneType / zoneIndex` correspond. Il libère leur géométrie, leurs matériaux et leurs buffers d'instances, puis retire les poses appartenant à ces effets, notamment le recul de cible différé. Une autre attaque, une annulation de Chaîne au même emplacement ou une animation plus récente sur la cible précédente conserve sa propre progression.

Le nettoyage précède les contrôles de mouvement réduit et d'onglet caché : une attaque déjà partie peut ainsi être annulée sans créer une nouvelle animation ni réveiller un onglet invisible. Les monstres statiques persistent. Les références invalides et les signaux non confirmés ne peuvent pas sélectionner une attaque à retirer.

Les cinq nouveaux [tests du gestionnaire](../../test/real-duel-attack-negation.test.js) emploient les véritables effets, modèles, poses et frames de `RealDuelScene3D`. Ils vérifient l'absence de mise à jour vers l'impact après annulation, la libération unique, le recul supprimé, les contrôles négatifs par camp/index/Zone Extra, les poses ultérieures, les notifications répétées et les modes caché/réduit. La série comprenant aussi les modèles, poses, boucles de rendu, effets spécifiques et frontières publiques passe **35/35 tests**.

## Les confirmations privées deviennent consultables localement

`CONFIRM_CARDS` autorise un destinataire natif ; le propriétaire de la carte inspectée peut être l'autre joueur. Les événements privés sécurisés par la [correction de confidentialité](native-confirmation-privacy-2026-10-08.md) étaient ignorés par la présentation principale.

Le nouveau [panneau d'inspection](../../src/ui/PrivateCardInspection.js) exige `type: inspect`, `private: true`, `nativeAudienceConfirmed: true` et un `audienceController` égal au `game.playerController` courant, qui peut valoir **0 ou 1**. Ces contrôles et le groupe natif valide précèdent tout accès au descripteur de carte, au catalogue imprimé ou à l'image. Le routeur réel de `main.js` consomme les événements d'inspection, y compris ceux refusés, avant le suivi de campagne et les présentations publiques.

Le panneau nonmodal « Inspection privée » réunit les cartes du même `inspectionGroupId`. Un autre groupe ou un nouveau Duel remplace les anciennes cartes. Les noms et illustrations sont accessibles, les boutons permettent d'afficher les détails imprimés dans un inspecteur propre au panneau, et les actions clavier Fermer/Échap retirent ses nœuds et son état. Le démarrage d'un Duel, le retour à la configuration et la fin de partie le nettoient également. Aucun blocage ni réponse synthétique au core n'est ajouté.

Le descriptif court du moteur est enrichi avec la description et l'image locales du catalogue CDB seulement après autorisation. Aucun état de carte cachée ni statistique native n'est interrogé ; les noms inspectés ne sont transmis ni au journal public, ni aux animations, ni au suivi de campagne, ni au cache public de révélations. Le panneau utilise des nœuds de texte et des URL d'image filtrées. Sa largeur reste dans le viewport, ses commandes ont une cible d'au moins 44 pixels, et sa hauteur mobile est bornée à 52 `dvh` avec défilement interne.

Les sept [tests ciblés](../../test/private-card-inspection.test.js) utilisent notamment les **six véritables événements Smartfon du contrôleur 1** conservés dans le [rapport natif](artifacts/native-confirmation-privacy-2026-10-08.json). Ils vérifient le groupement, le bon destinataire avant getters et métadonnées, l'enrichissement CDB, les textes/URL sûrs, le remplacement et nettoyage, ainsi que le routeur principal réel exécuté en VM avec des consommateurs publics qui échoueraient s'ils recevaient ces données. Avec les contrats produit et de confidentialité existants, **29/29 tests** passent.

## Portée des preuves navigateur

Le [runner dédié](../../scripts/audit-private-card-inspection-ui.py) importe le panneau de production et le catalogue factuel dans Chromium, avec les six descripteurs issus du scénario WASM enregistré. Il couvre les tailles 1280 × 900 et 390 × 844. Cette vérification isolée porte sur le panneau et les informations autorisées ; elle ne prétend pas reproduire un nouveau Duel entier ni certifier une annulation d'attaque via un parcours navigateur.

Le [rapport navigateur](artifacts/private-card-inspection-ui-2026-10-08/report.json) passe pour les **deux tailles**, sans erreur de page, sans requête externe et sans changement des dépendances pendant les captures. Il enregistre les empreintes du rapport natif F, des sources du panneau et de la frontière native, du CDB imprimé, des scripts et manifestes, ainsi que des assets locaux utilisés. Le build central préalable est identifié par `/assets/index-BAjs-Biw.js`, SHA256 `ab8aece9cffe26026f69778ff4ddf9bba6a0bfc7abbe67435c725df23eed96b7` ; le runner ne reconstruit pas le build et teste le module source isolé.

Les **quatre captures finales ont été ouvertes et inspectées** : [six cartes sur ordinateur](artifacts/private-card-inspection-ui-2026-10-08/private-inspection-six-cards-1280.png), [détails au clavier sur ordinateur](artifacts/private-card-inspection-ui-2026-10-08/private-inspection-keyboard-details-1280.png), [six cartes sur mobile](artifacts/private-card-inspection-ui-2026-10-08/private-inspection-six-cards-390.png) et [détails au clavier sur mobile](artifacts/private-card-inspection-ui-2026-10-08/private-inspection-keyboard-details-390.png). Le panneau reste dans les deux viewports, sans débordement horizontal ; ses boutons mesurent au moins 44 × 44 pixels. Le rapport couvre le refus d'un autre destinataire sans accès à son identité, le remplacement par un autre groupe, Fermer, Échap et le nettoyage complet. Sur mobile, les détails se consultent par défilement interne ; le panneau garde le viewport accessible et aucun backdrop ou verrouillage de focus n'est installé.

Trois cartes du scénario disposent de leur illustration locale : La Jinn, Monster Reborn et Typhon d'Espace Mystique. **Jerry Beans Man, Alexandrite Dragon et Dark Hole utilisent le placeholder imprimé local**, car leur illustration n'est pas disponible dans le catalogue actuel. Les six noms et descriptions imprimées restent accessibles. Le chargement des six images, dont ces trois placeholders, ne certifie donc pas six illustrations exactes.

Le test de restauration de Match a également été adapté à ce nouveau nettoyage local : **5/5 tests passent**, avec une assertion que l'ancienne inspection est retirée une fois avant la complétion du vrai démarrage natif. Les sources d'application restent inchangées après le gel ; les preuves navigateur ont été produites après le build central.

Les tests de syntaxe JS/Python et les contrôles `git diff --check` passent. Les sources sont gelées pour le contrôle et le build central ; aucun build, commit ou déploiement n'est effectué par ce chantier.
