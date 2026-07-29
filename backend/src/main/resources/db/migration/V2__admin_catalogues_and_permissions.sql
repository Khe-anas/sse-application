ALTER TABLE roles
    ADD COLUMN IF NOT EXISTS base_role VARCHAR(32),
    ADD COLUMN IF NOT EXISTS system_role BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE roles
SET base_role = code,
    system_role = TRUE
WHERE code IN ('ADMIN', 'USER', 'EVALUATEUR', 'GOUVERNEMENT');

UPDATE roles
SET base_role = 'ADMIN'
WHERE base_role IS NULL;

ALTER TABLE roles
    ALTER COLUMN base_role SET NOT NULL;

ALTER TABLE types_organisme
    ADD COLUMN IF NOT EXISTS base_type VARCHAR(32),
    ADD COLUMN IF NOT EXISTS system_type BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE types_organisme
SET base_type = code,
    system_type = TRUE
WHERE code IN ('PUBLIC', 'PRIVE', 'SOCIETE_CIVILE');

UPDATE types_organisme
SET base_type = 'PRIVE'
WHERE base_type IS NULL;

ALTER TABLE types_organisme
    ALTER COLUMN base_type SET NOT NULL;

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    resource_code VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    label VARCHAR(160) NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO permissions (id, code, resource_code, action, label, description)
SELECT
    md5('permission:' || values_table.code)::uuid,
    values_table.code,
    values_table.resource_code,
    values_table.action,
    values_table.label,
    values_table.description
FROM (
    VALUES
        ('DASHBOARD_READ', 'DASHBOARD', 'READ', 'Consulter le tableau de bord', 'Consulter les indicateurs et statistiques'),
        ('USERS_READ', 'USERS', 'READ', 'Consulter les utilisateurs', 'Afficher les comptes utilisateurs'),
        ('USERS_WRITE', 'USERS', 'WRITE', 'Modifier les utilisateurs', 'Créer, modifier, désactiver et réinitialiser les comptes'),
        ('ACCOUNT_REQUESTS_READ', 'ACCOUNT_REQUESTS', 'READ', 'Consulter les demandes de compte', 'Afficher les demandes de création de compte'),
        ('ACCOUNT_REQUESTS_WRITE', 'ACCOUNT_REQUESTS', 'WRITE', 'Traiter les demandes de compte', 'Prendre en charge, accepter ou refuser les demandes'),
        ('ORGANISMES_READ', 'ORGANISMES', 'READ', 'Consulter les organismes', 'Afficher les organismes et leurs coordonnées'),
        ('ORGANISMES_WRITE', 'ORGANISMES', 'WRITE', 'Modifier les organismes', 'Créer, modifier ou désactiver les organismes'),
        ('EVALUATIONS_READ', 'EVALUATIONS', 'READ', 'Consulter les évaluations', 'Afficher les évaluations et leurs réponses'),
        ('EVALUATIONS_WRITE', 'EVALUATIONS', 'WRITE', 'Modifier les évaluations', 'Créer, remplir, valider ou demander une correction'),
        ('EVALUATIONS_VALIDATE', 'EVALUATIONS', 'WRITE', 'Valider les évaluations', 'Prendre en charge, valider, rejeter ou demander une correction'),
        ('REFERENTIEL_READ', 'REFERENTIEL', 'READ', 'Consulter le référentiel', 'Afficher les principes, bonnes pratiques et critères'),
        ('REFERENTIEL_WRITE', 'REFERENTIEL', 'WRITE', 'Modifier le référentiel', 'Créer, modifier ou supprimer les éléments du référentiel'),
        ('NOTIFICATIONS_READ', 'NOTIFICATIONS', 'READ', 'Consulter les notifications', 'Afficher les notifications reçues'),
        ('NOTIFICATIONS_NOTIFY', 'NOTIFICATIONS', 'NOTIFY', 'Envoyer des notifications', 'Envoyer des messages ou annonces aux utilisateurs'),
        ('RECLAMATIONS_READ', 'RECLAMATIONS', 'READ', 'Consulter les réclamations', 'Afficher les réclamations'),
        ('RECLAMATIONS_WRITE', 'RECLAMATIONS', 'WRITE', 'Traiter les réclamations', 'Prendre en charge et résoudre les réclamations'),
        ('AUDIT_READ', 'AUDIT', 'READ', 'Consulter le journal d’audit', 'Afficher et exporter les opérations auditées'),
        ('REPORTS_READ', 'REPORTS', 'READ', 'Consulter les rapports', 'Afficher et exporter les rapports PDF et Excel')
) AS values_table(code, resource_code, action, label, description)
ON CONFLICT (code) DO UPDATE
SET resource_code = EXCLUDED.resource_code,
    action = EXCLUDED.action,
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT role_definition.id, permission.id
FROM roles role_definition
CROSS JOIN permissions permission
WHERE role_definition.code = 'ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT role_definition.id, permission.id
FROM roles role_definition
JOIN (
    VALUES
        ('USER', 'DASHBOARD_READ'),
        ('USER', 'ORGANISMES_READ'),
        ('USER', 'EVALUATIONS_READ'),
        ('USER', 'EVALUATIONS_WRITE'),
        ('USER', 'REFERENTIEL_READ'),
        ('USER', 'NOTIFICATIONS_READ'),
        ('USER', 'REPORTS_READ'),
        ('EVALUATEUR', 'DASHBOARD_READ'),
        ('EVALUATEUR', 'ORGANISMES_READ'),
        ('EVALUATEUR', 'EVALUATIONS_READ'),
        ('EVALUATEUR', 'EVALUATIONS_WRITE'),
        ('EVALUATEUR', 'EVALUATIONS_VALIDATE'),
        ('EVALUATEUR', 'REFERENTIEL_READ'),
        ('EVALUATEUR', 'NOTIFICATIONS_READ'),
        ('EVALUATEUR', 'REPORTS_READ'),
        ('GOUVERNEMENT', 'DASHBOARD_READ'),
        ('GOUVERNEMENT', 'ORGANISMES_READ'),
        ('GOUVERNEMENT', 'EVALUATIONS_READ'),
        ('GOUVERNEMENT', 'REFERENTIEL_READ'),
        ('GOUVERNEMENT', 'NOTIFICATIONS_READ'),
        ('GOUVERNEMENT', 'REPORTS_READ')
) AS grant_values(role_code, permission_code)
    ON grant_values.role_code = role_definition.code
