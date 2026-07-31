import { useMemo, useState } from 'react';
import { AlertCircle, FileText, Loader2, RotateCw, Search, X } from 'lucide-react';
import { DRAFTS_STATUS } from '../../hooks/useDrafts';
import { PLATFORM_LIST } from '../../config/platforms';
import DraftListItem from './DraftListItem';

/** Rendered in pages so a large draft list never mounts hundreds of rows at once. */
const PAGE_SIZE = 6;

function DraftsEmptyState({ hasDrafts }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
      <FileText aria-hidden="true" className="mx-auto size-6 text-slate-300" />
      <p className="mt-2 text-sm font-medium text-slate-700">
        {hasDrafts ? 'No drafts match your filters' : 'No drafts yet'}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {hasDrafts
          ? 'Try a different search term or platform.'
          : 'Write a post and choose Save draft to keep it for later.'}
      </p>
    </div>
  );
}

export default function DraftsPanel({
  status,
  drafts,
  error,
  actionError,
  pendingIds,
  activeDraftId,
  onEditDraft,
  onDeleteDraft,
  onReload,
  onDismissActionError,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /**
   * Derived from drafts + filters rather than stored in state, the same rule
   * the composer follows. Memoised because filtering and sorting the whole list
   * would otherwise re-run on unrelated re-renders, such as a row's delete
   * confirmation toggling.
   */
  const filteredDrafts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return drafts
      .filter((draft) => platformFilter === 'all' || draft.platformId === platformFilter)
      .filter((draft) => query === '' || draft.content.toLowerCase().includes(query))
      .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [drafts, platformFilter, searchTerm]);

  const visibleDrafts = filteredDrafts.slice(0, visibleCount);
  const hasMore = filteredDrafts.length > visibleCount;

  return (
    <section
      aria-label="Saved drafts"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Saved drafts
          {status === DRAFTS_STATUS.READY && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {drafts.length}
            </span>
          )}
        </h2>

        {status === DRAFTS_STATUS.READY && drafts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder="Search drafts"
                aria-label="Search drafts"
                className="w-40 rounded-lg border border-slate-300 py-1.5 pr-2 pl-8 text-xs text-slate-900 transition outline-none placeholder:text-slate-400 focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/20"
              />
            </div>

            <select
              value={platformFilter}
              onChange={(event) => {
                setPlatformFilter(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              aria-label="Filter drafts by platform"
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-900 transition outline-none focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/20"
            >
              <option value="all">All platforms</option>
              {PLATFORM_LIST.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* A failed create/update/delete leaves the list usable, so it is shown as
          a dismissible banner rather than replacing the whole panel. */}
      {actionError && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-900"
        >
          <AlertCircle aria-hidden="true" className="mt-px size-4 shrink-0 text-red-600" />
          <p className="flex-1">{actionError}</p>
          <button
            type="button"
            onClick={onDismissActionError}
            aria-label="Dismiss error"
            className="-m-1 rounded-md p-1 text-red-700 transition hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-none"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}

      <div className="mt-4">
        {status === DRAFTS_STATUS.LOADING && (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Loading drafts…
          </p>
        )}

        {status === DRAFTS_STATUS.ERROR && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-4 text-sm text-red-900"
          >
            <p className="flex items-start gap-2.5">
              <AlertCircle aria-hidden="true" className="mt-px size-4 shrink-0 text-red-600" />
              <span className="flex-1">{error}</span>
            </p>
            <button
              type="button"
              onClick={onReload}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <RotateCw aria-hidden="true" className="size-3.5" />
              Try again
            </button>
          </div>
        )}

        {status === DRAFTS_STATUS.READY &&
          (filteredDrafts.length === 0 ? (
            <DraftsEmptyState hasDrafts={drafts.length > 0} />
          ) : (
            <>
              <ul className="flex flex-col gap-2.5">
                {visibleDrafts.map((draft) => (
                  <DraftListItem
                    key={draft.id}
                    draft={draft}
                    isActive={draft.id === activeDraftId}
                    isPending={pendingIds.includes(draft.id)}
                    onEdit={onEditDraft}
                    onDelete={onDeleteDraft}
                  />
                ))}
              </ul>

              {hasMore && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Show more ({filteredDrafts.length - visibleCount} remaining)
                </button>
              )}
            </>
          ))}
      </div>
    </section>
  );
}
