package com.sse.repository;

import com.sse.entity.Notification;
import com.sse.enums.TypeNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    
    Page<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Optional<Notification> findByIdAndUserId(UUID id, UUID userId);
    
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user.id = :userId AND n.isRead = false")
    long countUnreadByUser(@Param("userId") UUID userId);
    
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.user.id = :userId AND n.isRead = false")
    void markAllAsReadByUser(@Param("userId") UUID userId);

    boolean existsByUserIdAndTypeAndLinkAndCreatedAtAfter(UUID userId, TypeNotification type, String link, LocalDateTime createdAt);
}
