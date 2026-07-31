import { useDispatch, useSelector } from 'react-redux';
import {
  platformSelected,
  selectAllPlatforms,
  selectSelectedPlatformId,
} from '../../store/platformsSlice';

/**
 * Native radio inputs are used rather than styled buttons because the browser
 * then provides roving-arrow-key navigation, grouping and selected-state
 * announcement for free. The inputs are visually hidden but never
 * `display: none`, which would remove them from the accessibility tree and the
 * tab order.
 */
function PlatformOption({ platform, isSelected, onSelect }) {
  return (
    <label
      // The brand colour is per-platform data, so it is passed as a CSS custom
      // property instead of a utility class. Tailwind can only generate classes
      // it can see as literal strings at build time.
      style={{ '--platform-accent': platform.accentColor }}
      className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-slate-900 has-[:focus-visible]:ring-offset-2 ${
        isSelected
          ? 'border-[var(--platform-accent)] bg-white shadow-sm ring-1 ring-[var(--platform-accent)]'
          : 'border-slate-200 bg-white/60 hover:border-slate-300 hover:bg-white'
      }`}
    >
      <input
        type="radio"
        name="platform"
        value={platform.id}
        checked={isSelected}
        onChange={() => onSelect(platform.id)}
        className="sr-only"
      />

      <span
        aria-hidden="true"
        style={{ backgroundColor: platform.accentColor }}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
      >
        {platform.monogram}
      </span>

      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-900">{platform.name}</span>
        <span className="block text-xs text-slate-500">
          {platform.characterLimit.toLocaleString()} characters
        </span>
      </span>
    </label>
  );
}

/**
 * Takes no props at all. It reads the platform list and the current selection
 * straight from the store and dispatches its own action, so nothing has to be
 * threaded down from a parent — the clearest example in this codebase of what
 * centralized state removes.
 */
export default function PlatformSelector() {
  const dispatch = useDispatch();
  const platforms = useSelector(selectAllPlatforms);
  const selectedPlatformId = useSelector(selectSelectedPlatformId);

  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <legend className="px-1 text-sm font-semibold text-slate-900">Platform</legend>
      <p className="mb-3 text-xs text-slate-500">Each platform applies its own character limit.</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {platforms.map((platform) => (
          <PlatformOption
            key={platform.id}
            platform={platform}
            isSelected={platform.id === selectedPlatformId}
            onSelect={(platformId) => dispatch(platformSelected(platformId))}
          />
        ))}
      </div>
    </fieldset>
  );
}
