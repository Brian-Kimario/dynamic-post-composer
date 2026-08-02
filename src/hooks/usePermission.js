import { useSelector } from 'react-redux';
import { selectHasPermission } from '../store/authSlice';

/**
 * `const canPublish = usePermission(PERMISSION.POST_PUBLISH);`
 *
 * A thin wrapper, and worth having anyway: it is the single expression every
 * component uses to ask an authorization question, so components never import
 * the permissions table, never touch `state.auth`, and never mention a role by
 * name. If the model behind it changes — permissions on the user instead of the
 * role, say — this file changes and the components do not.
 */
export function usePermission(permission) {
  return useSelector(selectHasPermission(permission));
}
