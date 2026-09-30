# Élan

Élan est une application locale d’aide à la candidature. Elle analyse une offre d’emploi, en extrait les compétences et exigences importantes, puis aide à adapter un CV à cette offre sans inventer d’expérience ni de compétence.

L’application s’exécute sur votre ordinateur et utilise **Codex avec votre compte ChatGPT**. Elle ne nécessite pas de clé API OpenAI.

## Fonctionnalités disponibles

### Étape 1 — Analyse de l’offre

- saisie du texte d’une offre ou tentative de lecture depuis une URL publique ;
- extraction de jusqu’à 5 hard skills et 5 soft skills, présentées séparément ;
- identification de la culture et du ton de l’entreprise ;
- distinction entre exigences obligatoires et atouts souhaités ;
- justification des résultats par des extraits vérifiés dans l’offre source ;
- export du résultat en texte.

### Étape 2 — Optimisation du CV

- saisie directe du CV ou import d’un fichier `.txt` ou `.md` ;
- comparaison du CV avec l’analyse de l’offre ;
- reformulation ciblée pour les filtres ATS ;
- mise en évidence des modifications proposées ;
- traçabilité entre chaque modification et le texte du CV d’origine ;
- signalement des mots-clés manquants sans inventer d’information ;
- export du CV optimisé en texte.

Les étapes 3 (courriel et lettre de motivation) et 4 (simulation d’entretien) figurent dans la feuille de route, mais ne sont pas encore disponibles dans l’interface.

## Prérequis

- Windows pour le lanceur `Demarrer-Elan.cmd` ;
- [Node.js](https://nodejs.org/) 18 ou plus récent ;
- [Codex CLI](https://developers.openai.com/codex/cli/) installé ;
- un compte ChatGPT compatible avec Codex ;
- une connexion Internet pendant l’authentification et les analyses.

Vous pouvez vérifier les deux commandes dans PowerShell :

```powershell
node --version
codex --version
```

## Démarrage rapide

1. Double-cliquez sur `Demarrer-Elan.cmd` à la racine du projet.
2. Gardez la fenêtre du terminal ouverte.
3. Ouvrez <http://127.0.0.1:4174> dans votre navigateur.
4. Dans Élan, cliquez sur **Connecter ChatGPT**, puis sur **Se connecter**.
5. Terminez l’authentification sur la page officielle et revenez dans Élan.
6. Collez une offre d’emploi ou chargez l’exemple, puis lancez son analyse.
7. Passez à l’étape 2 et fournissez votre CV pour obtenir une version ciblée.

Pour arrêter l’application, utilisez `Ctrl+C` dans la fenêtre du terminal.

> Ne lancez pas directement `elan/dist/index.html`. L’interface doit être servie par `server.cjs` pour accéder aux fonctions d’analyse et d’authentification.

## Démarrage en ligne de commande

Depuis la racine du projet :

```powershell
node server.cjs
```

Puis ouvrez <http://127.0.0.1:4174>.

Le serveur écoute uniquement sur l’interface locale `127.0.0.1`, au port `4174`.

## Configuration de Codex

Élan recherche automatiquement l’exécutable Codex. S’il ne le trouve pas, définissez la variable `ELAN_CODEX_BIN` avant de démarrer l’application :

```powershell
$env:ELAN_CODEX_BIN = "C:\chemin\vers\codex.exe"
node server.cjs
```

Élan utilise un environnement Codex dédié dans `.local/codex`. Cette configuration est séparée de celle de votre installation Codex principale.

## Données, confidentialité et sécurité

- Le serveur n’accepte que les connexions locales provenant de l’application.
- Les offres et CV sont envoyés à OpenAI uniquement lorsque vous lancez une analyse.
- Les conversations Codex créées par Élan sont éphémères.
- Élan ne sauvegarde pas les offres, les CV ni les résultats d’analyse.
- Le dossier `.local/codex` peut contenir des informations d’authentification : ne le partagez pas. Il est exclu de Git.
- La lecture d’une offre par URL refuse notamment les adresses locales, les protocoles non sûrs et les URL contenant des identifiants.

Relisez toujours les résultats avant de les utiliser dans une candidature.

## Formats et limites

| Élément | Limite actuelle |
| --- | --- |
| Offre collée | 80 à 35 000 caractères |
| CV | 120 à 60 000 caractères |
| Import de CV | Texte, `.txt`, `.md` |
| PDF et DOCX | Extraction non disponible |
| Analyse simultanée | Une requête à la fois |
| Durée maximale d’une analyse | 5 minutes |

Certaines plateformes d’emploi empêchent la lecture automatique de leurs pages. Dans ce cas, ouvrez l’offre dans votre navigateur et copiez-collez son texte dans Élan.

## Tests

Lancez la suite complète depuis la racine :

```powershell
node --test work/core.test.cjs work/server.test.cjs
```

Les tests couvrent notamment :

- la validation des hard skills et soft skills ;
- la vérification des citations dans l’offre ;
- la validation des modifications du CV ;
- le filtrage des URL dangereuses ;
- la protection des routes locales ;
- les schémas de réponses structurées ;
- l’annulation et le cycle de vie des requêtes Codex.

## Structure du projet

```text
Elan/
├── Demarrer-Elan.cmd       # Lanceur Windows
├── server.cjs              # Serveur HTTP local et routes API
├── prompt.txt              # Vision fonctionnelle et feuille de route
├── elan/
│   └── dist/
│       ├── index.html      # Interface utilisateur
│       ├── styles.css      # Styles
│       ├── app.js          # Logique métier côté client
│       ├── favicon.svg
│       └── LISEZ-MOI.md    # Aide courte d’utilisation
└── work/
    ├── codex-bridge.cjs    # Communication avec Codex App Server
    ├── core.test.cjs       # Tests de la logique métier
    └── server.test.cjs     # Tests du serveur et du pont Codex
```

## Dépannage

### `Node.js est requis pour lancer Elan`

Installez Node.js, fermez puis rouvrez le terminal, et vérifiez `node --version`.

### `Codex est introuvable`

Installez Codex CLI ou configurez `ELAN_CODEX_BIN` avec le chemin complet vers `codex.exe`.

### La connexion ChatGPT échoue

Cliquez de nouveau sur **Se connecter** pour générer un nouveau lien. Ne réutilisez pas une ancienne page de retour d’authentification.

### Le port 4174 est déjà utilisé

Si Élan fonctionne déjà, ouvrez simplement <http://127.0.0.1:4174>. Sinon, arrêtez le programme qui occupe ce port avant de relancer le serveur.

### Une URL d’offre ne peut pas être lue

La page peut être privée, bloquée ou rendue uniquement par JavaScript. Copiez-collez alors le texte de l’offre directement dans l’application.

## État du projet

Élan est actuellement un prototype local. Les étapes d’analyse de l’offre et d’optimisation du CV sont fonctionnelles et couvertes par des tests. Le projet ne comporte pas encore de système de persistance, de déploiement public ni de prise en charge native des fichiers PDF ou DOCX.
