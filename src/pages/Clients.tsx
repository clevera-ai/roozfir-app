import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { t } from '../lib/copy'
import { update, useStore } from '../lib/store'
import { Badge, Button, Checkbox, Empty, Modal, PageHeader, RowActions, TextField, toast, cx } from '../components/ui'
import { EMAIL_RE, money, parseCsv, uid } from '../lib/util'
import type { Client } from '../lib/seed'

function ClientDialog({ client, onClose }: { client?: Client; onClose: () => void }) {
  const { currency } = useStore()
  const [name, setName] = useState(client?.name ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [contact, setContact] = useState(client?.contact ?? '')
  const [rate, setRate] = useState(client ? String(client.rate) : '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!name.trim()) er.name = 'Enter a name.'
    if (email.trim() && !EMAIL_RE.test(email.trim())) er.email = 'Enter a valid email address.'
    if (rate.trim() && Number.isNaN(Number(rate))) er.rate = 'Enter a number.'
    setErrors(er)
    if (Object.keys(er).length) return
    update((s) => {
      if (client) Object.assign(s.clients.find((c) => c.id === client.id)!, { name: name.trim(), email: email.trim(), contact: contact.trim(), rate: Number(rate || 0) })
      else s.clients.push({ id: uid('c'), name: name.trim(), email: email.trim(), contact: contact.trim(), rate: Number(rate || 0), archived: false })
    })
    toast(client ? `Saved ${name.trim()}` : `Added ${name.trim()}`)
    onClose()
  }
  return (
    <Modal title={client ? `Edit ${t('label.client').toLowerCase()}` : t('clients.add')} onClose={onClose} onSubmit={submit}
      footer={<><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">Save {t('label.client').toLowerCase()}</Button></>}>
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
      <TextField label="Contact person" value={contact} onChange={(e) => setContact(e.target.value)} />
      <TextField label={`Hourly rate (${currency})`} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} error={errors.rate} />
    </Modal>
  )
}

export function Clients() {
  const { clients, projects, currency } = useStore()
  const [q, setQ] = useState('')
  const [archived, setArchived] = useState(false)
  const [dialog, setDialog] = useState<{ client?: Client } | null>(null)
  const rows = clients.filter((c) => c.archived === archived && c.name.toLowerCase().includes(q.toLowerCase()))
  const setArchivedFlag = (c: Client, v: boolean) => update((s) => { s.clients.find((x) => x.id === c.id)!.archived = v })
  return (
    <>
      <PageHeader title={t('clients.heading')}
        actions={<><Link to="/clients/import" className="rounded-ui border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-soft">{t('clients.import')}</Link>
          <Button variant="primary" onClick={() => setDialog({})}>{t('clients.add')}</Button></>} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input aria-label={`Search ${t('clients.heading').toLowerCase()}`} placeholder={`Search ${t('clients.heading').toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-xs rounded-ui border border-line bg-surface px-3 py-2 text-sm" />
        <Checkbox label="Show archived" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
      </div>
      {rows.length === 0 ? <Empty>{archived ? 'No archived clients.' : 'No clients match.'}</Empty> : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-soft text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Projects</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="group border-b border-line last:border-0 hover:bg-soft">
                  <td className="px-4 py-3"><p className="font-medium">{c.name}</p><p className="text-xs text-muted">{c.email || 'No email'}</p></td>
                  <td className="px-4 py-3">{c.contact || '—'}</td>
                  <td className="px-4 py-3">{projects.filter((p) => p.clientId === c.id).length}</td>
                  <td className="px-4 py-3">{c.rate ? `${money(c.rate, currency)}/h` : '—'}</td>
                  <td className="px-4 py-3">
                    <RowActions>
                      {c.archived ? <Button size="sm" aria-label={`Restore ${c.name}`} onClick={() => { setArchivedFlag(c, false); toast(`Restored ${c.name}`) }}>Restore</Button> : (<>
                        <Button size="sm" aria-label={`Edit ${c.name}`} onClick={() => setDialog({ client: c })}>Edit</Button>
                        <Button size="sm" variant="ghost" aria-label={`Archive ${c.name}`} onClick={() => { setArchivedFlag(c, true); toast(`Archived ${c.name}`, () => setArchivedFlag(c, false)) }}>Archive</Button></>)}
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog && <ClientDialog client={dialog.client} onClose={() => setDialog(null)} />}
    </>
  )
}

// ---- CSV import: paste/upload -> map columns -> review row errors -> import ----
const TARGETS = ['Ignore', 'Name', 'Email', 'Contact', 'Hourly rate'] as const
type Target = (typeof TARGETS)[number]
const SAMPLE_URL = `/sample-clients.csv`

export function ClientImport() {
  const { clients } = useStore()
  const [step, setStep] = useState<'upload' | 'map' | 'review' | 'done'>('upload')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [mapping, setMapping] = useState<Record<number, Target>>({})
  const [skipBad, setSkipBad] = useState(true)
  const [imported, setImported] = useState(0)
  const table = useMemo(() => parseCsv(text), [text])
  const header = table[0] ?? []

  const loadSample = async () => {
    try { setText(await (await fetch(SAMPLE_URL)).text()); setError('') } catch { setError('Could not load the sample file.') }
  }
  const toMapping = () => {
    if (table.length < 2) return setError('Add a CSV with a header row and at least one data row.')
    const guess: Record<number, Target> = {}
    header.forEach((h, i) => { const m = TARGETS.find((t2) => t2 !== 'Ignore' && t2.toLowerCase() === h.trim().toLowerCase()); guess[i] = m ?? 'Ignore' })
    setMapping(guess); setError(''); setStep('map')
  }
  const col = (t2: Target) => Number(Object.keys(mapping).find((k) => mapping[Number(k)] === t2) ?? -1)
  const toReview = () => {
    if (col('Name') < 0) return setError('Map one column to Name. Every client needs a name.')
    const dup = (['Name', 'Email', 'Contact', 'Hourly rate'] as Target[]).find((t2) => Object.values(mapping).filter((v) => v === t2).length > 1)
    if (dup) return setError(`More than one column is mapped to ${dup}.`)
    setError(''); setStep('review')
  }
  const rows = useMemo(() => table.slice(1).map((r, n) => {
    const get = (t2: Target) => (col(t2) >= 0 ? (r[col(t2)] ?? '').trim() : '')
    const name = get('Name'), email = get('Email'), rate = get('Hourly rate')
    const problems: string[] = []
    if (!name) problems.push('Name is missing')
    else if (clients.some((c) => c.name.toLowerCase() === name.toLowerCase())) problems.push('Already exists')
    if (email && !EMAIL_RE.test(email)) problems.push('Email looks wrong')
    if (rate && Number.isNaN(Number(rate))) problems.push('Rate is not a number')
    return { line: n + 2, name, email, contact: get('Contact'), rate, problems }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [table, mapping, clients])
  const good = rows.filter((r) => r.problems.length === 0)
  const bad = rows.filter((r) => r.problems.length > 0)
  const doImport = () => {
    const take = skipBad ? good : rows.filter((r) => r.name)
    update((s) => { for (const r of take) s.clients.push({ id: uid('c'), name: r.name, email: r.email, contact: r.contact, rate: Number(r.rate) || 0, archived: false }) })
    setImported(take.length); setStep('done'); toast(`Imported ${take.length} ${take.length === 1 ? 'client' : 'clients'}`)
  }
  const stepNo = { upload: 1, map: 2, review: 3, done: 3 }[step]

  return (
    <>
      <PageHeader title={t('clients.import')} sub={`Step ${stepNo} of 3`} actions={<Link to="/clients" className="text-sm font-medium text-brand hover:underline">Back to {t('clients.heading').toLowerCase()}</Link>} />
      {step === 'upload' && (
        <div className="max-w-2xl space-y-4">
          <p className="text-sm text-muted">Upload a CSV file or paste its contents. The first row must be the column names.</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium">Choose CSV file
              <input type="file" accept=".csv,text/csv" className="ml-3 text-sm" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setText(await f.text()); setError('') } }} />
            </label>
          </div>
          <label className="block text-sm"><span className="mb-1 block font-medium">CSV text</span>
            <textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder="Company name,Contact email,..." className="w-full rounded-ui border border-line bg-surface px-3 py-2 font-mono text-xs" /></label>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={loadSample}>Use sample data</Button>
            <a href={SAMPLE_URL} download="roozfir-sample-clients.csv" className="text-sm font-medium text-brand hover:underline">Download sample CSV</a>
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <Button variant="primary" onClick={toMapping}>Continue to mapping</Button>
        </div>
      )}
      {step === 'map' && (
        <div className="max-w-3xl space-y-4">
          <p className="text-sm text-muted">Tell Roozfir what each column holds. Columns set to Ignore are skipped.</p>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-soft text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Column in your file</th><th className="px-4 py-3">First rows</th><th className="px-4 py-3">Maps to</th></tr></thead>
              <tbody>{header.map((h, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{h}</td>
                  <td className="px-4 py-3 text-muted">{table.slice(1, 3).map((r) => r[i]).filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-3"><select aria-label={`Map column ${h}`} value={mapping[i]} onChange={(e) => setMapping({ ...mapping, [i]: e.target.value as Target })} className="rounded-ui border border-line bg-surface px-2 py-1.5">
                    {TARGETS.map((x) => <option key={x}>{x}</option>)}</select></td>
                </tr>))}</tbody>
            </table>
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2"><Button onClick={() => setStep('upload')}>Back</Button><Button variant="primary" onClick={toReview}>Review rows</Button></div>
        </div>
      )}
      {step === 'review' && (
        <div className="space-y-4">
          <p className="text-sm"><strong>{good.length}</strong> rows are ready to import. <strong className={cx(bad.length > 0 && 'text-red-600')}>{bad.length}</strong> rows have problems.</p>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-soft text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Row</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3">Status</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.line} className={cx('border-b border-line last:border-0', r.problems.length > 0 && 'bg-red-50 dark:bg-red-950')}>
                  <td className="px-4 py-2 text-muted">{r.line}</td><td className="px-4 py-2">{r.name || '—'}</td><td className="px-4 py-2">{r.email || '—'}</td><td className="px-4 py-2">{r.contact || '—'}</td><td className="px-4 py-2">{r.rate || '—'}</td>
                  <td className="px-4 py-2">{r.problems.length ? <span role="alert" className="text-red-600">{r.problems.join('; ')}</span> : <Badge tone="green">Ready</Badge>}</td>
                </tr>))}</tbody>
            </table>
          </div>
          {bad.length > 0 && <Checkbox label="Skip rows with problems" checked={skipBad} onChange={(e) => setSkipBad(e.target.checked)} />}
          <div className="flex gap-2"><Button onClick={() => setStep('map')}>Back</Button>
            <Button variant="primary" disabled={(skipBad ? good : rows.filter((r) => r.name)).length === 0} onClick={doImport}>Import valid rows</Button></div>
        </div>
      )}
      {step === 'done' && (
        <div className="max-w-lg space-y-4"><p className="text-lg font-medium">Imported {imported} {imported === 1 ? 'client' : 'clients'}.</p>
          <Link to="/clients" className="inline-block rounded-ui bg-brand px-4 py-2 text-sm font-medium text-white">View {t('clients.heading').toLowerCase()}</Link></div>
      )}
    </>
  )
}
