# Exécution native des 339 Magies de Terrain — 7 octobre 2026

Les **339 cartes du catalogue disposent de leur ligne CDB et de leur véritable script Lua**, et leur `initial_effect` s’exécute sans diagnostic Lua dans **339 duels natifs distincts**. **128 scénarios de règles passent**, couvrant **115 Terrains différents**. Les 77 scénarios précédents et leurs 65 Terrains sont conservés : deux nouveaux lots ajoutent respectivement 30 scénarios sur 29 nouveaux Terrains, puis 21 scénarios sur 21 autres Terrains. Ces résultats concernent le moteur WASM ; la vérification du navigateur possède son propre rapport.

| Niveau de preuve | Résultat | Ce qu’il établit |
| --- | ---: | --- |
| `bundled` | 339 / 339 | Ligne CDB et script Lua exact présents dans les archives livrées. |
| `initialized` | 339 / 339 | Insertion du terrain, `initial_effect`, enregistrement des effets, requête native et démarrage d’un duel sans erreur Lua. |
| `effectTested` | 115 / 339 | Au moins un effet exécuté et vérifié dans les scénarios ci-dessous. |
| `integrationTested` | 0 dans cet audit | Cet audit Node ne produit aucune preuve de clics, d’affichage ou de comportement du navigateur. |

La matrice complète contient les passcodes canoniques et physiques, les chemins Lua amont, les SHA-256 de chaque script, les réponses typées, les messages du moteur et les résultats des requêtes : [native-field-runtime-2026-10-07.json](artifacts/native-field-runtime-2026-10-07.json). Chaque scénario conserve aussi ses cartes initiales, leurs zones, positions, passcodes physiques et provenance Lua, y compris les partenaires, ainsi que les quatre mots de sa graine RNG native. Elle conserve les quatre niveaux séparément. L’initialisation ne vérifie pas toutes les branches des effets ni l’exécution de tous les événements enregistrés.

## Scénarios exécutés

Chaque scénario utilise un nouveau handle de duel et des cartes réelles. Les assertions portent sur les messages de chaîne et les requêtes du moteur, sans calcul d’effet dans JavaScript.

