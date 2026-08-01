import { useDispatch, useSelector } from 'react-redux';
import { LogOut } from 'lucide-react';
import { logOut, selectCurrentUser } from '../../store/authSlice';

function initialsOf(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

/** Who is signed in, and the way out. Reads the user straight from the store. */
export default function AccountBadge() {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);

  if (!user) return null;

  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
      >
        {initialsOf(user.name)}
      </span>

      <span className="hidden min-w-0 sm:block">
        <span className="block truncate text-xs font-medium text-slate-900">{user.name}</span>
        <span className="block truncate text-xs text-slate-500">{user.role}</span>
      </span>

      <button
        type="button"
        onClick={() => dispatch(logOut())}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <LogOut aria-hidden="true" className="size-3.5" />
        Sign out
      </button>
    </div>
  );
}
