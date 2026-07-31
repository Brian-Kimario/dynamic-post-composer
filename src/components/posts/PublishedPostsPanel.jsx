import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AlertCircle, Loader2, RotateCw, Send, X } from 'lucide-react';
import {
  fetchPosts,
  postsActionErrorDismissed,
  selectAllPosts,
  selectPostsActionError,
  selectPostsError,
  selectPostsStatus,
} from '../../store/postsSlice';
import { REQUEST_STATUS } from '../../store/draftsSlice';
import PublishedPostItem from './PublishedPostItem';

export default function PublishedPostsPanel() {
  const dispatch = useDispatch();

  const posts = useSelector(selectAllPosts);
  const status = useSelector(selectPostsStatus);
  const error = useSelector(selectPostsError);
  const actionError = useSelector(selectPostsActionError);

  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch]);

  return (
    <section
      aria-label="Published posts"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <h2 className="text-sm font-semibold text-slate-900">
        Published posts
        {status === REQUEST_STATUS.READY && (
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {posts.length}
          </span>
        )}
      </h2>

      {actionError && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-900"
        >
          <AlertCircle aria-hidden="true" className="mt-px size-4 shrink-0 text-red-600" />
          <p className="flex-1">{actionError}</p>
          <button
            type="button"
            onClick={() => dispatch(postsActionErrorDismissed())}
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
            Loading published posts…
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
              onClick={() => dispatch(fetchPosts())}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <RotateCw aria-hidden="true" className="size-3.5" />
              Try again
            </button>
          </div>
        )}

        {status === REQUEST_STATUS.READY &&
          (posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
              <Send aria-hidden="true" className="mx-auto size-6 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-700">Nothing published yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Published posts are simulated and stored locally.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {posts.map((post) => (
                <PublishedPostItem key={post.id} postId={post.id} />
              ))}
            </ul>
          ))}
      </div>
    </section>
  );
}
