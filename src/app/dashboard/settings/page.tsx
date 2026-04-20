'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Loader2, CheckCircle } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { BackupRestore } from '@/components/BackupRestore'

const C = { bg: '#181818', deep: '#222326', card: '#1C1D20', white: '#F4F5F8', text: '#F4F5F8', muted: 'rgba(244,245,248,0.42)', border: 'rgba(244,245,248,0.07)' }

const inputStyle = { width: '100%', background: C.deep, border: `1px solid ${C.border}`, borderRadius: '4px', padding: '9px 13px', color: C.text, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const }
const labelStyle = { display: 'block', color: C.muted, fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '0.35rem' }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '1.75rem', marginBottom: '1.25rem' }}>
      <h2 style={{ color: C.white, fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.4rem' }}>{title}</h2>
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
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '680px' }}>
      <h1 style={{ color: C.text, fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 700, marginBottom: '0.3rem' }}>
        Settings
      </h1>
      <p style={{ color: C.muted, fontSize: '0.875rem', marginBottom: '2rem' }}>Manage your profile and account preferences</p>

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(244,245,248,0.06)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white, fontSize: '1.3rem', fontWeight: 700 }}>
          {initial}
        </div>
        <div>
          <div style={{ color: C.text, fontWeight: 600 }}>{name || user?.email}</div>
          <div style={{ color: C.muted, fontSize: '0.82rem' }}>{user?.email}</div>
        </div>
      </div>

      {/* Profile */}
      <Section title="Profile">
        <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={labelStyle}>Display Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={user?.email ?? ''} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button type="submit" disabled={saving}
              style={{ background: C.white, color: '#181818', border: 'none', borderRadius: '4px', padding: '9px 22px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
            {saved && <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#4ADE80', fontSize: '0.85rem' }}><CheckCircle size={15} /> Saved</span>}
          </div>
        </form>
      </Section>

      {/* Password */}
      <Section title="Change Password">
        <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={labelStyle}>New Password</label>
            <input type="password" value={pwForm.next} onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))} placeholder="Min. 6 characters" style={inputStyle} minLength={6} required />
          </div>
          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <input type="password" value={pwForm.confirm} onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} placeholder="Repeat password" style={inputStyle} minLength={6} required />
          </div>
          {pwMsg && (
            <div style={{ padding: '9px 13px', borderRadius: '4px', background: pwMsg.includes('success') ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${pwMsg.includes('success') ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`, color: pwMsg.includes('success') ? '#4ADE80' : '#F87171', fontSize: '0.85rem' }}>
              {pwMsg}
            </div>
          )}
          <button type="submit" disabled={pwSaving}
            style={{ background: C.white, color: '#181818', border: 'none', borderRadius: '4px', padding: '9px 22px', fontWeight: 700, cursor: pwSaving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { label: 'User ID', value: user?.id ?? '—' },
            { label: 'Account Created', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
            { label: 'Plan', value: 'Free Forever' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid rgba(244,245,248,0.06)` }}>
              <span style={{ color: C.muted, fontSize: '0.875rem' }}>{label}</span>
              <span style={{ color: label === 'Plan' ? C.white : C.text, fontSize: '0.875rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
