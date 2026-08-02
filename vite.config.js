// `defineConfig` comes from vitest/config, not vite: it is the same function
// extended to understand the `test` block below. Vite's own would silently
// ignore it, and every test would run in a Node environment with no DOM.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  /**
   * Tests run through Vitest rather than Jest.
   *
   * The course brief names Jest, and the tests themselves are written against
   * the Jest API — `describe`, `it`, `expect`, spies — so what is being learned
   * transfers unchanged. What differs is the runner: this is an ESM project built
   * by Vite, and Jest would need its own Babel transform, module resolution and
   * JSX pipeline configured alongside Vite's. Vitest reuses the config above, so
   * the tests import modules exactly the way the app does. React Testing Library,
   * the part the brief is actually about, is identical either way.
   */
  test: {
    // Browser-shaped globals for component tests: DOM, localStorage, Web Crypto.
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // The subjects of this experiment: the calendar, its state and its date
      // arithmetic. Config, entry points and presentational shells are excluded
      // so the number reflects logic that can actually break.
      include: [
        'src/utils/calendar.js',
        'src/utils/postValidation.js',
        'src/store/scheduleSlice.js',
        'src/store/calendarSlice.js',
        'src/store/selectors.js',
        'src/components/calendar/**',
        'src/hooks/useScheduleDropTarget.js',
      ],
    },
  },
});
