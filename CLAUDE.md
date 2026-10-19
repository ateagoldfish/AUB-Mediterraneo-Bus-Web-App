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
