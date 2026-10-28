import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BarChart3 } from 'lucide-react';
import { fetchDrafts } from '../store/draftsSlice';
import { fetchPosts } from '../store/postsSlice';
import { selectContentSummary } from '../store/selectors';
import ContentInsightsPanel from '../components/insights/ContentInsightsPanel';
import BackendAnalyticsPanel from '../components/insights/BackendAnalyticsPanel';
import { USE_BACKEND } from '../services/config';

/**
 * Insights read entirely from the drafts and posts slices, and with routing a
 * user can land here directly without ever visiting the library — so this page
 * has to load the data it summarises rather than assuming another panel already
 * did. Both thunks are cheap to re-issue and idempotent.
 */
export default function InsightsPage() {
  const dispatch = useDispatch();
  const summary = useSelector(selectContentSummary);

  useEffect(() => {
    dispatch(fetchDrafts());
    dispatch(fetchPosts());
  }, [dispatch]);

  // The panel renders nothing when there is nothing to summarise, which is right
  // inside a stack of other panels and wrong as a whole page.
  const isEmpty = summary.draftCount === 0 && summary.postCount === 0;

  if (USE_BACKEND) {
    return (
      <div className="flex flex-col gap-6">
        <BackendAnalyticsPanel />
        {!isEmpty && <ContentInsightsPanel />}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-12 text-center">
        <BarChart3 aria-hidden="true" className="mx-auto size-6 text-slate-300" />
        <p className="mt-2 text-sm font-medium text-slate-700">Nothing to summarise yet</p>
        <p className="mt-1 text-xs text-slate-500">
          Insights appear once the workspace has drafts or published posts.
        </p>
      </div>
    );
  }

  return <ContentInsightsPanel />;
}
