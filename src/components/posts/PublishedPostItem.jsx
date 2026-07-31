import { memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, Trash2 } from 'lucide-react';
import { deletePost, selectIsPostPending, selectPostById } from '../../store/postsSlice';
import { selectPlatformById } from '../../store/platformsSlice';
import { buildExcerpt, formatAbsoluteTime, formatRelativeTime } from '../../utils/draftFormatting';

/** Same normalized pattern as DraftListItem: takes an id, reads its own entity. */
function PublishedPostItem({ postId }) {
  const dispatch = useDispatch();

  const post = useSelector((state) => selectPostById(state, postId));
  const isPending = useSelector((state) => selectIsPostPending(state, postId));
  const platform = useSelector((state) =>
    post ? selectPlatformById(state, post.platformId) : undefined,
  );

  // A removed post leaves the store before this row unmounts.
  if (!post) return null;

  return (
    <li
      className={`rounded-xl border border-slate-200 bg-white p-3.5 transition ${
        isPending ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            style={{ backgroundColor: platform.accentColor }}
            className="flex size-6 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
          >
            {platform.monogram}
          </span>
          <span className="truncate text-xs font-semibold text-slate-900">{platform.name}</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
            Published
          </span>
        </div>

        <time
          dateTime={post.createdAt}
          title={formatAbsoluteTime(post.createdAt)}
          className="shrink-0 text-xs text-slate-400"
        >
          {formatRelativeTime(post.createdAt)}
        </time>
      </div>

      <p className="mt-2 text-sm break-words text-slate-700">{buildExcerpt(post.content)}</p>

      <div className="mt-3 flex items-center justify-end gap-1">
        {isPending && <Loader2 aria-hidden="true" className="size-4 animate-spin text-slate-400" />}
        <button
          type="button"
          onClick={() => dispatch(deletePost(postId))}
          disabled={isPending}
          aria-label={`Remove published post: ${buildExcerpt(post.content, 40)}`}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
          Remove
        </button>
      </div>
    </li>
  );
}

export default memo(PublishedPostItem);
