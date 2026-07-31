# Dynamic Post Composer (DPC)

A multi-platform social media post composer with platform-specific constraint validation.

Compose a single draft and check it against the character limits of Facebook, X, LinkedIn and
Instagram, with live character counting, warning and error states, and accessible feedback.

Drafts can be saved, listed, edited and deleted, and they persist in the browser across reloads.

Built as a progressively extended project for Full Stack-II. This repository currently contains
**Experiments 1.1.1 and 1.1.2**.

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

### Scope

There is still no real backend, no authentication and no social media integration — publishing is
simulated in the browser, and drafts are stored locally. Retry logic and toast notifications belong
to a later assignment and are deliberately not implemented yet. The architecture is arranged so all
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

No state management library is used, and no new dependency was added for Experiment 1.1.2. The app
has two state owners that barely interact, so React's built-in `useState` and `useReducer` are
sufficient — Redux or Zustand here would be cost without benefit.

---

## Architecture

Platform rules flow in one direction, from configuration through to what the user sees:

```
Platform Configuration   (src/config/platforms.js)
        ↓
Selected Platform        (usePostComposer state)
        ↓
Active Platform Rules    (characterLimit, warningThreshold)
        ↓
Validation               (src/utils/postValidation.js — pure function)
        ↓
UI Feedback              (counter, message, button disabled state)
```

The important property is that **no component ever branches on a platform id**. A component does not
ask "is this X?" — it reads `platform.characterLimit` and renders the validation result it was given.

### Data flow between components

```
PostComposer  ......... owns composer state (via usePostComposer)
    │
    ├── props ────────► PlatformSelector
    │                       └── callback (onSelectPlatform) ──► updates platform state
    │
    ├── props ────────► PostEditor
    │                       └── callback (onChange) ──────────► updates content state
    │
    ├── props ────────► CharacterCounter     (display only)
    ├── props ────────► ValidationMessage    (display only)
    └── props ────────► PublishButton
                            └── callback (onPublish) ─────────► runs simulated publish
```

Everything below `PostComposer` receives data through props and reports user intent back through
callbacks. This keeps the leaf components pure, predictable and easy to reuse.

### Where state lives, and why

`ComposerWorkspace` sits above both features and deliberately splits the state:

```
ComposerWorkspace ....... owns drafts (useDrafts) + which draft is being edited
    │
    ├── props ────────► PostComposer ...... owns post content + platform + publishing
    │                       └── callback (onSaveDraft) ──► create or update a draft
    │
    └── props ────────► DraftsPanel ....... owns search + filter + page size
                            └── callback (onEditDraft) ──► loads a draft into the composer
```

Post content lives _inside_ `PostComposer`, not in the workspace. That is the whole point: typing
re-renders only the composer subtree and never touches the draft list. Drafts live one level up
because two siblings need them. State is placed as low as it can go, and no lower.

Opening a draft works by changing `PostComposer`'s `key`, which remounts it with the draft as
initial state. Remounting is React's intended way to reset a component's state — the alternative,
an effect that copies props into state, is a well-known source of subtle bugs.

---

## Project Structure

```
src/
├── components/
│   ├── workspace/
│   │   └── ComposerWorkspace.jsx     Coordinates composer + drafts, owns draft state
│   ├── post-composer/
│   │   ├── PostComposer.jsx          Owns post content, platform, publishing
│   │   ├── PlatformSelector.jsx      Platform radio group
│   │   ├── PostEditor.jsx            Controlled textarea
│   │   ├── CharacterCounter.jsx      Count, remaining, progress bar
│   │   ├── ValidationMessage.jsx     Status feedback (live region)
│   │   ├── PublishButton.jsx         Publish action and its states
│   │   ├── SaveDraftButton.jsx       Save / update draft action
│   │   └── PublishSuccessNotice.jsx  Post-publish confirmation
│   └── drafts/
│       ├── DraftsPanel.jsx           List, search, filter, paging, load/error states
│       └── DraftListItem.jsx         One draft row (memoised)
├── config/
│   └── platforms.js                  Platform rules and warning threshold
├── hooks/
│   ├── usePostComposer.js            Composer state machine
│   └── useDrafts.js                  Draft state machine (useReducer + async CRUD)
├── services/
│   └── draftsApi.js                  Mock async API over localStorage
├── utils/
│   ├── postValidation.js             Pure validation logic
│   └── draftFormatting.js            Excerpts and relative timestamps
├── App.jsx                           Application shell
├── main.jsx                          React entry point
└── index.css                         Tailwind import and design tokens
```

Directories separate by _responsibility_, not by file type alone: configuration, logic, state and
presentation each have a home. Components are grouped into feature folders (`post-composer/`,
`drafts/`) so each feature stays self-contained.

---

## Draft Management Model

### The mock API layer

`services/draftsApi.js` exposes `fetchDrafts`, `createDraft`, `updateDraft` and `deleteDraft`. Every
one is `async` and returns a Promise, even though `localStorage` is synchronous. The latency is
simulated on purpose: it means the calling code is written against an asynchronous contract from day
one, so swapping in a real backend later changes only the bodies of these four functions.

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

`useDrafts` uses `useReducer` rather than several `useState` calls. One piece of data is mutated by
four async operations, each with its own start/success/error transition. A reducer keeps every legal
transition in one place — with separate `useState`s it is easy to set `isSaving` without clearing
`actionError` and end up in a state that should not exist.

