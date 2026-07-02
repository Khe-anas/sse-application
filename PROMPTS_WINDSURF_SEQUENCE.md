# SEQUENCE DE 20 PROMPTS WINDSURF - Application SSE
## Système de Suivi et d'Évaluation de la Bonne Gouvernance

---

## PROMPT 1 - Fondation Backend Spring Boot
```
Crée un projet Spring Boot 3.2+ monolithique nommé "sse-backend" avec Spring Initializr et les dépendances : Spring Web, Spring Data JPA, Spring Security, PostgreSQL Driver, Lombok, Spring Boot DevTools, Spring Boot Actuator. Structure en packages : com.sse.config, com.sse.controller, com.sse.service, com.sse.repository, com.sse.entity, com.sse.dto, com.sse.security, com.sse.enums, com.sse.exception, com.sse.mapper. Configure application.yml avec connexion PostgreSQL (base: sse_db, user: postgres, password: postgres, port: 5432), JPA ddl-auto: update, dialect PostgreSQL, logging SQL. Crée un docker-compose.yml avec service PostgreSQL 15 (volume persistant). Ajoute les enums : Role (ADMIN, RESPONSABLE, GOUVERNEMENT), TypeOrganisme (PUBLIC, PRIVE, SOCIETE_CIVILE), StatusEvaluation (EN_COURS, SOUMISE, EN_VALIDATION, VALIDEE, REJETEE), MaturityLevel (INITIAL, EN_PROGRESSION, AVANCE, EXCELLENT), Niveau (N0, N1, N2, N3), StatusReponse (BROUILLON, SOUMISE, VALIDEE, REJETEE, A_CORRIGER). Vérifie que le projet compile avec mvn clean install.
```

## PROMPT 2 - Entités JPA et Relations
```
Crée toutes les entités JPA avec leurs relations pour le SSE. Suivre ce modèle exact :

1. User : id (UUID), email (unique), password (hash), firstName, lastName, role (enum), phone, isActive, createdAt, updatedAt, lastLoginAt. Relation @ManyToOne avec Organisme.

2. Organisme : id (UUID), name, type (enum), sector, address, email, phone, website, isActive, createdAt, updatedAt. Relations @OneToMany avec User, Evaluation, GlobalScore.

3. Principe : id (UUID), number (unique, 1-12), nameFr, nameAr, nameEn, descriptionFr, descriptionAr, descriptionEn, weight (default 1.0), isFixed (default true), isActive, order. Relation @OneToMany avec BonnePratique.

4. BonnePratique : id (UUID), number, labelFr, labelAr, labelEn. Relation @ManyToOne avec Principe, @OneToMany avec Critere.

5. Critere : id (UUID), number, labelFr/Ar/En, preuvesFr/Ar/En, referencesFr/Ar/En. Relation @ManyToOne avec BonnePratique, @OneToMany avec Reponse.

6. Evaluation : id (UUID), year, status (enum), startedAt, submittedAt, validatedAt, globalScore, maturityLevel (enum), comments. Relation @ManyToOne avec Organisme, @OneToMany avec Reponse et ScorePrincipe.

7. Reponse : id (UUID), niveau (enum), commentaire, preuveFiles (List<String>), preuveLinks (List<String>), submittedAt, status (enum), validatedById, validatedAt, validatorComment, rejectionReason. Relations @ManyToOne avec Evaluation et Critere.

8. ScorePrincipe : id (UUID), score (0-100), maxPossible (100), weight. Relations @ManyToOne avec Evaluation et Principe.

9. GlobalScore : id (UUID), year, score, maturityLevel, rank. Relation @ManyToOne avec Organisme.

10. Notification : id (UUID), type, titleFr/Ar/En, messageFr/Ar/En, isRead, link, createdAt. Relation @ManyToOne avec User.

11. AuditLog : id (UUID), action, entity, oldValue (JSON), newValue (JSON), ipAddress, createdAt. Relations @ManyToOne avec User et Evaluation.

Utilise Lombok @Data, @NoArgsConstructor, @AllArgsConstructor. Utilise @Type(JsonType.class) pour les champs JSON. Génère les repository interfaces pour chaque entité.
```

