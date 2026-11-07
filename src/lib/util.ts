// Date and formatting helpers.
export const DEMO_EMAIL = 'demo@roozfir.online'

export const uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 9)}`
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'

export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const todayIso = () => iso(new Date())
export const parseIso = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const addDays = (s: string, n: number) => { const d = parseIso(s); d.setDate(d.getDate() + n); return iso(d) }
export const addMonths = (s: string, n: number) => {
  const d = parseIso(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return iso(d)
}
export const mondayOf = (s: string) => { const d = parseIso(s); const dow = (d.getDay() + 6) % 7; return addDays(s, -dow) }
export const shortDate = (s: string) => parseIso(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
export const dayName = (s: string) => parseIso(s).toLocaleDateString('en-US', { weekday: 'long' })

export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60); const m = Math.round(mins % 60)
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}
/** Accepts "1:30", "1.5", "90m", "1h 30m". Returns minutes or null. */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase()
  if (!s) return null
  let m = s.match(/^(\d+):(\d{1,2})$/); if (m) return Number(m[1]) * 60 + Number(m[2])
  m = s.match(/^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m)?$/); if (m && (m[1] || m[2])) return Math.round(Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0))
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s) * 60)
  return null
}

export const money = (n: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const PROJECT_COLORS = ['#ea580c', '#0d9488', '#2563eb', '#9333ea', '#db2777', '#ca8a04']

// CSV
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') q = false; else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}
export const toCsv = (rows: (string | number)[][]) => rows.map((r) => r.map((c) => { const s = String(c); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }).join(',')).join('\n') + '\n'
export function download(filename: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
