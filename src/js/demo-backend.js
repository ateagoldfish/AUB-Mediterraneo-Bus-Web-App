// Demo back end: pretends to be the server, keeping everything in this browser's
// localStorage. Used while no Supabase project is configured. It follows the same
// rules as the real server (passcode check, pause, service hours) so the pages
// behave the same way.

import { ApiError } from './errors.js';
import { cyprusNow, inServiceHours } from './time.js';
import {
  demoStops, demoTrips, demoServiceHours, DEMO_STUDENT_PASSCODE, DEMO_ADMIN_PASSCODE,
} from './demo-data.js';

const KEY = 'dormshuttle-demo';
const SESSION_KEY = 'dormshuttle-demo-admin';
export const SCENARIOS = ['live', 'real_hours', 'weak', 'lost', 'not_in_service', 'server_down'];

function freshState() {
  return {
    stops: demoStops,
    trips: demoTrips(),
    alerts: [],
    service_hours: demoServiceHours,
    paused: false,
    paused_until: null,
    student_passcode: DEMO_STUDENT_PASSCODE,
    admin_passcode: DEMO_ADMIN_PASSCODE,
    attempts: [],
    scenario: 'live',
  };
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved) return saved;
  } catch { /* fall through to fresh data */ }
  const state = freshState();
  save(state);
  return state;
}

function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}

export function getScenario() { return load().scenario; }
export function setScenario(scenario) { const s = load(); s.scenario = scenario; save(s); }
export function resetDemo() { localStorage.removeItem(KEY); sessionStorage.removeItem(SESSION_KEY); }

// Every call waits a moment, like a real network, and fails if "server unreachable" is simulated.
async function server(fn) {
  await new Promise((r) => setTimeout(r, 250));
  if (!navigator.onLine) throw new ApiError('network');
  const state = load();
  if (state.scenario === 'server_down') throw new ApiError('network');
  const result = fn(state);
  save(state);
  return structuredClone(result);
}

const activeAlerts = (state) => state.alerts.filter((a) => !a.expires_at || new Date(a.expires_at) > new Date());
const isPaused = (state) => state.paused && (!state.paused_until || new Date(state.paused_until) > new Date());

// Simple brute-force protection, as on the server: 5 wrong tries -> wait 5 minutes.
function checkRateLimit(state, kind) {
  const since = Date.now() - 5 * 60 * 1000;
  state.attempts = state.attempts.filter((a) => a.at > since);
  const mine = state.attempts.filter((a) => a.kind === kind);
  if (mine.length >= 5) {
    throw new ApiError('rate_limited', { retryAfter: Math.ceil((mine[0].at + 5 * 60 * 1000 - Date.now()) / 1000) });
  }
}

// Simulated bus: drives Anavargos -> Tepak -> Campus and back every 8 minutes.
function simulatedPosition(ageSeconds) {
  const [a, tp, c] = ['anavargos', 'tepak', 'campus'].map((id) => demoStops.find((s) => s.id === id));
  const path = [a, tp, c, tp, a];
  const cycle = 8 * 60 * 1000;
  const progress = ((Date.now() - ageSeconds * 1000) % cycle) / cycle * (path.length - 1);
  const i = Math.floor(progress);
  const f = progress - i;
  return {
    lat: path[i].lat + (path[i + 1].lat - path[i].lat) * f,
    lng: path[i].lng + (path[i + 1].lng - path[i].lng) * f,
    recorded_at: new Date(Date.now() - ageSeconds * 1000).toISOString(),
    battery: 76,
  };
}

function inService(state) {
  if (state.scenario === 'not_in_service') return false;
  if (state.scenario === 'real_hours') return inServiceHours(state.service_hours, cyprusNow());
  return true;
}

function trackerPosition(state) {
  const age = { weak: 130, lost: 900 }[state.scenario] ?? 4;
  return simulatedPosition(age);
}

export const demoBackend = {
  getPublicData: () => server((state) => ({
    stops: state.stops,
    trips: state.trips,
    alerts: activeAlerts(state),
    service_hours: state.service_hours,
  })),

  getPosition: (passcode) => server((state) => {
    checkRateLimit(state, 'student');
    if (passcode !== state.student_passcode) {
      state.attempts.push({ kind: 'student', at: Date.now() });
      save(state);
      throw new ApiError('wrong');
    }
    if (isPaused(state)) return { status: 'paused' };
    if (!inService(state)) return { status: 'not_in_service' };
    const pos = trackerPosition(state);
    return { status: 'ok', lat: pos.lat, lng: pos.lng, recorded_at: pos.recorded_at };
  }),

  admin: {
    hasSession: () => sessionStorage.getItem(SESSION_KEY) === 'yes',

    login: (passcode) => server((state) => {
      checkRateLimit(state, 'admin');
      if (passcode !== state.admin_passcode) {
        state.attempts.push({ kind: 'admin', at: Date.now() });
        save(state);
        throw new ApiError('wrong');
      }
      sessionStorage.setItem(SESSION_KEY, 'yes');
      return { ok: true };
    }),

    logout: async () => { sessionStorage.removeItem(SESSION_KEY); },

    getState: () => adminCall((state) => ({
      stops: state.stops,
      trips: state.trips,
      alerts: activeAlerts(state),
      service_hours: state.service_hours,
      paused: isPaused(state),
      paused_until: isPaused(state) ? state.paused_until : null,
      tracker: inService(state) || state.scenario === 'real_hours'
        ? { recorded_at: trackerPosition(state).recorded_at, battery: 76 }
        : { recorded_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), battery: 76 },
      in_service: inService(state),
    })),

    publishAlert: (alert) => adminCall((state) => {
      state.alerts.push({ ...alert, id: crypto.randomUUID(), created_at: new Date().toISOString() });
    }),

    clearAlert: (id) => adminCall((state) => { state.alerts = state.alerts.filter((a) => a.id !== id); }),

    saveTimetable: (trips) => adminCall((state) => { state.trips = trips; }),

    saveServiceHours: (hours) => adminCall((state) => { state.service_hours = hours; }),

    setPause: (paused, until) => adminCall((state) => {
      state.paused = paused;
      state.paused_until = paused ? until : null;
    }),

    setStudentPasscode: (code) => adminCall((state) => { state.student_passcode = code; }),

    setAdminPasscode: (code) => adminCall((state) => { state.admin_passcode = code; }),
  },
};

function adminCall(fn) {
  if (sessionStorage.getItem(SESSION_KEY) !== 'yes') return Promise.reject(new ApiError('session'));
  return server(fn);
}

export const demoInfo = { student: DEMO_STUDENT_PASSCODE, admin: DEMO_ADMIN_PASSCODE };
