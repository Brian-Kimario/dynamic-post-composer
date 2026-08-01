import { PERMISSION, roleHasPermission } from '../config/permissions';

/**
 * The primary navigation, as data.
 *
 * Each destination carries the permission that opens it, so the nav and the
 * route guards are driven by the same fact rather than by two lists that have to
 * be kept in agreement. `permission: null` means "any signed-in user".
 *
 * Icons are named rather than imported here, so this stays a plain module with
 * no JSX — the nav component maps names to components.
 */
export const NAV_ITEMS = [
  { to: '/compose', label: 'Compose', icon: 'compose', permission: PERMISSION.DRAFT_WRITE },
  { to: '/calendar', label: 'Calendar', icon: 'calendar', permission: PERMISSION.CONTENT_READ },
  { to: '/library', label: 'Library', icon: 'library', permission: PERMISSION.CONTENT_READ },
  { to: '/insights', label: 'Insights', icon: 'insights', permission: PERMISSION.INSIGHTS_VIEW },
  { to: '/admin', label: 'Admin', icon: 'admin', permission: PERMISSION.WORKSPACE_ADMIN },
  { to: '/session', label: 'Session', icon: 'session', permission: null },
];

/**
 * Where a role lands on `/`.
 *
 * A viewer has no business on the composer, so sending everyone to a fixed
 * default would greet read-only users with a 403 on their own home page. The
 * landing route is instead the first destination their role can actually open,
 * which keeps redirect-after-login honest for every role.
 */
export function landingPathFor(role) {
  const firstAllowed = NAV_ITEMS.find(
    (item) => item.permission === null || roleHasPermission(role, item.permission),
  );

  return firstAllowed?.to ?? '/403';
}

/**
 * Whether a role may open a known destination. Unknown paths return `true` — this
 * is not the guard, and the router is still the thing that decides; it only
 * exists so redirect-after-login does not deliver a user straight into a 403.
 */
export function canOpenPath(role, pathname) {
  const item = NAV_ITEMS.find((candidate) => candidate.to === pathname);

  if (!item) return true;

  return item.permission === null || roleHasPermission(role, item.permission);
}
