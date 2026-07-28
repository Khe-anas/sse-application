package com.sse.repository;

import com.sse.entity.Preuve;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PreuveRepository extends JpaRepository<Preuve, UUID> {
    List<Preuve> findByCritereIdOrderByDisplayOrderAsc(UUID critereId);
}
