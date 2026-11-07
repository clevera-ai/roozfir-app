import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { t } from '../lib/copy'
import { update, useStore } from '../lib/store'
import { Badge, Button, Card, Checkbox, DatePicker, Empty, Modal, PageHeader, RowActions, SelectField, Tabs, TextField, toast } from '../components/ui'
import { addDays, addMonths, formatDuration, money, shortDate, todayIso, uid } from '../lib/util'
import { invoiceTotals, type InvoiceLine } from '../lib/money'
import type { Schedule } from '../lib/seed'

const tabs = () => [{ to: '/app/invoices', label: 'All invoices', end: true }, { to: '/app/invoices/recurring', label: 'Recurring' }]
const tone = { draft: 'gray', sent: 'blue', paid: 'green' } as const

export function Invoices() {
  const { invoices, clients, currency } = useStore()
  const name = (id: string) => clients.find((c) => c.id === id)?.name ?? '—'
  return (
    <>
      <PageHeader title={t('invoices.heading')} actions={<Link to="/app/invoices/new" className="rounded-ui bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">{t('invoices.create')}</Link>} />
      <Tabs items={tabs()} />
      {invoices.length === 0 ? <Empty>No invoices yet.</Empty> : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-soft text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Number</th><th className="px-4 py-3">{t('label.client')}</th><th className="px-4 py-3">Issued</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{[...invoices].reverse().map((i) => (
              <tr key={i.id} className="group border-b border-line last:border-0 hover:bg-soft">
                <td className="px-4 py-3 font-medium">{i.number}</td><td className="px-4 py-3">{name(i.clientId)}</td><td className="px-4 py-3">{shortDate(i.issued)}</td><td className="px-4 py-3">{shortDate(i.due)}</td>
                <td className="px-4 py-3"><Badge tone={tone[i.status]}>{i.status[0].toUpperCase() + i.status.slice(1)}</Badge></td>
                <td className="px-4 py-3 text-right">{money(invoiceTotals(i.lines, i.taxRate).total, currency)}</td>
                <td className="px-4 py-3"><RowActions>
                  {i.status === 'sent' && <Button size="sm" aria-label={`Mark ${i.number} as paid`} onClick={() => { update((s) => { s.invoices.find((x) => x.id === i.id)!.status = 'paid' }); toast(`${i.number} marked as paid`, () => update((s) => { s.invoices.find((x) => x.id === i.id)!.status = 'sent' })) }}>Mark paid</Button>}
                  {i.status === 'draft' && <Button size="sm" variant="ghost" aria-label={`Delete ${i.number}`} onClick={() => { update((s) => { s.invoices = s.invoices.filter((x) => x.id !== i.id) }); toast(`Deleted ${i.number}`, () => update((s) => { s.invoices.push(i) })) }}>Delete</Button>}
                </RowActions></td>
              </tr>))}</tbody>
          </table>
        </div>)}
    </>
  )
}

