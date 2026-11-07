// GitHub Pages has no SPA fallback: 404.html is a copy of index.html so deep links load,
// and every known route (and the seeded projects' pages) also gets a real index.html so it answers 200.
import { copyFileSync, mkdirSync } from 'node:fs'
const html = 'dist/index.html'
copyFileSync(html, 'dist/404.html')
const routes = [
  'pricing', 'changelog', 'app', 'app/onboarding', 'app/clients', 'app/clients/import', 'app/projects', 'app/time', 'app/invoices', 'app/invoices/new', 'app/invoices/recurring',
  'app/reports', 'app/automations', 'app/automations/new', 'app/team', 'app/team/permissions', 'app/settings', 'app/settings/profile', 'app/settings/notifications',
  'app/settings/currency', 'app/settings/templates', 'app/billing', 'app/billing/plans',
  'app/projects/p-website', 'app/projects/p-brand', 'app/projects/p-app', 'app/projects/p-menu', 'app/projects/p-launch',
]
for (const dir of routes) {
  mkdirSync(`dist/${dir}`, { recursive: true })
  copyFileSync(html, `dist/${dir}/index.html`)
}
