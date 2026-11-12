# Setup guide

Step by step, from "demo on my laptop" to "live for students". Steps 1–2 work today; steps 3–6 need the project
email account (D-008, D-019).

---

## 1. Try the demo on your own computer

The site is plain files, so any simple web server works. With Python (already on most Macs):

```
cd AUB-Mediterraneo-Bus-Web-App
python3 -m http.server 8080
```

Open <http://localhost:8080>. The dark **Demo mode** bar at the bottom shows the passcodes and lets you simulate
problems (weak signal, server down, outside service hours…).

- Student passcode: `demo`
- Admin page: <http://localhost:8080/admin/>, passcode `admin-demo`

In demo mode everything is stored only in that browser. "Reset demo data" starts over.

## 1b. Or: preview it on any phone or laptop with GitHub Pages (no installing anything)

Works right now, without the project email. The site runs in demo mode.

1. On GitHub, open the repository → **Settings → Pages**.
2. **Source: Deploy from a branch**. **Branch: `main`**, folder **`/ (root)`** → **Save**.
3. After a minute or two the site is at <https://ateagoldfish.github.io/AUB-Mediterraneo-Bus-Web-App/>
   (the admin page: add `admin/` to the end). Every push to `main` updates it.

When the real site is on Cloudflare, switch this off again (same page → Source: None) so there is only one copy.

## 2. Put it online with Cloudflare (done 2026-11-12)

The site runs on Cloudflare's free plan at <https://dorm-shuttle.dormshuttle.workers.dev>, logged in with the
project email. It was set up as a **Workers** project connected to the GitHub repository (Cloudflare offers Workers
by default now; for a plain site like this it works the same as Pages). Every push to `main` updates it within a
minute or two. No domain was bought (D-036).

Good to know:
- Cloudflare shortens addresses (`privacy.html` → `/privacy`). The offline copy (`sw.js`) handles that.
- A wrong link shows Cloudflare's plain "not found" page instead of our `404.html`. Fixable later with a small
  settings file, e.g. at handover.
- To give it a nicer address later (e.g. `bus.<university domain>`): the project → **Settings → Domains & Routes**.

Once the university is happy with this address, switch the GitHub Pages preview off (step 1b) so there is only one
copy.

## 3. Create the Supabase project

1. Log in to Supabase with the project email. Create a **new organisation** (e.g. "Dorm Shuttle"), then a
   **new project** in it. Region: **Central EU (Frankfurt)**. Save the database password in the password manager.
2. Open `supabase/schema.sql` from this repository. On the last lines, replace `CHANGE-ME@example.com` with the
   project email.
3. In Supabase: **SQL Editor → New query**, paste the whole file, **Run**. It should finish with "Success".

## 4. Create the admin login and the passcodes

1. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up". (Only the one admin account
   should exist.)
2. **Authentication → Users → Add user → Create new user**:
   - Email: the project email (the same one as in step 3.2)
   - Password: the **admin passcode** (long — e.g. four random words)
   - Tick "Auto confirm user".
3. **SQL Editor → New query**, replace the two values in quotes, then Run:

   ```sql
   update settings set
     student_passcode_hash = extensions.crypt('STUDENT PASSCODE HERE', extensions.gen_salt('bf')),
     device_key_hash       = extensions.crypt('TRACKER KEY HERE', extensions.gen_salt('bf'))
   where id = 1;
   ```

   - **Student passcode:** at least 8 characters. Later the admin can change it from the admin page.
   - **Tracker key:** a long random string (generate one in the password manager, 30+ characters). Give it to
     whoever programs the tracker. It must **never** go into this repository.

   Only scrambled versions (hashes) are stored, so nobody can read the passcodes back — not even in the dashboard.

## 5. Connect the site to Supabase

1. In Supabase: **Project Settings → API Keys**. Copy the **Project URL** and the **anon / publishable** key.
   (This key is meant to be public; the security rules in the database are what protect the data. Never use the
   `service_role` / secret key in the website.)
2. Fill in `src/config.js`:

   ```js
   supabaseUrl: 'https://xxxxxxxx.supabase.co',
   supabaseAnonKey: 'the anon / publishable key',
   adminEmail: 'the project email',
   ```

3. Commit and push. Cloudflare redeploys; the demo bar disappears.
4. Log in at `/admin/`, set the **service hours**, and enter the timetable if there is one.

## 6. Check everything before telling students

- [ ] Student page loads; wrong passcode is refused; right passcode shows "Bus not in service" or the bus.
- [ ] Admin: publish an alert → it appears on the student page; clear it → it disappears.
- [ ] Admin: pause tracking → students see "Live tracking is unavailable today"; resume.
- [ ] Tracker: follow [`TRACKER.md`](TRACKER.md) and send a test position with `curl` during service hours → the bus
      appears on the map.
- [ ] Phone: open the site, "Add to Home Screen", turn on airplane mode, open it again → saved timetable shows.

## Good to know

- **Supabase free projects pause after a week with no activity** (e.g. over a holiday if the tracker is off). Unpause
  it from the dashboard; nothing is lost.
- **Changing the student passcode** takes effect immediately; students see "The passcode has changed".
- **Forgotten admin passcode, or locked out after too many tries:** wait a few minutes, or Supabase →
  Authentication → Users → the admin user → change password.
- **Students blocked after wrong passcodes** (e.g. a whole dorm's Wi-Fi): the admin page → Passcodes →
  **Unblock now**. Blocks also lift by themselves within 10 minutes.
- **Handover:** add the university as owners of the Supabase organisation, the Cloudflare account and the GitHub
  repository (SPEC §10).
