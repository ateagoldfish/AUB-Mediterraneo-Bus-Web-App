// Time helpers. Everything is calculated in Cyprus time, whatever time zone
// the visitor's phone is set to.

import { config } from '../config.js';
import { t } from './i18n.js';

const partsFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: config.timeZone, weekday: 'short', year: 'numeric', month: '2-digit',
  day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// { day: 0-6 (0 = Sunday), minutes: minutes since midnight, date: 'YYYY-MM-DD' }
export function cyprusNow(date = new Date()) {
  const p = Object.fromEntries(partsFormat.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    day: WEEKDAYS[p.weekday],
    minutes: Number(p.hour) * 60 + Number(p.minute),
    date: `${p.year}-${p.month}-${p.day}`,
  };
}

// '08:30' -> 510 (also accepts '8:30', '08.30' and '0830'). Returns null for anything
// that isn't a valid time.
export function toMinutes(hhmm) {
  const m = /^([01]?\d|2[0-3])[:.]?([0-5]\d)$/.exec(String(hhmm ?? '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function fromMinutes(total) {
  const m = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// Normalises '8:30' to '08:30'; returns null if invalid.
export function normaliseTime(hhmm) {
  const mins = toMinutes(hhmm);
  return mins === null ? null : fromMinutes(mins);
}

// Clock time (Cyprus) of a timestamp, e.g. '14:05'.
export function clockTime(isoOrDate) {
  const d = new Date(isoOrDate);
  return fromMinutes(cyprusNow(d).minutes);
}

export function agoText(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return s < 60 ? t('ago.seconds', { n: s }) : t('ago.minutes', { n: Math.round(s / 60) });
}

// Service hours: { "1": { start: "07:30", end: "22:30" }, ... } keyed by weekday; missing day = no service.
export function inServiceHours(hours, now = cyprusNow()) {
  const today = hours?.[now.day];
  if (!today) return false;
  const start = toMinutes(today.start);
  const end = toMinutes(today.end);
  return start !== null && end !== null && now.minutes >= start && now.minutes <= end;
}

// Text for when service next starts, e.g. "tomorrow at 07:30", or null if never.
export function nextServiceStartText(hours, now = cyprusNow()) {
  for (let offset = 0; offset < 8; offset++) {
    const day = (now.day + offset) % 7;
    const start = toMinutes(hours?.[day]?.start);
    if (start === null) continue;
    if (offset === 0 && start <= now.minutes) continue;
    const time = fromMinutes(start);
    if (offset === 0) return t('when.today', { time });
    if (offset === 1) return t('when.tomorrow', { time });
    return t('when.day', { day: t(`day.${day}`), time });
  }
  return null;
}

// Turns a <input type="datetime-local"> value (entered in Cyprus time) into an ISO timestamp.
export function cyprusLocalToIso(localValue) {
  if (!localValue) return null;
  const [datePart, timePart] = localValue.split('T');
  const guess = new Date(`${datePart}T${timePart}:00Z`);
  // Find Cyprus' UTC offset at that moment and correct for it.
  const shown = cyprusNow(guess);
  const shownUtc = Date.UTC(...shown.date.split('-').map((n, i) => (i === 1 ? n - 1 : Number(n))),
    Math.floor(shown.minutes / 60), shown.minutes % 60);
  return new Date(guess.getTime() - (shownUtc - guess.getTime())).toISOString();
}

// The reverse: ISO timestamp -> 'YYYY-MM-DDTHH:MM' in Cyprus time, for datetime-local inputs.
export function isoToCyprusLocal(iso) {
  if (!iso) return '';
  const n = cyprusNow(new Date(iso));
  return `${n.date}T${fromMinutes(n.minutes)}`;
}

export function formatWhen(iso) {
  const now = cyprusNow();
  const then = cyprusNow(new Date(iso));
  const time = fromMinutes(then.minutes);
  if (then.date === now.date) return t('when.today', { time });
  const tomorrow = cyprusNow(new Date(Date.now() + 86400000));
  if (then.date === tomorrow.date) return t('when.tomorrow', { time });
  return `${then.date} ${time}`;
}
