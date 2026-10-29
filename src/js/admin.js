// Admin page: alerts, pause tracking, service hours, timetable and passcodes.

import { config } from '../config.js';
import { api } from './api.js';
import { loadStrings, t } from './i18n.js';
import {
  cyprusNow, agoText, inServiceHours, normaliseTime, toMinutes, cyprusLocalToIso,
  isoToCyprusLocal, formatWhen,
} from './time.js';
import { todaysRuns, stopsInOrder, firstDeparture } from './timetable.js';

const $ = (id) => document.getElementById(id);
const DAYS_MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

let adminState = null;   // last state loaded from the server
let editTrips = [];      // the timetable as being edited (saved only on "Save timetable")

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (value === true) node.setAttribute(key, '');
    else if (value !== false && value !== null && value !== undefined) node.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) {
    if (child !== null && child !== undefined && child !== false) node.append(child);
  }
  return node;
}

// Shows a success or error line under a form.
function formMessage(form, text, ok = false) {
  const box = form.classList.contains('form-msg') ? form : (form.querySelector('.form-msg') ?? form);
  box.textContent = text;
  box.className = `form-msg ${ok ? 'form-ok' : 'form-error'}`;
  box.hidden = !text;
}

// Runs a save. Handles "logged out" and "no connection" the same way everywhere,
// and never clears what she typed if it fails.
async function save(form, button, action, okText = t('admin.saved')) {
  if (button) button.disabled = true;
  formMessage(form, t('admin.saving'), true);
  try {
    await action();
    formMessage(form, okText, true);
    await reload();
    return true;
  } catch (err) {
    if (err.code === 'session') {
      formMessage(form, t('admin.sessionExpired'));
      showLogin(t('admin.sessionExpired'));
    } else {
      formMessage(form, t('admin.saveFailed'));
    }
    return false;
  } finally {
    if (button) button.disabled = false;
  }
}

// ---------- Login ----------

function showLogin(message = '') {
  $('login').hidden = false;
  $('logout').hidden = true;
  const msg = $('admin-msg');
  msg.textContent = message;
  msg.hidden = !message;
  $('login-passcode').focus();
}

function setUpLogin() {
  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = $('login-passcode');
    const button = event.target.querySelector('button');
    const error = $('login-error');
    error.hidden = true;
    button.disabled = true;
    try {
      await api.admin.login(input.value);
      input.value = '';
      $('login').hidden = true;
      $('admin-msg').hidden = true;
      $('logout').hidden = false;
      await reload(true);
    } catch (err) {
      error.textContent = err.code === 'wrong' ? t('admin.loginWrong')
        : err.code === 'rate_limited' ? t('admin.loginTooMany', { min: Math.max(1, Math.ceil(err.retryAfter / 60)) })
          : t('admin.saveFailed');
      error.hidden = false;
    } finally {
      button.disabled = false;
    }
  });
  $('logout').addEventListener('click', async () => {
    await api.admin.logout();
    location.reload();
  });
}

// ---------- Loading ----------

async function reload(first = false) {
  try {
    adminState = await api.admin.getState();
  } catch (err) {
    if (err.code === 'session') showLogin(first ? '' : t('admin.sessionExpired'));
    else {
      $('admin-msg').textContent = t('admin.saveFailed');
      $('admin-msg').hidden = false;
    }
    return;
  }
  $('panel').hidden = false;
  $('logout').hidden = false;
  if (first) {
    editTrips = structuredClone(adminState.trips);
    sortTrips();
    renderTrips();
    renderHoursForm();
    resetAlertForm();
  }
  renderTracker();
  renderAlerts();
  renderAffects();
  renderPause();
}

// ---------- Tracker status ----------

function renderTracker() {
  const box = $('tracker-status');
  const tracker = adminState.tracker;
  const inService = inServiceHours(adminState.service_hours);
  const lines = [];
  let warn = false;
  if (!tracker?.recorded_at) {
    lines.push(t('admin.tracker.never'));
    warn = inService;
  } else {
    const age = (Date.now() - new Date(tracker.recorded_at).getTime()) / 1000;
    if (inService && !adminState.paused && age > config.trackerStaleSeconds) {
      lines.push(t('admin.tracker.stale', { ago: agoText(age) }));
      warn = true;
    } else {
      lines.push(t('admin.tracker.ok', { ago: agoText(age) }));
    }
    if (typeof tracker.battery === 'number') {
      if (tracker.battery <= config.lowBatteryPercent) {
        lines.push(t('admin.tracker.batteryLow', { pct: tracker.battery }));
        warn = true;
      } else {
        lines.push(t('admin.tracker.battery', { pct: tracker.battery }));
      }
    }
  }
  box.className = `banner ${warn ? 'banner-conn' : ''}`;
  box.textContent = lines.join(' ');
}

