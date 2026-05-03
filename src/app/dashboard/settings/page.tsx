'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Loader2, CheckCircle } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { BackupRestore } from '@/components/BackupRestore'

const inputCls = 'w-full bg-[#222326] border border-[rgba(244,245,248,0.07)] rounded-[4px] p-[9px_13px] text-[#F4F5F8] text-[0.9rem] outline-none'
const labelCls = 'block text-[rgba(244,245,248,0.42)] text-[0.75rem] uppercase tracking-[0.07em] mb-[0.35rem]'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1C1D20] border border-[rgba(244,245,248,0.07)] rounded-[8px] p-[1.75rem] mb-[1.25rem]">
      <h2 className="text-[#F4F5F8] text-[1.05rem] font-bold mb-[1.4rem]">{title}</h2>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      setName(u?.user_metadata?.name ?? '')
    })
  }, [supabase])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaved(false)
    await supabase.auth.updateUser({ data: { name } })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg('')
    if (pwForm.next !== pwForm.confirm) { setPwMsg('Passwords do not match.'); return }
    if (pwForm.next.length < 6) { setPwMsg('Password must be at least 6 characters.'); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    setPwSaving(false)
    if (error) setPwMsg(error.message)
    else { setPwMsg('Password updated successfully.'); setPwForm({ current: '', next: '', confirm: '' }) }
  }

  const initial = user?.email?.[0]?.toUpperCase() ?? '…'

  return (
    <div className="p-[clamp(1.5rem,4vw,2.5rem)] max-w-[680px]">
      <h1 className="text-[#F4F5F8] text-[clamp(1.5rem,3vw,2rem)] font-bold mb-[0.3rem]">
        Settings
      </h1>
      <p className="text-[rgba(244,245,248,0.42)] text-[0.875rem] mb-[2rem]">Manage your profile and account preferences</p>

      {/* Avatar */}
      <div className="flex items-center gap-[1rem] mb-[2rem]">
        <div className="w-[56px] h-[56px] rounded-[50%] bg-[rgba(244,245,248,0.06)] border border-[rgba(244,245,248,0.07)] flex items-center justify-center text-[#F4F5F8] text-[1.3rem] font-bold">
          {initial}
        </div>
        <div>
          <div className="text-[#F4F5F8] font-semibold">{name || user?.email}</div>
          <div className="text-[rgba(244,245,248,0.42)] text-[0.82rem]">{user?.email}</div>
        </div>
      </div>

      {/* Profile */}
      <Section title="Profile">
        <form onSubmit={saveProfile} className="flex flex-col gap-[1.1rem]">
          <div>
            <label className={labelCls}>Display Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={user?.email ?? ''} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
          </div>
          <div className="flex items-center gap-[0.75rem]">
            <button type="submit" disabled={saving}
              className={`bg-[#F4F5F8] text-[#181818] border-none rounded-[4px] p-[9px_22px] font-bold text-[0.875rem] flex items-center gap-[6px] ${saving ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
            {saved && <span className="flex items-center gap-[5px] text-[#4ADE80] text-[0.85rem]"><CheckCircle size={15} /> Saved</span>}
          </div>
        </form>
      </Section>

      {/* Password */}
      <Section title="Change Password">
        <form onSubmit={changePassword} className="flex flex-col gap-[1.1rem]">
          <div>
            <label className={labelCls}>New Password</label>
            <input type="password" value={pwForm.next} onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))} placeholder="Min. 6 characters" className={inputCls} minLength={6} required />
          </div>
          <div>
            <label className={labelCls}>Confirm New Password</label>
            <input type="password" value={pwForm.confirm} onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} placeholder="Repeat password" className={inputCls} minLength={6} required />
          </div>
          {pwMsg && (
            <div className={`p-[9px_13px] rounded-[4px] text-[0.85rem] ${pwMsg.includes('success') ? 'bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.3)] text-[#4ADE80]' : 'bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)] text-[#F87171]'}`}>
              {pwMsg}
            </div>
          )}
          <button type="submit" disabled={pwSaving}
            className={`bg-[#F4F5F8] text-[#181818] border-none rounded-[4px] p-[9px_22px] font-bold text-[0.875rem] flex items-center gap-[6px] w-fit ${pwSaving ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            {pwSaving ? <Loader2 size={15} className="animate-spin" /> : null}
            {pwSaving ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </Section>

      {/* Backup & Restore */}
      <Section title="Backup & Restore">
        <BackupRestore />
      </Section>

      {/* Account info */}
      <Section title="Account Info">
        <div className="flex flex-col gap-[0.75rem]">
          {[
            { label: 'User ID', value: user?.id ?? '—' },
            { label: 'Account Created', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
            { label: 'Plan', value: 'Free Forever' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between p-[9px_0] border-b border-[rgba(244,245,248,0.06)]">
              <span className="text-[rgba(244,245,248,0.42)] text-[0.875rem]">{label}</span>
              <span className={`text-[0.875rem] max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap ${label === 'Plan' ? 'text-[#F4F5F8]' : 'text-[#F4F5F8]'}`}>{value}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
