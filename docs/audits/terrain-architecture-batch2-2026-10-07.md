# Douze décors architecturaux et magiques — 7 octobre 2026

Les douze JPG originaux ont été ouverts individuellement avant construction. Le module [FieldEnvironmentArchitecturalReferences.js](../../src/ui/FieldEnvironmentArchitecturalReferences.js) remplace les accessoires de famille par des volumes correspondant à leurs motifs visibles. Secret Village avait déjà un landmark interprété : ses bâtiments génériques sont reconstruits après inspection réelle. Les onze autres cartes reçoivent ici leurs premières constructions dédiées dans ce module.

Les illustrations restent intactes, avec leurs personnages et leurs détails peints. **Ces volumes périphériques ont des dimensions adaptées au duel ; ils ne constituent pas une reproduction spatiale 3D intégrale 1:1.** L'activation officielle et les effets jouables sont contrôlés séparément par le moteur : l'existence d'un décor ne rend pas automatiquement une carte entièrement scriptée.

## Comparaisons

Chaque ligne juxtapose le JPG source, l'ancien constructeur archivé au commit local `de9cda6`, puis les nouveaux volumes, sans fond illustré derrière les modèles. Lumière et caméra sont identiques avant/après pour chaque carte. Pour Angelechy Endgame Problem, absent de l'ancien catalogue, la colonne ancienne applique **l'ancien constructeur à la nouvelle référence** : elle ne représente pas un ancien déploiement de cette carte.

- [Six références de village, château, ville et chambre](artifacts/field-architecture-castles-2026-10-07.jpg).
- [Six références de temple, tour, colisée, plaques, interrupteur et filet](artifacts/field-architecture-magic-2026-10-07.jpg).
- [Mesures Chromium, paramètres de caméra et SHA-256 des sources](artifacts/field-architecture-2026-10-07.json).
- [Constructeur précédent archivé](artifacts/field-architecture-baseline-de9cda6.js).

Les deux planches JPEG sont capturées directement par Chromium et occupent ensemble **1,44 Mo**. Elles sont des images de comparaison compressées. Les douze JPG originaux exacts restent séparément disponibles dans `public/environments/field-art/` ; leurs empreintes sont conservées dans le JSON.

