# Roozfir app (sandbox)

The product app for **Roozfir**, a small, fake time-tracking and invoicing SaaS for small agencies, used as a **test target** for Clevera Autopilot (screen recording to how-to videos and help articles). Roozfir is a fictional demo product made for testing. Everything is static and runs in the browser; data is fake and lives in `localStorage`.

- Stack: Vite, React, TypeScript, Tailwind, React Router. Base path `/`.
- Hosting: GitHub Pages with the custom domain `app.roozfir.online` (`public/CNAME`), deployed by `.github/workflows/deploy.yml` on every push to `main`.
- This is the repo Clevera watches: `CHANGELOG.md`, tags (`v1.N`) and GitHub releases live here.
- The marketing site (home, pricing, changelog) is a separate repo, `clevera-ai/roozfir-site`, at https://roozfir.online.

## Live URLs

| Page | URL |
|---|---|
| Product app | https://app.roozfir.online/ |
| Sample clients CSV | https://app.roozfir.online/sample-clients.csv |
| Marketing site (other repo) | https://roozfir.online/ , `/pricing/` , `/changelog/` |

Every route answers 200: `scripts/postbuild.mjs` writes a real `index.html` for each known route (and the seeded project pages) and a `404.html` copy so any other deep link, such as `/projects/<id>`, still loads the app.

## Demo account (public, fake)

| | |
|---|---|
| Email | `demo@roozfir.online` |
| Password | `RoozfirDemo!2026` |
| 6-digit code (`password_code`) | `424242` |
| Authenticator key (`password_totp`) | `JBSWY3DPEHPK3PXP` (TOTP, SHA-1, 6 digits, 30 s) |

Whether you are asked to sign in depends on `src/config/auth.json` (`none` by default, `password`, `password_code`, `password_totp`).

## Reset the data

Add `?reset` to any URL (for example `/projects?reset`) to reseed the demo data and sign out.

## Areas

| Area | What is in it |
|---|---|
| Getting started | Sign in, dashboard tour, command palette (press the search bar or Cmd/Ctrl+K), 5-step onboarding wizard (branches on solo / team) |
| Clients | Add, edit, archive and restore (hover row actions, toasts with Undo), CSV import with column mapping and row errors (downloadable sample CSV) |
| Projects | List, create with budget and client, drag-and-drop stage board (keyboard accessible), project page |
| Time | Timer, entries table (edit, delete, multi-select bulk edit), weekly timesheet |
| Invoices | Create from tracked time with line items and tax, preview modal and send, recurring schedules with a date picker and a next-3 preview |
| Reports | Filter by client and date range, export CSV |
| Automations | Rule builder: when, if (nested all/any condition groups), then |
| Team | Invite with a role, permissions matrix per role |
| Settings | Profile, notification toggles, currency, email template editor with `{{variables}}` |
| Billing | Roozfir's own plan: view plan, change plan (no card fields anywhere) |

`manifest/flows.json` is the ground truth for every flow (id, area, difficulty, title, entry steps and steps with the exact on-screen labels). `npm run manifest` prints and rewrites it for the **current** config, so labels and flows reflect any release. Releases and auth changes refresh it automatically.

## Config: how the app changes between versions

| File | Purpose |
|---|---|
| `src/config/auth.json` | `{ "mode": "none" \| "password" \| "password_code" \| "password_totp" }` |
| `src/config/flags.json` | Feature flags. Every feature is built in; flags switch it on or off |
| `src/config/copy.json` | Button labels, headings and navigation names |
| `src/config/theme.json` | Colours and spacing |

## Scripts

```sh
npm run build        # tsc, vite build, then postbuild (route folders + 404.html)
npm run manifest     # print the manifest for the current config and rewrite manifest/flows.json

npm run auth -- <none|password|password_code|password_totp> [--no-push]   # commits "Auth mode: ..." and pushes
npm run release -- <id> [--no-push]                                        # apply releases/<id>.json
npm run release -- --revert <id> [--no-push]                               # new commit undoing a set
```

A release bumps `package.json` (`v1.N` is version `1.N.0`), prepends to `CHANGELOG.md`, regenerates `manifest/flows.json`, commits `Release v1.N: ...`, tags `v1.N`, pushes and runs `gh release create`. It also writes the same entry into the site repo's `CHANGELOG.md` (sibling folder `../roozfir-site`, override with `ROOZFIR_SITE_DIR`) and commits and pushes there, so https://roozfir.online/changelog/ updates within a minute or two of the site deploying. `--no-push` does everything locally and pushes nothing. Pushing to `main` deploys to GitHub Pages.

### Release sets (`releases/*.json`)

Each set is a list of exact edits (`ops`) to config files, so the diff is small. A set that does not match the current files changes nothing.

| id | What it does | Version, tag, release |
|---|---|---|
| t1 | New feature: expense tracking on projects | yes |
| t2 | "Clients" renamed "Customers" and moved under a new "Contacts" menu | yes |
| t3 | Wording only: eight labels | yes |
| t4 | Restyle only: colours and spacing | yes |
| t5 | Internal refactor commit (money helpers) | no: commit only |
| t6 | Four features: tags, saved views, dark mode, keyboard shortcuts | yes |
| t7 | Remove the Export CSV button from Reports | yes |
| t8a / t8b | Timesheet reminders toggle / project description field (apply separately) | yes |
| t9 | Revert of t7 (same effect as `--revert t7`) | yes |
| t10 | Broken deploy: the app renders blank. Fix with `npm run release -- --revert t10` | yes |
| t11 | The onboarding wizard gains a step ("Brand your invoices", 6 steps) | yes |
| t12 | On-screen-only heading rename: Reports page heading becomes "Profitability reports" | yes |
| t13 | Site-only: a changelog page entry in the site repo, nothing in the app repo | no: site changelog entry and commit only |
