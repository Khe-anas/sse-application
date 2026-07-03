package com.sse.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DatabaseMigrationService {

    private final JdbcTemplate jdbcTemplate;

    public void updateUserActivationSchema() {
        jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(32)");
        jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN password DROP NOT NULL");
        jdbcTemplate.update("""
            UPDATE users
            SET status = CASE
                WHEN is_active = true THEN 'ACTIVE'
                ELSE 'DISABLED'
            END
            WHERE status IS NULL
            """);
    }

    public void updateNotificationTypeConstraint() {
        jdbcTemplate.execute("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check");
        jdbcTemplate.execute("""
            ALTER TABLE notifications
            ADD CONSTRAINT notifications_type_check
            CHECK (type IN (
                'EVALUATION_ASSIGNED',
                'EVALUATION_SUBMITTED',
                'EVALUATION_VALIDATED',
                'EVALUATION_REJECTED',
                'CORRECTION_REQUESTED',
                'ADMIN_MESSAGE',
                'ANNOUNCEMENT',
                'REMINDER',
                'RECLAMATION_SUBMITTED',
                'SYSTEM'
            ))
            """);
    }
}
