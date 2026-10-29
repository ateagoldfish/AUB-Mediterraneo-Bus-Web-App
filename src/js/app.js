// Student page: alerts, live map (behind the passcode), next bus, timetable, service hours.

import { config, demoMode } from '../config.js';
import { api } from './api.js';
import { loadStrings, t } from './i18n.js';
import { cyprusNow, agoText, fromMinutes, nextServiceStartText, formatWhen } from './time.js';
import { todaysRuns, nextRun, tripsForDay, stopsInOrder, firstDeparture } from './timetable.js';

const DATA_KEY = 'dormshuttle-data';
const PASS_KEY = 'dormshuttle-passcode';
const PASS_OK_KEY = 'dormshuttle-passcode-worked';

const $ = (id) => document.getElementById(id);

const state = {
  data: null,        // { stops, trips, alerts, service_hours }
  savedAt: null,     // when data was last loaded successfully
  conn: 'ok',        // 'ok' | 'offline' | 'server'
  position: null,    // last answer from getPosition
  map: null,
  busMarker: null,
};

// ---------- Small helpers ----------

function storageGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode */ } }
function storageRemove(key) { try { localStorage.removeItem(key); } catch { /* private mode */ } }

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child !== null && child !== undefined && child !== false) node.append(child);
  }
  return node;
}

function activeAlerts() {
  return (state.data?.alerts ?? []).filter((a) => !a.expires_at || new Date(a.expires_at) > new Date());
}

// ---------- Loading data ----------

function restoreSavedData() {
  try {
    const saved = JSON.parse(storageGet(DATA_KEY));
    if (saved?.data) {
      state.data = saved.data;
      state.savedAt = saved.savedAt;
    }
  } catch { /* nothing saved */ }
}

async function refreshData() {
  try {
    state.data = await api.getPublicData();
    state.savedAt = new Date().toISOString();
    state.conn = 'ok';
    storageSet(DATA_KEY, JSON.stringify({ data: state.data, savedAt: state.savedAt }));
  } catch {
    state.conn = navigator.onLine ? 'server' : 'offline';
  }
  renderAll();
}

// ---------- Rendering ----------

function renderAll() {
  renderConnection();
  renderAlerts();
  renderStops();
  renderNext();
  renderTimetable();
  renderHours();
  renderLive();
}

function renderConnection() {
  const banner = $('conn-banner');
  if (state.conn === 'ok') { banner.hidden = true; return; }
  const headline = state.conn === 'offline' ? t('conn.offline') : t('conn.serverDown');
  const detail = state.savedAt ? t('conn.savedAt', { time: formatWhen(state.savedAt) }) : t('conn.noSaved');
  banner.replaceChildren(el('strong', {}, headline), ' ', detail);
  banner.hidden = false;
}

function renderAlerts() {
  const box = $('alerts');
  box.replaceChildren(...activeAlerts().map((alert) => {
    const meta = [];
    if (alert.type === 'delay' && alert.delay_min) meta.push(t('alert.delayMinutes', { min: alert.delay_min }));
    if (alert.expires_at) meta.push(t('alert.until', { time: formatWhen(alert.expires_at) }));
    return el('div', { class: `banner banner-alert ${alert.type}`, role: 'alert' },
      el('span', { class: 'alert-type' }, t(`alert.${alert.type}`)),
      el('strong', {}, alert.message),
      meta.length ? el('div', { class: 'meta muted' }, meta.join(' · ')) : null);
  }));
}

// "Anavargos Dorms · Tepak Dorms 12:40": the first stop (its time is shown separately),
// then any later stops that have a time.
function stopsText(run) {
  const later = stopsInOrder(state.data.stops, run.trip.direction)
    .filter((stop) => stop.id !== run.first.stop.id && run.trip.times?.[stop.id])
    .map((stop) => `${stop.name} ${run.trip.times[stop.id]}`);
  return [run.first.stop.name, ...later].join(' · ');
}