## PROMPT 3 - Spring Security + JWT
```
Configure Spring Security avec JWT pour le SSE. Crée :

1. JwtUtil : génération de token (access 15min, refresh 7j), validation, extraction claims. Secret key depuis application.yml.

2. JwtAuthenticationFilter : OncePerRequestFilter qui vérifie le header Authorization, extrait et valide le token, crée UsernamePasswordAuthenticationToken avec les rôles.

3. CustomUserDetailsService : implémente UserDetailsService, charge l'utilisateur par email depuis UserRepository.

4. SecurityConfig : 
   - @EnableWebSecurity, @EnableMethodSecurity
   - PasswordEncoder : BCrypt (strength 12)
   - FilterChain avec : CSRF disabled, CORS enabled, SessionCreationPolicy.STATELESS, JwtAuthenticationFilter avant UsernamePasswordAuthenticationFilter
   - Routes publiques : /api/auth/**
   - Routes ADMIN : /api/admin/**
   - Routes RESPONSABLE : /api/responsable/**
   - Routes GOUVERNEMENT : /api/gouvernement/**
   - Toute autre route nécessite authentification

5. AuthController :
   - POST /api/auth/login → email + password → retourne {accessToken, refreshToken, user}
   - POST /api/auth/refresh → refreshToken → nouveau accessToken
   - POST /api/auth/logout → invalide le token
   - GET /api/auth/me → profil connecté depuis le token
   - PUT /api/auth/me → modification profil

6. DTOs : LoginRequest, AuthResponse, UserProfileDto.
```

## PROMPT 4 - Services CRUD Utilisateurs
```
Implémente le service et le controller CRUD utilisateurs avec règles métier :

1. UserService :
   - createUser(CreateUserDto dto) : seul ADMIN peut créer. Email unique. Password hash BCrypt. Rôle parmi ADMIN/RESPONSABLE/GOUVERNEMENT. Si RESPONSABLE, lier à un organisme.
   - getAllUsers() : pagination, filtre par rôle et organisme
   - getUserById(UUID id)
   - updateUser(UUID id, UpdateUserDto dto)
   - deleteUser(UUID id) : soft delete (isActive = false)
   - resetPassword(UUID id) : génère mot de passe temporaire
   - getUsersByOrganisme(UUID organismeId)

2. AdminUserController (route /api/admin/users) :
   - @PreAuthorize("hasRole('ADMIN')") sur toutes les méthodes
   - GET /api/admin/users → list avec Pageable
   - POST /api/admin/users → créer
   - GET /api/admin/users/{id} → détail
   - PUT /api/admin/users/{id} → modifier
   - DELETE /api/admin/users/{id} → désactiver
   - PUT /api/admin/users/{id}/reset-password → réinit

3. DTOs : CreateUserDto, UpdateUserDto, UserResponseDto (sans password). Mapper avec MapStruct.

4. Validation : email valide, password min 8 caractères, rôle obligatoire.
```

## PROMPT 5 - Services CRUD Organismes
```
Implémente le CRUD organismes :

1. OrganismeService :
   - createOrganisme(CreateOrganismeDto dto)
   - getAllOrganismes(Pageable pageable, TypeOrganisme type, String search)
   - getOrganismeById(UUID id) : avec lazy loading des users et evaluations
   - updateOrganisme(UUID id, UpdateOrganismeDto dto)
   - deleteOrganisme(UUID id) : soft delete, vérifier pas d'évaluation EN_COURS
   - getOrganismeEvaluations(UUID organismeId) : historique des évaluations
   - getStatistics() : nombre total, par type, avec évaluation en cours

2. OrganismeController (/api/organismes) :
   - GET /api/organismes → liste paginée + filtres
   - POST /api/organismes → créer (ADMIN)
   - GET /api/organismes/{id} → détail
   - PUT /api/organismes/{id} → modifier (ADMIN)
   - DELETE /api/organismes/{id} → désactiver (ADMIN)
   - GET /api/organismes/{id}/evaluations → historique

3. DTOs : CreateOrganismeDto, UpdateOrganismeDto, OrganismeResponseDto, OrganismeStatsDto.

4. Validation : name obligatoire, type obligatoire.
```

