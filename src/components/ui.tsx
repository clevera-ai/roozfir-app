import {
  useCallback, useEffect, useId, useRef, useState, useSyncExternalStore,
  type ButtonHTMLAttributes, type FormEvent, type InputHTMLAttributes, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react'
import { NavLink } from 'react-router-dom'
import { iso, parseIso, shortDate, todayIso } from '../lib/util'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'sm' | 'md' }
export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...p }: BtnProps) {
  const v = {
    primary: 'bg-brand text-white border-transparent hover:bg-brand-hover',
    secondary: 'bg-surface text-ink border-line hover:bg-soft',
    danger: 'bg-red-600 text-white border-transparent hover:bg-red-700',
    ghost: 'bg-transparent text-muted border-transparent hover:bg-soft hover:text-ink',
  }[variant]
  return (
    <button type={type}
      className={cx('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-ui border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        size === 'sm' ? 'px-2.5 py-1 text-sm' : 'px-4 py-2 text-sm', v, className)}
      {...p} />
  )
}

export const fieldCls = 'w-full rounded-ui border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-2 focus:outline-brand'

export function TextField({ label, hint, error, className, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  return (
    <label className={cx('block text-sm', className)}>
      <span className="mb-1 block font-medium">{label}</span>
      <input className={cx(fieldCls, error && 'border-red-500')} {...p} />
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}
export function SelectField({ label, children, className, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={cx('block text-sm', className)}>
      <span className="mb-1 block font-medium">{label}</span>
      <select className={fieldCls} {...p}>{children}</select>
    </label>
  )
}
export function TextArea({ label, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <textarea rows={3} className={fieldCls} {...p} />
    </label>
  )
}

export function Checkbox({ label, hideLabel, className, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; hideLabel?: boolean }) {
  return (
    <label className={cx('inline-flex items-center gap-2 text-sm', className)}>
      <input type="checkbox" aria-label={hideLabel ? label : undefined} className="h-4 w-4 rounded border-line accent-[var(--c-brand)]" {...p} />
      {!hideLabel && <span>{label}</span>}
    </label>
  )
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cx('relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand', checked ? 'bg-brand' : 'bg-line')}>
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  )
}

export function Modal({ title, onClose, children, footer, onSubmit, wide }: {
  title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; onSubmit?: (e: FormEvent) => void; wide?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', h)
    const first = ref.current?.querySelector<HTMLElement>('input:not([type=checkbox]), select, textarea')
    first?.focus()
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  const Wrap = onSubmit ? 'form' : 'div'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={cx('max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-line bg-surface shadow-2xl', wide ? 'max-w-2xl' : 'max-w-md')}>
        <Wrap {...(onSubmit ? { onSubmit, noValidate: true } : {})}>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" aria-label="Close dialog" onClick={onClose} className="rounded-ui px-2 text-xl leading-none text-muted hover:bg-soft hover:text-ink">×</button>
          </div>
          <div className="space-y-4 px-5 py-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
        </Wrap>
      </div>
    </div>
  )
}

export function PageHeader({ title, actions, sub }: { title: string; actions?: ReactNode; sub?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{sub && <p className="mt-1 text-sm text-muted">{sub}</p>}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
export const Card = ({ className, children }: { className?: string; children: ReactNode }) =>
  <div className={cx('rounded-xl border border-line bg-surface p-[var(--card-pad)]', className)}>{children}</div>

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'amber' | 'blue' | 'red' }) {
  const m = { gray: 'bg-soft text-muted', green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-800', blue: 'bg-blue-100 text-blue-800', red: 'bg-red-100 text-red-800' }[tone]
  return <span className={cx('inline-block rounded-full px-2 py-0.5 text-xs font-medium', m)}>{children}</span>
}
export const Avatar = ({ text }: { text: string }) =>
  <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">{text}</span>

export function Tabs({ items }: { items: { to: string; label: string; end?: boolean }[] }) {
  return (
    <nav aria-label="Sections" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => cx('-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium', isActive ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink')}>{i.label}</NavLink>
      ))}
    </nav>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">{children}</div>
}

/** Row actions that only show on hover or keyboard focus. */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">{children}</div>
}

// ---- Toasts (with Undo) ----
interface ToastItem { id: number; message: string; undo?: () => void }
let toasts: ToastItem[] = []
let nextToast = 1
const tl = new Set<() => void>()
const emit = () => tl.forEach((l) => l())
export function toast(message: string, undo?: () => void) {
  const id = nextToast++
  toasts = [...toasts, { id, message, undo }]
  emit()
  setTimeout(() => dismiss(id), undo ? 8000 : 4000)
}
function dismiss(id: number) { toasts = toasts.filter((x) => x.id !== id); emit() }
export function Toaster() {
  const list = useSyncExternalStore((fn) => { tl.add(fn); return () => { tl.delete(fn) } }, () => toasts)
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {list.map((x) => (
        <div key={x.id} className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-line bg-ink px-4 py-3 text-sm text-surface shadow-xl">
          <span>{x.message}</span>
          <span className="flex items-center gap-2">
            {x.undo && <button className="font-semibold text-orange-300 hover:underline" onClick={() => { x.undo?.(); dismiss(x.id) }}>Undo</button>}
            <button aria-label="Dismiss notification" className="text-lg leading-none opacity-70 hover:opacity-100" onClick={() => dismiss(x.id)}>×</button>
          </span>
        </div>
      ))}
    </div>
  )
}

// ---- Date picker (calendar popover) ----
export function DatePicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => parseIso(value || todayIso()))
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const first = new Date(view.getFullYear(), view.getMonth(), 1)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const move = (n: number) => setView(new Date(view.getFullYear(), view.getMonth() + n, 1))
  return (
    <div className="relative text-sm" ref={ref}>
      <span className="mb-1 block font-medium">{label}</span>
      <button type="button" aria-label={label} aria-haspopup="dialog" aria-expanded={open}
        onClick={() => { setView(parseIso(value || todayIso())); setOpen(!open) }}
        className={cx(fieldCls, 'flex items-center justify-between text-left')}>
        <span>{value ? shortDate(value) : 'Pick a date'}</span><span aria-hidden>▾</span>
      </button>
      {open && (
        <div role="dialog" aria-label={`${label} calendar`} className="absolute z-30 mt-1 w-72 rounded-xl border border-line bg-surface p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <Button size="sm" variant="ghost" aria-label="Previous month" onClick={() => move(-1)}>‹</Button>
            <span className="font-medium">{view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <Button size="sm" variant="ghost" aria-label="Next month" onClick={() => move(1)}>›</Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">{['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => <span key={d}>{d}</span>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <span key={i} />
              const v = iso(new Date(view.getFullYear(), view.getMonth(), d))
              const label = new Date(view.getFullYear(), view.getMonth(), d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
              return (
                <button key={i} type="button" aria-label={label} aria-pressed={v === value}
                  onClick={() => { onChange(v); setOpen(false) }}
                  className={cx('rounded-lg py-1.5 text-sm hover:bg-soft', v === value && 'bg-brand text-white hover:bg-brand', v === todayIso() && v !== value && 'font-bold text-brand')}>{d}</button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial)
  return { open, show: useCallback(() => setOpen(true), []), hide: useCallback(() => setOpen(false), []) }
}