function waitText(minutes) {
  if (minutes <= 0) return t('next.now');
  if (minutes < 60) return t('next.in', { min: minutes });
  return t('next.inHours', { h: Math.floor(minutes / 60), min: minutes % 60 });
}

function renderNext() {
  const section = $('next-section');
  if (!state.data) return;
  if (!state.data.trips.length) { section.hidden = true; return; }
  section.hidden = false;
  const now = cyprusNow();
  const runs = todaysRuns(state.data, now);
  $('next').replaceChildren(...['to_campus', 'to_dorms'].map((direction) => {
    const run = nextRun(runs, direction);
    const title = el('h3', {}, direction === 'to_campus' ? t('next.toCampus') : t('next.toDorms'));
    if (!run) return el('div', { class: 'card next-card' }, title, el('p', { class: 'next-sub' }, t('next.none')));
    const wait = run.expected - now.minutes;
    return el('div', { class: 'card next-card' },
      title,
      el('p', { class: `next-time${run.delay ? ' delayed' : ''}` }, run.delay ? fromMinutes(run.expected) : run.first.time),
      run.delay ? el('div', { class: 'next-delay' }, t('next.delayed', { time: run.first.time, min: run.delay })) : null,
      el('div', { class: 'next-sub' }, t('next.from', { stop: run.first.stop.name })),
      el('span', { class: 'next-in' }, waitText(wait)),
      run.trip.tracked === false ? el('div', { class: 'next-sub' }, t('next.notTracked')) : null);
  }));
}

function runItem(run, isNext) {
  const { trip } = run;
  const classes = [run.past ? 'past' : '', isNext ? 'next' : '', run.cancelled ? 'cancelled' : ''].join(' ');
  return el('li', { class: classes },
    el('span', { class: 'time' }, run.first.time),
    el('span', { class: 'stops' }, stopsText(run)),
    run.cancelled ? el('span', { class: 'tag cancel' }, t('next.cancelled')) : null,
    !run.cancelled && run.delay ? el('span', { class: 'tag warn' }, `+${run.delay} min`) : null,
    trip.tracked === false ? el('span', { class: 'tag' }, t('next.notTracked')) : null,
    trip.note ? el('span', { class: 'tag' }, trip.note) : null);
}

function runList(runs, highlightNext) {
  const groups = ['to_campus', 'to_dorms'].map((direction) => {
    const list = runs.filter((run) => run.trip.direction === direction);
    if (!list.length) return null;
    const next = highlightNext ? nextRun(runs, direction) : null;
    return el('div', { class: 'tt-group' },
      el('h3', {}, t(`tt.direction.${direction}`)),
      el('ul', { class: 'tt-list' }, list.map((run) => runItem(run, run === next))));
  }).filter(Boolean);
  return groups.length ? groups : [el('p', { class: 'muted' }, t('tt.noneToday'))];
}

function renderTimetable() {
  if (!state.data) return;
  const box = $('timetable');
  const otherDays = $('other-days');
  if (!state.data.trips.length) {
    box.replaceChildren(el('p', {}, t('tt.none')));
    otherDays.hidden = true;
    return;
  }
  const runs = todaysRuns(state.data, cyprusNow());
  const content = runList(runs, true);
  if (state.data.trips.some((trip) => trip.tracked === false)) {
    content.push(el('p', { class: 'small muted' }, t('live.untrackedNote')));
  }
  box.replaceChildren(...content);
  otherDays.hidden = false;
  renderOtherDay();
}

function renderOtherDay() {
  const select = $('day-select');
  const today = cyprusNow().day;
  if (!select.options.length) {
    // Monday first, as people expect a week to start.
    [1, 2, 3, 4, 5, 6, 0].forEach((day) => select.append(el('option', { value: day }, t(`day.${day}`))));
    select.value = String((today + 1) % 7);
    select.addEventListener('change', renderOtherDay);
  }
  const day = Number(select.value);
  const runs = tripsForDay(state.data.trips, day, state.data.stops).map((trip) => ({
    trip,
    first: firstDeparture(trip, state.data.stops),
    past: false, cancelled: false, delay: 0,
  }));
  $('day-timetable').replaceChildren(...runList(runs, false));
}