## PROMPT 6 - Service Référentiel (12 Principes)
```
Implémente le service référentiel des 12 principes de gouvernance :

1. PrincipeService :
   - seedPrincipes() : insère les 12 principes figés (données ci-dessous) au démarrage si table vide
   - getAllPrincipes() : liste avec bonnes pratiques et critères (EAGER)
   - getPrincipeById(UUID id) : détail complet
   - getPrincipeByNumber(int number)
   - createPrincipe(CreatePrincipeDto dto) : pour principes additionnels (isFixed=false)
   - updatePrincipe(UUID id, UpdatePrincipeDto dto) : interdit si isFixed=true
   - deletePrincipe(UUID id) : interdit si isFixed=true
   - updateOrder(List<OrderDto>) : réordonner les principes

2. BonnePratiqueService : CRUD des bonnes pratiques sous un principe

3. CritereService : CRUD des critères sous une bonne pratique

4. Controllers : PrincipeController (/api/principes), BonnePratiqueController (/api/bonnes-pratiques), CritereController (/api/criteres)

5. Données de seed (12 principes) :
   1-Finalité, 2-Création de valeur, 3-Stratégie, 4-Surveillance, 5-Redevabilité, 6-Dialogue avec les parties prenantes, 7-Leadership, 8-Données et décisions, 9-Gouvernance du risque, 10-Responsabilité sociétale, 11-Viabilité et pérennité de la performance, 12-Maîtrise de la corruption. Chacun avec poids 1.0, isFixed=true, isActive=true.

6. CommandLineRunner pour exécuter le seed au démarrage.
```

## PROMPT 7 - Service Évaluation et Workflow
```
Implémente le service évaluation avec le workflow métier complet :

1. EvaluationService :
   - createEvaluation(CreateEvaluationDto dto) : ADMIN crée pour un organisme et une année. Vérifie pas d'évaluation EN_COURS pour cet organisme cette année. Crée automatiquement les réponses vides (BROUILLON) pour TOUS les critères de TOUS les principes. Envoie notification au responsable.
   - getEvaluations(Pageable pageable, StatusEvaluation status, UUID organismeId, Integer year) : filtres combinés
   - getEvaluationById(UUID id) : détail avec réponses, scores, organisme
   - submitEvaluation(UUID id) : RESPONSABLE. Vérifie que TOUTES les réponses ont un niveau sélectionné (pas N0 par défaut, l'utilisateur doit avoir fait un choix). Change status à SOUMISE. Envoie notification au gouvernement.
   - validateEvaluation(UUID id) : GOUVERNEMENT. Vérifie status=SOUMISE ou EN_VALIDATION. Calcule les scores automatiquement (voir formules). Détermine maturityLevel. Met à jour le classement global. Change status à VALIDEE. Notification au responsable.
   - rejectEvaluation(UUID id, String reason) : GOUVERNEMENT. Status = REJETEE. Notification.
   - requestCorrection(UUID id, String reason) : GOUVERNEMENT. Status = EN_COURS avec flag correction. Notification.

2. Formules de calcul :
   - Score d'un principe = (somme niveaux réponses / (nombre critères × 3)) × 100
   - Score global = moyenne pondérée des scores des 12 principes
   - MaturityLevel : INITIAL (0-25), EN_PROGRESSION (25-50), AVANCE (50-75), EXCELLENT (75-100)

3. EvaluationController (/api/evaluations) avec les endpoints REST correspondants.

4. DTOs : CreateEvaluationDto, EvaluationResponseDto, SubmitEvaluationDto, ValidateEvaluationDto.
```

