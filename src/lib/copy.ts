import copy from '../config/copy.json'

const strings: Record<string, string> = copy

/** Look up a UI string from src/config/copy.json. */
export function t(key: string, vars: Record<string, string> = {}): string {
  const s = strings[key] ?? key
  return s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')
}
