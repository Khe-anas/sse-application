package com.sse.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

@Slf4j
@Component
public class JwtUtil {
    
    @Value("${jwt.secret}")
    private String secret;
    
    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;
    
    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;
    
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
    
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }
    
    public UUID extractUserId(String token) {
        Claims claims = extractAllClaims(token);
        return UUID.fromString(claims.get("userId", String.class));
    }
    
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
    
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }
    
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
    
    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
    
    public String generateAccessToken(UUID userId, String email, String role, int tokenVersion) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId.toString());
        claims.put("role", role);
        claims.put("type", "access");
        claims.put("tokenVersion", tokenVersion);
        return createToken(claims, email, accessTokenExpiration);
    }
    
    public String generateRefreshToken(UUID userId, String email, int tokenVersion) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId.toString());
        claims.put("type", "refresh");
        claims.put("tokenVersion", tokenVersion);
        return createToken(claims, email, refreshTokenExpiration);
    }

    public int extractTokenVersion(String token) {
        Claims claims = extractAllClaims(token);
        return claims.get("tokenVersion", Integer.class);
    }
    
    private String createToken(Map<String, Object> claims, String subject, long expiration) {
        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey())
                .compact();
    }
    
    public Boolean validateToken(String token, UserDetails userDetails) {
        final Claims claims = extractAllClaims(token);
        final String username = claims.getSubject();
        return username.equals(userDetails.getUsername())
            && !claims.getExpiration().before(new Date())
            && "access".equals(claims.get("type"));
    }
    
    public Boolean isRefreshToken(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return "refresh".equals(claims.get("type"));
        } catch (Exception e) {
            return false;
        }
    }
    
    public long getAccessTokenExpiration() {
        return accessTokenExpiration;
    }
}