| Terrain | Preuve d’effet native |
| --- | --- |
| Zombie World | Activation depuis la main ; Blue-Eyes devient Zombie. |
| Necrovalley | Gravekeeper’s Spy gagne 500 ATK/DEF ; deuxième duel : Monster Reborn est légalement activé et ciblé, puis son effet est désactivé à la résolution. Le monstre adverse reste au Cimetière. |
| Molten Destruction | Ryu-Ran reçoit +500 ATK et −400 DEF. |
| Gaia Power | Jerry Beans Man reçoit +500 ATK et −400 DEF, avec DEF limitée à zéro par le moteur. |
| Wetlands | Slime Toad, WATER/Aqua de Niveau 2, gagne 1200 ATK. |
| A Legendary Ocean | Slime Toad reçoit +200 ATK/DEF et son Niveau passe de 2 à 1 ; l’identité native respecte l’alias Umi. |
| Dragon Ravine | Défausse réelle de Dark Magician en coût ; sélection du mode d’envoi ; Blue-Eyes envoyé depuis le Deck par effet. Les raisons natives distinguent coût et effet ; aucune cible de chaîne. |
| Fusion Gate | Sélection de Fusion et matériaux ; trois Blue-Eyes sont bannis et Blue-Eyes Ultimate Dragon est Fusion Summoned. Deuxième duel : trois Fusions successives occupent les Main Monster Zones sous MR5. |
| Extra Net | Une Fusion depuis l’Extra Deck déclenche une chaîne obligatoire ; le joueur adverse répond à la proposition de pioche et pioche réellement. |
| Summon Breaker | Deux Special Summons légaux de Gilasaurus, puis un Normal Summon ; le troisième déclenche la chaîne et le passage en End Phase. |
| Venom Swamp | Trigger obligatoire d’End Phase ; un Venom Counter est ajouté, vérifié par requête, et Dark Magician perd 500 ATK. |
| Mausoleum of the Emperor | Chaîne d’ignition ; paiement natif de 2000 LP ; Normal Summon de Blue-Eyes sans Tribute. |
| Harpies’ Hunting Ground | Normal Summon de Harpie Lady ; trigger obligatoire, cible adverse Spell/Trap et destruction ; bonus de 200 ATK vérifié. |
| Geartown | Mystical Space Typhoon cible et détruit le terrain ; son trigger optionnel invoque Ancient Gear Gadjiltron Dragon depuis le Deck. |
| Magical Citadel of Endymion | Hinotama résout et crée un Spell Counter ; un MST ultérieur cible Citadel, puis une décision explicite consomme un compteur pour remplacer la destruction. |
| Gateway to Chaos | Activation, sélection du vrai Black Luster Soldier Ritual et ajout depuis le Deck à la main ; aucune cible de chaîne. |
| Black Garden | Normal Summon d’Alexandrite Dragon ; ATK divisée par deux et véritable Rose Token créé sur le terrain adverse. |
| Angelechy Endgame Problem | Deux Angelechy Monster Cards deviennent légalement des Continuous Spells via Angelechy Problem : défausse de MST, invocation d’Enlisted, placement de Bastion et trigger de placement de Shatranga. Endgame remplace le premier terrain. Lors du Special Summon adverse de Gilasaurus, le moteur propose la décision de zone au propriétaire d’Endgame ; ce joueur place Gilasaurus dans la Main Monster Zone adverse 2. |
| Magical Meltdown | Recherche Aleister ; une seconde copie reste en main et une cible reste au Deck, mais l’activation est bloquée par l’oath. Deuxième duel : Polymerization est d’abord annulée par Solemn Judgment, puis une nouvelle tentative de negation échoue sous Meltdown et Ultimate Dragon est invoqué. Le core propose encore cette seconde chaîne Judgment ; la preuve porte sur la protection à la résolution. |
| Oracle of Zefra | Recherche Zefraxi depuis le Deck ; refus d’activer une seconde copie avec une cible restante, selon l’oath. |
| Prank-Kids Place | Recherche Lampsies ; seconde copie interdite à l’activation avec une autre Lampsies encore au Deck. |
| Evil Eye Domain — Pareidolia | Recherche Serziel et oath d’activation ; deuxième duel : MST détruit le Terrain, puis le trigger cible Serziel au Cimetière et le récupère en main. |
| Therion Discolosseum | Recherche Therion King Regulus ; seconde copie et seconde cible disponibles, mais oath d’activation appliqué. |
| Primeval Planet Perlereino | Recherche Tearlaments Merrli ; oath d’activation vérifié avec une seconde copie et une seconde cible réelles. |
| Fire King Island | Destruction de Dark Magician en main par effet, suivie de la recherche de Barong ; les deux modes d’ignition partagent la limite consommée. Deuxième duel : départ du Terrain par MST, puis trigger obligatoire détruisant Barong ; le monstre adverse est conservé. |
| Dragonic Diagram | Destruction de MST en main par effet, sans raison de coût ; recherche True Draco Heritage, puis ignition indisponible malgré une nouvelle paire valide main/Deck. |
| Union Hangar | Recherche A-Assault Core ; son Normal Summon déclenche la sélection ciblée et l’équipement de B-Buster Drake depuis le Deck. L’Union équipé ne peut pas se Special Summon ce tour. |
| SPYRAL Resort | Recherche Super Agent une fois ; End Phase réelle, choix d’entretien et retour de Blue-Eyes depuis le Cimetière au Deck comme coût. Le Terrain reste en jeu. |
| Trickstar Light Stage | Recherche Candina ; cible un Mirror Force face verso adverse, puis l’envoie au Cimetière par règle si le joueur ne l’active pas à l’End Phase. |
| The Hidden City | Recherche Subterror Guru ; ignition sans ciblage change Subterror Nemesis Archer de face verso défense à face recto attaque via la vraie décision de position. |
| Vendread Nights | Défausse de Dark Magician comme coût, avec raisons natives `COST` et `DISCARD` ; recherche Revenants et limite d’usage appliquée malgré une autre cible restante. |
| U.A. Stadium | Normal Summon de Midfielder, recherche Perfect Ace ; son Special Summon retourne Midfielder en main et déclenche le bonus de 500 ATK sur Perfect Ace. |
| Myutant Evolution Lab | L’activation invoque M-05 banni face recto ; deux noms distincts encore bannis donnent 200 ATK. L’ignition renvoie ST-46 en bas du Deck et pioche Dark Magician ; limite d’usage vérifiée. |
| Drytron Fafnir | Recherche Drytron Nova ; avec Alpha Thuban face recto, le Normal Summon adverse d’Alexandrite Dragon déclenche la baisse de Niveau 4 à 2. |
| Chicken Game | Paiement de 1000 LP et pioche native ; usage unique. Au tour adverse, Hinotama inflige zéro dégât au joueur ayant le moins de LP, dont les LP restent à 7000. |
| Pacifis, the Phantasm City | Normal Summon de Jerry Beans Man, recherche Phantasm Spiral Battle et restriction des Effect Monsters. Au tour adverse, chaîne sur Hinotama et création d’un vrai Phantasm Spiral Token de 2000 ATK. |
| Lost World | Gilasaurus crée un Jurraegg Token adverse. Dark Magician perd 500 ATK ; destruction de Dark Hole remplacée pour deux Normal Monsters par la destruction de deux vrais Sabersaurus du Deck. Les Normal Monsters restent sur le Terrain. |
| Revolving Switchyard | Envoi d’une carte de main en coût, sans raison `DISCARD`, recherche Bullet Train, puis son invocation n’ouvre pas le trigger dont la limite partagée est déjà consommée. Deuxième duel : le trigger disponible invoque Flying Pegasus depuis le Deck et change son Niveau de 4 à 10. |
| Sky Striker Airspace — Area Zero | MST cible et détruit le Terrain ; trigger au Cimetière et invocation de Raye depuis le Deck. |
| Runick Fountain | Activation de Golden Droplet ; cible deux Quick-Play Runick au Cimetière, tri de leur retour en bas du Deck et pioche de deux cartes. Quatre cartes du Deck adverse sont réellement bannies. |
| Primitive Planet Reichphobia | Recherche Scareclaw Acro ; trois monstres en défense réduisent Blue-Eyes adverse de 300 ATK et permettent une ignition ciblée qui le détruit. |
| Mountain | Dragon et Winged Beast des deux joueurs gagnent 200 ATK/DEF ; Dark Magician reste inchangé. MST détruit le Terrain et les statistiques natives reviennent à leur valeur de base. |
| Sogen | Warrior et Beast-Warrior des deux joueurs gagnent 200 ATK/DEF ; Blue-Eyes reste inchangé. Destruction du Terrain et rétablissement des statistiques. |
| Umi | Slime Toad gagne 200 ATK/DEF ; Jinzo adverse perd 200 ATK/DEF et Dark Magician reste inchangé. MST supprime ces modifications. |
| Umiiruka | Slime Toad WATER gagne 500 ATK et perd 400 DEF ; Ryu-Ran FIRE adverse conserve ses valeurs de base. MST rétablit les statistiques. |
| Lemuria, the Forgotten City | Deux Slime Toad contrôlés reçoivent 200 ATK/DEF, puis passent du Niveau 2 au Niveau 4 par ignition ; le Slime Toad adverse conserve le Niveau 2. Usage unique et retour au Niveau 2 à l’End Phase, sans perte du bonus continu. |
| The Gates of Dark World | Summoned Skull banni comme coût ; Broww défaussé par effet, déclenchant sa véritable pioche. Deux cartes sont piochées au total et le bonus de 300 ATK du Fiend est vérifié. Limite d’ignition appliquée. |
| Triamid Fortress | Triamid Hunter gagne 500 DEF et survit à Dark Hole ; Dark Magician adverse est détruit. MST détruit Fortress et son trigger récupère Triamid Dancer au Cimetière ; le bonus disparaît. |
| Triamid Cruiser | Normal Summon de Hunter : gain de 500 LP, pioche et défausse par effet. Après destruction du Terrain, son trigger recherche Triamid Master. |
| Triamid Kingolem | Triamid Master gagne 500 ATK ; destruction du Terrain, puis véritable trigger d’invocation de Hunter depuis la main et retour des statistiques de Master à leur base. |
| Aroma Garden | Ignition avec Jasmine : gain de 500 LP, bonus de 500 ATK/DEF sur les monstres contrôlés et vraie pioche de Jasmine. La destruction de Jasmine déclenche ensuite le gain de 1000 LP du Terrain. |
| Pandemonium | Destruction par effet d’Archfiend Soldier de Niveau 4 : recherche de Desrook de Niveau 3 ; un second Soldier de Niveau 4 restant au Deck est exclu du choix. Autre duel : Terrorking paie initialement 800 LP, puis Pandemonium supprime effectivement le paiement au prochain Standby de son contrôleur. |
| Domain of the True Monarchs | Réduction du Niveau d’Erebus de 8 à 6, véritable Tribute Summon avec un monstre, puis verrou de l’Extra Deck adverse lorsque l’Extra Deck du contrôleur est vide. MST libère Link Spider adverse. Autre duel : Erebus attaque Blue-Eyes avec 3600 ATK uniquement au calcul des dommages, inflige 600 dommages de combat et revient à 2800 ATK. |
| Toon Kingdom | Activation : trois cartes bannies face verso. Book of Moon adverse peut cibler Dark Magician, mais exclut Toon Gemini Elf du choix. Dark Hole détruit Dark Magician ; une décision explicite remplace la destruction du Toon par un quatrième bannissement face verso. |
| Lair of Darkness | Tous les monstres face recto deviennent DARK. Lilith utilise Blue-Eyes adverse comme coût et place une vraie Trap sélectionnée depuis le Deck. La substitution ne peut pas être réutilisée ce tour par Ahrima, qui se sacrifie normalement. L’End Phase crée exactement deux Torment Tokens, en défense, chez le joueur du tour. |
| Marincess Battle Ocean | Véritable Link Summon de Blue Slug en Extra Monster Zone, équipement de Crystal Heart depuis le Cimetière et ATK finale de 2300. Autre duel : Crystal Heart est d’abord réellement Link Summoned, puis utilisé comme matériau de Marbled Rock. Équipé par Ocean, Rock atteint 3300 ATK, résiste au Dark Hole adverse et est détruit par celui de son propre contrôleur. |
| Hidden Village of Ninjitsu Arts | Normal Summon de Hanzo ; le trigger de Village récupère Ninjitsu Art of Alchemy depuis le Cimetière. Les deux copies de ce nom en main ne sont plus activables ce tour, malgré un Ninjitsu Art face recto remplissant leur condition. |
| PSY-Frame Circuit | Au tour adverse, Normal Summon de Jerry Beans Man : Alpha se déclenche, invoque réellement Alpha et Driver, et recherche une seconde Driver. Circuit propose puis réalise immédiatement le Synchro Summon de PSY-Framelord Zeta avec les raisons natives MATERIAL/SYNCHRO. |
| Salamangreat Sanctuary | Premier véritable Link Summon de Sunlight Wolf avec deux monstres FIRE ; Sanctuary permet ensuite un second Wolf en utilisant le premier comme unique matériau. Une troisième copie reste dans l’Extra Deck, mais cette procédure est indisponible après consommation de la limite. |
| Traptrip Garden | Deux Normal Summons Traptrix sont exécutés ; un troisième est refusé. L’ignition bannit Myrmeleo comme coût puis invoque Dionaea depuis la main. Une autre Dionaea valide reste en main, mais l’ignition ne peut pas être réutilisée. |
| Rikka Konkon | Ignition : place Rikka Glamour face verso depuis le Deck et impose la restriction Plant ; Gilasaurus devient indisponible. Mudan utilise ensuite Blue-Eyes adverse à la place d’un Plant en coût, s’invoque et recherche une seconde Glamour, tout en conservant Petal. Autre duel : l’activation seule n’impose pas cette restriction ; Glamour sacrifie Blue-Eyes adverse et recherche deux Plants de Niveau 6 aux noms différents. |
| The Sanctuary in the Sky | Dunames Dark Witch est détruite par Blue-Eyes au combat, mais son contrôleur ne subit aucun dommage de combat. Le second duel détruit préalablement Sanctuary par MST et rétablit les 1200 dommages, avec les mêmes monstres. |
| Ancient Forest | L’activation retourne Man-Eater Bug et Blue-Eyes en attaque sans déclencher l’effet FLIP de Bug. Blue-Eyes attaque et détruit Bug ; le vrai trigger de fin de Battle Phase détruit ensuite Blue-Eyes par effet. |
| Dark Sanctuary | Deux attaques natives déclenchent les deux résultats réels du RNG, avec graines enregistrées. Pile laisse résoudre l’attaque et inflige 3000 dommages au contrôleur du Terrain ; face annule l’attaque et inflige exactement 1500 dommages d’effet au contrôleur de Blue-Eyes. |
| The Seal of Orichalcos | Activation détruit un Gilasaurus réellement Special Summoned, donne 500 ATK à Jerry Beans Man et interdit Link Spider depuis l’Extra Deck. Le premier MST est remplacé ; le second détruit le Terrain et libère l’Extra Deck. Une seconde copie reste interdite à l’activation par la limite une fois par Duel. |
| Catalyst Field | Normal Summon sans Tribute de Dioxogre de Niveau 8, puis véritable second Normal Summon Gemini. Banni temporairement par effet pour détruire Blue-Eyes ; retour réel à l’End Phase adverse. |
| Giant Ballpark | Vraie fenêtre avant calcul des dommages : aucun dommage de combat, envoi d’Insect Knight depuis le Deck, puis invocation des trois copies depuis main, Deck et Cimetière. |
| Generaider Boss Stage | Pioche réelle adverse par Upstart Goblin au tour adverse ; invocation de Mardel en défense et de quatre Tokens de 1500 ATK. L’End Phase détruit uniquement les Tokens, qui cessent d’exister. |
| Magnetic Field | Résurrection ciblée de Beta une fois, avec Alpha encore au Cimetière. Après son combat contre Blue-Eyes en défense, le trigger de Damage Step renvoie le survivant adverse en main. |
| Cyberdark Inferno | Retour de Horn en main, véritable Normal Summon pendant la résolution et équipement de Claw depuis le Cimetière. Horn équipé résiste à Dark Hole adverse ; destruction d’Inferno par MST adverse et recherche d’Instant Fusion. |
| Dream Mirror of Joy | Avec Ikelos LIGHT et Morpheus de Niveau supérieur, le vrai choix de cible de Book of Moon exclut Ikelos et conserve Morpheus et Dark Magician non affilié. |
| Dream Mirror of Terror | Avec Ikelos DARK, deux véritables Special Summons adverses infligent chacun 300 dommages. À l’End Phase adverse, bannissement de Terror en coût et activation réelle de Joy depuis le Deck. |
| Madolche Chateau | Retour de Mewfeuille depuis le Cimetière au Deck à l’activation, bonus de 500 ATK des deux joueurs, puis destruction de Magileine par Dark Hole adverse : son propre retour au Deck est redirigé vers la main. |
| Mystic Mine | Le joueur ayant davantage de monstres ne peut ni activer Exiled Force ni attaquer. Raigeki inverse réellement le nombre de monstres et le joueur bloqué ; Dark Hole égalise à zéro, puis Mine se détruit à l’End Phase. |
| Realm of Light | Trois cartes envoyées par un seul coût de Card Trooper ajoutent un seul Shine Counter ; un Foolish Burial séparé ajoute le deuxième. Bonus de 200 ATK de Jain ; premier MST remplacé par retrait des deux compteurs, second MST détruit le Terrain. |
| Advanced Dark | Crystal Beasts des deux terrains et du Cimetière deviennent DARK. Pendant le vrai combat contre Blue-Eyes, Ruby Carbuncle est envoyé du Deck en coût ; les dommages sont prévenus, mais Pegasus est détruit. |
| Amorphous Persona | Bonus de 300 ATK/DEF des deux joueurs ; véritable Tribute Summon utilisant Wrath, envoyé face recto à l’Extra Deck comme Pendulum, puis pioche réelle par Persona. |
| S-Force Bridgehead | Recherche de Rappa et oath malgré une autre copie et cible. Blue-Eyes dans la colonne correspondante attaque Orrafist : destruction au combat prévenue, mais 1200 dommages de combat conservés. |
| Duel Academy | Trois branches indépendantes : Spell avec Dinosaur, 1000 dommages une fois ; vraie Trap avec Warrior, destruction ciblée ; vrai effet de Card Trooper avec Machine, +1000 ATK persistant. Une seconde Spell inflige seulement ses propres dommages. |
| Hexatellarknight | Véritable Xyz Summon de Batlamyus avec deux matériaux : +400 ATK/DEF, soit 3000/950. Défausse réelle d’un Tellarknight comme coût pour annuler l’attaque adverse ; les deux overlays restent attachés. |
| Super Quantal Mech Ship Magnacarrier | Trois défausses en coûts ; véritables Xyz Summons des Mech Beasts WATER/FIRE/WIND sur les Layers correspondants. Second effet : le Terrain part en coût et Great Magnus reçoit les trois Mech Beasts avec leurs trois overlays, soit six matériaux. |
| F.A. Circuit Grand Prix | +2 Niveaux seulement en Battle Phase ; Hang On Mach atteint 1800 ATK, détruit Jerry Beans et déclenche une pioche. Retour au Niveau 4 en Main Phase 2 ; destruction du Terrain et recherche d’un F.A. |
| F.A. City Grand Prix | +2 Niveaux des deux joueurs en Main et Battle Phases. Le choix adverse de Book of Moon exclut le F.A. contrôlé, tout en offrant Dark Magician. MST détruit le Terrain, recherche un F.A. et restaure les Niveaux. |
| F.A. Off-Road Grand Prix | +2 Niveaux en Main Phase, aucun en Battle Phase. Véritable destruction au combat du F.A. : défausse aléatoire de l’unique carte de main adverse par effet. Destruction du Terrain et recherche d’un F.A. |
| Doll House | Cible Jerry Beans Man à 0 DEF au Cimetière et invoque une copie du Deck comme Niveau 6 DARK. La cible et une autre copie de Deck restent disponibles, mais l’ignition est consommée. |
| Live☆Twin Channel | Tribute de Ki-sikil en coût pour annuler une vraie attaque ; son propre gain de 500 LP lors de la déclaration reste appliqué. À l’End Phase, terrain de monstres vide : récupération ciblée de Ki-sikil en main plutôt qu’au Deck. |
| P.U.N.K. JAM Extreme Session | Bannissement de Deer Note en coût et invocation de Ze Amin. Trois Psychics différents paient réellement 600 LP ; le Terrain pioche seulement deux fois sous sa limite partagée. LP finaux : 6200. |
| Magician’s Salvation | Placement réel d’Eternal Soul face verso depuis le Deck, oath d’activation. Monster Reborn invoque Dark Magician ; Salvation le cible et invoque l’autre nom, Dark Magician Girl, depuis le Cimetière. |
| Dark Contract with Patent License | Véritable Link Summon de Gilgamesh ; le premier Link Spider adverse déclenche 1000 dommages et interdit un autre Link malgré du matériau restant, sans interdire Gilasaurus. Destruction du Terrain : récupération du vrai matériau D/D au Cimetière et libération du verrou. |
| Light Barrier | Véritable Normal Summon d’Emperor : choix légal de l’effet face via SELECT_OPTION, sans jet, et +500 ATK. Au Standby suivant, vrai résultat pile : le second Emperor doit effectuer un vrai jet sans ce choix. |
| The Weather Forecast | Placement de Snowy Canvas face recto depuis le Deck, puis véritable Link Summon de Rainbow avec trois cartes Weather Spell/Trap comme matériaux ; aucun monstre Weather préalable en zone Monstre. |
| Maliss in Underground | Véritable Link Summon de Hearts Crypter : 2500 ATK. Bannissement par effet d’une troisième Trap Maliss de nom différent : 5500 ATK ; une copie face verso ne compte pas. Le choix d’attaque adverse exclut Dark Magician. |
| Sangen Summoning | Recherche Tenpai et défausse par effet. Book of Moon adverse placé chaîne réellement pendant la Main Phase 1 du contrôleur et ne retourne pas son Dragon FIRE ; au tour adverse, une autre copie le retourne normalement. Autre duel : vrai Synchro Summon de Bident ; MST détruit Sangen en Battle Phase et double ses 2600 ATK à 5200. |
| Stand Up Centur-Ion! | Envoi de main en coût sans défausse ; Primera du Deck devient une vraie Continuous Trap. Sa nature originale de Monster Card protège le Terrain de MST. Son vrai Special Summon rapide sur un second MST déclenche le véritable Synchro Summon de Legatia avec Emeth VI. |
| Adamancipator Laputite | +500 ATK/DEF sur le Rock contrôlé, sans bonus adverse. Trois vraies cartes Adamancipator sélectionnées et triées en haut du Deck ; trois pioches Upstart les consomment exactement, laissant Dark Magician au Deck. |
| Cynet Universe | Retour ciblé de Blue-Eyes adverse du Cimetière à son Deck une fois. Deux véritables Link Spiders occupent les Extra Monster Zones ; seul le Link contrôlé reçoit +300 ATK. Destruction du Terrain : envoi des deux monstres de ces zones au Cimetière et conservation du monstre en Main Monster Zone. |
| Kozmotown | Récupération de Farmgirl bannie face recto et perte directe de 300 LP, sans paiement de coût LP. Deux cartes Kozmo de main retournent au Deck et deux cartes sont réellement piochées ; destruction du Terrain et recherche de Tincan. |
| Majesty’s Pegasus | Bonus de 300 des deux joueurs ; Tribute réel de Bunbuku WIND/Spellcaster comme coût, envoyé à l’Extra Deck face recto, puis invocation de Nekomata depuis le Deck. Une autre cible et un coût restent valides, mais l’ignition est consommée. |
| Summon Over | Six vrais événements de Special Summon ajoutent six compteurs. Le Terrain résiste à MST ; l’ignition demeure indisponible jusqu’au début réel de la prochaine Main Phase 1. Elle envoie alors le Terrain et les trois Special Summons adverses au Cimetière, conservant les trois contrôlés. |
| Skyscraper | Avian attaque Blue-Eyes : +1000 ATK uniquement au calcul des dommages, soit 2000 contre 3000 et 1000 dommages de combat. La requête en dehors de cette fenêtre conserve ses 1000 ATK de base. |
| Skyscraper 2 — Hero City | Avian est réellement détruit au combat ; au tour suivant, le choix du Terrain l’inclut et exclut le HERO au Cimetière sans raison BATTLE, puis ressuscite Avian. |
| Wattcastle | Blue-Eyes détruit réellement Wattgiraffe au combat et perd 1000 ATK après le combat. La baisse persiste après destruction du Terrain par MST. |
| Luminous Spark | Bonus de 500 ATK et baisse de 400 DEF sur les LIGHT des deux joueurs, sans effet sur Dark Magician DARK. Destruction par MST et restauration native des statistiques. |
| Rising Air Current | Même modification sur les Harpie Lady WIND des deux joueurs, sans effet sur Blue-Eyes LIGHT. Destruction du Terrain et restauration des statistiques. |
| Mystic Plasma Zone | Même modification sur Dark Magician et Summoned Skull DARK, sans effet sur Blue-Eyes LIGHT. Destruction du Terrain et restauration des statistiques. |
| Yami | Spellcaster et Fiend des deux joueurs gagnent 200 ATK/DEF, Fairy perd 200 et Dragon reste inchangé. MST restaure les statistiques natives. |
| Chorus of Sanctuary | +500 DEF sur les monstres en défense des deux joueurs. Une vraie commande de changement de position retire le bonus de Blue-Eyes ; MST retire celui de Harpie Lady adverse. |
| Empowerment | Bonus de 300 aux races contrôlées éligibles ; défausse en coût et invocation d’un Empowered Warrior depuis le Deck. Ensuite, bannissement de quatre vrais Warrior/Spellcaster en coût pour rechercher Aether : les deux ignitions fonctionnent indépendamment. |
| Elborz, the Sacred Lands of Simorgh | Bonus WIND/Winged Beast des deux joueurs ; révélation réelle de Simorgh de Niveau 8 et réduction d’un Tribute. Après consommation du Normal Summon régulier par Avian, l’autre ignition invoque réellement Simorgh avec un seul Tribute Harpie. |
| War Rock Mountain | Recherche de Fortia et oath. Début réel de la Battle Phase adverse : invocation de Fortia depuis la main. Le Terrain part au Cimetière par effet pour remplacer sa destruction au combat, tout en conservant les 1300 dommages. |
| Pressured Planet Wraitsoth | Recherche Unicorn et oath. Quatre Attributs distincts face recto sur les deux terrains donnent 400 ATK uniquement au monstre contrôlé ; Book of Moon masque l’unique DARK et réduit le bonus à 300, puis MST le supprime. |
| Grand Spiritual Art — Ichirin | Avec Eria Spellcaster à exactement 1500 DEF, le premier vrai effet adverse de Gilasaurus est annulé. Le second du même tour résout normalement et ressuscite réellement Dark Magician pour le contrôleur d’Ichirin. |
| Ojama Country | Avec Ojama contrôlé, échange ATK/DEF de base des deux joueurs. Envoi de main comme coût sans raison DISCARD et résurrection ciblée de Yellow ; limite appliquée malgré un autre coût et une cible. MST restaure les statistiques. |
| Pseudo Space | Bannissement réel de Wetlands au Cimetière comme coût ; copie officielle temporaire du nom et des effets. CODE conserve la carte physique ; ALIAS devient Wetlands. Slime Toad passe de 700 à 1900 ATK, puis nom courant et ATK reviennent à leur base à l’End Phase. |
| Catapult Zone | Première vraie destruction au combat de Jerry remplacée par l’envoi de Gamma depuis le Deck par effet ; les 1250 dommages restent infligés. Une seconde attaque détruit Jerry malgré un autre Rock disponible, prouvant l’usage unique ce tour. |

