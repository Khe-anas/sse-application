package com.sse.security;

import com.sse.entity.User;
import com.sse.enums.UserStatus;
import com.sse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
    
    private final UserRepository userRepository;
    
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
        
        UserStatus status = user.getStatus() != null
            ? user.getStatus()
            : (Boolean.TRUE.equals(user.getIsActive()) ? UserStatus.ACTIVE : UserStatus.DISABLED);

        if (!Boolean.TRUE.equals(user.getIsActive()) || status != UserStatus.ACTIVE || user.getPassword() == null) {
            throw new UsernameNotFoundException("User account is disabled");
        }
        
        return new org.springframework.security.core.userdetails.User(
            user.getEmail(),
            user.getPassword(),
            Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}
