# Dynamic Post Composer (DPC)

A multi-platform social media post composer with platform-specific constraint validation.

Compose a single draft and check it against the character limits of Facebook, X, LinkedIn and
Instagram, with live character counting, warning and error states, and accessible feedback.

Drafts can be saved, listed, edited and deleted, and they persist in the browser across reloads.
Application state is centralized in a Redux Toolkit store with normalized entity data, and access to
it is gated behind a JWT-based login with stateless session handling.

Built as a progressively extended project for Full Stack-II. This repository currently contains
**Experiments 1.1.1, 1.1.2, 1.2.1, 1.2.2 and 1.3.1**.

---

## Experiments

### Experiment 1.1.1 — Post Composer with Platform Validation

**Aim:** To design and develop a dynamic post composer interface supporting multiple platforms with
constraint validation.

Covers the composer, its platform configuration model, and client-side validation.

### Experiment 1.1.2 — Draft Management

**Aim:** To implement a draft management system that allows users to save, retrieve, and manage post
drafts within the frontend, with optional simulation of backend interactions.

Covers frontend CRUD over drafts, `localStorage` persistence, and asynchronous workflows behind a
mock API layer.

### Experiment 1.2.1 — Redux Toolkit Setup & State Design

**Aim:** To design and implement a centralized state management system using Redux Toolkit for
managing posts and platform-related data.

Covers the store, domain slices, normalized state via `createEntityAdapter`, async thunks, and
connecting components with `useSelector` / `useDispatch`.

### Experiment 1.2.2 — Optimized Selectors & Performance Handling

**Aim:** To optimize state access and improve application performance using memoized selectors and
efficient rendering strategies.

Covers derived state, memoized selectors with `createSelector`, a derived analytics view, and
measured re-render and recomputation reductions.

### Experiment 1.3.1 — JWT Authentication

**Aim:** To design and implement a secure authentication system using JWT for user login and session
management.

Covers the login interface, credential validation against a mock directory, real HS256 token
generation and verification, secure token storage, attaching the token to every request, and
decoding it to recover the signed-in user.

### Scope

Authentication arrived in 1.3.1, but there is still no real backend and no social media integration
— publishing is simulated in the browser, everything is stored locally, and the "auth server" is a
module (`services/authApi.js`) rather than a remote host. The tokens themselves are not simulated:
they are real signed JWTs.

**Role-based access control, protected routes and token refresh are deliberately out of scope here.**
They are Experiment 3.2 and its Assignment 5 in the course material. Roles are already issued inside
the token so that experiment adds enforcement rather than reissuing identity. Retry logic and toast
notifications (Experiment 1, Assignment 4) remain unimplemented. The architecture is arranged so all
of those can be added without restructuring what exists.

---

## Features

- Platform selection across Facebook, X, LinkedIn and Instagram
- Per-platform character limits driven entirely by configuration
- Real-time character counting as you type
- Real-time validation with four distinct states: empty, valid, warning, error
- Warning at 90% of the platform limit; error once the limit is exceeded
- Publish button automatically disabled for empty or over-limit posts
- Draft is preserved when switching platforms, so the same text can be checked against different limits
- Simulated publish action with a loading state and a success confirmation
- Grapheme-aware counting, so an emoji counts as one character
- Responsive layout for mobile, tablet and desktop
- Accessible feedback: labelled controls, keyboard navigation, live regions, non-colour-only status

### Draft management (1.1.2)

- Save the current post as a draft, and update that draft on subsequent saves
- Draft list showing platform, excerpt, character usage and relative timestamp
- Load a draft back into the composer, restoring both its content and its platform
- Two-step delete confirmation that reverts itself if left untouched
- Drafts persist in `localStorage` across reloads
- Search and platform filtering over the draft list
- Incremental rendering — six drafts at a time, with a "Show more" control
- Asynchronous mock API with loading, error and retry states
- Publishing a draft removes it from the list
- Drafts may exceed the platform limit; only publishing is blocked

### Centralized state (1.2.1)

- Single Redux store composed from domain slices, with UI state kept in its own slices
- Normalized `{ ids, entities }` state for platforms, drafts and published posts
- Async CRUD through `createAsyncThunk`, with pending / fulfilled / rejected handled in the slice
- Published posts are now real, persisted application data with their own panel
- Components read the store directly — `PlatformSelector` and `PostComposer` take no props at all
- Errors scoped per slice: a failed draft load leaves the composer and published posts working

### Optimized selectors (1.2.2)

- All derived data computed by memoized `createSelector` pipelines, not stored
- Content insights panel: draft/post counts, over-limit count, average length, per-platform breakdown
- Filtering, paging and counting moved out of the component into composable selectors
- Expensive grapheme-based over-limit check runs once per data change instead of once per render
- `React.memo` on list and stat rows, `useCallback` on dispatching handlers

### JWT authentication (1.3.1)

- Login screen with mock credential validation and one-click demo accounts
- Real `HEADER.PAYLOAD.SIGNATURE` tokens, signed with HMAC-SHA256 via the Web Crypto API
- Stateless sessions — no session store; identity is derived from the token on every request
- Token storage choice exposed to the user: `sessionStorage` by default, `localStorage` opt-in
- Session restored from the stored token on reload, signature and expiry re-verified first
- Every data request goes through one client that attaches `Authorization: Bearer …`
- Requests with a missing, tampered or expired token are refused before they touch data
- Expiry ends the session automatically and explains why, instead of failing silently
- Records are stamped with the author taken from the verified token, never from the caller
- Session panel showing the live token, its three segments, decoded claims and expiry countdown

---

## Tech Stack

