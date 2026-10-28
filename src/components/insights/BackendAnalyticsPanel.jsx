import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, Server } from 'lucide-react';
import { statsApi } from '../../services/live/collections';

/**
 * Analytics computed by the backend (native SQL aggregates from experiment 2.2),
 * as opposed to the sibling panel that derives numbers from the browser's own
 * store. It holds its own load state because nothing else needs this data.
 */
export default function BackendAnalyticsPanel() {
  const [state, setState] = useState({ status: 'loading', stats: null, error: null });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    statsApi
      .overview()
      .then((stats) => !cancelled && setState({ status: 'ready', stats, error: null }))
      .catch((error) => !cancelled && setState({ status: 'error', stats: null, error }));

    return () => {
      cancelled = true;
    };
  }, [reloadCount]);

  const reload = () => {
    setState((current) => ({ ...current, status: 'loading' }));
    setReloadCount((count) => count + 1);
  };

  return (
    <section
      aria-label="Backend analytics"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <Server aria-hidden="true" className="size-4 text-slate-500" />
          Live analytics
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-medium text-emerald-700">
            from Spring Boot API
          </span>
        </h2>
        <button
          type="button"
          onClick={reload}
          disabled={state.status === 'loading'}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw aria-hidden="true" className="size-3" />
          Refresh
        </button>
      </div>

      {state.status === 'loading' && !state.stats && (
        <p role="status" className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          Loading analytics…
        </p>
      )}

      {state.status === 'error' && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-700"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {state.error.message}
        </p>
      )}

      {state.stats && <Breakdown stats={state.stats} />}
    </section>
  );
}

function Breakdown({ stats }) {
  const { byPlatformAndStatus, topAuthors, topPosts } = stats;

  return (
    <div className="mt-4 grid gap-5 lg:grid-cols-3">
      <div>
        <h3 className="text-xs font-medium text-slate-500">Posts by platform and status</h3>
        <table className="mt-2 w-full text-xs">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1 font-medium">Platform</th>
              <th className="py-1 font-medium">Status</th>
              <th className="py-1 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {byPlatformAndStatus.map((row) => (
              <tr key={`${row.platformId}-${row.status}`} className="border-t border-slate-100">
                <td className="py-1.5 text-slate-700 capitalize">{row.platformId}</td>
                <td className="py-1.5 text-slate-500 lowercase">{row.status}</td>
                <td className="py-1.5 text-right text-slate-900 tabular-nums">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-xs font-medium text-slate-500">Most active authors</h3>
        <ol className="mt-2 flex flex-col gap-1.5 text-xs">
          {topAuthors.map((author) => (
            <li key={author.author} className="flex justify-between gap-2">
              <span className="truncate text-slate-700">{author.author}</span>
              <span className="text-slate-900 tabular-nums">{author.total}</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="text-xs font-medium text-slate-500">Top posts by likes</h3>
        <ol className="mt-2 flex flex-col gap-1.5 text-xs">
          {topPosts.map((post) => (
            <li key={post.id} className="flex justify-between gap-2">
              <span className="truncate text-slate-700">{post.content}</span>
              <span className="text-slate-900 tabular-nums">{post.likes}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
