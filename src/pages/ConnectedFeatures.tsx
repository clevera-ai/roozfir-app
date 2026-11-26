import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { t } from '../lib/copy'
import { integrationsPath, useIsConnected, vendor, type VendorId } from '../lib/integrations'
import { update, useStore } from '../lib/store'
import { addDays, formatDuration, money, shortDate, todayIso, uid } from '../lib/util'
import { invoiceTotals } from '../lib/money'
import { Badge, Button, Card, Checkbox, PageHeader, SelectField, Tabs, Toggle, toast } from '../components/ui'
import { tabs } from './Invoices'
import flags from '../config/flags.json'
import { UpgradeWall } from '../components/Overlays'
import { TOP_PLAN } from '../lib/seed'

/** Shown instead of a feature while its third-party account is not connected. */
function NeedsConnection({ id, what }: { id: VendorId; what: string }) {
  const name = vendor(id).name
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">Connect {name} first</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{what}</p>
      <Link to={integrationsPath()} className="mt-4 inline-flex items-center rounded-ui bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">{t('integrations.open')}</Link>
    </div>
  )
}
function Gate({ id, what, children }: { id: VendorId; what: string; children: ReactNode }) {
  const on = useIsConnected(id)
  return on ? <>{children}</> : <NeedsConnection id={id} what={what} />
}

// ---- Time: import calendar events (Google Calendar) ----
interface CalEvent { id: string; title: string; day: number; start: string; minutes: number }
const EVENTS: CalEvent[] = [
  { id: 'ev1', title: 'Kickoff call: spring campaign', day: -1, start: '09:30', minutes: 60 },
  { id: 'ev2', title: 'Design review with Marcus', day: -1, start: '14:00', minutes: 45 },
  { id: 'ev3', title: 'Weekly sync: website redesign', day: -2, start: '11:00', minutes: 30 },
  { id: 'ev4', title: 'Client workshop: brand refresh', day: -3, start: '13:00', minutes: 120 },
  { id: 'ev5', title: 'Budget check-in', day: -4, start: '16:00', minutes: 30 },
]
export function CalendarImport() {
  return <Gate id="google" what="Roozfir reads your Google Calendar so you can turn meetings into time entries in one click."><CalendarList /></Gate>
}
function CalendarList() {
  const { projects } = useStore()
  const [picked, setPicked] = useState<string[]>([])
  const [project, setProject] = useState(projects[0]?.id ?? '')
  const [done, setDone] = useState<string[]>([])
  const open = EVENTS.filter((e) => !done.includes(e.id))
  const importNow = () => {
    const take = EVENTS.filter((e) => picked.includes(e.id))
    update((s) => { for (const e of take) s.entries.push({ id: uid('e'), projectId: project, date: addDays(todayIso(), e.day), minutes: e.minutes, note: e.title, billable: true, tags: [] }) })
    setDone([...done, ...take.map((e) => e.id)]); setPicked([])
    toast(`Imported ${take.length} calendar event${take.length === 1 ? '' : 's'} as time entries`)
  }
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="font-semibold">Calendar events</h2><p className="text-sm text-muted">Last 7 days from <strong>dana@fernhill.test</strong> (Google Calendar)</p></div>
        <SelectField label="Add to project" value={project} onChange={(e) => setProject(e.target.value)}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectField>
      </div>
      {open.length === 0 ? <p className="py-6 text-center text-sm text-muted">All events imported.</p> : (
        <ul className="divide-y divide-line rounded-xl border border-line text-sm">
          {open.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <Checkbox label={`Select ${e.title}`} hideLabel checked={picked.includes(e.id)} onChange={(x) => setPicked(x.target.checked ? [...picked, e.id] : picked.filter((i) => i !== e.id))} />
              <span className="mr-auto">{e.title}<span className="ml-2 text-xs text-muted">{shortDate(addDays(todayIso(), e.day))}, {e.start}</span></span>
              <span className="text-muted">{formatDuration(e.minutes)}</span>
            </li>))}
        </ul>)}
      <Button variant="primary" className="mt-4" disabled={picked.length === 0} onClick={importNow}>Import selected events</Button>
    </Card>
  )
}

