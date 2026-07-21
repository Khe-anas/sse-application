package com.sse.service;

import com.sse.entity.Organisme;
import com.sse.entity.User;
import com.sse.enums.Role;
import com.sse.enums.TypeOrganisme;
import com.sse.repository.OrganismeRepository;
import com.sse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DemoDataService {

    @Value("${sse.demo-data.password:password}")
    private String demoPassword;

    private final OrganismeRepository organismeRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void seedDemoData() {
        if (demoPassword == null || demoPassword.length() < 8) {
            throw new IllegalStateException("Demo password must contain at least 8 characters");
        }

        Organisme organisme = organismeRepository.findAll().stream()
            .filter(org -> "Organisme de démonstration".equals(org.getName()))
            .findFirst()
            .orElseGet(this::createDemoOrganisme);

        createUserIfMissing("admin@sse.tn", "Admin", "SSE", Role.ADMIN, null);
        createUserIfMissing("user@sse.tn", "User", "SSE", Role.USER, organisme);
        createUserIfMissing("evaluateur@sse.tn", "Evaluateure", "SSE", Role.EVALUATEUR, null);
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
        if (userRepository.existsByEmailIgnoreCase(email)) {
            return;
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(demoPassword));
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setRole(role);
        user.setOrganisme(organisme);
        user.setIsActive(true);
        userRepository.save(user);
        log.info("Seeded demo user: {}", email);
    }
}
