// Admin page: live tracking switch, alerts, service hours, timetable, travel times and passcodes.

import { config } from '../config.js';
import { api } from './api.js';
import { loadStrings, t } from './i18n.js';
import {
  cyprusNow, agoText, inServiceHours, normaliseTime, toMinutes, cyprusLocalToIso, formatWhen,
} from './time.js';
import { todaysRuns, firstDeparture, runTimes, directionOf, MIN_MEASURED_TRIPS } from './timetable.js';

const $ = (id) => document.getElementById(id);
const DAYS_MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

let adminState = null;   // last state loaded from the server
let editTrips = [];      // the timetable as being edited (saved only on "Save timetable")
let tripsDirty = false;  // true when editTrips has changes that aren't saved yet
let bannerKind = null;   // what the top banner is currently showing
let updateNav = () => {}; // re-checks which section tab to highlight (set up in setUpNav)

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

// The banner at the top: connection problems and "logged out". kind lets a later
// success clear only the message it fixes.
function setBanner(text, kind) {
  const banner = $('admin-msg');
  banner.textContent = text;
  banner.hidden = !text;
  bannerKind = text ? kind : null;
}

function clearBanner(kind) {
  if (bannerKind === kind) setBanner('', null);
}

// ---------- Login ----------

function showLogin(message = '') {
  $('admin-loading').hidden = true;
  $('login').hidden = false;
  $('logout').hidden = true;
  setBanner(message, 'session');
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
      clearBanner('session');
      $('logout').hidden = false;
      // If the panel is already on screen (logged out mid-edit), keep her unsaved edits.
      await reload($('panel').hidden);
    } catch (err) {
      error.textContent = err.code === 'wrong' ? t('admin.loginWrong')
        : err.code === 'rate_limited' ? t('admin.loginTooMany', { min: Math.max(1, Math.ceil(err.retryAfter / 60)) })
          : t('admin.loginNetwork');
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
    $('admin-loading').hidden = true;
    if (err.code === 'session') showLogin(first ? '' : t('admin.sessionExpired'));
    else setBanner(navigator.onLine ? t('admin.loadFailed') : t('admin.offline'), 'connection');
    return;
  }
  clearBanner('connection');
  $('admin-loading').hidden = true;
  $('panel').hidden = false;
  $('logout').hidden = false;
  if (first) {
    editTrips = structuredClone(adminState.trips);
    renderTrips();
    renderHoursForm();
    resetAlertForm();
  }
  renderTracker();
  renderAlerts();
  renderAffects();
  renderSwitch();
  renderBlocks();
  updateNav();
}

// ---------- Passcode blocks (D-028) ----------

