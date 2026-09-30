# Élan local — ChatGPT

Double-clique sur Demarrer-Elan.cmd dans le dossier principal, puis ouvre http://127.0.0.1:4174. Garde la fenêtre ouverte ; Ctrl+C arrête le serveur. Ne lance pas directement index.html.

Clique sur Connecter ChatGPT, puis Se connecter et ouvre le lien officiel. Termine la connexion et reviens dans Élan. Charge une offre ou l’exemple, puis clique sur Analyser l’offre. Une fois l’analyse terminée, passe à l’étape 2 et colle ton CV ou charge un fichier `.txt`/`.md` pour obtenir une version ciblée.

Node.js et Codex CLI sont requis (déjà installés sur ce PC). Le serveur Node écoute uniquement sur 127.0.0.1. Il utilise Codex App Server avec ton abonnement ChatGPT, sans clé API ni bascule vers une API payante. Internet reste nécessaire et les limites Codex de ton forfait s’appliquent.

La connexion propre à Élan est conservée par Codex dans .local/codex. Ne partage pas ce dossier : il peut contenir des informations d’authentification. Il est exclu de Git. La configuration est séparée de celle de ton application Codex.

Les offres sont transmises à OpenAI à ta demande. Les conversations sont éphémères et Élan ne sauvegarde pas les analyses. Cela ne modifie pas les règles de traitement des données d’OpenAI. Copie les résultats avant de fermer la page.

Les étapes 1 et 2 sont implémentées. Les citations de l’offre et les extraits du CV utilisés pour justifier les modifications sont vérifiés dans les textes sources ; relis toujours le résultat. Pour les liens, une lecture Web est tentée. Les pages bloquées ou les redirections non vérifiables nécessitent un copier-coller. L’import de CV accepte actuellement le texte collé et les fichiers `.txt`/`.md` ; les PDF et DOCX ne sont pas encore extraits.

En cas d’échec de connexion, clique à nouveau sur Se connecter pour obtenir un nouveau lien ; ne recharge pas l’ancien retour de connexion. Si le port 4174 est occupé par Élan, ouvre l’adresse existante. Si Codex est introuvable, configure ELAN_CODEX_BIN avec le chemin de codex.exe.

Tests depuis le dossier principal : node --test work/core.test.cjs work/server.test.cjs
Documentation : https://learn.chatgpt.com/docs/app-server et https://learn.chatgpt.com/docs/auth