| Technology         | Why it is here                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| **React 19**       | Component model and state management for a UI that re-renders on every keystroke.                       |
| **Vite 8**         | Dev server with fast HMR and an optimised production build.                                             |
| **Tailwind CSS 4** | Utility-first styling with a consistent spacing/colour scale and no separate CSS files to keep in sync. |
| **lucide-react**   | Small, tree-shakeable icon set for status and action icons.                                             |
| **ESLint**         | Correctness rules, notably `eslint-plugin-react-hooks` for the rules of hooks.                          |
| **Prettier**       | Formatting, including automatic Tailwind class sorting.                                                 |
| **Redux Toolkit**  | Centralized store, normalized entity state and async thunks (added in 1.2.1).                           |
| **React-Redux**    | `useSelector` / `useDispatch` bindings between the store and components.                                |
| **Reselect**       | Memoized selectors via `createSelector` — ships inside Redux Toolkit, so it is not a separate install.  |
| **Web Crypto API** | HMAC-SHA256 signing and verification for JWTs — a browser built-in, not a dependency (added in 1.3.1).  |

Up to Experiment 1.1.2 the app used only `useState` and `useReducer`, which was the right call for
two state owners that barely interacted. Redux Toolkit was introduced in 1.2.1 once three domains
(platforms, drafts, published posts) needed to be read by components in different parts of the tree.
Experiment 1.2.2 added no new dependency — `createSelector` comes with Redux Toolkit.

Experiment 1.3.1 added none either. A JWT library (`jsonwebtoken`, `jose`) would have hidden exactly
the parts the experiment is about, and `crypto.subtle` already implements the only primitive needed.
Axios was also skipped: there is no HTTP layer to configure yet, so `services/apiClient.js`
implements the interceptor _pattern_ over the existing mock transport instead of adding a client that
would have nothing to talk to.

---

## Architecture

Platform rules flow in one direction, from configuration through to what the user sees:

```
Platform Configuration   (src/config/platforms.js)
        ↓
platforms slice          (normalized + selectedPlatformId)
        ↓
Active Platform Rules    (characterLimit, warningThreshold)
        ↓
Validation               (src/utils/postValidation.js — pure function)
        ↓
UI Feedback              (counter, message, button disabled state)
```

The important property is that **no component ever branches on a platform id**. A component does not
ask "is this X?" — it reads `platform.characterLimit` and renders the validation result it was given.

### The store

```
store
├── platforms  { ids, entities, selectedPlatformId }
├── drafts     { ids, entities, status, error, actionError, isSaving, pendingIds }
├── posts      { ids, entities, status, error, actionError, isPublishing, pendingIds }
├── composer   { editingDraftId, sessionId }                 ← UI state, not data
└── filters    { searchTerm, platformFilter, visibleCount }  ← UI state, not data
```

Slices are split by **domain**, not by screen, and data state is kept separate from UI state.
`drafts` answers "what drafts exist"; `composer` answers "what is the user doing with them".

### Data flow after Redux

```
ComposerWorkspace ....... layout only, no state
    │
    ├── PostComposer ......... no props — reads store via usePostComposer
    │     ├── PlatformSelector ... no props — selects and dispatches directly
    │     └── PostEditor ......... local content state, passed down
    │
    ├── ContentInsightsPanel . no props — all figures from memoized selectors
    │
    ├── DraftsPanel .......... no props — dispatches fetchDrafts itself
    │     └── DraftListItem ...... takes only `draftId`, looks its own entity up
    │
    └── PublishedPostsPanel .. no props — dispatches fetchPosts itself
          └── PublishedPostItem .. takes only `postId`
```

Before Redux, `ComposerWorkspace` owned the draft state machine and threaded ten props into its
children. Every one of those props is gone. Rows now take a single id and read their own entity from
the normalized store, which is what removes the last of the prop drilling.

### What did _not_ go into the store

Centralizing state does not mean centralizing _everything_:

| Stays local         | Why                                                    |
| ------------------- | ------------------------------------------------------ |
| Post content        | Changes on every keystroke, needed by one subtree only |
| Delete confirmation | Lives and dies inside a single row                     |

Draft search and paging **did** move into the store in 1.2.2, reversing the 1.2.1 decision. The
reason is specific: a `createSelector` can only memoize over store state, so filters held in
component state force the derived list back into a per-instance `useMemo` that nothing else can
reuse. Moving them made the whole `drafts → filtered → paged` chain one shared, composable,
memoized pipeline — and it was verified that search typing still re-renders neither the composer nor
the insights panel.

Putting post content in the store would push a dispatch through the whole subscription system for
every character typed, to no benefit. Global state is for **shared** data. Measured after the
migration: 80 keystrokes still produce **0** draft-row re-renders.

Opening a draft works by changing `PostComposer`'s `key` (from `composer.sessionId`), which remounts
it with the draft as initial state. Remounting is React's intended way to reset a component's state —
the alternative, an effect that copies props into state, is a well-known source of subtle bugs.

---

## Project Structure

