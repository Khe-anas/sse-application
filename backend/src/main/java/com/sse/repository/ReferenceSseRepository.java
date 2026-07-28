package com.sse.repository;

import com.sse.entity.ReferenceSse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReferenceSseRepository extends JpaRepository<ReferenceSse, UUID> {
    List<ReferenceSse> findByCritereIdOrderByDisplayOrderAsc(UUID critereId);
}