## PROMPT 8 - Service Réponses et Upload
```
Implémente le service de réponses aux critères et upload de preuves :

1. ReponseService :
   - getReponsesByEvaluationAndPrincipe(UUID evaluationId, UUID principeId) : retourne toutes les réponses d'un principe pour une évaluation
   - saveReponses(UUID evaluationId, List<ReponseBatchDto> reponses) : le responsable sauvegarde en batch. Vérifie evaluation EN_COURS. Met à jour niveau, commentaire, preuveLinks. Status devient SOUMISE pour chaque réponse.
   - updateReponse(UUID id, UpdateReponseDto dto) : modification si BROUILLON ou A_CORRIGER
   - validateReponse(UUID id, ValidateReponseDto dto) : GOUVERNEMENT valide une réponse. Status = VALIDEE.
   - rejectReponse(UUID id, String reason) : GOUVERNEMENT rejette. Status = REJETEE. Ajoute rejectionReason.
   - requestCorrectionReponse(UUID id, String reason) : Status = A_CORRIGER. Ajoute validatorComment.
   - uploadProof(UUID reponseId, MultipartFile file) : stocke fichier avec nom UUID, retourne l'URL. Limite 10MB. Vérifie type MIME.
   - deleteProof(UUID reponseId, String fileId) : supprime fichier physique et référence

2. FileStorageService :
   - store(MultipartFile file) : sauvegarde dans /uploads/ avec nom UUID
   - delete(String filename)
   - getUrl(String filename)

3. ReponseController (/api/evaluations/{id}/reponses) :
   - GET ?principeId=xxx → lister
   - POST → sauvegarder batch
   - PUT /api/reponses/{id} → modifier
   - PUT /api/reponses/{id}/validate → valider
   - PUT /api/reponses/{id}/reject → rejeter
   - POST /api/reponses/{id}/upload → upload fichier
   - DELETE /api/reponses/{id}/files/{fileId} → suppreer fichier
```

## PROMPT 9 - Dashboard, Classement et Rapports
```
Implémente les services de dashboard, classement et exports :

1. DashboardService :
   - getGlobalKPIs() : nombre organismes, évaluations en cours, évaluations validées, score moyen global
   - getRanking(Integer year, TypeOrganisme type) : classement des organismes par score global décroissant. Inclut rang, nom, type, score, maturityLevel.
   - getGapAnalysis(UUID organismeId, Integer year) : comparaison score par principe vs moyenne du secteur
   - getEvolution(UUID organismeId) : historique des scores sur plusieurs années
   - getRecentActivity() : dernières évaluations soumises/validées

2. ReportService :
   - generateEvaluationPdf(UUID evaluationId) : génère PDF avec iText/OpenPDF contenant page de garde (nom organisme, date, score global, niveau maturité), tableau récapitulatif par principe, détail critère par critère, recommandations.
   - generateGlobalExcel(Integer year) : export Excel avec Apache POI. Onglets : Synthèse (org, type, score, rang), Détail par principe, Détail par critère.
   - generateOrganismeExcel(UUID organismeId) : export Excel détaillé d'un organisme

3. Controllers : DashboardController (/api/dashboard), ReportController (/api/reports)

4. Endpoints :
   - GET /api/dashboard/global → KPIs
   - GET /api/dashboard/ranking → classement
   - GET /api/dashboard/gap-analysis → analyse écart
   - GET /api/dashboard/evolution → évolution
   - GET /api/reports/{evaluationId}/pdf → PDF
   - GET /api/reports/{evaluationId}/excel → Excel
   - GET /api/reports/global/excel → Excel global
```

## PROMPT 10 - Notifications et Chatbot
```
Implémente le système de notifications et le chatbot :

1. NotificationService :
   - createNotification(CreateNotificationDto dto) : crée notification pour un utilisateur
   - getMyNotifications(UUID userId, Pageable pageable) : liste paginée
   - markAsRead(UUID id) : marquer lue
   - markAllAsRead(UUID userId) : tout marquer lue
   - deleteNotification(UUID id)
   - sendNotificationForEvent(EventType event, UUID userId, Map<String, String> params) : crée notification selon l'événement (EVALUATION_ASSIGNED, EVALUATION_SUBMITTED, etc.)

2. WebSocketConfig : configure STOMP websocket sur /ws pour notifications temps réel.

3. NotificationController (/api/notifications) : GET, PUT /{id}/read, PUT /read-all, DELETE /{id}

4. ChatbotController (/api/chatbot) :
   - POST /api/chatbot/message → reçoit {message, sessionId}, retourne réponse du bot
   - Implémentation simple : mappage de keywords vers réponses prédéfinies sur les 12 principes de gouvernance
   - Réponses pour : "bonjour", "principe", "évaluation", "score", "maturité", "labellisation", "preuve", "validation", "correction", "classement"
   - Si message ne match aucun keyword → réponse par défaut invitant à consulter la documentation

5. ChatMessageDto : message, sessionId, timestamp. ChatResponseDto : response, suggestions (liste de questions suggérées).
```