```
src/
├── store/
│   ├── index.js                      configureStore — composes the six slices
│   ├── authSlice.js                  Session state: status, user, token, claims
│   ├── platformsSlice.js             Normalized platforms + selected platform
│   ├── draftsSlice.js                Normalized drafts + async CRUD thunks
│   ├── postsSlice.js                 Normalized published posts + thunks
│   ├── composerSlice.js              UI state: which draft is open, session id
│   ├── filtersSlice.js               UI state: search, platform filter, paging
│   └── selectors.js                  Memoized derived state (createSelector)
├── components/
│   ├── auth/
│   │   ├── LoginScreen.jsx           Credentials form + demo accounts
│   │   ├── AccountBadge.jsx          Signed-in user and sign out (header)
│   │   └── SessionPanel.jsx          Live token, decoded claims, expiry countdown
│   ├── workspace/
│   │   └── ComposerWorkspace.jsx     Layout only
│   ├── post-composer/
│   │   ├── PostComposer.jsx          Owns post content; reads the rest from the store
│   │   ├── PlatformSelector.jsx      Platform radio group (connected, no props)
│   │   ├── PostEditor.jsx            Controlled textarea
│   │   ├── CharacterCounter.jsx      Count, remaining, progress bar
│   │   ├── ValidationMessage.jsx     Status feedback (live region)
│   │   ├── PublishButton.jsx         Publish action and its states
│   │   ├── SaveDraftButton.jsx       Save / update draft action
│   │   └── PublishSuccessNotice.jsx  Post-publish confirmation
│   ├── drafts/
│   │   ├── DraftsPanel.jsx           List, search, filter, paging, load/error states
│   │   └── DraftListItem.jsx         One row — takes an id, memoised
│   ├── posts/
│   │   ├── PublishedPostsPanel.jsx   Published post list
│   │   └── PublishedPostItem.jsx     One row — takes an id, memoised
│   └── insights/
│       └── ContentInsightsPanel.jsx  Derived analytics from memoized selectors
├── config/
│   └── platforms.js                  Platform rules and warning threshold
├── hooks/
│   └── usePostComposer.js            Composer logic on top of the store
├── services/
│   ├── jwt.js                        Sign, decode and verify HS256 tokens
│   ├── authApi.js                    Mock auth server — user directory + secret
│   ├── tokenStorage.js               Where the token lives, and the trade-off
│   ├── apiClient.js                  Request pipeline: attach token, verify, 401
│   ├── localCollection.js            Mock async CRUD factory over localStorage
│   ├── draftsApi.js                  Drafts instance
│   └── postsApi.js                   Published posts instance
├── utils/
│   ├── postValidation.js             Pure validation logic
│   └── draftFormatting.js            Excerpts and relative timestamps
├── App.jsx                           Application shell + session gate
├── main.jsx                          React entry point + Provider
└── index.css                         Tailwind import and design tokens
```

Directories separate by _responsibility_, not by file type alone: configuration, logic, state and
presentation each have a home. Components are grouped into feature folders (`post-composer/`,
`drafts/`, `posts/`) so each feature stays self-contained.

---

## Draft Management Model

### The mock API layer

`services/localCollection.js` builds an async CRUD API over one `localStorage` key; `draftsApi` and
`postsApi` are two instances of it. Every method is `async` and returns a Promise, even though
`localStorage` is synchronous. The latency is simulated on purpose: it means the calling code is
written against an asynchronous contract from day one, so swapping in a real backend later changes
only this one file.

`localStorage` is genuinely fallible — it throws in Safari private mode, when site data is disabled,
and when the quota is exceeded, and the stored JSON can be corrupted by an older version of the app.
Every access is wrapped so those surface as ordinary rejected promises the UI can render.

### The draft record

```js
{
  id: 'a3f1…',            // crypto.randomUUID()
  content: 'Hello world',
  platformId: 'linkedin',
  createdAt: '2026-07-31T09:12:04.001Z',
  updatedAt: '2026-07-31T09:15:22.517Z'
}
```

### State machine

Drafts started life in a `useReducer` hook (1.1.2) and moved into a Redux slice in 1.2.1. The shape
barely changed, which is the point — a reducer is a reducer. What changed is who can read it.

Errors are split by blast radius. A failed _initial load_ replaces the panel with an error and a
retry button, because there is no list to show. A failed _create/update/delete_ shows a dismissible
banner above a list that still works. Because each domain is its own slice, a corrupted drafts store
leaves the composer and the published posts panel fully working — verified.

---

## Centralized State Model

### Normalization

Each data slice stores `{ ids: [], entities: {} }` instead of an array, built with
`createEntityAdapter`:

```js
const draftsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
});
```

Three concrete wins over the array it replaced:

1. **Lookup by id is O(1)** — a row reads `entities[id]` instead of scanning.
2. **`ids` stays sorted** by the adapter, so the list component no longer sorts on every render.
3. **`upsertOne` collapses create and update** into a single `saveDraft.fulfilled` case.

The measurable payoff: rows take only a `draftId` and select their own entity, so saving one draft
re-renders **one row**. Measured with five drafts on screen — the edited row re-rendered, the other
four did not.

### Async with thunks

```js
export const fetchDrafts = createAsyncThunk('drafts/fetchDrafts', async () => draftsApi.fetchAll());
```

Each thunk dispatches `pending` / `fulfilled` / `rejected` automatically, and the slice handles those
in `extraReducers`. Components never set a loading flag by hand — they dispatch and read status.

In `deleteDraft.pending` the id comes from `action.meta.arg`, because at pending time there is no
payload yet. In the hook, `.unwrap()` re-throws a rejected thunk so the calling code reads like
ordinary `async`/`await` rather than inspecting the returned action.

### Why a `composer` slice

`platforms`, `drafts` and `posts` hold data. `composer` holds _what the user is doing_ —
`editingDraftId` and a `sessionId` used to remount the editor. Keeping the two kinds apart is the
"separation of UI state and data state" idea; mixing them makes both harder to reason about.

### A deliberate asymmetry

A draft may exceed the platform character limit; only **publishing** is blocked. Being over the limit
is a normal state for work in progress, so the save path checks only that the content is non-empty.

---

