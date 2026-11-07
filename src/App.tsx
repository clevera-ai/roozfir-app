import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import auth from './config/auth.json'
import flags from './config/flags.json'
import { t } from './lib/copy'
import { signOut, useSession, useStore } from './lib/store'
import { Avatar, Button, Modal, cx } from './components/ui'
import { Logo } from './components/Logo'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Onboarding from './pages/Onboarding'
import { Clients, ClientImport } from './pages/Clients'
import { ProjectDetail, Projects } from './pages/Projects'
import Time from './pages/Time'
import { InvoiceEditor, Invoices, Recurring } from './pages/Invoices'
import Reports from './pages/Reports'
import { RuleBuilder, Automations } from './pages/Automations'
import { Permissions, Team } from './pages/Team'
import { SettingsLayout, Profile, Notifications, Currency, Templates } from './pages/Settings'
import { Billing, Plans } from './pages/Billing'

interface NavItem { to: string; label: string }
function navItems() {
  const core: NavItem[] = [{ to: '/', label: t('nav.dashboard') }]
  const clients: NavItem = { to: '/clients', label: t('nav.clients') }
  const rest: NavItem[] = [
    { to: '/projects', label: t('nav.projects') }, { to: '/time', label: t('nav.time') }, { to: '/invoices', label: t('nav.invoices') },
    { to: '/reports', label: t('nav.reports') }, { to: '/automations', label: t('nav.automations') }, { to: '/team', label: t('nav.team') },
    { to: '/billing', label: t('nav.billing') }, { to: '/settings', label: t('nav.settings') },
  ]
  return { core, clients, rest }
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const { core, clients, rest } = flags.brokenDeploy ? ({} as ReturnType<typeof navItems>) : navItems()
  const [contactsOpen, setContactsOpen] = useState(false)
  const link = ({ isActive }: { isActive: boolean }) =>
    cx('block rounded-ui px-3 py-2 text-sm font-medium', isActive ? 'bg-soft text-brand' : 'text-muted hover:bg-soft hover:text-ink')
  const show = (n: NavItem) => <NavLink key={n.to} to={n.to} end={n.to === '/'} className={link} onClick={onNavigate}>{n.label}</NavLink>
  const inContacts = pathname.startsWith('/clients')
  return (
    <nav aria-label="Main" className="space-y-1">
      {core.map(show)}
      {flags.contactsMenu ? (
        <div>
          <button aria-expanded={contactsOpen || inContacts} aria-controls="contacts-menu" onClick={() => setContactsOpen(!(contactsOpen || inContacts))}
            className={cx('flex w-full items-center justify-between rounded-ui px-3 py-2 text-left text-sm font-medium hover:bg-soft', inContacts ? 'text-brand' : 'text-muted hover:text-ink')}>
            {t('nav.contacts')}<span aria-hidden className={cx('text-xs', contactsOpen || inContacts ? "after:content-['▾']" : "after:content-['▸']")} />
          </button>
          {(contactsOpen || inContacts) && <div id="contacts-menu" className="ml-3 mt-1 space-y-1 border-l border-line pl-2">{show(clients)}</div>}
        </div>
      ) : show(clients)}
      {rest.map(show)}
    </nav>
  )
}

function UserMenu() {
  const { profile } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button aria-label="User menu" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-soft focus-visible:outline-2 focus-visible:outline-brand">
        <Avatar text={profile.initials} />
        <span className="hidden text-sm font-medium sm:inline">{profile.name}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-line bg-surface p-1 shadow-xl">
          <div className="px-3 py-2"><p className="text-sm font-medium">{profile.name}</p><p className="text-xs text-muted">{profile.email}</p></div>
          <div className="my-1 border-t border-line" />
          <Link role="menuitem" to="/settings/profile" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-soft">Profile settings</Link>
          <a role="menuitem" href="https://roozfir.online" className="block rounded-lg px-3 py-2 text-sm hover:bg-soft">Back to roozfir.online</a>
          {auth.mode !== 'none' && <button role="menuitem" onClick={signOut} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-soft">Sign out</button>}
        </div>
      )}
    </div>
  )
}

