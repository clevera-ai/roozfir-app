// GitHub Pages has no SPA fallback: 404.html is a copy of index.html so deep links load,
// and every known route (and the seeded projects' pages) also gets a real index.html so it answers 200.
import { copyFileSync, mkdirSync } from 'node:fs'
const html = 'dist/index.html'
copyFileSync(html, 'dist/404.html')
const routes = [
  'onboarding', 'clients', 'clients/import', 'projects', 'time', 'invoices', 'invoices/new', 'invoices/recurring',
  'reports', 'automations', 'automations/new', 'team', 'team/permissions', 'settings', 'settings/profile', 'settings/notifications',
  'settings/currency', 'settings/templates', 'billing', 'billing/plans',
  'projects/p-website', 'projects/p-brand', 'projects/p-app', 'projects/p-menu', 'projects/p-launch',
]
for (const dir of routes) {
  mkdirSync(`dist/${dir}`, { recursive: true })
  copyFileSync(html, `dist/${dir}/index.html`)
}
