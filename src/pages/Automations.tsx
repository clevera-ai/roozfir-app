import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { update, useStore } from '../lib/store'
import { Button, Card, Empty, PageHeader, RowActions, SelectField, TextField, Toggle, toast, cx } from '../components/ui'
import { uid } from '../lib/util'
import type { Condition, Group } from '../lib/seed'

const TRIGGERS = ['A time entry is logged', 'A project goes over budget', 'An invoice becomes overdue', 'A client is added']
const FIELDS = ['Client', 'Project', 'Budget used', 'Hours logged', 'Invoice total', 'Days overdue']
const OPS = ['is', 'is not', 'is more than', 'is less than', 'contains']
const ACTIONS = ['Send email', 'Notify in Slack', 'Add a tag', 'Pause the schedule']

export function Automations() {
  const { rules } = useStore()
  return (
    <>
      <PageHeader title="Automations" actions={<Link to="/app/automations/new" className="rounded-ui bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">New rule</Link>} />
      {rules.length === 0 ? <Empty>No rules yet.</Empty> : (
        <ul className="space-y-3">{rules.map((r) => (
          <li key={r.id} className="group"><Card className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-medium">{r.name}</p><p className="text-sm text-muted">When {r.trigger.toLowerCase()}, then {r.actions.map((a) => a.type.toLowerCase()).join(' and ')}.</p></div>
            <div className="flex items-center gap-3">
              <RowActions><Button size="sm" variant="ghost" aria-label={`Delete rule ${r.name}`} onClick={() => { update((s) => { s.rules = s.rules.filter((x) => x.id !== r.id) }); toast(`Deleted ${r.name}`, () => update((s) => { s.rules.push(r) })) }}>Delete</Button></RowActions>
              <Toggle label={`Enable ${r.name}`} checked={r.enabled} onChange={(v) => update((s) => { s.rules.find((x) => x.id === r.id)!.enabled = v })} />
            </div></Card></li>))}</ul>)}
    </>
  )
}

const newCond = (): Condition => ({ kind: 'cond', id: uid('c'), field: FIELDS[0], op: OPS[0], value: '' })
const newGroup = (): Group => ({ kind: 'group', id: uid('g'), match: 'all', items: [newCond()] })

