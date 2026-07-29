import { VALIDATION_STATUS } from '../../utils/postValidation';

const EDITOR_ID = 'post-content';

/**
 * A controlled component: the textarea's `value` always comes from React state
 * and every keystroke flows back up through `onChange`. React is the single
 * source of truth, which is what makes real-time counting and validation
 * possible without reading the DOM.
 */
export default function PostEditor({ platform, value, onChange, validation, describedBy }) {
  const isInvalid = validation.status === VALIDATION_STATUS.ERROR;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={EDITOR_ID} className="text-sm font-semibold text-slate-900">
          Post content
        </label>
        <span className="text-xs text-slate-500">
          Composing for <span className="font-medium text-slate-700">{platform.name}</span>
        </span>
      </div>

      <textarea
        id={EDITOR_ID}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={platform.placeholder}
        rows={8}
        // aria-invalid marks the field itself as failing validation, and
        // aria-describedby ties it to the counter and the validation message so
        // a screen reader reads both when the textarea receives focus.
        aria-invalid={isInvalid}
        aria-describedby={describedBy}
        className={`w-full resize-y rounded-xl border bg-white px-4 py-3 text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-offset-1 ${
          isInvalid
            ? 'border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/40'
            : 'border-slate-300 focus-visible:border-slate-900 focus-visible:ring-slate-900/20'
        }`}
      />
    </div>
  );
}