## PROMPT 11 - Initialisation Frontend React
```
Initialise le frontend React pour le SSE :

1. Crée avec Vite : npm create vite@latest sse-frontend -- --template react-ts
2. Installe les dépendances : 
   - UI : tailwindcss, postcss, autoprefixer, @shadcn/ui (init)
   - Routing : react-router-dom
   - HTTP : axios
   - State : zustand
   - Forms : react-hook-form, zod, @hookform/resolvers
   - Charts : recharts
   - Export : jspdf, xlsx
   - i18n : react-i18next, i18next, i18next-browser-languagedetector
   - Icons : lucide-react
   - Date : date-fns
   - Toast : sonner
   
3. Configure Tailwind avec le thème SSE :
   - Couleurs primaires : bleu gouvernemental (#1e3a5f)
   - Secondaire : or/jaune (#d4a843)
   - Succès : vert, Danger : rouge, Warning : orange
   - Sidebar width : 280px
   
4. Structure des dossiers :
   src/
   ├── components/
   │   ├── ui/          (shadcn components)
   │   ├── layout/      (Sidebar, Header, Breadcrumb)
   │   ├── common/      (KPICard, DataTable, Modal)
   │   └── evaluation/  (PrincipeAccordion, CritereCard, ProgressBar)
   ├── pages/
   │   ├── auth/
   │   ├── admin/
   │   ├── responsable/
   │   └── gouvernement/
   ├── hooks/
   ├── stores/
   ├── services/
   ├── types/
   ├── lib/
   └── i18n/

5. Crée les types TypeScript pour toutes les entités backend (User, Organisme, Principe, BonnePratique, Critere, Evaluation, Reponse, ScorePrincipe, Notification, etc.).
```

## PROMPT 12 - i18n et Layout
```
Implémente l'internationalisation FR/AR/EN et le layout principal :

1. Configuration i18n :
   - Fichiers de traduction : /public/locales/fr.json, ar.json, en.json
   - Clés structurées : navigation, pages, evaluation, dashboard, common, errors
   - Détection automatique de la langue, fallback FR
   - Quand langue = ar → dir="rtl" sur <html>, sidebar à droite, flex-row-reverse
   
2. Composant LanguageSwitcher : bouton FR | AR | EN dans le header. Change la langue et la direction.

3. Layout principal (AppLayout) :
   - Sidebar (280px) : logo SSE en haut, menu de navigation selon le rôle de l'utilisateur, items avec icônes et labels traduits
   - Header (64px) : titre de la page, LanguageSwitcher, icône notifications avec badge, profil utilisateur (dropdown avec déconnexion)
   - Content : zone principale avec padding
   - Breadcrumb : fil d'ariane dynamique selon la route
   
4. Routes protégées par rôle :
   - /login → publique
   - /admin/* → ADMIN
   - /responsable/* → RESPONSABLE
   - /gouvernement/* → GOUVERNEMENT
   - Redirection selon le rôle après login
   
5. AuthGuard : vérifie token JWT, redirige vers /login si expiré. Utilise Zustand pour l'état auth.
```

