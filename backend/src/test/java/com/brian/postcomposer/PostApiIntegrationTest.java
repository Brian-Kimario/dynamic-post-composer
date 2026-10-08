package com.brian.postcomposer;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
@WithMockUser(roles = "ADMIN") // 2.3: every endpoint needs a signed-in user; these tests are about data, not auth
class PostApiIntegrationTest {
    private static final String ORIGIN = "http://localhost:5173";
    @Autowired MockMvc mvc;

    private static String body(String content, String platform, String extra) {
        return "{\"content\":\"" + content + "\",\"platformId\":\"" + platform + "\",\"authorName\":\"Brian\"" + extra + "}";
    }

    private ResultActions send(String json) throws Exception {
        return mvc.perform(post("/api/v1/posts").contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private String idOf(ResultActions result) throws Exception {
        String body = result.andReturn().getResponse().getContentAsString();
        return com.jayway.jsonpath.JsonPath.read(body, "$.data.id");
    }

    // ---- 2.1.1: CRUD, validation, envelope, CORS ----

    @Test
    void crudLifecycleUsesStandardEnvelope() throws Exception {
        ResultActions created = send(body("Hello world", "x", ""))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.message").value("Post created"))
            .andExpect(jsonPath("$.data.status").value("DRAFT"))
            .andExpect(jsonPath("$.timestamp").exists());
        String id = idOf(created);

        mvc.perform(get("/api/v1/posts/" + id)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content").value("Hello world"));

        mvc.perform(put("/api/v1/posts/" + id).contentType(MediaType.APPLICATION_JSON)
                .content(body("Now published", "x", ",\"status\":\"PUBLISHED\"")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("PUBLISHED"));

        mvc.perform(get("/api/v1/posts").param("status", "PUBLISHED")).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[?(@.id=='" + id + "')]").isNotEmpty());

        mvc.perform(delete("/api/v1/posts/" + id)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/posts/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void invalidBodyReturnsFieldErrors() throws Exception {
        send("{\"content\":\"\",\"platformId\":\"myspace\",\"authorName\":\"\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Validation failed"))
            .andExpect(jsonPath("$.data.content").value("Content is required"))
            .andExpect(jsonPath("$.data.platformId").exists())
            .andExpect(jsonPath("$.data.authorName").value("Author is required"));
    }

    @Test
    void contentOverPlatformLimitIsUnprocessable() throws Exception {
        send(body("a".repeat(281), "x", ""))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.message", containsString("1 characters over the x limit of 280")));
    }

    @Test
    void corsAllowsConfiguredOriginAndExposesCorrelationHeader() throws Exception {
        mvc.perform(options("/api/v1/posts").header("Origin", ORIGIN)
                .header("Access-Control-Request-Method", "PATCH"))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", ORIGIN));
        mvc.perform(get("/api/v1/posts").header("Origin", ORIGIN))
            .andExpect(header().string("Access-Control-Expose-Headers", containsString("X-Correlation-Id")));
        mvc.perform(get("/api/v1/posts").header("Origin", "http://evil.example"))
            .andExpect(status().isForbidden());
    }

    // ---- scheduling ----

    @Test
    void scheduleRescheduleUnschedule() throws Exception {
        Instant first = Instant.now().plus(2, ChronoUnit.DAYS);
        String json = body("Launch", "linkedin", ",\"scheduledFor\":\"" + first + "\"");
        String id = idOf(mvc.perform(post("/api/v1/schedule").contentType(MediaType.APPLICATION_JSON).content(json))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.data.status").value("SCHEDULED")));

        Instant moved = first.plus(1, ChronoUnit.DAYS);
        mvc.perform(patch("/api/v1/schedule/" + id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"scheduledFor\":\"" + moved + "\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.scheduledFor").value(moved.toString()));

        mvc.perform(delete("/api/v1/schedule/" + id)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/schedule/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void schedulingInThePastIsRejected() throws Exception {
        mvc.perform(post("/api/v1/schedule").contentType(MediaType.APPLICATION_JSON)
                .content(body("Late", "x", ",\"scheduledFor\":\"2020-01-01T00:00:00Z\"")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.data.scheduledFor").value("scheduledFor must be in the future"));
    }

    // ---- 2.1.2: global exception handling + correlation ids ----

    @Test
    void unknownPostIsNotFoundWithCorrelationId() throws Exception {
        mvc.perform(get("/api/v1/posts/00000000-0000-0000-0000-000000000000").header("X-Correlation-Id", "trace-123"))
            .andExpect(status().isNotFound())
            .andExpect(header().string("X-Correlation-Id", "trace-123"))
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.correlationId").value("trace-123"));
    }

    @Test
    void correlationIdIsGeneratedWhenAbsentOrUnsafe() throws Exception {
        mvc.perform(get("/api/v1/posts"))
            .andExpect(header().exists("X-Correlation-Id"))
            .andExpect(jsonPath("$.correlationId").exists());
        mvc.perform(get("/api/v1/posts").header("X-Correlation-Id", "bad id\twith spaces"))
            .andExpect(header().string("X-Correlation-Id", not(containsString(" "))));
    }

    @Test
    void malformedAndMistypedInputsAreHandledCentrally() throws Exception {
        send("{not json").andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Request body is missing or malformed"));
        mvc.perform(get("/api/v1/posts/not-a-uuid")).andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message", containsString("'id'")));
        mvc.perform(get("/api/v1/posts").param("status", "BOGUS")).andExpect(status().isBadRequest());
        mvc.perform(patch("/api/v1/posts/00000000-0000-0000-0000-000000000000")).andExpect(status().isMethodNotAllowed())
            .andExpect(jsonPath("$.success").value(false));
        mvc.perform(post("/api/v1/posts").contentType(MediaType.TEXT_PLAIN).content("x"))
            .andExpect(status().isUnsupportedMediaType());
        mvc.perform(get("/api/v1/nope")).andExpect(status().isNotFound())
            .andExpect(jsonPath("$.success").value(false));
    }
}
