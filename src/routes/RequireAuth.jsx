import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router';
import { selectIsAuthenticated } from '../store/authSlice';

/**
 * The authentication guard, used as a layout route:
 *
 *   { element: <RequireAuth />, children: [ …protected routes… ] }
 *
 * Rendering `<Outlet />` or a `<Navigate />` instead of taking `children` means
 * one guard covers a whole branch of the route tree. Nothing under it can be
 * reached by typing a URL, which is the difference between a guarded route and a
 * hidden link.
 *
 * The current location is passed along in navigation state so the login screen
 * can send the user back where they were aiming. `replace` keeps the guarded URL
 * out of history — otherwise Back would bounce between login and the page they
 * could not open.
 *
 * No `restoring` check here: the root layout holds the app until the stored
 * token has been verified, so by the time this renders the answer is settled.
 */
export default function RequireAuth() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
