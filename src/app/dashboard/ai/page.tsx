import { redirect } from 'next/navigation'

/**
 * The AI Tax Advisory feature is switched off — see src/lib/ai-enabled.ts for
 * why (HMRC production-credentials review; it was the only route by which
 * customer financial data reached a third party).
 *
 * This redirects rather than 404s so existing bookmarks, and any link already
 * indexed by a search engine, land on the tool that actually answers the same
 * questions. The chat UI, its API routes and their tests are retained behind
 * the flag; restoring the page means restoring this route's previous contents.
 */
export default function AiAdvisoryRemoved() {
  redirect('/dashboard/learn')
}
