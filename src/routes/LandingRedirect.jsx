import { useSelector } from 'react-redux';
import { Navigate } from 'react-router';
import { selectCurrentRole } from '../store/authSlice';
import { landingPathFor } from './navigation';

/**
 * `/` is role-dependent: an editor starts at the composer, a viewer at the
 * library. A fixed default would send read-only users straight to a 403 on the
 * app's front door.
 *
 * `replace` keeps `/` out of history, so Back from the landing page leaves the
 * app instead of bouncing through the redirect again.
 */
export default function LandingRedirect() {
  const role = useSelector(selectCurrentRole);

  return <Navigate to={landingPathFor(role)} replace />;
}
