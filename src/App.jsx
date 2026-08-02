import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, PenLine } from 'lucide-react';
import {
  AUTH_STATUS,
  restoreSession,
  selectAuthStatus,
  selectIsAuthenticated,
} from './store/authSlice';
import AccountBadge from './components/auth/AccountBadge';
import LoginScreen from './components/auth/LoginScreen';
import ComposerWorkspace from './components/workspace/ComposerWorkspace';

/**
 * Application shell, and now the one place that decides whether there is a
 * session at all.
 *
 * The gate lives here rather than inside the workspace so the composer stays
 * unaware of authentication: it is only ever mounted for a signed-in user, so it
 * never has to ask. When routing arrives in Experiment 3.2 this same check
 * becomes the route guard, applied per route instead of once at the root.
 */
export default function App() {
  const dispatch = useDispatch();

  const status = useSelector(selectAuthStatus);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Verifying a stored token is asynchronous, so the app starts in a third state
  // that is neither signed in nor signed out.
  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  if (status === AUTH_STATUS.RESTORING) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Restoring your session…
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <PenLine aria-hidden="true" className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-tight">Dynamic Post Composer</h1>
            <p className="truncate text-xs text-slate-500">
              Platform-aware drafting with live validation and saved drafts
            </p>
          </div>
          <AccountBadge />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <ComposerWorkspace />
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
        <p className="text-xs text-slate-400">
          Experiments 1–3 — Post composer, Redux state &amp; JWT authentication — Full Stack-II
        </p>
      </footer>
    </div>
  );
}
