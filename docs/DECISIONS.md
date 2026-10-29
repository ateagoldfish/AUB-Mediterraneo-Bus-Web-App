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
| [D-012](#d-012) | Bus is rented out at times → admin "pause tracking" switch | Proposed |
| [D-013](#d-013) | Live map behind one shared passcode from the registrar | Decided |
| [D-014](#d-014) | No student data at all → no emails; alerts shown on the site | Decided |
| [D-015](#d-015) | GPS tracker: LilyGO T-SIM7670G, battery/USB powered | Decided |
| [D-016](#d-016) | Look: university colours, own bus icon, no logo | Decided |
| [D-017](#d-017) | Admin logs in with a passcode only | Decided |
| [D-018](#d-018) | Every failure has its own clear screen | Decided |
| [D-019](#d-019) | Cloudflare + dormshuttle.com, under a project Gmail | Decided |
| [D-020](#d-020) | Visual style follows aubmed.ac.cy | Proposed |

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
- **Date:** 2026-10-22 · **Status:** Proposed
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
- **Date:** 2026-10-29 · **Status:** Proposed
- **Proposal:** Match the look of the university website so the site feels familiar: Inter font, maroon header bar,
  white rounded cards, pill-shaped buttons, small letter-spaced uppercase section labels, slate-grey secondary text.
- **Colour question:** the website's stylesheet actually uses **`#840132`** as its main maroon (with `#5A011F` darker
  and `#FDF2F5` as a light tint). The colour given by the team is **`#781432`** — perhaps from the logo or a brand
  guide. The two are very close; pick one. If `#781432` comes from an official brand guide, use that; otherwise match
  the website.
- **Font hosting:** Inter is free (open licence). It is stored with our site instead of loaded from Google Fonts,
  because loading Google Fonts sends each visitor's IP address to Google, which EU courts have treated as a GDPR issue.
- **Not copied:** logo, photos, the university name as a title (D-016).