Les 115 Terrains sont marqués `effectTested` uniquement pour ces preuves. Les protections, coûts, limites et branches non exercés ne sont pas certifiés par ce total.


## Branches restant à vérifier

Le niveau `effectTested` porte uniquement sur les branches décrites dans la table. Pour ces deux nouveaux lots, les branches suivantes restent notamment sans preuve d’exécution :

- Giant Ballpark : invocation après destruction adverse par effet ; Light Barrier : gain de LP après destruction au combat par un Arcana Force.
- Weather Forecast : Normal Summon supplémentaire et réutilisation interdite des matériaux Spell/Trap ; Dream Mirror of Joy : restriction des cibles d’attaque ; Cyberdark Inferno : exclusion des cibles d’effet.
- Advanced Dark : annulation des effets de la cible attaquée par un Ultimate Crystal ; Amorphous Persona : limite de deux pioches et Ritual Summon depuis le Cimetière ; S-Force Bridgehead : combat hors colonne.
- Doll House : deux cibles avec Princess Cologne et fin de Battle Phase par attachement de Grandpa Demetto ; Live☆Twin Channel : retour au Deck lorsque le contrôleur conserve un monstre.
- Summon Over : commande d’ignition du joueur adverse et plafond après un septième événement ; Laputite : sélection maximale de cinq cartes ; Hero City : nouvelle utilisation interdite avec une seconde cible détruite au combat.
- Ichirin : échange de la carte de main pour un monstre à 1500 ATK/200 DEF ; Wraitsoth : destruction déclenchée par Shangri-Ira ; War Rock Mountain : refus du trigger avec un monstre non-Warrior ; Catapult Zone : destruction par effet.

