import { Check, Loader2, Save } from 'lucide-react';

export default function SaveDraftButton({ isEditing, isSaving, justSaved, disabled, onSave }) {
  const label = isEditing ? 'Update draft' : 'Save draft';

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={disabled || isSaving}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
    >
      {isSaving && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
      {!isSaving && justSaved && <Check aria-hidden="true" className="size-4 text-emerald-600" />}
      {!isSaving && !justSaved && <Save aria-hidden="true" className="size-4" />}
      {isSaving ? 'Saving…' : label}
    </button>
  );
}
