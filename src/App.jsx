import { PenLine } from 'lucide-react';
import PostComposer from './components/post-composer/PostComposer';

/**
 * Application shell. Kept free of composer state so that a later experiment can
 * introduce routing here without touching the composer itself.
 */
export default function App() {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <span className="flex size-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <PenLine aria-hidden="true" className="size-4.5" />
          </span>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Dynamic Post Composer</h1>
            <p className="text-xs text-slate-500">Platform-aware drafting with live validation</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <PostComposer />
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
        <p className="text-xs text-slate-400">Experiment 1.1.1 — Full Stack-II</p>
      </footer>
    </div>
  );
}
