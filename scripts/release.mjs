#!/usr/bin/env node
// Usage:
//   npm run release -- <id> [--no-push]            apply releases/<id>.json
//   npm run release -- --revert <id> [--no-push]   commit that undoes it (new version + release)
//
// A release set is JSON: { id, title, release?, changelog[], ops[] | revertOf, revertTitle?, revertChangelog? }.
// ops are exact edits so a release diff stays small and readable:
//   { type: "json", file, path: [keys], from, to }       set a JSON value (must currently equal `from`)
//   { type: "text", file, from, to, all? }               replace text (must currently contain `from`)
// release:
//   true (default)  version bump, CHANGELOG.md entry, commit, tag, push, `gh release create`
//   false           commit + push only (no version bump, tag, changelog or GitHub release)
//   "site"          changelog entry in the site repo only (the /changelog/ page); the app repo is not touched
// revertOf: "t7" -> the set is the inverse of another set.
// A real release also writes its entry into the site repo (../roozfir-site/CHANGELOG.md) and commits + pushes it there,
// so https://roozfir.online/changelog/ shows it as soon as the site deploys.
// manifest/flows.json is regenerated for every commit so it always describes the new state of the app.
import { readFileSync, writeFileSync } from 'node:fs'
import { exists, git, ensureClean, ensureSiteClean, p, push, pushSite, readJson, run, SITE_DIR, siteGit, writeJson } from './lib.mjs'
import { join } from 'node:path'
import { writeManifest } from './manifest.mjs'

const args = process.argv.slice(2)
const noPush = args.includes('--no-push')
const revert = args.includes('--revert')
const id = args.find((a) => !a.startsWith('--'))
if (!id) { console.error('Usage: npm run release -- [--revert] <id> [--no-push]'); process.exit(1) }

const loadSet = (sid) => {
  const f = `releases/${sid}.json`
  if (!exists(f)) throw new Error(`No release set at ${f}`)
  return readJson(f)
}

/** Resolve a set to { ops, inverse } following revertOf. */
function resolve(set) {
  if (!set.revertOf) return { ops: set.ops ?? [], inverse: false }
  const target = resolve(loadSet(set.revertOf))
  return { ops: target.ops, inverse: !target.inverse }
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function applyOp(op, inverse) {
  const from = inverse ? op.to : op.from
  const to = inverse ? op.from : op.to
  if (op.type === 'json') {
    const doc = readJson(op.file)
    let node = doc
    for (const k of op.path.slice(0, -1)) node = node[k]
    const last = op.path[op.path.length - 1]
    if (!same(node[last], from)) throw new Error(`${op.file} ${op.path.join('.')}: expected ${JSON.stringify(from)}, found ${JSON.stringify(node[last])} (already applied?)`)
    node[last] = to
    writeJson(op.file, doc)
  } else if (op.type === 'text') {
    const src = readFileSync(p(op.file), 'utf8')
    if (!src.includes(from)) throw new Error(`${op.file}: text not found: ${JSON.stringify(from)} (already applied?)`)
    writeFileSync(p(op.file), op.all ? src.split(from).join(to) : src.replace(from, () => to))
  } else throw new Error(`Unknown op type ${op.type}`)
}

function bumpVersion() {
  const pkg = readJson('package.json')
  const [major, minor] = pkg.version.split('.').map(Number)
  const next = `${major}.${minor + 1}.0`
  pkg.version = next
  writeJson('package.json', pkg)
  if (exists('package-lock.json')) {
    const lock = readJson('package-lock.json')
    lock.version = next
    if (lock.packages?.['']) lock.packages[''].version = next
    writeJson('package-lock.json', lock)
  }
  return { version: next, tag: `v${major}.${minor + 1}` }
}

function prependChangelog(heading, title, bullets, file = p('CHANGELOG.md')) {
  const text = readFileSync(file, 'utf8')
  const entry = `## ${heading}\n\n${title}\n\n${bullets.map((b) => `- ${b}`).join('\n')}\n\n`
  const idx = text.indexOf('\n## ')
  writeFileSync(file, idx === -1 ? text.trimEnd() + '\n\n' + entry : text.slice(0, idx + 1) + entry + text.slice(idx + 1))
  return `${title}\n\n${bullets.map((b) => `- ${b}`).join('\n')}\n`
}

try {
  ensureClean()
  const set0 = loadSet(id)
  const needsSite = (set0.revertOf ? loadSet(set0.revertOf) : set0).release !== false
  if (needsSite) ensureSiteClean()
  const set = loadSet(id)
  const { ops, inverse: baseInverse } = resolve(set)
  const inverse = revert ? !baseInverse : baseInverse
  // Apply all ops; if one fails, restore the tree.
  try { for (const op of inverse ? [...ops].reverse() : ops) applyOp(op, inverse) }
  catch (e) { git('checkout', '--', '.'); throw e }

  const title = revert ? (set.revertTitle ?? `Reverted: ${set.title}`) : set.title
  const bullets = revert ? (set.revertChangelog ?? [`Reverts the previous change: ${set.title}.`]) : set.changelog ?? []
  // A set that points at another (revertOf), and any revert, follows the target's release flag.
  const targetSet = set.revertOf ? loadSet(set.revertOf) : set
  const mode = targetSet.release === undefined ? true : targetSet.release

  writeManifest()
  if (mode === false) {
    git('add', '-A')
    git('commit', '-m', `${revert ? 'Revert internal change' : 'Internal'}: ${title}\n\nRelease set: ${set.id}${revert ? ' (reverted)' : ''}. No user-facing change; no version, tag or release.`)
    console.log(`Committed (no version/tag/release): ${title}`)
    if (!noPush) push()
    else console.log('--no-push: not pushed.')
  } else if (mode === 'site') {
    const date = new Date().toISOString().slice(0, 10)
    prependChangelog(`News - ${date}`, title, bullets, join(SITE_DIR, 'CHANGELOG.md'))
    siteGit('add', '-A')
    siteGit('commit', '-m', `Changelog: ${title}\n\nRelease set: ${set.id}${revert ? ' (reverted)' : ''}. Changelog page entry only; no app version, tag or GitHub release.`)
    if (git('status', '--porcelain').trim()) { git('add', '-A'); git('commit', '-m', `Manifest refresh (${set.id})`) }
    console.log(`Committed changelog entry in the site repo (no version/tag/release): ${title}`)
    if (!noPush) pushSite()
    else console.log('--no-push: not pushed.')
  } else {
    const { version, tag } = bumpVersion()
    const date = new Date().toISOString().slice(0, 10)
    const notes = prependChangelog(`${tag} - ${date}`, title, bullets)
    prependChangelog(`${tag} - ${date}`, title, bullets, join(SITE_DIR, 'CHANGELOG.md'))
    siteGit('add', '-A')
    siteGit('commit', '-m', `Changelog ${tag}: ${title}`)
    git('add', '-A')
    git('commit', '-m', `Release ${tag}: ${title}\n\nRelease set: ${set.id}${revert ? ' (reverted)' : ''}. Version ${version}.`)
    git('tag', '-a', tag, '-m', `${tag}: ${title}`)
    console.log(`Committed and tagged ${tag} (${version}): ${title}`)
    if (!noPush) {
      push(tag)
      pushSite()
      run('gh', ['release', 'create', tag, '--title', `${tag}: ${title}`, '--notes', notes], { inherit: true })
    } else console.log('--no-push: nothing pushed (app or site), no GitHub release.')
  }
} catch (e) {
  console.error(`Release failed: ${e.message}`)
  process.exit(1)
}
