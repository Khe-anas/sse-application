package com.sse.service;

import com.sse.entity.Secteur;
import com.sse.entity.TypeOrganismeDefinition;
import com.sse.repository.OrganismeRepository;
import com.sse.repository.SecteurRepository;
import com.sse.repository.TypeOrganismeDefinitionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminCatalogueServiceTest {

    @Mock
    private TypeOrganismeDefinitionRepository typeRepository;

    @Mock
    private SecteurRepository secteurRepository;

    @Mock
    private OrganismeRepository organismeRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private AdminCatalogueService service;

    @Test
    void deletesAnUnusedCustomOrganisationType() {
        UUID id = UUID.randomUUID();
        TypeOrganismeDefinition type = new TypeOrganismeDefinition();
        type.setId(id);
        type.setCode("ASSOCIATION");
        type.setSystemType(false);
        when(typeRepository.findById(id)).thenReturn(Optional.of(type));
        when(organismeRepository.countByTypeDefinitionId(id)).thenReturn(0L);

        service.deleteType(id);

        verify(typeRepository).delete(type);
        verify(auditLogService).log("DELETE", "ORGANISME_TYPE", "Deleted organisation type ASSOCIATION");
    }

    @Test
    void protectsSystemOrganisationTypes() {
        UUID id = UUID.randomUUID();
        TypeOrganismeDefinition type = new TypeOrganismeDefinition();
        type.setId(id);
        type.setSystemType(true);
        when(typeRepository.findById(id)).thenReturn(Optional.of(type));

        assertThatThrownBy(() -> service.deleteType(id))
            .hasMessage("Un type d'organisme système ne peut pas être supprimé");

        verify(typeRepository, never()).delete(type);
    }

    @Test
    void refusesToDeleteAnOrganisationTypeInUse() {
        UUID id = UUID.randomUUID();
        TypeOrganismeDefinition type = new TypeOrganismeDefinition();
        type.setId(id);
        type.setSystemType(false);
        when(typeRepository.findById(id)).thenReturn(Optional.of(type));
        when(organismeRepository.countByTypeDefinitionId(id)).thenReturn(2L);

        assertThatThrownBy(() -> service.deleteType(id))
            .hasMessage("Ce type est encore utilisé par un ou plusieurs organismes");

        verify(typeRepository, never()).delete(type);
    }

    @Test
    void refusesToDeleteASectorInUse() {
        UUID id = UUID.randomUUID();
        Secteur secteur = new Secteur();
        secteur.setId(id);
        secteur.setCode("FINANCE");
        when(secteurRepository.findById(id)).thenReturn(Optional.of(secteur));
        when(organismeRepository.countBySector("FINANCE")).thenReturn(1L);

        assertThatThrownBy(() -> service.deleteSector(id))
            .hasMessage("Ce secteur est encore utilisé par un ou plusieurs organismes");

        verify(secteurRepository, never()).delete(secteur);
    }
}
