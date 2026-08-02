/**
 * The authorization model, kept as data in one file.
 *
 * Authentication (1.3.1) answered "who is this?". This answers "what may they
 * do?" — and the two are deliberately separate: a valid token is not a
 * permission slip, it is only an identity.
 *
 * RBAC's whole idea is the indirection in the middle of `user → role →
 * permissions`. Components and services ask about *permissions*, never about
 * roles, so nothing anywhere says `if (role === 'admin')`. That is the same
 * discipline `platforms.js` applies to platform rules, for the same reason:
 * adding a fourth role means adding one entry here, and granting an existing
 * role one more ability means adding one string.
 *
 * Checking permissions rather than roles is also what keeps the least-privilege
 * principle enforceable — each role is defined by the smallest set of things it
 * needs, and a new capability is denied to everyone until it is granted.
 */

/** Every distinct thing a user can attempt. `resource:action` for readability. */
export const PERMISSION = {
  CONTENT_READ: 'content:read',
  DRAFT_WRITE: 'draft:write',
  DRAFT_DELETE: 'draft:delete',
  POST_PUBLISH: 'post:publish',
  POST_SCHEDULE: 'post:schedule',
  POST_DELETE: 'post:delete',
  INSIGHTS_VIEW: 'insights:view',
  WORKSPACE_ADMIN: 'workspace:admin',
};

export const ROLE = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
};

/**
 * Roles are listed most-privileged first, and each is written out in full rather
 * than inheriting from the one below. Explicit sets are longer but they make a
 * role's exact reach readable in one place, and they allow a role that is not
 * simply a superset of another — which hierarchies quietly forbid.
 */
export const ROLE_PERMISSIONS = {
  [ROLE.ADMIN]: [
    PERMISSION.CONTENT_READ,
    PERMISSION.DRAFT_WRITE,
    PERMISSION.DRAFT_DELETE,
    PERMISSION.POST_PUBLISH,
    PERMISSION.POST_SCHEDULE,
    PERMISSION.POST_DELETE,
    PERMISSION.INSIGHTS_VIEW,
    PERMISSION.WORKSPACE_ADMIN,
  ],
  [ROLE.EDITOR]: [
    PERMISSION.CONTENT_READ,
    PERMISSION.DRAFT_WRITE,
    PERMISSION.DRAFT_DELETE,
    PERMISSION.POST_PUBLISH,
    PERMISSION.POST_SCHEDULE,
    PERMISSION.INSIGHTS_VIEW,
  ],
  [ROLE.VIEWER]: [PERMISSION.CONTENT_READ],
};

/** Human-readable summaries, used by the admin page's permission matrix. */
export const ROLE_DESCRIPTIONS = {
  [ROLE.ADMIN]: 'Full access, including published post removal and workspace administration.',
  [ROLE.EDITOR]: 'Creates and publishes content, but cannot remove published posts.',
  [ROLE.VIEWER]: 'Read-only access to drafts and published posts.',
};

/**
 * The single authorization primitive.
 *
 * An unknown role resolves to no permissions rather than to an error, which is
 * the fail-closed choice: a token carrying a role this build has never heard of
 * — an old token, a renamed role — grants nothing instead of everything.
 */
export function roleHasPermission(role, permission) {
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}

export function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] ?? [];
}
