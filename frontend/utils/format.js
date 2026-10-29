/**
 * Formatting that cannot throw on a missing value.
 *
 * Every amount on screen comes from the API, and calling `.toLocaleString()` or
 * `.toFixed()` straight on a field means one absent or null value raises a
 * TypeError mid-render. That takes the whole screen down — and before the root
 * ErrorBoundary existed it took the app down with it.
 *
 * `Number(null)` is 0 but `Number(undefined)` is NaN, and NaN formats as the
 * string "NaN" rather than throwing, so both are normalised to 0 here. A zero
 * in place of a missing figure is wrong, but it is legible and recoverable;
 * the alternative is a blank screen.
 */

function toNumber(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Indian-grouped amount, e.g. 125000 -> "1,25,000". No currency symbol. */
export function fmtINR(value) {
  return toNumber(value).toLocaleString('en-IN');
}

/** Fixed-decimal amount, for inputs and split arithmetic. */
export function fmtAmount(value, decimals = 2) {
  return toNumber(value).toFixed(decimals);
}

export { toNumber };