| Carte | Motifs observés et construits | Primitives / appels couleur / matériaux | Limites visibles |
| --- | --- | --- | --- |
| Secret Village of the Spellcasters — 68462976 | Gros troncs ocre sinueux, branche arquée transversale, canopée verte, habitations arrondies avec mousse, portes, marches et points cyan. Les colonnes/portails inventés sont retirés. | 63 / 13 / 5 | Troncs et maisons sont moins irréguliers et moins denses que dans la source. Écorce, mousse fine, fissures et diffusion des lucioles ne sont pas reproduites. Le centre reste ouvert pour jouer. |
| Temple of the Mind's Eye — 92481084 | Chambre ocre, colonnes à bandes rouges et vertes, corniche, panneau rose, cadre doré jointé, escalier avec tapis rouge, torches et bâton diagonal à œil et ailes simplifiés. | 146 / 11 / 8 | Les fresques égyptiennes, fissures de pierre et hiéroglyphes sont absents des volumes. Le bâton reste une silhouette simplifiée. Les flammes sont des cônes statiques, pas une simulation de feu. |
| Shien's Castle of Mist — 11102908 | Château violet à quatre étages, toits continus avec extrémités relevées et faîtages en profondeur, petites fenêtres, branches nues et brume périphérique. Les deux tours médiévales génériques sont retirées. | 62 / 10 / 6 | La toiture ne reproduit pas toutes les tuiles ni les pignons sculptés. Les corbeaux restent dans l'illustration ; la brume est faite de volumes simples. |
| Dark City — 53527835 | Façades noires asymétriques, fenêtres jaunes verticales sur faces et côtés, skyline arrière, pavés et grande lune jaune. | 197 / 4 / 4 | Lune facettée sans cratères détaillés, bâtiments plus réguliers que dans la source, absence de nuages et d'étoiles en volume. La rue centrale est adaptée au plateau. |
| Sorcerous Spell Wall — 81231742 | Cinq cercles dorés horizontaux, traits angulaires inscrits, disque vert clair et huit fins rayons latéraux. Le portail vertical absent de la source est retiré. | 50 / 3 / 2 | Les marques sont des formes géométriques simplifiées, pas une reproduction de chaque glyphe. Les six sorciers restent dans le JPG. Le halo lumineux continu et diffus n'est pas simulé. |
| Saber Vault — 73787254 | Chambre argentée, cadres sombres, joints verticaux, inlays cyan en zigzag, petits nœuds ronds, lame suspendue réellement pointue, garde dorée et sceau à croix. | 52 / 7 / 5 | Chambre frontale plutôt que caméra inclinée de l'art. Les gravures, reflets, éclair électrique et détails du pommeau sont simplifiés. |
| Temple of the Six — 53819808 | Temple à trois étages, toits bleus à faîtage et extrémités relevées, porte en pierre avec double cercle cyan et sceau à six rayons, branches et brume. | 62 / 12 / 7 | Pas de reproduction de chaque travée, sculpture, tuile ou symbole exact du sceau. Le ciel orange et les oiseaux restent dans l'art. |
| The Grand Spellbook Tower — 33981008 | Tour effilée, large bande argentée continue de trois tours, pied courbe, nervures obliques, flèche fine, orbe, quatre anneaux turquoise et ville pale au loin. | 81 / 10 / 4 | Les anneaux ont des marques abstraites, pas les runes exactes. Les figures flottantes de l'art restent dans le fond. Façades, portes et courbes complexes de la tour ne sont pas reproduites intégralement. |
| Colosseum - Cage of the Gladiator Beasts — 52518793 | Enceinte pierreuse ouverte, hauteurs brisées inégales, trois arches restantes, piliers cassés, fissures cyan, pavage discontinu, dais glacé et petit rebord doré. | 130 / 10 / 5 | Pierre et fissures plus régulières que l'art. Les détails de la couronne centrale, le relief exact des blocs et les raies de lumière diffuse sont simplifiés. |
| Angelechy Endgame Problem — 12845564 | Deux plaques argentées allongées convergentes, incisions transversales, bordures roses/orange et rayons pâles vers le ciel. Les objets célestes de famille sans rapport sont retirés. | 24 / 6 / 4 | Plaques plus étroites et moins gravées que la source pour préserver le corridor. Le personnage armuré reste dans le JPG ; aucune statue nouvelle n'est inventée. Les rayons sont des segments statiques. |
| Summon Breaker — 18114794 | Interrupteurs gris avec axes et leviers rouges sortants, vis et dents supérieures, lettrage vectoriel O/F/F, quatre gradins magenta, diamants violets et fils de confinement. | 72 / 10 / 7 | Deux panneaux périphériques remplacent le panneau unique en gros plan de l'art. Cristaux simplifiés et statiques. Le monstre et les pièces mécaniques peintes restent dans la source. |
| Extra Net — 95376428 | Pièce rose, bordures dorées, sortie rectangulaire claire, indicateur rouge et filet cyan réellement courbe dont les fils croisés rejoignent la même surface. Le portail rond absent de l'art est retiré. | 26 / 9 / 5 | Filet adapté au décor arrière, sans capture, déformation ni modèle du personnage. Il a moins de mailles et une courbure plus régulière que le dessin. |

## Vérification

Les [cinq tests dédiés](../../test/field-architectural-references.test.js) passent avec le **même ensemble borné de constructeurs Three que le duel et l'atlas**. Cela vérifie notamment l'absence d'un constructeur disponible uniquement dans les tests Node mais absent en jeu.

Les douze références respectent les bornes par instance, y compris les géométries déformées : aucune intersection avec le corridor `[-9, -3, -18]` à `[9, 30, 17]`, aucune extrémité horizontale à 48 unités ou plus. Maximum du lot : **197 primitives, 13 appels couleur, 8 matériaux et 6 120 triangles**. Aucun débit d'images sur un téléphone réel n'est déduit de ces mesures.

Les tests vérifient aussi les vraies extrémités relevées et les faîtages des toits, la courbure des troncs, la pointe de la lame, la continuité de la bande hélicoïdale, la sortie physique du levier devant son panneau, les filets courbes, les attributs/indices de triangles valides et la libération unique des matériaux, géométries et ressources d'instances après remplacement répété. Les volumes n'utilisent aucune texture de carte privée.

Les captures Chromium chargent **36 images sans erreur JavaScript ni ressource HTTP manquante**, rendent chaque scène successivement dans un seul renderer, puis libèrent les ressources et le contexte. Les deux planches ont été rouvertes pour contrôle visuel ; ce contrôle a conduit à corriger les faîtages trop plats, le filet trop fin et le cadrage des interrupteurs. Elles ne prouvent pas une superposition exacte avec les consoles du duel.

Reproduction depuis la racine du dépôt :

```sh
node --test test/field-architectural-references.test.js
python scripts/audit-field-architectural-references.py --capture
```

Le script de capture requiert Python Playwright et Chromium installés extérieurement ; il n'ajoute aucune dépendance applicative. Son serveur local accepte uniquement les modules Three/UI/core et les illustrations numériques nécessaires, sans exposer les autres fichiers du projet.
