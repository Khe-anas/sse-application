CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    label VARCHAR(120) NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (id, code, label, description)
VALUES
    ('00000000-0000-0000-0000-000000000101', 'ADMIN', 'Administrateur', 'Administration complète de la plateforme'),
    ('00000000-0000-0000-0000-000000000102', 'USER', 'Utilisateur', 'Responsable d’un organisme évalué'),
    ('00000000-0000-0000-0000-000000000103', 'EVALUATEUR', 'Évaluateur', 'Évaluation et validation des réponses'),
    ('00000000-0000-0000-0000-000000000104', 'GOUVERNEMENT', 'Gouvernement', 'Consultation des indicateurs et du classement')
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS types_organisme (
    id UUID PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    label VARCHAR(120) NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO types_organisme (id, code, label, description)
VALUES
    ('00000000-0000-0000-0000-000000000201', 'PUBLIC', 'Public', 'Organisme du secteur public'),
    ('00000000-0000-0000-0000-000000000202', 'PRIVE', 'Privé', 'Organisme du secteur privé'),
    ('00000000-0000-0000-0000-000000000203', 'SOCIETE_CIVILE', 'Société civile', 'Organisation de la société civile')
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS secteurs (
    id UUID PRIMARY KEY,
    code VARCHAR(255) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO secteurs (id, code, label)
VALUES
    ('00000000-0000-0000-0000-000000000301', 'AGRICULTURE', 'Agriculture'),
    ('00000000-0000-0000-0000-000000000302', 'INDUSTRY', 'Industrie'),
    ('00000000-0000-0000-0000-000000000303', 'ENERGY', 'Énergie'),
    ('00000000-0000-0000-0000-000000000304', 'CONSTRUCTION', 'Construction'),
    ('00000000-0000-0000-0000-000000000305', 'COMMERCE', 'Commerce'),
    ('00000000-0000-0000-0000-000000000306', 'TRANSPORT', 'Transport'),
    ('00000000-0000-0000-0000-000000000307', 'TECHNOLOGY', 'Technologie'),
    ('00000000-0000-0000-0000-000000000308', 'FINANCE', 'Finance'),
    ('00000000-0000-0000-0000-000000000309', 'HEALTH', 'Santé'),
    ('00000000-0000-0000-0000-000000000310', 'EDUCATION', 'Éducation'),
    ('00000000-0000-0000-0000-000000000311', 'TOURISM', 'Tourisme'),
    ('00000000-0000-0000-0000-000000000312', 'PUBLIC_ADMINISTRATION', 'Administration publique'),
    ('00000000-0000-0000-0000-000000000313', 'SERVICES', 'Services'),
    ('00000000-0000-0000-0000-000000000314', 'CIVIL_SOCIETY', 'Société civile')
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label,
    updated_at = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS preuves (
    id UUID PRIMARY KEY,
    critere_id UUID NOT NULL,
    texte_fr VARCHAR(3000),
    texte_ar VARCHAR(3000),
    texte_en VARCHAR(3000),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS references_sse (
    id UUID PRIMARY KEY,
    critere_id UUID NOT NULL,
    texte_fr VARCHAR(3000),
    texte_ar VARCHAR(3000),
    texte_en VARCHAR(3000),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $migration$
BEGIN
    IF to_regclass('public.organismes') IS NOT NULL THEN
        INSERT INTO secteurs (id, code, label)
        SELECT
            md5('secteur:' || BTRIM(sector))::uuid,
            BTRIM(sector),
            BTRIM(sector)
        FROM organismes
        WHERE sector IS NOT NULL
          AND BTRIM(sector) <> ''
        ON CONFLICT (code) DO NOTHING;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_organismes_type_code'
        ) THEN
            ALTER TABLE organismes
                ADD CONSTRAINT fk_organismes_type_code
                FOREIGN KEY (type) REFERENCES types_organisme(code);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_organismes_sector_code'
        ) THEN
            ALTER TABLE organismes
                ADD CONSTRAINT fk_organismes_sector_code
                FOREIGN KEY (sector) REFERENCES secteurs(code);
        END IF;
    END IF;

    IF to_regclass('public.users') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_role_code'
       ) THEN
        ALTER TABLE users
            ADD CONSTRAINT fk_users_role_code
            FOREIGN KEY (role) REFERENCES roles(code);
    END IF;

    IF to_regclass('public.account_requests') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_account_requests_type_code'
        ) THEN
            ALTER TABLE account_requests
                ADD CONSTRAINT fk_account_requests_type_code
                FOREIGN KEY (type) REFERENCES types_organisme(code);
        END IF;
    END IF;

    IF to_regclass('public.criteres') IS NOT NULL THEN
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'criteres'
              AND column_name = 'preuves_fr'
        ) THEN
            INSERT INTO preuves (
                id, critere_id, texte_fr, texte_ar, texte_en, display_order
            )
            SELECT
                md5('preuve:' || id::text)::uuid,
                id,
                preuves_fr,
                preuves_ar,
                preuves_en,
                0
            FROM criteres
            WHERE COALESCE(
                      NULLIF(BTRIM(preuves_fr), ''),
                      NULLIF(BTRIM(preuves_ar), ''),
                      NULLIF(BTRIM(preuves_en), '')
                  ) IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM preuves p WHERE p.critere_id = criteres.id
              );
        END IF;

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'criteres'
              AND column_name = 'references_fr'
        ) THEN
            INSERT INTO references_sse (
                id, critere_id, texte_fr, texte_ar, texte_en, display_order
            )
            SELECT
                md5('reference:' || id::text)::uuid,
                id,
                references_fr,
                references_ar,
                references_en,
                0
            FROM criteres
            WHERE COALESCE(
                      NULLIF(BTRIM(references_fr), ''),
                      NULLIF(BTRIM(references_ar), ''),
                      NULLIF(BTRIM(references_en), '')
                  ) IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM references_sse r WHERE r.critere_id = criteres.id
              );
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_preuves_critere'
        ) THEN
            ALTER TABLE preuves
                ADD CONSTRAINT fk_preuves_critere
                FOREIGN KEY (critere_id) REFERENCES criteres(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_references_sse_critere'
        ) THEN
            ALTER TABLE references_sse
                ADD CONSTRAINT fk_references_sse_critere
                FOREIGN KEY (critere_id) REFERENCES criteres(id) ON DELETE CASCADE;
        END IF;
    END IF;
END
$migration$;

CREATE INDEX IF NOT EXISTS idx_preuves_critere ON preuves(critere_id);
CREATE INDEX IF NOT EXISTS idx_references_sse_critere ON references_sse(critere_id);
