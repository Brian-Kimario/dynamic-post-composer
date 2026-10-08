package com.brian.postcomposer.security;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Reads {@code Authorization: Bearer <jwt>}. A valid token populates the SecurityContext; a bad one is NOT rejected
 * here, it just leaves the request unauthenticated so the entry point answers 401 in the one standard shape (the
 * reason is passed along as a request attribute). The token itself is never logged.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    static final String ERROR_ATTRIBUTE = "auth.error";
    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private final JwtService jwt;

    public JwtAuthenticationFilter(JwtService jwt) { this.jwt = jwt; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            try {
                AuthenticatedUser user = jwt.verify(header.substring(7).trim());
                var auth = new UsernamePasswordAuthenticationToken(user, null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + user.role().name())));
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (ExpiredJwtException e) {
                request.setAttribute(ERROR_ATTRIBUTE, "Access token expired");
            } catch (JwtException | IllegalArgumentException e) {
                log.warn("Rejected invalid access token: {}", e.getClass().getSimpleName());
                request.setAttribute(ERROR_ATTRIBUTE, "Invalid access token");
            }
        }
        chain.doFilter(request, response);
    }
}
