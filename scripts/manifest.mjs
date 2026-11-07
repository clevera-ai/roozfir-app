#!/usr/bin/env node
// Usage: npm run manifest
// Prints the ground-truth flow manifest for the CURRENT config (flags, copy and auth applied)
// and rewrites manifest/flows.json. Labels are the exact on-screen text.
import { fileURLToPath } from 'node:url'
import { readJson, writeJson } from './lib.mjs'

const DEMO = { email: 'demo@tallyfox.test', password: 'TallyfoxDemo!2026', code: '424242' }

export function buildManifest() {
  const flags = readJson('src/config/flags.json')
  const copy = readJson('src/config/copy.json')
  const auth = readJson('src/config/auth.json')
  const c = (k) => copy[k]
  const L = c('label.client')
  const lc = L.toLowerCase()
  const version = readJson('package.json').version

  const click = (label, extra) => ({ action: 'click', label, ...extra })
  const type = (label, value) => ({ action: 'type', label, ...(value !== undefined ? { value } : {}) })
  const select = (label, value) => ({ action: 'select', label, ...(value !== undefined ? { value } : {}) })
  const check = (label) => ({ action: 'check', label })
  const uncheck = (label) => ({ action: 'uncheck', label })
  const hover = (label) => ({ action: 'hover', label })

  const nav = (key) => [click(c(key))]
  const clientsNav = flags.contactsMenu ? [click(c('nav.contacts')), click(c('nav.clients'))] : [click(c('nav.clients'))]
  const settingsTab = (tab) => [click(c('nav.settings')), click(tab)]

  const flows = []
  const add = (id, area, difficulty, title, start_path, entry_steps, steps, extra = {}) =>
    flows.push({ id, area, difficulty, title, start_path, entry_steps, steps, ...extra })

  // ---- Getting started ----
  const unavailable = []
  if (auth.mode !== 'none') {
    const s = [type('Email', DEMO.email), type('Password', DEMO.password), click('Sign in')]
    if (auth.mode !== 'password') s.push(type('6-digit code', auth.mode === 'password_code' ? DEMO.code : 'current code from the authenticator key'), click('Verify and continue'))
    add('sign-in', 'Getting started', 'easy', 'Sign in', '/app/', [], s)
  } else unavailable.push({ id: 'sign-in', reason: 'Sign-in is switched off (auth mode "none").' })

  add('dashboard-tour', 'Getting started', 'easy', 'Tour the dashboard', '/app/', [],
    [click('Take the tour'), click('Next'), click('Next'), click('Next'), click('Done')])
  add('command-palette', 'Getting started', 'easy', 'Jump to a page or action with the command palette', '/app/', [],
    [click('Search or jump to…'), type('Search commands', 'invoice'), click(c('invoices.create'))])
  add('onboarding-wizard', 'Getting started', 'hard', `Set up your workspace with the ${flags.wizardBrandStep ? '6' : '5'}-step wizard (branches on solo or team)`, '/app/onboarding',
    [click('Start setup')],
    [
      type('Workspace name', 'Fernhill Creative'),
      click('Solo', { branch: 'solo' }), click('Team', { branch: 'team' }),
      click('Continue'),
      select('Currency', 'USD'), type('Default hourly rate', '90'), click('Continue'),
      { ...type('Project name', 'Website redesign'), branch: 'solo' },
      { ...type('Teammate email', 'new@fernhill.test'), branch: 'team' }, { ...select('Role', 'Member'), branch: 'team' }, { ...click('Add'), branch: 'team' },
      click('Continue'),
      type(`${L} name`, 'Northwind Studio'), click('Continue'),
      ...(flags.wizardBrandStep ? [type('Invoice prefix', 'FH'), select('Accent colour', 'Teal'), click('Continue')] : []),
      click('Finish setup'),
    ],
    { steps_total: flags.wizardBrandStep ? 6 : 5, notes: 'Steps tagged with a branch only apply to that choice (Solo or Team). "Skip for now" is offered on the project/teammates and client steps.' })

  // ---- Clients ----
  add('client-add', 'Clients', 'easy', `Add a ${lc}`, '/app/clients', clientsNav,
    [click(c('clients.add')), type('Name', 'Alder & Finch'), type('Email', 'billing@alderfinch.test'), click(`Save ${lc}`)])
  add('client-edit', 'Clients', 'medium', `Edit a ${lc}`, '/app/clients', clientsNav,
    [hover('Northwind Studio'), click('Edit Northwind Studio'), type('Name', 'Northwind Studio Ltd'), type('Hourly rate (USD)', '100'), click(`Save ${lc}`)])
  add('client-archive-restore', 'Clients', 'medium', `Archive and restore a ${lc}`, '/app/clients', clientsNav,
    [hover('Bluebird Coffee'), click('Archive Bluebird Coffee'), check('Show archived'), hover('Bluebird Coffee'), click('Restore Bluebird Coffee')])
  add('clients-import-csv', 'Clients', 'hard', `Import ${c('clients.heading').toLowerCase()} from a CSV file with column mapping and row errors`, '/app/clients/import',
    [...clientsNav, click(c('clients.import'))],
    [click('Use sample data'), click('Continue to mapping'),
      select('Map column Company name', 'Name'), select('Map column Contact email', 'Email'), select('Map column Main contact', 'Contact'), select('Map column Rate (USD/h)', 'Hourly rate'),
      click('Review rows'), check('Skip rows with problems'), click('Import valid rows')],
    { notes: 'The sample CSV can also be downloaded with "Download sample CSV". The review step flags rows with a missing name, a bad email, a non-numeric rate or a name that already exists.' })

  // ---- Projects ----
  add('project-create', 'Projects', 'medium', 'Create a project with a budget and a client', '/app/projects', nav('nav.projects'),
    [click(c('projects.create')), type('Project name', 'Spring campaign'), select(L, 'Bluebird Coffee'), type('Budget (USD)', '5000'),
      ...(flags.projectDescription ? [type('Project description', 'Social and email campaign for the spring menu.')] : []), click('Create project')])
  add('project-board', 'Projects', 'hard', 'Move projects across the drag-and-drop stage board', '/app/projects?view=board', nav('nav.projects'),
    [click('Board'), { action: 'drag', label: 'Website redesign card', to: 'Review column' }],
    { notes: 'Keyboard alternative: focus the card, press Space, use the arrow keys, press Space again.' })
  if (flags.expenses) add('project-expense', 'Projects', 'medium', 'Track an expense on a project', '/app/projects/p-website', [...nav('nav.projects'), click('Website redesign')],
    [click('Add expense'), type('Description', 'Domain renewal'), type('Amount', '45'), check('Billable to the client'), click('Save expense')])

  // ---- Time ----
  add('timer-start-stop', 'Time', 'easy', 'Start and stop the timer', '/app/time', nav('nav.time'),
    [type('What are you working on?', 'Homepage review'), select('Project', 'Website redesign'), click(c('time.start')), { action: 'wait', label: 'a few seconds' }, click(c('time.stop'))])
  add('time-edit-entry', 'Time', 'medium', 'Edit a time entry', '/app/time', nav('nav.time'),
    [hover('Homepage wireframes'), click('Edit entry Homepage wireframes'), type('Duration', '3:00'), type('Note', 'Homepage wireframes, round 2'), ...(flags.tags ? [type('Tags', 'design, review')] : []), click('Save entry')])
  add('weekly-timesheet', 'Time', 'medium', 'Fill in the weekly timesheet', '/app/time?tab=timesheet', nav('nav.time'),
    [click('Weekly timesheet'), type('Website redesign, Friday', '2'), type('Mobile app MVP, Friday', '1.5'), click('Save timesheet')])
  add('time-bulk-edit', 'Time', 'hard', 'Bulk-edit entries from a multi-select table', '/app/time', nav('nav.time'),
    [check('Select Homepage wireframes'), check('Select Homepage visual design'), click('Bulk edit'), select('Project', 'Brand refresh'), select('Billable', 'Non-billable'), click('Apply changes')])
  if (flags.tags) add('time-tags', 'Time', 'easy', 'Filter time entries by tag', '/app/time', nav('nav.time'), [select('Filter by tag', 'design')])
  if (flags.savedViews) add('time-saved-views', 'Time', 'medium', 'Save a filtered view of the time table', '/app/time', nav('nav.time'),
    [select('Filter by project', 'Website redesign'), select('Filter by billing', 'Billable only'), click('Save view'), type('View name', 'Website billable'), click('Save view'), select('Saved views', 'Website billable')])

  // ---- Invoices ----
  add('invoice-create-send', 'Invoices', 'medium', 'Create an invoice from tracked time, add line items and tax, preview and send', '/app/invoices/new', [...nav('nav.invoices'), click(c('invoices.create'))],
    [select(L, 'Northwind Studio'), check('Include Homepage wireframes'), check('Include Homepage visual design'), click('Add selected time'),
      click('Add line item'), type('Line 3 description', 'Hosting setup'), type('Line 3 quantity', '1'), type('Line 3 rate', '150'),
      select('Tax rate', '8%'), click('Preview invoice'), click(c('invoices.send'))])
  add('invoice-recurring', 'Invoices', 'hard', 'Set up a recurring invoice schedule with a date picker and a preview of the next 3', '/app/invoices/recurring', [...nav('nav.invoices'), click('Recurring')],
    [click('New schedule'), select(L, 'Bluebird Coffee'), type('Title', 'Monthly social media management'), type('Amount (USD)', '1800'), select('Frequency', 'Every month'),
      click('Start date'), click('Next month'), click('1'), click('Save schedule')],
    { notes: 'In the date picker the day buttons show the day number; "1" picks the first of the month shown.' })

  // ---- Reports ----
  add('reports-filter-export', 'Reports', 'medium', flags.reportsExportCsv ? 'Filter a report by client and date range, export CSV' : 'Filter a report by client and date range', '/app/reports', nav('nav.reports'),
    [select(L, 'Northwind Studio'), type('From', '2026-11-01'), type('To', '2026-11-30'), ...(flags.reportsExportCsv ? [click('Export CSV')] : [])])

  // ---- Automations ----
  add('automation-rule', 'Automations', 'hard', 'Build an automation rule: when, if (nested conditions), then', '/app/automations/new', [...nav('nav.automations'), click('New rule')],
    [type('Rule name', 'Alert on risky retainers'), select('Trigger', 'A project goes over budget'),
      click('Add condition'), select('Conditions condition 1 field', 'Budget used'), select('Conditions condition 1 operator', 'is more than'), type('Conditions condition 1 value', '90%'),
      click('Add group'), select('Nested group 1: match', 'any'), select('Nested group 1 condition 1 field', 'Client'), select('Nested group 1 condition 1 operator', 'is'), type('Nested group 1 condition 1 value', 'Kestrel Labs'),
      click('Add condition to nested group 1'), select('Nested group 1 condition 2 field', 'Hours logged'), select('Nested group 1 condition 2 operator', 'is more than'), type('Nested group 1 condition 2 value', '100'),
      select('Action 1 type', 'Send email'), type('Action 1 detail', 'Project manager'), click('Add action'), select('Action 2 type', 'Notify in Slack'), type('Action 2 detail', '#agency-ops'), click('Save rule')])

  // ---- Team ----
  add('team-invite', 'Team', 'medium', 'Invite a teammate with a role', '/app/team', nav('nav.team'),
    [click(c('team.invite')), type('Email address', 'jordan@fernhill.test'), select('Role', 'Manager'), click('Send invitation')])
  add('team-permissions', 'Team', 'hard', 'Set permissions per role in the permissions matrix', '/app/team/permissions', [...nav('nav.team'), click('Permissions')],
    [check('Manager: Manage billing'), check('Member: Create invoices'), uncheck('Viewer: View reports'), click('Save permissions')],
    { notes: 'Viewer starts with View reports ticked, so that box is cleared.' })

  // ---- Settings ----
  add('settings-profile', 'Settings', 'easy', 'Update your profile', '/app/settings/profile', nav('nav.settings'),
    [type('Full name', 'Dana Whitfield-Reyes'), type('Job title', 'Founder'), select('Time zone', 'Europe/London'), click(c('settings.save'))])
  add('settings-notifications', 'Settings', 'easy', 'Change notification toggles', '/app/settings/notifications', settingsTab('Notifications'),
    [click('Weekly summary email'), click('Timer left running'), ...(flags.timesheetReminders ? [click('Timesheet reminders')] : []), click('Save notifications')])
  add('settings-currency', 'Settings', 'easy', 'Change the currency', '/app/settings/currency', settingsTab('Currency'),
    [select('Currency', 'EUR'), type('Default hourly rate', '85'), click('Save currency')])
  add('email-template-editor', 'Settings', 'medium', 'Edit an email template with variables', '/app/settings/templates', settingsTab('Email templates'),
    [select('Template', 'Payment reminder'), type('Subject', 'Reminder: invoice {{invoice.number}} is due soon'), click('Message'), click('Bold'), click('Insert variable ▾'), click('{{client.name}}'), click('Save template')])
  if (flags.darkMode) add('dark-mode', 'Settings', 'easy', 'Switch to dark mode', '/app/settings/profile', nav('nav.settings'),
    [select('Appearance', 'Dark')])
  if (flags.keyboardShortcuts) add('keyboard-shortcuts', 'Getting started', 'easy', 'See and use the keyboard shortcuts', '/app/', [],
    [{ action: 'press', label: '?' }, click('Close'), { action: 'press', label: 'g then t' }])

  // ---- Billing (Tallyfox's own plan) ----
  add('billing-view-plan', 'Billing', 'easy', 'View your plan', '/app/billing', [],
    [click(c('nav.billing'))])
  add('billing-change-plan', 'Billing', 'medium', 'Change plan', '/app/billing/plans', nav('nav.billing'),
    [click(c('billing.change')), click('Upgrade to Agency'), click('Confirm switch')])

  const counts = { easy: 0, medium: 0, hard: 0 }
  for (const f of flows) counts[f.difficulty]++
  return {
    product: 'Tallyfox', version, auth_mode: auth.mode, base_url: 'https://clevera-ai.github.io/tallyfox-sandbox/', app_path: '/app/',
    demo_account: { email: DEMO.email, password: DEMO.password, code_password_code: DEMO.code, totp_key: 'JBSWY3DPEHPK3PXP' },
    flow_count: flows.length, by_difficulty: counts, unavailable, flows,
  }
}

export function writeManifest() {
  const m = buildManifest()
  writeJson('manifest/flows.json', m)
  return m
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const m = writeManifest()
  console.log(JSON.stringify(m, null, 2))
}
