import { describe, expect, test } from 'vitest'
import { CategoriseRequestSchema } from '../schemas'

describe('CategoriseRequestSchema', () => {
  test('accepts a valid request', () => {
    const r = CategoriseRequestSchema.safeParse({ description: 'Adobe CC', amount: 54.99 })
    expect(r.success).toBe(true)
  })

  test('amount is optional', () => {
    const r = CategoriseRequestSchema.safeParse({ description: 'Train ticket' })
    expect(r.success).toBe(true)
  })

  test('rejects empty description', () => {
    const r = CategoriseRequestSchema.safeParse({ description: '   ' })
    expect(r.success).toBe(false)
  })

  test('rejects description over 500 chars', () => {
    const r = CategoriseRequestSchema.safeParse({ description: 'x'.repeat(501) })
    expect(r.success).toBe(false)
  })

  test('rejects negative amount', () => {
    const r = CategoriseRequestSchema.safeParse({ description: 'X', amount: -1 })
    expect(r.success).toBe(false)
  })

  test('rejects NaN/Infinity amount', () => {
    expect(CategoriseRequestSchema.safeParse({ description: 'X', amount: NaN }).success).toBe(false)
    expect(CategoriseRequestSchema.safeParse({ description: 'X', amount: Infinity }).success).toBe(
      false,
    )
  })

  test('rejects non-string description', () => {
    const r = CategoriseRequestSchema.safeParse({ description: 123 })
    expect(r.success).toBe(false)
  })
})
