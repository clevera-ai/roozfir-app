import { useEffect, useState, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { t } from '../lib/copy'
import { useStore } from '../lib/store'
import { Button, Card, PageHeader, SelectField, TextField, toast, cx } from '../components/ui'
import { formatDuration, money, mondayOf, todayIso, addDays } from '../lib/util'
import { STAGES } from '../lib/seed'

type Kind = 'timesheet' | 'badge' | 'booking'
const KINDS: { id: Kind; label: string; hint: string }[] = [
  { id: 'timesheet', label: 'Public timesheet', hint: 'A read-only weekly summary of the hours you track.' },
  { id: 'badge', label: 'Project status badge', hint: 'Shows a project\'s stage and how much of its budget is used.' },
  { id: 'booking', label: 'Booking button', hint: 'A button that lets visitors ask to book a call with you.' },
]
const SIZES = { small: { w: 320, h: 180 }, medium: { w: 480, h: 260 }, large: { w: 640, h: 340 } } as const
type Size = keyof typeof SIZES
const ORIGIN = 'https://app.roozfir.online'

interface Opts { kind: Kind; theme: 'light' | 'dark'; size: Size; project: string; label: string }

export function EmbedWidget({ kind, theme, size, project, label }: Opts) {
  const { entries, projects, clients, currency } = useStore()
  const dark = theme === 'dark'
  const box = cx('rounded-xl border p-4 text-sm', dark ? 'border-[#332d28] bg-[#1e1a17] text-[#f3eee8]' : 'border-[#e8e2d9] bg-white text-[#1c1917]')
  const sub = dark ? 'text-[#a39a90]' : 'text-[#6b645c]'
  const dim = SIZES[size]
  let body: ReactNode
  if (kind === 'timesheet') {
    const monday = mondayOf(todayIso())
    const days = Array.from({ length: 5 }, (_, i) => addDays(monday, i))
    const mins = days.map((d) => entries.filter((e) => e.date === d).reduce((n, e) => n + e.minutes, 0))
    const max = Math.max(60, ...mins)
    body = (<>
      <p className="font-semibold">This week at Fernhill Creative</p>
      <p className={sub}>{formatDuration(mins.reduce((a, b) => a + b, 0))} tracked</p>
      <div className="mt-3 flex items-end gap-2" style={{ height: dim.h - 110 }}>
        {mins.map((m, i) => <div key={days[i]} className="flex flex-1 flex-col items-center justify-end gap-1" style={{ height: '100%' }}><div className="w-full rounded bg-[var(--c-brand)]" style={{ height: `${Math.max(4, (m / max) * 100)}%` }} /><span className={cx('text-xs', sub)}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i]}</span></div>)}
      </div>
    </>)
  } else if (kind === 'badge') {
    const p = projects.find((x) => x.id === project) ?? projects[0]
    const rate = clients.find((c) => c.id === p?.clientId)?.rate ?? 0
    const cost = entries.filter((e) => e.projectId === p?.id).reduce((n, e) => n + (e.minutes / 60) * rate, 0)
    const pct = p?.budget ? Math.min(100, Math.round((cost / p.budget) * 100)) : 0
    body = p ? (<>
      <p className={cx('text-xs uppercase', sub)}>Project status</p>
      <p className="mt-1 text-lg font-semibold">{p.name}</p>
      <p className="mt-1">Stage: <strong>{STAGES.find((s) => s.id === p.stage)!.label}</strong></p>
      <p className={cx('mt-3 text-xs', sub)}>{p.budget ? `${pct}% of ${money(p.budget, currency)} used` : 'No budget set'}</p>
      <div className="mt-1 h-2 rounded-full bg-black/10"><div className="h-2 rounded-full bg-[var(--c-brand)]" style={{ width: `${pct}%` }} /></div>
    </>) : <p>No projects yet.</p>
  } else {
    body = (<div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className={sub}>Want to talk about a project?</p>
      <span className="inline-block rounded-ui bg-[var(--c-brand)] px-5 py-2.5 font-medium text-white">{label || 'Book a call'}</span>
    </div>)
  }
  return <div className={box} style={{ width: dim.w, maxWidth: '100%', height: kind === 'booking' ? Math.min(dim.h, 160) : dim.h }}>{body}</div>
}

