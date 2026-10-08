package com.brian.postcomposer.config;

import com.brian.postcomposer.model.AppUser;
import com.brian.postcomposer.model.Role;
import com.brian.postcomposer.repository.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** The three accounts the UI's login screen already lists, so the API and UI can be demoed together. Dev/demo only. */
@Component
@ConditionalOnProperty(name = "app.security.seed-demo-users", havingValue = "true")
public class DemoUserSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoUserSeeder.class);
    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final String password;

    public DemoUserSeeder(AppUserRepository users, PasswordEncoder encoder, @Value("${app.security.demo-password}") String password) {
        this.users = users;
        this.encoder = encoder;
        this.password = password == null || password.isBlank() ? randomPassword() : password;
    }

    private static String randomPassword() {
        byte[] b = new byte[12];
        new java.security.SecureRandom().nextBytes(b);
        String generated = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(b);
        log.warn("DEMO_PASSWORD not set: demo accounts get the generated password {} (dev only)", generated);
        return generated;
    }

    @Override
    public void run(ApplicationArguments args) {
        seed("ava@dpc.dev", "Ava Mitchell", Role.ADMIN);
        seed("noah@dpc.dev", "Noah Reyes", Role.EDITOR);
        seed("priya@dpc.dev", "Priya Shah", Role.VIEWER);
    }

    private void seed(String email, String name, Role role) {
        if (users.findByEmail(email).isEmpty()) {
            users.save(new AppUser(email, name, encoder.encode(password), role));
            log.info("Seeded demo {} account {}", role, email);
        }
    }
}
