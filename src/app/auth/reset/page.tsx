'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-client-singleton'
import { ICON } from '@/styles/type'

const MIN_PASSWORD_LENGTH = 8

const CARD_CLASS = 'bg-sa-surface border border-sa-border rounded-xl p-6'
const INPUT_CLASS =
  'w-full bg-sa-gray border border-sa-border rounded-lg px-3.5 py-3 text-sa-white text-body outline-none box-border focus:border-sa-focus transition-colors'
const LABEL_CLASS = 'text-sa-muted text-caption font-mono uppercase tracking-[0.08em] mb-1.5 block'

/**
 * Landing page for the password-recovery email link. Supabase puts the user in
 * a temporary recovery session when they arrive here, which is what lets
 * updateUser() set a new password without the old one.
 */
export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  // 'checking' until we know whether the recovery link produced a session;
  // 'expired' covers both a stale link and an unconfigured Supabase project.
  const [status, setStatus] = useState<'checking' | 'recovering' | 'expired'>(
    supabase ? 'checking' : 'expired',
  )
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? 'recovering' : 'expired')
    })
  }, [supabase])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }

    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setDone(true)
  }

  return (
    <div className="min-h-screen bg-sa-black flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] animate-fade-in-up">
        <div className="text-center mb-8">
          <Link href="/" className="text-sa-white text-display font-bold no-underline">
            EasyAcco
          </Link>
          <p className="text-sa-muted text-meta mt-1.5">Choose a new password</p>
        </div>

        {status === 'checking' && (
          <div className={`${CARD_CLASS} text-center text-sa-muted text-meta`}>
            <Loader2 size={ICON.md} className="animate-spin mx-auto mb-3" />
            Checking your recovery link…
          </div>
        )}

        {done && (
          <div className={`${CARD_CLASS} text-center`}>
            <CheckCircle size={ICON.xl} className="text-sa-green mx-auto mb-4" />
            <h1 className="text-sa-white font-semibold text-lead mb-2">Password updated</h1>
            <p className="text-sa-muted text-meta mb-5">
              You are signed in — your new password works from the next sign-in onwards.
            </p>
            <button
              type="button"
              onClick={() => {
                router.replace('/dashboard')
                router.refresh()
              }}
              className="ui-btn-primary w-full"
            >
              Open Dashboard
            </button>
          </div>
        )}

        {status === 'expired' && !done && (
          <div className={`${CARD_CLASS} text-center`}>
            <h1 className="text-sa-white font-semibold text-lead mb-2">Link expired</h1>
            <p className="text-sa-muted text-meta mb-5">
              This recovery link is no longer valid. Request a new one from the sign-in page.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center w-full px-5 py-3 bg-sa-white text-sa-black font-semibold text-body no-underline rounded-lg"
            >
              Back to sign in
            </Link>
          </div>
        )}

        {status === 'recovering' && !done && (
          <form onSubmit={submit} className={`${CARD_CLASS} flex flex-col gap-3.5`}>
            <div>
              <label className={LABEL_CLASS} htmlFor="new-password">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="confirm-password">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat the new password"
                className={INPUT_CLASS}
              />
            </div>

            {error && (
              <div
                role="alert"
                className="bg-sa-red-tint border border-sa-red-line rounded-md px-3 py-2.5 text-sa-red text-meta"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className={`flex items-center justify-center gap-2 rounded-lg p-3 text-body font-semibold border border-sa-border transition-opacity ${
                loading || !password || !confirm
                  ? 'bg-sa-hover text-sa-muted cursor-default'
                  : 'bg-sa-white text-sa-black cursor-pointer hover:opacity-88'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={ICON.sm} className="animate-spin" /> Updating…
                </>
              ) : (
                'Update password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
