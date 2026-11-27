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

Whether you are asked to sign in depends on `src/config/auth.json` (`none`, `password` (live), `password_code`, `password_totp`, `password_two_step`).

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
| `src/config/auth.json` | `{ "mode": "none" \| "password" \| "password_code" \| "password_totp" \| "password_two_step" }` |
| `src/config/flags.json` | Feature flags. Every feature is built in; flags switch it on or off |
| `src/config/copy.json` | Button labels, headings and navigation names |
| `src/config/theme.json` | Colours and spacing |

## Scripts

```sh
npm run build        # tsc, vite build, then postbuild (route folders + 404.html)
npm run manifest     # print the manifest for the current config and rewrite manifest/flows.json

npm run auth -- <none|password|password_code|password_totp|password_two_step> [--no-push]   # commits "Auth mode: ..." and pushes
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
| t14 | Integrations page (Google Calendar, Slack, Xero), features that need a connected account, Embeds page, 7-digit ids for new items | yes |
| t15 | A fresh new navigation: grouped sidebar, renamed labels, Integrations under Settings > Connected apps, indigo theme | yes |
| t16 | Edge cases: cookie banner, hidden Cloudflare-style iframe, What's new modal and tour, chat bubble, plan gates, empty approvals, button-only pages and a wizard, slow saving, unnamed items, destructive flows, lazy Insights, Activity page | yes |
| t17 | Expenses retired: the `expenses` flag is turned off | yes |

## Server saves (`serverSaves`, on)

GitHub Pages only serves files, so with `serverSaves` on the app also sends every change to its own `/api`, the way a product with a backend does: `POST /api/<collection>` for a new item, `PATCH /api/<collection>/<id>` for an edit, `DELETE /api/<collection>/<id>` for a removal, `PATCH /api/<key>` for a setting (`src/lib/server.ts`, called from `update()` in `src/lib/store.ts`). The service worker `public/sw.js` answers them after 150 ms: 201 for a POST, 200 otherwise. The data still lives in `localStorage`. Actions that change no data (Resend an invitation, Send test message) send one `POST` of their own. Every Save button persists what it saves (sharing settings on the project, Slack and Xero settings in `connections`), so nothing only shows a toast. Turning the flag off unregisters the service worker; the app works the same, only without the requests.

Why: a recorder that checks a save on the network (a same-site write answered 2xx) could never see one from a `localStorage`-only app.

## Edge-case flags (t16)

Each one is built in and independent, so any of them can be switched off alone in `src/config/flags.json` to isolate a failure. "Live" is the state after t16.

| Flag | What it does | Live |
|---|---|---|
| `cookieBanner` | Bar over the bottom ~120px of every page (sign-in included): Accept all, Reject all, Customise (dialog with toggles and Save). The choice is stored in `localStorage` (`roozfir:consent:v1`); `?reset` clears it. Settings > Privacy reopens the preferences | on |
| `cfIframe` | Invisible 1x1 `srcdoc` iframe on the sign-in page whose script sets `window._cf_chl_opt` inside the iframe only. No challenge is ever shown; the top window never defines it | on |
| `whatsNew` | "What's new in Roozfir" modal on the first visit after sign-in ("Got it", remembered in `localStorage`) | on |
| `dashboardTour` | 3-step tooltip tour on the dashboard with Next / Skip, shown once, after What's new | on |
| `chatBubble` | Plain support-chat bubble fixed bottom-right with a "Chat with us" panel (fake form). Overlaps the bottom-right corner | on |
| `planGates` | Plans are Solo / Pro / Business (Pro is the demo account). Workflows and Sync to Xero need Business: an upgrade wall whose Upgrade button opens Plan and billing | on |
| `approveTimesheets` | People > Approve timesheets (`/team/approvals`): always the empty state | on |
| `sharingPage` | "Sharing settings" button on the project page opens `/projects/<id>/sharing` (no nav entry) | on |
| `projectWizard` | "Guided setup" on Projects: 3 steps at `/projects/new/details`, `/budget`, `/review` | on |
| `slowSave` | Creating a project takes about 3 s with a spinner. "Billing contact" is required and only appears after a client is chosen | on |
| `untitledItems` | Time entries may have no description (no row Delete button: only multi-select + bulk "Delete"); Settings > Tags: tags are created inline in a table cell, deleted only with multi-select + "Delete" | on |
| `destructiveFlows` | Settings > Delete workspace (type the workspace name) and Plan and billing > Cancel plan (confirm dialog). Both only pretend; `?reset` restores everything | on |
| `lazyInsights` | Insights shows skeletons for about 3 s before the numbers and table appear | on |
| `activityFeed` | Activity page (Work menu): infinite scroll, 15 more rows each time, 120 in all | on |
| `sessionExpiry` | **Off, built for later.** 30 minutes after signing in the user is signed out and the sign-in page shows "Your session expired" | off |

Also built but not live: auth mode `password_two_step` (email page, "Continue", then the password page). Switch with `npm run auth -- password_two_step`; the live mode stays `password`.
