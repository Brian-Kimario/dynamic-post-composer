import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AlertCircle, Info, Loader2, Lock, LogIn, Mail, PenLine, X } from 'lucide-react';
import {
  AUTH_STATUS,
  logIn,
  noticeDismissed,
  selectAuthError,
  selectAuthNotice,
  selectAuthStatus,
} from '../../store/authSlice';
import { DEMO_ACCOUNTS } from '../../services/authApi';

/**
 * The credentials screen.
 *
 * Field values stay in local state for the same reason the composer's content
 * does — they change on every keystroke and nothing outside this form reads
 * them. A password in the Redux store would also be a password in the DevTools
 * action log, which is a good enough reason on its own.
 */
export default function LoginScreen() {
  const dispatch = useDispatch();

  const status = useSelector(selectAuthStatus);
  const error = useSelector(selectAuthError);
  const notice = useSelector(selectAuthNotice);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const isSubmitting = status === AUTH_STATUS.AUTHENTICATING;
  const canSubmit = email.trim() !== '' && password !== '' && !isSubmitting;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    dispatch(logIn({ email, password, rememberMe }));
  };

  const fillDemoAccount = (account) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
      <main className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white">
            <PenLine aria-hidden="true" className="size-5" />
          </span>
          <h1 className="mt-3 text-lg font-semibold tracking-tight">Dynamic Post Composer</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to reach your drafts and posts.</p>
        </div>

        {/* An expired session is not a failed login attempt, so it reads as
            information rather than as an error the user got wrong. */}
        {notice && (
          <div
            role="status"
            className="mt-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900"
          >
            <Info aria-hidden="true" className="mt-px size-4 shrink-0 text-amber-600" />
            <p className="flex-1">{notice}</p>
            <button
              type="button"
              onClick={() => dispatch(noticeDismissed())}
              aria-label="Dismiss message"
              className="-m-1 rounded-md p-1 text-amber-700 transition hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="login-email" className="text-xs font-medium text-slate-700">
                Email
              </label>
              <div className="relative mt-1.5">
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  placeholder="you@dpc.dev"
                  aria-describedby={error ? 'login-error' : undefined}
                  className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm text-slate-900 transition outline-none placeholder:text-slate-400 focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="text-xs font-medium text-slate-700">
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-describedby={error ? 'login-error' : undefined}
                  className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm text-slate-900 transition outline-none placeholder:text-slate-400 focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/20"
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="mt-0.5 size-3.5 rounded border-slate-300 text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/20"
              />
              <span>
                Keep me signed in
                <span className="mt-0.5 block text-slate-400">
                  Stores the token in localStorage instead of sessionStorage, so it survives closing
                  the tab.
                </span>
              </span>
            </label>

            {error && (
              <p
                id="login-error"
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-900"
              >
                <AlertCircle aria-hidden="true" className="mt-px size-4 shrink-0 text-red-600" />
                <span className="flex-1">{error}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn aria-hidden="true" className="size-4" />
                  Sign in
                </>
              )}
            </button>
          </div>
        </form>

        <section aria-label="Demo accounts" className="mt-5">
          <h2 className="text-xs font-medium text-slate-500">
            Demo accounts — password <code className="text-slate-700">composer123</code>
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => fillDemoAccount(account)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left transition hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-slate-900">
                      {account.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{account.email}</span>
                  </span>
                  {/* Roles are issued in the token from this experiment on, but
                      nothing enforces them until 3.2 adds permissions. */}
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-600">
                    {account.role}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-5 text-center text-xs text-slate-400">
          Authentication is simulated in the browser — no server is contacted.
        </p>
      </main>
    </div>
  );
}
