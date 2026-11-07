import { useState } from 'react'
import flags from '../config/flags.json'
import { t } from '../lib/copy'
import { useStore } from '../lib/store'
import { Button, Card, Empty, PageHeader, SelectField, TextField, toast } from '../components/ui'
import { addDays, download, formatDuration, money, shortDate, todayIso, toCsv } from '../lib/util'

export default function Reports() {
  const { entries, projects, clients, currency } = useStore()
  const [clientId, setClientId] = useState('')
  const [from, setFrom] = useState(addDays(todayIso(), -30))
  const [to, setTo] = useState(todayIso())
  const rows = entries.filter((e) => {
    const p = projects.find((x) => x.id === e.projectId)
    return e.date >= from && e.date <= to && (!clientId || p?.clientId === clientId)
  }).sort((a, b) => a.date.localeCompare(b.date))
  const info = (pid: string) => { const p = projects.find((x) => x.id === pid); return { project: p?.name ?? '—', client: clients.find((c) => c.id === p?.clientId), } }
  const amount = (e: (typeof rows)[number]) => (e.billable ? (e.minutes / 60) * (info(e.projectId).client?.rate ?? 0) : 0)
  const total = rows.reduce((n, e) => n + e.minutes, 0)
  const billable = rows.filter((e) => e.billable).reduce((n, e) => n + e.minutes, 0)
  const exportCsv = () => {
    download('roozfir-report.csv', toCsv([['Date', t('label.client'), 'Project', 'Note', 'Hours', 'Billable', 'Amount'],
      ...rows.map((e) => [e.date, info(e.projectId).client?.name ?? '', info(e.projectId).project, e.note, (e.minutes / 60).toFixed(2), e.billable ? 'Yes' : 'No', amount(e).toFixed(2)])]))
    toast('Report exported')
  }
  return (
    <>
      <PageHeader title={t('reports.heading')} actions={flags.reportsExportCsv ? <Button onClick={exportCsv} disabled={rows.length === 0}>Export CSV</Button> : undefined} />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SelectField label={t('label.client')} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">All {t('clients.heading').toLowerCase()}</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectField>
        <TextField label="From" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        <TextField label="To" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card><p className="text-sm text-muted">Total hours</p><p className="mt-1 text-2xl font-semibold">{formatDuration(total)}</p></Card>
        <Card><p className="text-sm text-muted">Billable hours</p><p className="mt-1 text-2xl font-semibold">{formatDuration(billable)}</p></Card>
        <Card><p className="text-sm text-muted">Billable amount</p><p className="mt-1 text-2xl font-semibold">{money(rows.reduce((n, e) => n + amount(e), 0), currency)}</p></Card>
      </div>
      {rows.length === 0 ? <Empty>No time tracked in this range.</Empty> : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface"><table className="w-full text-sm">
          <thead className="border-b border-line bg-soft text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">{t('label.client')}</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Note</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
          <tbody>{rows.map((e) => <tr key={e.id} className="border-b border-line last:border-0"><td className="px-4 py-2">{shortDate(e.date)}</td><td className="px-4 py-2">{info(e.projectId).client?.name}</td><td className="px-4 py-2">{info(e.projectId).project}</td><td className="px-4 py-2">{e.note}</td><td className="px-4 py-2">{formatDuration(e.minutes)}</td><td className="px-4 py-2 text-right">{e.billable ? money(amount(e), currency) : '—'}</td></tr>)}</tbody></table></div>)}
    </>
  )
}
