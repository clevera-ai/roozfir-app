import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const p = (f) => join(ROOT, f)
export const readJson = (f) => JSON.parse(readFileSync(p(f), 'utf8'))
export const writeJson = (f, v) => writeFileSync(p(f), JSON.stringify(v, null, 2) + '\n')

export function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: opts.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'] })
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