export function InvoiceEditor() {
  const s = useStore()
  const navigate = useNavigate()
  const [clientId, setClientId] = useState('')
  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [picked, setPicked] = useState<string[]>([])
  const [included, setIncluded] = useState<string[]>([])
  const [taxRate, setTaxRate] = useState(0)
  const [terms, setTerms] = useState(30)
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState('')
  const client = s.clients.find((c) => c.id === clientId)
  const unbilled = useMemo(() => s.entries.filter((e) => e.billable && !e.invoiced && s.projects.find((p) => p.id === e.projectId)?.clientId === clientId && !included.includes(e.id)), [s.entries, s.projects, clientId, included])
  const totals = invoiceTotals(lines, taxRate)
  const number = `${s.workspace.invoicePrefix}-${String(s.invoices.length + 1).padStart(4, '0')}`
  const setLine = (id: string, patch: Partial<InvoiceLine>) => setLines(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const addTime = () => {
    const chosen = unbilled.filter((e) => picked.includes(e.id))
    if (!chosen.length) return setError('Tick the time entries you want to bill first.')
    setLines([...lines, ...chosen.map((e) => ({ id: uid('l'), description: `${s.projects.find((p) => p.id === e.projectId)?.name}: ${e.note}`, qty: Math.round((e.minutes / 60) * 100) / 100, rate: client?.rate ?? s.defaultRate }))])
    setIncluded([...included, ...chosen.map((e) => e.id)]); setPicked([]); setError('')
  }
  const toPreview = () => {
    if (!clientId) return setError(`Choose a ${t('label.client').toLowerCase()} first.`)
    if (!lines.length) return setError('Add at least one line item.')
    if (lines.some((l) => !l.description.trim() || !(l.qty > 0))) return setError('Every line needs a description and a quantity above zero.')
    setError(''); setPreview(true)
  }
  const save = (status: 'draft' | 'sent') => {
    update((st) => {
      st.invoices.push({ id: uid('i'), number, clientId, issued: todayIso(), due: addDays(todayIso(), terms), status, lines, taxRate })
      for (const e of st.entries) if (included.includes(e.id)) e.invoiced = true
    })
    toast(status === 'sent' ? `${number} sent to ${client?.name}` : `Saved ${number} as a draft`)
    navigate('/app/invoices')
  }
  return (
    <>
      <PageHeader title={t('invoices.create')} sub={`Invoice ${number}`} actions={<Link to="/app/invoices" className="text-sm font-medium text-brand hover:underline">Back to invoices</Link>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm"><span className="mb-1 block font-medium">{t('label.client')}</span>
              <select value={clientId} onChange={(e) => { setClientId(e.target.value); setLines([]); setIncluded([]); setPicked([]) }} className="w-full rounded-ui border border-line bg-surface px-3 py-2 text-sm">
                <option value="">Choose…</option>{s.clients.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <SelectField label="Payment terms" value={terms} onChange={(e) => setTerms(Number(e.target.value))}>{[15, 30, 45].map((d) => <option key={d} value={d}>Net {d}</option>)}</SelectField>
          </Card>
          {clientId && (
            <Card>
              <h2 className="mb-2 font-semibold">Unbilled time</h2>
              {unbilled.length === 0 ? <p className="text-sm text-muted">No unbilled time for this {t('label.client').toLowerCase()}.</p> : (<>
                <ul className="divide-y divide-line text-sm">{unbilled.map((e) => (
                  <li key={e.id} className="flex items-center justify-between py-2"><Checkbox label={`Include ${e.note}`} checked={picked.includes(e.id)} onChange={(ev) => setPicked(ev.target.checked ? [...picked, e.id] : picked.filter((x) => x !== e.id))} />
                    <span className="text-muted">{shortDate(e.date)} · {formatDuration(e.minutes)}</span></li>))}</ul>
                <Button className="mt-3" onClick={addTime}>Add selected time</Button></>)}
            </Card>)}
          <Card>
            <h2 className="mb-3 font-semibold">Line items</h2>
            {lines.length === 0 && <p className="mb-3 text-sm text-muted">No line items yet. Add unbilled time above or add a line item.</p>}
            <div className="space-y-2">{lines.map((l, n) => (
              <div key={l.id} className="grid grid-cols-[1fr_5rem_6rem_auto] items-center gap-2">
                <input aria-label={`Line ${n + 1} description`} value={l.description} onChange={(e) => setLine(l.id, { description: e.target.value })} className="rounded-ui border border-line bg-surface px-3 py-2 text-sm" />
                <input aria-label={`Line ${n + 1} quantity`} inputMode="decimal" value={l.qty} onChange={(e) => setLine(l.id, { qty: Number(e.target.value) || 0 })} className="rounded-ui border border-line bg-surface px-2 py-2 text-sm" />
                <input aria-label={`Line ${n + 1} rate`} inputMode="decimal" value={l.rate} onChange={(e) => setLine(l.id, { rate: Number(e.target.value) || 0 })} className="rounded-ui border border-line bg-surface px-2 py-2 text-sm" />
                <Button size="sm" variant="ghost" aria-label={`Remove line ${n + 1}`} onClick={() => setLines(lines.filter((x) => x.id !== l.id))}>Remove</Button>
              </div>))}</div>
            <Button className="mt-3" onClick={() => setLines([...lines, { id: uid('l'), description: '', qty: 1, rate: client?.rate ?? s.defaultRate }])}>Add line item</Button>
          </Card>
        </div>
        <Card className="h-fit space-y-4">
          <SelectField label="Tax rate" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))}>{[0, 5, 8, 10, 20].map((r) => <option key={r} value={r}>{r}%</option>)}</SelectField>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(totals.subtotal, s.currency)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Tax ({taxRate}%)</dt><dd>{money(totals.tax, s.currency)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total</dt><dd>{money(totals.total, s.currency)}</dd></div>
          </dl>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <Button variant="primary" className="w-full" onClick={toPreview}>Preview invoice</Button>
          <Button className="w-full" onClick={() => { if (!clientId || !lines.length) return setError('Choose a client and add a line item first.'); save('draft') }}>Save draft</Button>
        </Card>
      </div>
      {preview && (
        <Modal wide title="Invoice preview" onClose={() => setPreview(false)}
          footer={<><Button onClick={() => setPreview(false)}>Back to edit</Button><Button variant="primary" onClick={() => save('sent')}>{t('invoices.send')}</Button></>}>
          <div className="rounded-xl border border-line p-5 text-sm">
            <div className="flex justify-between"><div><p className="text-lg font-bold">{s.workspace.name}</p><p className="text-muted">Invoice {number}</p></div><div className="text-right"><p>Issued {shortDate(todayIso())}</p><p>Due {shortDate(addDays(todayIso(), terms))}</p></div></div>
            <p className="mt-4 text-muted">Bill to</p><p className="font-medium">{client?.name}</p><p className="text-muted">{client?.email}</p>
            <table className="mt-4 w-full"><thead className="border-b border-line text-left text-xs uppercase text-muted"><tr><th className="py-2">Description</th><th>Qty</th><th>Rate</th><th className="text-right">Amount</th></tr></thead>
              <tbody>{lines.map((l) => <tr key={l.id} className="border-b border-line"><td className="py-2">{l.description}</td><td>{l.qty}</td><td>{money(l.rate, s.currency)}</td><td className="text-right">{money(l.qty * l.rate, s.currency)}</td></tr>)}</tbody></table>
            <p className="mt-3 text-right">Subtotal {money(totals.subtotal, s.currency)} · Tax {money(totals.tax, s.currency)}</p>
            <p className="text-right text-lg font-semibold">Total {money(totals.total, s.currency)}</p>
          </div>
          <p className="text-sm text-muted">Sending emails this invoice to {client?.email || 'the client'} using your Invoice email template.</p>
        </Modal>)}
    </>
  )
}

const EVERY = { weekly: 'Every week', biweekly: 'Every 2 weeks', monthly: 'Every month' } as const
export const nextDates = (start: string, every: Schedule['every'], n: number) =>
  Array.from({ length: n }, (_, i) => (every === 'monthly' ? addMonths(start, i) : addDays(start, i * (every === 'weekly' ? 7 : 14))))

function ScheduleDialog({ onClose }: { onClose: () => void }) {
  const { clients, currency } = useStore()
  const [clientId, setClientId] = useState('')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [every, setEvery] = useState<Schedule['every']>('monthly')
  const [start, setStart] = useState('')
  const [error, setError] = useState('')
  const upcoming = start ? nextDates(start, every, 3) : []
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) return setError(`Choose a ${t('label.client').toLowerCase()}.`)
    if (!title.trim()) return setError('Give the schedule a title.')
    if (!amount.trim() || !(Number(amount) > 0)) return setError('Enter an amount above zero.')
    if (!start) return setError('Pick a start date.')
    update((s) => { s.schedules.push({ id: uid('s'), clientId, title: title.trim(), amount: Number(amount), every, start, active: true }) })
    toast(`Schedule "${title.trim()}" saved`); onClose()
  }
  return (
    <Modal wide title="New recurring invoice" onClose={onClose} onSubmit={submit} footer={<><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">Save schedule</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm"><span className="mb-1 block font-medium">{t('label.client')}</span>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full rounded-ui border border-line bg-surface px-3 py-2 text-sm"><option value="">Choose…</option>{clients.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Monthly retainer" />
        <TextField label={`Amount (${currency})`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <SelectField label="Frequency" value={every} onChange={(e) => setEvery(e.target.value as Schedule['every'])}>{Object.entries(EVERY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</SelectField>
        <DatePicker label="Start date" value={start} onChange={setStart} />
      </div>
      <div aria-label="Next 3 invoices" className="rounded-xl border border-line bg-soft p-4">
        <h3 className="mb-2 text-sm font-semibold">Next 3 invoices</h3>
        {upcoming.length === 0 ? <p className="text-sm text-muted">Pick a start date to preview the schedule.</p> : (
          <ol className="space-y-1 text-sm">{upcoming.map((d, i) => <li key={d} className="flex justify-between"><span>{i + 1}. {shortDate(d)}</span><span className="text-muted">{amount ? money(Number(amount) || 0, currency) : '—'}</span></li>)}</ol>)}
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </Modal>
  )
}

export function Recurring() {
  const { schedules, clients, currency } = useStore()
  const [dialog, setDialog] = useState(false)
  const name = (id: string) => clients.find((c) => c.id === id)?.name ?? '—'
  return (
    <>
      <PageHeader title={t('invoices.heading')} actions={<Button variant="primary" onClick={() => setDialog(true)}>New schedule</Button>} />
      <Tabs items={tabs()} />
      {schedules.length === 0 ? <Empty>No recurring invoices yet.</Empty> : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface"><table className="w-full text-sm">
          <thead className="border-b border-line bg-soft text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">{t('label.client')}</th><th className="px-4 py-3">Repeats</th><th className="px-4 py-3">Next invoice</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{schedules.map((x) => (
            <tr key={x.id} className="group border-b border-line last:border-0 hover:bg-soft">
              <td className="px-4 py-3 font-medium">{x.title} {!x.active && <Badge>Paused</Badge>}</td><td className="px-4 py-3">{name(x.clientId)}</td><td className="px-4 py-3">{EVERY[x.every]}</td><td className="px-4 py-3">{shortDate(x.start)}</td><td className="px-4 py-3 text-right">{money(x.amount, currency)}</td>
              <td className="px-4 py-3"><RowActions>
                <Button size="sm" aria-label={`${x.active ? 'Pause' : 'Resume'} ${x.title}`} onClick={() => update((s) => { s.schedules.find((y) => y.id === x.id)!.active = !x.active })}>{x.active ? 'Pause' : 'Resume'}</Button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${x.title}`} onClick={() => { update((s) => { s.schedules = s.schedules.filter((y) => y.id !== x.id) }); toast(`Deleted ${x.title}`, () => update((s) => { s.schedules.push(x) })) }}>Delete</Button>
              </RowActions></td>
            </tr>))}</tbody></table></div>)}
      {dialog && <ScheduleDialog onClose={() => setDialog(false)} />}
    </>
  )
}
