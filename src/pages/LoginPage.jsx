import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router';
import { selectCurrentRole, selectIsAuthenticated } from '../store/authSlice';
import { canOpenPath, landingPathFor } from '../routes/navigation';
import LoginScreen from '../components/auth/LoginScreen';

/**
 * The one public route, and the other half of the redirect dance.
 *
 * `RequireAuth` sends anonymous visitors here with the page they wanted in
 * navigation state; once authenticated, this sends them straight back to it.
 * Doing the return trip here rather than in `LoginScreen` keeps the form free of
 * routing concerns, and it also covers the case where an already-signed-in user
 * navigates to `/login` directly — they never see the form.
 *
 * The requested page is only honoured if the role can open it; otherwise the
 * user would be redirected into a 403 immediately after signing in.
 */
export default function LoginPage() {
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role = useSelector(selectCurrentRole);

  if (isAuthenticated) {
    const requested = location.state?.from?.pathname;
    const target = requested && canOpenPath(role, requested) ? requested : landingPathFor(role);

    return <Navigate to={target} replace />;
  }

  return <LoginScreen />;
}
