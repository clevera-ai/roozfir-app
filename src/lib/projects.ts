import flags from '../config/flags.json'
import { update } from './store'
import { PROJECT_COLORS } from './util'
import { uid } from './util'

export interface NewProject { name: string; clientId: string; budget: number; description: string; billingContact: string }

/** Creates a project. With flags.slowSave it takes about 3 seconds, like a real backend call. Resolves with the new id. */
export function createProject(v: NewProject): Promise<string> {
  const id = uid('p')
  const run = () => update((s) => {
    s.projects.push({ id, name: v.name, clientId: v.clientId, budget: v.budget, stage: 'planned', color: PROJECT_COLORS[s.projects.length % PROJECT_COLORS.length], description: v.description, billingContact: v.billingContact || undefined, expenses: [] })
  })
  if (!flags.slowSave) { run(); return Promise.resolve(id) }
  return new Promise((resolve) => setTimeout(() => { run(); resolve(id) }, 3000))
}
