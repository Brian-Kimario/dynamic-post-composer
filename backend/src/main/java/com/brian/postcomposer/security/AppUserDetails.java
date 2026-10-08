package com.brian.postcomposer.security;

import com.brian.postcomposer.model.AppUser;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/** Adapts {@link AppUser} to Spring Security. The role becomes the authority {@code ROLE_<name>} that hasRole() checks. */
public record AppUserDetails(UUID id, String email, String displayName, String passwordHash,
                             com.brian.postcomposer.model.Role role, boolean enabled) implements UserDetails {
    public static AppUserDetails of(AppUser u) {
        return new AppUserDetails(u.getId(), u.getEmail(), u.getDisplayName(), u.getPasswordHash(), u.getRole(), u.isEnabled());
    }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
    @Override public String getPassword() { return passwordHash; }
    @Override public String getUsername() { return email; }
    @Override public boolean isEnabled() { return enabled; }
}
