// Real back end: talks to the Supabase project over its standard web API.
// No Supabase library is needed — these are plain web requests.
// The matching database setup is in supabase/schema.sql.

import { config } from '../config.js';
import { ApiError } from './errors.js';

const SESSION_KEY = 'dormshuttle-admin-session';

// The public key goes in "apikey". "Authorization" is only sent for the logged-in admin,
// which works with both Supabase's older "anon" keys and newer "publishable" keys.
function headers(token) {
  return {
    apikey: config.supabaseAnonKey,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json',
  };
}

async function request(path, { method = 'GET', body, token, prefer } = {}) {
  let res;
  try {
    res = await fetch(`${config.supabaseUrl}${path}`, {
      method,
      headers: { ...headers(token), ...(prefer ? { Prefer: prefer } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('network');
  }
  if (res.status === 401 || res.status === 403) throw new ApiError(token ? 'session' : 'failed');
  if (res.status === 429) throw new ApiError('rate_limited', { retryAfter: Number(res.headers.get('Retry-After')) || 300 });
  if (res.status >= 500) throw new ApiError('network');
  if (!res.ok) throw new ApiError('failed', { detail: await res.text() });
  // Some answers (e.g. "saved", "deleted") have no body.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const rpc = (name, args = {}, token) => request(`/rest/v1/rpc/${name}`, { method: 'POST', body: args, token });

// ---------- Admin session (Supabase Auth, logged in with the project email + admin passcode) ----------

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

function saveSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }));
}

async function token() {
  const session = loadSession();
  if (!session) throw new ApiError('session');
  if (Date.now() < session.expires_at - 60 * 1000) return session.access_token;
  try {
    const data = await request('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', body: { refresh_token: session.refresh_token },
    });
    saveSession(data);
    return data.access_token;
  } catch (err) {
    if (err.code !== 'network') localStorage.removeItem(SESSION_KEY);
    throw err.code === 'network' ? err : new ApiError('session');
  }
}

async function adminRequest(path, options = {}) {
  return request(path, { ...options, token: await token() });
}

// ---------- Public calls ----------

export const supabaseBackend = {
  async getPublicData() {
    const [stops, trips, alerts, serviceHours] = await Promise.all([
      request('/rest/v1/stops?select=*&order=sort'),
      request('/rest/v1/trips?select=*'),
      request('/rest/v1/alerts?select=*&order=created_at.desc'),
      rpc('get_service_hours'),
    ]);
    return { stops, trips, alerts, service_hours: serviceHours ?? {} };
  },

  async getPosition(passcode) {
    const result = await rpc('get_bus_position', { passcode });
    if (result.status === 'wrong_passcode') throw new ApiError('wrong');
    if (result.status === 'rate_limited') throw new ApiError('rate_limited', { retryAfter: result.retry_after });
    return result;
  },

  admin: {
    hasSession: () => Boolean(loadSession()),

    async login(passcode) {
      try {
        const data = await request('/auth/v1/token?grant_type=password', {
          method: 'POST', body: { email: config.adminEmail, password: passcode },
        });
        saveSession(data);
        return { ok: true };
      } catch (err) {
        if (err.code === 'failed' || err.code === 'session') throw new ApiError('wrong');
        throw err;
      }
    },

    async logout() {
      try { await adminRequest('/auth/v1/logout', { method: 'POST' }); } catch { /* logged out locally anyway */ }
      localStorage.removeItem(SESSION_KEY);
    },

    async getState() {
      const [stops, trips, alerts, settings, position, blocked] = await Promise.all([
        adminRequest('/rest/v1/stops?select=*&order=sort'),
        adminRequest('/rest/v1/trips?select=*'),
        adminRequest('/rest/v1/alerts?select=*&order=created_at.desc'),
        adminRequest('/rest/v1/settings?select=service_hours,paused,paused_until&id=eq.1'),
        adminRequest('/rest/v1/bus_position?select=recorded_at,battery&id=eq.1'),
        rpc('count_passcode_blocks', {}, await token()),
      ]);
      const s = settings[0] ?? {};
      const paused = s.paused && (!s.paused_until || new Date(s.paused_until) > new Date());
      return {
        stops, trips, alerts,
        service_hours: s.service_hours ?? {},
        paused,
        paused_until: paused ? s.paused_until : null,
        tracker: position[0] ?? null,
        blocked_networks: blocked ?? 0,
      };
    },

    publishAlert: (alert) => adminRequest('/rest/v1/alerts', { method: 'POST', body: alert, prefer: 'return=minimal' }),

    clearAlert: (id) => adminRequest(`/rest/v1/alerts?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }),

    // Replaces the whole timetable in one step on the server, so it's never half-saved.
    saveTimetable: async (trips) => rpc('save_timetable', { new_trips: trips }, await token()),

    saveServiceHours: (hours) => adminRequest('/rest/v1/settings?id=eq.1', {
      method: 'PATCH', body: { service_hours: hours }, prefer: 'return=minimal',
    }),

    setPause: (paused, until) => adminRequest('/rest/v1/settings?id=eq.1', {
      method: 'PATCH', body: { paused, paused_until: paused ? until : null }, prefer: 'return=minimal',
    }),

    setStudentPasscode: async (code) => rpc('set_student_passcode', { new_passcode: code }, await token()),

    clearPasscodeBlocks: async () => rpc('clear_passcode_blocks', {}, await token()),

    setAdminPasscode: (code) => adminRequest('/auth/v1/user', { method: 'PUT', body: { password: code } }),
  },
};
