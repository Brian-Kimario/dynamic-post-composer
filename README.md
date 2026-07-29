# Dynamic Post Composer (DPC)

A multi-platform social media post composer with platform-specific constraint validation.

Compose a single draft and check it against the character limits of Facebook, X, LinkedIn and
Instagram, with live character counting, warning and error states, and accessible feedback.

Built as a progressively extended project for Full Stack-II. This repository currently contains
**Experiment 1.1.1**.

---

## Experiment 1.1.1

**Title:** Dynamic Post Composer with Platform-Specific Constraint Validation

**Aim:** To design and develop a dynamic post composer interface supporting multiple platforms with
constraint validation.

### Scope

This experiment covers the composer, its platform configuration model, and client-side validation.
It deliberately stops there. There is no backend, no persistence, no authentication and no real
social media integration — publishing is simulated in the browser. The architecture is arranged so
those can be added later without restructuring what exists.

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

No state management library is used. The application has two pieces of real state, so React's
built-in `useState` is sufficient — adding Redux or Zustand here would be cost without benefit.

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
PostComposer  ......... owns all state (via usePostComposer)
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

`PostComposer` is the only stateful component. Everything below it receives data through props and
reports user intent back through callbacks. This keeps the leaf components pure, predictable and
easy to reuse.

---

## Project Structure

```
src/
├── components/
│   └── post-composer/
│       ├── PostComposer.jsx          Container: owns state, composes the layout
│       ├── PlatformSelector.jsx      Platform radio group
│       ├── PostEditor.jsx            Controlled textarea
│       ├── CharacterCounter.jsx      Count, remaining, progress bar
│       ├── ValidationMessage.jsx     Status feedback (live region)
│       ├── PublishButton.jsx         Publish action and its states
│       └── PublishSuccessNotice.jsx  Post-publish confirmation
├── config/
│   └── platforms.js                  Platform rules and warning threshold
├── hooks/
│   └── usePostComposer.js            Composer state machine
├── utils/
│   └── postValidation.js             Pure validation logic
├── App.jsx                           Application shell
├── main.jsx                          React entry point
└── index.css                         Tailwind import and design tokens
```

Directories separate by _responsibility_, not by file type alone: configuration, logic, state and
presentation each have a home. Components are grouped in a `post-composer/` feature folder so that a
second feature added in a later experiment sits alongside it rather than inside it.

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
- **Hooks** — `useState`, `useMemo`, `useCallback`, `useRef` and `useEffect` (for timer cleanup),
  plus one custom hook.
- **Component composition** — `PostComposer` assembles smaller components rather than being one
  large component.

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

---

## Future Experiments

The current structure leaves specific places for later work:

- **Richer platform rules** — extend `platforms.js` and add cases to `resolveStatus` in
  `postValidation.js`. No component changes required.
- **Post previews** — a new `PostPreview` component reading the same `content` and `platform` props
  already available in `PostComposer`.
- **Media support** — add media state to `usePostComposer` and a media rule to the validation module;
  the result object grows a field rather than changing shape.
- **Drafts and scheduling** — `usePostComposer` is the seam. It already owns the full state machine,
  so persistence can be added there without touching presentational components.
- **Backend APIs and persistence** — the simulated `setTimeout` in `usePostComposer.publish` is the
  single place a real API call goes. `postValidation.js` is framework-free and can be shared with
  the server so the same rules run in both places.
- **Authentication and routing** — `App.jsx` is intentionally free of composer state, so a router
  and auth provider can wrap it without disturbing the composer.

---

## Note on Character Limits

The limits in `platforms.js` are the publicly documented limits for a standard text post
(Facebook 63,206 · X 280 · LinkedIn 3,000 · Instagram 2,200). They are simplified: premium tiers,
media captions and thread continuations use different limits and are out of scope for this
experiment.