function GroupEditor({ group, depth, onChange, onRemove }: { group: Group; depth: number; onChange: (g: Group) => void; onRemove?: () => void }) {
  const set = (items: Group['items']) => onChange({ ...group, items })
  const label = depth === 0 ? 'Conditions' : `Nested group ${depth}`
  return (
    <div role="group" aria-label={label} className={cx('space-y-3 rounded-xl border border-line p-4', depth > 0 && 'bg-soft')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">Match
          <select aria-label={`${label}: match`} value={group.match} onChange={(e) => onChange({ ...group, match: e.target.value as Group['match'] })} className="rounded-ui border border-line bg-surface px-2 py-1">
            <option value="all">all</option><option value="any">any</option></select> of these:</div>
        {onRemove && <Button size="sm" variant="ghost" aria-label={`Remove ${label.toLowerCase()}`} onClick={onRemove}>Remove group</Button>}
      </div>
      {group.items.map((it, n) => it.kind === 'group'
        ? <GroupEditor key={it.id} group={it} depth={depth + 1} onChange={(g) => set(group.items.map((x) => (x.id === it.id ? g : x)))} onRemove={() => set(group.items.filter((x) => x.id !== it.id))} />
        : (
          <div key={it.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <select aria-label={`${label} condition ${n + 1} field`} value={it.field} onChange={(e) => set(group.items.map((x) => (x.id === it.id ? { ...it, field: e.target.value } : x)))} className="rounded-ui border border-line bg-surface px-2 py-2 text-sm">{FIELDS.map((f) => <option key={f}>{f}</option>)}</select>
            <select aria-label={`${label} condition ${n + 1} operator`} value={it.op} onChange={(e) => set(group.items.map((x) => (x.id === it.id ? { ...it, op: e.target.value } : x)))} className="rounded-ui border border-line bg-surface px-2 py-2 text-sm">{OPS.map((f) => <option key={f}>{f}</option>)}</select>
            <input aria-label={`${label} condition ${n + 1} value`} placeholder="Value" value={it.value} onChange={(e) => set(group.items.map((x) => (x.id === it.id ? { ...it, value: e.target.value } : x)))} className="rounded-ui border border-line bg-surface px-3 py-2 text-sm" />
            <Button size="sm" variant="ghost" aria-label={`Remove ${label.toLowerCase()} condition ${n + 1}`} onClick={() => set(group.items.filter((x) => x.id !== it.id))}>Remove</Button>
          </div>))}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => set([...group.items, newCond()])}>{depth === 0 ? 'Add condition' : `Add condition to nested group ${depth}`}</Button>
        {depth < 2 && <Button size="sm" onClick={() => set([...group.items, newGroup()])}>{depth === 0 ? 'Add group' : `Add group inside nested group ${depth}`}</Button>}
      </div>
    </div>
  )
}

const countConds = (g: Group): number => g.items.reduce((n, i) => n + (i.kind === 'group' ? countConds(i) : 1), 0)

export function RuleBuilder() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState(TRIGGERS[0])
  const [group, setGroup] = useState<Group>({ ...newGroup(), items: [] })
  const [actions, setActions] = useState<{ id: string; type: string; target: string }[]>([{ id: uid('a'), type: ACTIONS[0], target: '' }])
  const [error, setError] = useState('')
  const save = () => {
    if (!name.trim()) return setError('Name the rule.')
    if (actions.some((a) => !a.target.trim())) return setError('Every action needs a recipient or detail.')
    update((s) => { s.rules.push({ id: uid('r'), name: name.trim(), trigger, group, actions, enabled: true }) })
    toast(`Rule "${name.trim()}" saved and switched on`); navigate('/app/automations')
  }
  return (
    <>
      <PageHeader title="New automation rule" actions={<Link to="/app/automations" className="text-sm font-medium text-brand hover:underline">Back to automations</Link>} />
      <div className="max-w-3xl space-y-6">
        <TextField label="Rule name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Warn when a retainer project is over budget" />
        <section aria-label="When"><h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand">When</h2>
          <Card><SelectField label="Trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)}>{TRIGGERS.map((x) => <option key={x}>{x}</option>)}</SelectField></Card></section>
        <section aria-label="If"><h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand">If</h2>
          <GroupEditor group={group} depth={0} onChange={setGroup} />
          <p className="mt-1 text-xs text-muted">{countConds(group) === 0 ? 'No conditions: the rule runs every time.' : `${countConds(group)} condition(s)`}</p></section>
        <section aria-label="Then"><h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand">Then</h2>
          <div className="space-y-2">{actions.map((a, n) => (
            <Card key={a.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <select aria-label={`Action ${n + 1} type`} value={a.type} onChange={(e) => setActions(actions.map((x) => (x.id === a.id ? { ...a, type: e.target.value } : x)))} className="rounded-ui border border-line bg-surface px-2 py-2 text-sm">{ACTIONS.map((x) => <option key={x}>{x}</option>)}</select>
              <input aria-label={`Action ${n + 1} detail`} placeholder="Recipient or detail" value={a.target} onChange={(e) => setActions(actions.map((x) => (x.id === a.id ? { ...a, target: e.target.value } : x)))} className="rounded-ui border border-line bg-surface px-3 py-2 text-sm" />
              <Button size="sm" variant="ghost" aria-label={`Remove action ${n + 1}`} disabled={actions.length === 1} onClick={() => setActions(actions.filter((x) => x.id !== a.id))}>Remove</Button>
            </Card>))}</div>
          <Button className="mt-2" onClick={() => setActions([...actions, { id: uid('a'), type: ACTIONS[0], target: '' }])}>Add action</Button></section>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <Button variant="primary" onClick={save}>Save rule</Button>
      </div>
    </>
  )
}
