/**
 * Month and day boundaries in the app's own timezone.
 *
 * PayCircle is single-timezone by design — INR is hardcoded, there is no i18n
 * layer, and every user is in one country. Month windows therefore belong to
 * IST, not to whatever timezone the server happens to be running in. That
 * distinction is invisible in development, where the server runs on an IST
 * machine, and wrong in production, where it runs in UTC: a month then starts
 * at 05:30 IST, so everything a user recorded in the first five and a half
 * hours of the 1st was counted into the month before.
 *
 * Boundaries are returned as real UTC instants, which is what the stored
 * `date` fields are, so they can go straight into a Mongo range query.
 */
const OFFSET_MIN = 5 * 60 + 30;          // IST, UTC+05:30
const OFFSET_MS  = OFFSET_MIN * 60 * 1000;

/** The same instant shifted so the UTC field readers report app-local parts. */
const shifted = (at) => new Date(at.getTime() + OFFSET_MS);

/** `YYYY-MM` for the month `at` falls in, app-local. */
function appMonthKey(at = new Date()) {
  const d = shifted(at);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * The window covering one month, app-local, as `{ key, start, end }`.
 * `monthOffset` is relative to the month `at` falls in: 0 is that month,
 * -1 the month before it.
 */
function appMonthWindow(monthOffset = 0, at = new Date()) {
  const d = shifted(at);
  const year  = d.getUTCFullYear();
  const month = d.getUTCMonth() + monthOffset;   // Date.UTC normalizes overflow

  const start  = new Date(Date.UTC(year, month,     1) - OFFSET_MS);
  // The last millisecond of the month. The previous code ended the window at
  // 23:59:59.000, which dropped anything recorded in the final second.
  const end    = new Date(Date.UTC(year, month + 1, 1) - OFFSET_MS - 1);
  const anchor = new Date(Date.UTC(year, month, 1));
  const key    = `${anchor.getUTCFullYear()}-${String(anchor.getUTCMonth() + 1).padStart(2, '0')}`;

  return { key, start, end };
}

module.exports = { appMonthKey, appMonthWindow };
