import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet } from 'react-router';
import { Loader2 } from 'lucide-react';
import { AUTH_STATUS, restoreSession, selectAuthStatus } from './store/authSlice';

/**
 * The root route element: restore the session, then let the router take over.
 *
 * This sits above every route, including `/login`, and holds the whole app until
 * the stored token has been verified. That is what lets `RequireAuth` and
 * `RequirePermission` below it be simple synchronous checks — by the time they
 * render, the answer to "is there a session, and with what role?" is settled.
 *
 * Without this gate the guards would run against `status: restoring`, decide
 * there was no user, and redirect to `/login` on every reload — replacing the
 * page the user was actually on.
 */
export default function App() {
  const dispatch = useDispatch();
  const status = useSelector(selectAuthStatus);

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  if (status === AUTH_STATUS.RESTORING) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Restoring your session…
        </p>
      </div>
    );
  }

  return <Outlet />;
}
