import { useSelector } from 'react-redux';
import { NavLink } from 'react-router';
import { BarChart3, KeyRound, Library, PenLine, ShieldCheck } from 'lucide-react';
import { selectPermissions } from '../../store/authSlice';
import { NAV_ITEMS } from '../../routes/navigation';

const ICONS = {
  compose: PenLine,
  library: Library,
  insights: BarChart3,
  admin: ShieldCheck,
  session: KeyRound,
};

/**
 * Navigation filtered by permission — the "dynamically render UI based on
 * permissions" half of the experiment, applied to the app's own structure.
 *
 * A viewer does not see Compose or Admin at all. Hiding a link is a courtesy,
 * not a control: the matching route is guarded independently, so typing the URL
 * gets the same answer as clicking would have. Both layers exist on purpose.
 *
 * `NavLink` supplies `isActive` from the current location, which is why no
 * component here has to compare paths itself.
 */
export default function PrimaryNav() {
  const permissions = useSelector(selectPermissions);

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.permission === null || permissions.includes(item.permission),
  );

  return (
    <nav aria-label="Primary" className="border-t border-slate-200 bg-white">
      <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 sm:px-6">
        {visibleItems.map((item) => {
          const Icon = ICONS[item.icon];

          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none ${
                    isActive
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`
                }
              >
                <Icon aria-hidden="true" className="size-3.5" />
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