Les autres restrictions, exclusions et combinaisons non présentes dans les traces ne sont pas certifiées. Les scripts amont restent chargés pour ces branches ; une preuve de présence ou d’initialisation n’est pas assimilée à leur validation.

## Conditions de validation

Flags : `MODE_MR5 | TCG_SEGOC_NONPUBLIC | TCG_SEGOC_FIRSTTRIGGER`, valeur `12885092352`. Les deux flags SEGOC TCG sont nécessaires ; MR5 seul conserve les conventions de déclenchement OCG. Aucun flag `TEST_MODE`, `PSEUDO_SHUFFLE` ou `UNLIMITED_SUMMONS` n’est activé.

Les fixtures de règles démarrent avec zéro carte piochée et zéro pioche automatique par tour, et une graine déterministe `[1n, 2n, 3n, 4n]` par défaut. Le scénario supplémentaire de Dark Sanctuary utilise `[0x123456789abcdef0n, 0xfedcba9876543210n, 0x9e3779b97f4a7c15n, 0xbf58476d1ce4e5b9n]` pour exercer l’autre issue du RNG natif ; les graines sont enregistrées par scénario. Aucun résultat aléatoire n’est injecté. Light Barrier permet légalement de choisir l’effet Arcana Force via le véritable `SELECT_OPTION` ; son jet de Standby provient du RNG natif. Les cartes sont placées avant le démarrage pour fixer la situation initiale. Les cartes de Fusion de l’Extra Deck sont face verso, conformément aux règles ; les mettre face recto empêcherait à juste titre leur placement MR5 dans les Main Monster Zones. Les scripts, lignes CDB et phases du moteur restent intacts. La copie temporaire de Wetlands par Pseudo Space est exécutée par son propre Lua officiel, sans injection de script. Le protocole natif conserve le passcode physique dans `QUERY_CODE` ; `QUERY_ALIAS` expose le nom courant, y compris pendant cette copie. Chaque action et choix passe par `duelSetResponse` via `NativeDuelRuntime.respond`.

