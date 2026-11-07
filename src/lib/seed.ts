import { addDays, mondayOf, todayIso } from './util'
import type { InvoiceLine } from './money'

export type Stage = 'planned' | 'active' | 'review' | 'done'
export const STAGES: { id: Stage; label: string }[] = [
  { id: 'planned', label: 'Planned' }, { id: 'active', label: 'In progress' }, { id: 'review', label: 'Review' }, { id: 'done', label: 'Done' },
]
export type Role = 'Admin' | 'Manager' | 'Member' | 'Viewer'
export const ROLES: Role[] = ['Admin', 'Manager', 'Member', 'Viewer']
export const PERMISSIONS = [
  'View all projects', 'Track time', 'Edit others\' time', 'Create invoices', 'Send invoices', 'Manage clients', 'View reports', 'Manage team', 'Manage billing',
] as const
export type PlanName = 'Solo' | 'Studio' | 'Agency'
export const PLANS: { name: PlanName; price: number; seats: string; blurb: string; features: string[] }[] = [
  { name: 'Solo', price: 12, seats: '1 seat', blurb: 'For freelancers.', features: ['Unlimited clients', 'Timer and timesheets', '5 invoices a month'] },
  { name: 'Studio', price: 29, seats: 'Up to 5 seats', blurb: 'For small studios.', features: ['Everything in Solo', 'Unlimited invoices', 'Recurring invoices', 'Automations'] },
  { name: 'Agency', price: 79, seats: 'Up to 25 seats', blurb: 'For growing agencies.', features: ['Everything in Studio', 'Permissions matrix', 'Priority support'] },
]

export interface Client { id: string; name: string; email: string; contact: string; rate: number; archived: boolean }
export interface Expense { id: string; description: string; amount: number; date: string; billable: boolean }
export interface Project { id: string; name: string; clientId: string; budget: number; stage: Stage; color: string; description?: string; expenses: Expense[] }
export interface Entry { id: string; projectId: string; date: string; minutes: number; note: string; billable: boolean; tags: string[]; invoiced?: boolean }
export interface Invoice { id: string; number: string; clientId: string; issued: string; due: string; status: 'draft' | 'sent' | 'paid'; lines: InvoiceLine[]; taxRate: number }
export interface Schedule { id: string; clientId: string; title: string; amount: number; every: 'weekly' | 'biweekly' | 'monthly'; start: string; active: boolean }
export type Condition = { kind: 'cond'; id: string; field: string; op: string; value: string }
export type Group = { kind: 'group'; id: string; match: 'all' | 'any'; items: (Condition | Group)[] }
export interface Rule { id: string; name: string; trigger: string; group: Group; actions: { id: string; type: string; target: string }[]; enabled: boolean }
export interface Member { id: string; name: string; email: string; role: Role; status: 'active' | 'invited' }
export interface SavedView { id: string; name: string; project: string; billable: string; tag: string }

export interface AppState {
  profile: { name: string; email: string; initials: string; title: string; timezone: string }
  theme: 'light' | 'dark'
  currency: string
  defaultRate: number
  notifications: Record<string, boolean>
  workspace: { name: string; type: 'solo' | 'team'; onboarded: boolean; invoicePrefix: string; accent: string }
  plan: PlanName
  clients: Client[]
  projects: Project[]
  entries: Entry[]
  timer: { startedAt: number | null; projectId: string; note: string }
  invoices: Invoice[]
  schedules: Schedule[]
  rules: Rule[]
  members: Member[]
  permissions: Record<Role, Record<string, boolean>>
  templates: Record<string, { name: string; subject: string; body: string }>
  savedViews: SavedView[]
}

export function defaultPermissions(): AppState['permissions'] {
  const on = (list: string[]) => Object.fromEntries(PERMISSIONS.map((p) => [p, list.includes(p)]))
  return {
    Admin: on([...PERMISSIONS]),
    Manager: on(['View all projects', 'Track time', 'Edit others\' time', 'Create invoices', 'Send invoices', 'Manage clients', 'View reports']),
    Member: on(['View all projects', 'Track time']),
    Viewer: on(['View all projects', 'View reports']),
  }
}

