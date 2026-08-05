import { redirect } from 'next/navigation'

/**
 * The AI Tax Advisory feature is switched off — see src/lib/ai-enabled.ts for
 * why (HMRC production-credentials review; it was the only route by which
 * customer financial data reached a third party).
 *
 * This redirects rather than 404s so existing bookmarks, and any link already
 * indexed by a search engine, land on the tool that actually answers the same
 * questions.
 *
 * The backing API route (/api/ai/chat) has since been deleted outright rather
 * than left behind the flag, so restoring this page is no longer a matter of
 * reinstating its previous contents — the route, its request schemas and its
 * bands-drift-guard entry all have to come back with it. See the "AI features
 * switched off" section of docs/COMPLIANCE.md.
 */
export default function AiAdvisoryRemoved() {
  redirect('/dashboard/learn')
}