Une requête est faite immédiatement après l’insertion de chaque terrain, avant le démarrage et donc avant ses coûts d’entretien. Le démarrage est ensuite avancé jusqu’à la première décision native. Cela permet par exemple à Golden Castle of Stromberg de détruire légalement sa propre carte au Standby si le Deck de fixture contient moins de dix cartes, sans confondre ce comportement avec une erreur d’initialisation.

Sources gelées : CardScripts `37f270dc813a12d123707ae255f2bda7922999c4`, BabelCDB `fdf92aea31033cd6c44afa89987c5e00665205e2`. Les quatre passcodes récemment attribués conservent une correspondance explicite avec leur passcode de script prerelease ; aucun script canonique fictif n’est généré. Le WASM et les corrections de décodage du wrapper sont documentés dans [NOTICE.md](../../src/core/native/vendor/ocgcore/NOTICE.md). Les corrections décodent notamment `TYPE` et les couples type/quantité des compteurs ; elles ne changent pas les effets Lua.

Le binaire validé est construit depuis le core `38d04c9feb1a26617407091380634c87262fe3f8`, avec SHA-256 `0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026`. [core-build.json](../../public/native/core-build.json) conserve la recette, le compilateur, les archives sources et leurs hashes. L’audit vérifie ce hash et l’API avant d’exécuter les scénarios.

