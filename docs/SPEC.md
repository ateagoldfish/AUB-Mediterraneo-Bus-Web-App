# Project Specification

> **What this file is:** the current, agreed description of the project — what it is, what it does, and how it is built.
> It only ever describes the **present state**. When something changes, edit it in place; the reasoning and history
> belong in [`DECISIONS.md`](DECISIONS.md). Items marked **(proposed)** are not yet confirmed — see the linked decision.

_Last updated: 2026-10-19_

---

## 1. Problem

AUB Mediterraneo (Cyprus) runs a rented shuttle bus between campus and the student dorms. All schedule information
reaches students as Outlook emails: the regular timetable in one email, and every delay or change in separate emails,
buried among club, event and seminar mail. To know when the bus is actually coming, a student has to find the latest
change notice and mentally apply it to the timetable from another email.

## 2. Goal

One simple web page where a student can see, at a glance:

1. **The timetable**, already corrected for any current delay or change.
2. **Any active alert** (delay, cancellation, change), at the top.
3. **A map** showing the route, the stops and the bus's live position.

It must be usable long-term and be something the university could take over (see §10).

**Guiding principle:** as simple as possible. Every feature has to justify itself; when in doubt, leave it out.

## 3. Users and roles

| Role | Who | Can do | Account |
|---|---|---|---|
| **Student / visitor** | ~400 students (growing) | View schedule, alerts, map. No input. | None (see [D-004](DECISIONS.md#d-004)) |
| **Admin** | University transport coordinator (one person, possibly a deputy) | Edit timetable, publish/clear alerts | Email + password login to `/admin` |
| **Tracker** | GPS device on the bus | Sends its position | Device credentials, no human login |

## 4. The route

| Item | Value |
|---|---|
| Buses | **1** (always the same vehicle) |
| Routes | **1** |
| Stops | **3** — University, Dorm A, Dorm B (real names and coordinates: _to collect_) |
| Order of stops | _to collect_ |
| Timetable | _to collect_ (fixed daily schedule; may differ by weekday/weekend — _to confirm_) |
| Route path | Drawn by hand once (e.g. on geojson.io) and stored as a GeoJSON file |

The data model still allows more stops, trips or routes later without a rebuild, but the interface is designed for
one route.

## 5. Features

### 5.1 Minimum version (must have by 1 December)

**Student page** (single page, mobile-first):
- Alert banner at the top when an alert is active (e.g. "Delayed ~15 min", "08:30 departure cancelled").
- **Next departure** from each stop, highlighted.
- Full timetable for today (expandable to other days, if the schedule varies by day).
- Map with route line, the 3 stops and the live bus marker (with "last updated X s ago").
- When no recent GPS data is available: the marker is hidden and the page says "Live location unavailable"
  instead of showing a stale position.
- Installable to home screen (PWA).

**Admin page** (`/admin`, login required):
- **Publish alert:** pick type (delay / cancellation / other), optional delay in minutes, optional affected
  departure(s), free-text message, optional expiry time → Publish.
- **Clear alert** in one tap.
- **Edit timetable:** simple editable table → Save.
- Designed for a non-technical user on a phone or laptop; no back-end access needed.

### 5.2 Planned after the minimum version (if time allows)

- **Push notifications** to students who opt in when an alert is published ([D-007](DECISIONS.md#d-007)).
- **Email relay** of alerts to the existing mailing list ([D-007](DECISIONS.md#d-007)).
- **Rough arrival estimate** ("~6 min to Dorm A") from the bus's position along the route.

### 5.3 Explicitly out of scope

- Native iOS / Android apps.
- Student accounts, profiles, favourites, feedback forms, chat.
- Storing any history of the bus's movements (see §9).
- Multiple routes/buses in the interface (data model allows it later).

## 6. Architecture (proposed — [D-003](DECISIONS.md#d-003))

```
 ┌──────────────┐  position every ~10–20 s   ┌──────────────────────────┐
 │ GPS tracker  │ ─────── 4G / SIM ────────▶ │  Back end (Supabase, EU)  │
 │  (on bus)    │                            │  • database               │
 └──────────────┘                            │  • admin login            │
                                             │  • live updates           │
 ┌──────────────┐  edits schedule / alerts   │                           │
 │ Admin page   │ ─────────────────────────▶ │                           │
 └──────────────┘                            └────────────┬──────────────┘
                                                          │ live updates
 ┌──────────────┐  loads page (static files)              ▼
 │ Web hosting  │ ──────────────────────────▶  Student's browser
 └──────────────┘                              (schedule + alerts + map)
```

| Part | Choice | Notes |
|---|---|---|
| Front end | Static site (HTML/CSS/JS), PWA | No server code on the web host |
| Map | Leaflet + OpenStreetMap tiles | Free; attribution required |
| Back end | Supabase (EU region) | Postgres DB, Auth (admin only), Realtime |
| Hosting | Static hosting — Hostinger or a free static host | See [D-009](DECISIONS.md#d-009) |
| GPS ingestion | Depends on device choice | See [D-006](DECISIONS.md#d-006) |
| Source code | GitHub: `ateagoldfish/AUB-Mediterraneo-Bus-Web-App` | |

## 7. Data model (proposed)

| Table | Purpose | Key fields |
|---|---|---|
| `stops` | The 3 stops | `id`, `name`, `lat`, `lng`, `order` |
| `departures` | The timetable | `id`, `stop_id`, `time`, `days` (e.g. Mon–Fri), `note` |
| `alerts` | Delays / cancellations / notices | `id`, `type`, `message`, `delay_min`, `affects` (departures), `starts_at`, `expires_at`, `active` |
| `bus_position` | **Latest position only** (one row, overwritten) | `lat`, `lng`, `speed`, `heading`, `recorded_at` |
| `push_subscriptions` | Only if push notifications are built | browser subscription endpoint + keys |

Access rules:
- Everyone can **read** `stops`, `departures`, active `alerts`, and `bus_position` (subject to [D-004](DECISIONS.md#d-004)).
- Only the logged-in admin can **write** `stops`, `departures`, `alerts`.
- Only the tracker (via its secret credentials) can **write** `bus_position`.

## 8. GPS tracker

**Bought ready-made, not built** ([D-006](DECISIONS.md#d-006)). Requirements:

- **4G (LTE Cat-1 or Cat-M)**, works on Cypriot networks (Cyta, Epic, PrimeTel); 2G-only devices are excluded.
- Powered from the bus (12 V or 24 V — _to confirm with the bus company_), with a small backup battery.
- Can send its position to a server **we** choose (not locked into the manufacturer's cloud).
- Reports at least every 10–20 s while moving.
- Fits on/in the bus without permanent modification, or with the bus company's written permission if wired.
- **Spare:** buy one extra unit if budget allows.
- **SIM card:** data-only, Cyprus coverage; usage roughly a few MB per day.

Model: _not yet chosen_ — see [D-006](DECISIONS.md#d-006). **Must be ordered as early as possible** (slow delivery).

## 9. Privacy and security rules

- **No student personal data** is collected in the minimum version (no accounts, no emails, no analytics cookies).
- The bus's position is treated as the **driver's personal data**: written consent from the bus company (and drivers) is
  required before going live.
- **Only the latest position is stored**; no movement history.
- The live position is shown **only during service hours** (from the timetable plus a small margin); outside them the map
  shows the route and stops but no bus. The site itself is available 24/7 ([D-005](DECISIONS.md#d-005)).
- Access to the live map: see [D-004](DECISIONS.md#d-004).
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

A short **handover / operations guide** (how to log in as admin, change the timetable, replace the SIM, etc.) is part of
the final deliverable.

## 11. Text and translation

All user-visible text lives in a **single strings file** (e.g. `src/strings/en.json`), never written directly into the
page code. Adding a language later means copying that file and translating it. Starting language: **English**.

## 12. Timeline (target)

| When | Milestone |
|---|---|
| Week of 19 Oct | Choose and **order tracker + SIM**; contact university, bus company, DPO; collect stops/timetable |
| Weeks of 26 Oct, 2 Nov | Student page: timetable + map with route (fake bus position) |
| Week of 9 Nov | Supabase, admin page, alerts |
| Week of 16 Nov | Tracker connected (or phone stand-in if the device is late) |
| Week of 23 Nov | Installed on the bus; pilot with a few students; fixes |
| **1 Dec** | **Deadline** — working system + handover guide |

## 13. Facts still to collect

- [ ] Stop names and exact locations (3)
- [ ] Order of stops / direction of travel
- [ ] Current timetable (and whether it differs by day)
- [ ] Bus electrical system: 12 V or 24 V; USB/cigarette-lighter socket available?
- [ ] Bus company's position on installing a tracker (and in which place on the bus)
- [ ] How the admin currently sends notices (mailing list owner, address, who may post to it)
- [ ] Contact for the university's Data Protection Officer
- [ ] Whether the university will fund / take ownership