interface Cmd { label: string; hint: string; to: string }
function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const cmds: Cmd[] = useMemo(() => [
    { label: `Go to ${t('nav.dashboard')}`, hint: 'Page', to: '/' },
    { label: `Go to ${t('nav.clients')}`, hint: 'Page', to: '/clients' },
    { label: `Go to ${t('nav.projects')}`, hint: 'Page', to: '/projects' },
    { label: `Go to ${t('nav.time')}`, hint: 'Page', to: '/time' },
    { label: `Go to ${t('nav.invoices')}`, hint: 'Page', to: '/invoices' },
    { label: `Go to ${t('nav.reports')}`, hint: 'Page', to: '/reports' },
    { label: `Go to ${t('nav.automations')}`, hint: 'Page', to: '/automations' },
    { label: `Go to ${t('nav.team')}`, hint: 'Page', to: '/team' },
    { label: `Go to ${t('nav.billing')}`, hint: 'Page', to: '/billing' },
    { label: `Go to ${t('nav.settings')}`, hint: 'Page', to: '/settings' },
    { label: t('invoices.create'), hint: 'Action', to: '/invoices/new' },
    { label: t('clients.import'), hint: 'Action', to: '/clients/import' },
    { label: 'New automation rule', hint: 'Action', to: '/automations/new' },
    { label: 'Weekly timesheet', hint: 'Action', to: '/time?tab=timesheet' },
    { label: 'Team permissions', hint: 'Action', to: '/team/permissions' },
    { label: 'Run the setup wizard', hint: 'Action', to: '/onboarding' },
  ], [])
  const results = cmds.filter((c) => c.label.toLowerCase().includes(q.trim().toLowerCase()))
  const go = (c?: Cmd) => { if (c) { navigate(c.to); onClose() } }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[15vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <input autoFocus aria-label="Search commands" placeholder="Type a command or page name" value={q}
          onChange={(e) => { setQ(e.target.value); setIdx(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)) }
            else if (e.key === 'Enter') go(results[idx])
            else if (e.key === 'Escape') onClose()
          }}
          className="w-full border-b border-line bg-surface px-4 py-3 text-sm outline-none" />
        <ul role="listbox" aria-label="Results" className="max-h-72 overflow-y-auto p-1">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No matches</li>}
          {results.map((c, i) => (
            <li key={c.label} role="option" aria-selected={i === idx}>
              <button onClick={() => go(c)} onMouseEnter={() => setIdx(i)}
                className={cx('flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm', i === idx && 'bg-soft')}>
                <span>{c.label}</span><span className="text-xs text-muted">{c.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const SHORTCUTS: [string, string][] = [
  ['⌘K', 'Open the command palette'], ['?', 'Show keyboard shortcuts'], ['g then t', 'Go to Time'], ['g then i', 'Go to Invoices'], ['g then p', 'Go to Projects'],
]
function Shortcuts({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const navigate = useNavigate()
  useEffect(() => {
    let pending = 0
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (/INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '?') { setOpen(!open); return }
      if (e.key === 'g') { pending = Date.now(); return }
      if (Date.now() - pending < 1200) {
        const dest = ({ t: '/time', i: '/invoices', p: '/projects' } as Record<string, string>)[e.key]
        if (dest) { navigate(dest); pending = 0 }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [navigate, open, setOpen])
  if (!open) return null
  return (
    <Modal title="Keyboard shortcuts" onClose={() => setOpen(false)} footer={<Button onClick={() => setOpen(false)}>Close</Button>}>
      <table className="w-full text-sm"><tbody>
        {SHORTCUTS.map(([k, d]) => (
          <tr key={k} className="border-b border-line last:border-0">
            <td className="py-2 pr-4"><kbd className="rounded border border-line bg-soft px-1.5 py-0.5 font-mono text-xs">{k}</kbd></td>
            <td className="py-2 text-muted">{d}</td>
          </tr>
        ))}
      </tbody></table>
    </Modal>
  )
}

function Layout() {
  const [menu, setMenu] = useState(false)
  const [palette, setPalette] = useState(false)
  const [help, setHelp] = useState(false)
  const { timer } = useStore()
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p) } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  return (
    <div className="min-h-screen md:grid md:grid-cols-[230px_1fr]">
      <aside className="hidden border-r border-line bg-surface p-4 md:flex md:flex-col">
        <div className="mb-6 px-2"><Logo to="/" /></div>
        <NavList />
        {flags.keyboardShortcuts && <p className="mt-auto px-2 text-xs text-muted">Press <kbd className="rounded border border-line px-1">?</kbd> for keyboard shortcuts</p>}
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 md:px-[var(--page-pad)]">
          <button aria-label="Open menu" className="rounded-ui border border-line px-2 py-1 md:hidden" onClick={() => setMenu(true)}>☰</button>
          <button onClick={() => setPalette(true)}
            className="flex w-full max-w-xs items-center justify-between rounded-ui border border-line bg-bg px-3 py-1.5 text-sm text-muted hover:border-brand">
            <span>Search or jump to…</span><kbd className="rounded border border-line px-1 text-xs">⌘K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-3">
            {timer.startedAt && <Link to="/time" className="hidden rounded-full bg-soft px-3 py-1 text-xs font-medium text-brand sm:inline">● Timer running</Link>}
            <UserMenu />
          </div>
        </header>
        <main className="p-4 md:p-[var(--page-pad)]"><Outlet /></main>
      </div>
      {menu && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onMouseDown={(e) => { if (e.target === e.currentTarget) setMenu(false) }}>
          <div className="h-full w-64 bg-surface p-4"><div className="mb-4"><Logo to="/" /></div><NavList onNavigate={() => setMenu(false)} /></div>
        </div>
      )}
      {palette && <Palette onClose={() => setPalette(false)} />}
      {flags.keyboardShortcuts && <Shortcuts open={help} setOpen={setHelp} />}
    </div>
  )
}

class Blank extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}

function AppGate() {
  const session = useSession()
  const { theme } = useStore()
  useEffect(() => { document.documentElement.dataset.theme = flags.darkMode && theme === 'dark' ? 'dark' : 'light' }, [theme])
  useEffect(() => () => { delete document.documentElement.dataset.theme }, [])
  if (auth.mode !== 'none' && !session) return <Login mode={auth.mode as 'password' | 'password_code' | 'password_totp'} />
  return <Layout />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Blank><AppGate /></Blank>}>
        <Route index element={<Dashboard />} />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/import" element={<ClientImport />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="time" element={<Time />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/new" element={<InvoiceEditor />} />
        <Route path="invoices/recurring" element={<Recurring />} />
        <Route path="reports" element={<Reports />} />
        <Route path="automations" element={<Automations />} />
        <Route path="automations/new" element={<RuleBuilder />} />
        <Route path="team" element={<Team />} />
        <Route path="team/permissions" element={<Permissions />} />
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="currency" element={<Currency />} />
          <Route path="templates" element={<Templates />} />
        </Route>
        <Route path="billing" element={<Billing />} />
        <Route path="billing/plans" element={<Plans />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