Le scénario Angelechy constitue aussi une régression du binaire : l’ancien core `8e5f4e4f…`, pourtant exposé par la même API 11.0, ignore `EFFECT_OPPO_CHOOSES_SPSUMMON_ZONE=267` et donne la décision au joueur qui invoque. Le scénario échoue alors avec `player 1 != player 0`. Avec le nouveau core, le vrai `SELECT_PLACE` a `player=0`, masque `4292935679`, et la réponse désigne `player=1`, zone 2. Les scripts Lua sont identiques dans les deux cas ; [la comparaison des traces](artifacts/native-field-angelechy-zone-regression-2026-10-07.json) garde les versions et les hashes distincts. Le seul succès d’`initial_effect` ne pouvait pas détecter cette différence de comportement.

## Relancer

```sh
node scripts/audit-native-field-runtime.mjs
node scripts/generate-native-field-coverage.mjs
node --test --test-isolation=none tests/native-field-catalogue.test.js
```

Le script écrit la preuve JSON puis échoue si une ressource manque, si un des 339 terrains ne s’initialise pas ou si un scénario de règles échoue, si le moteur émet `RETRY` ou si un diagnostic Lua apparaît. Les tests ne contiennent aucun `skip` conditionné à l’absence d’assets. Le runner sans isolation affiche individuellement les assertions de la suite.

