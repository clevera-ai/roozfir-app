import { useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import flags from '../config/flags.json'
import { t } from '../lib/copy'
import { update, useStore } from '../lib/store'
import { Badge, Button, Card, Checkbox, Empty, Modal, PageHeader, TextArea, TextField, toast, cx } from '../components/ui'
import { formatDuration, money, shortDate, todayIso, uid, PROJECT_COLORS } from '../lib/util'
import { STAGES, type Stage } from '../lib/seed'

function ProjectDialog({ onClose }: { onClose: () => void }) {
  const { clients, currency } = useStore()
  const active = clients.filter((c) => !c.archived)
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [budget, setBudget] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!name.trim()) er.name = 'Enter a project name.'
    if (!clientId) er.client = `Choose a ${t('label.client').toLowerCase()}.`
    if (budget.trim() && (Number.isNaN(Number(budget)) || Number(budget) < 0)) er.budget = 'Enter a budget as a number.'
    setErrors(er)
    if (Object.keys(er).length) return
    update((s) => { s.projects.push({ id: uid('p'), name: name.trim(), clientId, budget: Number(budget || 0), stage: 'planned', color: PROJECT_COLORS[s.projects.length % PROJECT_COLORS.length], description: description.trim(), expenses: [] }) })
    toast(`Created ${name.trim()}`)
    onClose()
  }
  return (
    <Modal title={t('projects.create')} onClose={onClose} onSubmit={submit}
      footer={<><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">Create project</Button></>}>
      <TextField label="Project name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <label className="block text-sm"><span className="mb-1 block font-medium">{t('label.client')}</span>
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full rounded-ui border border-line bg-surface px-3 py-2 text-sm">
          <option value="">Choose…</option>{active.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        {errors.client && <span role="alert" className="mt-1 block text-xs text-red-600">{errors.client}</span>}</label>
      <TextField label={`Budget (${currency})`} inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} error={errors.budget} hint="Optional. Tallyfox warns you as the budget runs out." />
      {flags.projectDescription && <TextArea label="Project description" value={description} onChange={(e) => setDescription(e.target.value)} />}
    </Modal>
  )
}