## Derived State & Memoized Selectors

Nothing derived is stored. Counts, filtered lists and analytics are all computed from the store by
`createSelector` pipelines in `src/store/selectors.js`.

### The pipeline

```
selectAllDrafts ─┐
selectPlatformFilter ─┤
selectNormalizedQuery ─┴─► selectFilteredDrafts ─┬─► selectVisibleDraftIds
                                                  ├─► selectFilteredDraftCount
                                                  └─► selectHiddenDraftCount ─► selectHasMoreDrafts
```

Each layer recomputes only when _its own_ inputs change. `selectNormalizedQuery` exists as a separate
tiny selector on purpose: it trims and lowercases the search term, so changing `"draft"` to
`"DRAFT"` produces the same normalized value and the expensive filter below **does not re-run**.
Verified — a case change and a trailing space each caused 0 recomputations, while a genuinely
different query caused exactly 1.

### The expensive one

```js
export const selectOverLimitDraftCount = createSelector(
  [selectAllDrafts, selectPlatformEntities],
  (drafts, platforms) => drafts.filter(/* Intl.Segmenter over every draft */).length,
);
```

This is the clearest case for memoization in the codebase. Deciding whether a draft is over its
limit means running grapheme segmentation over its whole body, and it composes across two slices —
draft content on one side, platform limits on the other.

Measured with **40 drafts of ~945 characters**, 200 calls:

|                       | Time         |
| --------------------- | ------------ |
| Memoized selector     | **0.6 ms**   |
| Same logic unmemoized | **1,659 ms** |

That is ~8 ms per unmemoized call — over half a frame budget, on every render. Memoized, it ran
**0** times across those 200 calls, and both produced the same answer.

### How Reselect 5 actually memoizes

Two behaviours worth knowing, because they differ from older advice:

1. **Reference equality on input results.** This is why normalization matters: the drafts array
   identity changes only when a draft actually changes, so unrelated dispatches do not invalidate
   the cache.
2. **`weakMapMemoize` is the default**, not the old cache-size-1 `lruMemoize`. Cycling a search
   through `'' → a → ab → abc → ab → a → ''` caused only **3** recomputations rather than 7,
   because revisiting an earlier query hit the cache. With the old default it would have thrashed.

### Rendering optimisations

- `React.memo` on `DraftListItem`, `PublishedPostItem`, and the insight `Stat` / `BreakdownRow` rows
- `useCallback` on every dispatching handler in `DraftsPanel`, so memoized children stay valid
- Rows take an **id**, not an object, so they subscribe to one entity each
- `DraftsPanel` selects `selectVisibleDraftIds` — a memoized array — so it re-renders only when the
  set of visible ids changes, not when a draft's text changes

There is no `useMemo` left in `DraftsPanel`: the memoization moved into selectors, where it is
shared rather than per-instance.

---

## Authentication Model

### The flow

```
LoginScreen        credentials (local state, never dispatched)
      ↓
authApi.login      directory lookup → signToken(HS256)      ← the only holder of the secret
      ↓
tokenStorage       sessionStorage, or localStorage if "keep me signed in"
      ↓
authSlice          status: authenticated, user + claims decoded from the token
      ↓
apiClient          every request: Authorization: Bearer <token>
      ↓
verifyAccessToken  signature + expiry checked before the handler runs
      ↓
handler(user)      identity comes from the token, never from the caller
```

Nothing in that chain consults a session table, which is what "stateless" means in practice: the
same token verifies against the same secret anywhere, so any instance of a service can answer "who
is this?" without shared memory. It is also why signing out is purely a client-side act — there is
no server-side session to destroy.

### The token

