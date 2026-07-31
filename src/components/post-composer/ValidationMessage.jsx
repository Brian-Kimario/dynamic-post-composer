import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { VALIDATION_STATUS } from '../../utils/postValidation';

/**
 * Status is expressed with an icon and wording as well as colour, so the
 * feedback does not depend on colour perception alone.
 */
const PRESENTATION = {
  [VALIDATION_STATUS.EMPTY]: {
    Icon: Info,
    label: 'Empty',
    className: 'border-slate-200 bg-slate-50 text-slate-600',
    iconClassName: 'text-slate-400',
  },
  [VALIDATION_STATUS.VALID]: {
    Icon: CheckCircle2,
    label: 'Ready',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    iconClassName: 'text-emerald-600',
  },
  [VALIDATION_STATUS.WARNING]: {
    Icon: TriangleAlert,
    label: 'Warning',
    className: 'border-amber-200 bg-amber-50 text-amber-900',
    iconClassName: 'text-amber-600',
  },
  [VALIDATION_STATUS.ERROR]: {
    Icon: AlertCircle,
    label: 'Error',
    className: 'border-red-200 bg-red-50 text-red-900',
    iconClassName: 'text-red-600',
  },
};

export default function ValidationMessage({ id, validation }) {
  const { Icon, label, className, iconClassName } = PRESENTATION[validation.status];

  return (
    /*
      A single persistent live region. Because the element is always in the DOM
      and only its text changes, screen readers announce updates reliably —
      conditionally mounting a live region often means the announcement is
      missed. `polite` rather than `assertive`: validation updates as the user
      types and should never interrupt them mid-word.
    */
    <div
      id={id}
      role="status"
      aria-live="polite"
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${className}`}
    >
      <Icon aria-hidden="true" className={`mt-px size-4 shrink-0 ${iconClassName}`} />
      <p>
        <span className="font-semibold">{label}:</span> {validation.message}
      </p>
    </div>
  );
}
