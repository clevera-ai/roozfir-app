import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import flags from '../config/flags.json'
import { t } from '../lib/copy'
import { update, useStore } from '../lib/store'
import { Button, Card, PageHeader, SelectField, Tabs, TextField, Toggle, toast, cx } from '../components/ui'
import { initials, money } from '../lib/util'

export function SettingsLayout() {
  return (
    <>
      <PageHeader title={t('nav.settings')} />
      <Tabs items={[{ to: '/app/settings/profile', label: 'Profile' }, { to: '/app/settings/notifications', label: 'Notifications' }, { to: '/app/settings/currency', label: 'Currency' }, { to: '/app/settings/templates', label: 'Email templates' }]} />
      <Outlet />
    </>
  )
}

export function Profile() {
  const { profile, theme } = useStore()
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [title, setTitle] = useState(profile.title)
  const [tz, setTz] = useState(profile.timezone)
  const [error, setError] = useState('')
  return (
    <Card className="max-w-xl space-y-4">
      <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} error={error} />
      <TextField label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField label="Job title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <SelectField label="Time zone" value={tz} onChange={(e) => setTz(e.target.value)}>
        {['America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Australia/Sydney'].map((z) => <option key={z}>{z}</option>)}</SelectField>
      {flags.darkMode && (
        <SelectField label="Appearance" value={theme} onChange={(e) => update((s) => { s.theme = e.target.value as 'light' | 'dark' })}><option value="light">Light</option><option value="dark">Dark</option></SelectField>)}
      <Button variant="primary" onClick={() => {
        if (!name.trim()) return setError('Enter your name.')
        setError(''); update((s) => { s.profile = { ...s.profile, name: name.trim(), email: email.trim(), title: title.trim(), timezone: tz, initials: initials(name) } }); toast('Profile saved')
      }}>{t('settings.save')}</Button>
    </Card>
  )
}

export function Notifications() {
  const { notifications } = useStore()
  const [draft, setDraft] = useState(notifications)
  const items: [string, string, string][] = [
    ['weeklySummary', 'Weekly summary email', 'Hours, billable amount and unbilled time, every Monday.'],
    ['invoicePaid', 'Invoice paid', 'Tell me when a client pays an invoice.'],
    ['timerRunning', 'Timer left running', 'Remind me when a timer has been running for over 4 hours.'],
    ['productNews', 'Product news', 'Occasional emails about new Tallyfox features.'],
    ...(flags.timesheetReminders ? [['timesheetReminders', 'Timesheet reminders', 'Remind me on Friday afternoon to fill in my timesheet.'] as [string, string, string]] : []),
  ]
  return (
    <Card className="max-w-xl">
      <div className="divide-y divide-line">{items.map(([k, label, hint]) => <Toggle key={k} label={label} hint={hint} checked={!!draft[k]} onChange={(v) => setDraft({ ...draft, [k]: v })} />)}</div>
      <Button variant="primary" className="mt-4" onClick={() => { update((s) => { s.notifications = draft }); toast('Notification settings saved') }}>Save notifications</Button>
    </Card>
  )
}

export function Currency() {
  const { currency, defaultRate } = useStore()
  const [c, setC] = useState(currency)
  const [rate, setRate] = useState(String(defaultRate))
  const [error, setError] = useState('')
  return (
    <Card className="max-w-xl space-y-4">
      <SelectField label="Currency" value={c} onChange={(e) => setC(e.target.value)}>{['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((x) => <option key={x}>{x}</option>)}</SelectField>
      <TextField label="Default hourly rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} error={error} hint={`Shown as ${money(Number(rate) || 0, c)} per hour.`} />
      <Button variant="primary" onClick={() => {
        if (!(Number(rate) > 0)) return setError('Enter a rate above zero.')
        setError(''); update((s) => { s.currency = c; s.defaultRate = Number(rate) }); toast('Currency saved')
      }}>Save currency</Button>
    </Card>
  )
}

const VARIABLES = ['client.name', 'client.contact', 'invoice.number', 'invoice.total', 'invoice.due_date', 'workspace.name', 'sender.name']
const SAMPLE: Record<string, string> = { 'client.name': 'Northwind Studio', 'client.contact': 'Priya', 'invoice.number': 'FH-0004', 'invoice.total': '$1,284.00', 'invoice.due_date': 'Dec 7, 2026', 'workspace.name': 'Fernhill Creative', 'sender.name': 'Dana' }
const fill = (s: string) => s.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k: string) => SAMPLE[k] ?? m)