// ---- Settings: Slack notifications ----
export function SlackSettings() {
  return <Gate id="slack" what="Roozfir posts to a Slack channel of your choice when an invoice is paid or a project runs over budget."><SlackForm /></Gate>
}
function SlackForm() {
  const [channel, setChannel] = useState('#agency-ops')
  const [on, setOn] = useState<Record<string, boolean>>({ paid: true, budget: true, timer: false })
  return (
    <Card className="max-w-xl space-y-4">
      <p className="text-sm">Workspace: <strong>Fernhill Creative</strong> <Badge tone="green">Connected</Badge></p>
      <SelectField label="Post notifications to" value={channel} onChange={(e) => setChannel(e.target.value)}>
        {['#agency-ops', '#billing', '#design-team', '#general', '#new-business'].map((c) => <option key={c}>{c}</option>)}
      </SelectField>
      <div className="divide-y divide-line">
        <Toggle label="Invoice paid" hint="Post a message when a customer pays an invoice." checked={on.paid} onChange={(v) => setOn({ ...on, paid: v })} />
        <Toggle label="Project over budget" hint="Post a message when a project passes 90% of its budget." checked={on.budget} onChange={(v) => setOn({ ...on, budget: v })} />
        <Toggle label="Timer left running" hint="Post a reminder when a timer runs for more than 4 hours." checked={on.timer} onChange={(v) => setOn({ ...on, timer: v })} />
      </div>
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => toast(`Slack notifications saved. Posting to ${channel}`)}>Save Slack settings</Button>
        <Button onClick={() => toast(`Test message sent to ${channel}`)}>Send test message</Button>
      </div>
    </Card>
  )
}

// ---- Invoices: sync to Xero ----
export function XeroSync() {
  const { plan } = useStore()
  if (flags.planGates && plan !== TOP_PLAN) return (<><PageHeader title={t('invoices.heading')} /><Tabs items={tabs()} />
    <UpgradeWall feature={t('invoices.xero')} needs={TOP_PLAN} blurb={`You are on the ${plan} plan. Sending invoices to Xero is part of ${TOP_PLAN}.`} /></>)
  return (
    <>
      <PageHeader title={t('invoices.heading')} />
      <Tabs items={tabs()} />
      <Gate id="xero" what="Roozfir sends your invoices to Xero so your books stay up to date without retyping anything."><XeroForm /></Gate>
    </>
  )
}
function XeroForm() {
  const { invoices, clients, currency } = useStore()
  const [account, setAccount] = useState('200 - Sales')
  const [auto, setAuto] = useState(true)
  const [synced, setSynced] = useState<string[]>([invoices[0]?.id ?? ''])
  const name = (id: string) => clients.find((c) => c.id === id)?.name ?? '—'
  return (
    <div className="space-y-6">
      <Card className="max-w-xl space-y-4">
        <p className="text-sm">Organisation: <strong>Fernhill Creative Ltd</strong> <Badge tone="green">Connected</Badge></p>
        <SelectField label="Sales account" value={account} onChange={(e) => setAccount(e.target.value)}>{['200 - Sales', '260 - Other revenue', '270 - Interest income'].map((a) => <option key={a}>{a}</option>)}</SelectField>
        <Toggle label="Sync new invoices automatically" hint="Send each invoice to Xero as soon as you send it to the customer." checked={auto} onChange={setAuto} />
        <Button variant="primary" onClick={() => toast('Xero sync settings saved')}>Save sync settings</Button>
      </Card>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-soft text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Number</th><th className="px-4 py-3">{t('label.client')}</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Xero</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{invoices.map((i) => (
            <tr key={i.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 font-medium">{i.number}</td><td className="px-4 py-3">{name(i.clientId)}</td>
              <td className="px-4 py-3 text-right">{money(invoiceTotals(i.lines, i.taxRate).total, currency)}</td>
              <td className="px-4 py-3">{synced.includes(i.id) ? <Badge tone="green">Synced</Badge> : <Badge>Not synced</Badge>}</td>
              <td className="px-4 py-3 text-right">{!synced.includes(i.id) && <Button size="sm" aria-label={`Sync ${i.number} to Xero`} onClick={() => { setSynced([...synced, i.id]); toast(`${i.number} synced to Xero`) }}>Sync now</Button>}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  )
}
