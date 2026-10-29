/**
 * One-off repair for rows whose `date` was written from a YYYY-MM-DD string.
 *
 * A date-only string parses as UTC midnight. In IST (UTC+5:30) that renders as
 * 05:30 on the same morning, so every affected row claimed to have happened at
 * 5:30 am, rows from one day had no real order between them, and anything near
 * a month boundary was counted in the wrong month.
 *
 * The write paths now send a full timestamp, so this only repairs what is
 * already stored. Exactly 00:00:00.000 UTC is the signature of the bug; a real
 * timestamp lands on that boundary about once in 86.4 million.
 *
 * No screen in the app can backdate an entry — there is no date picker, and
 * every write site posts the moment of writing. The old client wrote that
 * moment as `toISOString().split('T')[0]`, which is its *UTC* date, so for any
 * row the buggy path produced, `createdAt` necessarily falls inside the UTC day
 * that got stored. Where it does, `createdAt` is the real moment and the row
 * takes it.
 *
 * That includes rows recorded between 00:00 and 05:30 IST, where the UTC date
 * was still the day before: those were stored, and have been displayed, under
 * the wrong day. Repairing them moves them a day forward, onto the day they
 * actually happened.
 *
 * A row whose `createdAt` lands outside that window did not come from the app
 * — seeded or inserted by hand. Its time of day is unknowable, so it moves to
 * local midnight of the date it carries, and is called out separately.
 *
 * Usage, from backend/:
 *   node scripts/repairMidnightDates.js          # report only, changes nothing
 *   node scripts/repairMidnightDates.js --apply  # write the repairs
 */
const path     = require('path');
const dotenv   = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// The app is single-timezone (INR, IST). Change this if that stops being true.
const TZ_OFFSET_MIN = 5 * 60 + 30;
const DAY_MS        = 24 * 60 * 60 * 1000;
const APPLY         = process.argv.includes('--apply');

const Settlement          = require('../src/models/Settlement');
const PersonalTransaction = require('../src/models/PersonalTransaction');
const Expense             = require('../src/models/Expense');

const isUtcMidnight = (d) => d instanceof Date && d.getTime() % DAY_MS === 0;

/** A moment shifted so its UTC fields read as local wall-clock time. */
const shiftedToLocal = (d) => new Date(d.getTime() + TZ_OFFSET_MIN * 60_000);

/** The local calendar day a moment falls on, as a YYYY-MM-DD string. */
const localDayKey = (d) =>
  new Date(d.getTime() + TZ_OFFSET_MIN * 60_000).toISOString().slice(0, 10);

/** Local midnight of the day a UTC-midnight value was meant to represent. */
const localMidnight = (d) => new Date(d.getTime() - TZ_OFFSET_MIN * 60_000);

function repairedDate(row) {
  // The UTC day the old client would have written for this row.
  const dayStart = row.date.getTime();
  const dayEnd   = dayStart + DAY_MS;
  const made     = row.createdAt ? row.createdAt.getTime() : null;

  if (made !== null && made >= dayStart && made < dayEnd) {
    // Whether the stored day was right depends on which side of 18:30 UTC
    // this fell, which is exactly the bug — so say which rows move a day.
    const moved = localDayKey(row.createdAt) !== row.date.toISOString().slice(0, 10);
    return { date: row.createdAt, why: moved ? 'createdAt (day corrected)' : 'createdAt' };
  }
  return { date: localMidnight(row.date), why: 'not from the app' };
}

async function repair(Model, label) {
  const rows = await Model.find({}).select('date createdAt');
  const hits = rows.filter(r => isUtcMidnight(r.date));

  if (hits.length === 0) {
    console.log(`${label.padEnd(22)} ${rows.length} rows, none affected`);
    return 0;
  }

  const ops = [];
  const reasons = {};
  const moved = [];
  for (const row of hits) {
    const { date, why } = repairedDate(row);
    reasons[why] = (reasons[why] || 0) + 1;
    if (why !== 'createdAt') moved.push({ row, date, why });
    ops.push({ updateOne: { filter: { _id: row._id }, update: { $set: { date } } } });
  }

  const tally = Object.entries(reasons).map(([k, v]) => `${v} ${k}`).join(', ');
  console.log(`${label.padEnd(22)} ${rows.length} rows, ${hits.length} affected (${tally})`);

  const asLocal = (d) => shiftedToLocal(d).toISOString().replace('T', ' ').slice(0, 19);
  const line = (row, date, why) =>
    `    ${asLocal(row.date)}  ->  ${asLocal(date)}  (${why})`;

  // Every row whose displayed day changes, in full — those are the ones worth
  // checking by eye. Then a couple of ordinary ones for comparison.
  for (const m of moved) console.log(line(m.row, m.date, m.why));
  for (const row of hits.filter(r => repairedDate(r).why === 'createdAt').slice(0, 2)) {
    const { date, why } = repairedDate(row);
    console.log(line(row, date, why));
  }
  if (moved.length) console.log(`    (times above are local, ${TZ_OFFSET_MIN / 60}h ahead of UTC)`);

  if (APPLY) {
    const res = await Model.bulkWrite(ops);
    console.log(`    written: ${res.modifiedCount}`);
  }
  return hits.length;
}

(async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set. Run this from backend/ with the .env in place.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(APPLY ? 'APPLYING repairs\n' : 'DRY RUN — nothing will be written\n');

  let total = 0;
  total += await repair(Settlement,          'settlements');
  total += await repair(PersonalTransaction, 'personal transactions');
  total += await repair(Expense,             'group expenses');

  console.log(`\n${total} row(s) affected in total.`);
  if (!APPLY && total > 0) console.log('Re-run with --apply to write these changes.');

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