`services/jwt.js` produces a real JWT, not a stand-in. It is base64url-encoded, signed with
HMAC-SHA256 through `crypto.subtle`, and verifies in any JWT debugger:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9        header    { alg: 'HS256', typ: 'JWT' }
.eyJzdWIiOiJ1c3JfYXZhX21pdGNoZWxsIiwi…      payload   claims
.Ji-c-M6bX-5Ztie8ILXYcj_dIRg7o0wwXjStuYPxUIk  signature HMAC over header.payload
```

```js
{
  sub:   'usr_ava_mitchell',   // registered claim: who the token is about
  name:  'Ava Mitchell',
  email: 'ava@dpc.dev',
  role:  'admin',              // issued now, enforced in 3.2
  iat:   1785598468,           // NumericDate — seconds, not milliseconds
  exp:   1785599068            // 10 minutes later
}
```

`decodeToken` and `verifyToken` are deliberately separate functions. Decoding is just base64 —
anyone holding the token can read the payload, which is why nothing sensitive goes in it. Verifying
is the part that establishes trust, and it happens in this order for a reason: the signature is
checked **first**, because `exp` is a claim, and an unverified claim is something the bearer could
have edited. Tokens declaring any algorithm other than `HS256` are rejected outright, which is what
closes the `alg: none` family of attacks.

### Where the token lives

| Storage          | Survives              | Exposed to JS | Used here                 |
| ---------------- | --------------------- | ------------- | ------------------------- |
| `sessionStorage` | reload, not tab close | yes           | **default**               |
| `localStorage`   | browser restart       | yes           | opt-in via "keep me in"   |
| HTTP-only cookie | per cookie policy     | **no**        | needs a backend — not yet |

The cookie is the option that actually defends against XSS, and it is unavailable without a server
to set it, so `sessionStorage` is the default: the narrower blast radius of the two that remain, and
it makes closing the tab a real sign-out. The checkbox is honest about the trade — the persistence
the user is asking for is exactly the persistence an attacker would inherit. All of it is behind
`services/tokenStorage.js`, so revisiting the decision means editing one file.

### The interceptor pattern without Axios

`services/apiClient.js` implements the four stages an Axios interceptor pair would occupy:

1. **Request** — attach `Authorization: Bearer <token>`, read from storage.
2. **Transit** — simulated latency.
3. **Server** — verify the token and derive the user; refuse with a 401-equivalent otherwise.
4. **Response** — on that refusal, discard the dead token and end the session.

Doing it centrally is the entire argument for interceptors: no feature module can forget the header,
and there is exactly one definition of what a 401 means. `authSlice` reacts to it with a matcher on
`action.error.name === 'UnauthorizedError'`, so expiry handling lives in one place rather than in
every thunk. Swapping in `axios.create()` later changes this file's internals and nothing else.

The handler receives the user **derived from the token**, so `create()` stamps `authorId` from
claims rather than from its arguments — a component has no way to write a record as somebody else,
because it never gets to say who it is.

### Three states, not two booleans

`authSlice` models `restoring → anonymous | authenticating → authenticated`. The `restoring` state
exists because verifying a stored token is asynchronous: without it the app would render the login
screen for a frame on every reload before discovering the user was signed in. A pair of
`isLoading` / `isLoggedIn` booleans would also permit combinations that cannot occur.

Ending a session clears the data slices too, via a shared `isSessionEnded` matcher. Otherwise the
drafts loaded for one user would still be in memory when the next signs in on the same browser.

### What is honest about this, and what is not

The mechanism is real; the trust boundary is not. The token is signed in the browser with a secret
the browser can read, so the signature proves nothing against a determined user — anyone can open
DevTools and mint themselves an `admin` token. That is unavoidable without a server, and it is why
`authApi.js` is the sole holder of the secret and the directory: it marks precisely the line that
moves server-side later, at which point `jwt.js` moves with it and the store, the API client and the
UI are untouched, because none of them ever saw a password or a secret.

The same caveat applies to the client-side checks generally. Client-side enforcement is a UX
affordance — it keeps users out of states they cannot use. It is never the security boundary; the
server's own check is.

---

## Validation Model

`validatePost(content, platform)` is a pure function: same inputs, same output, no React involved.
It returns a single structured result that the entire UI reads from.

```js
{
  status: 'valid',              // 'empty' | 'valid' | 'warning' | 'error'
  isValid: true,                // may this post be published?
  characterCount: 120,
  characterLimit: 280,
  remainingCharacters: 160,
  usageRatio: 0.43,
  isEmpty: false,
  isOverLimit: false,
  platformId: 'x',
  message: 'Your post is ready to publish to X.'
}
```

### The four states

| State       | Condition                           | Publishable |
| ----------- | ----------------------------------- | ----------- |
| **empty**   | Content is blank or only whitespace | No          |
| **valid**   | Below 90% of the limit              | Yes         |
| **warning** | At or above 90% of the limit        | Yes         |
| **error**   | Above the limit                     | No          |

A warning is deliberately still publishable — it is guidance, not a block.

### Two details worth knowing

**Whitespace.** Emptiness is checked with `content.trim()`, so a post of only spaces cannot be
published. The character count still reports the untrimmed length, because the counter should show
what the user actually typed.

**Counting.** Characters are counted with `Intl.Segmenter` at grapheme granularity rather than
`String.length`. In JavaScript `"👍".length` is `2`, and a family emoji is `11`. Segmenting into
graphemes means the counter matches what a person sees. Verified in the browser: the string
`👍👨‍👩‍👧‍👦🇹🇿` reports `17` via `.length`, `10` via code points, and **3** in the composer.

### Extending validation later

New rules (hashtag caps, link restrictions, media requirements, minimum length) belong in
`postValidation.js`: add the metric, then add a case to `resolveStatus`. Because every component
reads from the returned object, additions should be additive rather than changes to existing fields.

---

## React Concepts Used

- **Components** — the UI is split into small units with one responsibility each.
- **Props** — data flows down (`platform`, `validation`); intent flows up via callbacks (`onChange`).
- **State** — shared data lives in the Redux store; `content` and view-only concerns stay local.
- **Controlled inputs** — the textarea's `value` comes from React state and every keystroke goes
  through `onChange`. React is the source of truth, which is what makes live validation possible.
- **Derived state** — character count, remaining characters and status are _computed_ from content
  and platform on each render, never stored. There is no second copy that can fall out of sync.
- **Event handling** — `onChange` and `onClick` handlers translate DOM events into state updates.
- **Conditional rendering** — the success notice renders only after publishing; the button swaps
  its label and icon while publishing.
- **Hooks** — `useState`, `useMemo`, `useCallback`, `useRef` and `useEffect`, plus `useSelector` and
  `useDispatch` from React-Redux and one custom hook.
- **Component composition** — `PostComposer` assembles smaller components rather than being one
  large component.
- **Reducers and immutable updates** — slices are written in "mutating" style, which Immer converts
  into immutable updates under the hood.
- **Normalized state** — `{ ids, entities }` via `createEntityAdapter`, so rows read one entity by id.
- **Async thunks** — `createAsyncThunk` generates pending/fulfilled/rejected, handled in
  `extraReducers`.
- **Selectors** — components read through selector functions, so they never depend on the store's
  internal shape.
- **Memoization** — `createSelector` caches a result and recomputes only when an input result
  changes by reference.
- **Selector composition** — selectors built from other selectors, so each layer recomputes
  independently.
- **Async workflows** — `async/await` with `try/catch`, and separate loading, success and error
  states for each operation.
- **Cleanup and stale closures** — every timer is cleared on unmount, and async completions are
  guarded by a mounted ref so a resolved request can never update an unmounted component.
- **`memo` and `useCallback` together** — rows are memoised, and their handlers are stable, so the
  memo actually holds. One without the other would do nothing.
- **Resetting state with `key`** — opening a draft remounts the composer rather than syncing props
  into state with an effect.
- **Conditional rendering as a gate** — `App` renders the login screen, a restoring state or the
  workspace; the composer is only ever mounted for a signed-in user, so it never has to ask.
- **Action matchers** — `addMatcher` lets one slice react to actions from any other, which is how
  session expiry is handled once instead of in every thunk.
- **Web APIs from React** — `crypto.subtle` and `sessionStorage` are wrapped in service modules, so
  components never touch a browser API directly.

---

## Key Design Decisions

**Platform rules live in configuration, not components.** Every limit, label, colour and placeholder
is in `src/config/platforms.js`. Adding a fifth platform means adding one object; no component
changes. This is the difference between code that scales and a chain of `if (platform === 'x')`
checks scattered across the UI.

**Derived values are never stored in state.** `characterCount`, `remainingCharacters` and
`isOverLimit` are all functions of `content` and `platform`, so they are recomputed rather than
stored. Duplicated state is the most common source of "the counter says 240 but the button is still
disabled" bugs.

**Validation is separated from the UI.** `postValidation.js` imports nothing from React. It can be
unit tested without rendering, and in a later experiment the same function can run on a server to
validate the same post — client-side validation alone is never trustworthy.

**A custom hook, but only one.** `usePostComposer` bundles the composer's local content state with
the store reads and dispatches it needs, so `PostComposer` stays a layout component. A hook was
_not_ created for validation — that is a pure function, and wrapping it in a hook would add
indirection without adding anything.

**`useMemo` is used once, and not for the reason people usually assume.** It does not speed up
typing: `content` changes on every keystroke, so validation necessarily re-runs then. It avoids
re-running grapheme segmentation when _unrelated_ state changes — publish status moving through
publishing → success → idle — while a long draft sits in the editor. Measured cost at a maxed-out
63,206-character Facebook post is ~10ms, which is why it is worth avoiding needlessly.

**Tailwind, with brand colours as CSS custom properties.** Tailwind can only generate classes it can
see as literal strings at build time, so a per-platform colour coming from data cannot be a dynamic
class name. Those are passed as a `--platform-accent` custom property instead; everything else uses
ordinary utilities.

**Post content stays out of the store.** Centralizing state does not mean centralizing everything.
Content changes on every keystroke and is read by one subtree, so it stays in `useState`; putting it
in Redux would dispatch an action per character for no benefit. Measured after the migration: 80
keystrokes still produce **zero** draft-row renders.

**Redux was added when it was earned, not before.** Through 1.1.2 the app had two state owners that
barely interacted, and `useState` + `useReducer` were the right tools — adding Redux then would have
been ceremony. It became worthwhile in 1.2.1 once three domains needed reading from different parts
of the tree.

**Memoize where the work is, not everywhere.** `createSelector` is applied to selectors that filter,
group or compute — not to trivial field reads like `selectSearchTerm`, where the wrapper would cost
more than it saves. The layered design puts the cheap normalization step above the expensive filter
so the expensive one is invalidated as rarely as possible.

**Filters moved into the store, reversing a 1.2.1 decision.** In 1.2.1 search and paging were local
because nothing else read them. A memoized selector can only memoize over store state, so keeping
them local would have forced the derived list back into a per-component `useMemo`. Moving them made
the whole pipeline shared and composable. The re-render cost of that move was measured, not assumed:
search typing re-renders neither the composer nor the insights panel.

**Rows take an id, not an object.** `DraftListItem` receives `draftId` and selects its own entity.
That is what makes `memo` effective without threading stable callbacks down: the row also dispatches
its own actions, so it has no function props at all.

**Persistence hides behind an async API.** Routing storage through `services/localCollection.js`
means components already handle latency, loading states and failure — the parts that are genuinely
hard about a real backend — so that migration becomes a change to one file.

**Real tokens, not simulated ones.** The experiment could have been satisfied with a
`JSON.stringify` "token", and that would have taught none of it — the three segments, the registered
claims, the signature check and the `alg` confusion attack are the content. `crypto.subtle` makes a
genuine HS256 token about forty lines of code, so the mock stops at the trust boundary rather than
at the format.

**No JWT library, no Axios.** Both would have hidden the mechanism behind an API call at exactly the
point the mechanism is the subject. Axios in particular has nothing to talk to yet; `apiClient.js`
reproduces the interceptor pattern over the existing transport, so adopting Axios later is a
substitution rather than a redesign.

**The secret and the directory live in one module.** `services/authApi.js` holds both, not because
that is secure — it is not, and the README says so — but because it draws the line that moves to the
server later. Every other module is written as a client that only ever holds a token.

**Credentials never enter Redux.** Email and password stay in `LoginScreen`'s local state. A
password in the store is a password in the DevTools action log and in any state snapshot; the store
holds the resulting token instead.

**Client-side checks are UX, not security.** The gate, the disabled buttons and the role claim keep
users out of states they cannot use. The check that matters is the one `apiClient` performs before
running a handler — and in a real system, the one the server performs. Both layers exist here on
purpose, which is the defence-in-depth idea applied rather than described.

---

## Accessibility

- Platform selection uses **native radio inputs**, visually hidden with `sr-only` rather than
  `display: none`, which keeps them focusable and in the accessibility tree. The browser then
  provides arrow-key navigation and group semantics for free. Verified: focusing the group and
  pressing <kbd>↓</kbd> moves the selection and recalculates the limit.
- The textarea is linked to its feedback with **`aria-describedby`**, pointing at both the character
  counter and the validation message, and is marked **`aria-invalid`** when over the limit.
- The validation message is a **persistent `role="status"` live region**. It is always in the DOM so
  updates are announced reliably — conditionally mounting a live region often means the announcement
  is missed. It is `polite`, not `assertive`, because validation updates as you type and must not
  interrupt.
- The **character counter is deliberately not a live region**. Announcing a new number on every
  keystroke would be unusable; screen reader users get the count on focus via `aria-describedby`.
- The progress bar is `aria-hidden` because it only repeats the numbers next to it.
- Status is conveyed by **icon and wording as well as colour**, so it does not rely on colour alone.
- The publish button's accessible name includes the target platform ("Publish post to LinkedIn"), so
  it still makes sense read out of context.
- `prefers-reduced-motion` is respected.

---

## Running the Project

```bash
npm install
```

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

Other scripts:

```bash
npm run build
```

```bash
npm run preview
```

```bash
npm run lint
```

```bash
npm run format
```

---

## Testing

This experiment has no automated test suite; `postValidation.js` was written as a pure function
specifically so one can be added without refactoring. The following was verified manually in the
browser:

| Case               | Result                                                                               |
| ------------------ | ------------------------------------------------------------------------------------ |
| Empty state        | 0/280, "Empty" status, publish disabled                                              |
| Whitespace only    | Counter shows 5, status still "Empty", publish disabled                              |
| Valid state        | 120/280, "Ready" status, publish enabled                                             |
| Warning state      | 262/280 (93.6%), amber warning, publish still enabled                                |
| Error state        | 330/280, "50 over limit", red border, publish disabled                               |
| Platform switching | Same 330-char draft: error on X → ready on LinkedIn, limits and button label updated |
| Publish flow       | Loading state → success notice → content cleared → back to empty state               |
| Emoji counting     | `👍👨‍👩‍👧‍👦🇹🇿` counts as 3, not 17                                                         |
| Responsive         | 375px, 768px and 1280px; no horizontal overflow                                      |
| Keyboard           | Arrow keys move platform selection and recalculate validation                        |
| Console            | No errors or React warnings                                                          |
| Lint / build       | `npm run lint` clean, `npm run build` succeeds                                       |

### Draft management (1.1.2)

| Case                | Result                                                                          |
| ------------------- | ------------------------------------------------------------------------------- |
| Create draft        | Saved, appears in list, composer binds to it and button becomes "Update draft"  |
| Persistence         | Written to `localStorage` with all five fields; survives a full page reload     |
| Update draft        | Still one record — content changed, `updatedAt` advanced, no duplicate created  |
| Load draft          | Restores content **and** platform; limit switched 280 → 3,000                   |
| Stop editing        | Composer resets, badge and banner clear, button returns to "Save draft"         |
| Delete              | First click arms "Confirm", second deletes from list and storage                |
| Delete auto-revert  | Confirmation reverts to "Delete" if left untouched                              |
| Publish a draft     | Draft removed from list and storage; success notice shown                       |
| Load error          | Corrupted stored JSON → scoped error + "Try again"; composer still usable       |
| Retry               | Recovered to 2 drafts without a page reload                                     |
| Search / filter     | 25 drafts → search and platform filter narrow the list; paging resets           |
| Incremental render  | 25 drafts stored, 6 rendered; "Show more" steps 6 → 12 → 18                     |
| Re-render isolation | **82 keystrokes produced 0 draft-row renders** (measured via temporary counter) |
| Responsive          | 375px and 1280px with 25 drafts; no horizontal overflow                         |

The re-render figure was measured by temporarily incrementing a counter inside `DraftListItem`,
confirming the counter was live (4 renders for 2 rows on mount, doubled by StrictMode), then
removing the instrumentation.

### Centralized state (1.2.1)

| Case                  | Result                                                                        |
| --------------------- | ----------------------------------------------------------------------------- |
| Store shape           | Four slices; `platforms`, `drafts`, `posts` all `{ ids, entities, … }`        |
| Adapter sorting       | `drafts.ids` verified in `updatedAt` descending order without any manual sort |
| Platform selection    | Radio → `platformSelected` → store `x` → `linkedin`; limit followed to 3,000  |
| Create draft (thunk)  | 3 → 4 entities, `isSaving` reset, composer bound to the new id                |
| Update draft          | `upsertOne` kept the count at 4, same id, `updatedAt` advanced                |
| Publish               | `posts` 1 → 2, draft removed from `drafts` and storage, notice shown          |
| Delete draft          | Two-step confirm → removed from store and `localStorage`                      |
| Delete published post | `posts` 2 → 1, storage followed                                               |
| Scoped errors         | Corrupted drafts storage → `drafts.status: error` while `posts.status: ready` |
| Retry                 | Recovered to 4 drafts without a page reload                                   |
| Per-row re-render     | Saving one draft re-rendered **only that row** — other four rows 0            |
| Keystroke isolation   | 80 keystrokes → **0** draft-row renders, after the migration                  |
| Responsive            | 375px; three panels stack, no horizontal overflow                             |
| Console               | No errors or React warnings                                                   |

Store shape and per-row render counts were measured by temporarily exposing the store on `window`
and incrementing a per-id counter in `DraftListItem`; both were removed before committing.

One bug was found and fixed this way: publishing an open draft dispatched `composerReset()`, which
bumped `sessionId` and remounted the composer before its success notice could render. A dedicated
`composerUnbound` action now detaches from the draft without remounting.

### Selector optimisation (1.2.2)

Measured with `selector.recomputations()` (built into Reselect) and temporary render counters, all
removed before committing. Dataset: 40 drafts of ~945 characters.

| Case                               | Result                                                             |
| ---------------------------------- | ------------------------------------------------------------------ |
| Memoized vs unmemoized, 200 runs   | **0.6 ms** vs **1,659 ms** — same result, 0 recomputations         |
| Typing 78 chars in the composer    | **0** recomputations across all 5 derived selectors                |
| Typing in the composer             | 0 insights renders, 0 draft-row renders                            |
| Typing in search                   | 0 composer renders, 0 insights renders (rows change, as they must) |
| Search case change `draft`→`DRAFT` | 0 recomputations — normalizes to the same query                    |
| Search trailing space              | 0 recomputations                                                   |
| Genuinely new query                | exactly 1 recomputation                                            |
| Search cycle `''→a→ab→abc→ab→a→''` | **3** recomputations, not 7 — `weakMapMemoize` cache hits          |
| Over-limit stat                    | Correct across slices (draft content × platform limit)             |
| Responsive                         | 375px, four panels stack, no horizontal overflow                   |
| Console                            | No errors or React warnings                                        |

### JWT authentication (1.3.1)

Verified in the browser against the running dev server. The signature check was confirmed
_independently_ — the token was copied out of the app and re-verified with a separate HMAC-SHA256
implementation outside the browser, so "it works" does not rest on the same code that produced it.

| Case                         | Result                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------- |
| Unauthenticated app          | Workspace never mounts; login screen renders instead                            |
| Wrong password               | "Email or password is incorrect."; no token written                             |
| Unknown email                | Same message as a wrong password — no user enumeration                          |
| Valid login                  | Workspace renders; drafts and posts load, so the requests passed verification   |
| Token structure              | Three segments; header `{ alg: 'HS256', typ: 'JWT' }`, `exp - iat` = 600s       |
| Signature (external check)   | Re-signed with the secret in Python — **matches**                               |
| Storage default              | `sessionStorage` only; `localStorage` empty                                     |
| "Keep me signed in"          | `localStorage` only; `sessionStorage` empty — never both                        |
| Authenticated write          | Saved draft stamped `authorId: usr_ava_mitchell` from the token, not the caller |
| Reload                       | Session restored from the stored token; no login screen, no flash               |
| Expired token (real, signed) | Injected into storage → next save refused, session ended, notice shown          |
| Refused request              | Draft count unchanged — the handler never ran                                   |
| Post-401 cleanup             | Token removed from **both** stores by the response interceptor                  |
| Second user                  | Signed in as `noah@dpc.dev`; token payload carried `role: editor`               |
| Console                      | No errors or React warnings                                                     |
| Lint / build                 | `npm run lint` clean, `npm run build` succeeds                                  |

The expired-token case used a genuinely signed token with `exp` in the past, minted outside the app
with the same secret — so it exercised the expiry branch specifically, not the invalid-signature
branch.

---

## Future Experiments

The current structure leaves specific places for later work:

- **Calendar and scheduling views** — the PDF's stated end goal for selectors. A `scheduledFor`
  field on the draft record plus a `selectDraftsByDay` selector composed from `selectAllDrafts`
  would follow the same pipeline as the insights panel.
- **List virtualization** — paging currently caps rendered rows at six at a time. Past a few hundred
  drafts, windowing would replace it; the selectors already return ids, which is what a virtualizer
  wants.
- **Richer platform rules** — extend `platforms.js` and add cases to `resolveStatus` in
  `postValidation.js`. No component changes required.
- **Retry logic and toast notifications** (Experiment 1, Assignment 4) — `localCollection.js` is the
  natural place to wrap calls in a retry helper; the slices already model the error states a toast
  would announce.
- **Post previews** — a new `PostPreview` component reading `content` and the selected platform.
- **Media support** — add a field to the draft record and a media rule to the validation module;
  the result object grows a field rather than changing shape.
- **Scheduling** — drafts already carry timestamps; a `scheduledFor` field extends the same record,
  and a `calendar` view would be a selector over the existing `posts` slice.
- **Backend APIs and persistence** — `services/localCollection.js` is the only code that touches
  storage; swapping it for HTTP calls needs no component or slice changes, because the thunks
  already model latency and failure. `postValidation.js` is framework-free and can be shared with
  the server so the same rules run in both places.
- **RBAC and protected routes** (Experiment 3.2) — the `role` claim is already issued and read into
  `auth.user`. What is missing is a permissions map and route-level guards; the gate in `App.jsx` is
  the same check a `ProtectedRoute` performs, applied once at the root instead of per route.
- **Token refresh** (Experiment 3.2, Assignment 5) — `apiClient.js` currently discards a dead token
  at the one point that detects it. A refresh flow replaces that single branch: request a new access
  token, then retry the original request.
- **A real auth backend** — deleting `services/authApi.js` and pointing `login` at an endpoint is
  the whole migration. `jwt.js` moves server-side with it; the store, the API client and the UI do
  not change, because none of them ever handled a password or the secret.
- **HTTP-only cookies** — the storage decision is isolated in `tokenStorage.js`, so once a backend
  can set a cookie, that file shrinks rather than spreads.

---

## Note on Character Limits

The limits in `platforms.js` are the publicly documented limits for a standard text post
(Facebook 63,206 · X 280 · LinkedIn 3,000 · Instagram 2,200). They are simplified: premium tiers,
media captions and thread continuations use different limits and are out of scope for this
experiment.
