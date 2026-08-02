import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AlertCircle, FileText, Loader2, RotateCw, Search, X } from 'lucide-react';
import {
  actionErrorDismissed,
  fetchDrafts,
  selectDraftCount,
  selectDraftsActionError,
  selectDraftsError,
  selectDraftsStatus,
  REQUEST_STATUS,
} from '../../store/draftsSlice';
import {
  moreDraftsRequested,
  platformFilterChanged,
  searchTermChanged,
  selectPlatformFilter,
  selectSearchTerm,
} from '../../store/filtersSlice';
import {
  selectFilteredDraftCount,
  selectHasMoreDrafts,
  selectHiddenDraftCount,
  selectVisibleDraftIds,
} from '../../store/selectors';
import { selectAllPlatforms } from '../../store/platformsSlice';
import DraftListItem from './DraftListItem';

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

/**
 * Reads only what it renders. The filtering, paging and counting all happen in
 * memoized selectors, so this component holds no derived state of its own and
 * has no `useMemo` left in it.
 *
 * Selecting `selectVisibleDraftIds` rather than whole draft objects means the
 * panel re-renders only when the *set of visible ids* changes — editing a
 * draft's text re-renders that one row and nothing else.
 */
export default function DraftsPanel() {
  const dispatch = useDispatch();

  const status = useSelector(selectDraftsStatus);
  const error = useSelector(selectDraftsError);
  const actionError = useSelector(selectDraftsActionError);
  const platforms = useSelector(selectAllPlatforms);

  const totalDraftCount = useSelector(selectDraftCount);
  const filteredCount = useSelector(selectFilteredDraftCount);
  const visibleDraftIds = useSelector(selectVisibleDraftIds);
  const hasMore = useSelector(selectHasMoreDrafts);
  const hiddenCount = useSelector(selectHiddenDraftCount);

  const searchTerm = useSelector(selectSearchTerm);
  const platformFilter = useSelector(selectPlatformFilter);

  // The panel owns loading its own data, so no parent has to orchestrate it.
  useEffect(() => {
    dispatch(fetchDrafts());
  }, [dispatch]);

  // Stable identities so the memoized rows below are never invalidated by a
  // freshly created handler.
  const handleSearchChange = useCallback(
    (event) => dispatch(searchTermChanged(event.target.value)),
    [dispatch],
  );
  const handlePlatformChange = useCallback(
    (event) => dispatch(platformFilterChanged(event.target.value)),
    [dispatch],
  );
  const handleShowMore = useCallback(() => dispatch(moreDraftsRequested()), [dispatch]);
  const handleRetry = useCallback(() => dispatch(fetchDrafts()), [dispatch]);

  return (
    <section
      aria-label="Saved drafts"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Saved drafts
          {status === REQUEST_STATUS.READY && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {totalDraftCount}
            </span>
          )}
        </h2>

        {status === REQUEST_STATUS.READY && totalDraftCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search drafts"
                aria-label="Search drafts"
                className="w-40 rounded-lg border border-slate-300 py-1.5 pr-2 pl-8 text-xs text-slate-900 transition outline-none placeholder:text-slate-400 focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/20"
              />
            </div>

            <select
              value={platformFilter}
              onChange={handlePlatformChange}
              aria-label="Filter drafts by platform"
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-900 transition outline-none focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/20"
            >
              <option value="all">All platforms</option>
              {platforms.map((platform) => (
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
            onClick={() => dispatch(actionErrorDismissed())}
            aria-label="Dismiss error"
            className="-m-1 rounded-md p-1 text-red-700 transition hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-none"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}

      <div className="mt-4">
        {status === REQUEST_STATUS.LOADING && (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Loading drafts…
          </p>
        )}

        {status === REQUEST_STATUS.ERROR && (
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
              onClick={handleRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <RotateCw aria-hidden="true" className="size-3.5" />
              Try again
            </button>
          </div>
        )}

        {status === REQUEST_STATUS.READY &&
          (filteredCount === 0 ? (
            <DraftsEmptyState hasDrafts={totalDraftCount > 0} />
          ) : (
            <>
              <ul className="flex flex-col gap-2.5">
                {visibleDraftIds.map((draftId) => (
                  <DraftListItem key={draftId} draftId={draftId} />
                ))}
              </ul>

              {hasMore && (
                <button
                  type="button"
                  onClick={handleShowMore}
                  className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Show more ({hiddenCount} remaining)
                </button>
              )}
            </>
          ))}
      </div>
    </section>
  );
}