function Board() {
  const { projects, clients } = useStore()
  const [held, setHeld] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  const [over, setOver] = useState<Stage | null>(null)
  const move = (id: string, to: Stage, withToast = true) => {
    const p = projects.find((x) => x.id === id)!
    if (p.stage === to) return
    const from = p.stage
    update((s) => { s.projects.find((x) => x.id === id)!.stage = to })
    const label = STAGES.find((x) => x.id === to)!.label
    setAnnounce(`${p.name} moved to ${label}`)
    if (withToast) toast(`Moved ${p.name} to ${label}`, () => update((s) => { s.projects.find((x) => x.id === id)!.stage = from }))
  }
  const keyDown = (e: React.KeyboardEvent, id: string, stage: Stage) => {
    const idx = STAGES.findIndex((x) => x.id === stage)
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (held === id) { setHeld(null); setAnnounce('Dropped') } else { setHeld(id); setAnnounce('Picked up. Use the left and right arrow keys to move, space to drop.') } }
    else if (held === id && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); const n = STAGES[idx + (e.key === 'ArrowRight' ? 1 : -1)]; if (n) move(id, n.id, false) }
    else if (e.key === 'Escape') setHeld(null)
  }
  return (
    <>
      <p className="mb-3 text-sm text-muted">Drag a card to another column. With the keyboard: focus a card, press Space to pick it up, use the left and right arrow keys, then press Space to drop.</p>
      <p className="sr-only" role="status" aria-live="assertive">{announce}</p>
      <div className="grid gap-4 md:grid-cols-4">
        {STAGES.map((st) => (
          <section key={st.id} aria-label={`${st.label} column`}
            onDragOver={(e) => { e.preventDefault(); setOver(st.id) }} onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text/plain'); if (id) move(id, st.id) }}
            className={cx('min-h-48 rounded-xl border bg-soft p-3', over === st.id ? 'border-brand' : 'border-line')}>
            <h2 className="mb-3 flex items-center justify-between text-sm font-semibold">{st.label}<span className="rounded-full bg-surface px-2 text-xs text-muted">{projects.filter((p) => p.stage === st.id).length}</span></h2>
            <ul className="space-y-2">
              {projects.filter((p) => p.stage === st.id).map((p) => (
                <li key={p.id}>
                  <div draggable tabIndex={0} role="button" aria-grabbed={held === p.id} aria-label={`${p.name} card, in ${st.label}`}
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'move' }}
                    onKeyDown={(e) => keyDown(e, p.id, st.id)}
                    className={cx('cursor-grab rounded-lg border bg-surface p-3 text-sm shadow-sm active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-brand', held === p.id ? 'border-brand ring-2 ring-brand' : 'border-line')}>
                    <p className="font-medium"><span aria-hidden className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}</p>
                    <p className="mt-1 text-xs text-muted">{clients.find((c) => c.id === p.clientId)?.name ?? 'No client'}</p>
                    <Link to={`/app/projects/${p.id}`} draggable={false} className="mt-2 inline-block text-xs font-medium text-brand hover:underline" onKeyDown={(e) => e.stopPropagation()}>Open</Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}

export function Projects() {
  const { projects, clients, entries, currency } = useStore()
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'board' ? 'board' : 'list'
  const [dialog, setDialog] = useState(false)
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? '—'
  const spent = (pid: string) => entries.filter((e) => e.projectId === pid).reduce((n, e) => n + (e.minutes / 60) * (clients.find((c) => c.id === projects.find((p) => p.id === pid)?.clientId)?.rate ?? 0), 0)
  return (
    <>
      <PageHeader title={t('projects.heading')} actions={<>
        <div role="group" aria-label="View" className="flex rounded-ui border border-line bg-surface p-0.5">
          {(['list', 'board'] as const).map((v) => (
            <button key={v} aria-pressed={view === v} onClick={() => setParams(v === 'board' ? { view: 'board' } : {})}
              className={cx('rounded-lg px-3 py-1.5 text-sm font-medium', view === v ? 'bg-brand text-white' : 'text-muted hover:text-ink')}>{v === 'list' ? 'List' : 'Board'}</button>))}
        </div>
        <Button variant="primary" onClick={() => setDialog(true)}>{t('projects.create')}</Button></>} />
      {view === 'board' ? <Board /> : projects.length === 0 ? <Empty>No projects yet.</Empty> : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-soft text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Project</th><th className="px-4 py-3">{t('label.client')}</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Budget used</th></tr></thead>
            <tbody>{projects.map((p) => {
              const pct = p.budget ? Math.min(100, Math.round((spent(p.id) / p.budget) * 100)) : 0
              return (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-soft">
                  <td className="px-4 py-3 font-medium"><Link to={`/app/projects/${p.id}`} className="hover:text-brand hover:underline">{p.name}</Link></td>
                  <td className="px-4 py-3">{clientName(p.clientId)}</td>
                  <td className="px-4 py-3"><Badge tone={p.stage === 'done' ? 'green' : p.stage === 'review' ? 'amber' : p.stage === 'active' ? 'blue' : 'gray'}>{STAGES.find((x) => x.id === p.stage)!.label}</Badge></td>
                  <td className="px-4 py-3">{p.budget ? <span>{pct}% of {money(p.budget, currency)}</span> : <span className="text-muted">No budget</span>}</td>
                </tr>)
            })}</tbody>
          </table>
        </div>
      )}
      {dialog && <ProjectDialog onClose={() => setDialog(false)} />}
    </>
  )
}

export function ProjectDetail() {
  const { id } = useParams()
  const { projects, clients, entries, currency } = useStore()
  const p = projects.find((x) => x.id === id)
  const [expDialog, setExpDialog] = useState(false)
  if (!p) return <Empty>That project does not exist. <Link to="/app/projects" className="font-medium text-brand">Back to projects</Link></Empty>
  const client = clients.find((c) => c.id === p.clientId)
  const mine = entries.filter((e) => e.projectId === p.id)
  const mins = mine.reduce((n, e) => n + e.minutes, 0)
  const cost = (mins / 60) * (client?.rate ?? 0)
  const pct = p.budget ? Math.min(100, Math.round((cost / p.budget) * 100)) : 0
  return (
    <>
      <PageHeader title={p.name} sub={client ? `${t('label.client')}: ${client.name}` : undefined}
        actions={<>{flags.expenses && <Button variant="primary" onClick={() => setExpDialog(true)}>Add expense</Button>}<Link to="/app/projects" className="text-sm font-medium text-brand hover:underline">All projects</Link></>} />
      {flags.projectDescription && p.description && <p className="mb-4 max-w-2xl text-sm text-muted">{p.description}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm text-muted">Stage</p><p className="mt-1 text-xl font-semibold">{STAGES.find((x) => x.id === p.stage)!.label}</p></Card>
        <Card><p className="text-sm text-muted">Tracked</p><p className="mt-1 text-xl font-semibold">{formatDuration(mins)}</p></Card>
        <Card><p className="text-sm text-muted">Budget</p><p className="mt-1 text-xl font-semibold">{p.budget ? money(p.budget, currency) : 'None'}</p>
          {p.budget > 0 && <div className="mt-2" role="progressbar" aria-label="Budget used" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-2 rounded-full bg-line"><div className="h-2 rounded-full bg-brand" style={{ width: `${pct}%` }} /></div><p className="mt-1 text-xs text-muted">{pct}% used</p></div>}</Card>
      </div>
      <h2 className="mb-2 mt-8 font-semibold">Time entries</h2>
      {mine.length === 0 ? <Empty>No time tracked yet.</Empty> : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface text-sm">{mine.map((e) => <li key={e.id} className="flex justify-between px-4 py-3"><span>{e.note}<span className="ml-2 text-xs text-muted">{shortDate(e.date)}</span></span><span>{formatDuration(e.minutes)}</span></li>)}</ul>
      )}
      {flags.expenses && (<>
        <h2 className="mb-2 mt-8 font-semibold">Expenses</h2>
        {p.expenses.length === 0 ? <Empty>No expenses yet.</Empty> : (
          <ul aria-label="Expenses" className="divide-y divide-line rounded-xl border border-line bg-surface text-sm">
            {p.expenses.map((x) => <li key={x.id} className="flex justify-between px-4 py-3"><span>{x.description}<span className="ml-2 text-xs text-muted">{shortDate(x.date)}{x.billable ? ' · Billable' : ''}</span></span><span>{money(x.amount, currency)}</span></li>)}
          </ul>)}
        {expDialog && <ExpenseDialog projectId={p.id} onClose={() => setExpDialog(false)} />}
      </>)}
    </>
  )
}

function ExpenseDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayIso())
  const [billable, setBillable] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!description.trim()) er.description = 'Describe the expense.'
    if (!amount.trim() || Number.isNaN(Number(amount)) || Number(amount) <= 0) er.amount = 'Enter an amount greater than zero.'
    setErrors(er); if (Object.keys(er).length) return
    update((s) => { s.projects.find((x) => x.id === projectId)!.expenses.push({ id: uid('x'), description: description.trim(), amount: Number(amount), date, billable }) })
    toast(`Added expense: ${description.trim()}`); onClose()
  }
  return (
    <Modal title="Add expense" onClose={onClose} onSubmit={submit} footer={<><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">Save expense</Button></>}>
      <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} />
      <TextField label="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />
      <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <Checkbox label="Billable to the client" checked={billable} onChange={(e) => setBillable(e.target.checked)} />
    </Modal>
  )
}
