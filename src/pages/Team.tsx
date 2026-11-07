import { useState, type FormEvent } from 'react'
import { t } from '../lib/copy'
import { update, useStore } from '../lib/store'
import { Badge, Button, Checkbox, Modal, PageHeader, RowActions, SelectField, Tabs, TextField, toast } from '../components/ui'
import { EMAIL_RE, uid } from '../lib/util'
import { PERMISSIONS, ROLES, type Role } from '../lib/seed'

const tabs = [{ to: '/team', label: 'Members', end: true }, { to: '/team/permissions', label: 'Permissions' }]

export function Team() {
  const { members } = useStore()
  const [dialog, setDialog] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('Member')
  const [error, setError] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address.')
    if (members.some((m) => m.email.toLowerCase() === email.trim().toLowerCase())) return setError('That person is already on the team.')
    update((s) => { s.members.push({ id: uid('m'), name: email.trim().split('@')[0], email: email.trim(), role, status: 'invited' }) })
    toast(`Invitation sent to ${email.trim()}`); setDialog(false); setEmail(''); setError('')
  }
  return (
    <>
      <PageHeader title="Team" actions={<Button variant="primary" onClick={() => setDialog(true)}>{t('team.invite')}</Button>} />
      <Tabs items={tabs} />
      <div className="overflow-x-auto rounded-xl border border-line bg-surface"><table className="w-full text-sm">
        <thead className="border-b border-line bg-soft text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{members.map((m) => (
          <tr key={m.id} className="group border-b border-line last:border-0 hover:bg-soft">
            <td className="px-4 py-3"><p className="font-medium">{m.name}</p><p className="text-xs text-muted">{m.email}</p></td>
            <td className="px-4 py-3">{m.role === 'Admin' ? 'Admin' : (
              <select aria-label={`Role for ${m.name}`} value={m.role} onChange={(e) => update((s) => { s.members.find((x) => x.id === m.id)!.role = e.target.value as Role })} className="rounded-ui border border-line bg-surface px-2 py-1">{ROLES.filter((r) => r !== 'Admin').map((r) => <option key={r}>{r}</option>)}</select>)}</td>
            <td className="px-4 py-3"><Badge tone={m.status === 'active' ? 'green' : 'amber'}>{m.status === 'active' ? 'Active' : 'Invited'}</Badge></td>
            <td className="px-4 py-3"><RowActions>
              {m.status === 'invited' && <Button size="sm" aria-label={`Resend invitation to ${m.name}`} onClick={() => toast(`Invitation resent to ${m.email}`)}>Resend</Button>}
              {m.role !== 'Admin' && <Button size="sm" variant="ghost" aria-label={`Remove ${m.name}`} onClick={() => { update((s) => { s.members = s.members.filter((x) => x.id !== m.id) }); toast(`Removed ${m.name}`, () => update((s) => { s.members.push(m) })) }}>Remove</Button>}
            </RowActions></td>
          </tr>))}</tbody></table></div>
      {dialog && (
        <Modal title={t('team.invite')} onClose={() => setDialog(false)} onSubmit={submit} footer={<><Button onClick={() => setDialog(false)}>Cancel</Button><Button type="submit" variant="primary">Send invitation</Button></>}>
          <TextField label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)}>{ROLES.filter((r) => r !== 'Admin').map((r) => <option key={r}>{r}</option>)}</SelectField>
          <p className="text-xs text-muted">Roles decide what they can do. Fine-tune them under Permissions.</p>
        </Modal>)}
    </>
  )
}

export function Permissions() {
  const { permissions } = useStore()
  const [draft, setDraft] = useState(permissions)
  const dirty = JSON.stringify(draft) !== JSON.stringify(permissions)
  return (
    <>
      <PageHeader title="Team" actions={<Button variant="primary" disabled={!dirty} onClick={() => { update((s) => { s.permissions = draft }); toast('Permissions saved') }}>Save permissions</Button>} />
      <Tabs items={tabs} />
      <p className="mb-4 text-sm text-muted">Choose what each role can do. Admins always have every permission.</p>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface"><table className="w-full text-sm">
        <thead className="border-b border-line bg-soft text-xs uppercase text-muted"><tr><th className="px-4 py-3 text-left">Permission</th>{ROLES.map((r) => <th key={r} className="px-4 py-3 text-center">{r}</th>)}</tr></thead>
        <tbody>{PERMISSIONS.map((p) => (
          <tr key={p} className="border-b border-line last:border-0"><th scope="row" className="px-4 py-3 text-left font-medium">{p}</th>
            {ROLES.map((r) => (
              <td key={r} className="px-4 py-3 text-center"><Checkbox hideLabel label={`${r}: ${p}`} disabled={r === 'Admin'} checked={draft[r][p]}
                onChange={(e) => setDraft({ ...draft, [r]: { ...draft[r], [p]: e.target.checked } })} /></td>))}</tr>))}</tbody></table></div>
    </>
  )
}
