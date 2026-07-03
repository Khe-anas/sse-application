package com.sse.service;

import com.sse.entity.Organisme;
import com.sse.entity.User;
import com.sse.enums.Role;
import com.sse.enums.TypeOrganisme;
import com.sse.repository.OrganismeRepository;
import com.sse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DemoDataService {

    private static final String DEMO_PASSWORD = "password";

    private final OrganismeRepository organismeRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void seedDemoData() {
        Organisme organisme = organismeRepository.findAll().stream()
            .filter(org -> "Organisme de démonstration".equals(org.getName()))
            .findFirst()
            .orElseGet(this::createDemoOrganisme);

        createUserIfMissing("super@sse.tn", "Super", "Admin", Role.SUPER_ADMIN, null);
        createUserIfMissing("admin@sse.tn", "Admin", "SSE", Role.ADMIN, null);
        createUserIfMissing("resp@sse.tn", "Responsable", "SSE", Role.RESPONSABLE, organisme);
        createUserIfMissing("gouv@sse.tn", "Gouvernement", "SSE", Role.GOUVERNEMENT, null);
    }

    private Organisme createDemoOrganisme() {
        Organisme organisme = new Organisme();
        organisme.setName("Organisme de démonstration");
        organisme.setType(TypeOrganisme.PUBLIC);
        organisme.setSector("Administration publique");
        organisme.setEmail("contact@sse.tn");
        organisme.setIsActive(true);
        Organisme saved = organismeRepository.save(organisme);
        log.info("Seeded demo organisme: {}", saved.getName());
        return saved;
    }

    private void createUserIfMissing(String email, String firstName, String lastName, Role role, Organisme organisme) {
        if (userRepository.existsByEmail(email)) {
            return;
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(DEMO_PASSWORD));
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setRole(role);
        user.setOrganisme(organisme);
        user.setIsActive(true);
        userRepository.save(user);
        log.info("Seeded demo user: {}", email);
    }
}