export function seed(): AppState {
  const today = todayIso()
  const mon = mondayOf(today)
  const day = (n: number) => addDays(mon, n)
  const clients: Client[] = [
    { id: 'c-northwind', name: 'Northwind Studio', email: 'accounts@northwind.test', contact: 'Priya Raman', rate: 95, archived: false },
    { id: 'c-bluebird', name: 'Bluebird Coffee', email: 'hello@bluebird.test', contact: 'Tom Lindqvist', rate: 80, archived: false },
    { id: 'c-harbor', name: 'Harbor & Pine', email: 'finance@harborpine.test', contact: 'Amelia Cho', rate: 110, archived: false },
    { id: 'c-kestrel', name: 'Kestrel Labs', email: 'ap@kestrel.test', contact: 'Jonas Weber', rate: 120, archived: false },
    { id: 'c-oldmill', name: 'Old Mill Bakery', email: 'office@oldmill.test', contact: 'Rosa Alvarez', rate: 65, archived: true },
  ]
  const projects: Project[] = [
    { id: 'p-website', name: 'Website redesign', clientId: 'c-northwind', budget: 8000, stage: 'active', color: '#ea580c', expenses: [{ id: 'x1', description: 'Stock photography', amount: 120, date: day(0), billable: true }] },
    { id: 'p-brand', name: 'Brand refresh', clientId: 'c-harbor', budget: 12000, stage: 'planned', color: '#9333ea', expenses: [] },
    { id: 'p-app', name: 'Mobile app MVP', clientId: 'c-kestrel', budget: 24000, stage: 'active', color: '#2563eb', expenses: [] },
    { id: 'p-menu', name: 'Menu and packaging', clientId: 'c-bluebird', budget: 3500, stage: 'review', color: '#0d9488', expenses: [] },
    { id: 'p-launch', name: 'Launch campaign', clientId: 'c-harbor', budget: 6000, stage: 'done', color: '#db2777', expenses: [] },
  ]
  const e = (id: string, projectId: string, d: number, minutes: number, note: string, billable = true, tags: string[] = []): Entry => ({ id, projectId, date: day(d), minutes, note, billable, tags })
  const entries: Entry[] = [
    e('e1', 'p-website', 0, 150, 'Homepage wireframes', true, ['design']),
    e('e2', 'p-website', 1, 195, 'Homepage visual design', true, ['design']),
    e('e3', 'p-app', 1, 240, 'Onboarding screens', true, ['design']),
    e('e4', 'p-menu', 2, 90, 'Packaging mockups', true, ['design']),
    e('e5', 'p-app', 2, 120, 'Sprint planning call', false, ['meeting']),
    e('e6', 'p-website', 3, 180, 'Pricing page build', true, ['dev']),
    e('e7', 'p-brand', 3, 75, 'Moodboard review', true, ['meeting']),
    e('e8', 'p-app', 4, 210, 'Login flow build', true, ['dev']),
    e('e9', 'p-menu', 4, 60, 'Client feedback round', true, ['meeting']),
  ]
  const x = (id: string, name: string, email: string, role: Role, status: Member['status'] = 'active'): Member => ({ id, name, email, role, status })
  return {
    profile: { name: 'Dana Whitfield', email: 'demo@tallyfox.test', initials: 'DW', title: 'Studio owner', timezone: 'America/New_York' },
    theme: 'light', currency: 'USD', defaultRate: 90,
    notifications: { weeklySummary: true, invoicePaid: true, timerRunning: false, productNews: false, timesheetReminders: false },
    workspace: { name: 'Fernhill Creative', type: 'team', onboarded: false, invoicePrefix: 'FH', accent: 'Orange' },
    plan: 'Studio', clients, projects, entries,
    timer: { startedAt: null, projectId: 'p-website', note: '' },
    invoices: [
      { id: 'i-1', number: 'FH-0001', clientId: 'c-harbor', issued: addDays(today, -40), due: addDays(today, -10), status: 'paid', taxRate: 8, lines: [{ id: 'l1', description: 'Launch campaign, design hours', qty: 20, rate: 110 }] },
      { id: 'i-2', number: 'FH-0002', clientId: 'c-northwind', issued: addDays(today, -12), due: addDays(today, 18), status: 'sent', taxRate: 8, lines: [{ id: 'l1', description: 'Website redesign, discovery', qty: 12, rate: 95 }] },
      { id: 'i-3', number: 'FH-0003', clientId: 'c-bluebird', issued: addDays(today, -2), due: addDays(today, 28), status: 'draft', taxRate: 0, lines: [{ id: 'l1', description: 'Menu design', qty: 6, rate: 80 }] },
    ],
    schedules: [{ id: 's-1', clientId: 'c-kestrel', title: 'Monthly retainer', amount: 2400, every: 'monthly', start: addDays(today, 9), active: true }],
    rules: [{
      id: 'r-1', name: 'Warn when a project is over budget', trigger: 'A project goes over budget', enabled: true,
      group: { kind: 'group', id: 'g0', match: 'all', items: [{ kind: 'cond', id: 'c0', field: 'Budget used', op: 'is more than', value: '90%' }] },
      actions: [{ id: 'a0', type: 'Send email', target: 'Project manager' }],
    }],
    members: [
      x('m-1', 'Dana Whitfield', 'demo@tallyfox.test', 'Admin'), x('m-2', 'Marcus Bell', 'marcus@fernhill.test', 'Manager'),
      x('m-3', 'Lena Okafor', 'lena@fernhill.test', 'Member'), x('m-4', 'Sam Ortiz', 'sam@fernhill.test', 'Member', 'invited'),
    ],
    permissions: defaultPermissions(),
    templates: {
      invoice: { name: 'Invoice email', subject: 'Invoice {{invoice.number}} from {{workspace.name}}', body: '<p>Hi {{client.contact}},</p><p>Your invoice <b>{{invoice.number}}</b> for <b>{{invoice.total}}</b> is ready. It is due on {{invoice.due_date}}.</p><p>Thanks,<br>{{sender.name}}</p>' },
      reminder: { name: 'Payment reminder', subject: 'Reminder: invoice {{invoice.number}} is due', body: '<p>Hi {{client.contact}},</p><p>A friendly reminder that invoice {{invoice.number}} ({{invoice.total}}) is due on {{invoice.due_date}}.</p><p>{{sender.name}}</p>' },
      timesheet: { name: 'Timesheet request', subject: 'Please submit your timesheet', body: '<p>Hi {{client.contact}},</p><p>Could you submit your timesheet for this week?</p><p>{{sender.name}}</p>' },
    },
    savedViews: [],
  }
}
