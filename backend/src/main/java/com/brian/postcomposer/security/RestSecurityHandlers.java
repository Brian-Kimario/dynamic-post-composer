package com.brian.postcomposer.security;

import com.brian.postcomposer.dto.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/** Security failures happen in the filter chain, before controllers, so they need their own JSON writers (same envelope). */
@Component
public class RestSecurityHandlers implements AuthenticationEntryPoint, AccessDeniedHandler {
    private static final Logger log = LoggerFactory.getLogger(RestSecurityHandlers.class);
    private final ObjectMapper mapper;

    public RestSecurityHandlers(ObjectMapper mapper) { this.mapper = mapper; }

    @Override
    public void commence(HttpServletRequest req, HttpServletResponse res, AuthenticationException ex) throws IOException {
        Object reason = req.getAttribute(JwtAuthenticationFilter.ERROR_ATTRIBUTE);
        write(res, HttpStatus.UNAUTHORIZED, reason != null ? reason.toString() : "Authentication required");
        res.setHeader("WWW-Authenticate", "Bearer");
    }

    @Override
    public void handle(HttpServletRequest req, HttpServletResponse res, AccessDeniedException ex) throws IOException {
        write(res, HttpStatus.FORBIDDEN, "You do not have permission to perform this action");
    }

    private void write(HttpServletResponse res, HttpStatus status, String message) throws IOException {
        log.warn("Request failed with {}: {}", status.value(), message);
        res.setStatus(status.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(res.getWriter(), ApiResponse.failure(message, null));
    }
}
