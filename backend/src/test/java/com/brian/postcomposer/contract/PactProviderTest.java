package com.brian.postcomposer.contract;

import au.com.dius.pact.provider.junit5.HttpTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junitsupport.Provider;
import au.com.dius.pact.provider.junitsupport.State;
import au.com.dius.pact.provider.junitsupport.loader.PactFolder;
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider;
import com.brian.postcomposer.model.Author;
import com.brian.postcomposer.model.Post;
import com.brian.postcomposer.model.PostStatus;
import com.brian.postcomposer.repository.AppUserRepository;
import com.brian.postcomposer.repository.AuthorRepository;
import com.brian.postcomposer.repository.PostRepository;
import com.brian.postcomposer.security.AppUserDetails;
import com.brian.postcomposer.security.JwtService;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

/**
 * Experiment 3.2.1 - contract testing. The frontend's expectations live in {@code pacts/dpc-frontend-post-composer-api.json}
 * (consumer: the React app, provider: this API). Each interaction is replayed against the running Spring Boot app,
 * so renaming {@code data.items} or dropping {@code authorName} fails this build instead of breaking the UI.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Provider("post-composer-api")
@PactFolder("pacts")
public class PactProviderTest {
    @LocalServerPort int port;
    @Autowired AppUserRepository users;
    @Autowired AuthorRepository authors;
    @Autowired PostRepository posts;
    @Autowired JwtService jwt;

    @BeforeEach
    void target(PactVerificationContext context) {
        context.setTarget(new HttpTestTarget("localhost", port));
    }

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void verifyContract(PactVerificationContext context) { context.verifyInteraction(); }

    /** The consumer sends a placeholder token; the pact's provider-state generator swaps in this real one. */
    private Map<String, Object> editorToken() {
        var editor = users.findByEmail("noah@dpc.dev").orElseThrow();
        return Map.of("token", jwt.issueAccessToken(AppUserDetails.of(editor)));
    }

    @State("a draft post exists")
    Map<String, Object> aDraftPostExists() {
        posts.deleteAll(); // the context is shared with other tests; the contract expects exactly one post on page 0
        Post post = new Post();
        post.setContent("a draft");
        post.setPlatformId("x");
        post.setStatus(PostStatus.DRAFT);
        post.setAuthor(authors.findByName("Pact Author").orElseGet(() -> authors.save(new Author("Pact Author"))));
        posts.save(post);
        return editorToken();
    }

    @State("an editor is signed in")
    Map<String, Object> anEditorIsSignedIn() {
        return editorToken(); // the seeded demo editor, noah@dpc.dev
    }
}
