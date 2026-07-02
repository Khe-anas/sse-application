package com.sse.security;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.sse.entity.User;
import com.sse.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.UUID;

@Data
@AllArgsConstructor
public class UserPrincipal implements UserDetails {
    
    private UUID id;
    private String email;
    private String firstName;
    private String lastName;
    private Role role;
    
    @JsonIgnore
    private String password;
    
    private Collection<? extends GrantedAuthority> authorities;
    
    public static UserPrincipal create(User user) {
        return new UserPrincipal(
            user.getId(),
            user.getEmail(),
            user.getFirstName(),
            user.getLastName(),
            user.getRole(),
            user.getPassword(),
            Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
    
    @Override
    public String getUsername() {
        return email;
    }
    
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }
    
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }
    
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
    
    @Override
    public boolean isEnabled() {
        return true;
    }
}
