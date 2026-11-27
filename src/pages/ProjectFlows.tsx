import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { createProject } from '../lib/projects'
import { update, useStore } from '../lib/store'
import { Button, Card, Empty, PageHeader, SelectField, TextArea, TextField, Toggle, toast, cx } from '../components/ui'
import { t } from '../lib/copy'
import { money } from '../lib/util'

/** Button-only deep page: /projects/<id>/sharing. Reached from "Sharing settings" on the project page; no nav entry. */
export function ProjectSharing() {
  const { id } = useParams()
  const { projects } = useStore()
  const p = projects.find((x) => x.id === id)
  const [pub, setPub] = useState(p?.sharing?.public ?? false)
  const [who, setWho] = useState<string>(p?.sharing?.who ?? 'link')
  const [progress, setProgress] = useState(p?.sharing?.showProgress ?? true)
  if (!p) return <Empty>That project does not exist. <Link to="/projects" className="font-medium text-brand">Back to projects</Link></Empty>
  const link = `https://app.roozfir.online/share/${p.id}`
  return (
    <>
      <PageHeader title="Sharing settings" sub={p.name} actions={<Link to={`/projects/${p.id}`} className="text-sm font-medium text-brand hover:underline">Back to project</Link>} />
      <Card className="max-w-xl space-y-4">
        <Toggle label="Public status page" hint="Anyone with the link can see this project's stage and progress." checked={pub} onChange={setPub} />
        <SelectField label="Who can view" value={who} onChange={(e) => setWho(e.target.value)} disabled={!pub}>
          <option value="link">Anyone with the link</option><option value="invited">Only people I invite</option></SelectField>
        <Toggle label="Show budget progress" hint="Adds the percentage of the budget used to the page." checked={progress} onChange={setProgress} />
        {pub && <TextField label="Share link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />}
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => { update((s) => { const x = s.projects.find((y) => y.id === p.id); if (x) x.sharing = { public: pub, who: who === 'invited' ? 'invited' : 'link', showProgress: progress } }); toast('Sharing settings saved') }}>Save sharing settings</Button>
          {pub && <Button onClick={() => { navigator.clipboard?.writeText(link).catch(() => undefined); toast('Link copied') }}>Copy link</Button>}
        </div>
      </Card>
    </>
  )
}

// ---- New-project wizard: /projects/new/details -> /budget -> /review ----
const draft = { name: '', clientId: '', billingContact: '', budget: '', description: '' }

function Steps({ n }: { n: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Wizard steps" className="mb-6 flex gap-2 text-sm">
      {['Details', 'Budget', 'Review'].map((l, i) => <li key={l} aria-current={n === i + 1 ? 'step' : undefined} className={cx('rounded-full px-3 py-1', n === i + 1 ? 'bg-brand text-white' : 'bg-soft text-muted')}>{i + 1}. {l}</li>)}
    </ol>
  )
}

export function WizardDetails() {
  const { clients } = useStore()
  const navigate = useNavigate()
  const [name, setName] = useState(draft.name)
  const [clientId, setClientId] = useState(draft.clientId)
  const [contact, setContact] = useState(draft.billingContact)
  const [er, setEr] = useState<Record<string, string>>({})
  const next = (e: FormEvent) => {
    e.preventDefault()
    const x: Record<string, string> = {}
    if (!name.trim()) x.name = 'Enter a project name.'
    if (!clientId) x.client = `Choose a ${t('label.client').toLowerCase()}.`
    else if (!contact.trim()) x.contact = 'Enter a billing contact.'
    setEr(x); if (Object.keys(x).length) return
    Object.assign(draft, { name: name.trim(), clientId, billingContact: contact.trim() }); navigate('/projects/new/budget')
  }
  return (
    <form onSubmit={next} noValidate>
      <PageHeader title="New project" sub="Step 1 of 3" actions={<Link to="/projects" className="text-sm font-medium text-brand hover:underline">Cancel</Link>} />
      <Steps n={1} />
      <Card className="max-w-xl space-y-4">
        <TextField label="Project name" value={name} onChange={(e) => setName(e.target.value)} error={er.name} />
        <SelectField label={t('label.client')} value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">Choose…</option>{clients.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectField>
        {er.client && <p role="alert" className="text-xs text-red-600">{er.client}</p>}
        {clientId && <TextField label="Billing contact" value={contact} onChange={(e) => setContact(e.target.value)} error={er.contact} hint="Who receives the invoices for this project." />}
        <Button type="submit" variant="primary">Next</Button>
      </Card>
    </form>
  )
}

export function WizardBudget() {
  const navigate = useNavigate()
  const [budget, setBudget] = useState(draft.budget)
  const [description, setDescription] = useState(draft.description)
  const [er, setEr] = useState('')
  if (!draft.name) return <Navigate to="/projects/new/details" replace />
  const next = (e: FormEvent) => {
    e.preventDefault()
    if (budget.trim() && (Number.isNaN(Number(budget)) || Number(budget) < 0)) return setEr('Enter a budget as a number.')
    Object.assign(draft, { budget: budget.trim(), description: description.trim() }); navigate('/projects/new/review')
  }
  return (
    <form onSubmit={next} noValidate>
      <PageHeader title="New project" sub="Step 2 of 3" />
      <Steps n={2} />
      <Card className="max-w-xl space-y-4">
        <TextField label="Budget" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} error={er} hint="Optional." />
        <TextArea label="Project description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex gap-2"><Button onClick={() => navigate('/projects/new/details')}>Back</Button><Button type="submit" variant="primary">Next</Button></div>
      </Card>
    </form>
  )
}

export function WizardReview() {
  const { clients, currency } = useStore()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  if (!draft.name) return <Navigate to="/projects/new/details" replace />
  const client = clients.find((c) => c.id === draft.clientId)
  const create = async () => {
    setSaving(true)
    const id = await createProject({ name: draft.name, clientId: draft.clientId, budget: Number(draft.budget || 0), description: draft.description, billingContact: draft.billingContact })
    Object.assign(draft, { name: '', clientId: '', billingContact: '', budget: '', description: '' })
    toast('Project created'); navigate(`/projects/${id}`)
  }
  return (
    <>
      <PageHeader title="New project" sub="Step 3 of 3" />
      <Steps n={3} />
      <Card className="max-w-xl">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Project</dt><dd className="font-medium">{draft.name}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">{t('label.client')}</dt><dd>{client?.name}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Billing contact</dt><dd>{draft.billingContact}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Budget</dt><dd>{draft.budget ? money(Number(draft.budget), currency) : 'None'}</dd></div>
        </dl>
        <div className="mt-5 flex gap-2">
          <Button disabled={saving} onClick={() => navigate('/projects/new/budget')}>Back</Button>
          <Button variant="primary" disabled={saving} onClick={create}>{saving ? (<><span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Creating…</>) : 'Create project'}</Button>
        </div>
      </Card>
    </>
  )
}