## PROMPT 13 - Pages Admin
```
Implémente les pages de l'interface Administrateur :

1. /admin/dashboard :
   - 4 cartes KPI : Nombre organismes, Évaluations en cours, Évaluations validées, Score moyen global
   - Graphique en barres : Évaluations par statut
   - Graphique circulaire : Répartition organismes par type
   - Tableau : Dernières évaluations avec statut
   
2. /admin/users :
   - Tableau CRUD avec DataTable (pagination, tri, filtres)
   - Colonnes : Nom, Email, Rôle, Organisme, Statut, Actions
   - Modal création : formulaire avec react-hook-form + zod (email, firstName, lastName, rôle select, organisme select si RESPONSABLE)
   - Actions : Éditer (modal), Désactiver (confirm), Réinitialiser mdp (confirm)
   - Filtres : par rôle, par organisme, recherche textuelle
   
3. /admin/organismes :
   - Tableau CRUD : Nom, Type, Secteur, Contact, Actions
   - Modal création : name, type (select), sector, address, email, phone, website
   - Actions : Éditer, Voir historique évaluations, Désactiver
   - Filtres : par type, recherche
   
4. /admin/evaluations :
   - Tableau : Organisme, Année, Statut (badge coloré), Date début, Actions
   - Bouton "Nouvelle évaluation" : modal avec select organisme, input année
   - Actions : Voir détail, Suivre progression
   - Filtres : par statut, par organisme, par année
   
5. /admin/principes :
   - Vue en accordion des 12 principes avec bonnes pratiques et critères
   - Bouton "Ajouter un principe" pour principes additionnels
```

## PROMPT 14 - Formulaire Évaluation (Responsable)
```
Implémente le formulaire de remplissage d'évaluation pour le Responsable :

1. /responsable/evaluation/:id :
   - En-tête : nom organisme, année, barre de progression globale (% critères remplis)
   - Navigation par principe : 12 onglets/étapes ou sidebar interne avec les 12 principes
   
2. Composant PrincipeAccordion :
   - Titre : numéro + nom du principe + score actuel (calculé en temps réel)
   - Contenu : liste des BonnePratique, chacune contenant ses CritereCard
   
3. Composant CritereCard :
   - Label du critère (traduit selon langue)
   - Radio group 4 niveaux : 0-N'existe pas | 1-En cours | 2-Réalisé | 3-Validé
   - Descriptions explicatives pour chaque niveau
   - Textarea pour commentaire
   - Zone d'upload : drag & drop fichiers (max 10MB) + input pour liens externes
   - Liste des preuves déjà uploadées avec bouton supprimer
   - Section "Exemples de preuves attendues" (info bulle)
   - Section "Références légales" (info bulle)
   
4. Logique de sauvegarde :
   - Sauvegarde auto (debounce 2s) en brouillon
   - Bouton "Sauvegarder" manuel
   - Vérification : tous les critères doivent avoir un niveau sélectionné avant soumission
   - Bouton "Soumettre l'évaluation" : confirmation modal, appel API submit
   
5. Après soumission : redirection vers dashboard avec message de succès
```

## PROMPT 15 - Interface Validation (Gouvernement)
```
Implémente l'interface de validation pour le Gouvernement :

1. /gouvernement/evaluations :
   - Tableau des évaluations SOUMISES et EN_VALIDATION
   - Colonnes : Organisme, Année, Date soumission, Statut, Actions
   - Filtres : par statut, par organisme, par année
   
2. /gouvernement/evaluation/:id/validate :
   - Vue split : à gauche la liste des principes (navigation), à droite le contenu
   - Même structure d'accordion que le formulaire responsable, mais en mode lecture
   - Pour chaque critère, le validateur voit :
     * Le niveau choisi par le responsable
     * Le commentaire du responsable
     * Les preuves uploadées (fichiers téléchargeables + liens)
     * Panel de validation à droite : 
       - Bouton "Valider" (vert)
       - Bouton "Rejeter" (rouge) avec textarea pour motif
       - Bouton "Demander correction" (orange) avec textarea pour commentaire
   
3. Barre d'action globale :
   - "Valider l'évaluation" : valide TOUTES les réponses et l'évaluation globale
   - "Demander des corrections" : marque l'évaluation comme A_CORRIGER
   - "Rejeter l'évaluation" : avec textarea pour motif global
   
4. Après validation : calcul automatique du score, détermination maturityLevel, mise à jour classement. Notification envoyée au responsable.
   
5. Indicateurs visuels : couleur selon statut de chaque réponse (gris=brouillon, vert=validée, rouge=rejetée, orange=à corriger)
```