// ---------- Alerts ----------

const activeAlerts = () => adminState.alerts.filter((a) => !a.expires_at || new Date(a.expires_at) > new Date());

function renderAlerts() {
  const list = activeAlerts();
  $('alert-list').replaceChildren(...(list.length ? list.map((alert) => el('div', { class: 'alert-row' },
    el('div', {},
      el('span', { class: 'alert-type' }, t(`alert.${alert.type}`)),
      el('strong', {}, alert.message),
      el('div', { class: 'small muted' }, [
        alert.type === 'delay' && alert.delay_min ? t('alert.delayMinutes', { min: alert.delay_min }) : '',
        alert.expires_at ? t('alert.until', { time: formatWhen(alert.expires_at) }) : '',
      ].filter(Boolean).join(' · '))),
    el('button', {
      class: 'btn btn-outline btn-small',
      type: 'button',
      onclick: (event) => save($('alert-list-msg'), event.target, () => api.admin.clearAlert(alert.id), ''),
    }, t('admin.alerts.clear'))))
    : [el('p', { class: 'muted' }, t('admin.alerts.none'))]));
}

function remainingRunsToday() {
  return todaysRuns({ ...adminState, alerts: [] }, cyprusNow()).filter((run) => !run.past);
}

function runLabel(run) {
  const direction = t(`tt.direction.${run.trip.direction}`);
  return `${run.first.time} · ${direction} · ${run.first.stop.name}${run.trip.note ? ` (${run.trip.note})` : ''}`;
}

function renderAffects() {
  const type = $('alert-type').value;
  $('delay-field').hidden = type !== 'delay';
  const field = $('affects-field');
  field.hidden = type === 'info';
  const runs = remainingRunsToday();
  const list = $('affects-list');
  const checked = new Set([...list.querySelectorAll('input:checked')].map((i) => i.value));
  const firstRender = !list.children.length;
  if (!runs.length) { list.replaceChildren(el('p', { class: 'muted small' }, t('admin.alerts.affectsNone'))); return; }
  // By default only the next run is ticked — most delays affect just that one.
  if (firstRender) checked.add(runs[0].trip.id);
  list.replaceChildren(
    el('label', {}, el('input', {
      type: 'checkbox', value: 'all', checked: checked.has('all'),
      onchange: (e) => list.querySelectorAll('input[name="run"]').forEach((i) => { i.disabled = e.target.checked; }),
    }), t('admin.alerts.affectsAll')),
    ...runs.map((run) => el('label', {}, el('input', {
      type: 'checkbox', name: 'run', value: run.trip.id, checked: checked.has(run.trip.id),
      disabled: checked.has('all'),
    }), runLabel(run))),
  );
}

function resetAlertForm() {
  $('alert-form').reset();
  $('affects-list').replaceChildren();
  // Alerts remove themselves at the end of the day unless she changes it.
  $('alert-expires').value = `${cyprusNow().date}T23:59`;
  renderAffects();
}

function setUpAlertForm() {
  $('alert-type').addEventListener('change', renderAffects);
  $('alert-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const type = $('alert-type').value;
    const message = $('alert-message').value.trim();
    const delay = Number($('alert-delay').value);
    if (!message) { formMessage(form, t('admin.alerts.needMessage')); return; }
    if (type === 'delay' && !(delay > 0)) { formMessage(form, t('admin.alerts.needDelay')); return; }

    let tripIds = [];
    if (type !== 'info') {
      const all = $('affects-list').querySelector('input[value="all"]')?.checked;
      tripIds = all ? remainingRunsToday().map((run) => run.trip.id)
        : [...$('affects-list').querySelectorAll('input[name="run"]:checked')].map((i) => i.value);
    }
    const alert = {
      type,
      message,
      delay_min: type === 'delay' ? delay : null,
      trip_ids: tripIds,
      expires_at: cyprusLocalToIso($('alert-expires').value),
    };
    const ok = await save(form, form.querySelector('button[type="submit"]'), () => api.admin.publishAlert(alert));
    if (ok) {
      resetAlertForm();
      formMessage(form, t('admin.saved'), true);
    }
  });
}

// ---------- Pause tracking ----------

function renderPause() {
  const { paused, paused_until: until } = adminState;
  $('pause-status').textContent = !paused ? t('admin.pause.isLive')
    : until ? t('admin.pause.isPausedUntil', { when: formatWhen(until) }) : t('admin.pause.isPaused');
  $('pause-btn').hidden = paused;
  $('pause-until-field').hidden = paused;
  $('resume-btn').hidden = !paused;
}

