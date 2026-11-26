import { useEffect, useLayoutEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import flags from '../config/flags.json'
import { closePrefs, openPrefs, setConsent, useConsent } from '../lib/consent'
import { markSeen, useSeen } from '../lib/seen'
import { Button, Modal, Toggle, TextField, TextArea } from './ui'

/** Cookie banner: a bar over the bottom of every page, plus a preferences dialog. */
export function CookieBanner() {
  const { consent, prefsOpen } = useConsent()
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)
  useEffect(() => { if (prefsOpen) { setAnalytics(consent?.analytics ?? false); setMarketing(consent?.marketing ?? false) } }, [prefsOpen]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!flags.cookieBanner) return null
  return (
    <>
      {!consent && (
        <div role="region" aria-label="Cookie consent" className="fixed inset-x-0 bottom-0 z-[70] flex h-[120px] items-center border-t border-line bg-surface px-6 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4">
            <p className="max-w-xl text-sm"><strong>We use cookies.</strong> Roozfir uses essential cookies to run the app and, with your permission, analytics and marketing cookies to improve it.</p>
            <div className="flex gap-2">
              <Button onClick={() => setConsent({ analytics: false, marketing: false })}>Reject all</Button>
              <Button onClick={openPrefs}>Customise</Button>
              <Button variant="primary" onClick={() => setConsent({ analytics: true, marketing: true })}>Accept all</Button>
            </div>
          </div>
        </div>)}
      {prefsOpen && (
        <div className="relative z-[80]">
          <Modal title="Cookie preferences" onClose={closePrefs} footer={<><Button onClick={closePrefs}>Cancel</Button><Button variant="primary" onClick={() => setConsent({ analytics, marketing })}>Save preferences</Button></>}>
            <Toggle label="Essential" hint="Needed to sign in and keep your data. Always on." checked onChange={() => undefined} />
            <Toggle label="Analytics" hint="Helps us see which pages are used." checked={analytics} onChange={setAnalytics} />
            <Toggle label="Marketing" hint="Lets us measure our own campaigns." checked={marketing} onChange={setMarketing} />
          </Modal>
        </div>)}
    </>
  )
}

/** The invisible 1x1 iframe a bot-detection service injects. It must never show a challenge; the top window never defines _cf_chl_opt. */
export function CfIframe() {
  if (!flags.cfIframe) return null
  return (
    <iframe aria-hidden="true" tabIndex={-1} title="" style={{ position: 'absolute', width: 1, height: 1, border: 0, visibility: 'hidden', top: 0, left: 0 }}
      srcDoc={"<!DOCTYPE html><html><head><script>window._cf_chl_opt = { cType: 'managed', cZone: 'app.roozfir.online' };</script></head><body></body></html>"} />
  )
}

/** Generic support chat: a plain bubble bottom-right and a small panel with a form. */
export function ChatBubble() {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  if (!flags.chatBubble) return null
  return (
    <div className="fixed bottom-5 right-5 z-[60]">
      {open && (
        <div role="dialog" aria-label="Chat with us" className="mb-3 w-80 rounded-2xl border border-line bg-surface p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Chat with us</h2><button aria-label="Close chat" onClick={() => setOpen(false)} className="px-2 text-xl leading-none text-muted">×</button></div>
          {sent ? <p className="text-sm text-muted">Thanks. We will reply by email within a day.</p> : (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
              <TextField label="Your name" />
              <TextField label="Email" type="email" />
              <TextArea label="How can we help?" />
              <Button type="submit" variant="primary" className="w-full">Send message</Button>
            </form>)}
        </div>)}
      <button aria-label="Open chat" onClick={() => setOpen(!open)} className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl hover:bg-brand-hover">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
      </button>
    </div>
  )
}

/** "What's new" modal on the first visit after sign-in. */
export function WhatsNew() {
  const seen = useSeen('whatsNew')
  if (!flags.whatsNew || seen) return null
  return (
    <Modal title="What's new in Roozfir" onClose={() => markSeen('whatsNew')} footer={<Button variant="primary" onClick={() => markSeen('whatsNew')}>Got it</Button>}>
      <ul className="list-disc space-y-2 pl-5 text-sm">
        <li>Connect Google Calendar, Slack and Xero from Integrations.</li>
        <li>Embed your timesheet on your own website.</li>
        <li>A new Activity page shows everything that happened in your workspace.</li>
      </ul>
    </Modal>
  )
}

const TOUR: { anchor: string; title: string; body: string }[] = [
  { anchor: '[data-tour="stats"]', title: 'Your week at a glance', body: 'These cards show hours tracked, unbilled time and what customers still owe you.' },
  { anchor: 'nav[aria-label="Main"]', title: 'Everything is in the menu', body: 'Projects, time, invoices and the rest live in the sidebar.' },
  { anchor: '[data-tour="search"]', title: 'Search or jump anywhere', body: 'Press this bar, or Cmd/Ctrl+K, to open any page or start a task.' },
]
/** Three-step tooltip tour on the dashboard, once, after What's new is dismissed. */
export function DashboardTour() {
  const tourSeen = useSeen('tour')
  const newsSeen = useSeen('whatsNew')
  const [step, setStep] = useState(0)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const active = flags.dashboardTour && !tourSeen && (!flags.whatsNew || newsSeen)
  useLayoutEffect(() => {
    if (!active) return
    const el = document.querySelector(TOUR[step].anchor)
    if (!el) return setPos({ top: 140, left: 260 })
    const r = el.getBoundingClientRect()
    setPos(step === 1 ? { top: Math.max(80, r.top + 40), left: r.right + 12 } : { top: r.bottom + 12, left: Math.min(r.left, window.innerWidth - 340) })
  }, [active, step])
  if (!active || !pos) return null
  return (
    <div role="dialog" aria-label="Quick tour" style={{ top: pos.top, left: pos.left }} className="fixed z-[65] w-80 rounded-xl border border-brand bg-surface p-4 shadow-2xl">
      <p className="text-xs font-semibold uppercase text-brand">Step {step + 1} of {TOUR.length}</p>
      <h2 className="mt-1 font-semibold">{TOUR[step].title}</h2>
      <p className="mt-1 text-sm text-muted">{TOUR[step].body}</p>
      <div className="mt-3 flex justify-between">
        <Button size="sm" variant="ghost" onClick={() => markSeen('tour')}>Skip</Button>
        {step < TOUR.length - 1 ? <Button size="sm" variant="primary" onClick={() => setStep(step + 1)}>Next</Button> : <Button size="sm" variant="primary" onClick={() => markSeen('tour')}>Done</Button>}
      </div>
    </div>
  )
}

/** Shown in place of a feature the current plan does not include. */
export function UpgradeWall({ feature, needs = 'Business', blurb }: { feature: string; needs?: string; blurb: string }) {
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <h1 className="text-xl font-semibold">{feature} needs the {needs} plan</h1>
      <p className="mt-2 text-sm text-muted">{blurb}</p>
      <Link to="/billing" className="mt-5 inline-flex items-center rounded-ui bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-hover">Upgrade</Link>
    </div>
  )
}
