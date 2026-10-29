# Notes for Claude

- Project owner and builder is not a professional programmer: explain choices plainly and keep the code simple.
- Simplicity is the top priority. Do not add features, dependencies or build tooling unless a decision in
  `docs/DECISIONS.md` calls for it.

## Documentation rules

- `docs/SPEC.md` describes only the **current** state. Edit it in place; never add history to it.
- `docs/DECISIONS.md` is **append-only**: add new entries with the next `D-xxx` number and add them to the index; never
  delete entries — mark replaced ones `Superseded by D-xxx`.
- When a decision becomes `Decided` and changes the spec, update both files in the same commit.
- Bump the "Last updated" date in `SPEC.md` when editing it.

## Code rules

- All user-visible text goes in the strings file (`src/strings/en.json`), never hard-coded in the page.
- Never commit secrets, keys or passwords.

## Working on the code

- Plain HTML/CSS/JS, no build step (D-025). Run locally with `python3 -m http.server 8080`.
- Pages only talk to the back end through `src/js/api.js`; keep `demo-backend.js` and `supabase-backend.js` in step
  (same functions, same error codes from `errors.js`).
- Database changes go in `supabase/schema.sql`, and must keep the security rules in SPEC §7/§9.
- All times are Cyprus time — use the helpers in `src/js/time.js`, never the device's local time.
- When adding files the student page needs offline, add them to the list in `sw.js` and bump `CACHE`.
