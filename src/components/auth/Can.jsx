import { usePermission } from '../../hooks/usePermission';

/**
 * Renders its children only if the signed-in role holds the permission.
 *
 *   <Can permission={PERMISSION.POST_DELETE}>
 *     <button>Remove</button>
 *   </Can>
 *
 * The alternative — `{canDelete && <button/>}` at each call site — is not wrong,
 * and this component compiles to the same thing. What it buys is that the
 * *reason* is legible in the markup: a reader sees which permission gates the
 * button without tracing a boolean back to where it was derived.
 *
 * `fallback` covers the cases where hiding a control silently would be confusing
 * — a read-only notice explaining why the composer has no publish button reads
 * better than an unexplained gap.
 */
export default function Can({ permission, fallback = null, children }) {
  return usePermission(permission) ? children : fallback;
}
