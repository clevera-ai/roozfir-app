import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { t } from '../lib/copy'
import { Button, Card, PageHeader } from '../components/ui'
import { formatDuration, mondayOf, money, todayIso } from '../lib/util'
import { invoiceTotals } from '../lib/money'

const TOUR = [
  ['Your week at a glance', 'These cards show the hours you tracked this week, what is waiting to be billed, and what clients still owe you.'],
  ['Track time in one click', 'Open Time and press the timer button. Tallyfox keeps counting while you work on something else.'],
  ['Jump anywhere with the search bar', 'Press the search bar at the top, or use the keyboard, to open any page or start common tasks.'],
  ['Turn hours into invoices', 'When the week is done, create an invoice from your unbilled time and send it from the preview.'],
]

export default function Dashboard() {
  const s = useStore()
  const [step, setStep] = useState<number | null>(null)
  const mon = mondayOf(todayIso())
  const week = s.entries.filter((e) => e.date >= mon)
  const rateOf = (pid: string) => s.clients.find((c) => c.id === s.projects.find((p) => p.id === pid)?.clientId)?.rate ?? s.defaultRate
  const unbilled = s.entries.filter((e) => e.billable && !e.invoiced).reduce((n, e) => n + (e.minutes / 60) * rateOf(e.projectId), 0)
  const outstanding = s.invoices.filter((i) => i.status === 'sent').reduce((n, i) => n + invoiceTotals(i.lines, i.taxRate).total, 0)
  const first = s.profile.name.split(' ')[0]
  return (
    <>
      <PageHeader title={`Welcome back, ${first}`} sub={s.workspace.name}
        actions={<Button onClick={() => setStep(0)}>Take the tour</Button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><p className="text-sm text-muted">Hours this week</p><p className="mt-1 text-3xl font-semibold">{formatDuration(week.reduce((n, e) => n + e.minutes, 0))}</p></Card>
        <Card><p className="text-sm text-muted">Unbilled time</p><p className="mt-1 text-3xl font-semibold">{money(unbilled, s.currency)}</p></Card>
        <Card><p className="text-sm text-muted">Outstanding invoices</p><p className="mt-1 text-3xl font-semibold">{money(outstanding, s.currency)}</p></Card>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Set up your workspace</h2>
          <p className="mt-1 text-sm text-muted">{s.workspace.onboarded ? 'Your workspace is set up. You can run the guided setup again at any time.' : 'Answer a few questions and Tallyfox sets up rates, your first project and your team.'}</p>
          <Link to="/app/onboarding" className="mt-4 inline-block rounded-ui bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">{s.workspace.onboarded ? 'Run setup again' : 'Start setup'}</Link>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">Latest time entries</h2>
          <ul className="divide-y divide-line text-sm">
            {[...s.entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((e) => (
              <li key={e.id} className="flex justify-between py-2"><span>{e.note}</span><span className="text-muted">{formatDuration(e.minutes)}</span></li>
            ))}
          </ul>
          <Link to="/app/time" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">Open {t('nav.time')}</Link>
        </Card>
      </div>
      {step !== null && (
        <div role="dialog" aria-label="Dashboard tour" className="fixed bottom-6 left-1/2 z-50 w-[22rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-brand bg-surface p-5 shadow-2xl">
          <p className="text-xs font-semibold uppercase text-brand">Step {step + 1} of {TOUR.length}</p>
          <h2 className="mt-1 font-semibold">{TOUR[step][0]}</h2>
          <p className="mt-1 text-sm text-muted">{TOUR[step][1]}</p>
          <div className="mt-4 flex justify-between">
            <Button size="sm" variant="ghost" onClick={() => setStep(null)}>Skip tour</Button>
            {step < TOUR.length - 1 ? <Button size="sm" variant="primary" onClick={() => setStep(step + 1)}>Next</Button> : <Button size="sm" variant="primary" onClick={() => setStep(null)}>Done</Button>}
          </div>
        </div>
      )}
    </>
  )
}