## PROMPT 16 - Dashboards et Classement
```
Implémente les dashboards et le classement :

1. /responsable/dashboard :
   - Cartes : Mes évaluations (total, en cours, validées), Score actuel, Niveau de maturité (badge coloré)
   - Graphique radar : Scores par principe (comparaison avec moyenne secteur)
   - Tableau : Historique des évaluations avec score et statut
   - Liste des notifications récentes
   
2. /gouvernement/dashboard :
   - KPIs globaux (mêmes que admin)
   - Graphique : Évaluations par mois (courbe)
   - Alertes : évaluations en attente de validation depuis +30 jours
   - Accès rapide aux évaluations à valider
   
3. /gouvernement/ranking :
   - Tableau de classement complet : Rang, Organisme, Type, Score Global, Niveau Maturité, Tendance (flèche vs année précédente)
   - Filtres : par type d'organisme, par année
   - Graphique en barres horizontales : Top 10 organismes
   - Export Excel du classement
   
4. /gouvernement/gap-analysis :
   - Select organisme → affiche analyse
   - Graphique barres groupées : Score par principe vs moyenne nationale vs moyenne secteur
   - Tableau : Écart par principe avec recommandations d'amélioration
   
5. /gouvernement/evolution :
   - Select organisme
   - Graphique en ligne : Évolution du score global sur plusieurs années
   - Graphique en ligne multiple : Évolution par principe
```

## PROMPT 17 - Export PDF/Excel et Notifications UI
```
Implémente les exports et l'interface de notifications :

1. Export PDF (Rapport d'évaluation) :
   - Bouton "Exporter PDF" sur la page de validation et sur le dashboard responsable
   - Page de garde : Logo SSE, nom organisme, année, date génération, score global, badge maturité
   - Tableau récapitulatif : 12 principes avec score et niveau
   - Détail par principe : chaque critère avec niveau choisi, commentaire, preuves
   - Graphique radar des 12 principes (image intégrée)
   - Recommandations générées automatiquement selon les écarts
   - Utilise jspdf + jspdf-autotable
   
2. Export Excel :
   - Bouton "Exporter Excel" sur le classement
   - Onglet 1 Synthèse : organisme, type, score global, maturité, rang
   - Onglet 2 Détail par principe : scores des 12 principes par organisme
   - Onglet 3 Détail par critère : niveau choisi pour chaque critère
   - Utilise la librairie xlsx
   
3. Interface Notifications :
   - Icône cloche dans le header avec badge du nombre de non-lues
   - Dropdown au clic : liste des notifications récentes (titre, message, date relative)
   - Marquer comme lue au clic (redirige vers le lien associé)
   - Page /notifications : liste complète avec pagination, filtres par type
   - Suppression individuelle ou "Tout marquer comme lu"
   
4. Toast notifications : utilisation de sonner pour les actions (succès, erreur)
```

## PROMPT 18 - Chatbot Widget
```
Implémente le chatbot de support comme widget flottant :

1. ChatbotWidget :
   - Bouton flottant en bas à droite (icône message, couleur primaire)
   - Au clic : fenêtre de chat s'ouvre (300x400px)
   - Header : "Assistant SSE" + bouton fermer
   
2. Interface de chat :
   - Zone messages scrollable avec bulles (utilisateur à droite, bot à gauche)
   - Input texte en bas avec bouton envoyer (icône send)
   - Typing indicator quand le bot "réfléchit"
   - Suggestions de questions rapides (chips cliquables) :
     * "Comment remplir une évaluation ?"
     * "Qu'est-ce que la maturité ?"
     * "Comment sont calculés les scores ?"
     * "Quelles preuves sont acceptées ?"
     
3. Logique du bot (frontend) :
   - Keywords matching simple sur le message :
     * "bonjour/salut" → réponse de bienvenue avec suggestions
     * "évaluation/remplir" → guide étape par étape
     * "score/calcul" → explication des formules
     * "maturité/niveau" → explication des 4 niveaux
     * "principe" → liste des 12 principes
     * "preuve/document" → types de preuves acceptées
     * "validation" → processus de validation
     * "correction" → comment corriger une réponse
     * "classement/rang" → explication du classement
     * "labellisation/label" → critères de labellisation
     * "aide/support" → contacts support
   - Réponse par défaut si aucun keyword ne match
   
4. Connexion optionnelle au backend (/api/chatbot/message) pour réponses plus riches

5. Animations : fade in/out, typing dots animation, smooth scroll.
```