function renderHours() {
  if (!state.data) return;
  const hours = state.data.service_hours ?? {};
  const box = $('hours');
  if (!Object.keys(hours).length) { box.replaceChildren(el('p', { class: 'muted' }, t('hours.none'))); return; }
  const today = cyprusNow().day;
  box.replaceChildren(el('ul', { class: 'hours-list' }, [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const h = hours[day];
    return el('li', { class: day === today ? 'today' : '' },
      el('span', {}, t(`day.${day}`)),
      el('span', {}, h ? `${h.start}–${h.end}` : t('hours.closed')));
  })));
}

// ---------- Map ----------

function initMap() {
  if (!window.L) { $('map-unavailable').hidden = false; return; }
  const map = L.map('map', { zoomControl: true, attributionControl: true })
    .setView(config.mapCenter, config.mapZoom);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  let loaded = 0;
  let failed = 0;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: `<a href="https://www.openstreetmap.org/copyright">${t('map.attribution')}</a>`,
  })
    .on('tileload', () => { loaded++; $('map-unavailable').hidden = true; })
    .on('tileerror', () => {
      failed++;
      if (failed >= 4 && loaded === 0 && $('passcode-overlay').hidden) $('map-unavailable').hidden = false;
    })
    .addTo(map);
  state.map = map;
  state.stopLayer = L.layerGroup().addTo(map);
}

