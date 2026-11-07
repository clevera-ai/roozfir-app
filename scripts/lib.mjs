import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const p = (f) => join(ROOT, f)
export const readJson = (f) => JSON.parse(readFileSync(p(f), 'utf8'))
export const writeJson = (f, v) => writeFileSync(p(f), JSON.stringify(v, null, 2) + '\n')

export function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: opts.cwd ?? ROOT, encoding: 'utf8', stdio: opts.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'] })
}
export const git = (...args) => run('git', args)

export function ensureClean() {
  if (git('status', '--porcelain').trim()) throw new Error('Working tree has uncommitted changes. Commit or stash them first.')
}

export function push(tag) {
  run('git', ['push', 'origin', 'HEAD'], { inherit: true })
  if (tag) run('git', ['push', 'origin', tag], { inherit: true })
}

export const exists = (f) => existsSync(p(f))

// The marketing site lives in a sibling repo (clevera-ai/roozfir-site). Its /changelog/ page is rendered from its CHANGELOG.md.
export const SITE_DIR = process.env.ROOZFIR_SITE_DIR ?? join(ROOT, '..', 'roozfir-site')
export const siteGit = (...args) => run('git', args, { cwd: SITE_DIR })
export function ensureSiteClean() {
  if (!existsSync(join(SITE_DIR, '.git'))) throw new Error(`Site repo not found at ${SITE_DIR} (set ROOZFIR_SITE_DIR).`)
  if (siteGit('status', '--porcelain').trim()) throw new Error('The site repo has uncommitted changes. Commit or stash them first.')
}
export function pushSite() { run('git', ['push', 'origin', 'HEAD'], { inherit: true, cwd: SITE_DIR }) }
