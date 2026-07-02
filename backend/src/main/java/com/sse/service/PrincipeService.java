package com.sse.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sse.dto.BonnePratiqueResponse;
import com.sse.dto.CritereResponse;
import com.sse.dto.PrincipeResponse;
import com.sse.entity.BonnePratique;
import com.sse.entity.Critere;
import com.sse.entity.Principe;
import com.sse.repository.BonnePratiqueRepository;
import com.sse.repository.CritereRepository;
import com.sse.repository.PrincipeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PrincipeService {
    
    private final PrincipeRepository principeRepository;
    private final BonnePratiqueRepository bonnePratiqueRepository;
    private final CritereRepository critereRepository;
    private final ObjectMapper objectMapper;
    
    @Transactional
    public void seedPrincipes() {
        String[][] principesData = {
            {"1", "Finalité", "الغاية", "Purpose"},
            {"2", "Création de valeur", "خلق القيمة", "Value Creation"},
            {"3", "Stratégie", "الاستراتيجية", "Strategy"},
            {"4", "Surveillance", "المراقبة", "Oversight"},
            {"5", "Redevabilité", "المحاسبة", "Accountability"},
            {"6", "Dialogue avec les parties prenantes", "الحوار مع أصحاب المصلحة", "Stakeholder Engagement"},
            {"7", "Leadership", "القيادة", "Leadership"},
            {"8", "Données et décisions", "البيانات والقرارات", "Data and Decisions"},
            {"9", "Gouvernance du risque", "حوكمة المخاطر", "Risk Governance"},
            {"10", "Responsabilité sociétale", "المسؤولية الاجتماعية", "Social Responsibility"},
            {"11", "Viabilité et pérennité de la performance", "استدامة الأداء", "Performance Sustainability"},
            {"12", "Maîtrise de la corruption", "مكافحة الفساد", "Anti-Corruption"}
        };
        
        for (int i = 0; i < principesData.length; i++) {
            int number = Integer.parseInt(principesData[i][0]);
            Principe p = principeRepository.findByNumber(number).orElseGet(Principe::new);
            p.setNumber(Integer.parseInt(principesData[i][0]));
            p.setNameFr(principesData[i][1]);
            p.setNameAr(principesData[i][2]);
            p.setNameEn(principesData[i][3]);
            p.setWeight(1.0f);
            p.setIsFixed(true);
            p.setIsActive(true);
            p.setOrder(i);
            principeRepository.save(p);
        }

        if (critereRepository.count() > 0) {
            log.info("Principles criteria already seeded, skipping");
            return;
        }

        seedCriteriaFromReferenceFile();
        log.info("Seeded {} principles with reference criteria", principesData.length);
    }

    private void seedCriteriaFromReferenceFile() {
        ClassPathResource resource = new ClassPathResource("seed/principes-criteria.json");

        try (InputStream inputStream = resource.getInputStream()) {
            List<PrincipeSeed> seeds = objectMapper.readValue(inputStream, new TypeReference<>() {});

            for (PrincipeSeed principeSeed : seeds) {
                Principe principe = principeRepository.findByNumber(principeSeed.number())
                    .orElseThrow(() -> new RuntimeException("Principe not found: " + principeSeed.number()));

                for (BonnePratiqueSeed bpSeed : principeSeed.bonnesPratiques()) {
                    BonnePratique bonnePratique = new BonnePratique();
                    bonnePratique.setNumber(bpSeed.number());
                    bonnePratique.setLabelFr(bpSeed.labelFr());
                    bonnePratique.setPrincipe(principe);
                    BonnePratique savedBonnePratique = bonnePratiqueRepository.save(bonnePratique);

                    for (CritereSeed critereSeed : bpSeed.criteres()) {
                        Critere critere = new Critere();
                        critere.setNumber(critereSeed.number());
                        critere.setLabelFr(critereSeed.labelFr());
                        critere.setPreuvesFr(critereSeed.preuvesFr());
                        critere.setReferencesFr(critereSeed.referencesFr());
                        critere.setBonnePratique(savedBonnePratique);
                        critereRepository.save(critere);
                    }
                }
            }
        } catch (IOException e) {
            throw new RuntimeException("Unable to seed principles criteria from reference file", e);
        }
    }
    
    @Transactional(readOnly = true)
    public List<PrincipeResponse> getAllPrincipes() {
        List<Principe> principes = principeRepository.findAllActiveWithBonnesPratiques();
        principes.forEach(this::initializeCriteres);
        return principes.stream().map(this::mapToResponse).toList();
    }
    
    @Transactional(readOnly = true)
    public PrincipeResponse getPrincipeById(UUID id) {
        Principe principe = principeRepository.findByIdWithBonnesPratiques(id)
            .orElseThrow(() -> new RuntimeException("Principe not found"));
        initializeCriteres(principe);
        return mapToResponse(principe);
    }
    
    public Principe getPrincipeByNumber(int number) {
        return principeRepository.findByNumber(number)
            .orElseThrow(() -> new RuntimeException("Principe not found"));
    }
    
    @Transactional
    public Principe createPrincipe(String nameFr, String nameAr, String nameEn, Float weight) {
        long count = principeRepository.count();
        Principe p = new Principe();
        p.setNumber((int) (count + 1));
        p.setNameFr(nameFr);
        p.setNameAr(nameAr);
        p.setNameEn(nameEn);
        p.setWeight(weight != null ? weight : 1.0f);
        p.setIsFixed(false);
        p.setIsActive(true);
        p.setOrder((int) count);
        return principeRepository.save(p);
    }
    
    @Transactional
    public void deletePrincipe(UUID id) {
        Principe p = principeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Principe not found"));
        if (Boolean.TRUE.equals(p.getIsFixed())) {
            throw new RuntimeException("Cannot delete fixed principle");
        }
        principeRepository.delete(p);
    }
    
    public long countCriteresByPrincipe(UUID principeId) {
        return critereRepository.countByPrincipeId(principeId);
    }
    
    public long countAllCriteres() {
        return critereRepository.count();
    }

    private void initializeCriteres(Principe principe) {
        principe.getBonnesPratiques().forEach(bp -> bp.getCriteres().size());
    }

    private PrincipeResponse mapToResponse(Principe principe) {
        PrincipeResponse response = new PrincipeResponse();
        response.setId(principe.getId());
        response.setNumber(principe.getNumber());
        response.setNameFr(principe.getNameFr());
        response.setNameAr(principe.getNameAr());
        response.setNameEn(principe.getNameEn());
        response.setDescriptionFr(principe.getDescriptionFr());
        response.setDescriptionAr(principe.getDescriptionAr());
        response.setDescriptionEn(principe.getDescriptionEn());
        response.setWeight(principe.getWeight());
        response.setIsFixed(principe.getIsFixed());
        response.setIsActive(principe.getIsActive());
        response.setOrder(principe.getOrder());
        response.setCreatedAt(principe.getCreatedAt());
        response.setBonnesPratiques(principe.getBonnesPratiques().stream()
            .map(this::mapBonnePratiqueToResponse)
            .toList());
        return response;
    }

    private BonnePratiqueResponse mapBonnePratiqueToResponse(BonnePratique bonnePratique) {
        BonnePratiqueResponse response = new BonnePratiqueResponse();
        response.setId(bonnePratique.getId());
        response.setNumber(bonnePratique.getNumber());
        response.setLabelFr(bonnePratique.getLabelFr());
        response.setLabelAr(bonnePratique.getLabelAr());
        response.setLabelEn(bonnePratique.getLabelEn());
        response.setPrincipeId(bonnePratique.getPrincipe().getId());
        response.setCriteres(bonnePratique.getCriteres().stream()
            .map(this::mapCritereToResponse)
            .toList());
        return response;
    }

    private CritereResponse mapCritereToResponse(Critere critere) {
        CritereResponse response = new CritereResponse();
        response.setId(critere.getId());
        response.setNumber(critere.getNumber());
        response.setLabelFr(critere.getLabelFr());
        response.setLabelAr(critere.getLabelAr());
        response.setLabelEn(critere.getLabelEn());
        response.setPreuvesFr(critere.getPreuvesFr());
        response.setPreuvesAr(critere.getPreuvesAr());
        response.setPreuvesEn(critere.getPreuvesEn());
        response.setReferencesFr(critere.getReferencesFr());
        response.setReferencesAr(critere.getReferencesAr());
        response.setReferencesEn(critere.getReferencesEn());
        response.setBonnePratiqueId(critere.getBonnePratique().getId());
        return response;
    }

    private record PrincipeSeed(
        Integer number,
        String sheetName,
        List<BonnePratiqueSeed> bonnesPratiques
    ) {}

    private record BonnePratiqueSeed(
        Integer number,
        String labelFr,
        List<CritereSeed> criteres
    ) {}

    private record CritereSeed(
        Integer number,
        String labelFr,
        String preuvesFr,
        String referencesFr
    ) {}
}
