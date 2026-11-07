import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { t } from '../lib/copy'
import { update, useStore } from '../lib/store'
import { Badge, Button, Card, Modal, PageHeader, toast, cx } from '../components/ui'
import { PLANS, type PlanName } from '../lib/seed'
import { money } from '../lib/util'

export function Billing() {
  const { plan, members, projects, clients } = useStore()
  const cur = PLANS.find((p) => p.name === plan)!
  return (
    <>
      <PageHeader title={t('nav.billing')} sub="Your Roozfir plan" actions={<Link to="/billing/plans" className="rounded-ui bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">{t('billing.change')}</Link>} />
      <Card className="max-w-2xl">
        <div className="flex items-start justify-between"><div><p className="text-sm text-muted">Current plan</p><h2 className="text-2xl font-semibold">{cur.name} <Badge tone="green">Active</Badge></h2><p className="text-sm text-muted">{cur.blurb} {cur.seats}.</p></div>
          <p className="text-right"><span className="text-3xl font-bold">{money(cur.price, 'USD')}</span><span className="block text-sm text-muted">per month</span></p></div>
        <ul className="mt-4 space-y-1 text-sm text-muted">{cur.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
        <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-4 text-sm">
          <div><dt className="text-muted">Seats used</dt><dd className="text-lg font-semibold">{members.filter((m) => m.status === 'active').length}</dd></div>
          <div><dt className="text-muted">Projects</dt><dd className="text-lg font-semibold">{projects.length}</dd></div>
          <div><dt className="text-muted">Clients</dt><dd className="text-lg font-semibold">{clients.filter((c) => !c.archived).length}</dd></div>
        </dl>
        <p className="mt-4 text-xs text-muted">Next renewal on the 1st of the month. Billing is managed by Roozfir; no card details are stored in this demo.</p>
      </Card>
    </>
  )
}

export function Plans() {
  const { plan } = useStore()
  const navigate = useNavigate()
  const [target, setTarget] = useState<PlanName | null>(null)
  const idx = (n: PlanName) => PLANS.findIndex((p) => p.name === n)
  return (
    <>
      <PageHeader title={t('billing.change')} sub={`You are on ${plan}.`} actions={<Link to="/billing" className="text-sm font-medium text-brand hover:underline">Back to billing</Link>} />
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.name} className={cx('flex flex-col', p.name === plan && 'border-brand')}>
            <h2 className="text-lg font-semibold">{p.name} {p.name === plan && <Badge tone="green">Current</Badge>}</h2>
            <p className="my-3"><span className="text-3xl font-bold">${p.price}</span><span className="text-muted"> / month</span></p>
            <p className="mb-2 text-sm font-medium">{p.seats}</p>
            <ul className="mb-4 flex-1 space-y-1 text-sm text-muted">{p.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
            <Button variant={p.name === plan ? 'secondary' : 'primary'} disabled={p.name === plan} onClick={() => setTarget(p.name)}>{p.name === plan ? 'Current plan' : `${idx(p.name) > idx(plan) ? 'Upgrade' : 'Downgrade'} to ${p.name}`}</Button>
          </Card>))}
      </div>
      {target && (
        <Modal title={`Switch to ${target}`} onClose={() => setTarget(null)} footer={<><Button onClick={() => setTarget(null)}>Cancel</Button>
          <Button variant="primary" onClick={() => { update((s) => { s.plan = target }); toast(`You are now on the ${target} plan`); setTarget(null); navigate('/billing') }}>Confirm switch</Button></>}>
          <p className="text-sm">Your plan changes from <strong>{plan}</strong> to <strong>{target}</strong> ({money(PLANS.find((p) => p.name === target)!.price)} per month) from your next renewal.</p>
          <p className="text-sm text-muted">You keep everything in your workspace.</p>
        </Modal>)}
    </>
  )
}
