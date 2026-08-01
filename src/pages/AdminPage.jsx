import { useSelector } from 'react-redux';
import { Check, Minus, ShieldCheck } from 'lucide-react';
import {
  PERMISSION,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  roleHasPermission,
} from '../config/permissions';
import { selectCurrentRole, selectCurrentUser } from '../store/authSlice';

const ROLES = Object.keys(ROLE_PERMISSIONS);
const PERMISSIONS = Object.values(PERMISSION);

/**
 * Admin-only, and the clearest demonstration that the guard works: every other
 * route is reachable by somebody, this one by exactly one role.
 *
 * It renders the permission matrix straight from `permissions.js` rather than
 * restating it, so the table cannot drift from what is actually enforced — if a
 * grant changes, this page changes with it.
 */
export default function AdminPage() {
  const user = useSelector(selectCurrentUser);
  const currentRole = useSelector(selectCurrentRole);

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-label="Access control"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ShieldCheck aria-hidden="true" className="size-4 text-slate-400" />
          Roles and permissions
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Read directly from <code className="text-slate-700">config/permissions.js</code> — the
          same table the route guards and the API client enforce.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th scope="col" className="py-2 pr-3 text-xs font-medium text-slate-500">
                  Permission
                </th>
                {ROLES.map((role) => (
                  <th
                    key={role}
                    scope="col"
                    className={`px-3 py-2 text-xs font-medium ${
                      role === currentRole ? 'text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    {role}
                    {role === currentRole && (
                      <span className="ml-1.5 rounded-full bg-slate-900 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">
                        you
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((permission) => (
                <tr key={permission} className="border-b border-slate-100 last:border-0">
                  <th
                    scope="row"
                    className="py-2 pr-3 font-mono text-xs font-normal text-slate-700"
                  >
                    {permission}
                  </th>
                  {ROLES.map((role) => {
                    const granted = roleHasPermission(role, permission);
                    return (
                      <td key={role} className="px-3 py-2">
                        {granted ? (
                          <Check
                            aria-label="granted"
                            className="size-4 text-emerald-600"
                            role="img"
                          />
                        ) : (
                          <Minus
                            aria-label="not granted"
                            className="size-4 text-slate-300"
                            role="img"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
          {ROLES.map((role) => (
            <div key={role} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
              <dt className="w-20 shrink-0 text-xs font-semibold text-slate-900">{role}</dt>
              <dd className="text-xs text-slate-600">{ROLE_DESCRIPTIONS[role]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-label="Your access"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <h2 className="text-sm font-semibold text-slate-900">Your effective permissions</h2>
        <p className="mt-1 text-xs text-slate-500">
          Derived from the <code className="text-slate-700">role</code> claim in your token, not
          from anything stored in the client.
        </p>

        <ul className="mt-3 flex flex-wrap gap-1.5">
          {(ROLE_PERMISSIONS[currentRole] ?? []).map((permission) => (
            <li
              key={permission}
              className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700"
            >
              {permission}
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs text-slate-500">
          Signed in as {user?.name} ({user?.email}).
        </p>
      </section>
    </div>
  );
}
