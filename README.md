# Dorm Shuttle (AUB Mediterraneo bus web app)

A simple website for AUB Mediterraneo students: the campus–dorms shuttle bus's live location (behind a passcode),
the timetable and current delays/changes, all in one place instead of scattered across emails.

University semester project (Industrial Engineering), due 1 December 2026. Not an official university service.

## Try it

```
python3 -m http.server 8080
```

Then open <http://localhost:8080> and <http://localhost:8080/admin/>. The site is connected to the real Supabase
project. To try it with example data and a simulated bus instead (**demo mode**, student passcode `demo`, admin
passcode `admin-demo`), empty `supabaseUrl` in `src/config.js`.

Live site: <https://dorm-shuttle.dormshuttle.workers.dev>

## Documentation

- [`docs/SPEC.md`](docs/SPEC.md) — what the project is and how it is built (always current).
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — why: decisions, options considered and open debates (append-only log).
- [`docs/SETUP.md`](docs/SETUP.md) — step by step: Cloudflare, Supabase, going live.
- [`docs/TRACKER.md`](docs/TRACKER.md) — how the GPS tracker reports its position.

## Status

Student and admin pages built; live on Cloudflare and connected to Supabase (13 Nov). Next: service hours and
timetable entered by the admin, English map labels (CARTO key), tracker connection.
