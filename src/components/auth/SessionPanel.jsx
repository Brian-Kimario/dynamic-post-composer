import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { selectAccessToken, selectRenewalCount, selectTokenClaims } from '../../store/authSlice';
import { millisecondsUntilExpiry } from '../../services/jwt';
import { tokenStorage } from '../../services/tokenStorage';

function formatCountdown(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatClaimValue(key, value) {
  // `iat` and `exp` are NumericDate — seconds, not milliseconds.
  if ((key === 'iat' || key === 'exp') && typeof value === 'number') {
    return `${value} — ${new Date(value * 1000).toLocaleTimeString()}`;
  }
  return String(value);
}

/**
 * The token, made visible.
 *
 * A JWT is otherwise an opaque-looking string that the app passes around
 * invisibly, and the concepts this experiment is about — three segments, claims
 * anyone can read, an expiry that ticks down — are hard to picture from the
 * source alone. Showing them turns the mechanism into something observable.
 *
 * Nothing here is privileged information: every byte on this panel is already in
 * the token the browser holds. That is exactly the lesson — the payload is
 * encoded, not encrypted.
 */
export default function SessionPanel() {
  const token = useSelector(selectAccessToken);
  const claims = useSelector(selectTokenClaims);
  const renewalCount = useSelector(selectRenewalCount);

  // The counter exists only to re-render once a second. Time remaining is
  // derived from the token on each render rather than copied into state, so it
  // cannot drift away from `exp` or go stale while the tab is backgrounded.
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!token || !claims) return null;

  const [header, payload, signature] = token.split('.');
  const remaining = millisecondsUntilExpiry(claims);
  const isExpired = remaining <= 0;

  return (
    <section
      aria-label="Session"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ShieldCheck aria-hidden="true" className="size-4 text-slate-400" />
          Session
        </h2>

        <div className="flex items-center gap-2">
          {renewalCount > 0 && (
            <p className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <RefreshCw aria-hidden="true" className="size-3" />
              Renewed {renewalCount}×
            </p>
          )}

          <p
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isExpired ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isExpired ? 'Renews on next request' : `Expires in ${formatCountdown(remaining)}`}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Stored in{' '}
        <code className="text-slate-700">
          {tokenStorage.isPersistent() ? 'localStorage' : 'sessionStorage'}
        </code>{' '}
        and attached to every request as{' '}
        <code className="text-slate-700">Authorization: Bearer …</code>
        {/* Expiry stopped being a dead end in Assignment 5: the access token is
            short-lived on purpose, and the refresh token quietly replaces it. */}
        {isExpired
          ? ' This access token has expired; the next request will refresh it and retry itself.'
          : ' It is renewed automatically from the refresh token when it expires.'}
      </p>

      {/* Colour-coded the way jwt.io renders a token, because "three segments
          separated by dots" lands better when you can see the dots. */}
      <p className="mt-3 rounded-xl bg-slate-50 p-3 font-mono text-[0.6875rem] leading-relaxed break-all">
        <span className="text-sky-700">{header}</span>
        <span className="text-slate-400">.</span>
        <span className="text-violet-700">{payload}</span>
        <span className="text-slate-400">.</span>
        <span className="text-emerald-700">{signature}</span>
      </p>

      <details className="mt-3 text-xs">
        <summary className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-slate-700 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none">
          <KeyRound aria-hidden="true" className="size-3.5 text-slate-400" />
          Decoded payload
        </summary>

        <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-xl bg-slate-50 p-3">
          {Object.entries(claims).map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="font-mono text-slate-500">{key}</dt>
              <dd className="break-all text-slate-800">{formatClaimValue(key, value)}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-2 text-slate-400">
          Base64url-encoded, not encrypted — the signature protects it from being changed, not from
          being read.
        </p>
      </details>
    </section>
  );
}
