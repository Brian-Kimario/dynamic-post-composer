# Dynamic Post Composer — REST API (Experiment 2)

Spring Boot backend for the composer UI in the repo root. It models the UI's three collections
(drafts, scheduled posts, published posts) as one `Post` with a `status` of `DRAFT`, `SCHEDULED` or `PUBLISHED`.

## Run

Requires JDK 25+ and Maven 3.9+.

```bash
cd backend
mvn spring-boot:run     # http://localhost:8080
mvn test                # integration tests (MockMvc)
```

H2 console: `http://localhost:8080/h2-console` — JDBC URL `jdbc:h2:mem:postcomposer`, user `sa`, empty password.

## 2.1.1 — RESTful CRUD API

Layers: `controller` → `service` → `repository` (+ `dto`, `model`, `config`).

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/posts` | List posts (paged, sortable, filterable — see 2.2.1) |
| GET / PUT / DELETE | `/api/v1/posts/{id}` | Read / replace / delete |
| POST | `/api/v1/posts` | Create (`status` defaults to `DRAFT`) |
| GET | `/api/v1/schedule` | The plan, paged, soonest first |
| POST | `/api/v1/schedule` | Schedule a post |
| PATCH | `/api/v1/schedule/{id}` | Reschedule (calendar drag-and-drop) — body `{ "scheduledFor": "…Z" }` |
| DELETE | `/api/v1/schedule/{id}` | Unschedule |

* **Validation** (Bean Validation): required content/platform/author, platform ∈ `facebook|x|linkedin|instagram`,
  `scheduledFor` must be in the future. The per-platform character limit (same counting as the UI) is a business rule → `422`.
* **Envelope** — every response, success or failure: `{ success, message, data, correlationId, timestamp }`.
* **CORS** — `/api/**` only for `app.cors.allowed-origins` (default: Vite dev/preview on `localhost:5173/4173`, `3000`).

## 2.1.2 — Exception handling & observability

* `GlobalExceptionHandler` (`@RestControllerAdvice`) is the only place errors become responses:
  `ResourceNotFoundException`→404, `BusinessRuleException`→422, validation/malformed JSON/bad UUID or enum→400,
  wrong method→405, wrong content type→415, unknown route→404, anything else→500 with a generic message (stack trace logged, never returned).
* `CorrelationIdFilter` assigns each request an id (a safe incoming `X-Correlation-Id` is honoured, else a UUID), stores it
  in the SLF4J **MDC**, returns it in the `X-Correlation-Id` response header and in the error/success body, and always clears the MDC.
* `RequestLoggingFilter` logs `--> METHOD path` and `<-- METHOD path status (ms)`. Bodies are not logged (user content).
* `logback-spring.xml` puts `[%X{correlationId}]` in every line, to console and a rolling `logs/` file.

Try it:

```bash
curl -i -X POST localhost:8080/api/v1/posts -H 'Content-Type: application/json' \
  -H 'X-Correlation-Id: demo-1' -d '{"content":"Hi","platformId":"x","authorName":"Brian"}'
```

## 2.2.1 — Pagination and sorting

`GET /api/v1/posts` and `GET /api/v1/schedule` return a page instead of the whole table:

```text
GET /api/v1/posts?status=DRAFT&platformId=x&page=0&size=20&sort=updatedAt,desc&sort=author,asc
```

| Parameter | Default | Notes |
| --- | --- | --- |
| `page` | `0` | Zero-based. Past the last page returns an empty `items`, not an error. |
| `size` | `20` (`50` for `/schedule`) | Capped at `100` by `spring.data.web.pageable.max-page-size`. |
| `sort` | `updatedAt,desc` (`scheduledFor,asc` for `/schedule`) | Repeatable. Whitelisted: `createdAt`, `updatedAt`, `scheduledFor`, `platformId`, `status`, `author`. Anything else → `400`. |
| `status`, `platformId` | none | Optional filters, applied before paging. |

`data` is `{ items, page, size, totalElements, totalPages, hasNext, hasPrevious, sort }` — a trimmed envelope rather than Spring's
verbose `Page`. Design notes: the sort whitelist keeps query-string input away from the persistence layer, an `id` tie-breaker is
appended so pages never overlap or skip rows when many share the sorted value, and `posts` is indexed for the
`status + updatedAt`, `platformId` and `scheduledFor` access paths. Each page costs two queries: the rows and a `count(*)`.

## 2.3.1 — JWT authentication and RBAC (lab Experiment 7.1)

Every `/api/**` endpoint now requires `Authorization: Bearer <access token>`, except `POST /api/v1/auth/login`, `/refresh` and `/logout`.

| Piece | File |
|---|---|
| Stateless, deny-by-default filter chain, BCrypt, `AuthenticationManager` | `security/SecurityConfig.java` |
| JWT filter (extract, validate, set SecurityContext) | `security/JwtAuthenticationFilter.java` |
| HS256 issue/verify (issuer, expiry, signature) | `security/JwtService.java` |
| 401 / 403 JSON envelope from inside the filter chain | `security/RestSecurityHandlers.java` |
| `@PreAuthorize` role rules | `PostController`, `ScheduleController`, `StatsController`, `CredentialController` |

| Role | Read posts/schedule | Create/edit/schedule | Delete posts | Analytics | Own OAuth credentials |
|---|---|---|---|---|---|
| ADMIN | yes | yes | yes | yes | yes |
| EDITOR | yes | yes | no (403) | yes | yes |
| VIEWER | yes | no (403) | no (403) | no (403) | no (403) |

Demo accounts (seeded when `app.security.seed-demo-users=true`; password = your `DEMO_PASSWORD`, or a random one printed once in the startup log): `ava@dpc.dev` ADMIN, `noah@dpc.dev` EDITOR, `priya@dpc.dev` VIEWER.
The H2 console is disabled because it would bypass all of this.

## 2.3.2 — AES encryption and token lifecycle (lab Experiment 7.2)

- **AES-256-GCM** (`crypto/AesGcmEncryptor.java`): random IV per value, auth tag detects tampering. The lab sheet's `Cipher.getInstance("AES")` is ECB mode; GCM is the safe variant of the same algorithm.
- **Encrypted OAuth credentials**: `OAuthCredential.accessToken/refreshToken` use `EncryptedStringConverter`, so the database holds ciphertext. `/api/v1/credentials` is write-only for tokens (responses never include them) and scoped to the caller.
- **Access + refresh**: access JWT lives 15 minutes (`app.security.jwt.access-ttl`); the opaque refresh token lives 7 days and is delivered as an `HttpOnly; SameSite=Strict` cookie scoped to `/api/v1/auth` (lab concept 7), stored only as a SHA-256 hash.
- **Rotation + reuse detection**: `POST /api/v1/auth/refresh` burns the presented token and issues a new pair. Replaying a used token revokes the whole family. `POST /api/v1/auth/logout` revokes it too.

Configuration (never commit real values):

```bash
export DEMO_PASSWORD=choose-a-demo-password
export JWT_SECRET=$(openssl rand -base64 48)        # >= 32 bytes, Base64
export ENCRYPTION_KEY=$(openssl rand -base64 32)    # exactly 32 bytes, Base64
# behind HTTPS also set: app.security.cookie-secure=true and app.security.seed-demo-users=false
```

If `JWT_SECRET` / `ENCRYPTION_KEY` are unset, random per-run keys are generated (nothing secret is committed); tokens and stored credentials then do not survive a restart. Changing `ENCRYPTION_KEY` makes existing stored credentials undecryptable (no key rotation yet).

Postman: set the `demoPassword` collection variable, import `postman/post-composer-security.postman_collection.json`, run the logins first (they store `accessToken`); Postman's cookie jar carries the refresh cookie. Tests: `SecurityApiTest` (6) and `TokenLifecycleTest` (9).

## Experiment 3.1.1: Kafka reliability (retry, DLQ, idempotency)

Scheduling a post publishes a `PostScheduledEvent` to the `post.scheduled` topic **after the DB commit**. A consumer
"publishes" it and is protected by three mechanisms:

| Mechanism | Where |
|---|---|
| Retry with exponential backoff (1s, 2s, 4s; 3 retries) | `kafka/KafkaConfig` (`DefaultErrorHandler` + `ExponentialBackOffWithMaxRetries`) |
| Dead-letter topic `post.scheduled.DLT` (after retries, or immediately for `PermanentPublishException`) | `kafka/KafkaConfig` (`DeadLetterPublishingRecoverer`), stored by `kafka/DeadLetterConsumer` |
| Idempotent consumer (`processed_events` primary key, same transaction as the work) | `kafka/ScheduledPostProcessor` |

The producer is idempotent too (`enable.idempotence=true`, `acks=all`).

### Run it

```bash
docker compose up -d                    # Kafka on :9092, Kafka UI on http://localhost:8090
KAFKA_ENABLED=true mvn spring-boot:run
```

Failure scenarios are triggered by a marker in the post content: `[flaky]` (fails twice, then succeeds),
`[fail-transient]` (retries exhaust, goes to the DLT), `[fail-permanent]` (straight to the DLT).

Admin-only inspection (JWT with the ADMIN role): `GET /api/v1/kafka/summary`, `/processed-events`, `/dead-letters`,
and `POST /api/v1/kafka/replay/{eventId}` (re-sends an event with the same id; the consumer ignores it and counts it).
Tests (`KafkaReliabilityTest`) run against an embedded broker, so no Docker is needed for `mvn test`.

### Experiment 3.1.2: live verification

3.1.2 repeats the 3.1.1 reliability aims, so it reuses the same implementation and verifies it against a real broker
(`docker compose up -d`). Observed: `[flaky]` succeeds after 2 backoff retries (~1s, ~2s); `[fail-transient]` retries
1s/2s/4s then lands in `post.scheduled.DLT`; `[fail-permanent]` is dead-lettered with no backoff; replaying a processed
`eventId` is ignored and increments `duplicatesSkipped`. Dead-letter rows now store the root cause message only.

## Experiment 3.2.1: CI pipeline and automated testing

| Layer | Tool | Where |
|---|---|---|
| Unit | JUnit 5, Mockito, AssertJ | `unit/` (`PlatformTest`, `AesGcmEncryptorTest`, `ScheduledPostProcessorTest`), `service/PostRulesTest` |
| API | MockMvc / `@SpringBootTest` | existing `*ApiTest` classes |
| Contract | Pact JVM provider (`junit5spring`) | `contract/PactProviderTest`, pact `src/test/resources/pacts/dpc-frontend-post-composer-api.json` |
| Integration | Testcontainers (`cp-kafka:7.6.1`) | `KafkaTestcontainersTest` (skipped without Docker) |

The pact is the React app's expectation of the API (consumer `dpc-frontend`, provider `post-composer-api`): list posts,
schedule a post, the 422 platform-limit error and `/auth/me`. Each interaction is replayed against the running app; the
provider-state generator swaps the placeholder bearer token for a real one issued to the seeded editor.

CI: `.github/workflows/ci.yml` (backend `mvn clean verify`, frontend lint/test/build), uploading surefire reports as an artifact.

## Experiment 3.2.2: Continuous deployment with Docker and canary release

- `Dockerfile`: multi-stage build (Maven, then `eclipse-temurin:25-jre`), non-root user, healthcheck on `/actuator/health`.
- `.github/workflows/cd.yml`: triggered by `workflow_run` of **CI** (success only) -> build image -> push to GHCR with
  `GITHUB_TOKEN` -> canary job.
- Canary: `deploy/docker-compose.canary.yml` runs `stable` and `canary` containers behind `deploy/nginx.conf`
  (weights 9:1). `/actuator/info` reports `APP_VERSION`, so each response shows which version served it.
  `deploy/canary-check.sh` is the gate: any failed request or zero canary traffic means rollback, otherwise promote.
- Observed locally: `requests=100 stable=85 canary=15 errors=0` -> `CANARY HEALTHY -> promote to 100%`.
- Added `spring-boot-starter-actuator` exposing only `health` and `info`; both are public so probes work.