function renderStops() {
  if (!state.map || !state.data) return;
  const located = state.data.stops.filter((s) => s.lat !== null && s.lng !== null);
  const key = located.map((s) => `${s.id}${s.lat}${s.lng}`).join();
  if (key === state.stopKey) return;
  state.stopKey = key;
  state.stopLayer.clearLayers();
  for (const stop of located) {
    L.marker([stop.lat, stop.lng], {
      icon: L.divIcon({ className: '', html: '<div class="stop-pin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
      title: stop.name,
      keyboard: false,
    }).bindTooltip(stop.name, { permanent: true, direction: 'top', offset: [0, -10], className: 'stop-label' })
      .addTo(state.stopLayer);
  }
  if (located.length) state.map.fitBounds(located.map((s) => [s.lat, s.lng]), { padding: [40, 40] });
}

function showBus(lat, lng, weak) {
  if (!state.map) return;
  const html = `<div class="bus-pin${weak ? ' weak' : ''}"><img src="/src/img/bus.svg" alt=""></div>`;
  const icon = L.divIcon({ className: '', html, iconSize: [40, 40], iconAnchor: [20, 20] });
  if (!state.busMarker) {
    state.busMarker = L.marker([lat, lng], { icon, title: t('map.bus'), zIndexOffset: 1000, keyboard: false }).addTo(state.map);
  } else {
    state.busMarker.setLatLng([lat, lng]).setIcon(icon);
  }
}

function hideBus() {
  if (state.busMarker) { state.busMarker.remove(); state.busMarker = null; }
}

// ---------- Live position ----------

function renderLive() {
  const dot = $('live-dot');
  const text = $('live-text');
  const pos = state.position;
  const setStatus = (cls, message) => { dot.className = `dot ${cls}`; text.textContent = message; };

  if (!storageGet(PASS_KEY)) { hideBus(); setStatus('', t('pass.title')); return; }
  if (!pos) { setStatus('', t('live.checking')); return; }

  if (pos.status === 'ok') {
    const age = (Date.now() - new Date(pos.recorded_at).getTime()) / 1000;
    if (age <= config.freshSeconds) {
      showBus(pos.lat, pos.lng, false);
      setStatus('live', t('live.updated', { ago: agoText(age) }));
    } else if (age <= config.weakSeconds) {
      showBus(pos.lat, pos.lng, true);
      setStatus('weak', t('live.weak', { ago: agoText(age) }));
    } else {
      hideBus();
      setStatus('', t('live.lost'));
    }
    return;
  }
  hideBus();
  if (pos.status === 'paused') setStatus('', t('live.paused'));
  else if (pos.status === 'not_in_service') {
    const when = state.data ? nextServiceStartText(state.data.service_hours) : null;
    setStatus('', when ? t('live.notInServiceNext', { when }) : t('live.notInService'));
  } else setStatus('', t('live.lost'));
}

async function pollPosition() {
  const passcode = storageGet(PASS_KEY);
  if (!passcode) return;
  try {
    state.position = await api.getPosition(passcode);
    storageSet(PASS_OK_KEY, '1');
    $('passcode-overlay').hidden = true;
    $('forget-passcode').hidden = false;
  } catch (err) {
    if (err.code === 'wrong') {
      const worked = storageGet(PASS_OK_KEY);
      forgetPasscode();
      showPasscodeForm(worked ? t('pass.changed') : t('pass.wrong'));
    } else if (err.code === 'rate_limited') {
      storageRemove(PASS_KEY);
      showPasscodeForm(t('pass.tooMany', { min: Math.max(1, Math.ceil(err.retryAfter / 60)) }));
    } else {
      // Network trouble: hide the bus rather than show an old position.
      state.position = { status: 'unavailable' };
      if (!navigator.onLine) state.conn = 'offline';
      renderConnection();
    }
  }
  renderLive();
}

function showPasscodeForm(error = '') {
  $('passcode-overlay').hidden = false;
  $('map-unavailable').hidden = true;
  $('forget-passcode').hidden = true;
  const errorBox = $('passcode-error');
  errorBox.textContent = error;
  errorBox.hidden = !error;
  renderLive();
}

function forgetPasscode() {
  storageRemove(PASS_KEY);
  storageRemove(PASS_OK_KEY);
  state.position = null;
  hideBus();
}

function setUpPasscodeForm() {
  $('passcode-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = $('passcode-input');
    const code = input.value.trim();
    if (!code) return;
    const button = event.target.querySelector('button');
    button.disabled = true;
    storageSet(PASS_KEY, code);
    storageRemove(PASS_OK_KEY);
    await pollPosition();
    button.disabled = false;
    if (storageGet(PASS_KEY)) input.value = '';
  });
  $('forget-passcode').addEventListener('click', () => { forgetPasscode(); showPasscodeForm(); });
}

// ---------- Demo mode bar ----------

async function setUpDemoBar() {
  if (!demoMode) return;
  const demo = await import('./demo-backend.js');
  const select = $('demo-scenario');
  demo.SCENARIOS.forEach((s) => select.append(el('option', { value: s }, t(`demo.s.${s}`))));
  select.value = demo.getScenario();
  select.addEventListener('change', () => {
    demo.setScenario(select.value);
    refreshData();
    pollPosition();
  });
  $('demo-hint').textContent = t('demo.hint', demo.demoInfo);
  $('demo-reset').addEventListener('click', () => {
    demo.resetDemo();
    forgetPasscode();
    storageRemove(DATA_KEY);
    location.reload();
  });
  $('demo-bar').hidden = false;
}

// ---------- Start ----------

async function start() {
  try {
    await loadStrings();
  } catch {
    $('conn-banner').textContent = 'Can’t load the page text. Check your connection and reload.';
    $('conn-banner').hidden = false;
    return;
  }

  initMap();
  restoreSavedData();
  if (state.data) renderAll();
  setUpPasscodeForm();
  setUpDemoBar();

  if (storageGet(PASS_KEY)) pollPosition();
  else showPasscodeForm();

  await refreshData();

  setInterval(refreshData, config.dataPollSeconds * 1000);
  setInterval(() => { if (document.visibilityState === 'visible') pollPosition(); }, config.positionPollSeconds * 1000);
  setInterval(() => { renderNext(); renderLive(); }, 5000);
  setInterval(renderTimetable, 30000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { refreshData(); pollPosition(); }
  });
  window.addEventListener('online', () => { refreshData(); pollPosition(); });
  window.addEventListener('offline', () => { state.conn = 'offline'; renderConnection(); pollPosition(); });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

start();
