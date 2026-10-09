# Trois vues du duel natif — 8 octobre 2026

Le parcours **compacte → arène → réelle** passe sur **1280 × 900** et **390 × 844** dans le build final compilé. Les **22 états publics** conservent LP, main, UID et statistiques du monstre invoqué. Aucun échec de requête native, erreur de page ou violation CSP n'est enregistré.

| Action réelle | Résultat vérifié |
| --- | --- |
| Activation de Mausoleum of the Emperor (`80921533`) | Terrain face recto ; source exacte `/environments/field-art/80921533.jpg`, famille `temple-sanctuary` |
| Effet natif, choix de Blue-Eyes, position et zone | Coût réel de **2000 LP** ; **6000 / 8000 LP**, monstre à **3000 ATK / 2500 DEF** |
| Trois vues successives | Main et UID inchangés ; modèle Blue-Eyes présent en vue réelle |
| Zombie World (`4064256`) Posé comme remplacement | Mausolée quitte le Terrain ; décor de base `clearing`, aucune source Zombie World active |
| ACTIVER FACE RECTO sur la carte Posée | Chaîne native ; réponse légale Book of Moon offerte |
| Activation en attente, puis priorité passée | Décor de base conservé avant résolution ; après résolution, source exacte `/environments/field-art/4064256.jpg`, famille `graveyard` |
| Deux nouveaux cycles des trois vues | États publics identiques ; un plateau, une main, une scène WebGL, un canvas et une racine CSS3D au maximum |

Le même objet canvas est réutilisé lors des changements de vue. Le rapport mesure les racines DOM et archive une estimation du heap JavaScript ; il ne mesure pas les allocations GPU et ne certifie pas l'absence de toute fuite mémoire.

Les trois audits datés du 8 octobre utilisent le même build final, sans recompilation pendant les parcours. Les sept fichiers essentiels du manifeste final ont été comparés aux réponses réellement servies : HTML, entrée, CSS, façade native, catalogue natif, registre des environnements et vue réelle. Le wrapper, le WASM, le CDB sérialisé et l'archive Lua portent le total à **11 fichiers**. Leurs empreintes concordent entre les trois audits et avec `dist`. La [comparaison finale](artifacts/native-duel-ui-2026-10-08/final-build-comparison.json) archive cette vérification et les sources des trois runners.

Les audits général et Pendule conservent les quatre jeux d'empreintes HTTP/local, avant/après, avec `immutableCompiledSnapshot: true`. Le runner des trois vues relit les mêmes réponses après son dernier cycle, compare toutes les valeurs et archive `buildUnchangedDuringAudit: true` ; son schéma de provenance 3 sépare explicitement l'empreinte du HTML de celle de l'entrée JavaScript. La CSP HTTP correspond exactement à `vercel.json` : compilation WASM autorisée par `'wasm-unsafe-eval'`, sans JavaScript `'unsafe-eval'`.

Les **16 captures finales** ont été ouvertes individuellement. La vue réelle montre le modèle Blue-Eyes et les deux sources de Terrain. Le passage en vue réelle réinitialise désormais le défilement hérité des vues compacte/arène : les commandes caméra sont visibles dans les captures mobiles du Mausolée, du Terrain Posé et de Zombie World résolu. La capture attend maintenant que les couches CSS3D et le conteneur aient les mêmes dimensions, avec matrices de perspective stables pendant deux frames. La main et les cartes sont correctement projetées au premier plan dès le premier cycle du Mausolée. Les vues compacte/arène restent défilantes et ne présentent pas toutes les zones à la fois. Les captures en attente affichent le modal de réponse : l'état du décor masqué est établi par les attributs publics archivés. Ces preuves d'intégration ne certifient pas une reconstruction visuelle intégrale 1:1.

Captures desktop : [Mausolée](artifacts/native-duel-views-2026-10-08/native-mausoleum-real-1280.png), [Terrain Posé](artifacts/native-duel-views-2026-10-08/native-zombie-world-set-real-1280.png), [activation en attente](artifacts/native-duel-views-2026-10-08/native-zombie-world-pending-real-1280.png), [Zombie World](artifacts/native-duel-views-2026-10-08/native-zombie-world-real-1280.png).

Captures mobile : [Mausolée](artifacts/native-duel-views-2026-10-08/native-mausoleum-real-390.png), [Terrain Posé](artifacts/native-duel-views-2026-10-08/native-zombie-world-set-real-390.png), [activation en attente](artifacts/native-duel-views-2026-10-08/native-zombie-world-pending-real-390.png), [Zombie World](artifacts/native-duel-views-2026-10-08/native-zombie-world-real-390.png). Les huit captures compacte/arène restantes et toutes leurs empreintes sont conservées dans [le rapport JSON](artifacts/native-duel-views-2026-10-08/report.json).

Le Deck légal et le flux initial de hasard sont installés dans le navigateur isolé avant démarrage. Toutes les réponses passent par les boutons proposés. Aucune réponse ni état du moteur n'est injecté après démarrage ; aucune identité adverse privée n'est lue. Le scénario ne contient pas d'adversaire face verso ; leur confidentialité est vérifiée par [l'audit général](native-duel-ui-2026-10-08.md).

Les captures en vue réelle conservent le délai de 900 ms, puis attendent `aria-busy=false`, une couche active, la fin de la transition caméra et des dimensions root/parent caméra identiques au conteneur. Les matrices CSS3D doivent être finies, contenir la perspective native et rester identiques pendant deux frames. Les dix états réels archivent ces dimensions et matrices sous `projectionCaptureReadiness` ; LP, UID, main, statistiques et unicité des éléments sont revérifiés après cette attente. Le timeout de capture reste de 60 secondes sous SwiftShader. Ce contrôle lit uniquement le DOM public et ne modifie ni la scène, ni la caméra, ni le moteur.

```sh
python scripts/audit-native-duel-views.py
```

La commande suppose `dist` déjà compilé et utilise les headers de production sur localhost. `--base-url` permet le même parcours sur une URL existante. L'[audit général](native-duel-ui-2026-10-08.md) donne les noms, tailles et SHA-256 des 11 fichiers identiques.
