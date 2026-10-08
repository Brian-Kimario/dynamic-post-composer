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
