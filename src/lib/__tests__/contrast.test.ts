/**
 * WCAG 2.2 AA contrast floor for the palette.
 *
 * `dim` shipped at alpha 0.35, which measures 3.05:1 against the page
 * background — enough for large text only, while it is used for captions,
 * footers and eyebrow labels at body size. That is a 1.4.3 failure, and it is
 * the kind that reappears the moment somebody nudges a colour to "look right"
 * on their own monitor.
 *
 * These tests compute the real ratio from the token values, so the palette
 * cannot drift back under the threshold without CI saying so.
 */

import { describe, it, expect } from 'vitest'
import { C } from '@/styles/palette'

type RGB = [number, number, number]

const PAGE: RGB = [0x18, 0x18, 0x18] // C.bg      #181818
const CARD: RGB = [0x1c, 0x1d, 0x20] // C.surface #1C1D20

/** WCAG 2.x relative luminance. */
function luminance([r, g, b]: RGB): number {
  const lin = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(fg: RGB, bg: RGB): number {
  const a = luminance(fg)
  const b = luminance(bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** Flatten a translucent foreground onto an opaque background. */
function composite(fg: RGB, alpha: number, bg: RGB): RGB {
  return fg.map((f, i) => Math.round(alpha * f + (1 - alpha) * bg[i]!)) as RGB
}

/** Parse `#RRGGBB` or `rgba(r,g,b,a)` from the palette into colour + alpha. */
function parse(token: string): { rgb: RGB; alpha: number } {
  const hex = /^#([0-9a-f]{6})$/i.exec(token.trim())
  if (hex) {
    const n = parseInt(hex[1]!, 16)
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], alpha: 1 }
  }
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(
    token.trim(),
  )
  if (!rgba) throw new Error(`Unrecognised colour token: ${token}`)
  return {
    rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])],
    alpha: rgba[4] === undefined ? 1 : Number(rgba[4]),
  }
}

function ratioOn(token: string, bg: RGB): number {
  const { rgb, alpha } = parse(token)
  return contrast(composite(rgb, alpha, bg), bg)
}

const AA_BODY = 4.5 // WCAG 2.2 AA, normal-size text (1.4.3)
const AA_LARGE = 3.0 // AA, large text (>=18pt, or >=14pt bold)

describe('text tokens meet WCAG AA on both surfaces', () => {
  // Every one of these is used for body-size copy somewhere in the app, so all
  // three are held to the normal-text threshold rather than the large-text one.
  const bodyTokens: Array<[string, string]> = [
    ['white', C.white],
    ['muted', C.muted],
    ['dim', C.dim],
  ]

  for (const [name, token] of bodyTokens) {
    it(`${name} clears ${AA_BODY}:1 on the page background`, () => {
      expect(ratioOn(token, PAGE)).toBeGreaterThanOrEqual(AA_BODY)
    })

    it(`${name} clears ${AA_BODY}:1 on card surfaces`, () => {
      // Cards are lighter than the page, so they are the harder of the two.
      expect(ratioOn(token, CARD)).toBeGreaterThanOrEqual(AA_BODY)
    })
  }

  it('dim is specifically above the 3.05:1 it used to sit at', () => {
    // Guards the exact regression: alpha 0.35 measured 3.05:1 and passed only
    // as large text, while being used for small captions and footers.
    expect(ratioOn(C.dim, PAGE)).toBeGreaterThan(AA_LARGE)
    expect(ratioOn(C.dim, PAGE)).toBeGreaterThanOrEqual(AA_BODY)
  })
})

describe('status colours meet WCAG AA', () => {
  // These carry meaning — money in/out, warnings, errors — so they must be
  // readable, not merely distinguishable.
  const status: Array<[string, string]> = [
    ['green', C.green],
    ['red', C.red],
    ['amber', C.amber],
    ['blue', C.blue],
  ]

  for (const [name, token] of status) {
    it(`${name} clears ${AA_BODY}:1 on the page background`, () => {
      expect(ratioOn(token, PAGE)).toBeGreaterThanOrEqual(AA_BODY)
    })
  }
})

describe('the contrast maths itself', () => {
  it('gives 21:1 for black on white', () => {
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5)
  })

  it('gives 1:1 for a colour on itself', () => {
    expect(contrast([0x18, 0x18, 0x18], [0x18, 0x18, 0x18])).toBeCloseTo(1, 5)
  })

  it('parses both hex and rgba tokens', () => {
    expect(parse('#F4F5F8')).toEqual({ rgb: [244, 245, 248], alpha: 1 })
    expect(parse('rgba(244,245,248,0.48)')).toEqual({ rgb: [244, 245, 248], alpha: 0.48 })
  })
})
