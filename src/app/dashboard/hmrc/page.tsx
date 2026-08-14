'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthForm from '@/features/auth/AuthForm'
import { isSupabaseConfigured } from '@/lib/supabase-browser'
import { getSupabaseBrowserClient } from '@/lib/supabase-client-singleton'
import { UserAuthSection } from './UserAuthSection'
import { MtdItSubmitSection } from './MtdItSubmitSection'
import { MtdVatSubmitSection } from './MtdVatSubmitSection'
import { Section, SectionHeader, Button, ResultPane } from './HmrcComponents'
import { monoFont, C } from './theme'
import { T } from '@/styles/type'

type ProbeResult = { ok: boolean; stage?: string; message?: string; [key: string]: unknown }

function AppAuthSection() {
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<ProbeResult | null>(null)

  async function runProbe() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/hmrc/hello', { cache: 'no-store' })
      const json = await res.json()
      setResult(json)
    } catch (err) {
      setResult({
        ok: false,
        stage: 'env',
        message: err instanceof Error ? err.message : 'Network error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section>
      <SectionHeader
        kicker="phase 1 · application auth"
        title="OAuth2 client_credentials probe"
        sub="Server-side round-trip against HMRC sandbox."
      />
      <Button onClick={runProbe} disabled={loading}>
        {loading ? 'Calling sandbox…' : 'Run probe'}
      </Button>
      {result && (
        <ResultPane
          ok={result.ok}
          label={result.ok ? '[OK]  Round-trip succeeded' : `[FAIL]  stage=${result.stage}`}
          body={result}
        />
      )}
    </Section>
  )
}

/**
 * Why the connect flow needs an account, said before the user clicks anything.
 *
 * Also surfaces ?hmrc_error=not_signed_in, which /api/hmrc/auth/start sets when
 * it turns a signed-out visitor away. UserAuthSection renders that param too,
 * but it only mounts once signed in — so without this the redirect would land
 * on a screen that never mentions why.
 */
function SignedOutNotice() {
  const sp = useSearchParams()
  const turnedAway = sp.get('hmrc_error') === 'not_signed_in'

  return (
    <Section>
      <SectionHeader
        kicker="phase 2 · user auth"
        title="Sign in to connect HMRC"
        sub="An HMRC connection is tied to an easyacco account. The authority you grant HMRC is stored against the account that granted it, so submissions are attributed to the right taxpayer — which means we need to know who you are before sending you to HMRC's consent screen. The rest of the dashboard keeps working as a guest."
      />
      {turnedAway && (
        <div
          role="alert"
          style={{
            color: C.amber,
            fontSize: T.caption,
            fontFamily: monoFont,
            border: `1px solid ${C.border}`,
            borderRadius: '4px',
            padding: '0.6rem 0.75rem',
            marginBottom: '0.75rem',
            lineHeight: 1.55,
          }}
        >
          [HELD] You are not signed in, so the connection was stopped before HMRC was contacted — no
          authority was granted. Sign in below and try again.
        </div>
      )}
      <AuthForm mode="login" nextPath="/dashboard/hmrc" />
    </Section>
  )
}

export default function HmrcPage() {
  // Three states, not two. `undefined` means the session has not resolved yet
  // and NOTHING is rendered — a signed-in user must never see the sign-in form
  // flash before their own screens replace it. Seeded lazily rather than
  // written from the effect: with no Supabase configured the answer is known at
  // first render, and an effect write would cost a second render and trip
  // react-hooks/set-state-in-effect.
  const [signedIn, setSignedIn] = useState<boolean | undefined>(() =>
    isSupabaseConfigured ? undefined : false,
  )

  useEffect(() => {
    if (!isSupabaseConfigured) return
    // The singleton, not a fresh createClient(): a second GoTrueClient on the
    // same storage key is unsafe.
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return
    let mounted = true
    // getUser(), never getSession() — getSession only reads the cookie, and
    // this decides whether the HMRC surface is shown at all (docs/AUDIT.md
    // SEC-8).
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (mounted) setSignedIn(Boolean(data.user))
      })
      .catch(() => {
        if (mounted) setSignedIn(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="page-shell">
      <div style={{ maxWidth: '820px', marginBottom: '1.5rem' }}>
        <div
          style={{
            color: C.muted,
            fontSize: T.micro,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: '6px',
            fontFamily: monoFont,
          }}
        >
          hmrc · sandbox integration
        </div>
        <h1
          style={{
            color: C.white,
            fontSize: T.h2,
            fontWeight: 600,
            letterSpacing: '-0.03em',
          }}
        >
          HMRC Sandbox
        </h1>
      </div>

      {signedIn === false && (
        <Suspense fallback={null}>
          <SignedOutNotice />
        </Suspense>
      )}

      {signedIn === true && (
        <>
          <Suspense fallback={null}>
            <UserAuthSection />
          </Suspense>
          <MtdItSubmitSection />
          <MtdVatSubmitSection />
          <AppAuthSection />
        </>
      )}
    </div>
  )
}
