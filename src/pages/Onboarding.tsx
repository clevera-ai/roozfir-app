import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import flags from '../config/flags.json'
import { t } from '../lib/copy'
import { update } from '../lib/store'
import { Button, Card, SelectField, TextField, toast, cx } from '../components/ui'
import { EMAIL_RE, PROJECT_COLORS, uid } from '../lib/util'
import { ROLES, type Role } from '../lib/seed'

type StepId = 'workspace' | 'rates' | 'first' | 'client' | 'brand' | 'review'

export default function Onboarding() {
  const navigate = useNavigate()
  const [i, setI] = useState(0)
  const [name, setName] = useState('')
  const [type, setType] = useState<'solo' | 'team' | ''>('')
  const [currency, setCurrency] = useState('USD')
  const [rate, setRate] = useState('')
  const [project, setProject] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('Member')
  const [invites, setInvites] = useState<{ email: string; role: Role }[]>([])
  const [client, setClient] = useState('')
  const [prefix, setPrefix] = useState('')
  const [accent, setAccent] = useState('Orange')
  const [error, setError] = useState('')

  const steps: StepId[] = ['workspace', 'rates', 'first', 'client', ...(flags.wizardBrandStep ? ['brand' as const] : []), 'review']
  const id = steps[i]
  const titles: Record<StepId, string> = {
    workspace: 'Name your workspace', rates: 'Currency and rates', first: type === 'team' ? 'Invite your team' : 'Create your first project',
    client: `Add your first ${t('label.client').toLowerCase()}`, brand: 'Brand your invoices', review: 'Review and finish',
  }

  const next = () => {
    setError('')
    if (id === 'workspace') {
      if (!name.trim()) return setError('Enter a workspace name.')
      if (!type) return setError('Choose Solo or Team.')
    }
    if (id === 'rates' && (!rate.trim() || Number.isNaN(Number(rate)) || Number(rate) <= 0)) return setError('Enter a default hourly rate greater than zero.')
    if (id === 'first' && type === 'solo' && !project.trim()) return setError('Enter a project name, or choose Skip for now.')
    setI(i + 1)
  }
  const addInvite = () => {
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address.')
    setError(''); setInvites([...invites, { email: email.trim(), role }]); setEmail('')
  }
  const finish = () => {
    update((s) => {
      s.workspace = { ...s.workspace, name: name.trim(), type: type || 'solo', onboarded: true, invoicePrefix: prefix.trim() || s.workspace.invoicePrefix, accent }
      s.currency = currency; s.defaultRate = Number(rate)
      if (type === 'solo' && project.trim()) s.projects.push({ id: uid('p'), name: project.trim(), clientId: s.clients[0]?.id ?? '', budget: 0, stage: 'planned', color: PROJECT_COLORS[s.projects.length % PROJECT_COLORS.length], expenses: [] })
      if (type === 'team') for (const v of invites) s.members.push({ id: uid('m'), name: v.email.split('@')[0], email: v.email, role: v.role, status: 'invited' })
      if (client.trim()) s.clients.push({ id: uid('c'), name: client.trim(), email: '', contact: '', rate: Number(rate), archived: false })
    })
    toast('Workspace ready. Welcome to Tallyfox.')
    navigate('/app')
  }
  const skip = id === 'first' || id === 'client' || id === 'brand'

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-sm font-medium text-brand">Step {i + 1} of {steps.length}</p>
      <div className="mt-2 flex gap-1" aria-hidden>{steps.map((s, n) => <span key={s} className={cx('h-1.5 flex-1 rounded-full', n <= i ? 'bg-brand' : 'bg-line')} />)}</div>
      <h1 className="mb-6 mt-4 text-2xl font-semibold tracking-tight">{titles[id]}</h1>
      <Card className="space-y-4">
        {id === 'workspace' && (<>
          <TextField label="Workspace name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Fernhill Creative" autoFocus />
          <fieldset>
            <legend className="mb-2 text-sm font-medium">How will you use Tallyfox?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {([['solo', 'Solo', 'Just me, tracking my own time.'], ['team', 'Team workspace', 'Me and teammates who track time too.']] as const).map(([v, label, desc]) => (
                <label key={v} className={cx('flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm', type === v ? 'border-brand bg-soft' : 'border-line')}>
                  <input type="radio" name="workspace-type" aria-label={label} checked={type === v} onChange={() => setType(v)} className="mt-1 accent-[var(--c-brand)]" />
                  <span><span className="block font-semibold">{label}</span><span className="text-muted">{desc}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
        </>)}
        {id === 'rates' && (<>
          <SelectField label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((c) => <option key={c}>{c}</option>)}
          </SelectField>
          <TextField label="Default hourly rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="90" />
        </>)}
        {id === 'first' && type === 'solo' && <TextField label="Project name" value={project} onChange={(e) => setProject(e.target.value)} placeholder="Website redesign" />}
        {id === 'first' && type !== 'solo' && (<>
          <div className="flex items-end gap-2">
            <TextField className="flex-1" label="Teammate email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
            <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)}>{ROLES.filter((r) => r !== 'Admin').map((r) => <option key={r}>{r}</option>)}</SelectField>
            <Button onClick={addInvite}>Add</Button>
          </div>
          {invites.length > 0 && (
            <ul aria-label="Invited teammates" className="divide-y divide-line rounded-ui border border-line text-sm">
              {invites.map((v) => (
                <li key={v.email} className="flex items-center justify-between px-3 py-2"><span>{v.email} <span className="text-muted">({v.role})</span></span>
                  <Button size="sm" variant="ghost" aria-label={`Remove ${v.email}`} onClick={() => setInvites(invites.filter((x) => x !== v))}>Remove</Button></li>
              ))}
            </ul>
          )}
        </>)}
        {id === 'client' && <TextField label={`${t('label.client')} name`} value={client} onChange={(e) => setClient(e.target.value)} placeholder="Northwind Studio" />}
        {id === 'brand' && (<>
          <TextField label="Invoice prefix" value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} placeholder="FH" hint="Shown before the number on every invoice, like FH-0004." />
          <SelectField label="Accent colour" value={accent} onChange={(e) => setAccent(e.target.value)}>{['Orange', 'Teal', 'Blue', 'Purple'].map((c) => <option key={c}>{c}</option>)}</SelectField>
        </>)}
        {id === 'review' && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted">Workspace</dt><dd>{name} ({type})</dd>
            <dt className="text-muted">Rate</dt><dd>{currency} {rate} per hour</dd>
            {type === 'team' ? <><dt className="text-muted">Invites</dt><dd>{invites.length ? invites.map((v) => v.email).join(', ') : 'None yet'}</dd></> : <><dt className="text-muted">First project</dt><dd>{project || 'None yet'}</dd></>}
            <dt className="text-muted">{t('label.client')}</dt><dd>{client || 'None yet'}</dd>
            {flags.wizardBrandStep && <><dt className="text-muted">Invoice prefix</dt><dd>{prefix || 'Default'} · {accent}</dd></>}
          </dl>
        )}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </Card>
      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => { setError(''); i === 0 ? navigate('/app') : setI(i - 1) }}>{i === 0 ? 'Cancel' : 'Back'}</Button>
        <div className="flex gap-2">
          {skip && <Button onClick={() => { setError(''); setI(i + 1) }}>Skip for now</Button>}
          {id === 'review' ? <Button variant="primary" onClick={finish}>Finish setup</Button> : <Button variant="primary" onClick={next}>Continue</Button>}
        </div>
      </div>
    </div>
  )
}
