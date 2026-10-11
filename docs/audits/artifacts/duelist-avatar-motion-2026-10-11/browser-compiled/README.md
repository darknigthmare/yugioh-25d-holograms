# Preuves navigateur compilées — 11 octobre 2026

Le [rapport](report.json) passe huit parcours, 192 modèles rendus et 52 captures. Le [compte rendu](../../../duelist-avatar-motion-browser-2026-10-11.md) décrit les actions publiques, les fixtures déclarées avant bootstrap et les limites de ces preuves.

Les **63 originaux** viennent de `/workspace/yugioh-avatar-motion-final-2026-10-11/` et de son fichier de logs externe. Ils sont copiés sans transformation : 52 PNG, dix JSON et [logs.txt](logs.txt). La [vérification indépendante](proof-verification.json) donne la taille et le SHA-256 de chaque copie, contrôle les 161 sources, les 21 corps HTTP avant/après et le driver immuable. Le [script de vérification](verify-proof-files.py) est conservé avec ses chemins d’origine pour reproduire ce contrôle dans le workspace de l’audit.

| Vue | Capture |
| --- | --- |
| Studio desktop Yugi | [Yugi](avatar-studio-yugi-1280.png) |
| Studio mobile Yudias, corps entier | [Yudias](avatar-studio-yudias-390.png) |
| Studio mobile Atem verrouillé | [Atem](avatar-studio-atem-390.png) |
| Duel global Jaden | [Vue globale](avatar-native-jaden-overview-1280.png) |
| Duel mobile Kaiba après invocation | [Invocation](avatar-native-kaiba-after-summon-390.png) |
| Vraie victoire Exodia et acquisition Mokuba | [Résultat](avatar-earned-after-genuine-native-exodia-win.png) |
| Mokuba acquis, sélectionné après rechargement | [Persistance](avatar-mokuba-earned-selected.png) |
| Refus d’un import sans altérer la collection | [Import refusé](avatar-motion-import-refused-preserves-collection.png) |
| Refus du stockage et collection disponible en session | [Session](avatar-motion-storage-refused-session-preserved.png) |
| WebGL désactivé, portrait et verrouillage conservés | [Fallback](avatar-motion-webgl-unavailable-portrait-fallback.png) |

Les fichiers `avatar-motion-invalid-*.json` sont les véritables fichiers refusés par l’interface ; `avatar-motion-*-collection-download.json` sont les téléchargements authentiques. Les captures `avatar-studio-reduced-static-a/b-*` sont identiques octet pour octet pour chacune des deux largeurs.

L’erreur de capacité provoquée par les flags Chromium est distinguée des erreurs inattendues : exactement deux diagnostics THREE de création WebGL interdite et un diagnostic Error creating, exclusivement dans le dernier contexte. Aucun 404 ni autre erreur console/HTTP/JavaScript/CSP/native n’est accepté. Aucune tentative FAILED, capture d’échec ou preuve sur serveur de développement n’est incluse dans ce dossier.