## PROMPT 19 - Intégration API et Services Frontend
```
Implémente les services API et l'intégration complète :

1. Configuration Axios :
   - Base URL depuis variable d'environnement (http://localhost:8080/api)
   - Intercepteur requête : ajoute header Authorization avec JWT depuis localStorage
   - Intercepteur réponse : gère 401 (redirection login), 403 (toast erreur), erreurs réseau
   - Refresh token automatique si access token expiré
   
2. Services API (par domaine) :
   - authService : login, logout, refresh, me, updateProfile
   - userService : CRUD users (admin)
   - organismeService : CRUD organismes
   - principeService : getPrincipes, getPrincipeDetail
   - evaluationService : create, list, getDetail, submit, validate, reject, requestCorrection
   - reponseService : getReponses, saveReponses, uploadProof, deleteProof
   - dashboardService : getKPIs, getRanking, getGapAnalysis, getEvolution
   - reportService : downloadPdf, downloadExcel
   - notificationService : getNotifications, markRead, markAllRead
   
3. Zustand Stores :
   - useAuthStore : user, token, isAuthenticated, login, logout, isRole(role)
   - useEvaluationStore : evaluation courante, réponses, progression, sauvegarder, soumettre
   - useNotificationStore : notifications, unreadCount, fetch, markRead
   - useUIStore : sidebarOpen, language, theme, toast messages
   
4. Custom Hooks :
   - useAuth : vérifie auth, redirige si non connecté
   - useApi : wrapper useQuery-like avec loading/error states
   - useEvaluationProgress : calcule % de completion
   - useLanguage : change language + direction RTL
   
5. Gestion des états de loading : skeletons sur les tableaux et cartes.
```

## PROMPT 20 - Docker Compose et Déploiement
```
Crée la configuration Docker complète pour le déploiement :

1. Dockerfile Backend (spring-boot) :
   - Image eclipse-temurin:17-jdk-alpine
   - Build multi-stage : mvn clean package en premier stage, copie du JAR en second
   - Expose port 8080
   - HEALTHCHECK sur /actuator/health
   - Variables d'environnement pour la connexion DB
   
2. Dockerfile Frontend (react) :
   - Image node:20-alpine pour build
   - Nginx alpine pour servir les fichiers statiques
   - Copie du build dans /usr/share/nginx/html
   - Configuration nginx pour le SPA routing (fallback vers index.html)
   - Expose port 80
   
3. docker-compose.yml complet :
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:15-alpine
       environment:
         POSTGRES_DB: sse_db
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: postgres
       volumes:
         - postgres_data:/var/lib/postgresql/data
       ports:
         - "5432:5432"
     
     backend:
       build: ./backend
       ports:
         - "8080:8080"
       environment:
         SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/sse_db
         SPRING_DATASOURCE_USERNAME: postgres
         SPRING_DATASOURCE_PASSWORD: postgres
         JWT_SECRET: ${JWT_SECRET:-sse-secret-key-change-in-production}
       depends_on:
         - postgres
       volumes:
         - uploads:/app/uploads
     
     frontend:
       build: ./frontend
       ports:
         - "3000:80"
       depends_on:
         - backend
   
   volumes:
     postgres_data:
     uploads:
   ```
   
4. application-prod.yml : configuration pour production (logs, pool connexion, CORS)

5. README.md : instructions de déploiement (docker-compose up -d), accès (frontend:3000, backend:8080, DB:5432), compte admin par défaut.

6. Script de démarrage rapide : start.sh qui vérifie Docker, lance docker-compose, attend que les services soient prêts, affiche les URLs.

7. Vérifie que tout compile et démarre correctement.
```

---

## EXÉCUTION

Exécutez ces prompts UN PAR UN dans Windsurf Cascade AI. Chaque prompt construit sur le précédent. Attendez la complétion de chaque étape avant de passer au suivant.
