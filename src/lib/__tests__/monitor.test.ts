import { describe, expect, test, beforeEach } from 'vitest'
import {
  reportError,
  reportWarn,
  setMonitorTransport,
  __resetMonitor,
  type MonitorEvent,
} from '../monitor'

beforeEach(() => __resetMonitor())

function captureSink() {
  const events: MonitorEvent[] = []
  setMonitorTransport((e) => events.push(e))
  return events
}

describe('monitor', () => {
  test('forwards errors to the registered transport', () => {
    const events = captureSink()
    reportError('test.scope', new Error('boom'), { foo: 1 })
    expect(events).toHaveLength(1)
    expect(events[0]?.level).toBe('error')
    expect(events[0]?.scope).toBe('test.scope')
    expect(events[0]?.message).toBe('boom')
  })

  test('dedupes identical events within the window', () => {
    const events = captureSink()
    for (let i = 0; i < 5; i++) reportWarn('a.b', 'same message')
    expect(events).toHaveLength(1)
  })

  test('lets distinct scope/message pairs through', () => {
    const events = captureSink()
    reportWarn('a.b', 'one')
    reportWarn('a.b', 'two')
    reportWarn('c.d', 'one')
    expect(events).toHaveLength(3)
  })

  test('caps the burst rate so a hot loop cannot drown the sink', () => {
    const events = captureSink()
    // 200 unique messages; cap is 100 / minute.
    for (let i = 0; i < 200; i++) reportWarn('hot', `msg-${i}`)
    expect(events.length).toBeLessThanOrEqual(100)
  })

  test('a throwing transport does not propagate', () => {
    setMonitorTransport(() => {
      throw new Error('sink died')
    })
    expect(() => reportError('x', new Error('y'))).not.toThrow()
  })
})