/** Standalone page the generated iframe points at: /embed/<kind>?theme=&size=&project=&label= */
export function EmbedFrame() {
  const { kind } = useParams()
  const [q] = useSearchParams()
  const k = (['timesheet', 'badge', 'booking'].includes(kind ?? '') ? kind : 'timesheet') as Kind
  return <div className="p-2"><EmbedWidget kind={k} theme={q.get('theme') === 'dark' ? 'dark' : 'light'} size={(q.get('size') as Size) in SIZES ? (q.get('size') as Size) : 'medium'} project={q.get('project') ?? ''} label={q.get('label') ?? ''} /></div>
}

export function Embeds() {
  const { projects } = useStore()
  const [params] = useSearchParams()
  const [kind, setKind] = useState<Kind>(params.get('project') ? 'badge' : 'timesheet')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [size, setSize] = useState<Size>('medium')
  const [project, setProject] = useState(params.get('project') ?? projects[0]?.id ?? '')
  const [label, setLabel] = useState('Book a call')
  useEffect(() => { if (!project && projects[0]) setProject(projects[0].id) }, [projects, project])
  const dim = SIZES[size]
  const qs = new URLSearchParams({ theme, size, ...(kind === 'badge' ? { project } : {}), ...(kind === 'booking' ? { label } : {}) }).toString()
  const code = kind === 'booking'
    ? `<a href="${ORIGIN}/embed/booking?${qs}" target="_blank" rel="noopener" style="display:inline-block;padding:10px 20px;border-radius:8px;background:#ea580c;color:#fff;font:500 14px sans-serif;text-decoration:none">${label || 'Book a call'}</a>`
    : `<iframe src="${ORIGIN}/embed/${kind}?${qs}" width="${dim.w}" height="${dim.h}" style="border:0" title="Roozfir ${kind}" loading="lazy"></iframe>`
  const copy = async () => {
    try { await navigator.clipboard.writeText(code) } catch {
      const ta = document.createElement('textarea'); ta.value = code; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    toast('Embed code copied')
  }
  return (
    <>
      <PageHeader title={t('embeds.heading')} sub="Show your Roozfir data on your own website. Pick what to embed, set the options, then paste the code into your site." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Card className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">What do you want to embed?</legend>
            <div className="space-y-2">
              {KINDS.map((k) => (
                <label key={k.id} className={cx('flex cursor-pointer items-start gap-3 rounded-ui border p-3 text-sm', kind === k.id ? 'border-brand bg-soft' : 'border-line')}>
                  <input type="radio" name="embed-kind" className="mt-1 accent-[var(--c-brand)]" checked={kind === k.id} onChange={() => setKind(k.id)} />
                  <span><span className="block font-medium">{k.label}</span><span className="text-xs text-muted">{k.hint}</span></span>
                </label>))}
            </div>
          </fieldset>
          {kind === 'badge' && <SelectField label="Project" value={project} onChange={(e) => setProject(e.target.value)}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectField>}
          {kind === 'booking' && <TextField label="Button text" value={label} onChange={(e) => setLabel(e.target.value)} />}
          <SelectField label="Theme" value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}><option value="light">Light</option><option value="dark">Dark</option></SelectField>
          {kind !== 'booking' && <SelectField label="Size" value={size} onChange={(e) => setSize(e.target.value as Size)}><option value="small">Small (320 x 180)</option><option value="medium">Medium (480 x 260)</option><option value="large">Large (640 x 340)</option></SelectField>}
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Live preview</h2>
            <div aria-label="Embed preview" className={cx('flex min-h-48 items-center justify-center overflow-auto rounded-ui p-6', theme === 'dark' ? 'bg-[#2a2420]' : 'bg-soft')}>
              <EmbedWidget kind={kind} theme={theme} size={size} project={project} label={label} />
            </div>
          </Card>
          <Card>
            <label className="block text-sm"><span className="mb-1 block font-medium">Embed code</span>
              <textarea readOnly rows={5} value={code} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-ui border border-line bg-bg px-3 py-2 font-mono text-xs" /></label>
            <Button variant="primary" className="mt-3" onClick={copy}>{t('embeds.copy')}</Button>
          </Card>
        </div>
      </div>
    </>
  )
}
