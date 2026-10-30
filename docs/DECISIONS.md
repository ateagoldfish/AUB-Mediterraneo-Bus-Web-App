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
| [D-004](#d-004) | Who can see the live map | Superseded by D-013 |
| [D-005](#d-005) | Site available 24/7; live position only in service hours | Proposed |
| [D-006](#d-006) | GPS tracker: buy ready-made, model to choose | Superseded by D-015 |
| [D-007](#d-007) | Notifications: website as single source; push and/or email | Superseded by D-014 |
| [D-008](#d-008) | Dedicated project accounts for future handover | Proposed |
| [D-009](#d-009) | Where to host the website and which domain | Superseded by D-019 |
| [D-010](#d-010) | Store only the latest bus position | Proposed |
| [D-011](#d-011) | All UI text in one strings file; English first | Decided |
| [D-012](#d-012) | Bus is rented out at times → admin "pause tracking" switch | Superseded by D-032 |
| [D-013](#d-013) | Live map behind one shared passcode from the registrar | Decided |
| [D-014](#d-014) | No student data at all → no emails; alerts shown on the site | Decided |
| [D-015](#d-015) | GPS tracker: LilyGO T-SIM7670G, battery/USB powered | Decided |
| [D-016](#d-016) | Look: university colours, own bus icon, no logo | Decided |
| [D-017](#d-017) | Admin logs in with a passcode only | Decided |
| [D-018](#d-018) | Every failure has its own clear screen | Decided |
| [D-019](#d-019) | Cloudflare + dormshuttle.com, under a project Gmail | Decided |
| [D-020](#d-020) | Visual style follows aubmed.ac.cy | Decided |
| [D-021](#d-021) | No route line on the map — route isn't fixed | Decided |
| [D-022](#d-022) | Site works without a timetable; admin sets service hours | Decided |
| [D-023](#d-023) | Log only stop arrival times, to help build a timetable? | Superseded by D-031 |
| [D-024](#d-024) | Timetable stored as trips; tracked vs. untracked vehicles | Superseded by D-026 |
| [D-025](#d-025) | Plain HTML/JS, no build step; demo mode until Supabase exists | Decided |
| [D-026](#d-026) | Timetable: one `trips` table with times per stop | Superseded by D-031 |
| [D-027](#d-027) | Position by polling; passcode checked in the database | Decided |
| [D-028](#d-028) | Passcode limits per network, with an admin "Unblock now" | Decided |
| [D-029](#d-029) | Written permissions and own-words text before launch | Open |
| [D-030](#d-030) | Relative paths; free GitHub Pages preview for testing | Decided |
| [D-031](#d-031) | Timetable editor: day view, stops tapped in order, estimated times, measured averages | Decided |
| [D-032](#d-032) | One live tracking ON/OFF switch at the top (replaces "Pause") | Decided |
| [D-033](#d-033) | Admin layout: sticky section tabs, stacked header buttons | Decided |
| [D-034](#d-034) | English map labels via CARTO (free key) | Open |

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
- **Date:** 2026-10-19 · **Status:** Superseded by [D-013](#d-013)
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
- **Date:** 2026-10-19 · **Status:** Superseded by [D-015](#d-015)
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
- **Date:** 2026-10-19 · **Status:** Superseded by [D-014](#d-014)
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
- **Date:** 2026-10-19 · **Status:** Superseded by [D-019](#d-019)
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

<a id="d-012"></a>
## D-012 — Bus is rented out at times → admin "pause tracking" switch
- **Date:** 2026-10-22 · **Status:** Superseded by [D-032](#d-032)
- **Context:** The bus is owned by the university but is occasionally rented out for outside events, sometimes possibly
  within normal service hours. Hiding the location outside service hours (D-005) does not cover that case.
- **Proposal:** Two independent safeguards:
  1. **Pause switch** on the admin page, with an optional "resume at" date/time, so she can pause it in advance when
     she knows about a rental and doesn't have to remember to switch it back on.
  2. **The tracker is portable** (D-015): for a rental it can simply be switched off or taken off the bus.
- **Open:** who knows about rentals in advance, and whether that person is the admin.

<a id="d-013"></a>
## D-013 — Live map behind one shared passcode from the registrar
- **Date:** 2026-10-22 · **Status:** Decided (replaces D-004)
- **Decision:** The bus's live position is **not public**. Students get one shared passcode, sent out by the registrar.
  No accounts.
- **Who agreed:** the Dean of Engineering (meeting on 2026-10-22), with the team.
- **Why:** The dean does not want the location publicly accessible. Anything that collects student data (accounts,
  emails) requires approval from the university board on the main campus in Lebanon, which would not happen in time.
  A shared passcode collects nothing.
- **How it works (so it is actually secure):**
  - The passcode is checked **on the server** (a small Supabase function), not in the page's code — otherwise anyone
    could read the position by skipping the page.
  - Only a scrambled version (hash) of the passcode is stored.
  - The passcode is long enough not to be guessed, and repeated wrong attempts are slowed down (rate limit).
  - The browser remembers it, so students enter it once per device.
  - The admin can change it from the admin page (each semester, or if it leaks); the registrar sends the new one.
- **Limitation (accepted):** a shared passcode can be passed on to others. Changing it regularly limits the damage.
- **Still to confirm with the dean:** whether the **timetable and alerts** should stay public (recommended — they
  reveal no location and help visitors and new students) or also go behind the passcode.

<a id="d-014"></a>
## D-014 — No student data at all → no emails; alerts shown on the site
- **Date:** 2026-10-22 · **Status:** Decided (replaces D-007)
- **Decision:** The website collects **no student data**, so it sends **no emails**. Alerts are published once by the
  admin on the admin page and shown on the website.
- **Why:** Collecting student emails needs board approval (see D-013). Sending to the existing mailing list from the
  website is not needed for the minimum version.
- **Admin's double-posting concern:** if she still wants to email, she can keep sending one short email to her
  existing list that just points students to the website. Over time the website becomes the place to check.
- **Push notifications (later, optional):** these store a browser address, not a name or email, but a browser address
  can still count as personal data under GDPR. Only add them if the DPO confirms they need no board approval.

<a id="d-015"></a>
## D-015 — GPS tracker: LilyGO T-SIM7670G, battery/USB powered
- **Date:** 2026-10-22 · **Status:** Decided — purchased with all parts (2026-10-29)
- **Proposal:** LilyGO **T-SIM7670G** (ESP32-S3) board with an 18650 battery holder, from TinyTronics (NL), ~€45.
  [Product page](https://www.tinytronics.nl/en/development-boards/microcontroller-boards/with-telecommunication/lilygo-t-sim7670g-esp32-s3-with-18650-battery-holder).
- **Why this over D-006 option 1 (professional wired tracker):**
  - The university plans to replace the bus soon, and the bus is rented out at times → a **portable, non-wired**
    device is better.
  - It sends straight to Supabase over HTTPS → **no relay server**, no monthly server cost.
  - Delivery from the Netherlands (EU, no customs) leaves time for a backup plan.
  - A team member can configure it; the board is widely used, with example code from the manufacturer.
- **Compatibility check (done 2026-10-22):**
  - 4G Cat-1, LTE-only. Supported bands include **B3, B7, B20, B38**, which are the bands used by the Cypriot operators
    (Cyta, Epic, PrimeTel).
  - Has GNSS (GPS, Galileo, GLONASS, BeiDou). Can make HTTPS requests. **Compatible with the plan (D-003).**
- **Things to buy with it:**
  - 18650 cells: **good-quality brand-name cells** (e.g. Samsung, LG, Molicel), not unbranded ones. Buy 2.
  - LTE and GNSS antennas (IPEX/uFL), if not included — check before ordering.
  - Enclosure and a way to fix it in place.
  - USB-C cable (not included) and a power source (see below).
  - Nano-SIM with a data plan (Cypriot operator). A prepaid SIM must be registered to a person — ideally in the
    project's or university's name, for handover.
  - A second board as a spare, if budget allows.
- **Risks and how to handle them:**
  - **Battery life.** The shop does not state power use. With 4G and GPS running continuously, a rough estimate is
    one 18650 lasting somewhere between half a day and a day, so it may not get through a full service day. Measure it
    on the bench in the first week. Options: plug into a **USB socket on the bus** (the battery then acts as a backup),
    add a **USB power bank**, or swap/charge the battery nightly. The firmware sleeps outside service hours to save
    power.
  - **Heat.** Buses in Cyprus get very hot inside, especially on the dashboard. Li-ion cells must not be charged above
    about 45 °C. Mount it away from direct sun.
  - **It's a development board, not a finished product.** It is less robust than a commercial tracker. Acceptable for
    this project; the university can switch to a commercial tracker later, because only the small "receive position"
    function would change.

<a id="d-016"></a>
## D-016 — Look: university colours, own bus icon, no logo
- **Date:** 2026-10-29 · **Status:** Decided
- **Decision:** Use the university's colours — black, white and maroon `#781432`. Use a simple bus pictogram as the
  icon instead of the university logo. Add a footer saying it is a student project, not an official service.
- **Why:** Looks familiar to students, but avoids using the logo (and implying the site is official) before the
  university gives written permission. Logo and wording can be switched once permission is given.
- **Detail:** Maroon on white is very readable (contrast ratio about 11:1). Maroon on black is not (about 2:1), so
  maroon is never used for text on dark backgrounds. A dark theme is left out of the minimum version for that reason
  and for simplicity.
- **Open:** domain and site name should avoid "AUB" until permission (see D-009).

<a id="d-017"></a>
## D-017 — Admin logs in with a passcode only
- **Date:** 2026-10-29 · **Status:** Decided
- **Decision:** The admin page has one "Admin passcode" field. It is separate from the student passcode and needs none
  of her personal data.
- **How (simple and secure):** Supabase's normal login is used with a single admin user whose email is the **project
  email** (D-008), not hers. The login page fills in that email itself, so she only types the passcode. This way we use
  Supabase's tested login, rate-limiting and sessions instead of writing our own.
- **Trade-off:** if a deputy is added and they share the passcode, the site can't tell who made a change. Acceptable for
  one or two people; separate logins can be added later.
- **Rule:** the admin passcode is long (e.g. four random words), never written in the code or repository, and can be
  changed from the admin page.

<a id="d-018"></a>
## D-018 — Every failure has its own clear screen
- **Date:** 2026-10-29 · **Status:** Decided
- **Decision:** All error and status situations listed in SPEC §5.4 get their own message. The page never shows a
  blank screen or a wrong position.
- **Key choices:**
  - The timetable and alerts are **saved on the student's phone** after each successful load, so they still show
    (marked "saved at HH:MM") when the connection or back end fails. The timetable is the part that matters most, and
    it should work even when everything else is down.
  - Bus position freshness: under 1 min = normal; 1–5 min = faded "last seen"; over 5 min = hidden. (Thresholds can be
    tuned after testing on the bus.)
  - When tracking is paused, students are told it's unavailable but not why (rentals are not their business).
  - Failed admin saves keep her edits on screen and never save half a change.

<a id="d-019"></a>
## D-019 — Cloudflare + dormshuttle.com, under a project Gmail
- **Date:** 2026-10-29 · **Status:** Decided (replaces D-009)
- **Decision:**
  - A new Gmail account made only for this project is the owner account for everything (D-008).
  - Domain **dormshuttle.com**, bought through Cloudflare Registrar with that account.
  - Website hosted on **Cloudflare Pages** (free), deployed automatically from the GitHub repository.
- **Why:** At-cost domain, free hosting, automatic deploys, and handover is just changing the account owner. Keeps the
  project out of the personal Hostinger plan. The name avoids "AUB" (D-016).
- **Later option:** Cloudflare Email Routing (free) can forward an address like `admin@dormshuttle.com` to the
  project Gmail, giving the project a branded address without paying for an email service.

<a id="d-020"></a>
## D-020 — Visual style follows aubmed.ac.cy
- **Date:** 2026-10-29 · **Status:** Decided — colour `#840132` (the team's `#781432` was picked from a phone
  screenshot, so slightly off)
- **Proposal:** Match the look of the university website so the site feels familiar: Inter font, maroon header bar,
  white rounded cards, pill-shaped buttons, small letter-spaced uppercase section labels, slate-grey secondary text.
- **Colour question:** the website's stylesheet actually uses **`#840132`** as its main maroon (with `#5A011F` darker
  and `#FDF2F5` as a light tint). The colour given by the team is **`#781432`** — perhaps from the logo or a brand
  guide. The two are very close; pick one. If `#781432` comes from an official brand guide, use that; otherwise match
  the website.
- **Font hosting:** Inter is free (open licence). It is stored with our site instead of loaded from Google Fonts,
  because loading Google Fonts sends each visitor's IP address to Google, which EU courts have treated as a GDPR issue.
- **Not copied:** logo, photos, the university name as a title (D-016).

<a id="d-021"></a>
## D-021 — No route line on the map — route isn't fixed
- **Date:** 2026-10-29 · **Status:** Decided
- **Context:** The roads the bus takes depend on the driver.
- **Decision:** The map shows the 3 stops and the live bus, but no drawn route. Students mainly need "where is the bus
  now, and how far is it from my stop"; a drawn route that the bus doesn't follow would be misleading.
- **Effect:** Saves the job of drawing the route. Any arrival estimate (later) is based on distance to the stop, not
  on a route.

<a id="d-022"></a>
## D-022 — Site works without a timetable; admin sets service hours
- **Date:** 2026-10-29 · **Status:** Decided
- **Context:** The university is currently running the bus without a fixed timetable; past schedules changed too
  often.
- **Decision:**
  - The timetable becomes **optional**. When the admin has entered one, it is shown with next departures. When not,
    the page leads with the live map and the service hours.
  - **Service hours** (days + start/end times) are a separate admin setting. They decide when the live position is
    shown (D-005), so the privacy rule no longer depends on having a timetable.
  - Alerts still work without a timetable (e.g. "No bus this afternoon", "Running late").
- **Why:** The live map is most valuable precisely when there is no reliable timetable.

<a id="d-023"></a>
## D-023 — Log only stop arrival times, to help build a timetable?
- **Date:** 2026-10-29 · **Status:** Superseded by [D-031](#d-031)
- **Idea:** Instead of storing the bus's path (ruled out by D-010), record only **when the bus arrives at each stop**
  (e.g. "Dorm Anavargos, 08:12"). After a few weeks this shows when the bus actually runs, which could help the
  university set a realistic timetable.
- **Privacy:** Much less detailed than a movement history, but still information about the driver's working pattern.
  Needs the driver's agreement and the DPO's OK; keep for a limited time (e.g. one semester).
- **Not in the minimum version.** Decide after launch.

<a id="d-024"></a>
## D-024 — Timetable stored as trips; tracked vs. untracked vehicles
- **Date:** 2026-10-29 · **Status:** Superseded by [D-026](#d-026)
- **Context:** The older schedule ([example](reference/example-timetable.md)) is organised as **runs** ("trips"): each
  has a direction, a day pattern (Mon–Thu, Fri, Sat–Sun), and usually only the first stop's time. Some trips used a
  coach as well as the AUB electric bus, and weekend trips went via Old Town.
- **Proposal:**
  - Store the timetable as trips (`trips` + `trip_times`) rather than a flat list of departures, matching how the
    coordinator already thinks about it. Times at later stops are optional.
  - A trip can carry a note such as "coach" — the website then says that **this run is not shown on the live map**,
    so students don't wait for a marker that will never appear.
  - The admin edits the timetable in a structured form, not by uploading Excel: the spreadsheet's free-text cells
    (e.g. "8:30 Anavargos(coach) 08:40 Tepak") are too irregular to read reliably.
- **Found in the example:** one cell reads "21:05 Anavargos / 20:15 Tepak" — a typo, a reminder that a structured form
  that checks times is worth having.

<a id="d-025"></a>
## D-025 — Plain HTML/JS, no build step; demo mode until Supabase exists
- **Date:** 2026-10-30 · **Status:** Decided
- **Decision:**
  - The site is plain HTML, CSS and JavaScript files. There is no framework, no `npm install` and no build step.
    Cloudflare Pages serves the files as they are.
  - The map library (Leaflet) and the font (Inter) are copied into the project rather than loaded from other sites,
    so the site doesn't depend on outside services and visitors' IP addresses aren't sent to Google (D-020).
  - The site has a **demo mode**: while `src/config.js` has no Supabase address, it runs on the example timetable
    with a simulated bus and a "Demo mode" bar for simulating problems (weak signal, server down, …). Everything the
    admin changes in demo mode is stored only in that browser.
- **Why:** The fewest moving parts for a non-programmer to maintain or hand over. Demo mode lets the team and the
  university try everything before the Supabase account and the tracker are ready.

<a id="d-026"></a>
## D-026 — Timetable: one `trips` table with times per stop
- **Date:** 2026-10-30 · **Status:** Superseded by [D-031](#d-031)
- **Decision:** Same idea as D-024 — the timetable is a list of runs, each with days, a direction, a note and an
  "on live map" flag — but each run's stop times are stored inside the run (`times`), instead of a separate
  `trip_times` table.
- **Why:** Simpler: the admin page saves the whole timetable in one go (`save_timetable`, all-or-nothing), and there is
  only one table to understand.
- **Kept from D-024:** structured editor instead of Excel upload; runs on another vehicle are marked "not on map".
- **Alerts** list the runs they affect (`trip_ids`). The admin page suggests the next run by default and offers
  "all remaining runs today"; it fills in the actual runs when she publishes.

<a id="d-027"></a>
## D-027 — Position by polling; passcode checked in the database
- **Date:** 2026-10-30 · **Status:** Decided
- **Decision:**
  - The student page asks for the bus position every 10 seconds while it is open and visible, instead of using a
    live push connection.
  - The passcode check, pause switch and service hours are all enforced inside the database function
    `get_bus_position`. The tracker reports through `report_position`. No separate server code is needed.
- **Why:** A live push connection would need the position table to be readable by the browser, which would bypass
  the passcode. Polling every 10 s is as fast as the tracker reports anyway, and it is well within Supabase's free
  tier (~400 students, mostly not all at once).
- **Tested:** the security rules were checked against a local copy of the database (anonymous visitors, the admin,
  another logged-in account, wrong passcodes, rate limiting, pause, out-of-hours).

<a id="d-028"></a>
## D-028 — Passcode limits per network, with an admin "Unblock now"
- **Date:** 2026-10-30 · **Status:** Decided (changes the limit from D-013)
- **Problem found:** The first version blocked a network after **5** wrong passcodes in 5 minutes. A whole dorm shares
  one Wi-Fi network (one internet address), so one student mistyping five times would have blocked **every student
  in that building**. There was also no way to undo a block early.
- **Decision:**
  - The limit is **30 wrong passcodes per network within 10 minutes**; the block then lasts until the oldest of those
    attempts is 10 minutes old. Real users will practically never reach this, while guessing a long passcode stays
    hopeless (at most ~4,000 guesses a day per network).
  - The admin page shows how many networks are blocked and has an **Unblock now** button (`clear_passcode_blocks`).
  - Changing the student passcode also clears all blocks.
  - **Admin login:** limited by Supabase's own login protection. If the admin locks herself out she waits a few
    minutes, or anyone with the Supabase dashboard can reset the password (SETUP.md).

<a id="d-029"></a>
## D-029 — Written permissions and own-words text before launch
- **Date:** 2026-10-30 · **Status:** Open
- **Context:** The dean agreed verbally. Rather than rely on that, the team wants written permission from the university
  and the driver(s), plus a light privacy notice and disclaimer. The team also wants every longer piece of text on the
  site written in their own words (the same standard as their other project).
- **Plan:**
  - Draft short permission documents (university, driver) and a privacy notice — list in SPEC §13.
  - All site text is already in one file, `src/strings/en.json`. The team rewrites the longer texts; Claude puts them
    into the file. Short labels ("Save", "Log out", day names) stay as they are unless the team wants changes.
- **Status of the drafts:** not started — to do once the questions to the university are answered.

<a id="d-030"></a>
## D-030 — Relative paths; free GitHub Pages preview for testing
- **Date:** 2026-10-30 · **Status:** Decided
- **Context:** The team's laptop is too old to run things locally comfortably, and the Cloudflare account can't be
  created until the project email exists.
- **Decision:**
  - All links between the site's files are **relative** (e.g. `src/css/style.css`, not `/src/css/style.css`), so the
    site works both at the top of a domain (`dormshuttle.com`) and inside a folder.
  - Until Cloudflare is set up, the site can be previewed for free with **GitHub Pages** (the repository is public):
    `https://ateagoldfish.github.io/AUB-Mediterraneo-Bus-Web-App/`. It runs in demo mode only. Steps in SETUP.md.
- **Note:** The preview address contains "AUB" (from the repository name). It is only for the team's testing and is
  hidden from search engines; the public site will be `dormshuttle.com` (D-019).

<a id="d-031"></a>
## D-031 — Timetable editor: day view, stops tapped in order, estimated times, measured averages
- **Date:** 2026-10-30 · **Status:** Decided (replaces D-026 and D-023)
- **Problem:** With ~30 runs shown as big numbered cards, the admin timetable was hard to read.
- **Decision:**
  - **Day view:** the admin picks a day and sees that day's runs as one short line each, sorted by time. Tapping a run
    opens its editor; only one is open at a time.
  - **Stops tapped in order:** each run stores its stops in the order the bus visits them (`stop_ids`). The direction
    ("to campus" / "to dorms") follows from the last stop, so there is no separate direction to set.
  - **Estimated times:** only the first stop's time is required. Later stops show an estimate (previous stop + travel
    time), marked "~" on both pages. Any estimate can be typed over, e.g. for a known delay at a stop.
  - **Travel times:** a small table of minutes per pair of stops. It starts with the admin's own estimates.
  - **Measured averages (the team's idea):** when the tracker leaves a stop and reaches another, the database adds
    that trip's duration to a **running average and a trip count** for the pair. After 5 trips the average replaces
    the admin's estimate. Because routes vary by driver, the average reflects that naturally.
- **Privacy:** only the average and the count are kept — never individual trips or timestamps. The short note used
  to time a trip ("left Tepak at 08:41") lives in the single overwritten position row and is cleared whenever tracking
  is off. This replaces the idea in D-023 (logging arrival times), which would have kept more. A sentence about the
  averages goes into the driver consent note and the privacy page (SPEC §13).
- **Tested:** against a local copy of the database (a timed trip updates the average once, waiting at a stop doesn't
  count twice, the note is cleared when tracking is off, only the admin can change her estimates).

<a id="d-032"></a>
## D-032 — One live tracking ON/OFF switch at the top (replaces "Pause")
- **Date:** 2026-10-30 · **Status:** Decided (replaces D-012's pause card)
- **Context:** The team asked for a manual switch that overrides everything, easy to find in an emergency. The
  existing "Pause tracking" card did almost the same thing, further down the page; two similar controls would be
  confusing in a hurry.
- **Decision:** One big **Live tracking ON/OFF** switch directly under the tracker status. OFF takes effect for students
  within ~10 seconds, overrides service hours, and stores no location while off. Under it, as part of the same card:
  an optional "turn it back on automatically at" time (what Pause used to offer, e.g. for rentals).
- **Students see:** "Live tracking is unavailable right now." (no reason given).
- **Behind the scenes:** the same `paused` / `paused_until` settings as before, so the database rules didn't change.

<a id="d-033"></a>
## D-033 — Admin layout: sticky section tabs, stacked header buttons
- **Date:** 2026-10-30 · **Status:** Decided
- **Problems found by the team on a phone:** the two header buttons were different sizes and wrapped onto two lines;
  a tapped section tab stayed looking "selected" after scrolling away, which read as a mistake.
- **Decision:**
  - Header buttons stack vertically on phones, same width, one line each.
  - The section tabs stick to the top of the screen while scrolling and highlight whichever section is in view —
    so the highlight is always correct. A menu was considered but adds a tap for only four sections.
  - Hover effects only apply on devices with a mouse (on phones a tapped button kept its hover look).
  - Date/time boxes no longer stick out of their cards on iPhones.

<a id="d-034"></a>
## D-034 — English map labels via CARTO (free key)
- **Date:** 2026-10-30 · **Status:** Open (waiting for the project email)
- **Problem:** OpenStreetMap's standard map shows place names in Greek; many students don't read Greek.
- **Plan:** Switch to CARTO's map style, free for non-commercial use (up to 5 million map images a month — far more
  than needed) with attribution. Since 2026 it needs a free API key, requested by email (no account) — to be
  requested from the project email. Once the key is in, check that the labels are actually in English; if not,
  look again.
- **Rejected:** MapTiler's free plan (5,000 visits a month — too few for ~400 students).
- **Meanwhile:** the stop names on our map are already in English.