export function Templates() {
  const { templates } = useStore()
  const [key, setKey] = useState('invoice')
  const [subject, setSubject] = useState(templates.invoice.subject)
  const [html, setHtml] = useState(templates.invoice.body)
  const [menu, setMenu] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (ref.current) ref.current.innerHTML = templates[key].body; setSubject(templates[key].subject); setHtml(templates[key].body) }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const exec = (cmd: string, arg?: string) => { ref.current?.focus(); document.execCommand(cmd, false, arg); setHtml(ref.current?.innerHTML ?? '') }
  const insert = (v: string) => { setMenu(false); ref.current?.focus(); document.execCommand('insertText', false, `{{${v}}}`); setHtml(ref.current?.innerHTML ?? '') }
  const unknown = [...(subject + html).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).filter((k) => !VARIABLES.includes(k))
  const tb = 'rounded-ui border border-line bg-surface px-2.5 py-1 text-sm hover:bg-soft'
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-4">
        <SelectField label="Template" value={key} onChange={(e) => setKey(e.target.value)}>{Object.entries(templates).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</SelectField>
        <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <div>
          <span className="mb-1 block text-sm font-medium" id="body-label">Message</span>
          <div role="toolbar" aria-label="Formatting" className="relative mb-2 flex flex-wrap gap-1">
            <button type="button" aria-label="Bold" className={cx(tb, 'font-bold')} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')}>B</button>
            <button type="button" aria-label="Italic" className={cx(tb, 'italic')} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')}>I</button>
            <button type="button" aria-label="Bulleted list" className={tb} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertUnorderedList')}>• List</button>
            <button type="button" aria-label="Add link" className={tb} onMouseDown={(e) => e.preventDefault()} onClick={() => { const u = window.prompt('Link address', 'https://'); if (u) exec('createLink', u) }}>Link</button>
            <button type="button" aria-haspopup="menu" aria-expanded={menu} className={tb} onMouseDown={(e) => e.preventDefault()} onClick={() => setMenu(!menu)}>Insert variable ▾</button>
            {menu && (
              <div role="menu" aria-label="Variables" className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-line bg-surface p-1 shadow-xl">
                {VARIABLES.map((v) => <button key={v} role="menuitem" type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(v)} className="block w-full rounded-lg px-3 py-1.5 text-left font-mono text-xs hover:bg-soft">{`{{${v}}}`}</button>)}
              </div>)}
          </div>
          <div ref={ref} className="rte rounded-ui border border-line bg-surface px-3 py-2 text-sm" contentEditable suppressContentEditableWarning role="textbox" aria-multiline aria-labelledby="body-label" onInput={() => setHtml(ref.current?.innerHTML ?? '')} />
        </div>
        {unknown.length > 0 && <p role="alert" className="text-sm text-red-600">Unknown variable{unknown.length > 1 ? 's' : ''}: {[...new Set(unknown)].map((u) => `{{${u}}}`).join(', ')}</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <Button variant="primary" onClick={() => {
          if (!subject.trim()) return setError('The subject cannot be empty.')
          if (unknown.length) return setError('Fix the unknown variables first.')
          setError(''); update((s) => { s.templates[key] = { ...s.templates[key], subject: subject.trim(), body: html } }); toast('Template saved')
        }}>Save template</Button>
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Preview with sample data</h2>
        <p className="mb-3 border-b border-line pb-3 text-sm"><span className="text-muted">Subject: </span><strong>{fill(subject)}</strong></p>
        <div className="space-y-3 text-sm [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: fill(html) }} />
      </Card>
    </div>
  )
}
