package com.sse.repository;

import com.sse.entity.GlobalScore;
import com.sse.enums.TypeOrganisme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GlobalScoreRepository extends JpaRepository<GlobalScore, UUID> {
    
    List<GlobalScore> findByOrganismeIdOrderByYearDesc(UUID organismeId);
    
    Optional<GlobalScore> findByOrganismeIdAndYear(UUID organismeId, Integer year);
    
    @Query("SELECT gs FROM GlobalScore gs JOIN gs.organisme o WHERE o.type = :type AND gs.year = :year ORDER BY gs.score DESC")
    List<GlobalScore> findRankingByTypeAndYear(@Param("type") TypeOrganisme type, 
                                                @Param("year") Integer year);
    
    @Query("SELECT gs FROM GlobalScore gs WHERE gs.year = :year ORDER BY gs.score DESC")
    List<GlobalScore> findRankingByYear(@Param("year") Integer year);
    
    @Query("SELECT AVG(gs.score) FROM GlobalScore gs WHERE gs.year = :year")
    Double findAverageScoreByYear(@Param("year") Integer year);
    
    @Query("SELECT AVG(gs.score) FROM GlobalScore gs JOIN gs.organisme o WHERE o.type = :type AND gs.year = :year")
    Double findAverageScoreByTypeAndYear(@Param("type") TypeOrganisme type, 
                                          @Param("year") Integer year);
}
