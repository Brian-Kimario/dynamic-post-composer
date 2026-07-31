import { memo } from 'react';
import { useSelector } from 'react-redux';
import { AlertTriangle, BarChart3, FileText, Send } from 'lucide-react';
import { selectContentSummary, selectPlatformBreakdown } from '../../store/selectors';

const Stat = memo(function Stat({ icon: Icon, label, value, tone = 'neutral' }) {
  const toneClass = tone === 'warning' ? 'text-amber-700' : 'text-slate-900';

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon aria-hidden="true" className="size-3.5" />
        {label}
      </div>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
});

/**
 * One row of the platform breakdown. Memoized because the breakdown array is
 * rebuilt only when counts actually change — but when it is, most rows are
 * unchanged, and `memo` keeps them from re-rendering.
 */
const BreakdownRow = memo(function BreakdownRow({ row }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        style={{ backgroundColor: row.accentColor }}
        className="flex size-5 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white"
      >
        {row.monogram}
      </span>
      <span className="flex-1 truncate text-xs font-medium text-slate-700">{row.name}</span>
      <span className="text-xs text-slate-500 tabular-nums">
        {row.drafts} draft{row.drafts === 1 ? '' : 's'} · {row.posts} published
      </span>
    </li>
  );
});

/**
 * Every number here is derived state — computed from the store by memoized
 * selectors rather than stored anywhere. Nothing in this panel can drift out of
 * sync with the drafts and posts it summarises, because there is no second copy
 * to drift.
 */
export default function ContentInsightsPanel() {
  const summary = useSelector(selectContentSummary);
  const breakdown = useSelector(selectPlatformBreakdown);

  if (summary.draftCount === 0 && summary.postCount === 0) return null;

  return (
    <section
      aria-label="Content insights"
      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm sm:p-6"
    >
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <BarChart3 aria-hidden="true" className="size-4 text-slate-500" />
        Content insights
      </h2>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat icon={FileText} label="Drafts" value={summary.draftCount} />
        <Stat icon={Send} label="Published" value={summary.postCount} />
        <Stat
          icon={AlertTriangle}
          label="Over limit"
          value={summary.overLimitCount}
          tone={summary.overLimitCount > 0 ? 'warning' : 'neutral'}
        />
        <Stat icon={BarChart3} label="Avg. length" value={summary.averageDraftLength} />
      </div>

      {breakdown.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {breakdown.map((row) => (
            <BreakdownRow key={row.id} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}
