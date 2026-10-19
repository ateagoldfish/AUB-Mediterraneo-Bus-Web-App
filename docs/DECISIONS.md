# Decision Log

> **What this file is:** the record of *why* the project is the way it is — every decision, the options considered,
> and open debates. [`SPEC.md`](SPEC.md) holds the current *what*.
>
> **Rules (to keep this from getting messy):**
> 1. **Append, don't rewrite.** New decisions are added at the end with the next number.
> 2. **Never delete.** If a decision changes, set the old one's status to `Superseded by D-xxx` and add a new entry.
> 3. Each entry has a **status**: `Open` (still debating) · `Proposed` (recommended, awaiting team/university OK) ·
>    `Decided` · `Superseded`.
> 4. When an entry becomes `Decided` and affects the spec, update `SPEC.md` in the same change.

## Index

| ID | Topic | Status |
|---|---|---|
| [D-001](#d-001) | Website (PWA), not a native app | Decided |
| [D-002](#d-002) | Two documentation files | Decided |
| [D-003](#d-003) | Tech stack: static site + Supabase + Leaflet/OSM | Proposed |
| [D-004](#d-004) | Who can see the live map | Open |
| [D-005](#d-005) | Site available 24/7; live position only in service hours | Proposed |
| [D-006](#d-006) | GPS tracker: buy ready-made, model to choose | Open — **urgent** |
| [D-007](#d-007) | Notifications: website as single source; push and/or email | Open |
| [D-008](#d-008) | Dedicated project accounts for future handover | Proposed |
| [D-009](#d-009) | Where to host the website and which domain | Open |
| [D-010](#d-010) | Store only the latest bus position | Proposed |
| [D-011](#d-011) | All UI text in one strings file; English first | Decided |

---

<a id="d-001"></a>
## D-001 — Website (PWA), not a native app
- **Date:** 2026-10-19 · **Status:** Decided
- **Decision:** Build a mobile-first website that can be "installed" to the home screen (Progressive Web App).
- **Why:** No App Store / Play Store registration, fees or review; nothing to install; works on every phone and laptop;
  one codebase. Fits the 1 December deadline.
- **Alternatives:** Native app (rejected: store registration, time); plain website without PWA features (kept as
  fallback — PWA is only a small addition).

<a id="d-002"></a>
## D-002 — Two documentation files
- **Date:** 2026-10-19 · **Status:** Decided
- **Decision:** `docs/SPEC.md` holds the current project details only; `docs/DECISIONS.md` holds decisions, reasoning
  and debates, append-only.
- **Why:** In a previous project a single blueprint grew messy as decisions changed. Separating the *what* from the
  *why* lets the spec stay short and current while the history stays complete.

<a id="d-003"></a>
## D-003 — Tech stack: static site + Supabase + Leaflet/OpenStreetMap
- **Date:** 2026-10-19 · **Status:** Proposed
- **Proposal:**
  - Front end: plain static files (HTML/CSS/JS), no server code on the web host.
  - Back end: **Supabase**, EU region — database, admin login, and realtime updates to the map.
  - Map: **Leaflet** with **OpenStreetMap** tiles.
- **Why:**
  - Shared web hosting (e.g. Hostinger Premium) serves files well but is not meant to run an always-on service that
    receives GPS data and pushes live updates. Supabase does that on its free tier.
  - A static front end can be hosted almost anywhere, which makes handover easy.
  - Supabase offers EU hosting and a GDPR data processing agreement; the data stored (timetable, alerts, one bus
    position, one admin account) is ordinary use.
  - Leaflet/OSM is free with no API key or billing account (Google Maps requires a billing account).
- **Alternatives:** Everything on Hostinger with PHP/MySQL (no realtime; polling instead — possible fallback);
  Firebase (non-EU by default, Google account ownership); Google Maps / Mapbox (billing setup).
- **To confirm:** team agreement.

<a id="d-004"></a>
## D-004 — Who can see the live map
- **Date:** 2026-10-19 · **Status:** Open
- **Question:** Should anyone on the internet see where the student bus is right now?
- **Options:**
  1. **Fully public.** Simplest. Public transport apps do this, but this bus carries a specific, identifiable group.
  2. **Public schedule; live map behind one shared access code** sent to students by university email. No accounts, no
     student data stored. Code can be changed each semester. *(Recommended.)*
  3. **Login with university email** (magic link). Stronger, but stores ~400 student emails → privacy notice, data
     handling, more work.
  4. **University single sign-on (Microsoft).** Strongest, but requires university IT approval — unrealistic by 1 Dec.
- **Leaning:** Option 2 for launch; option 3/4 can be added later if the university asks.
- **Decide with:** university representatives / DPO at the planned meeting.

<a id="d-005"></a>
## D-005 — Site available 24/7; live position only in service hours
- **Date:** 2026-10-19 · **Status:** Proposed
- **Clarification:** "Service hours" was about **when the bus's location is shown**, not when the website is reachable.
- **Proposal:** The website (timetable, alerts, map with route) is available around the clock. The **live bus marker**
  appears only during service hours (derived from the timetable, plus a margin, e.g. 15 min before first and after
  last departure). Outside those hours the tracker's position is ignored.
- **Why:** The bus's location is effectively the driver's location; showing it when the bus is off duty (e.g. parked at
  the depot or used for something else) has no benefit to students and is the main privacy concern for the driver and
  bus company.

<a id="d-006"></a>
## D-006 — GPS tracker: buy ready-made; model to choose
- **Date:** 2026-10-19 · **Status:** Open — **urgent** (delivery to Cyprus is slow)
- **Decided so far:** The device is **bought, not built** — building it is not the point of the project, and a
  commercial device is more reliable for long-term use by the university. One bus → **one device (+1 spare if
  affordable)**. Must be **4G** (2G/3G networks are being retired across Europe).
- **Options under consideration:**
  1. **Professional vehicle tracker** (e.g. Teltonika FMC920 / FMC130 — EU manufacturer, 4G, wired to the bus, backup
     battery). Speaks its own protocol, so it needs a small relay server running **Traccar** (free, open-source) which
     forwards each position to Supabase. Extra cost: a small VPS (~€5/month) and a little server upkeep.
     *Most reliable, standard in fleets.*
  2. **Ready-made 4G GPS board in an enclosure** (e.g. LilyGO T-A7670E with GPS, or T-SIM7000G). Sends directly to
     Supabase over HTTPS — no relay server. Cheaper and fewer moving parts, but it is a dev board, not a finished
     product; needs a power adapter and a case; less robust over years.
  3. **Old Android phone + tracking app** (e.g. Traccar Client). Testing and emergency fallback only.
  - Excluded: cheap no-name trackers that only report to the manufacturer's own cloud (data leaves our control; GDPR).
- **To find out before ordering:** bus voltage (12 V / 24 V), whether wiring is allowed, which Cypriot SIM/data plan,
  budget.
- **Recommendation pending** the bus-company answers; to be settled this week.

<a id="d-007"></a>
## D-007 — Notifications: website as single source; push and/or email
- **Date:** 2026-10-19 · **Status:** Open
- **Constraint:** The admin must not have to post the same notice in two places.
- **Context:** Notices currently go out by email to a mailing list (~400 students), arriving in Outlook.
- **Proposal:** The admin posts an alert **once**, on the website's admin page. From there it:
  - shows on the website immediately (minimum version);
  - optionally sends a **web push notification** to students who opted in (works on Android/desktop, and on iPhone
    when the site is added to the home screen; free; no emails stored);
  - optionally sends **one email to the existing mailing list** (via Brevo or similar) — only if the list accepts
    messages from an outside sender.
- **Rejected for now:** Sending individual emails to each student via Brevo (would mean storing ~400 emails, and
  Brevo's free tier allows 300 emails/day).
- **Alternative considered:** Admin keeps emailing as usual, and the site reads those emails automatically. Rejected as
  fragile (free-text parsing) unless the admin workflow cannot change.
- **To find out:** how the mailing list works and who controls it; whether the admin is happy to switch.

<a id="d-008"></a>
## D-008 — Dedicated project accounts for future handover
- **Date:** 2026-10-19 · **Status:** Proposed
- **Proposal:** Create a project email (e.g. a new mailbox used only for this project) and register the project's
  Supabase organisation, domain and any paid services under it rather than personal accounts. Within Supabase, create a
  **separate organisation** for this project (the free-tier slot is still used). The GitHub repo can be transferred
  later.
- **Why:** If the university adopts the project, handover is just transferring/adding them as owners — no untangling of
  personal accounts, payment methods or other projects. If the university funds anything, it should be paid on accounts
  that will become theirs.

<a id="d-009"></a>
## D-009 — Where to host the website and which domain
- **Date:** 2026-10-19 · **Status:** Open
- **Options:**
  1. **Spare Hostinger Premium slot** (already paid; EU servers). Easy now, but it sits inside a personal plan alongside
     another project, which makes handover harder.
  2. **Free static host** (GitHub Pages, Cloudflare Pages, Netlify) tied to the project accounts — €0, deploys
     automatically from GitHub, easy to hand over.
  3. Eventually a **university subdomain** (e.g. `bus.<university domain>`) pointed at whichever host is used.
- **Domain:** a cheap new domain (~€10/yr) vs. a subdomain of an existing personal domain (free, but ties branding and
  handover to a personal project).
- **Note:** Because the site is static (D-003), switching hosts later is easy — this decision is low-risk.

<a id="d-010"></a>
## D-010 — Store only the latest bus position
- **Date:** 2026-10-19 · **Status:** Proposed
- **Proposal:** The database keeps one row with the bus's latest position, overwritten on every update. No movement
  history.
- **Why:** Minimises personal data about the driver (GDPR data minimisation) and storage. Students only need "where is
  it now".
- **Trade-off:** No history means no data for later analysis (e.g. average delays). Could be revisited with consent and
  a short retention period.

<a id="d-011"></a>
## D-011 — All UI text in one strings file; English first
- **Date:** 2026-10-19 · **Status:** Decided
- **Decision:** Every piece of text the user sees lives in one file (e.g. `src/strings/en.json`). Launch in English.
- **Why:** Lets the text be reviewed or translated later (e.g. Greek) without touching code.