## Contrat pour l’intégration navigateur

Le mode **Duel libre** possède une recherche dans **14 355 cartes uniques** issues des ressources CDB/Lua, notamment les partenaires des terrains qui dépassent la bibliothèque locale. `NativeCardCatalogue` conserve en priorité les 390 templates locaux avec leurs illustrations et traductions, puis produit les autres templates à partir des faits CDB. Les cartes sans visuel local utilisent une image PNG neutre ; aucun téléchargement de milliers d’illustrations n’est nécessaire. L’absence de script est admise uniquement pour un Normal Monster ordinaire sans procédure supplémentaire. Tokens, Skill, Rush et scopes incompatibles avec les duels standards sont exclus du Deck ; les Tokens créés par le moteur possèdent un template de présentation distinct.

Cette recherche étendue est réservée à `mode='native'`. Les cartes supplémentaires portent `supportedInStrict=false` et `banlistVerified=false` ; leur présence dans la CDB ne constitue pas une vérification des banlists Advanced. Le mode strict conserve les 390 templates locaux et leurs règles d’éligibilité. Les cartes OCG et annoncées peuvent être sélectionnées en Duel libre. Les correspondances des passcodes prerelease, les illustrations alternatives et les doublons de versions beta sont normalisés. Le contrôle des trois copies utilise l’alias réel CDB, notamment pour Umi et les différentes Harpie Lady, avec une identité cumulée dans Main, Extra et Side.

