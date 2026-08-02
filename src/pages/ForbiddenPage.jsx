import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { selectCurrentRole } from '../store/authSlice';
import { landingPathFor } from '../routes/navigation';

/**
 * 403, reached when `RequirePermission` turns someone away.
 *
 * It names the role and the missing permission rather than saying "access
 * denied", because the user cannot fix a problem they cannot see — and unlike a
 * 401, there is nothing they can do about it themselves except ask someone. The
 * way out leads to a route their role can actually open.
 */
export default function ForbiddenPage() {
  const location = useLocation();
  const role = useSelector(selectCurrentRole);

  const attemptedPath = location.state?.from?.pathname;
  const missingPermission = location.state?.permission;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-amber-50">
        <ShieldAlert aria-hidden="true" className="size-5 text-amber-600" />
      </span>

      <h1 className="mt-3 text-base font-semibold tracking-tight text-slate-900">
        You do not have access to this page
      </h1>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        {attemptedPath ? (
          <>
            <code className="text-slate-800">{attemptedPath}</code> requires a permission your role
            does not hold.
          </>
        ) : (
          'That page requires a permission your role does not hold.'
        )}
      </p>

      <dl className="mx-auto mt-4 flex max-w-xs flex-col gap-1.5 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Your role</dt>
          <dd className="font-medium text-slate-900">{role ?? 'unknown'}</dd>
        </div>
        {missingPermission && (
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Required</dt>
            <dd className="font-mono text-slate-900">{missingPermission}</dd>
          </div>
        )}
      </dl>

      <Link
        to={landingPathFor(role)}
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Go somewhere you can
      </Link>
    </div>
  );
}
