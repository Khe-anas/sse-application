DO $migration$
BEGIN
    IF to_regclass('public.users') IS NOT NULL THEN
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS grade VARCHAR(150);
    END IF;
END
$migration$;
