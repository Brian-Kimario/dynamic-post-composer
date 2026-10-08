package com.brian.postcomposer;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.brian.postcomposer.model.Role;
import com.brian.postcomposer.security.AppUserDetails;
import com.brian.postcomposer.security.JwtService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.util.Date;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Experiment 2.3.1: JWT authentication, protected endpoints, and @PreAuthorize role rules, against the seeded demo users. */
@SpringBootTest
@AutoConfigureMockMvc
class SecurityApiTest {
    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @Autowired com.brian.postcomposer.repository.AppUserRepository userRepo;
    @Autowired org.springframework.security.crypto.password.PasswordEncoder encoder;
    final String demoPassword = java.util.UUID.randomUUID().toString();

    @org.junit.jupiter.api.BeforeEach
    void seedUsers() {
        // Per-run random password: no credential literal lives in the repository.
        for (var u : new Object[][] {{"ava@dpc.dev", com.brian.postcomposer.model.Role.ADMIN}, {"noah@dpc.dev", com.brian.postcomposer.model.Role.EDITOR}, {"priya@dpc.dev", com.brian.postcomposer.model.Role.VIEWER}}) {
            var existing = userRepo.findByEmail((String) u[0]);
            existing.ifPresent(userRepo::delete);
            userRepo.saveAndFlush(new com.brian.postcomposer.model.AppUser((String) u[0], "Test", encoder.encode(demoPassword), (com.brian.postcomposer.model.Role) u[1]));
        }
    }

    private String login(String email, String password) throws Exception {
        String body = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return com.jayway.jsonpath.JsonPath.read(body, "$.data.accessToken");
    }

    /** The service's own signing key, read reflectively so the test works with a random per-run key. */
    private byte[] keyBytes() throws Exception {
        var f = JwtService.class.getDeclaredField("key");
        f.setAccessible(true);
        return ((javax.crypto.SecretKey) f.get(jwt)).getEncoded();
    }

    private static String bearer(String token) { return "Bearer " + token; }

    private static final String POST_JSON = "{\"content\":\"hi\",\"platformId\":\"x\",\"authorName\":\"A\"}";

    @Test
    void protectedEndpointsRejectAnonymousRequestsWithJsonEnvelope() throws Exception {
        mvc.perform(get("/api/v1/posts"))
            .andExpect(status().isUnauthorized())
            .andExpect(header().string("WWW-Authenticate", "Bearer"))
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    @Test
    void loginReturnsShortLivedBearerTokenAndRejectsBadCredentialsUniformly() throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"ava@dpc.dev\",\"password\":\"" + demoPassword + "\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
            .andExpect(jsonPath("$.data.expiresInSeconds").value(900))
            .andExpect(jsonPath("$.data.user.role").value("ADMIN"))
            .andExpect(jsonPath("$.data.user.passwordHash").doesNotExist());

        // Wrong password and unknown email must be indistinguishable (no user enumeration).
        for (String email : new String[] {"ava@dpc.dev", "nobody@dpc.dev"}) {
            mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"" + email + "\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
        }
    }

    @Test
    void validTokenOpensProtectedEndpointAndMeReturnsTheCaller() throws Exception {
        String token = login("priya@dpc.dev", demoPassword);
        mvc.perform(get("/api/v1/posts").header("Authorization", bearer(token))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/auth/me").header("Authorization", bearer(token)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.email").value("priya@dpc.dev"));
    }

    @Test
    void tamperedExpiredAndForeignTokensAreRejected() throws Exception {
        String good = login("ava@dpc.dev", demoPassword);
        String tampered = good.substring(0, good.length() - 3) + (good.endsWith("aaa") ? "bbb" : "aaa");
        mvc.perform(get("/api/v1/posts").header("Authorization", bearer(tampered)))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Invalid access token"));

        var key = Keys.hmacShaKeyFor(keyBytes());
        String expired = Jwts.builder().issuer("post-composer-api").subject(UUID.randomUUID().toString())
            .claim("email", "ava@dpc.dev").claim("role", "ADMIN")
            .issuedAt(new Date(System.currentTimeMillis() - 120_000)).expiration(new Date(System.currentTimeMillis() - 60_000))
            .signWith(key).compact();
        mvc.perform(get("/api/v1/posts").header("Authorization", bearer(expired)))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Access token expired"));

        String wrongKey = Jwts.builder().issuer("post-composer-api").subject(UUID.randomUUID().toString())
            .claim("email", "ava@dpc.dev").claim("role", "ADMIN").expiration(new Date(System.currentTimeMillis() + 60_000))
            .signWith(Keys.hmacShaKeyFor("a-completely-different-32-byte-key!!".getBytes())).compact();
        mvc.perform(get("/api/v1/posts").header("Authorization", bearer(wrongKey))).andExpect(status().isUnauthorized());

        String unsigned = Jwts.builder().issuer("post-composer-api").subject(UUID.randomUUID().toString())
            .claim("role", "ADMIN").compact();
        mvc.perform(get("/api/v1/posts").header("Authorization", bearer(unsigned))).andExpect(status().isUnauthorized());
    }

    @Test
    void roleMatrixIsEnforcedByPreAuthorize() throws Exception {
        String admin = login("ava@dpc.dev", demoPassword);
        String editor = login("noah@dpc.dev", demoPassword);
        String viewer = login("priya@dpc.dev", demoPassword);

        // VIEWER: read-only. 403 (not 401) because the caller IS authenticated.
        mvc.perform(post("/api/v1/posts").header("Authorization", bearer(viewer)).contentType(MediaType.APPLICATION_JSON).content(POST_JSON))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.message").value(containsString("permission")));
        mvc.perform(get("/api/v1/stats").header("Authorization", bearer(viewer))).andExpect(status().isForbidden());

        // EDITOR: can write and read analytics, cannot delete posts.
        String id = com.jayway.jsonpath.JsonPath.read(
            mvc.perform(post("/api/v1/posts").header("Authorization", bearer(editor)).contentType(MediaType.APPLICATION_JSON).content(POST_JSON))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.data.id");
        mvc.perform(get("/api/v1/stats").header("Authorization", bearer(editor))).andExpect(status().isOk());
        mvc.perform(delete("/api/v1/posts/" + id).header("Authorization", bearer(editor))).andExpect(status().isForbidden());

        // ADMIN: everything.
        mvc.perform(delete("/api/v1/posts/" + id).header("Authorization", bearer(admin))).andExpect(status().isOk());
    }

    @Test
    void preflightIsNotBlockedBySecurity() throws Exception {
        mvc.perform(options("/api/v1/posts").header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "GET").header("Access-Control-Request-Headers", "authorization"))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }
}
