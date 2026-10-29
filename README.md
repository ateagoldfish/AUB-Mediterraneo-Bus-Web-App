# Dorm Shuttle (AUB Mediterraneo bus web app)

A simple website for AUB Mediterraneo students: the campus–dorms shuttle bus's live location (behind a passcode),
the timetable and current delays/changes, all in one place instead of scattered across emails.

University semester project (Industrial Engineering), due 1 December 2026. Not an official university service.

## Try it

```
python3 -m http.server 8080
```

Then open <http://localhost:8080> (student passcode `demo`) and <http://localhost:8080/admin/> (passcode
`admin-demo`). Until Supabase is configured the site runs in **demo mode** with example data and a simulated bus.

## Documentation

- [`docs/SPEC.md`](docs/SPEC.md) — what the project is and how it is built (always current).
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — why: decisions, options considered and open debates (append-only log).
- [`docs/SETUP.md`](docs/SETUP.md) — step by step: Cloudflare, Supabase, going live.
- [`docs/TRACKER.md`](docs/TRACKER.md) — how the GPS tracker reports its position.

## Status

Student and admin pages built and working in demo mode. Next: Supabase project, Cloudflare deployment, tracker
connection.
