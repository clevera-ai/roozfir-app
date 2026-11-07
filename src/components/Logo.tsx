import { Link } from 'react-router-dom'

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 text-lg font-bold">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white" aria-hidden>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 18V7l7 5 7-5v11" /></svg>
      </span>
      Roozfir
    </Link>
  )
}
