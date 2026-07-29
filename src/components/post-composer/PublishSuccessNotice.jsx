import { CheckCircle2, X } from 'lucide-react';

export default function PublishSuccessNotice({ post, onDismiss }) {
  return (
    // `alert` announces immediately: unlike the validation message this is a
    // discrete, user-initiated outcome, not continuous typing feedback.
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900"
    >
      <CheckCircle2 aria-hidden="true" className="mt-px size-4 shrink-0 text-emerald-600" />
      <p className="flex-1">
        <span className="font-semibold">Published.</span> Your{' '}
        {post.characterCount.toLocaleString()}
        -character post was sent to {post.platformName}.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss confirmation"
        className="-m-1 rounded-md p-1 text-emerald-700 transition hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
