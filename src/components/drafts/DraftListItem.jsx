import { memo, useEffect, useRef, useState } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { getPlatform } from '../../config/platforms';
import { buildExcerpt, formatAbsoluteTime, formatRelativeTime } from '../../utils/draftFormatting';
import { countCharacters } from '../../utils/postValidation';

/**
 * `memo` skips re-rendering a row whose props are unchanged. It only pays off
 * because the handlers passed in are wrapped in `useCallback` upstream — an
 * inline arrow function would be a new value every render and defeat it.
 */
function DraftListItem({ draft, isActive, isPending, onEdit, onDelete }) {
  const platform = getPlatform(draft.platformId);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const confirmTimerRef = useRef(null);

  // Two-step delete instead of a modal: cheaper to make accessible, and the
  // confirmation reverts on its own so a stray click cannot leave the row armed.
  useEffect(() => {
    return () => clearTimeout(confirmTimerRef.current);
  }, []);

  const handleDeleteClick = () => {
    if (isConfirmingDelete) {
      clearTimeout(confirmTimerRef.current);
      setIsConfirmingDelete(false);
      onDelete(draft.id);
      return;
    }

    setIsConfirmingDelete(true);
    confirmTimerRef.current = setTimeout(() => setIsConfirmingDelete(false), 4000);
  };

  const characterCount = countCharacters(draft.content);
  const isOverLimit = characterCount > platform.characterLimit;

  return (
    <li
      className={`rounded-xl border p-3.5 transition ${
        isActive
          ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
          : 'border-slate-200 bg-white'
      } ${isPending ? 'opacity-60' : ''}`}
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
          {isActive && (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
              Editing
            </span>
          )}
        </div>

        <time
          dateTime={draft.updatedAt}
          title={formatAbsoluteTime(draft.updatedAt)}
          className="shrink-0 text-xs text-slate-400"
        >
          {formatRelativeTime(draft.updatedAt)}
        </time>
      </div>

      <p className="mt-2 text-sm break-words text-slate-700">{buildExcerpt(draft.content)}</p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className={`text-xs tabular-nums ${isOverLimit ? 'text-red-600' : 'text-slate-500'}`}>
          {characterCount.toLocaleString()} / {platform.characterLimit.toLocaleString()}
          {isOverLimit && ' — over limit'}
        </span>

        <div className="flex items-center gap-1">
          {isPending && (
            <Loader2 aria-hidden="true" className="size-4 animate-spin text-slate-400" />
          )}

          <button
            type="button"
            onClick={() => onEdit(draft)}
            disabled={isPending}
            // The accessible name includes the excerpt so a screen reader user
            // moving between rows can tell which draft each button belongs to.
            aria-label={`Edit draft: ${buildExcerpt(draft.content, 40)}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Pencil aria-hidden="true" className="size-3.5" />
            Edit
          </button>

          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={isPending}
            aria-label={
              isConfirmingDelete
                ? `Confirm deletion of draft: ${buildExcerpt(draft.content, 40)}`
                : `Delete draft: ${buildExcerpt(draft.content, 40)}`
            }
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
              isConfirmingDelete
                ? 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600'
                : 'text-red-700 hover:bg-red-50 focus-visible:ring-red-600'
            }`}
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
            {isConfirmingDelete ? 'Confirm' : 'Delete'}
          </button>
        </div>
      </div>
    </li>
  );
}

export default memo(DraftListItem);
