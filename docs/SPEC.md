# Project Specification

> **What this file is:** the current, agreed description of the project — what it is, what it does, and how it is built.
> It only ever describes the **present state**. When something changes, edit it in place; the reasoning and history
> belong in [`DECISIONS.md`](DECISIONS.md). Items marked **(proposed)** are not yet confirmed — see the linked decision.

_Last updated: 2026-10-30_

---

## 1. Problem

AUB Mediterraneo (Cyprus) runs a university-owned shuttle bus between campus and the student dorms. All schedule
information reaches students as Outlook emails: the regular timetable in one email, and every delay or change in
separate emails, buried among club, event and seminar mail. To know when the bus is actually coming, a student has to
find the latest change notice and mentally apply it to the timetable from another email.

## 2. Goal

One simple web page where a student can see, at a glance:

1. **The timetable**, already corrected for any current delay or change.
2. **Any active alert** (delay, cancellation, change), at the top.
3. **A map** showing the route, the stops and the bus's live position (passcode required — see §9).

It must be usable long-term and be something the university could take over (see §10).

**Guiding principle:** as simple as possible. Every feature has to justify itself; when in doubt, leave it out.

## 3. Users and roles

| Role | Who | Can do | Account |
|---|---|---|---|
| **Student** | ~400 students (growing) | View schedule, alerts, map. No input. | None — one shared passcode, distributed by the registrar ([D-013](DECISIONS.md#d-013)) |
| **Admin** | University transport coordinator (one person, possibly a deputy) | Turn live tracking on/off, publish/clear alerts, edit timetable and travel times, set service hours, change passcodes | **Admin passcode only** — no name or personal email ([D-017](DECISIONS.md#d-017)) |
| **Tracker** | GPS device on the bus | Sends its position | Device secret key, no human login |

## 4. The route

| Item | Value |
|---|---|
| Buses | **1 tracked: the AUB electric bus**, owned by the university (_to confirm_ which vehicle carries the tracker). Older schedules also used a **coach** at peak times — _to confirm_ whether it still runs ([D-024](DECISIONS.md#d-024)). It is occasionally rented out for outside events ([D-012](DECISIONS.md#d-012)). Expected to be replaced by a new bus in the near future. |
| Routes | **1** |
| Stops | **3 on weekdays, plus Old Town on weekends** (older schedule) — see table below |
| Order of stops | To campus: Anavargos → Tepak (~10 min) → Campus. To dorms: the reverse. Weekends: via Old Town. |
| Timetable | **None at the moment** — the university is running without a fixed timetable. The site must work with or without one ([D-022](DECISIONS.md#d-022)). |
| Route path | **Not fixed** — the driver chooses the roads. No route line is drawn; the map shows the stops and the live bus ([D-021](DECISIONS.md#d-021)). |
| Service hours | Set by the admin (e.g. Mon–Fri 07:00–21:00), independent of the timetable ([D-022](DECISIONS.md#d-022)) — _to collect_ |

| Stop | Coordinates (lat, lng) | Source |
|---|---|---|
| University — AUB Mediterraneo, Pafos | 34.767469, 32.417171 | Where the bus parks (team visit) |
| Dorms — Anavargos | 34.800635, 32.451972 | Where the bus parks (team visit) |
| Dorms — Tepak | 34.776953, 32.434246 | Approximate bus stop (asked on site); building at 34.776984, 32.434626 |
| Old Town (weekends) | _to collect_ | Appears in the older weekend schedule |

The data model still allows more stops, trips or routes later without a rebuild, but the interface is designed for
one route.

## 5. Features

### 5.1 Minimum version (must have by 1 December)

**Student page** (single page, mobile-first):
- Alert banner at the top when an alert is active (e.g. "Delayed ~15 min", "08:30 departure cancelled").
- **Next departure** from each stop, highlighted — *only when a timetable has been entered*.
- Full timetable for today (expandable to other days, if the schedule varies by day) — *only when a timetable has
  been entered*. Without one, the page leads with the map and shows the service hours instead.
- Map with the stops (no route line — [D-021](DECISIONS.md#d-021)).
- **Live bus marker** (with "last updated X s ago"), shown only after the student enters the passcode. The browser
  remembers the passcode, so it is entered once per device (until the passcode changes).
- When no recent position is available (outside service hours, live tracking switched off, device offline), the marker is hidden
  and the page says "Live location unavailable" instead of showing a stale position.
- Installable to home screen (PWA).

**Admin page** (`/admin`, login required):
- **Login:** a single "Admin passcode" field (separate from the student passcode). Stays logged in on her device
  until she logs out or the session expires.
- **Header:** "View student page" and "Log out", stacked on phones ([D-033](DECISIONS.md#d-033)).
- **Section tabs** (Alerts, Hours, Timetable, Passcodes) stick to the top of the screen and highlight the section
  currently in view ([D-033](DECISIONS.md#d-033)).
- **Live tracking ON/OFF switch** at the top, just below the tracker status, so it can be found quickly in an
  emergency. OFF overrides everything: students stop seeing the bus within ~10 s and no location is stored. Optional
  "turn back on automatically at" time, e.g. for rentals ([D-032](DECISIONS.md#d-032)).
- **Publish alert:** pick type (delay / cancellation / other), optional delay in minutes, optional affected
  departure(s), free-text message, optional expiry time → Publish.
- **Clear alert** in one tap.
- **Edit timetable** (optional — [D-031](DECISIONS.md#d-031)): pick a day to list its runs, one short line each
  ("08:30 · Anavargos Dorms → Tepak Dorms → Campus"); tap a run to edit it. In the editor: the days it runs, the
  stops **tapped in order** (the direction follows from the order), the time at the first stop, and optional times
  at later stops — empty ones show an **estimate** ("~08:40") from the travel times, and she can type over any of
  them. Note, "on live map", Duplicate, Delete. "Save timetable" saves everything at once; problems are highlighted.
- **Travel times:** minutes between each pair of stops used in a run. Her own estimate is used until the tracker
  has timed the trip 5 times; then the measured average is used, and the page shows which is in use.
- **Service hours** editor (days and start/end times when the bus normally runs).
- **Change student passcode** (then the registrar sends the new one to students).
- **Change admin passcode.**
- Designed for a non-technical user on a phone or laptop; no back-end access needed.

### 5.2 Planned after the minimum version (if time allows)

- **Live arrival estimate** ("~6 min to Tepak Dorms") from the bus's position and the measured travel times.
- **Device battery level** shown on the admin page, so she knows when it needs charging.
- **Push notifications** — only if the Data Protection Officer confirms they need no board approval
  ([D-014](DECISIONS.md#d-014)).

### 5.3 Explicitly out of scope

- Native iOS / Android apps.
- Student accounts, profiles, favourites, feedback forms, chat.
- **Any collection of student personal data**, including email addresses ([D-014](DECISIONS.md#d-014)).
- Email notifications sent by the website ([D-014](DECISIONS.md#d-014)).
- Storing any history of the bus's movements (see §9).
- Multiple routes/buses in the interface (data model allows it later).
- The university's logo or official branding, until written permission is given ([D-016](DECISIONS.md#d-016)).

### 5.4 Error and status screens

Every one of these has its own clear message (text in the strings file) and, where possible, says what still works
and what to do. Details in [D-018](DECISIONS.md#d-018).

**Student page — connection and loading**

| Situation | What the student sees |
|---|---|
| Student is offline | "You're offline." Last saved timetable and alerts are still shown, with "saved at HH:MM". Map marker hidden. |
| Back end unreachable / too slow | "Can't reach the bus service right now. Retrying…" Last saved data shown. Retries automatically. |
| Map tiles fail to load | Timetable still works; map area says "Map unavailable". |
| Page loading for the first time | Short loading state (no blank screen). |
| JavaScript disabled / very old browser | Plain message explaining the site needs a modern browser. |
| Page not found (wrong link) | Simple 404 page with a link back to the timetable. |

**Student page — live bus position**

| Situation | What the student sees |
|---|---|
| Position fresh (< 1 min old) | Bus marker + "Updated X s ago". |
| Position 1–5 min old | Faded marker + "Last seen X min ago — live signal weak". |
| No position for > 5 min during service hours | Marker hidden; "Live location unavailable right now. Timetable below is still valid." |
| Outside service hours | "Bus not in service. Next departure: …" |
| Live tracking switched off by admin | "Live tracking is unavailable right now." (no reason given publicly) |
| Device has no GPS fix yet (just switched on) | Treated like "no position". |

**Student page — passcode**

| Situation | What the student sees |
|---|---|
| Wrong passcode | "That passcode isn't right. Check the registrar's email." |
| Too many attempts | "Too many attempts. Try again in X minutes." |
| Passcode changed (saved one no longer works) | "The passcode has changed. Enter the new one from the registrar's email." |

**Timetable**

| Situation | What the student sees |
|---|---|
| No timetable entered yet / no departures today | "No departures scheduled today." |
| Alert has expired | Removed automatically. |

**Admin page**

| Situation | What the admin sees |
|---|---|
| Page loading | "Loading…" until the login form or the admin panel is ready. |
| Wrong admin passcode | "That admin passcode isn't right." |
| Too many admin login attempts | "Too many attempts. Try again in X min." Lifts by itself (Supabase's own limit); if needed, the password can be reset in the Supabase dashboard (SETUP.md). |
| Can't reach the server when logging in | "Can't reach the server. Check your connection and try again." |
| Can't reach the server when loading | Banner "Can't reach the server. Retrying every 30 seconds…"; the panel loads by itself once the server answers. |
| Admin goes offline | Banner "You're offline. Changes can't be saved until the connection is back." Clears when back online. |
| Timetable problem when saving (no days, fewer than two stops, no first time, bad time, times out of order) | The run is opened and highlighted, with a message saying what's wrong. |
| Travel time not a number from 1 to 180 | Message naming the pair of stops; that box is selected. |
| Session expired | "You've been logged out. Log in again." Login form appears above the panel; unsaved edits stay on the page. |
| Save failed (offline / server error) | "Not saved — check your connection and try again." Edits kept; nothing half-saved. |
| Unsaved timetable changes | "You have unsaved changes — press “Save timetable”." The browser warns before leaving the page. |
| Students' network blocked by wrong passcodes | "N network(s) blocked…" with an **Unblock now** button ([D-028](DECISIONS.md#d-028)). |
| Tracker offline during service hours | Warning banner: "Tracker hasn't reported for X min." |
| Tracker battery low | Warning banner with battery level. |
| Page text fails to load | Plain message asking to check the connection and reload (the only text not in the strings file, since that file is what failed). |

## 6. Architecture ([D-003](DECISIONS.md#d-003), [D-025](DECISIONS.md#d-025))

```
 ┌──────────────┐  HTTPS, every ~10–20 s     ┌──────────────────────────┐
 │ GPS tracker  │ ─────── 4G / SIM ────────▶ │  Back end (Supabase, EU)  │
 │  (on bus)    │                            │  • database               │
 └──────────────┘                            │  • admin login            │
                                             │  • passcode check         │
 ┌──────────────┐  edits schedule / alerts   │                           │
 │ Admin page   │ ─────────────────────────▶ │                           │
 └──────────────┘                            └────────────┬──────────────┘
                                                          │ schedule + alerts;
 ┌──────────────┐  loads page (static files)              │ position only with passcode
 │ Web hosting  │ ──────────────────────────▶  Student's browser ◀──┘
 └──────────────┘                              (schedule + alerts + map)
```

| Part | Choice | Notes |
|---|---|---|
| Front end | Static site (HTML/CSS/JS), PWA | No server code on the web host |
| Map | Leaflet + OpenStreetMap tiles (labels in Greek); to switch to CARTO for English labels once a free key is requested ([D-034](DECISIONS.md#d-034)) | Free; attribution required |
| Back end | Supabase (EU region) | Postgres DB, Auth (admin only), database functions for the tracker and passcode check — all in `supabase/schema.sql` |
| Hosting | Cloudflare Pages, domain `dormshuttle.com` | See [D-019](DECISIONS.md#d-019) |
| GPS ingestion | Tracker posts directly to the `report_position` database function over HTTPS (no relay server) | See [D-015](DECISIONS.md#d-015), [`TRACKER.md`](TRACKER.md) |
| Demo mode | While no Supabase project is set in `src/config.js`, the site runs on example data with a simulated bus, stored in the browser | [D-025](DECISIONS.md#d-025) |
| Source code | GitHub: `ateagoldfish/AUB-Mediterraneo-Bus-Web-App` | |

## 7. Data model

Defined in [`supabase/schema.sql`](../supabase/schema.sql).

| Table | Purpose | Key fields |
|---|---|---|
| `stops` | The stops | `id`, `name`, `lat`, `lng`, `sort` (dorms first, campus last), `weekend_only` |
| `trips` | One bus run (timetable) | `id`, `days` (0 = Sun … 6 = Sat), `stop_ids` (stops in the order visited), `direction` (set from the last stop), `times` (only the times typed in, e.g. `{"anavargos": "08:30"}`; the rest are estimated), `note` (e.g. "Coach"), `tracked` ([D-031](DECISIONS.md#d-031)) |
| `travel_times` | Minutes between two stops | `from_stop`, `to_stop`, `manual_min` (admin's estimate), `measured_avg`, `measured_count` (running average kept by the tracker function — no individual trips) ([D-031](DECISIONS.md#d-031)) |
| `alerts` | Delays / cancellations / notices | `id`, `type` (`delay` / `cancel` / `info`), `message`, `delay_min`, `trip_ids` (affected runs), `created_at`, `expires_at` |
| `bus_position` | **Latest position only** (one row, overwritten) | `lat`, `lng`, `speed`, `heading`, `battery`, `recorded_at`; plus `at_stop`, `last_stop`, `left_at` — a note used to time the trip to the next stop, overwritten constantly and cleared when not tracking |
| `settings` | One row of admin settings | `admin_email`, `service_hours`, `margin_minutes`, `paused`, `paused_until`, `student_passcode_hash`, `device_key_hash` |
| `passcode_attempts` | Wrong passcode attempts (kept 15 min) for brute-force protection | `client`, `attempted_at` |

The admin login is a single Supabase Auth user with a **project email** (not hers) and the admin passcode as its
password. The login page fills in the email itself, so she only types the passcode ([D-017](DECISIONS.md#d-017)).

Access rules:
- Everyone can **read** `stops`, `trips` and active `alerts` (see [D-013](DECISIONS.md#d-013) on whether these
  are also behind the passcode).
- **Nobody can read `bus_position` directly.** The student page asks a server function for it, sending the passcode;
  the function checks the passcode, service hours and the pause switch, and only then returns the position.
- Only the logged-in admin can **write** `stops`, `trips`, `alerts`, and the service hours / pause in `settings`. The
  passcode hashes can only be changed through `set_student_passcode` (or directly in the Supabase dashboard).
- Only the tracker (via its secret key, checked by `report_position`) can **write** `bus_position`. Outside service
  hours or while live tracking is off, only its battery and "last seen" time are stored — not its location.
- `travel_times` can be read by anyone (needed for the estimates) and changed only through `save_travel_times`
  (admin, her own estimates) and `report_position` (the measured averages).

## 8. GPS tracker

**Purchased: LilyGO T-SIM7670G (ESP32-S3) with 18650 battery holder** ([D-015](DECISIONS.md#d-015)),
from TinyTronics (NL), with batteries, antennas and accessories. Set-up and firmware: the team's electronics member.

| Property | Value |
|---|---|
| Network | 4G LTE Cat-1 (SIM7670G modem). Bands include B3, B7, B20, B38 — the bands used in Cyprus |
| Positioning | GPS, Galileo, GLONASS, BeiDou |
| SIM | Nano-SIM, data-only plan from a Cypriot operator |
| Power | One 18650 Li-ion cell (bought separately) + USB-C (5 V) for charging / continuous power |
| Antennas | External LTE and GNSS antennas on IPEX/uFL connectors (check whether included; buy if not) |
| Reporting | Position every ~10–20 s while in service hours; sleeps otherwise |
| Firmware | Arduino (ESP32), written/configured by the team; sends HTTPS POST with a secret key |

Requirements that still apply to the setup:
- **Portable**: not wired into the bus, so it can move to the new bus and be removed when the bus is rented out.
- **Power plan** for a full service day (see [D-015](DECISIONS.md#d-015)): a single 18650 is likely **not** enough
  for a whole day with 4G + GPS running; use a USB power source on the bus or a power bank.
- **Heat**: must not sit in direct sun (e.g. on the dashboard) — Li-ion cells must not be charged above ~45 °C.
- Enclosure with a view of the sky (e.g. high near a side window), secured so it doesn't slide.
- **Spare:** buy a second board if budget allows.

## 9. Privacy and security rules

- **No student personal data is collected** — no accounts, no emails, no analytics cookies ([D-014](DECISIONS.md#d-014)).
  Anything that would collect student data requires approval from the university board (Lebanon) and is out of scope.
- **The live position is not public.** It is shown only to people who enter the shared passcode, distributed by the
  registrar ([D-013](DECISIONS.md#d-013)). The passcode is checked on the server, not in the page, so the position can't
  be read by bypassing the page.
- The passcode is long enough not to be guessed (e.g. three words or 8+ characters), and the admin can change it at
  any time (e.g. each semester or if it leaks).
- Wrong passcodes are limited **per network**: 30 wrong tries within 10 minutes blocks that network for up to
  10 minutes. Because a whole dorm shares one Wi-Fi network, the admin page shows any blocks and can lift them at once
  ([D-028](DECISIONS.md#d-028)).
- The bus's position is treated as the **driver's personal data**: consent from the driver(s) is required before going
  live.
- **Only the latest position is stored**; no movement history.
- The live position is shown **only during service hours** and **never while live tracking is switched off** (e.g. bus rented out)
  ([D-005](DECISIONS.md#d-005), [D-012](DECISIONS.md#d-012)). Outside service hours the device stops sending.
  The site itself is available 24/7.
- Admin password: strong, never shared in the repository; all secrets/keys live outside the code (environment
  settings), never committed.
- A short privacy notice page explains what is collected and why.
- The university's Data Protection Officer reviews the setup before launch.

## 10. Ownership and handover

The project should be easy to hand to the university. Everything is created under **dedicated project accounts**, not
personal ones ([D-008](DECISIONS.md#d-008)):

| Asset | Handover method |
|---|---|
| GitHub repository | Transfer to a university GitHub account/organisation |
| Supabase project | Transfer the project to the university's Supabase organisation |
| Domain | Transfer, or the university points its own subdomain at the site |
| Hosting | Move static files (any host works) |
| GPS tracker + SIM | Physical handover; SIM contract moved to university |

A short **handover / operations guide** (how to log in as admin, change the timetable, pause tracking, change the
passcode, charge the tracker, replace the SIM, move the tracker to a new bus) is part of the final deliverable.

## 11. Text and translation

All user-visible text lives in a **single strings file** (e.g. `src/strings/en.json`), never written directly into the
page code. Adding a language later means copying that file and translating it. Starting language: **English**.

## 12. Timeline (target)

| When | Milestone |
|---|---|
| Week of 19 Oct | ✅ Tracker and parts ordered. Collect stops/timetable; driver consent; DPO contact |
| Week of 26 Oct | Project email account; domain + hosting ([D-019](DECISIONS.md#d-019)); Supabase project |
| Weeks of 26 Oct, 2 Nov | Student page: timetable + map with route (fake bus position); tracker firmware on the bench |
| Week of 9 Nov | Supabase, admin page, alerts, passcode, pause switch |
| Week of 16 Nov | Tracker connected end-to-end (or phone stand-in if the device is late) |
| Week of 23 Nov | Tracker on the bus; pilot with a few students; fixes |
| **1 Dec** | **Deadline** — working system + handover guide |

## 13. Facts still to collect

### Questions for transport staff (open since 2026-10-30)

- [ ] **Vehicle:** Does the tracker go on the AUB **electric bus**? Does the **coach** still run (it used to at
      08:30 and 16:20 Mon–Thu)?
- [ ] **Weekends:** Do the **Old Town** weekend runs still happen? If so, where exactly does the bus stop in Old Town?
- [ ] **Service hours:** Which days does the bus run, and what time are the first and last runs?

### Permissions in writing (to ask about)

The dean agreed verbally (2026-10-22). Before going live, get written agreement — even a short signed note or email
— so there is a record. Draft documents to prepare (D-029):

- [ ] **University** (dean / Data Protection Officer): approval of the project as described — passcode-protected
      live location, no student data, only the latest position stored, tracking only in service hours, pause
      switch for rentals.
- [ ] **Driver(s):** consent to a GPS tracker on the bus they drive — what is tracked, when, who can see it, that no
      history is kept, and that they can ask questions or withdraw. Include a short note that the site keeps an
      **average** of how long the bus takes between stops (D-031) — averages only, no individual trips.
- [ ] **Privacy notice** for the site (a draft is already at `privacy.html`; the team will rewrite it in their own
      words).
- [ ] **Disclaimer:** "student project, not an official university service; times are a guide" — currently in the
      footer.
- [ ] **Bus icon / branding:** our own bus icon is tentative until the team agrees (D-016).

### Other facts

- [ ] Which vehicle carries the tracker (electric bus?) and whether the coach still runs
- [ ] Old Town stop location, and whether weekend trips still run
- [ ] Service hours (days, first and last run)
- [ ] Whether a new timetable is coming (format known — see [example](reference/example-timetable.md))
- [ ] Is there a USB or 12/24 V (cigarette-lighter) socket on the bus near a window?
- [ ] Driver(s)' consent to the tracker
- [ ] How the admin will know (and remember) to pause tracking when the bus is rented out
- [ ] Registrar contact for distributing the passcode
- [ ] Whether the timetable and alerts should also be behind the passcode ([D-013](DECISIONS.md#d-013))
- [ ] Contact for the university's Data Protection Officer
- [ ] Whether the university will fund / take ownership
- [ ] Permission to use the university's name and/or logo

## 14. Look and feel

([D-016](DECISIONS.md#d-016))

| Item | Value |
|---|---|
| Colours | Black `#000000`, white `#FFFFFF`, university maroon `#840132` (from the website's stylesheet, [D-020](DECISIONS.md#d-020)); dark maroon `#5A011F` for hover/pressed; light tint `#FDF2F5` for highlighted rows; slate greys for secondary text |
| Maroon use | Header, buttons, stop markers, bus marker, links. Maroon text only on white/light backgrounds (on black it is hard to read). |
| Logo / icon | A simple bus pictogram (own design, not the university logo), used for the header, browser tab and home-screen icon — **tentative**, the team will decide |
| Footer | "Student project — not an official university service" until the university adopts it |
| Font | **Inter** (same as the university website), stored with the site rather than loaded from Google ([D-020](DECISIONS.md#d-020)) |
| Style | Like aubmed.ac.cy: maroon header bar, white rounded cards with soft shadow, pill-shaped buttons, small letter-spaced uppercase section labels |
| Theme | Light theme for the minimum version |
| Feel | Large text and tap targets, one column on phones, nothing hidden behind menus |

## 15. Code layout

| Path | What it is |
|---|---|
| `index.html` | Student page |
| `admin/index.html` | Admin page |
| `privacy.html`, `404.html` | Privacy notice, "page not found" |
| `sw.js`, `manifest.webmanifest` | Offline support and "add to home screen" (PWA) |
| `src/config.js` | Settings: Supabase address and public key, thresholds. Empty Supabase address = demo mode |
| `src/strings/en.json` | **All** text shown to users |
| `src/css/style.css` | All styling |
| `src/js/app.js`, `src/js/admin.js` | Logic for the two pages |
| `src/js/api.js` | Chooses demo or real back end |
| `src/js/demo-backend.js`, `src/js/demo-data.js` | Demo back end and example data |
| `src/js/supabase-backend.js` | Real back end (plain web requests, no library) |
| `src/js/time.js`, `src/js/timetable.js` | Cyprus time, service hours, next-run calculations |
| `src/vendor/`, `src/fonts/` | Leaflet map library and Inter font, stored with the site |
| `supabase/schema.sql` | Database tables, security rules and functions |
| `docs/SETUP.md` | Step-by-step: Supabase, Cloudflare, going live |
| `docs/TRACKER.md` | How the GPS tracker talks to the server |
