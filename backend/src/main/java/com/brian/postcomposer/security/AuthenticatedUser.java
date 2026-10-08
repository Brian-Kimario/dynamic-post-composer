package com.brian.postcomposer.security;

import com.brian.postcomposer.model.Role;
import java.util.UUID;

/** The principal placed in the SecurityContext for a request carrying a valid access token. */
public record AuthenticatedUser(UUID id, String email, Role role) {}
