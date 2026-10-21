# Logging in to the CMS — first time

EmDash has no passwords. You sign in with a **passkey** (Windows Hello, Touch ID,
or a browser/device credential). This guide covers creating your first admin
account and signing in afterwards.

- Admin URL: <http://localhost:4321/_emdash/admin>
- Sign-in URL: <http://localhost:4321/_emdash/admin/login>

---

## Before you start: reset the database

> **You need to do this once.** An earlier automated check created a throwaway
> `dev@emdash.local` account and marked setup complete, but no passkey was ever
> registered for it. The wizard will not run again, and there is no passkey to
> log in with — so the admin is currently locked.

Nothing of value is in the database (0 posts, 0 pages; the content model is
generated from `seed/seed.json`). Deleting it is safe.

**PowerShell / cmd**

```sh
del data.db data.db-shm data.db-wal
```

**macOS / Linux**

```sh
rm -f data.db data.db-shm data.db-wal
```

Do **not** delete `.env` — it holds `EMDASH_ENCRYPTION_KEY`, and replacing it
would orphan any encrypted plugin secrets you add later.

---

## Step 1 — start the dev server

```sh
npm run dev
```

Watch for this line in the terminal:

```
Admin UI    http://localhost:4321/_emdash/admin
```

The first request also prints a **dev bypass** link:

```
Dev bypass  http://localhost:4321/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin
Skips passkey setup/auth and signs you in as a dev admin
```

Useful for poking at the admin without a passkey. It is available **only in
development**, and it creates a second throwaway account — so skip it for your
real first login and use the wizard instead.

---

## Step 2 — run the setup wizard

Open <http://localhost:4321/_emdash/admin>. With no database it redirects to the
wizard:

1. **Site details** — enter a **Site Title** (e.g. `Mankoo`) and an optional
   tagline. Leave **Include sample content** selected if you want the starter
   posts; leave it off for an empty site. Select **Continue**.
2. **Your account** — enter your **email** and an optional **name**. Select
   **Continue**.
3. **Register a passkey** — your browser prompts you. On Windows this is
   **Windows Hello**: pick *PIN*, fingerprint, or face recognition.

   The first account created is always an **Admin** (role 50).

When the credential prompt opens you should be done. Select **Open the
dashboard**.

---

## Step 3 — what you should see

The sidebar lists the two collections from `seed/seed.json`:

- **Pages** — six published entries, one per route:
  `home`, `about`, `contact`, `machines`, `machines/type-a`, `machines/type-b`
- **Posts** — three published sample articles under `/news`

The `home` page carries all eight blocks (hero, split grid, capability strip,
machine slider, featured product, reasons, testimonial, latest posts), so the
public site renders the full design straight from the CMS.

### If a collection is empty

Content entries are only created when the seed is applied **with** sample
content. `--no-content` skips them, and the setup wizard's *"Include sample
content"* checkbox controls the same thing. To populate an existing database
afterwards — without losing your account or passkey:

```sh
npx emdash seed seed/seed.json --database ./data.db
```

Add `--on-conflict update` to overwrite entries that already exist.

---

## Signing in from then on

Visit <http://localhost:4321/_emdash/admin/login> and use your passkey. No
password to remember; your device unlocks it.

Passkeys sync through your browser or password manager, so on a second machine
you may be offered the credential automatically. If you get **"No matching
credentials"**, register a new passkey from that device first.

---

## Adding other people

Admin → **Users** → invite. Roles:

| Role | Value | Can do |
| :-- | --: | :-- |
| Admin | 50 | Everything, including users and settings |
| Editor | 40 | Create, edit and publish anyone's content |
| Author | 30 | Create and publish their own content |
| Contributor | 20 | Create drafts only |

Invitees set up their own passkey when they first sign in.

---

## Troubleshooting

### The admin loads but shows only "Loading EmDash…"

`react()` must be registered in `astro.config.mjs`. It is, so this usually
means a stale build — restart the dev server.

### "Failed to apply seed"

The database holds a half-applied model. Reset it (top of this guide) and
reload. Validate the seed independently with:

```sh
npx emdash seed seed/seed.json --validate
```

### Passkey prompt never appears

Passkeys need a **secure context**. `http://localhost` counts, but an IP
address or `http://192.168.x.x` does not. Use `localhost`.

### "Passkey authentication failed"

The site URL recorded at setup must match the URL you are browsing. Setup
stored the origin you first visited, so **always return to the same host and
port** — if you switch between `localhost:4321` and `127.0.0.1:4321`, one of
them will fail. Change it deliberately under **Settings → General → Public URL**.

### Lost every passkey (all devices)

No password recovery exists, so the database has to be reset — or another admin
registers a new one for you:

```sh
del data.db data.db-shm data.db-wal
```

That discards **all** content. Back up `data.db` and `uploads/` regularly;
EmDash's **Settings → Backups** can export them.

---

## Before deploying

Passkeys require HTTPS. On Cloudflare that is automatic, but set the public
origin so passkey ceremonies resolve correctly:

```sh
npx wrangler secret put EMDASH_SITE_URL   # https://your-domain.com
```

Then complete the wizard at your real domain — a passkey created on
`localhost` is scoped to `localhost` and will not work in production. Register
a fresh one there.

If you would rather not use passkeys at all, add a login provider (GitHub,
Google or Microsoft) in `astro.config.mjs`; see the EmDash authentication
docs. For team-wide access, Cloudflare Access replaces the login page entirely.