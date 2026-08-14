'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle, Loader2, Lock, Mail } from 'lucide-react'
import { isSupabaseConfigured } from '@/lib/supabase-browser'
import { getSupabaseBrowserClient } from '@/lib/supabase-client-singleton'
import { ICON } from '@/styles/type'

type Mode = 'login' | 'signup'

/** Password or one-click email link — both available in both modes. */
type Method = 'password' | 'link'

/** Which confirmation screen to show instead of the form, once a mail is sent. */
type Sent = 'link' | 'reset' | 'confirm' | null

interface AuthFormProps {
  mode: Mode
  /**
   * Where to land once authentication succeeds — both for the in-page redirect
   * and for the link mailed out by the email-link and sign-up flows.
   *
   * Defaults to '/dashboard', which is what /auth/login and /auth/signup want,
   * so those two pages are unaffected. It exists for the form embedded in
   * /dashboard/hmrc: a user who signs in to connect HMRC should come back to
   * the connect screen, not be dropped on the dashboard to find their way
   * there again.
   */
  nextPath?: string
}

const MIN_PASSWORD_LENGTH = 8

const COPY = {
  login: {
    subtitle: 'Sign in to sync your data across devices',
    guestCopy:
      'Every feature works instantly as a guest. Tax estimator, expenses, invoices, P&L — all free, no sign-up required.',
    dividerLabel: 'or sign in',
    passwordTitle: 'Sign in with password',
    passwordCopy: 'Use the email and password you signed up with.',
    passwordButton: 'Sign in',
    linkTitle: 'Sign in with email link',
    linkCopy:
      'Enter your email and we send a one-click sign-in link. No password needed — your data syncs across devices either way.',
    linkButton: 'Send sign-in link',
    linkSentCopy: 'Click it to open the dashboard with your account.',
    altPrefix: 'No account yet? ',
    altLabel: 'Create one',
    altHref: '/auth/signup',
    footer:
      'Signing in is only needed to save data between sessions. Every feature works without an account.',
  },
  signup: {
    subtitle: 'Create an account to save your data',
    guestCopy: 'Every feature works instantly as a guest — no sign-up required.',
    dividerLabel: 'or create an account',
    passwordTitle: 'Create an account',
    passwordCopy: `Pick a password of at least ${MIN_PASSWORD_LENGTH} characters. You can sign in with an email link instead at any time.`,
    passwordButton: 'Create account',
    linkTitle: 'Sign up with email link',
    linkCopy:
      "Enter your email and we'll send a one-click link. No password — your account is created on first click.",
    linkButton: 'Send sign-up link',
    linkSentCopy: 'Click it to create your account and open the dashboard.',
    altPrefix: 'Already have an account? ',
    altLabel: 'Sign in',
    altHref: '/auth/login',
    footer: null,
  },
} as const

const CARD_CLASS = 'bg-sa-surface border border-sa-border rounded-xl p-6'
const INPUT_CLASS =
  'w-full bg-sa-gray border border-sa-border rounded-lg px-3.5 py-3 text-sa-white text-body outline-none box-border focus:border-sa-focus transition-colors'
const LABEL_CLASS = 'text-sa-muted text-caption font-mono uppercase tracking-[0.08em] mb-1.5 block'

function Shell({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sa-black flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] animate-fade-in-up">
        <div className="text-center mb-8">
          <Link href="/" className="text-sa-white text-display font-bold no-underline">
            EasyAcco
          </Link>
          <p className="text-sa-muted text-meta mt-1.5">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

function MethodTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-body font-medium cursor-pointer transition-colors ${
        active
          ? 'bg-sa-gray border-sa-border text-sa-white'
          : 'bg-transparent border-transparent text-sa-muted hover:text-sa-white'
      }`}
    >
      {children}
    </button>
  )
}

function SubmitButton({
  loading,
  label,
  loadingLabel,
  disabled,
}: {
  loading: boolean
  label: string
  loadingLabel: string
  disabled: boolean
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-lg p-3 text-body font-semibold border border-sa-border transition-opacity ${
        disabled
          ? 'bg-sa-hover text-sa-muted cursor-default'
          : 'bg-sa-white text-sa-black cursor-pointer hover:opacity-88'
      }`}
    >
      {loading ? (
        <>
          <Loader2 size={ICON.sm} className="animate-spin" /> {loadingLabel}
        </>
      ) : (
        label
      )}
    </button>
  )
}

