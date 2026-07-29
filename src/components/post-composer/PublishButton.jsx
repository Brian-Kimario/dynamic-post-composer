import { Loader2, Send } from 'lucide-react';
import { PUBLISH_STATUS } from '../../hooks/usePostComposer';

export default function PublishButton({ platform, canPublish, publishStatus, onPublish }) {
  const isPublishing = publishStatus === PUBLISH_STATUS.PUBLISHING;
  const isDisabled = !canPublish || isPublishing;

  return (
    <button
      type="button"
      onClick={onPublish}
      disabled={isDisabled}
      // The label names the target platform rather than saying just "Publish",
      // so it still makes sense when read out of context by a screen reader.
      aria-label={`Publish post to ${platform.name}`}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none sm:w-auto"
    >
      {isPublishing ? (
        <>
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Publishing…
        </>
      ) : (
        <>
          <Send aria-hidden="true" className="size-4" />
          Publish to {platform.name}
        </>
      )}
    </button>
  );
}
