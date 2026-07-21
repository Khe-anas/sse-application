# SSE - Système de Suivi et d'Évaluation de la Bonne Gouvernance

Application complète de suivi et d'évaluation de la maturité en bonne gouvernance, basée sur 12 principes définis par la Présidence du Gouvernement tunisien.

## Stack Technique

### Backend
- **Java 17** + **Spring Boot 3.2** (monolithique)
- **Spring Security** avec JWT
- **Spring Data JPA** + **PostgreSQL 15**
- **OpenPDF** (exports PDF)
- **Apache POI** (exports Excel)
- **WebSocket** (notifications temps réel)
- **Lombok** + **MapStruct**

### Frontend
- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **React Router DOM** (routing)
- **Zustand** (state management)
- **React Hook Form** + **Zod** (formulaires)
- **Recharts** (graphiques)
- **React i18next** (internationalisation FR/AR/EN avec RTL)
- **Sonner** (notifications toast)

## Architecture

```
sse-application/
├── backend/          # Spring Boot
│   ├── src/main/java/com/sse/
│   │   ├── config/       # Configuration
│   │   ├── controller/   # REST Controllers
│   │   ├── service/      # Business Logic
│   │   ├── repository/   # JPA Repositories
│   │   ├── entity/       # JPA Entities
│   │   ├── dto/          # Data Transfer Objects
│   │   ├── security/     # JWT + Spring Security
│   │   ├── enums/        # Enumerations
│   │   └── exception/    # Exception Handling
│   └── Dockerfile
├── frontend/         # React + TypeScript
│   ├── src/
│   │   ├── components/   # UI Components
│   │   ├── pages/        # Route Pages
│   │   ├── hooks/        # Custom Hooks
│   │   ├── stores/       # Zustand Stores
│   │   ├── services/     # API Services
│   │   ├── types/        # TypeScript Types
│   │   └── i18n/         # Translations
│   └── Dockerfile
└── docker-compose.yml
```

## Rôles Utilisateurs

| Rôle | Description |
|------|-------------|
| **ADMIN** | Accès complet : gestion, référentiel, évaluations, validation et reporting |
| **RESPONSABLE** | Responsable d'entreprise : remplit et soumet les évaluations de son organisme |
| **GOUVERNEMENT** | Consulte le tableau de bord global des entreprises/organismes et le classement |

## Les 12 Principes de Gouvernance

1. Finalité
2. Création de valeur
3. Stratégie
4. Surveillance
5. Redevabilité
6. Dialogue avec les parties prenantes
7. Leadership
8. Données et décisions
9. Gouvernance du risque
10. Responsabilité sociétale
11. Viabilité et pérennité de la performance
12. Maîtrise de la corruption

## Démarrage Rapide

### Prérequis
- Docker & Docker Compose
- Java 17 (pour dev backend)
- Node.js 20 (pour dev frontend)

### Avec Docker Compose

```bash
cd sse-application
docker-compose up -d
```

Accès :
- Frontend : http://localhost:3000
- Backend API : http://localhost:8080/api
- PostgreSQL : localhost:5432

### Comptes de démonstration

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@sse.tn | password | ADMIN |
| user@sse.tn | password | RESPONSABLE |
| evaluateur@sse.tn | password | ÉVALUATEUR |
| gouv@sse.tn | password | GOUVERNEMENT |

Ces comptes sont créés uniquement lorsque `SSE_DEMO_DATA_ENABLED=true` (activé par défaut dans `docker-compose.yml`, désactivé en production).

### Développement local

**Backend :**
```bash
cd backend
mvn spring-boot:run
```

**Frontend :**
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil connecté

### Admin
- `GET/POST/PUT/DELETE /api/admin/users` - CRUD utilisateurs
- `GET/POST/PUT/DELETE /api/organismes` - CRUD organismes
- `POST /api/evaluations` - Créer une évaluation
- `GET /api/principes` - Liste des principes

### Évaluation
- `PUT /api/evaluations/{id}/submit` - Soumettre (responsable d'entreprise ou admin)
- `PUT /api/evaluations/{id}/validate` - Valider (admin)
- `PUT /api/evaluations/{id}/reject` - Rejeter (admin)
- `GET/POST /api/reponses/evaluation/{id}` - Gestion des réponses (responsable d'entreprise ou admin)

### Dashboard
- `GET /api/dashboard/global` - KPIs globaux
- `GET /api/dashboard/ranking` - Classement
- `GET /api/dashboard/gap-analysis` - Analyse d'écart

### Chatbot
- `POST /api/chatbot/message` - Envoyer un message

## Fonctionnalités

- ✅ Authentification JWT (access 15min, refresh 7j)
- ✅ CRUD complet (utilisateurs, organismes, évaluations)
- ✅ 12 principes de gouvernance avec critères
- ✅ Workflow d'évaluation (création admin → remplissage responsable d'entreprise → soumission → validation admin)
- ✅ Calcul automatique des scores et niveau de maturité
- ✅ Classement des organismes
- ✅ Upload de preuves (fichiers + liens)
- ✅ Chatbot de support
- ✅ Internationalisation FR/AR/EN avec RTL
- ✅ Dashboard avec KPIs
- ✅ Seed automatique des 12 principes
- ✅ Docker Compose complet

## Licence

© 2024 - Présidence du Gouvernement Tunisien
