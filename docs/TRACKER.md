# GPS tracker → server

How the tracker (LilyGO T-SIM7670G, D-015) sends the bus position. Everything is one HTTPS request.

## The request

```
POST https://<project>.supabase.co/rest/v1/rpc/report_position
apikey: <anon / publishable key>          (the same public key as in src/config.js)
Content-Type: application/json

{
  "device_key": "<tracker key>",          (secret — set in SETUP.md step 4, never in the repository)
  "lat": 34.776953,
  "lng": 32.434246,
  "speed": 32.5,                           (km/h, optional)
  "heading": 180,                          (degrees, optional)
  "battery": 81                            (percent, optional but useful)
}
```

- If there is **no GPS fix** yet, send `"lat": null, "lng": null` (still send the battery). The site then shows
  "Live location unavailable" rather than an old position.
- The server records its **own** time, so the tracker's clock doesn't matter.

## The answer

```json
{ "tracking": true, "next_report_seconds": 10 }
```

- `tracking: true` → in service hours and not paused: the position was stored. Report again after
  `next_report_seconds` (10).
- `tracking: false` → outside service hours or paused: **only the battery and "last seen" time were stored, not the
  location** (privacy, SPEC §9). Wait `next_report_seconds` (300) and ask again — the tracker can sleep in between
  to save battery.
- HTTP **401/403** → wrong tracker key. Don't retry quickly; check the key.
- Network error / HTTP 5xx → retry after 30 s, then back off (60 s, 120 s, …, max 5 min).

## Travel times (nothing extra for the tracker to do)

The server also uses the reports to time trips between stops (D-031): when the bus leaves one stop (more than 150 m
away) and later reaches another, it adds the trip's duration to that pair's average. The tracker doesn't need to do
anything for this — just keep reporting every ~10 s while tracking.

## Test it without the tracker

From any computer, during service hours (replace the three values):

```
curl -X POST "https://<project>.supabase.co/rest/v1/rpc/report_position" \
  -H "apikey: <public key>" -H "Content-Type: application/json" \
  -d '{"device_key":"<tracker key>","lat":34.776953,"lng":32.434246,"battery":90}'
```

The bus should appear at Tepak Dorms on the student page (after entering the passcode).

## Practical notes

- Use HTTPS (the SIM7670G supports it). Plain HTTP is refused.
- Data use: one request is roughly 1–2 KB including HTTPS overhead. Every 10 s for 14 h/day ≈ 5–10 MB/day. Check this
  against the SIM's data plan; reporting every 15–20 s halves it, at the cost of a slightly jumpier marker.
- The admin page warns when the tracker hasn't reported for 3 minutes during service hours, and when the battery is
  at 20 % or less.
