import { useEffect, useRef, useState } from 'react'
import { t } from '../lib/copy'
import { Card, PageHeader } from '../components/ui'

const WHO = ['Dana Whitfield', 'Marcus Bell', 'Lena Okafor']
const WHAT = [
  (n: number) => `logged ${(n % 4) + 1}h on Website redesign`,
  (n: number) => `sent invoice FH-${String(1 + (n % 3)).padStart(4, '0')}`,
  () => 'moved Mobile app MVP to In progress',
  (n: number) => `added a note to Brand refresh (${n % 7 + 1} comments)`,
  () => 'changed the default hourly rate',
  (n: number) => `exported a report (${(n % 5) + 1} clients)`,
]
const PAGE = 15
/** Deterministic, generated entries: item n is always the same text. Newest first. */
const entry = (n: number) => ({ id: n, who: WHO[n % WHO.length], text: WHAT[(n * 7) % WHAT.length](n), when: n === 0 ? 'Just now' : n < 10 ? `${n} hours ago` : `${Math.ceil(n / 3)} days ago` })

/** Activity: a feed that loads 15 more rows each time you reach the bottom (infinite scroll). 120 rows in all. */
export function Activity() {
  const [count, setCount] = useState(PAGE)
  const [loading, setLoading] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const done = count >= 120
  useEffect(() => {
    if (!end.current || done) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !loading) { setLoading(true); setTimeout(() => { setCount((c) => Math.min(c + PAGE, 120)); setLoading(false) }, 600) }
    }, { rootMargin: '0px 0px 80px 0px' })
    io.observe(end.current)
    return () => io.disconnect()
  }, [done, loading, count])
  return (
    <>
      <PageHeader title={t('nav.activity')} sub="Everything that happened in your workspace" />
      <Card>
        <ul className="divide-y divide-line text-sm">
          {Array.from({ length: count }, (_, i) => entry(i)).map((a) => (
            <li key={a.id} className="flex justify-between gap-4 py-3"><span><strong>{a.who}</strong> {a.text}</span><span className="shrink-0 text-muted">{a.when}</span></li>))}
        </ul>
        <div ref={end} className="py-4 text-center text-sm text-muted">{done ? 'You have reached the beginning.' : 'Loading more…'}</div>
      </Card>
    </>
  )
}
