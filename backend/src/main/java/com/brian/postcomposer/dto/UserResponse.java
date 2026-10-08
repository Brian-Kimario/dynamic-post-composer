package com.brian.postcomposer.dto;

import com.brian.postcomposer.model.Role;
import com.brian.postcomposer.security.AppUserDetails;
import java.util.UUID;

public record UserResponse(UUID id, String email, String displayName, Role role) {
    public static UserResponse from(AppUserDetails u) { return new UserResponse(u.id(), u.email(), u.displayName(), u.role()); }
}
