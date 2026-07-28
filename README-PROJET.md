# SSE — Système de suivi et d’évaluation de la bonne gouvernance

SSE est une application web institutionnelle qui structure l’auto-évaluation d’un organisme, l’examen des critères par un évaluateur et la consultation d’indicateurs consolidés. La version actuelle couvre le cycle complet : demande et activation de compte, remplissage, justificatifs, soumission, validation, correction ciblée, calcul des scores, classement, notifications, audit et export.

## Profils et responsabilités

| Profil | Responsabilités principales |
|---|---|
| `ADMIN` | Gérer les utilisateurs, organismes, demandes de compte, référentiel, évaluations, réclamations, notifications, audit et file de courriels. |
| `USER` | Gérer le dossier de son organisme, remplir une évaluation, joindre des preuves, soumettre, corriger et consulter le résultat. |
| `EVALUATEUR` | Prendre en charge une évaluation, examiner chaque critère, valider, rejeter ou demander une correction, puis décider le dossier. |
| `GOUVERNEMENT` | Consulter les indicateurs globaux et le classement, sans accès au remplissage ni à la validation. |

Tous les profils peuvent se connecter, gérer leurs paramètres personnels et conserver leur propre préférence de langue.

## Architecture technique

```text
Navigateur
   │
   ▼
React 18 + TypeScript + Vite + Tailwind CSS
   │  /api
   ▼
Spring Boot 3.2.5 + Java 17 + Spring Security/JWT
   │
   ├── PostgreSQL 15 : données métier et audit
   └── volume uploads : fichiers justificatifs
```

Le front-end utilise React Router, Zustand, React Hook Form, Zod, Recharts, Axios, Lucide et i18next. Le back-end est organisé en contrôleurs REST, services métier, dépôts Spring Data JPA, DTO, contrôles d’accès et gestion centralisée des erreurs.

### Modèle relationnel et migrations

La base PostgreSQL est normalisée autour de catalogues dédiés pour les rôles, les types d’organisme et les secteurs. Les colonnes métier existantes restent lisibles (`ADMIN`, `PUBLIC`, `HEALTH`, etc.), mais elles sont désormais protégées par de véritables clés étrangères. Cette approche évite une rupture des API et des données historiques tout en garantissant l’intégrité référentielle.

Les preuves attendues et les références d’un critère sont stockées dans les tables enfants `preuves` et `references_sse`. Un critère peut ainsi posséder plusieurs éléments ordonnés. Les anciens champs textuels agrégés restent exposés par l’API pour assurer la compatibilité avec l’interface actuelle.

Flyway exécute automatiquement les scripts de `backend/src/main/resources/db/migration` avant la mise à jour du schéma Hibernate. La migration initiale crée les catalogues, rattache les clés étrangères et transfère les preuves/références historiques sans supprimer les anciennes colonnes, ce qui facilite un retour arrière.

## Fonctions livrées

- authentification JWT, renouvellement, déconnexion, activation et récupération de compte ;
- autorisations par rôle et contrôle de propriété des ressources d’un organisme ;
- demandes de compte avec coordonnées, télécopie, secteur, fonction et logo ;
- gestion des utilisateurs et organismes, avec aperçu agrandi des logos ;
- référentiel hiérarchique : principes, bonnes pratiques et critères ;
- traduction FR/EN/AR et prise en charge de l’écriture droite-à-gauche ;
- préférence de langue et de thème isolée pour chaque compte ;
- workflow d’évaluation avec sauvegarde progressive et contrôle de complétude ;
- fichiers justificatifs et liens associés à chaque réponse ;
- verrou de prise en charge pour éviter deux validations concurrentes ;
- validation, rejet, demande de correction ciblée et resoumission ;
- calcul des scores par principe, score global et niveau de maturité ;
- tableaux de bord adaptés aux quatre profils et classement gouvernemental ;
- notifications persistées, flux temps réel SSE, réclamations et audit ;
- exports PDF et Excel ;
- exécution conteneurisée avec Docker Compose.

## Traduction automatique

La solution actuelle combine deux mécanismes afin d’éviter de traduire les pages manuellement à chaque affichage :

1. Les textes fixes de l’interface sont chargés localement par `i18next` depuis les catalogues `fr.json`, `en.json` et `ar.json`. Le changement est immédiat et reste stable même sans accès à un service de traduction.
2. Lorsqu’un administrateur saisit un nouveau contenu de référentiel en français, le back-end demande automatiquement les versions anglaise et arabe au service gratuit MyMemory. Les textes longs sont découpés et les résultats sont mis en cache.

Cette architecture est conservée car elle offre le meilleur compromis actuel entre cohérence, rapidité et coût. Pour une installation future sans dépendance externe, LibreTranslate avec Argos Translate peut être auto-hébergé ; son API n’est toutefois pas directement interchangeable avec le connecteur MyMemory actuel.

Variables associées :

```env
SSE_TRANSLATION_ENABLED=true
SSE_TRANSLATION_API_URL=https://api.mymemory.translated.net
SSE_TRANSLATION_CONTACT_EMAIL=
```

## Démarrage avec Docker

### Prérequis

- Docker Engine avec Docker Compose ;
- ports `80` et `8088` disponibles.

Avant un déploiement réel, définir au minimum un secret JWT robuste et désactiver les données de démonstration :

```env
JWT_SECRET=remplacer-par-une-valeur-aleatoire-d-au-moins-32-caracteres
CORS_ALLOWED_ORIGINS=https://votre-domaine.example
SSE_DEMO_DATA_ENABLED=false
SSE_MAIL_ENABLED=false
```

Puis lancer :

```bash
docker compose up -d --build
docker compose ps
```

Accès local :

- application : `http://localhost/`
- API exposée : `http://localhost:8088/api`
- contrôle de santé : `http://localhost:8088/api/actuator/health`

Le conteneur Nginx sert l’application et relaie aussi les routes `/api` vers le back-end. PostgreSQL et les justificatifs sont conservés dans les volumes `postgres_data` et `uploads`.

## Développement local

### Back-end

```bash
cd backend
mvn spring-boot:run
```

Le profil local utilise par défaut PostgreSQL sur `localhost:5432/sse_db`. Les valeurs peuvent être remplacées avec `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` et `SPRING_DATASOURCE_PASSWORD`.

### Front-end

```bash
cd frontend
npm ci
npm run dev
```

Pour cibler une API différente :

```env
VITE_API_URL=http://localhost:8080/api
```

## Vérification avant livraison

```bash
cd backend
mvn test

cd ../frontend
npm run build
npm run lint
```

Vérifier ensuite les parcours suivants avec les quatre rôles : connexion, changement de langue, création et soumission d’une évaluation, ajout de justificatif, prise en charge, correction, validation, classement, notifications et contrôle des accès.

## Structure du dépôt

```text
sse-application/
├── backend/          API Spring Boot, sécurité, métier et persistance
├── frontend/         interface React, routes, stores, services et traductions
├── diagrams/         sources PlantUML et exports UML
├── rapport-stage/    générateur, ressources et rapport de stage
├── docker-compose.yml
└── Dockerfile
```

## Documentation

- Rapport de stage : `rapport-stage/rapport-stage-khelifl-mohamed-anas-version-finale-illustree.docx`
- Version PDF : à exporter depuis Word après ouverture du rapport illustré.
- Sources UML : `diagrams/`

Ne pas stocker de mot de passe, clé privée, secret JWT ou fichier `.env` de production dans Git.