export default function AuthForm({ mode, nextPath = '/dashboard' }: AuthFormProps) {
  const copy = COPY[mode]
  const router = useRouter()

  // Guard: memoize Supabase client creation; returns null when unconfigured.
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [method, setMethod] = useState<Method>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState<Sent>(null)
  const [error, setError] = useState('')

  const redirectTo = () =>
    typeof window === 'undefined' ? undefined : `${window.location.origin}${nextPath}`

  /** Runs an auth call with shared loading/error plumbing. */
  async function run(fn: () => Promise<{ error: { message: string } | null }>) {
    if (!supabase) return false
    setError('')
    setLoading(true)
    const { error: err } = await fn()
    setLoading(false)
    if (err) {
      setError(err.message)
      return false
    }
    return true
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    if (mode === 'signup' && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    setError('')
    setLoading(true)
    const { data, error: err } =
      mode === 'signup'
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: redirectTo() },
          })
        : await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }
    // With email confirmation switched on, signUp returns no session — the user
    // has to click the link in their inbox before they are actually signed in.
    if (!data.session) {
      setSent('confirm')
      return
    }
    router.replace(nextPath)
    router.refresh()
  }

  async function submitMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    const ok = await run(() =>
      supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo() },
      }),
    )
    if (ok) setSent('link')
  }

  async function sendPasswordReset() {
    if (!supabase) return
    if (!email.trim()) {
      setError('Enter your email address first, then choose "Forgot password?".')
      return
    }
    const ok = await run(() =>
      supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          typeof window === 'undefined' ? undefined : `${window.location.origin}/auth/reset`,
      }),
    )
    if (ok) setSent('reset')
  }

  // When Supabase is not configured, show a fallback UI instead of crashing.
  if (!supabase || !isSupabaseConfigured) {
    return (
      <Shell subtitle={copy.subtitle}>
        <div className={`${CARD_CLASS} text-center`}>
          <div className="text-sa-white text-title font-semibold mb-2">No account needed</div>
          <p className="text-sa-muted text-meta mb-4">{copy.guestCopy}</p>
          <p className="text-sa-amber text-caption border border-sa-amber-line rounded-md px-3 py-2.5 mb-4">
            Cloud sync is not available. Running in local-only mode — your data is saved in this
            browser and will persist between visits.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-sa-white text-sa-black font-semibold text-body no-underline rounded-lg"
          >
            Open Dashboard <ArrowRight size={ICON.md} />
          </Link>
        </div>
      </Shell>
    )
  }

  if (sent) {
    const sentCopy = {
      link: copy.linkSentCopy,
      confirm: 'Click it to confirm your account, then you can sign in with your password.',
      reset: 'Click it to choose a new password.',
    }[sent]

    return (
      <Shell subtitle={copy.subtitle}>
        <div className={`${CARD_CLASS} text-center`}>
          <CheckCircle size={ICON.xl} className="text-sa-green mx-auto mb-4" />
          <h1 className="text-sa-white font-semibold text-lead mb-2">Check your inbox</h1>
          <p className="text-sa-muted text-meta">
            We sent an email to <strong className="text-sa-white">{email}</strong>. {sentCopy}
          </p>
          <button
            type="button"
            onClick={() => setSent(null)}
            className="ui-btn-ghost mt-5 text-caption"
          >
            Back to sign in
          </button>
        </div>
      </Shell>
    )
  }

  const passwordFlow = method === 'password'
  const submitDisabled =
    loading ||
    !email.trim() ||
    (passwordFlow && password.length < (mode === 'signup' ? MIN_PASSWORD_LENGTH : 1))

  return (
    <Shell subtitle={copy.subtitle}>
      <div className={`${CARD_CLASS} mb-5 text-center`}>
        <div className="text-sa-white text-title font-semibold mb-2">No account needed</div>
        <p className="text-sa-muted text-meta mb-4">{copy.guestCopy}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-sa-white text-sa-black font-semibold text-body no-underline rounded-lg"
        >
          Open Dashboard as Guest <ArrowRight size={ICON.md} />
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-sa-border" />
        <span className="text-sa-muted text-micro font-mono uppercase tracking-[0.1em]">
          {copy.dividerLabel}
        </span>
        <div className="flex-1 h-px bg-sa-border" />
      </div>

      <div className={CARD_CLASS}>
        <div className="flex gap-1 mb-5 bg-sa-tint rounded-lg p-1">
          <MethodTab active={passwordFlow} onClick={() => setMethod('password')}>
            <Lock size={ICON.sm} /> Password
          </MethodTab>
          <MethodTab active={!passwordFlow} onClick={() => setMethod('link')}>
            <Mail size={ICON.sm} /> Email link
          </MethodTab>
        </div>

        <h1 className="text-sa-white text-lead font-semibold mb-1.5">
          {passwordFlow ? copy.passwordTitle : copy.linkTitle}
        </h1>
        <p className="text-sa-muted text-meta mb-4">
          {passwordFlow ? copy.passwordCopy : copy.linkCopy}
        </p>

        <form
          onSubmit={passwordFlow ? submitPassword : submitMagicLink}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={LABEL_CLASS} htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className={INPUT_CLASS}
            />
          </div>

          {passwordFlow && (
            <div>
              <label className={LABEL_CLASS} htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={mode === 'signup' ? MIN_PASSWORD_LENGTH : undefined}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === 'signup' ? `At least ${MIN_PASSWORD_LENGTH} characters` : 'Your password'
                }
                className={INPUT_CLASS}
              />
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="bg-sa-red-tint border border-sa-red-line rounded-md px-3 py-2.5 text-sa-red text-meta"
            >
              {error}
            </div>
          )}

          <SubmitButton
            loading={loading}
            disabled={submitDisabled}
            label={passwordFlow ? copy.passwordButton : copy.linkButton}
            loadingLabel={passwordFlow ? 'Signing in…' : 'Sending link…'}
          />
        </form>

        {passwordFlow && mode === 'login' && (
          <button
            type="button"
            onClick={sendPasswordReset}
            disabled={loading}
            className="ui-btn-ghost mt-3.5 text-caption"
          >
            Forgot password?
          </button>
        )}
      </div>

      <p className="text-center text-sa-muted text-caption mt-6">
        {copy.altPrefix}
        <Link href={copy.altHref} className="text-sa-white no-underline font-medium">
          {copy.altLabel}
        </Link>
      </p>

      {copy.footer && <p className="text-center text-sa-dim text-caption mt-3">{copy.footer}</p>}
    </Shell>
  )
}
