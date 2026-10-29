// Works out which runs happen today and when the next one leaves,
// taking active delay/cancellation alerts into account.

import { toMinutes } from './time.js';

// Stops in travel order for a direction. Stops are sorted dorms-first (Anavargos,
// Tepak, Old Town, Campus), so "to dorms" is simply the reverse.
export function stopsInOrder(stops, direction) {
  const sorted = [...stops].sort((a, b) => a.sort - b.sort);
  return direction === 'to_dorms' ? sorted.reverse() : sorted;
}

// First stop of a run that has a time, e.g. { stop, time: '08:30', minutes: 510 }.
export function firstDeparture(trip, stops) {
  for (const stop of stopsInOrder(stops, trip.direction)) {
    const minutes = toMinutes(trip.times?.[stop.id]);
    if (minutes !== null) return { stop, time: trip.times[stop.id], minutes };
  }
  return null;
}

export function tripsForDay(trips, day, stops) {
  return trips
    .filter((trip) => trip.days.includes(day) && firstDeparture(trip, stops))
    .sort((a, b) => firstDeparture(a, stops).minutes - firstDeparture(b, stops).minutes);
}

// How alerts change a run: { cancelled: bool, delay: minutes }. An alert lists the
// runs it affects in trip_ids (the admin page fills in "all remaining runs" for her).
export function alertEffect(trip, alerts) {
  let cancelled = false;
  let delay = 0;
  for (const alert of alerts) {
    if (!alert.trip_ids?.includes(trip.id)) continue;
    if (alert.type === 'cancel') cancelled = true;
    if (alert.type === 'delay') delay = Math.max(delay, Number(alert.delay_min) || 0);
  }
  return { cancelled, delay };
}

// Today's runs with everything the page needs to show them.
export function todaysRuns({ trips, stops, alerts }, now) {
  return tripsForDay(trips, now.day, stops).map((trip) => {
    const first = firstDeparture(trip, stops);
    const effect = alertEffect(trip, alerts);
    const expected = first.minutes + effect.delay;
    return {
      trip,
      first,
      ...effect,
      expected,
      // A run counts as gone two minutes after its (possibly delayed) departure.
      past: !effect.cancelled ? expected + 2 < now.minutes : first.minutes < now.minutes,
    };
  });
}

export function nextRun(runs, direction) {
  return runs.find((run) => run.trip.direction === direction && !run.past && !run.cancelled) ?? null;
}
