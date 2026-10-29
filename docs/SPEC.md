# Project Specification

> **What this file is:** the current, agreed description of the project — what it is, what it does, and how it is built.
> It only ever describes the **present state**. When something changes, edit it in place; the reasoning and history
> belong in [`DECISIONS.md`](DECISIONS.md). Items marked **(proposed)** are not yet confirmed — see the linked decision.

_Last updated: 2026-10-29_

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
| **Admin** | University transport coordinator (one person, possibly a deputy) | Edit timetable, publish/clear alerts, pause tracking, change passcode | **Admin passcode only** — no name or personal email ([D-017](DECISIONS.md#d-017)) |
| **Tracker** | GPS device on the bus | Sends its position | Device secret key, no human login |

## 4. The route

| Item | Value |
|---|---|
| Buses | **1**, owned by the university. Occasionally rented out for outside events ([D-012](DECISIONS.md#d-012)). Expected to be replaced by a new bus in the near future. |
| Routes | **1** |
| Stops | **3** — see table below |
| Order of stops | _to collect_ |
| Timetable | _to collect_ (fixed daily schedule; may differ by weekday/weekend — _to confirm_) |
| Route path | Drawn by hand once (e.g. on geojson.io) and stored as a GeoJSON file |

| Stop | Coordinates (lat, lng) | Source |
|---|---|---|
| University — AUB Mediterraneo, Pafos | 34.76775, 32.41673 | Google Maps pin (exact pick-up point: _to confirm_) |
| Dorms — "AUB Dorms Anavargos" | 34.80034, 32.45207 | Google Maps pin (exact pick-up point: _to confirm_) |
| Second dorm location | _to collect_ — may be the same site as Anavargos | |

The data model still allows more stops, trips or routes later without a rebuild, but the interface is designed for
one route.

## 5. Features

### 5.1 Minimum version (must have by 1 December)

**Student page** (single page, mobile-first):
- Alert banner at the top when an alert is active (e.g. "Delayed ~15 min", "08:30 departure cancelled").
- **Next departure** from each stop, highlighted.
- Full timetable for today (expandable to other days, if the schedule varies by day).
- Map with route line and the 3 stops.
- **Live bus marker** (with "last updated X s ago"), shown only after the student enters the passcode. The browser
  remembers the passcode, so it is entered once per device (until the passcode changes).
- When no recent position is available (outside service hours, tracking paused, device offline), the marker is hidden
  and the page says "Live location unavailable" instead of showing a stale position.
- Installable to home screen (PWA).

**Admin page** (`/admin`, login required):
- **Login:** a single "Admin passcode" field (separate from the student passcode). Stays logged in on her device
  until she logs out or the session expires.
- **Publish alert:** pick type (delay / cancellation / other), optional delay in minutes, optional affected
  departure(s), free-text message, optional expiry time → Publish.
- **Clear alert** in one tap.
- **Edit timetable:** simple editable table → Save.
- **Pause tracking** switch (e.g. when the bus is rented out) with an optional automatic resume date/time.
- **Change student passcode** (then the registrar sends the new one to students).
- **Change admin passcode.**
- Designed for a non-technical user on a phone or laptop; no back-end access needed.

### 5.2 Planned after the minimum version (if time allows)

- **Rough arrival estimate** ("~6 min to Dorm A") from the bus's position along the route.
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
| Tracking paused by admin | "Live tracking is unavailable today." (no reason given publicly) |
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
| Wrong admin passcode / too many attempts | Same pattern as students. |
| Session expired | "You've been logged out. Log in again." Unsaved edits kept on the page. |
| Save failed (offline / server error) | "Not saved — check your connection and try again." Edits kept; nothing half-saved. |
| Tracker offline during service hours | Warning banner: "Tracker hasn't reported for X min." |
| Tracker battery low | Warning banner with battery level (once battery reporting exists). |

## 6. Architecture (proposed — [D-003](DECISIONS.md#d-003))

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
| Map | Leaflet + OpenStreetMap tiles | Free; attribution required |
| Back end | Supabase (EU region) | Postgres DB, Auth (admin only), small server functions for the tracker and passcode check |
| Hosting | Cloudflare Pages, domain `dormshuttle.com` | See [D-019](DECISIONS.md#d-019) |
| GPS ingestion | Tracker posts directly to a Supabase function over HTTPS (no relay server) | See [D-015](DECISIONS.md#d-015) |
| Source code | GitHub: `ateagoldfish/AUB-Mediterraneo-Bus-Web-App` | |

## 7. Data model (proposed)

| Table | Purpose | Key fields |
|---|---|---|
| `stops` | The 3 stops | `id`, `name`, `lat`, `lng`, `order` |
| `departures` | The timetable | `id`, `stop_id`, `time`, `days` (e.g. Mon–Fri), `note` |
| `alerts` | Delays / cancellations / notices | `id`, `type`, `message`, `delay_min`, `affects` (departures), `starts_at`, `expires_at`, `active` |
| `bus_position` | **Latest position only** (one row, overwritten) | `lat`, `lng`, `speed`, `heading`, `battery`, `recorded_at` |
| `settings` | One row of admin settings | `passcode_hash` (student passcode), `tracking_paused`, `paused_until` |

The admin login is a single Supabase Auth user with a **project email** (not hers) and the admin passcode as its
password. The login page fills in the email itself, so she only types the passcode ([D-017](DECISIONS.md#d-017)).

Access rules:
- Everyone can **read** `stops`, `departures` and active `alerts` (see [D-013](DECISIONS.md#d-013) on whether these
  are also behind the passcode).
- **Nobody can read `bus_position` directly.** The student page asks a server function for it, sending the passcode;
  the function checks the passcode, service hours and the pause switch, and only then returns the position.
- Only the logged-in admin can **write** `stops`, `departures`, `alerts`, `settings`.
- Only the tracker (via its secret key, checked by a server function) can **write** `bus_position`.

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
- The passcode is long enough not to be guessed (e.g. three words or 8+ characters), attempts are rate-limited, and the
  admin can change it at any time (e.g. each semester or if it leaks).
- The bus's position is treated as the **driver's personal data**: consent from the driver(s) is required before going
  live.
- **Only the latest position is stored**; no movement history.
- The live position is shown **only during service hours** and **never while tracking is paused** (e.g. bus rented out)
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

- [ ] Second dorm location (or confirm there is only one)
- [ ] Exact pick-up points at each stop (gate/entrance)
- [ ] Order of stops / direction of travel
- [ ] Current timetable (and whether it differs by day)
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
| Colours | Black `#000000`, white `#FFFFFF`, university maroon — `#781432` or the website's `#840132` (_to confirm_, [D-020](DECISIONS.md#d-020)); dark maroon `#5A011F` for hover/pressed; light tint `#FDF2F5` for highlighted rows; slate greys for secondary text |
| Maroon use | Header, buttons, route line, bus marker, links. Maroon text only on white/light backgrounds (on black it is hard to read). |
| Logo / icon | A simple bus pictogram (own design, not the university logo), used for the header, browser tab and home-screen icon |
| Footer | "Student project — not an official university service" until the university adopts it |
| Font | **Inter** (same as the university website), stored with the site rather than loaded from Google ([D-020](DECISIONS.md#d-020)) |
| Style | Like aubmed.ac.cy: maroon header bar, white rounded cards with soft shadow, pill-shaped buttons, small letter-spaced uppercase section labels |
| Theme | Light theme for the minimum version |
| Feel | Large text and tap targets, one column on phones, nothing hidden behind menus |
