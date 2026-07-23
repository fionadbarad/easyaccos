import { describe, expect, test } from 'vitest'
import { CategoriseRequestSchema, ChatRequestSchema } from '../schemas'

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

describe('ChatRequestSchema', () => {
  test('accepts a minimal request', () => {
    expect(ChatRequestSchema.safeParse({ message: 'Hi' }).success).toBe(true)
  })

  test('accepts a request with history', () => {
    const r = ChatRequestSchema.safeParse({
      message: 'follow-up',
      history: [
        { role: 'user', parts: [{ text: 'first message' }] },
        { role: 'model', parts: [{ text: 'first response' }] },
      ],
    })
    expect(r.success).toBe(true)
  })

  test('rejects message over 4000 chars', () => {
    const r = ChatRequestSchema.safeParse({ message: 'x'.repeat(4001) })
    expect(r.success).toBe(false)
  })

  test('rejects empty message', () => {
    expect(ChatRequestSchema.safeParse({ message: '' }).success).toBe(false)
    expect(ChatRequestSchema.safeParse({ message: '   ' }).success).toBe(false)
  })

  test('rejects history with bad role', () => {
    const r = ChatRequestSchema.safeParse({
      message: 'x',
      history: [{ role: 'system', parts: [{ text: 'x' }] }],
    })
    expect(r.success).toBe(false)
  })

  test('rejects history with empty parts', () => {
    const r = ChatRequestSchema.safeParse({
      message: 'x',
      history: [{ role: 'user', parts: [] }],
    })
    expect(r.success).toBe(false)
  })

  test('rejects history over 50 turns', () => {
    const history = Array.from({ length: 51 }, () => ({
      role: 'user' as const,
      parts: [{ text: 'x' }],
    }))
    expect(ChatRequestSchema.safeParse({ message: 'x', history }).success).toBe(false)
  })
})
