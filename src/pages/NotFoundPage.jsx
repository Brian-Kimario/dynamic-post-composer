import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router';
import { FileQuestion } from 'lucide-react';
import { selectCurrentRole } from '../store/authSlice';
import { landingPathFor } from '../routes/navigation';

/**
 * 404, and deliberately not a 403.
 *
 * A guarded route the user lacks permission for is answered by `/403`; an
 * address that does not exist is answered here. Collapsing the two would make
 * every typo look like a permissions problem.
 */
export default function NotFoundPage() {
  const location = useLocation();
  const role = useSelector(selectCurrentRole);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-slate-100">
        <FileQuestion aria-hidden="true" className="size-5 text-slate-500" />
      </span>

      <h1 className="mt-3 text-base font-semibold tracking-tight text-slate-900">Page not found</h1>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        Nothing is routed at <code className="text-slate-800">{location.pathname}</code>.
      </p>

      <Link
        to={landingPathFor(role)}
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Back to the workspace
      </Link>
    </div>
  );
}
