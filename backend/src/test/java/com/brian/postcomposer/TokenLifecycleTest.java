package com.brian.postcomposer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.brian.postcomposer.crypto.AesGcmEncryptor;
import com.brian.postcomposer.model.AppUser;
import com.brian.postcomposer.repository.AppUserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/** Experiment 2.3.2: AES-GCM at rest, encrypted OAuth credentials, access/refresh strategy, rotation and reuse detection. */
@SpringBootTest
@AutoConfigureMockMvc
class TokenLifecycleTest {
    @Autowired MockMvc mvc;
    @Autowired AesGcmEncryptor aes;
    @Autowired JdbcTemplate jdbc;
    @Autowired AppUserRepository users;
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

    private MvcResult login(String email) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + email + "\",\"password\":\"" + demoPassword + "\"}")).andExpect(status().isOk()).andReturn();
    }

    private static String cookieValue(MvcResult r) {
        String header = r.getResponse().getHeader("Set-Cookie");
        assertThat(header).isNotNull();
        return header.split(";")[0].split("=", 2)[1];
    }

    private static String accessToken(MvcResult r) throws Exception {
        return com.jayway.jsonpath.JsonPath.read(r.getResponse().getContentAsString(), "$.data.accessToken");
    }

    private MvcResult refresh(String cookie) throws Exception {
        return mvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie("refresh_token", cookie))).andReturn();
    }

    // ---- AES-GCM primitive ----

    @Test
    void aesGcmRoundTripsUsesFreshIvAndDetectsTampering() {
        String secret = "ya29.a0-super-secret-oauth-token";
        String a = aes.encrypt(secret), b = aes.encrypt(secret);
        assertThat(a).isNotEqualTo(b).doesNotContain("ya29");     // random IV: same plaintext, different ciphertext
        assertThat(aes.decrypt(a)).isEqualTo(secret);

        char[] chars = a.toCharArray();
        chars[chars.length - 4] = chars[chars.length - 4] == 'A' ? 'B' : 'A';
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> aes.decrypt(new String(chars)));
    }

    // ---- Refresh cookie + rotation ----

    @Test
    void loginSetsHardenedHttpOnlyRefreshCookieAndNeverPutsItInTheBody() throws Exception {
        MvcResult r = login("noah@dpc.dev");
        String header = r.getResponse().getHeader("Set-Cookie");
        assertThat(header).contains("HttpOnly").contains("SameSite=Strict").contains("Path=/api/v1/auth");
        assertThat(r.getResponse().getContentAsString()).doesNotContain(cookieValue(r)).doesNotContain("refreshToken");
    }

    @Test
    void refreshRotatesTokenAndIssuesWorkingAccessToken() throws Exception {
        MvcResult first = login("noah@dpc.dev");
        String oldCookie = cookieValue(first);

        MvcResult rotated = refresh(oldCookie);
        assertThat(rotated.getResponse().getStatus()).isEqualTo(200);
        String newCookie = cookieValue(rotated);
        assertThat(newCookie).isNotEqualTo(oldCookie);

        mvc.perform(get("/api/v1/posts").header("Authorization", "Bearer " + accessToken(rotated))).andExpect(status().isOk());
    }

    @Test
    void replayingAUsedRefreshTokenRevokesTheWholeFamily() throws Exception {
        String t1 = cookieValue(login("noah@dpc.dev"));
        String t2 = cookieValue(refresh(t1));              // legitimate rotation: t1 is now spent

        MvcResult replay = refresh(t1);                    // attacker (or stale tab) replays t1
        assertThat(replay.getResponse().getStatus()).isEqualTo(401);

        // Reuse detection killed the family, so even the newest token t2 no longer works.
        assertThat(refresh(t2).getResponse().getStatus()).isEqualTo(401);
    }

    @Test
    void logoutRevokesRefreshTokenAndClearsCookie() throws Exception {
        String t1 = cookieValue(login("ava@dpc.dev"));
        mvc.perform(post("/api/v1/auth/logout").cookie(new Cookie("refresh_token", t1)))
            .andExpect(status().isOk()).andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));
        assertThat(refresh(t1).getResponse().getStatus()).isEqualTo(401);
    }

    @Test
    void refreshWithoutOrWithGarbageTokenIsUnauthorized() throws Exception {
        mvc.perform(post("/api/v1/auth/refresh")).andExpect(status().isUnauthorized());
        assertThat(refresh("not-a-real-token").getResponse().getStatus()).isEqualTo(401);
    }

    @Test
    void refreshTokensAreStoredOnlyAsHashes() throws Exception {
        String raw = cookieValue(login("priya@dpc.dev"));
        Integer plain = jdbc.queryForObject("select count(*) from refresh_tokens where token_hash = ?", Integer.class, raw);
        assertThat(plain).isZero();
    }

    // ---- Encrypted OAuth credentials ----

    @Test
    void oauthTokensAreCiphertextInTheDatabaseAndNeverReturnedByTheApi() throws Exception {
        String access = accessToken(login("noah@dpc.dev"));
        String body = "{\"accessToken\":\"ya29.PLAINTEXT-ACCESS\",\"refreshToken\":\"1//PLAINTEXT-REFRESH\",\"scopes\":\"tweet.write\"}";

        mvc.perform(put("/api/v1/credentials/x").header("Authorization", "Bearer " + access)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.provider").value("x"))
            .andExpect(jsonPath("$.data.hasRefreshToken").value(true))
            .andExpect(jsonPath("$.data.accessToken").doesNotExist());

        String stored = jdbc.queryForObject("select access_token from oauth_credentials where provider = 'x'", String.class);
        assertThat(stored).doesNotContain("PLAINTEXT").isNotBlank();
        assertThat(aes.decrypt(stored)).isEqualTo("ya29.PLAINTEXT-ACCESS");   // proves the converter really encrypted it

        mvc.perform(get("/api/v1/credentials").header("Authorization", "Bearer " + access))
            .andExpect(status().isOk()).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("PLAINTEXT"))));

        mvc.perform(delete("/api/v1/credentials/x").header("Authorization", "Bearer " + access)).andExpect(status().isOk());
    }

    @Test
    void credentialsAreRoleRestrictedAndOwnerScoped() throws Exception {
        String viewer = accessToken(login("priya@dpc.dev"));
        mvc.perform(get("/api/v1/credentials").header("Authorization", "Bearer " + viewer)).andExpect(status().isForbidden());

        String body = "{\"accessToken\":\"secret-1\"}";
        String editor = accessToken(login("noah@dpc.dev")), admin = accessToken(login("ava@dpc.dev"));
        mvc.perform(put("/api/v1/credentials/linkedin").header("Authorization", "Bearer " + editor)
            .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());

        // The admin sees none of the editor's connections and cannot delete them.
        mvc.perform(get("/api/v1/credentials").header("Authorization", "Bearer " + admin))
            .andExpect(jsonPath("$.data[?(@.provider=='linkedin')]").isEmpty());
        mvc.perform(delete("/api/v1/credentials/linkedin").header("Authorization", "Bearer " + admin)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/credentials/linkedin").header("Authorization", "Bearer " + editor)).andExpect(status().isOk());
    }
}
