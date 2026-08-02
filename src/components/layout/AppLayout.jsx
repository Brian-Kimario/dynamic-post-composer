import { Outlet } from 'react-router';
import { PenLine } from 'lucide-react';
import AccountBadge from '../auth/AccountBadge';
import PrimaryNav from './PrimaryNav';

/**
 * The chrome every signed-in page shares: header, navigation, footer. Pages drop
 * into the `<Outlet />`.
 *
 * Sitting inside `RequireAuth` means it never renders for an anonymous visitor,
 * so nothing in here needs to ask whether there is a user.
 */
export default function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900">
      <header className="bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
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

        <PrimaryNav />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6">
        <p className="text-xs text-slate-400">
          Experiments 1–3 — Composer, Redux state, JWT auth &amp; RBAC — Full Stack-II
        </p>
      </footer>
    </div>
  );
}
