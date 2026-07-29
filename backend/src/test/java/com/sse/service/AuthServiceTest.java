package com.sse.service;

import com.sse.entity.User;
import com.sse.enums.Role;
import com.sse.repository.UserRepository;
import com.sse.security.JwtUtil;
import com.sse.security.PermissionAccessService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AccountActivationService accountActivationService;

    @Mock
    private PermissionAccessService permissionAccessService;

    @InjectMocks
    private AuthService authService;

    @Test
    void logoutInvalidatesExistingTokens() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setTokenVersion(4);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        authService.logout(userId);

        assertThat(user.getTokenVersion()).isEqualTo(5);
        verify(userRepository).save(user);
    }

    @Test
    void userResponseIncludesGrade() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("engineer@sse.tn");
        user.setFirstName("Amira");
        user.setLastName("Ben Salah");
        user.setRole(Role.USER);
        user.setGrade("Ingénieur principal");
        user.setIsActive(true);

        assertThat(authService.mapToUserResponse(user).getGrade())
            .isEqualTo("Ingénieur principal");
    }
}