function setUpPauseForm() {
  const form = $('pause-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    save(form, $('pause-btn'), () => api.admin.setPause(true, cyprusLocalToIso($('pause-until').value)));
  });
  $('resume-btn').addEventListener('click', (event) => {
    save(form, event.target, () => api.admin.setPause(false, null));
  });
}

// ---------- Service hours ----------

function renderHoursForm() {
  const hours = adminState.service_hours ?? {};
  $('hours-grid').replaceChildren(
    el('span'), el('span', { class: 'small muted' }, t('admin.hours.start')), el('span', { class: 'small muted' }, t('admin.hours.end')),
    ...DAYS_MON_FIRST.flatMap((day) => [
      el('span', { class: 'day' }, t(`day.${day}`)),
      el('input', { type: 'time', id: `hours-start-${day}`, value: hours[day]?.start ?? '', 'aria-label': `${t(`day.${day}`)} ${t('admin.hours.start')}` }),
      el('input', { type: 'time', id: `hours-end-${day}`, value: hours[day]?.end ?? '', 'aria-label': `${t(`day.${day}`)} ${t('admin.hours.end')}` }),
    ]),
  );
}

function setUpHoursForm() {
  $('hours-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    const hours = {};
    for (const day of DAYS_MON_FIRST) {
      const start = normaliseTime($(`hours-start-${day}`).value);
      const end = normaliseTime($(`hours-end-${day}`).value);
      const startRaw = $(`hours-start-${day}`).value;
      const endRaw = $(`hours-end-${day}`).value;
      if (!startRaw && !endRaw) continue; // no service that day
      if (!start || !end || toMinutes(start) >= toMinutes(end)) {
        formMessage(form, t('admin.hours.invalid', { day: t(`day.${day}`) }));
        return;
      }
      hours[day] = { start, end };
    }
    save(form, form.querySelector('button'), () => api.admin.saveServiceHours(hours));
  });
}

// ---------- Timetable editor ----------

function sortTrips() {
  const key = (trip) => {
    const first = firstDeparture(trip, adminState.stops);
    return [Math.min(...trip.days.map((d) => (d + 6) % 7)), first ? first.minutes : 9999];
  };
  editTrips.sort((a, b) => {
    const [ad, at] = key(a);
    const [bd, bt] = key(b);
    return ad - bd || at - bt;
  });
}

function renderFilter() {
  const select = $('tt-filter');
  if (select.options.length) return;
  select.append(el('option', { value: 'all' }, t('admin.tt.filterAll')));
  DAYS_MON_FIRST.forEach((day) => select.append(el('option', { value: day }, t(`day.${day}`))));
  // Start on today's runs rather than the whole week, so the list stays short.
  select.value = String(cyprusNow().day);
  select.addEventListener('change', renderTrips);
}

function newTrip(direction = 'to_campus') {
  return { id: crypto.randomUUID(), days: [1, 2, 3, 4, 5], direction, times: {}, note: '', tracked: true };
}

function tripEditor(trip, number) {
  const stops = stopsInOrder(adminState.stops, trip.direction);
  const row = el('div', { class: 'trip-row', id: `trip-${trip.id}` });
  const rerender = () => row.replaceWith(tripEditor(trip, number));

  row.append(
    el('div', { class: 'trip-head' },
      el('span', { class: 'num' }, `#${number}`),
      el('select', {
        'aria-label': t('admin.tt.direction'),
        onchange: (e) => { trip.direction = e.target.value; rerender(); },
      }, ['to_campus', 'to_dorms'].map((d) => el('option', { value: d, selected: d === trip.direction }, t(`tt.direction.${d}`)))),
      el('label', { class: 'inline-check' },
        el('input', { type: 'checkbox', checked: trip.tracked !== false, onchange: (e) => { trip.tracked = e.target.checked; } }),
        t('admin.tt.tracked'))),
    el('div', { class: 'day-chips', role: 'group', 'aria-label': t('admin.tt.days') },
      DAYS_MON_FIRST.map((day) => el('label', {},
        el('input', {
          type: 'checkbox', checked: trip.days.includes(day),
          onchange: (e) => {
            trip.days = e.target.checked ? [...trip.days, day] : trip.days.filter((d) => d !== day);
          },
        }),
        el('span', {}, t(`dayShort.${day}`))))),
    el('div', { class: 'trip-times' }, stops.map((stop) => {
      const id = `time-${trip.id}-${stop.id}`;
      return el('div', {},
        el('label', { for: id }, stop.name),
        el('input', {
          id, type: 'text', inputmode: 'numeric', placeholder: '--:--', value: trip.times?.[stop.id] ?? '', maxlength: 5,
          oninput: (e) => {
            trip.times = { ...trip.times, [stop.id]: e.target.value.trim() };
            if (!trip.times[stop.id]) delete trip.times[stop.id];
          },
        }));
    })),
    el('div', { class: 'trip-foot' },
      el('input', {
        type: 'text', value: trip.note ?? '', placeholder: t('admin.tt.note'), 'aria-label': t('admin.tt.note'), maxlength: 40,
        oninput: (e) => { trip.note = e.target.value; },
      }),
      el('div', { class: 'actions' },
        el('button', {
          class: 'btn btn-outline btn-small', type: 'button',
          onclick: () => {
            const copy = { ...structuredClone(trip), id: crypto.randomUUID() };
            editTrips.splice(editTrips.indexOf(trip) + 1, 0, copy);
            renderTrips();
          },
        }, t('admin.tt.duplicate')),
        el('button', {
          class: 'btn btn-outline btn-small', type: 'button',
          onclick: () => { editTrips = editTrips.filter((x) => x !== trip); renderTrips(); },
        }, t('admin.tt.delete')))),
  );
  return row;
}

