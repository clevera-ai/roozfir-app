#!/usr/bin/env node
// Usage: npm run auth -- <none|password|password_code|password_totp> [--no-push]
// Sets src/config/auth.json, refreshes manifest/flows.json, commits ("Auth mode: <mode>") and pushes. No version bump or release.
import { ensureClean, git, push, readJson, writeJson } from './lib.mjs'
import { writeManifest } from './manifest.mjs'

const args = process.argv.slice(2)
const noPush = args.includes('--no-push')
const mode = args.find((a) => !a.startsWith('--'))
const MODES = ['none', 'password', 'password_code', 'password_totp']
if (!MODES.includes(mode)) { console.error(`Usage: npm run auth -- <${MODES.join('|')}> [--no-push]`); process.exit(1) }

try {
  ensureClean()
  const cfg = readJson('src/config/auth.json')
  if (cfg.mode === mode) { console.log(`Auth mode is already "${mode}". Nothing to do.`); process.exit(0) }
  const from = cfg.mode
  cfg.mode = mode
  writeJson('src/config/auth.json', cfg)
  writeManifest()
  git('add', '-A')
  git('commit', '-m', `Auth mode: ${mode}\n\nSign-in changes from "${from}" to "${mode}".`)
  console.log(`Committed: Auth mode ${from} -> ${mode}`)
  if (!noPush) push()
  else console.log('--no-push: not pushed.')
} catch (e) {
  console.error(`Auth change failed: ${e.message}`)
  process.exit(1)
}