JOIN permissions permission
    ON permission.code = grant_values.permission_code
ON CONFLICT DO NOTHING;

DO $migration$
BEGIN
    IF to_regclass('public.users') IS NOT NULL THEN
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS role_definition_id UUID;

        UPDATE users user_account
        SET role_definition_id = role_definition.id
        FROM roles role_definition
        WHERE user_account.role_definition_id IS NULL
          AND role_definition.code = user_account.role;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_role_definition'
        ) THEN
            ALTER TABLE users
                ADD CONSTRAINT fk_users_role_definition
                FOREIGN KEY (role_definition_id) REFERENCES roles(id);
        END IF;

        CREATE INDEX IF NOT EXISTS idx_users_role_definition
            ON users(role_definition_id);
    END IF;

    IF to_regclass('public.organismes') IS NOT NULL THEN
        ALTER TABLE organismes
            ADD COLUMN IF NOT EXISTS type_definition_id UUID;

        UPDATE organismes organisme
        SET type_definition_id = type_definition.id
        FROM types_organisme type_definition
        WHERE organisme.type_definition_id IS NULL
          AND type_definition.code = organisme.type;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_organismes_type_definition'
        ) THEN
            ALTER TABLE organismes
                ADD CONSTRAINT fk_organismes_type_definition
                FOREIGN KEY (type_definition_id) REFERENCES types_organisme(id);
        END IF;

        CREATE INDEX IF NOT EXISTS idx_organismes_type_definition
            ON organismes(type_definition_id);
    END IF;
END
$migration$;

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
