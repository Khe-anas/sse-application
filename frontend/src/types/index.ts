// ==================== ENUMS ====================
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  RESPONSABLE = 'RESPONSABLE',
  GOUVERNEMENT = 'GOUVERNEMENT',
}

export enum TypeOrganisme {
  PUBLIC = 'PUBLIC',
  PRIVE = 'PRIVE',
  SOCIETE_CIVILE = 'SOCIETE_CIVILE',
}

export enum StatusEvaluation {
  EN_COURS = 'EN_COURS',
  SOUMISE = 'SOUMISE',
  EN_VALIDATION = 'EN_VALIDATION',
  VALIDEE = 'VALIDEE',
  REJETEE = 'REJETEE',
}

export enum MaturityLevel {
  INITIAL = 'INITIAL',
  EN_PROGRESSION = 'EN_PROGRESSION',
  AVANCE = 'AVANCE',
  EXCELLENT = 'EXCELLENT',
}

export enum Niveau {
  N0 = 'N0',
  N1 = 'N1',
  N2 = 'N2',
  N3 = 'N3',
}

export enum StatusReponse {
  BROUILLON = 'BROUILLON',
  SOUMISE = 'SOUMISE',
  VALIDEE = 'VALIDEE',
  REJETEE = 'REJETEE',
  A_CORRIGER = 'A_CORRIGER',
}

export enum TypeNotification {
  EVALUATION_ASSIGNED = 'EVALUATION_ASSIGNED',
  EVALUATION_SUBMITTED = 'EVALUATION_SUBMITTED',
  EVALUATION_VALIDATED = 'EVALUATION_VALIDATED',
  EVALUATION_REJECTED = 'EVALUATION_REJECTED',
  CORRECTION_REQUESTED = 'CORRECTION_REQUESTED',
  ADMIN_MESSAGE = 'ADMIN_MESSAGE',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  REMINDER = 'REMINDER',
  RECLAMATION_SUBMITTED = 'RECLAMATION_SUBMITTED',
  SYSTEM = 'SYSTEM',
}

export enum AccountRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ReclamationStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED',
}

export enum UserStatus {
  PENDING_ACTIVATION = 'PENDING_ACTIVATION',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export enum EmailJobStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export enum EmailJobType {
  ACCOUNT_ACTIVATION = 'ACCOUNT_ACTIVATION',
}

// ==================== ENTITY TYPES ====================
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: Role;
  phone?: string;
  isActive: boolean;
  status?: UserStatus;
  createdAt: string;
  lastLoginAt?: string;
  organismeId?: string;
  organismeName?: string;
}

export interface Organisme {
  id: string;
  name: string;
  type: TypeOrganisme;
  sector?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  isActive: boolean;
  createdAt: string;
  usersCount?: number;
  evaluationsCount?: number;
}

export interface Principe {
  id: string;
  number: number;
  nameFr: string;
  nameAr?: string;
  nameEn?: string;
  descriptionFr?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  weight: number;
  isFixed: boolean;
  isActive: boolean;
  order: number;
  bonnesPratiques: BonnePratique[];
}

export interface BonnePratique {
  id: string;
  number: number;
  labelFr: string;
  labelAr?: string;
  labelEn?: string;
  principeId: string;
  criteres: Critere[];
}

export interface Critere {
  id: string;
  number: number;
  labelFr: string;
  labelAr?: string;
  labelEn?: string;
  preuvesFr?: string;
  preuvesAr?: string;
  preuvesEn?: string;
  referencesFr?: string;
  referencesAr?: string;
  referencesEn?: string;
  bonnePratiqueId: string;
}

export interface Evaluation {
  id: string;
  organismeId: string;
  organismeName: string;
  organismeType: string;
  year: number;
  status: StatusEvaluation;
  startedAt: string;
  submittedAt?: string;
  validatedAt?: string;
  validationOpenedById?: string;
  validationOpenedByName?: string;
  validationOpenedAt?: string;
  globalScore?: number;
  maturityLevel?: MaturityLevel;
  comments?: string;
  totalCriteres?: number;
  answeredCriteres?: number;
  progressPercentage?: number;
  scores: ScorePrincipe[];
}

export interface ScorePrincipe {
  id: string;
  principeId: string;
  principeName: string;
  principeNumber: number;
  score: number;
  maxPossible: number;
  weight: number;
}

export interface Reponse {
  id: string;
  critereId: string;
  critereLabel: string;
  critereNumber: number;
  bonnePratiqueId: string;
  bonnePratiqueLabel: string;
  principeId: string;
  principeName: string;
  niveau?: Niveau;
  commentaire?: string;
  preuveFiles: string[];
  preuveLinks: string[];
  submittedAt?: string;
  status: StatusReponse;
  validatorComment?: string;
  rejectionReason?: string;
  correctionAddressed?: boolean;
  preuvesFr?: string;
  referencesFr?: string;
}

export interface Notification {
  id: string;
  type: TypeNotification;
  titleFr: string;
  titleAr?: string;
  titleEn?: string;
  messageFr: string;
  messageAr?: string;
  messageEn?: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface AccountRequest {
  id: string;
  companyName: string;
  type: TypeOrganisme;
  responsibleFirstName: string;
  responsibleLastName: string;
  responsibleFullName: string;
  companyEmail: string;
  phone?: string;
  address?: string;
  sector?: string;
  message?: string;
  verificationFiles: string[];
  status: AccountRequestStatus;
  adminComment?: string;
  processedAt?: string;
  reviewedById?: string;
  reviewedByName?: string;
  reviewStartedAt?: string;
  createdUserId?: string;
  createdOrganismeId?: string;
  createdOrganismeName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reclamation {
  id: string;
  organismeId: string;
  organismeName: string;
  submittedById: string;
  submittedByName: string;
  submittedByEmail: string;
  subject: string;
  message?: string;
  status: ReclamationStatus;
  openedById?: string;
  openedByName?: string;
  openedAt?: string;
  resolvedById?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  adminResponse?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailJob {
  id: string;
  type: EmailJobType;
  status: EmailJobStatus;
  userId?: string;
  userName?: string;
  toEmail: string;
  subject: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  nextAttemptAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// ==================== DTO TYPES ====================
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
}

export interface DashboardKPIs {
  totalOrganismes: number;
  totalUsers: number;
  evaluationsEnCours: number;
  evaluationsValidees: number;
  evaluationsSoumises: number;
  averageScore?: number;
  pendingValidations: number;
  organismesByType: DashboardDistributionItem[];
  evaluationsByStatus: DashboardDistributionItem[];
}

export interface DashboardDistributionItem {
  key: string;
  count: number;
}

export interface RankingItem {
  rank: number;
  organismeId: string;
  organismeName: string;
  type: TypeOrganisme;
  score: number;
  maturityLevel: MaturityLevel;
  year: number;
  trend: string;
}

export interface GapAnalysisItem {
  principeId: string;
  principeName: string;
  principeNumber: number;
  organismeScore: number;
  averageScore: number;
  sectorAverage: number;
  gap: number;
  recommendation: string;
}

export interface GlobalScore {
  id: string;
  organismeId: string;
  year: number;
  score: number;
  maturityLevel: MaturityLevel;
  rank?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  suggestions?: string[];
  timestamp: string;
}
