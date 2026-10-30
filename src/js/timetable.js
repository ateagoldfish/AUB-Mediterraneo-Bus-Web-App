// Timetable logic shared by the student and admin pages (D-031).
//
// A run ("trip") lists its stops in the order the bus visits them (stop_ids) and the
// times the admin typed (times). Any stop without a typed time gets an estimate:
// the previous stop's time plus the travel time between the two stops.

import { toMinutes, fromMinutes } from './time.js';

// A measured average is trusted once it is based on this many trips.
export const MIN_MEASURED_TRIPS = 5;

// A run ending at campus goes "to campus"; anything else goes "to the dorms".
export function directionOf(stopIds) {
  return stopIds[stopIds.length - 1] === 'campus' ? 'to_campus' : 'to_dorms';
}

// Travel time between two stops: { minutes, source: 'measured' | 'manual' } or null.
export function travelMinutes(travelTimes, from, to) {
  const row = travelTimes?.find((r) => r.from_stop === from && r.to_stop === to);
  if (!row) return null;
  if ((row.measured_count ?? 0) >= MIN_MEASURED_TRIPS && row.measured_avg) {
    return { minutes: Math.round(row.measured_avg), source: 'measured' };
  }
  if (row.manual_min) return { minutes: Number(row.manual_min), source: 'manual' };
  return null;
}

// Every stop of a run with its time:
// [{ stop, time: '08:40' | null, minutes, estimated: true/false }]
export function runTimes(trip, stops, travelTimes) {
  const result = [];
  let previous = null;
  for (const id of trip.stop_ids ?? []) {
    const stop = stops.find((s) => s.id === id) ?? { id, name: id };
    const typed = toMinutes(trip.times?.[id]);
    let minutes = typed;
    let estimated = false;
    if (minutes === null && previous && previous.minutes !== null) {
      const travel = travelMinutes(travelTimes, previous.stop.id, id);
      if (travel) { minutes = previous.minutes + travel.minutes; estimated = true; }
    }
    const entry = { stop, minutes, time: minutes === null ? null : fromMinutes(minutes), estimated };
    result.push(entry);
    previous = entry;
  }
  return result;
}

// First stop of a run and its (typed) time, e.g. { stop, time: '08:30', minutes: 510 }.
export function firstDeparture(trip, stops) {
  const id = trip.stop_ids?.[0];
  const minutes = toMinutes(trip.times?.[id]);
  if (!id || minutes === null) return null;
  return { stop: stops.find((s) => s.id === id) ?? { id, name: id }, time: fromMinutes(minutes), minutes };
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
