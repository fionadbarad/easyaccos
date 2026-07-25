// The HMRC screens used to carry their own colour table with a slightly
// different grey, green and red than the rest of the app (and keys — panel/ok/
// fail — that the shared palette never had, so those styles silently resolved
// to `undefined`). They now use the shared palette like every other screen.
export { C } from '@/styles/palette'

export const monoFont = 'var(--font-geist-mono), monospace'
