'use client'

export const dynamic = 'force-dynamic'

import AuthForm from '@/features/auth/AuthForm'

export default function SignupPage() {
  return <AuthForm mode="signup" />
}