function renderBlocks() {
  const n = adminState.blocked_networks ?? 0;
  $('blocks-text').textContent = n ? t('admin.blocks.some', { n }) : t('admin.blocks.none');
  $('clear-blocks').hidden = !n;
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

// ---------- Live tracking ON/OFF (D-032) ----------

function renderSwitch() {
  const { paused, paused_until: until } = adminState;
  const button = $('tracking-switch');
  button.setAttribute('aria-checked', String(!paused));
  $('switch-label').textContent = paused ? t('admin.switch.off') : t('admin.switch.on');
  $('tracking-status').textContent = !paused ? t('admin.switch.isOn')
    : until ? t('admin.switch.isOffUntil', { when: formatWhen(until) }) : t('admin.switch.isOff');
  $('tracking-card').classList.toggle('is-off', paused);
  // "Turn back on automatically at" is chosen when switching off.
  $('resume-field').hidden = paused;
}

function setUpSwitch() {
  const button = $('tracking-switch');
  button.addEventListener('click', async () => {
    const turnOff = !adminState.paused;
    const until = turnOff ? cyprusLocalToIso($('resume-at').value) : null;
    const ok = await save($('tracking-msg'), button, () => api.admin.setPause(turnOff, until));
    if (ok) $('resume-at').value = '';
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

// ---------- Timetable editor (D-031) ----------

let selectedDay = cyprusNow().day; // the day whose runs are listed
let openTripId = null;             // the run whose editor is open
const editTravel = new Map();      // travel times typed but not saved: 'from>to' -> text in the box

const stopById = (id) => adminState.stops.find((s) => s.id === id) ?? { id, name: id };
const stopsSorted = () => [...adminState.stops].sort((a, b) => a.sort - b.sort);

// Saved travel times plus any numbers typed but not saved yet, so estimates update as she types.
function currentTravelTimes() {
  const rows = (adminState.travel_times ?? []).map((r) => ({ ...r }));
  for (const [key, text] of editTravel) {
    const [from, to] = key.split('>');
    const value = text.trim() === '' ? null : Number(text);
    const manual = Number.isInteger(value) && value >= 1 && value <= 180 ? value : null;
    const row = rows.find((r) => r.from_stop === from && r.to_stop === to);
    if (row) row.manual_min = manual;
    else rows.push({ from_stop: from, to_stop: to, manual_min: manual, measured_avg: null, measured_count: 0 });
  }
  return rows;
}

function routeText(trip) {
  return trip.stop_ids.length ? trip.stop_ids.map((id) => stopById(id).name).join(' → ') : t('admin.tt.noStops');
}

function setTripsDirty(dirty) {
  tripsDirty = dirty;
  $('trips-unsaved').hidden = !dirty;
}

function renderDayPicker() {
  $('day-picker').replaceChildren(...DAYS_MON_FIRST.map((day) => el('button', {
    type: 'button',
    class: 'day-btn',
    'aria-pressed': String(day === selectedDay),
    'aria-label': t(`day.${day}`),
    onclick: () => { selectedDay = day; openTripId = null; renderTrips(); },
  }, t(`dayShort.${day}`))));
}

// One line per run: "08:30  Anavargos Dorms → Tepak Dorms → Campus". Tapping opens the editor.
function tripSummary(trip) {
  const first = firstDeparture(trip, adminState.stops);
  const open = trip.id === openTripId;
  return el('button', {
    type: 'button',
    class: 'trip-summary',
    'aria-expanded': String(open),
    onclick: () => { openTripId = open ? null : trip.id; renderTrips(); },
  },
  el('span', { class: 'time' }, first ? first.time : '--:--'),
  el('span', { class: 'route' }, routeText(trip)),
  trip.note ? el('span', { class: 'tag' }, trip.note) : null,
  trip.tracked === false ? el('span', { class: 'tag' }, t('next.notTracked')) : null);
}

function tripEditor(trip) {
  const box = el('div', { class: 'trip-editor' });

  const days = el('div', { class: 'day-chips', role: 'group', 'aria-label': t('admin.tt.days') },
    DAYS_MON_FIRST.map((day) => el('label', {},
      el('input', {
        type: 'checkbox',
        checked: trip.days.includes(day),
        onchange: (e) => { trip.days = e.target.checked ? [...trip.days, day] : trip.days.filter((d) => d !== day); },
      }),
      el('span', {}, t(`dayShort.${day}`)))));

  // Tapping a stop adds it as the next stop; tapping it again takes it out.
  const stopPicker = el('div', { class: 'stop-picker', role: 'group', 'aria-label': t('admin.tt.stops') },
    stopsSorted().map((stop) => {
      const index = trip.stop_ids.indexOf(stop.id);
      return el('button', {
        type: 'button',
        class: `stop-btn${index >= 0 ? ' selected' : ''}`,
        'aria-pressed': String(index >= 0),
        onclick: () => {
          if (index >= 0) {
            trip.stop_ids = trip.stop_ids.filter((id) => id !== stop.id);
            trip.times = { ...trip.times };
            delete trip.times[stop.id];
          } else {
            trip.stop_ids = [...trip.stop_ids, stop.id];
          }
          setTripsDirty(true);
          renderTrips();
        },
      }, index >= 0 ? el('span', { class: 'order' }, String(index + 1)) : null, stop.name);
    }));

  const times = el('div', { class: 'trip-times' }, trip.stop_ids.map((id, i) => {
    const inputId = `time-${trip.id}-${id}`;
    return el('div', {},
      el('label', { for: inputId }, `${i + 1}. ${stopById(id).name}`),
      el('input', {
        id: inputId, type: 'text', inputmode: 'numeric', maxlength: 5, 'data-stop': id, value: trip.times?.[id] ?? '',
        oninput: (e) => {
          const value = e.target.value.trim();
          trip.times = { ...trip.times };
          if (value) trip.times[id] = value;
          else delete trip.times[id];
          refreshEstimates(box, trip);
        },
      }));
  }));

  box.append(
    el('h3', { class: 'editor-label' }, t('admin.tt.days')),
    days,
    el('p', { class: 'small muted' }, t('admin.tt.daysHelp')),
    el('h3', { class: 'editor-label' }, t('admin.tt.stops')),
    stopPicker,
    ...(trip.stop_ids.length ? [
      el('h3', { class: 'editor-label' }, t('admin.tt.times')),
      times,
      el('p', { class: 'small muted' }, t('admin.tt.estimateHint')),
    ] : []),
    el('div', { class: 'trip-foot' },
      el('input', {
        type: 'text', value: trip.note ?? '', placeholder: t('admin.tt.note'), 'aria-label': t('admin.tt.note'), maxlength: 40,
        oninput: (e) => { trip.note = e.target.value; },
      }),
      el('label', { class: 'inline-check' },
        el('input', { type: 'checkbox', checked: trip.tracked !== false, onchange: (e) => { trip.tracked = e.target.checked; } }),
        t('admin.tt.tracked'))),
    el('div', { class: 'trip-actions' },
      el('button', {
        class: 'btn btn-small', type: 'button',
        onclick: () => { openTripId = null; renderTrips(); },
      }, t('admin.tt.done')),
      el('button', {
        class: 'btn btn-outline btn-small', type: 'button',
        onclick: () => {
          const copy = { ...structuredClone(trip), id: crypto.randomUUID() };
          editTrips.push(copy);
          openTripId = copy.id;
          setTripsDirty(true);
          renderTrips();
        },
      }, t('admin.tt.duplicate')),
      el('button', {
        class: 'btn btn-outline btn-small', type: 'button',
        onclick: () => { editTrips = editTrips.filter((x) => x !== trip); openTripId = null; setTripsDirty(true); renderTrips(); },
      }, t('admin.tt.delete'))),
  );
  refreshEstimates(box, trip);
  return box;
}

// Shows estimated times as grey hints ("~08:40") in the boxes she hasn't typed in.
function refreshEstimates(box, trip) {
  for (const entry of runTimes(trip, adminState.stops, currentTravelTimes())) {
    const input = box.querySelector(`input[data-stop="${entry.stop.id}"]`);
    if (input) input.placeholder = entry.estimated ? `~${entry.time}` : '--:--';
  }
  const summaryTime = box.closest('.trip-row')?.querySelector('.trip-summary .time');
  if (summaryTime) summaryTime.textContent = firstDeparture(trip, adminState.stops)?.time ?? '--:--';
}

function refreshOpenEditor() {
  const box = document.querySelector('.trip-editor');
  const trip = editTrips.find((x) => x.id === openTripId);
  if (box && trip) refreshEstimates(box, trip);
}

function renderTrips() {
  renderDayPicker();
  const list = $('trip-list');
  const startOf = (trip) => firstDeparture(trip, adminState.stops)?.minutes ?? 9999;
  // The open run stays visible even if she unticks the day being shown.
  const trips = editTrips
    .filter((trip) => trip.days.includes(selectedDay) || trip.id === openTripId)
    .sort((a, b) => startOf(a) - startOf(b));
  if (!editTrips.length) list.replaceChildren(el('p', { class: 'card muted' }, t('admin.tt.empty')));
  else if (!trips.length) list.replaceChildren(el('p', { class: 'muted' }, t('admin.tt.noneOnDay', { day: t(`day.${selectedDay}`) })));
  else {
    list.replaceChildren(...trips.map((trip) => el('div', { class: `trip-row${trip.id === openTripId ? ' open' : ''}`, id: `trip-${trip.id}` },
      tripSummary(trip),
      trip.id === openTripId ? tripEditor(trip) : null)));
  }
  renderTravel(); // the list of stop pairs depends on the runs
}

// Checks every run; returns the first problem found, or null. Also tidies the times.
function validateTrips() {
  for (const trip of editTrips) {
    if (!trip.days.length) return { trip, text: t('admin.tt.errNoDays') };
    if (trip.stop_ids.length < 2) return { trip, text: t('admin.tt.errStops') };
    const tidy = {};
    for (const id of trip.stop_ids) {
      const raw = trip.times?.[id];
      if (!raw) continue;
      const time = normaliseTime(raw);
      if (!time) return { trip, text: t('admin.tt.errBadTime', { value: raw }) };
      tidy[id] = time;
    }
    const firstId = trip.stop_ids[0];
    if (!tidy[firstId]) return { trip, text: t('admin.tt.errFirstTime', { stop: stopById(firstId).name }) };
    trip.times = tidy;
    let previous = -1;
    for (const entry of runTimes(trip, adminState.stops, currentTravelTimes())) {
      if (entry.minutes === null) continue;
      if (entry.minutes < previous) return { trip, text: t('admin.tt.errOrder', { stop: entry.stop.name }) };
      previous = entry.minutes;
    }
    trip.direction = directionOf(trip.stop_ids);
  }
  return null;
}

function setUpTimetable() {
  // Any typing or ticking inside the editor counts as an unsaved change.
  $('trip-list').addEventListener('input', () => setTripsDirty(true));
  $('trip-list').addEventListener('change', () => setTripsDirty(true));
  // Warn before leaving the page with unsaved timetable changes.
  window.addEventListener('beforeunload', (event) => { if (tripsDirty) event.preventDefault(); });

  $('add-trip').addEventListener('click', () => {
    const trip = {
      id: crypto.randomUUID(), days: [selectedDay], stop_ids: [], direction: 'to_campus', times: {}, note: '', tracked: true,
    };
    editTrips.push(trip);
    openTripId = trip.id;
    setTripsDirty(true);
    renderTrips();
    $(`trip-${trip.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  $('save-trips').addEventListener('click', async (event) => {
    const box = $('trips-msg');
    const problem = validateTrips();
    if (problem) {
      formMessage(box, problem.text);
      // Show the run with the problem: switch to one of its days and open it.
      if (problem.trip.days.length && !problem.trip.days.includes(selectedDay)) selectedDay = problem.trip.days[0];
      openTripId = problem.trip.id;
      renderTrips();
      const row = $(`trip-${problem.trip.id}`);
      row?.classList.add('invalid');
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const ok = await save(box, event.target, () => api.admin.saveTimetable(editTrips));
    if (ok) { setTripsDirty(false); renderTrips(); }
  });

  $('clear-trips').addEventListener('click', () => {
    if (!confirm(t('admin.tt.confirmClear'))) return;
    editTrips = [];
    openTripId = null;
    setTripsDirty(true);
    renderTrips();
  });
}

// ---------- Travel times (D-031) ----------

// Every pair of stops that follow each other in some run, plus pairs that already have a time.
function travelPairs() {
  const keys = new Set((adminState.travel_times ?? []).map((r) => `${r.from_stop}>${r.to_stop}`));
  for (const trip of editTrips) {
    trip.stop_ids.slice(1).forEach((id, i) => keys.add(`${trip.stop_ids[i]}>${id}`));
  }
  const order = (id) => stopById(id).sort ?? 99;
  return [...keys].map((key) => key.split('>')).sort((a, b) => order(a[0]) - order(b[0]) || order(a[1]) - order(b[1]));
}

function renderTravel() {
  $('travel-help').textContent = t('admin.travel.help', { n: MIN_MEASURED_TRIPS });
  const rows = travelPairs().map(([from, to]) => {
    const key = `${from}>${to}`;
    const saved = adminState.travel_times?.find((r) => r.from_stop === from && r.to_stop === to);
    const count = saved?.measured_count ?? 0;
    const inUse = count >= MIN_MEASURED_TRIPS && saved?.measured_avg;
    const status = inUse ? t('admin.travel.measured', { min: Math.round(saved.measured_avg), count })
      : count > 0 ? t('admin.travel.measuring', { count, n: MIN_MEASURED_TRIPS })
        : t('admin.travel.notMeasured');
    const id = `travel-${from}-${to}`;
    return el('div', { class: 'travel-row' },
      el('label', { for: id, class: 'travel-pair' }, `${stopById(from).name} → ${stopById(to).name}`),
      el('input', {
        id, type: 'number', min: 1, max: 180, inputmode: 'numeric', 'aria-describedby': `${id}-status`,
        value: editTravel.has(key) ? editTravel.get(key) : (saved?.manual_min ?? ''),
        oninput: (e) => { editTravel.set(key, e.target.value); refreshOpenEditor(); },
      }),
      el('p', { id: `${id}-status`, class: `travel-status small ${inUse ? 'in-use' : 'muted'}` }, status));
  });
  $('travel-list').replaceChildren(
    el('div', { class: 'travel-head small muted' }, el('span'), el('span', {}, t('admin.travel.minutes'))),
    ...rows,
  );
}

function setUpTravel() {
  $('travel-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const rows = [];
    for (const [from, to] of travelPairs()) {
      const input = $(`travel-${from}-${to}`);
      const text = input.value.trim();
      const value = text === '' ? null : Number(text);
      if (value !== null && !(Number.isInteger(value) && value >= 1 && value <= 180)) {
        formMessage(form, t('admin.travel.invalid', { from: stopById(from).name, to: stopById(to).name }));
        input.focus();
        return;
      }
      rows.push({ from_stop: from, to_stop: to, manual_min: value });
    }
    if (await save(form, form.querySelector('button'), () => api.admin.saveTravelTimes(rows))) {
      editTravel.clear();
      renderTravel();
    }
  });
}

// ---------- Section tabs (D-033) ----------

// The tabs stick to the top of the screen; the one for the section in view is highlighted.
function setUpNav() {
  const nav = $('admin-nav');
  const links = [...nav.querySelectorAll('a')];
  updateNav = () => {
    const offset = nav.getBoundingClientRect().height + 24;
    let current = null;
    for (const link of links) {
      const section = document.querySelector(link.getAttribute('href'));
      if (section && section.getBoundingClientRect().top <= offset) current = link;
    }
    // Scrolled to the very bottom: the last section may be too short to reach the top.
    const atBottom = window.scrollY > 0
      && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (atBottom) current = links[links.length - 1];
    for (const link of links) {
      link.classList.toggle('active', link === current);
      if (link === current) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  };
  window.addEventListener('scroll', () => requestAnimationFrame(updateNav), { passive: true });
  window.addEventListener('resize', updateNav);
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
  try {
    await loadStrings();
  } catch {
    // The text file itself couldn't load, so this one message can't come from it.
    $('admin-loading').textContent = 'Can’t load the page text. Check your connection and reload.';
    return;
  }
  setUpLogin();
  setUpAlertForm();
  setUpSwitch();
  setUpHoursForm();
  setUpTimetable();
  setUpTravel();
  setUpNav();
  setUpPasscodeForms();
  $('clear-blocks').addEventListener('click', (event) => save($('blocks-msg'), event.target, () => api.admin.clearPasscodeBlocks()));
  window.addEventListener('offline', () => setBanner(t('admin.offline'), 'connection'));
  window.addEventListener('online', () => { if (api.admin.hasSession() && $('login').hidden) reload($('panel').hidden); });

  if (api.admin.hasSession()) await reload(true);
  else showLogin();
  // Keep the tracker status and alert list current, and retry if the server couldn't be reached.
  setInterval(() => { if (api.admin.hasSession() && $('login').hidden) reload($('panel').hidden); }, 30000);
}

start();
