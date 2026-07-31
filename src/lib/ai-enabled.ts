/**
 * Master switch for every AI feature, defaulting to OFF.
 *
 * WHY THIS EXISTS
 * ---------------
 * HMRC declined production credentials for easyacco.uk partly under "you must
 * not share customers' personal data without their consent". The AI adviser
 * was the only reason a third party (Google, via the Gemini API) appeared in
 * the data-processing story at all — everything else in the app is the user,
 * Supabase and HMRC. Disabling it makes the answer to that question simply
 * "we don't share with anyone else", which needs no defending.
 *
 * There was also an inconsistency worth not re-shipping: the assistant
 * introduced itself as "your personal tax advisor" while the site disclaims
 * giving advice. For software seeking HMRC recognition that is a contradiction
 * a reviewer can reasonably seize on.
 *
 * WHY A FLAG RATHER THAN DELETION
 * -------------------------------
 * The feature works and is well tested. Once recognition is granted, turning
 * it back on is one environment variable rather than a re-implementation.
 *
 * WHY THIS IS NOT `isFlagEnabled` FROM feature-flags.ts
 * ----------------------------------------------------
 * That helper honours a per-device `localStorage` override, which is right for
 * a UI preference and WRONG here: it would let a caller re-enable a
 * data-sharing feature from their own browser. This reads the build-time
 * environment only, so the API routes below can rely on it as a genuine
 * server-side gate. The routes check it and return 404 when off, which is what
 * makes the privacy notice's "we do not send anything to Google" true of the
 * deployed configuration rather than merely true of the UI.
 *
 * TO RE-ENABLE: set NEXT_PUBLIC_EA_AI=1, then restore the Google/Gemini rows in
 * /privacy and the "AI Features & Third-Party Processing" section of /security.
 * Those disclosures and this flag must move together — see docs/COMPLIANCE.md.
 */
const RAW = process.env.NEXT_PUBLIC_EA_AI

/** True only when AI features have been deliberately switched on. */
export const AI_ENABLED: boolean = RAW === '1' || RAW?.toLowerCase() === 'true'
