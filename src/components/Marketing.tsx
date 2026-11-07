import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import changelogSource from '../../CHANGELOG.md?raw'
import { PLANS } from '../lib/seed'
import { cx } from './ui'

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 text-lg font-bold">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white" aria-hidden>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 18V7l7 5 7-5v11" /></svg>
      </span>
      Tallyfox
    </Link>
  )
}

export function MarketingLayout() {
  const { pathname, hash } = useLocation()
  useEffect(() => { if (!hash) window.scrollTo(0, 0) }, [pathname, hash])
  const link = ({ isActive }: { isActive: boolean }) => cx('text-sm font-medium hover:text-ink', isActive ? 'text-ink' : 'text-muted')
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Logo />
          <nav aria-label="Site" className="flex items-center gap-5">
            <Link to={{ pathname: '/', hash: '#features' }} className="hidden text-sm font-medium text-muted hover:text-ink sm:inline">Features</Link>
            <NavLink to="/pricing" className={link}>Pricing</NavLink>
            <NavLink to="/changelog" className={link}>Changelog</NavLink>
            <Link to="/app" className="rounded-ui bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Open the app</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Tallyfox is a fictional demo product made for testing.</p>
          <nav aria-label="Footer" className="flex gap-4">
            <Link to="/pricing" className="hover:text-ink">Pricing</Link>
            <Link to="/changelog" className="hover:text-ink">Changelog</Link>
            <Link to="/app" className="hover:text-ink">Open the app</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

const FEATURES = [
  ['Timer and timesheets', 'Start a timer in one click, fix entries later, and fill in your week on a timesheet grid.'],
  ['Invoices from tracked time', 'Pull unbilled hours into an invoice, add line items and tax, preview, and send.'],
  ['Recurring invoices', 'Schedule retainers weekly or monthly and see the next three invoices before you save.'],
  ['Project stage board', 'Drag projects from planned to done, or move them with the keyboard.'],
  ['Automation rules', 'When a project goes over budget, if the client is on retainer, then email the project manager.'],
  ['Team and permissions', 'Invite teammates and decide per role who can edit time, send invoices or manage billing.'],
]

export function Home() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
        <p className="mb-4 inline-block rounded-full bg-soft px-3 py-1 text-xs font-semibold text-brand">Time tracking and invoicing for small agencies</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">Track every hour. Bill every client.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">Tallyfox turns the time your team tracks into invoices your clients pay, without the spreadsheet in the middle.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/app" className="rounded-ui bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-hover">Open the app</Link>
          <Link to="/pricing" className="rounded-ui border border-line bg-surface px-6 py-3 font-semibold hover:bg-soft">See pricing</Link>
        </div>
      </section>
      <section id="features" className="mx-auto max-w-6xl scroll-mt-8 px-4 pb-20">
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">Everything a small agency needs</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-muted">Plans start at ${PLANS[0].price} a month. <Link to="/pricing" className="font-medium text-brand hover:underline">See pricing</Link></p>
      </section>
    </>
  )
}

export function Pricing() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-center text-4xl font-bold tracking-tight">Simple pricing</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted">Pick the plan that fits your team. Change it any time from Billing in the app.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <div key={p.name} className={cx('flex flex-col rounded-2xl border bg-surface p-6', p.name === 'Studio' ? 'border-brand shadow-lg' : 'border-line')}>
            <h2 className="text-lg font-semibold">{p.name}</h2>
            <p className="text-sm text-muted">{p.blurb}</p>
            <p className="my-4"><span className="text-4xl font-bold">${p.price}</span><span className="text-muted"> / month</span></p>
            <p className="mb-3 text-sm font-medium">{p.seats}</p>
            <ul className="mb-6 flex-1 space-y-2 text-sm text-muted">{p.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
            <Link to="/app" className="rounded-ui bg-brand px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-hover">Get started with {p.name}</Link>
          </div>
        ))}
      </div>
    </section>
  )
}

interface Entry { heading: string; date: string; title: string; bullets: string[] }
export function parseChangelog(src: string): Entry[] {
  return src.split(/\n(?=## )/).filter((b) => b.startsWith('## ')).map((block) => {
    const [head, ...rest] = block.split('\n')
    const [heading, date = ''] = head.replace(/^## /, '').split(' - ')
    const lines = rest.map((l) => l.trim()).filter(Boolean)
    return { heading, date, title: lines.find((l) => !l.startsWith('- ')) ?? '', bullets: lines.filter((l) => l.startsWith('- ')).map((l) => l.slice(2)) }
  })
}

export function Changelog() {
  const entries = parseChangelog(changelogSource)
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Changelog</h1>
      <p className="mt-3 text-muted">What is new in Tallyfox, newest first.</p>
      <div className="mt-10 space-y-10">
        {entries.map((e) => (
          <article key={e.heading + e.date} className="border-l-2 border-brand pl-6">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-xl font-semibold">{e.title || e.heading}</h2>
              <span className="rounded-full bg-soft px-2 py-0.5 text-xs font-semibold text-brand">{e.heading}</span>
              <time className="text-sm text-muted">{e.date}</time>
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">{e.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
          </article>
        ))}
      </div>
    </section>
  )
}
