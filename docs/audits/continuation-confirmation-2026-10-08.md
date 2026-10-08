# Confirmations publiques et privées — continuation du 8 octobre 2026

Les révélations officielles par `CONFIRM_CARDS` étaient réservées au seul destinataire du message, même lorsqu’un script demandait une révélation publique. La continuation branche une politique en production et ajoute un panneau « Cartes révélées », distinct de l’inspection privée. Le moteur conserve chaque choix, coût, déplacement et résultat.

La politique est bornée aux huit sources exactes de Galloping Gaia, Duel Tower, Reinforcement of the Army, Terraforming, Dragon Ravine, Union Hangar, Sangan et Witch of the Black Forest. Elle vérifie les SHA-256 de l’archive et de la source réellement exécutée ; Duel Tower garde la correction locale déjà documentée. Une source inconnue ou modifiée n’autorise aucune révélation supplémentaire.

Seul le lien natif actif est pris en compte : `CHAINING` jusqu’à `CHAINED` pour les coûts, puis `CHAIN_SOLVING` jusqu’à `CHAIN_SOLVED` pour la résolution. Annulation et fin de Chaîne effacent cette attribution. La présence d’un autre lien public dans la Chaîne n’autorise pas l’inspection privée d’un effet différent. L’audience et l’emplacement de chaque confirmation doivent correspondre au script vérifié.

Le [rapport natif](artifacts/native-confirmation-continuation-2026-10-08.json) exécute **22 nouveaux duels**, projetés pour les deux spectateurs : 16 cas publics couvrent les huit sources pour les deux contrôleurs, quatre cas privés vérifient Smartfon et Diabolos, deux cas conservent l’excavation publique. Le traducteur de la livraison précédente est archivé byte-identique ; son seul import est adapté pour la comparaison. Les traces comprennent messages, décisions, queries, fixtures, sources et empreintes.

Les confirmations publiques ne créent aucune identité persistante de slot ni requête statistique d’une zone cachée. Les inspections privées restent hors des caches, logs et visuels publics ; le spectateur exclu n’effectue aucun lookup de leur identité. Le panneau public partage seulement le rendu imprimé avec le panneau privé : chaque consommateur vérifie sa propre audience avant d’accéder à une carte. Images et textes sont reconstruits depuis le catalogue local, sans référence à une instance secrète du Duel.

Les deux panneaux sont nettoyés au remplacement du Duel, au retour à la configuration et à la fin de partie. Les boutons restent accessibles au clavier et disposent d’une hauteur minimale de 44 px. Les tests de sécurité vérifient le rejet avant les getters, les sources modifiées, les liens voisins et l’annulation native. Les preuves navigateur du build final sont consignées dans le [gate courant](native-continuation-wave-2026-10-08.md).

Cette liste de huit sources ne classe pas toutes les confirmations du catalogue ; son extension nécessite de vérifier chaque texte et chaque source exécutée. Les JPEG restent exacts. Le panneau est une présentation des révélations effectuées par le core, pas une nouvelle autorité de règles.
