import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import flags from '../config/flags.json'
import { t } from '../lib/copy'
import { update, useStore } from '../lib/store'
import { Badge, Button, Card, Checkbox, Empty, Modal, PageHeader, RowActions, SelectField, TextField, toast, cx } from '../components/ui'
import { addDays, dayName, formatDuration, mondayOf, parseDuration, shortDate, todayIso, uid } from '../lib/util'
import type { Entry } from '../lib/seed'

const pad = (n: number) => String(n).padStart(2, '0')
const clock = (ms: number) => { const s = Math.floor(ms / 1000); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` }

function TimerCard() {
  const { timer, projects } = useStore()
  const [now, setNow] = useState(Date.now())
  useEffect(() => { if (!timer.startedAt) return; const i = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(i) }, [timer.startedAt])
  const active = projects.filter((p) => p.stage !== 'done')
  const stop = () => {
    const ms = Date.now() - (timer.startedAt ?? Date.now())
    const minutes = Math.max(1, Math.round(ms / 60000))
    update((s) => {
      s.entries.push({ id: uid('e'), projectId: timer.projectId, date: todayIso(), minutes, note: timer.note.trim() || 'Untitled work', billable: true, tags: [] })
      s.timer = { startedAt: null, projectId: timer.projectId, note: '' }
    })
    toast(`Logged ${formatDuration(minutes)}`)
  }
  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-end gap-3">
        <TextField className="min-w-60 flex-1" label="What are you working on?" value={timer.note} placeholder="Describe the work" onChange={(e) => update((s) => { s.timer.note = e.target.value })} />
        <SelectField label="Project" value={timer.projectId} disabled={!!timer.startedAt} onChange={(e) => update((s) => { s.timer.projectId = e.target.value })}>
          {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </SelectField>
        <p aria-label="Elapsed time" className="w-24 pb-2 text-center font-mono text-xl">{timer.startedAt ? clock(now - timer.startedAt) : '00:00:00'}</p>
        {timer.startedAt ? <Button variant="danger" onClick={stop}>{t('time.stop')}</Button>
          : <Button variant="primary" onClick={() => update((s) => { s.timer.startedAt = Date.now() })}>{t('time.start')}</Button>}
      </div>
    </Card>
  )
}

function EntryDialog({ entry, onClose }: { entry?: Entry; onClose: () => void }) {
  const { projects } = useStore()
  const [projectId, setProjectId] = useState(entry?.projectId ?? projects[0]?.id ?? '')
  const [date, setDate] = useState(entry?.date ?? todayIso())
  const [duration, setDuration] = useState(entry ? formatDuration(entry.minutes) : '')
  const [note, setNote] = useState(entry?.note ?? '')
  const [billable, setBillable] = useState(entry?.billable ?? true)
  const [tags, setTags] = useState((entry?.tags ?? []).join(', '))
  const [error, setError] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const minutes = parseDuration(duration)
    if (!minutes) return setError('Enter a duration such as 1:30, 1.5 or 90m.')
    const tagList = tags.split(',').map((x) => x.trim()).filter(Boolean)
    update((s) => {
      if (entry) Object.assign(s.entries.find((x) => x.id === entry.id)!, { projectId, date, minutes, note: note.trim(), billable, ...(flags.tags ? { tags: tagList } : {}) })
      else s.entries.push({ id: uid('e'), projectId, date, minutes, note: note.trim() || 'Untitled work', billable, tags: flags.tags ? tagList : [] })
    })
    toast(entry ? 'Entry saved' : 'Entry added'); onClose()
  }
  return (
    <Modal title={entry ? 'Edit time entry' : 'Add time entry'} onClose={onClose} onSubmit={submit} footer={<><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">Save entry</Button></>}>
      <SelectField label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectField>
      <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <TextField label="Duration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="1:30" error={error} />
      <TextField label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
      {flags.tags && <TextField label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} hint="Separate tags with commas." />}
      <Checkbox label="Billable" checked={billable} onChange={(e) => setBillable(e.target.checked)} />
    </Modal>
  )
}

function BulkDialog({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const { projects } = useStore()
  const [projectId, setProjectId] = useState('')
  const [billable, setBillable] = useState('')
  const [tag, setTag] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!projectId && !billable && !tag.trim()) return toast('Choose at least one change to apply.')
    update((s) => {
      for (const en of s.entries.filter((x) => ids.includes(x.id))) {
        if (projectId) en.projectId = projectId
        if (billable) en.billable = billable === 'yes'
        if (tag.trim() && !en.tags.includes(tag.trim())) en.tags.push(tag.trim())
      }
    })
    toast(`Updated ${ids.length} ${ids.length === 1 ? 'entry' : 'entries'}`); onClose()
  }
  return (
    <Modal title={`Bulk edit ${ids.length} ${ids.length === 1 ? 'entry' : 'entries'}`} onClose={onClose} onSubmit={submit} footer={<><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">Apply changes</Button></>}>
      <p className="text-sm text-muted">Leave a field on "Keep current" to leave it unchanged.</p>
      <SelectField label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">Keep current</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectField>
      <SelectField label="Billable" value={billable} onChange={(e) => setBillable(e.target.value)}><option value="">Keep current</option><option value="yes">Billable</option><option value="no">Non-billable</option></SelectField>
      {flags.tags && <TextField label="Add tag" value={tag} onChange={(e) => setTag(e.target.value)} />}
    </Modal>
  )
}

function Timesheet() {
  const { entries, projects } = useStore()
  const [week, setWeek] = useState(mondayOf(todayIso()))
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))
  const rows = projects.filter((p) => p.stage !== 'done')
  const base = useMemo(() => {
    const m: Record<string, string> = {}
    for (const p of rows) for (const d of days) { const mins = entries.filter((e) => e.projectId === p.id && e.date === d).reduce((n, e) => n + e.minutes, 0); m[`${p.id}|${d}`] = mins ? String(Math.round((mins / 60) * 100) / 100) : '' }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, week, projects])
  const [cells, setCells] = useState<Record<string, string>>({})
  useEffect(() => setCells({}), [week])
  const val = (k: string) => cells[k] ?? base[k] ?? ''
  const hours = (k: string) => { const n = Number(val(k)); return Number.isFinite(n) && n > 0 ? n : 0 }
  const dirty = Object.keys(cells).some((k) => cells[k] !== (base[k] ?? ''))
  const save = () => {
    update((s) => {
      for (const k of Object.keys(cells)) {
        if (cells[k] === (base[k] ?? '')) continue
        const [pid, d] = k.split('|'); const h = Number(cells[k])
        const old = s.entries.filter((e) => e.projectId === pid && e.date === d)
        s.entries = s.entries.filter((e) => !(e.projectId === pid && e.date === d))
        if (Number.isFinite(h) && h > 0) s.entries.push({ id: uid('e'), projectId: pid, date: d, minutes: Math.round(h * 60), note: old[0]?.note ?? 'Timesheet entry', billable: old[0]?.billable ?? true, tags: old[0]?.tags ?? [] })
      }
    })
    setCells({}); toast('Timesheet saved')
  }
  const total = days.reduce((n, d) => n + rows.reduce((m, p) => m + hours(`${p.id}|${d}`), 0), 0)
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Button size="sm" aria-label="Previous week" onClick={() => setWeek(addDays(week, -7))}>‹</Button>
        <span className="text-sm font-medium">Week of {shortDate(week)}</span>
        <Button size="sm" aria-label="Next week" onClick={() => setWeek(addDays(week, 7))}>›</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-soft text-xs uppercase text-muted"><tr><th className="px-4 py-3 text-left">Project</th>{days.map((d) => <th key={d} className="px-2 py-3 text-center">{dayName(d).slice(0, 3)}<br /><span className="font-normal normal-case">{shortDate(d).split(',')[0]}</span></th>)}<th className="px-4 py-3 text-right">Total</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <th scope="row" className="px-4 py-2 text-left font-medium">{p.name}</th>
                {days.map((d) => { const k = `${p.id}|${d}`; return (
                  <td key={d} className="px-1 py-1.5 text-center"><input aria-label={`${p.name}, ${dayName(d)}`} inputMode="decimal" value={val(k)} onChange={(e) => setCells({ ...cells, [k]: e.target.value })} className="w-14 rounded-ui border border-line bg-surface px-1 py-1.5 text-center" /></td>) })}
                <td className="px-4 py-2 text-right font-medium">{Math.round(days.reduce((n, d) => n + hours(`${p.id}|${d}`), 0) * 100) / 100}h</td>
              </tr>))}
          </tbody>
          <tfoot><tr className="border-t border-line bg-soft font-medium"><td className="px-4 py-2">Total</td>{days.map((d) => <td key={d} className="px-1 py-2 text-center">{Math.round(rows.reduce((m, p) => m + hours(`${p.id}|${d}`), 0) * 100) / 100}</td>)}<td className="px-4 py-2 text-right">{Math.round(total * 100) / 100}h</td></tr></tfoot>
        </table>
      </div>
      <div className="mt-4"><Button variant="primary" disabled={!dirty} onClick={save}>Save timesheet</Button></div>
    </div>
  )
}

export default function Time() {
  const { entries, projects, savedViews } = useStore()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'timesheet' ? 'timesheet' : 'entries'
  const [selected, setSelected] = useState<string[]>([])
  const [dialog, setDialog] = useState<{ entry?: Entry } | null>(null)
  const [bulk, setBulk] = useState(false)
  const [fProject, setFProject] = useState('')
  const [fBillable, setFBillable] = useState('')
  const [fTag, setFTag] = useState('')
  const [saveView, setSaveView] = useState(false)
  const [viewName, setViewName] = useState('')
  const proj = (id: string) => projects.find((p) => p.id === id)?.name ?? '—'
  const allTags = [...new Set(entries.flatMap((e) => e.tags))].sort()
  const rows = [...entries].filter((e) => (!fProject || e.projectId === fProject) && (!fBillable || e.billable === (fBillable === 'yes')) && (!fTag || e.tags.includes(fTag)))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
  const visibleSelected = selected.filter((id) => rows.some((r) => r.id === id))
  const remove = (e: Entry) => { update((s) => { s.entries = s.entries.filter((x) => x.id !== e.id) }); toast('Entry deleted', () => update((s) => { s.entries.push(e) })) }
  return (
    <>
      <PageHeader title={t('time.heading')} actions={tab === 'entries' ? <Button onClick={() => setDialog({})}>Add time entry</Button> : undefined} />
      <TimerCard />
      <div role="tablist" aria-label="Time views" className="mb-4 flex gap-1 border-b border-line">
        {([['entries', 'Entries'], ['timesheet', 'Weekly timesheet']] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setParams(k === 'entries' ? {} : { tab: k })}
            className={cx('-mb-px border-b-2 px-3 py-2 text-sm font-medium', tab === k ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink')}>{label}</button>))}
      </div>
      {tab === 'timesheet' ? <Timesheet /> : (<>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <SelectField label="Filter by project" value={fProject} onChange={(e) => setFProject(e.target.value)}><option value="">All projects</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectField>
          <SelectField label="Filter by billing" value={fBillable} onChange={(e) => setFBillable(e.target.value)}><option value="">Billable and non-billable</option><option value="yes">Billable only</option><option value="no">Non-billable only</option></SelectField>
          {flags.tags && <SelectField label="Filter by tag" value={fTag} onChange={(e) => setFTag(e.target.value)}><option value="">All tags</option>{allTags.map((x) => <option key={x}>{x}</option>)}</SelectField>}
          {flags.savedViews && (<>
            <SelectField label="Saved views" value="" onChange={(e) => { const v = savedViews.find((x) => x.id === e.target.value); if (v) { setFProject(v.project); setFBillable(v.billable); setFTag(v.tag) } }}>
              <option value="">{savedViews.length ? 'Choose a view' : 'No saved views'}</option>{savedViews.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</SelectField>
            <Button onClick={() => setSaveView(true)}>Save view</Button></>)}
        </div>
        {visibleSelected.length > 0 && (
          <div role="region" aria-label="Bulk actions" className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-brand bg-soft px-4 py-2 text-sm">
            <strong>{visibleSelected.length} selected</strong>
            <Button size="sm" variant="primary" onClick={() => setBulk(true)}>Bulk edit</Button>
            <Button size="sm" variant="danger" onClick={() => { const gone = entries.filter((e) => visibleSelected.includes(e.id)); update((s) => { s.entries = s.entries.filter((e) => !visibleSelected.includes(e.id)) }); setSelected([]); toast(`Deleted ${gone.length} entries`, () => update((s) => { s.entries.push(...gone) })) }}>Delete selected</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear selection</Button>
          </div>)}
        {rows.length === 0 ? <Empty>No time entries match.</Empty> : (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-soft text-left text-xs uppercase text-muted"><tr>
                <th className="w-10 px-4 py-3"><Checkbox hideLabel label="Select all entries" checked={rows.length > 0 && visibleSelected.length === rows.length} onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])} /></th>
                <th className="px-4 py-3">Date</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Note</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Billing</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{rows.map((e) => (
                <tr key={e.id} className={cx('group border-b border-line last:border-0 hover:bg-soft', selected.includes(e.id) && 'bg-soft')}>
                  <td className="px-4 py-3"><Checkbox hideLabel label={`Select ${e.note}`} checked={selected.includes(e.id)} onChange={(ev) => setSelected(ev.target.checked ? [...selected, e.id] : selected.filter((x) => x !== e.id))} /></td>
                  <td className="whitespace-nowrap px-4 py-3">{shortDate(e.date)}</td><td className="px-4 py-3">{proj(e.projectId)}</td>
                  <td className="px-4 py-3">{e.note}{flags.tags && e.tags.map((x) => <span key={x} className="ml-2"><Badge>{x}</Badge></span>)}</td>
                  <td className="px-4 py-3">{formatDuration(e.minutes)}</td><td className="px-4 py-3">{e.billable ? <Badge tone="green">Billable</Badge> : <Badge>Non-billable</Badge>}</td>
                  <td className="px-4 py-3"><RowActions><Button size="sm" aria-label={`Edit entry ${e.note}`} onClick={() => setDialog({ entry: e })}>Edit</Button><Button size="sm" variant="ghost" aria-label={`Delete entry ${e.note}`} onClick={() => remove(e)}>Delete</Button></RowActions></td>
                </tr>))}</tbody>
            </table>
          </div>)}
      </>)}
      {dialog && <EntryDialog entry={dialog.entry} onClose={() => setDialog(null)} />}
      {bulk && <BulkDialog ids={visibleSelected} onClose={() => { setBulk(false); setSelected([]) }} />}
      {saveView && (
        <Modal title="Save view" onClose={() => setSaveView(false)} onSubmit={(e) => { e.preventDefault(); if (!viewName.trim()) return; update((s) => { s.savedViews.push({ id: uid('v'), name: viewName.trim(), project: fProject, billable: fBillable, tag: fTag }) }); toast(`Saved view ${viewName.trim()}`); setViewName(''); setSaveView(false) }}
          footer={<><Button onClick={() => setSaveView(false)}>Cancel</Button><Button type="submit" variant="primary">Save</Button></>}>
          <TextField label="View name" value={viewName} onChange={(e) => setViewName(e.target.value)} />
          <p className="text-sm text-muted">Saves the current project, billing and tag filters.</p>
        </Modal>)}
    </>
  )
}