Errors are split by blast radius. A failed _initial load_ replaces the panel with an error and a
retry button, because there is no list to show. A failed _create/update/delete_ shows a dismissible
banner above a list that still works.

### A deliberate asymmetry

A draft may exceed the platform character limit; only **publishing** is blocked. Being over the limit
is a normal state for work in progress, so the save path checks only that the content is non-empty.

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
- **State** — only two pieces of real state: `platformId` and `content`, plus publish status.
- **Controlled inputs** — the textarea's `value` comes from React state and every keystroke goes
  through `onChange`. React is the source of truth, which is what makes live validation possible.
- **Derived state** — character count, remaining characters and status are _computed_ from content
  and platform on each render, never stored. There is no second copy that can fall out of sync.
- **Event handling** — `onChange` and `onClick` handlers translate DOM events into state updates.
- **Conditional rendering** — the success notice renders only after publishing; the button swaps
  its label and icon while publishing.
- **Hooks** — `useState`, `useReducer`, `useMemo`, `useCallback`, `useRef` and `useEffect`, plus two
  custom hooks.
- **Component composition** — `PostComposer` assembles smaller components rather than being one
  large component.
- **`useReducer` for a state machine** — draft loading and CRUD have many related transitions, so
  they are expressed as one reducer instead of five loosely coupled `useState` calls.
- **Async workflows** — `async/await` with `try/catch`, and separate loading, success and error
  states for each operation.
- **Cleanup and stale closures** — every timer is cleared on unmount, and async completions are
  guarded by a mounted ref so a resolved request can never update an unmounted component.
- **`memo` and `useCallback` together** — rows are memoised, and their handlers are stable, so the
  memo actually holds. One without the other would do nothing.
- **Resetting state with `key`** — opening a draft remounts the composer rather than syncing props
  into state with an effect.

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

**A custom hook, but only one.** `usePostComposer` exists because publishing is genuinely stateful:
it is asynchronous, it clears content on success, and it owns timers that need cleanup. Bundling
that with the two `useState` calls keeps every state transition in one readable file and gives a
single seam where a real API call will replace the simulated publish. A hook was _not_ created for
validation — that is a pure function, and wrapping it in a hook would add indirection without
adding anything.

**`useMemo` is used once, and not for the reason people usually assume.** It does not speed up
typing: `content` changes on every keystroke, so validation necessarily re-runs then. It avoids
re-running grapheme segmentation when _unrelated_ state changes — publish status moving through
publishing → success → idle — while a long draft sits in the editor. Measured cost at a maxed-out
63,206-character Facebook post is ~10ms, which is why it is worth avoiding needlessly.

**Tailwind, with brand colours as CSS custom properties.** Tailwind can only generate classes it can
see as literal strings at build time, so a per-platform colour coming from data cannot be a dynamic
class name. Those are passed as a `--platform-accent` custom property instead; everything else uses
ordinary utilities.

**Post content stays inside the composer.** It would have been easier to lift every piece of state
into `ComposerWorkspace`, but then each keystroke would re-render the whole draft list. Keeping
content in `PostComposer` and drafts one level up means typing touches only the composer subtree.
Measured: 82 keystrokes produced **zero** draft-row renders.

**No state management library, and no Reselect.** The app has two state owners that barely interact,
so `useState` and `useReducer` are enough; Redux or Zustand would be ceremony. Reselect was
considered for the filtered draft list and rejected — its `createSelector` composes memoised
selectors over a _global store_, which does not exist here, and it arrives bundled with Redux
Toolkit in a later experiment anyway. A single `useMemo` does the same job today without the
dependency.

**Persistence hides behind an async API.** Drafts could have been written to `localStorage` directly
from the hook. Routing them through `services/draftsApi.js` instead means the components already
handle latency, loading states and failure — the parts that are genuinely hard about a real backend —
so that migration becomes a change to four function bodies.

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

---

## Future Experiments

The current structure leaves specific places for later work:

- **Richer platform rules** — extend `platforms.js` and add cases to `resolveStatus` in
  `postValidation.js`. No component changes required.
- **Retry logic and toast notifications** (Assignment 4) — `draftsApi.js` is the natural place to
  wrap calls in a retry helper; the reducer already models the error states a toast would announce.
- **Post previews** — a new `PostPreview` component reading the same `content` and `platform` props
  already available in `PostComposer`.
- **Media support** — add media state to `usePostComposer` and a media rule to the validation module;
  the result object grows a field rather than changing shape.
- **Scheduling** — drafts already carry timestamps; a `scheduledFor` field extends the same record.
- **Redux Toolkit** — `useDrafts` is the migration target. Its reducer already has the shape RTK
  expects, and `createSelector` (Reselect) arrives bundled for the derived draft lists.
- **Backend APIs and persistence** — the four functions in `services/draftsApi.js` are the only
  places that touch storage; swapping them for HTTP calls needs no component changes.
  `postValidation.js` is framework-free and can be shared with the server so the same rules run in
  both places.
- **Authentication and routing** — `App.jsx` is intentionally free of feature state, so a router
  and auth provider can wrap it without disturbing the composer.

---

## Note on Character Limits

The limits in `platforms.js` are the publicly documented limits for a standard text post
(Facebook 63,206 · X 280 · LinkedIn 3,000 · Instagram 2,200). They are simplified: premium tiers,
media captions and thread continuations use different limits and are out of scope for this
experiment.
