# Revue indépendante — avatars de duellistes — 9 octobre 2026

## Périmètre et conclusion

Revue statique du diff avatars dans main/index, les contrôleurs de présentation, la scène réelle, le catalogue, la progression, le sélecteur, les portraits et les modèles. Aucun fichier applicatif ou fichier d’un autre agent n’a été modifié ; ce compte-rendu est la seule écriture du relecteur. Les assertions existantes ont été lues, mais aucun test, build, upload ou publication n’a été exécuté.

Le catalogue compte **192 identifiants uniques de personnages stylisés, dans huit séries, dont 11 gratuits dès le départ**, vérifiés en lisant ses lignes. Il s’agit d’un roster explicite de silhouettes : ni tous les figurants, ni toutes les transformations, ni une reproduction intégrale 1:1 ne sont revendiqués.

Aucun défaut bloquant de progression, de confidentialité ou de lifecycle n’a été trouvé. Un P2 de préférence d’animation et un P3 de confort de focus après sélection ont été corrigés et relus dans la source figée.

## Progression et stockage

- Le profil est versionné, borné en taille, limité à des clés autorisées et lu via ses seules propriétés propres de données. Les listes d’identifiants acquis sont bornées et dédupliquées ; IDs inconnus, champs hérités et accesseurs ne confèrent pas d’acquisition.
- Un profil invalide est réparé en mémoire sans écrasement automatique de la valeur stockée. Une sélection explicite autorise le remplacement de cette seule préférence cosmétique. Si le stockage refuse l’écriture, le choix reste actif pendant la session et le message indique l’absence de sauvegarde.
- La collecte et le sélecteur ne créent aucun compteur de duel. Les déblocages dérivent des duels terminés et des douze missions ; les meilleurs résultats de médailles contribuent chacun une fois. Les victoires, tentatives et prédécesseurs de campagne sont contrôlés.
- handleGameOver collecte après actualisation des statistiques et du résultat de campagne. La garde des duels déjà enregistrés évite les doubles résultats. Les IDs acquis restent acquis après réinitialisation des résultats de campagne ou des statistiques.
- Les sauvegardes restent locales et modifiables par l’utilisateur. Leur validation ne constitue pas une protection de compte, de classement ou contre la triche.

Sources : DuelistAvatarProgress, initialisation/sélection/refresh et handleGameOver de main.js, et SoloCampaignController.

## Chargement différé, modales et confidentialité

Le contrôleur conserve les IDs cosmétiques validés et les retransmet à la Vue Réelle après son import différé, avant la première activation. La sélection ne remplace ni GameState, ni deck, ni règles. La scène reçoit deux identifiants de personnages ; elle ne dérive pas leur identité de cartes privées.

Les ouvertures depuis préparation/options mémorisent la fenêtre précédente et reviennent à son point d’entrée. Échap emploie la fermeture du sélecteur. Le lancement et le retour à la configuration annulent le retour de modale. Les inspections privées sont effacées avant les nouvelles opérations du retour à la configuration, conformément au contrat privacy-first.

Les libellés sont échappés et les portraits utilisent des SVG locaux. La pagination limite la grille à 24 cartes. Aucune requête d’image externe ni nouvelle exposition d’identité de carte masquée n’est introduite.

Le bouton de sélection est remplacé par render avant/après son await. La correction P3 mémorise désormais si ce CTA détenait le focus puis, après le rendu final, rend le focus à la vignette choisie avec preventScroll, uniquement si le sélecteur reste visible et non détruit. Dans l’application, le callback de sélection est synchrone ; son await ne crée pas de longue attente utilisateur. Le message confirme correctement le changement immédiat, y compris pendant un duel. Source relue : DuelistAvatarPicker.js, SHA-256 c39af793a6cf27648f8a104c0ac7b364f896c06ac470d17922af305644196215.

## Animation, ressources et performances

Le modèle capturait la préférence reduced-motion à sa création tandis que la scène pouvait relancer RAF après changement de préférence. Le correctif relu dans _updateDuelistAvatars transmet désormais la préférence courante à chaque update. L’agent modèles rapporte des assertions ciblées couvrant les deux directions ; le relecteur confirme le code, sans revendiquer une exécution personnelle.

Le changement de personnage dispose l’ancien modèle. La destruction est idempotente, libère les géométries/matériaux puis détache le groupe. Le teardown dispose les avatars avant le reste de la scène. La désactivation, l’onglet masqué et la fin du duel suspendent la boucle. Three.js reste dans la présentation réelle chargée différément.

Les assertions relues fixent au roster un budget maximal de 10 meshes et 12 000 triangles par avatar et distinguent les silhouettes par géométrie. Il s’agit de contrats de tests, pas de mesures FPS du relecteur. Les captures et mesures navigateur appartiennent à l’audit QA séparé.

## Outils de manifest et publication

Lectures réelles : HEAD local d6e0ff65b08e32ae6b4629d0f8e97a45b4543d01 ; parent distant f339daffed431067a77b11ec65ed4b5b9c02f1b6 ; arbre commun df7c99edb051b0fa5db114f1f2df89dfa35737f1 ; master e595f1fa5ef8d39f460e0ed3f825546d8652191a. L’index normal était sans changement staged.

