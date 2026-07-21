package com.sse.repository;

import com.sse.entity.User;
import com.sse.enums.Role;
import com.sse.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    
    Optional<User> findByEmailIgnoreCase(String email);

    @Query("SELECT u.organisme.id FROM User u WHERE LOWER(u.email) = LOWER(:email)")
    Optional<UUID> findOrganismeIdByEmail(@Param("email") String email);
    
    boolean existsByEmailIgnoreCase(String email);
    
    Page<User> findByRole(Role role, Pageable pageable);
    
    Page<User> findByOrganismeId(UUID organismeId, Pageable pageable);
    
    @Query("SELECT u FROM User u WHERE u.organisme.id = :organismeId AND u.role = 'USER' AND u.isActive = true")
    List<User> findActiveUsersByOrganisme(@Param("organismeId") UUID organismeId);

    List<User> findByIsActiveTrue();

    List<User> findByRoleInAndIsActiveTrue(List<Role> roles);
    
    @Query("SELECT u FROM User u WHERE " +
           "(:role IS NULL OR u.role = :role) AND " +
           "(:status IS NULL OR u.status = :status) AND " +
           "(:organismeId IS NULL OR u.organisme.id = :organismeId)")
    Page<User> findAllWithFilters(@Param("role") Role role,
                                   @Param("status") UserStatus status,
                                   @Param("organismeId") UUID organismeId,
                                   Pageable pageable);

    @Query("SELECT u FROM User u WHERE " +
           "(:role IS NULL OR u.role = :role) AND " +
           "(:status IS NULL OR u.status = :status) AND " +
           "(:organismeId IS NULL OR u.organisme.id = :organismeId) AND " +
           "(LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> findAllWithSearch(@Param("role") Role role,
                                   @Param("status") UserStatus status,
                                   @Param("organismeId") UUID organismeId,
                                   @Param("search") String search,
                                   Pageable pageable);
    
    long countByRole(Role role);
    
    long countByIsActiveTrue();
}
