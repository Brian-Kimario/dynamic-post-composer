import { VALIDATION_STATUS } from '../../utils/postValidation';

const TRACK_STYLES = {
  [VALIDATION_STATUS.EMPTY]: 'bg-slate-300',
  [VALIDATION_STATUS.VALID]: 'bg-emerald-500',
  [VALIDATION_STATUS.WARNING]: 'bg-amber-500',
  [VALIDATION_STATUS.ERROR]: 'bg-red-500',
};

const REMAINING_STYLES = {
  [VALIDATION_STATUS.EMPTY]: 'text-slate-500',
  [VALIDATION_STATUS.VALID]: 'text-slate-700',
  [VALIDATION_STATUS.WARNING]: 'text-amber-700',
  [VALIDATION_STATUS.ERROR]: 'text-red-700',
};

export default function CharacterCounter({ id, validation }) {
  const { characterCount, characterLimit, remainingCharacters, usageRatio, status } = validation;
  const isOverLimit = status === VALIDATION_STATUS.ERROR;

  return (
    <div>
      {/*
        The bar is purely a visual echo of the numbers below it, so it is hidden
        from assistive technology to avoid announcing the same thing twice.
      */}
      <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-200 ${TRACK_STYLES[status]}`}
          style={{ width: `${Math.min(usageRatio, 1) * 100}%` }}
        />
      </div>

      {/*
        This element is referenced by the textarea's aria-describedby. It is
        deliberately NOT a live region — announcing a new count on every
        keystroke would be unusable. Screen reader users get the count on focus,
        and ValidationMessage announces the meaningful threshold changes.
      */}
      <p id={id} className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm text-slate-600 tabular-nums">
          <span className={`font-semibold ${isOverLimit ? 'text-red-600' : 'text-slate-900'}`}>
            {characterCount.toLocaleString()}
          </span>
          <span className="text-slate-400"> / </span>
          <span>{characterLimit.toLocaleString()} characters</span>
        </span>

        <span className={`text-sm font-medium tabular-nums ${REMAINING_STYLES[status]}`}>
          {isOverLimit
            ? `${Math.abs(remainingCharacters).toLocaleString()} over limit`
            : `${remainingCharacters.toLocaleString()} remaining`}
        </span>
      </p>
    </div>
  );
}
