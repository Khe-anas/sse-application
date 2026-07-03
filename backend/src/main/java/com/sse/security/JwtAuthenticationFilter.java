package com.sse.security;

import com.sse.entity.User;
import com.sse.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;
    private final UserRepository userRepository;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) throws ServletException, IOException {
        String jwt = getJwtFromRequest(request);

        if (!StringUtils.hasText(jwt)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                authenticateLocalJwt(jwt, request);
            }
        } catch (Exception ex) {
            SecurityContextHolder.clearContext();
            log.warn("Invalid or expired JWT: {}", ex.getMessage());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"message\":\"" + ex.getMessage() + "\"}");
            return;
        }
        
        filterChain.doFilter(request, response);
    }

    private void authenticateLocalJwt(String jwt, HttpServletRequest request) {
        String email = jwtUtil.extractUsername(jwt);
        if (email == null) {
            throw new RuntimeException("Local JWT does not contain a subject");
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        if (!jwtUtil.validateToken(jwt, userDetails)) {
            throw new RuntimeException("Invalid local JWT");
        }

        UUID userId = jwtUtil.extractUserId(jwt);
        int tokenVersion = jwtUtil.extractTokenVersion(jwt);

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        if (!user.getTokenVersion().equals(tokenVersion)) {
            throw new RuntimeException("Session expired - another session has been opened");
        }

        UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities()
            );
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);

        request.setAttribute("userId", userId);
    }
    
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
