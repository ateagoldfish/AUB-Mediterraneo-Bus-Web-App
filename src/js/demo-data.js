// Example data for demo mode, based on the older (outdated) schedule in
// docs/reference/example-timetable.md. Not the real current timetable.

export const demoStops = [
  { id: 'anavargos', name: 'Anavargos Dorms', lat: 34.800635, lng: 32.451972, sort: 1, weekend_only: false },
  { id: 'tepak', name: 'Tepak Dorms', lat: 34.776953, lng: 32.434246, sort: 2, weekend_only: false },
  { id: 'oldtown', name: 'Old Town', lat: null, lng: null, sort: 3, weekend_only: true },
  { id: 'campus', name: 'Campus', lat: 34.767469, lng: 32.417171, sort: 4, weekend_only: false },
];

const MON_THU = [1, 2, 3, 4];
const FRI = [5];
const WEEKEND = [6, 0];

const run = (days, direction, times, extra = {}) => ({
  id: crypto.randomUUID(), days, direction, times, note: '', tracked: true, ...extra,
});

export function demoTrips() {
  return [
    run(MON_THU, 'to_campus', { anavargos: '08:30' }, { note: 'Coach', tracked: false }),
    run(MON_THU, 'to_campus', { tepak: '08:40' }),
    run(MON_THU, 'to_dorms', { campus: '12:10' }),
    run(MON_THU, 'to_campus', { anavargos: '12:30', tepak: '12:40' }),
    run(MON_THU, 'to_campus', { anavargos: '14:00', tepak: '14:10' }),
    run(MON_THU, 'to_dorms', { campus: '14:40' }),
    run(MON_THU, 'to_dorms', { campus: '16:20' }, { note: 'Coach', tracked: false }),
    run(MON_THU, 'to_dorms', { campus: '16:20' }),
    run(MON_THU, 'to_campus', { anavargos: '17:20', tepak: '17:30' }),
    run(MON_THU, 'to_dorms', { campus: '17:45' }),
    run(MON_THU, 'to_campus', { anavargos: '18:15', tepak: '18:25' }),
    run(MON_THU, 'to_dorms', { campus: '19:10' }),
    run(MON_THU, 'to_campus', { anavargos: '20:05', tepak: '20:15' }),
    run(MON_THU, 'to_dorms', { campus: '21:30' }),

    run(FRI, 'to_campus', { anavargos: '08:30', tepak: '08:40' }),
    run(FRI, 'to_campus', { anavargos: '10:00', tepak: '10:10' }),
    run(FRI, 'to_dorms', { campus: '10:40' }),
    run(FRI, 'to_dorms', { campus: '12:10' }),
    run(FRI, 'to_campus', { anavargos: '12:40', tepak: '12:50' }),
    run(FRI, 'to_dorms', { campus: '14:20' }),
    run(FRI, 'to_campus', { anavargos: '15:00', tepak: '15:10' }),
    run(FRI, 'to_dorms', { campus: '17:00' }),

    run(WEEKEND, 'to_campus', { anavargos: '14:00', tepak: '14:10' }),
    run(WEEKEND, 'to_dorms', { campus: '14:30' }),
    run(WEEKEND, 'to_campus', { anavargos: '15:30', tepak: '15:40' }),
    run(WEEKEND, 'to_dorms', { campus: '17:30', oldtown: '17:35' }),
    run(WEEKEND, 'to_campus', { anavargos: '18:00', tepak: '18:10' }),
    run(WEEKEND, 'to_dorms', { campus: '20:45', oldtown: '20:50' }),
    run(WEEKEND, 'to_campus', { anavargos: '21:30', tepak: '21:40' }),
    run(WEEKEND, 'to_dorms', { campus: '22:00', oldtown: '22:05' }),
  ];
}

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
