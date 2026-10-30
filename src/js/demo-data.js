// Example data for demo mode, based on the older (outdated) schedule in
// docs/reference/example-timetable.md. Not the real current timetable.

import { directionOf } from './timetable.js';

export const demoStops = [
  { id: 'anavargos', name: 'Anavargos Dorms', lat: 34.800635, lng: 32.451972, sort: 1, weekend_only: false },
  { id: 'tepak', name: 'Tepak Dorms', lat: 34.776953, lng: 32.434246, sort: 2, weekend_only: false },
  { id: 'oldtown', name: 'Old Town', lat: null, lng: null, sort: 3, weekend_only: true },
  { id: 'campus', name: 'Campus', lat: 34.767469, lng: 32.417171, sort: 4, weekend_only: false },
];

const MON_THU = [1, 2, 3, 4];
const FRI = [5];
const WEEKEND = [6, 0];

// Usual stop orders.
const A_T_C = ['anavargos', 'tepak', 'campus'];
const T_C = ['tepak', 'campus'];
const C_T_A = ['campus', 'tepak', 'anavargos'];
const A_T_O_C = ['anavargos', 'tepak', 'oldtown', 'campus'];
const C_O_T_A = ['campus', 'oldtown', 'tepak', 'anavargos'];

// times: only the times the old schedule actually gave; the rest are estimated.
const run = (days, stopIds, times, extra = {}) => ({
  id: crypto.randomUUID(), days, stop_ids: stopIds, direction: directionOf(stopIds), times, note: '', tracked: true, ...extra,
});

export function demoTrips() {
  return [
    run(MON_THU, A_T_C, { anavargos: '08:30' }, { note: 'Coach', tracked: false }),
    run(MON_THU, T_C, { tepak: '08:40' }),
    run(MON_THU, C_T_A, { campus: '12:10' }),
    run(MON_THU, A_T_C, { anavargos: '12:30', tepak: '12:40' }),
    run(MON_THU, A_T_C, { anavargos: '14:00', tepak: '14:10' }),
    run(MON_THU, C_T_A, { campus: '14:40' }),
    run(MON_THU, C_T_A, { campus: '16:20' }, { note: 'Coach', tracked: false }),
    run(MON_THU, C_T_A, { campus: '16:20' }),
    run(MON_THU, A_T_C, { anavargos: '17:20', tepak: '17:30' }),
    run(MON_THU, C_T_A, { campus: '17:45' }),
    run(MON_THU, A_T_C, { anavargos: '18:15', tepak: '18:25' }),
    run(MON_THU, C_T_A, { campus: '19:10' }),
    run(MON_THU, A_T_C, { anavargos: '20:05', tepak: '20:15' }),
    run(MON_THU, C_T_A, { campus: '21:30' }),

    run(FRI, A_T_C, { anavargos: '08:30', tepak: '08:40' }),
    run(FRI, A_T_C, { anavargos: '10:00', tepak: '10:10' }),
    run(FRI, C_T_A, { campus: '10:40' }),
    run(FRI, C_T_A, { campus: '12:10' }),
    run(FRI, A_T_C, { anavargos: '12:40', tepak: '12:50' }),
    run(FRI, C_T_A, { campus: '14:20' }),
    run(FRI, A_T_C, { anavargos: '15:00', tepak: '15:10' }),
    run(FRI, C_T_A, { campus: '17:00' }),

    run(WEEKEND, A_T_O_C, { anavargos: '14:00', tepak: '14:10' }),
    run(WEEKEND, C_T_A, { campus: '14:30' }),
    run(WEEKEND, A_T_O_C, { anavargos: '15:30', tepak: '15:40' }),
    run(WEEKEND, C_O_T_A, { campus: '17:30', oldtown: '17:35' }),
    run(WEEKEND, A_T_O_C, { anavargos: '18:00', tepak: '18:10' }),
    run(WEEKEND, C_O_T_A, { campus: '20:45', oldtown: '20:50' }),
    run(WEEKEND, A_T_O_C, { anavargos: '21:30', tepak: '21:40' }),
    run(WEEKEND, C_O_T_A, { campus: '22:00', oldtown: '22:05' }),
  ];
}

// Travel times between stops. manual_min: the admin's own estimate (these are guesses —
// only Anavargos→Tepak and Campus→Old Town come from the old schedule).
// measured_*: what the tracker has measured; invented here to show how it looks.
export const demoTravelTimes = [
  { from_stop: 'anavargos', to_stop: 'tepak', manual_min: 10, measured_avg: 11.4, measured_count: 23 },
  { from_stop: 'tepak', to_stop: 'campus', manual_min: 8, measured_avg: 7.6, measured_count: 18 },
  { from_stop: 'campus', to_stop: 'tepak', manual_min: 8, measured_avg: 9.1, measured_count: 3 },
  { from_stop: 'tepak', to_stop: 'anavargos', manual_min: 10, measured_avg: null, measured_count: 0 },
  { from_stop: 'tepak', to_stop: 'oldtown', manual_min: 10, measured_avg: null, measured_count: 0 },
  { from_stop: 'oldtown', to_stop: 'campus', manual_min: 5, measured_avg: null, measured_count: 0 },
  { from_stop: 'campus', to_stop: 'oldtown', manual_min: 5, measured_avg: null, measured_count: 0 },
  { from_stop: 'oldtown', to_stop: 'tepak', manual_min: 10, measured_avg: null, measured_count: 0 },
];

export const demoServiceHours = {
  1: { start: '08:15', end: '21:45' },
  2: { start: '08:15', end: '21:45' },
  3: { start: '08:15', end: '21:45' },
  4: { start: '08:15', end: '21:45' },
  5: { start: '08:15', end: '17:15' },
  6: { start: '13:45', end: '22:15' },
  0: { start: '13:45', end: '22:15' },
};

export const DEMO_STUDENT_PASSCODE = 'demo';
export const DEMO_ADMIN_PASSCODE = 'admin-demo';
