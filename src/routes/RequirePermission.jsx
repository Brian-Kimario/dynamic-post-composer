import { Navigate, Outlet, useLocation } from 'react-router';
import { usePermission } from '../hooks/usePermission';

/**
 * The authorization guard. Sits inside `RequireAuth`, never replaces it —
 * authentication and authorization are separate questions and are asked in that
 * order, so an anonymous visitor is sent to sign in rather than being told they
 * lack a permission they might well have.
 *
 * Denied users go to `/403` rather than back to `/login`: they are signed in and
 * signing in again changes nothing. Sending them to the login screen would be
 * the "wrong status code" mistake made in navigation form — an infinite loop for
 * anyone who follows a link they cannot open.
 *
 * The attempted path is carried in navigation state so the page can name it.
 */
export default function RequirePermission({ permission }) {
  const location = useLocation();
  const isAllowed = usePermission(permission);

  if (!isAllowed) {
    return <Navigate to="/403" state={{ from: location, permission }} replace />;
  }

  return <Outlet />;
}