Le helper /workspace/yugioh-avatar-publication-helper-2026-10-09.py a été relu sans exécution. SHA-256 relu : 01cfd7c714847245a4cb3fc97f104e68ed484b94c8669e95bb905cf64be268fd.

Avant upload, validate lie le manifest au HEAD local fixé, au parent distant exact, à l’arbre de référence, à la liste exacte des fichiers changés, à leurs octets/tailles/SHA-256/Git blob SHA et au chemin fixe/digest du présent audit. Les octets et références sont recontrôlés après uploads immuables. L’arbre est construit dans un index temporaire ; chaque SHA d’arbre distant est vérifié. La mise à jour de branche utilise force=false.

Le générateur distingue le manifest provisoire de celui marqué --final-reviewed. Ce dernier drapeau relève de la revue indépendante de la liste finale et de ses octets ; le helper ne remplace pas la lecture du contenu.

Le premier provisoire /tmp/yugioh-avatar-publication-manifest-provisional-2026-10-09.json, SHA-256 35f8289e75bee31bff3c33a2c4ce85761cb942ccf3c94048b26091fb5a31b432, a été lu indépendamment : 21 fichiers, 908 482 octets, safeToPublish=false. Toutes ses tailles, SHA-256 et Git blob SHA concordaient ; aucun chemin sensible, symlink ou motif de credential n’a été détecté et les preuves historiques suivies étaient inchangées. Ce premier périmètre a ensuite été remplacé par la revue finale ci-dessous.

La liste finale provisoire du même chemin, SHA-256 6815cfd1c03cc9aa007f08270dd25692003748b20d36bc59b5c6859832f49310, a été relue indépendamment : **45 fichiers, 8 109 420 octets, safeToPublish=false**. Elle couvre exactement tous les fichiers changés/non suivis du périmètre, avec le présent audit, le driver, les 18 captures, le rapport QA, le gel et les deux journaux .txt réellement inclus malgré l’exclusion générale de *.log. Toutes les tailles/SHA-256/Git blob SHA sont exactes. Aucun chemin sensible, symlink, traversée de chemin ou motif de credential n’est présent. Les sources natives, archives publiques et preuves historiques antérieures restent inchangées. Les 157 sources et 14 compilés du gel correspondent toujours à leurs octets.

Feu vert à la génération du manifest --final-reviewed sur cette liste finale. Le présent document est la seule donnée ajustée après la comparaison du provisoire ; le manifest final doit donc être régénéré avec son nouveau digest, puis relu avant la publication par root. Le relecteur n’effectue aucun upload ni changement de référence.

## Limites et suite

Le gel local /workspace/yugioh-avatar-build-freeze-2026-10-09.json a été relu, SHA-256 e0f318d99fbcfb3725827a103a4070032f5ca22ba49aa00e37e517cac0d8d9aa. Les 157 fichiers source et 14 fichiers compilés listés correspondent toujours à leurs octets et SHA-256. Entrée actuelle : /assets/index-u38YK6zY.js, 742 088 octets, SHA-256 de12db2a24b25bcc3d16f82c882d887d3597922ea8ca8f4c37cc9daaeb7b5ebd.

Le journal local final existant /tmp/yugioh-avatar-check-final-2026-10-09.log correspond à la taille et au digest inscrits dans ce gel. Son résumé réellement lu, ainsi que sa copie livrée check-final.txt, donne 2 600 tests et 2 600 pass, zéro fail/cancelled/skipped/todo et Vite 128 modules. Les deux répertoires de tests contiennent 157 fichiers .test. La copie livrée security-final.txt imprime effectivement zéro vulnérabilité. Ce sont les résultats des commandes exécutées par root, relus sans les relancer ; la preuve CI indépendante devra confirmer ses propres logs au nouveau SHA.

Le rapport QA final, SHA-256 daa9ac1384fefaf179ffca844ead19ffa5f3ef92a2a98a73e8b1885d69184722, consigne quatre parcours réussis et 18 captures. Les 17 corps HTTP avant/après concordent exactement avec les digests et tailles compilés et avec les fichiers dist actuels ; les 15 sources du sous-ensemble navigateur sont identiques avant/après. Le driver distingue explicitement ses fixtures avant bootstrap des actions réelles ensuite exécutées par l’interface : concession d’un duel lancé et victoire native Exodia d’un deck Advanced validé. Aucun appel direct à handleGameOver ni ajout de compteur après lancement n’est utilisé pour fabriquer ces deux résultats. Les captures ont été inspectées par l’agent QA et root ; le relecteur vérifie ici les données et le driver, sans revendiquer une inspection visuelle personnelle des 18 images.

La revue est statique, sans mesure visuelle personnelle de chacun des 192 personnages et sans audit exhaustif des règles de duel. La liste finale incluant les preuves QA est revue ; seul le renouvellement du digest de ce document reste à incorporer au manifest marqué final. La CI et l’aperçu devront provenir du nouveau SHA transmis par root. Aucun ancien compte de tests TCG, ancien bundle ou ancien déploiement n’est présenté comme preuve avatars actuelle.
