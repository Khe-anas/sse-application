package com.sse.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;

@Entity
@Table(name = "criteres")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Critere {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false)
    private Integer number;
    
    @Column(nullable = false, length = 2000)
    private String labelFr;
    
    @Column(length = 2000)
    private String labelAr;
    
    @Column(length = 2000)
    private String labelEn;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bonne_pratique_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private BonnePratique bonnePratique;

    @OneToMany(mappedBy = "critere", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Preuve> preuves = new ArrayList<>();

    @OneToMany(mappedBy = "critere", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<ReferenceSse> references = new ArrayList<>();
    
    @OneToMany(mappedBy = "critere", cascade = CascadeType.ALL)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Reponse> reponses = new ArrayList<>();

    public String getPreuvesFr() {
        return joinPreuves(Preuve::getTexteFr);
    }

    public void setPreuvesFr(String value) {
        setPreuveText(value, Preuve::setTexteFr);
    }

    public String getPreuvesAr() {
        return joinPreuves(Preuve::getTexteAr);
    }

    public void setPreuvesAr(String value) {
        setPreuveText(value, Preuve::setTexteAr);
    }

    public String getPreuvesEn() {
        return joinPreuves(Preuve::getTexteEn);
    }

    public void setPreuvesEn(String value) {
        setPreuveText(value, Preuve::setTexteEn);
    }

    public String getReferencesFr() {
        return joinReferences(ReferenceSse::getTexteFr);
    }

    public void setReferencesFr(String value) {
        setReferenceText(value, ReferenceSse::setTexteFr);
    }

    public String getReferencesAr() {
        return joinReferences(ReferenceSse::getTexteAr);
    }

    public void setReferencesAr(String value) {
        setReferenceText(value, ReferenceSse::setTexteAr);
    }

    public String getReferencesEn() {
        return joinReferences(ReferenceSse::getTexteEn);
    }

    public void setReferencesEn(String value) {
        setReferenceText(value, ReferenceSse::setTexteEn);
    }

    private String joinPreuves(Function<Preuve, String> extractor) {
        return joinTexts(preuves.stream().map(extractor).toList());
    }

    private String joinReferences(Function<ReferenceSse, String> extractor) {
        return joinTexts(references.stream().map(extractor).toList());
    }

    private String joinTexts(List<String> values) {
        String joined = values.stream()
            .filter(value -> value != null && !value.isBlank())
            .map(String::trim)
            .reduce((left, right) -> left + "\n" + right)
            .orElse(null);
        return joined == null || joined.isBlank() ? null : joined;
    }

    private void setPreuveText(String value, java.util.function.BiConsumer<Preuve, String> setter) {
        if ((value == null || value.isBlank()) && preuves.isEmpty()) {
            return;
        }
        setter.accept(primaryPreuve(), normalize(value));
    }

    private void setReferenceText(String value, java.util.function.BiConsumer<ReferenceSse, String> setter) {
        if ((value == null || value.isBlank()) && references.isEmpty()) {
            return;
        }
        setter.accept(primaryReference(), normalize(value));
    }

    private Preuve primaryPreuve() {
        if (preuves.isEmpty()) {
            Preuve preuve = new Preuve();
            preuve.setCritere(this);
            preuve.setDisplayOrder(0);
            preuves.add(preuve);
        }
        return preuves.get(0);
    }

    private ReferenceSse primaryReference() {
        if (references.isEmpty()) {
            ReferenceSse reference = new ReferenceSse();
            reference.setCritere(this);
            reference.setDisplayOrder(0);
            references.add(reference);
        }
        return references.get(0);
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
