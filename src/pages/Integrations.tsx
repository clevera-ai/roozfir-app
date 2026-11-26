import { Link } from 'react-router-dom'
import { t } from '../lib/copy'
import { disconnect, useConnected, VENDORS } from '../lib/integrations'
import { Badge, Button, Card, PageHeader, toast } from '../components/ui'

function PlugIcon() {
  return (
    <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-ui bg-soft text-brand">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0V8zM12 18v4" /></svg>
    </span>
  )
}

export function IntegrationCards() {
  const connected = useConnected()
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {VENDORS.map((v) => {
        const on = connected.includes(v.id)
        return (
          <Card key={v.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-3"><PlugIcon /><div><h2 className="font-semibold">{v.name}</h2>{on ? <Badge tone="green">Connected</Badge> : <Badge>Not connected</Badge>}</div></div>
            <p className="text-sm text-muted">{v.blurb}</p>
            <div className="mt-auto">
              {on
                ? <Button onClick={() => { disconnect(v.id); toast(`Disconnected ${v.name}`) }}>Disconnect</Button>
                : <a href={v.authorizeUrl} aria-label={`${t('integrations.connect')} ${v.name}`} className="inline-flex items-center justify-center rounded-ui border border-transparent bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">{t('integrations.connect')}</a>}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export function Integrations() {
  return (
    <>
      <PageHeader title={t('integrations.heading')} sub="Connect the tools you already use. Roozfir only asks for the access each feature needs." />
      <IntegrationCards />
    </>
  )
}

export function IntegrationCallback() {
  return (
    <div className="mx-auto max-w-md pt-12 text-center">
      <h1 className="text-xl font-semibold">We could not finish connecting</h1>
      <p className="mt-2 text-sm text-muted">The connection was not completed. You can try again from the integrations page.</p>
      <Link to="/" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">Back to the dashboard</Link>
    </div>
  )
}