Charger les ressources locales avant le duel, puis laisser le moteur gérer les phases, coûts, matériaux, cibles, restrictions et chaînes. L’interface traduit la dernière décision native en contrôles et renvoie exactement le type et les indices proposés par cette décision. Elle ne doit pas sélectionner automatiquement une réponse pour faciliter un scénario. Les contrôles de sélection/unselection de Fusion doivent préserver les choix de matériaux, et les zones sont limitées au masque envoyé par le moteur.

Construire les zones visibles à partir des requêtes natives après les messages. Conserver la propriété, le contrôleur, la position, les compteurs, l’alias et l’identité physique pendant les changements de zone ; l’identifiant canonique sert à retrouver les illustrations et textes du catalogue. Les cartes placées dans l’Extra Deck au lancement sont face verso, sauf les Pendulum qui y seraient légalement face recto. Initialiser les vrais duels avec la seed CSPRNG du runtime.

Pour revendiquer `integrationTested`, conserver séparément une preuve navigateur contenant les clics sur les décisions proposées, les messages natifs obtenus, une requête après résolution et les erreurs de console. Le scénario doit fonctionner via les contrôles publics du duel. Le rapport [native-duel-integration-2026-10-07.md](native-duel-integration-2026-10-07.md) décrit cette intégration ; la matrice de ce fichier reste volontairement une matrice de vérification du moteur.