function renderTrips() {
  renderFilter();
  const filter = $('tt-filter').value;
  const list = $('trip-list');
  if (!editTrips.length) { list.replaceChildren(el('p', { class: 'card muted' }, t('admin.tt.empty'))); return; }
  list.replaceChildren(...editTrips
    .map((trip, i) => [trip, i + 1])
    .filter(([trip]) => filter === 'all' || trip.days.includes(Number(filter)))
    .map(([trip, number]) => tripEditor(trip, number)));
}

// Checks every run; returns the first problem found, or null. Also tidies the times.
function validateTrips() {
  for (const [i, trip] of editTrips.entries()) {
    const n = i + 1;
    if (!trip.days.length) return { trip, text: t('admin.tt.errNoDays', { n }) };
    const stops = stopsInOrder(adminState.stops, trip.direction);
    let previous = -1;
    let any = false;
    const tidy = {};
    for (const stop of stops) {
      const raw = trip.times?.[stop.id];
      if (!raw) continue;
      const time = normaliseTime(raw);
      if (!time) return { trip, text: t('admin.tt.errBadTime', { n, value: raw }) };
      if (toMinutes(time) < previous) return { trip, text: t('admin.tt.errOrder', { n, stop: stop.name }) };
      previous = toMinutes(time);
      tidy[stop.id] = time;
      any = true;
    }
    if (!any) return { trip, text: t('admin.tt.errFirstTime', { n, stop: stops[0].name }) };
    trip.times = tidy;
  }
  return null;
}

function setUpTimetable() {
  $('add-trip').addEventListener('click', () => {
    const trip = newTrip();
    const filter = $('tt-filter').value;
    if (filter !== 'all') trip.days = [Number(filter)];
    editTrips.push(trip);
    renderTrips();
    $(`trip-${trip.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  $('save-trips').addEventListener('click', async (event) => {
    const box = $('trips-msg');
    document.querySelectorAll('.trip-row.invalid').forEach((r) => r.classList.remove('invalid'));
    const problem = validateTrips();
    if (problem) {
      formMessage(box, problem.text);
      $('tt-filter').value = 'all';
      renderTrips();
      const row = $(`trip-${problem.trip.id}`);
      row?.classList.add('invalid');
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const ok = await save(box, event.target, () => api.admin.saveTimetable(editTrips));
    if (ok) { sortTrips(); renderTrips(); }
  });

  $('clear-trips').addEventListener('click', () => {
    if (!confirm(t('admin.tt.confirmClear'))) return;
    editTrips = [];
    renderTrips();
  });
}

// ---------- Passcodes ----------

function setUpPasscodeForms() {
  document.querySelectorAll('.pass-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const kind = form.dataset.kind;
      const code = $(`${kind}-new`).value.trim();
      if (code.length < config.minPasscodeLength) {
        formMessage(form, t('admin.pass.tooShort', { n: config.minPasscodeLength }));
        return;
      }
      if (code !== $(`${kind}-confirm`).value.trim()) { formMessage(form, t('admin.pass.mismatch')); return; }
      const action = kind === 'student' ? () => api.admin.setStudentPasscode(code) : () => api.admin.setAdminPasscode(code);
      if (await save(form, form.querySelector('button'), action, t('admin.pass.changed'))) form.reset();
    });
  });
}

// ---------- Start ----------

async function start() {
  await loadStrings();
  setUpLogin();
  setUpAlertForm();
  setUpPauseForm();
  setUpHoursForm();
  setUpTimetable();
  setUpPasscodeForms();
  if (api.admin.hasSession()) await reload(true);
  else showLogin();
  // Keep the tracker status and alert list current while the page is open.
  setInterval(() => { if (!$('panel').hidden && $('login').hidden) reload(); }, 30000);
}

start();
