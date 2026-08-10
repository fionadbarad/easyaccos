// @vitest-environment happy-dom

/**
 * SADeadlineBanner — 112 lines of deadline arithmetic at 0 % (TST-9). The
 * banner is how a sole trader finds out an HMRC deadline is close; the tax
 * year attached to each deadline is the subtle part (you file 2025/26 by
 * 31 January 2027).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import SADeadlineBanner from '../SADeadlineBanner'
import { taxYearLabel } from '@/lib/tax/mileage'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function renderAt(iso: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
  return render(<SADeadlineBanner />)
}

describe('SADeadlineBanner', () => {
  it('stays hidden while the next deadline is more than 60 days away', () => {
    // If this fails, the banner nags all year and trains users to ignore the
    // one time it matters.
    const { container } = renderAt('2026-04-10T12:00:00Z') // next: 31 July, >60 days
    expect(container.innerHTML).toBe('')
  })

  it('attributes the 31 January deadline to the tax year filed, not the current one', () => {
    // If this fails, the banner tells the user to file the wrong year's
    // return — 2025/26 is filed by 31 January 2027.
    renderAt('2027-01-10T12:00:00Z')
    expect(screen.getByText(/Online return \+ tax payment due/)).toBeTruthy()
    expect(screen.getByText(new RegExp(taxYearLabel(2025).replace('/', '\\/')))).toBeTruthy()
    expect(screen.getByText(/deadline in 21 days/i)).toBeTruthy()
  })

  it('shows the 5 October registration deadline against the tax year that just ended', () => {
    // If this fails, a newly self-employed user is pointed at the wrong
    // registration window — 5 Oct 2026 covers a business started in 2025/26.
    renderAt('2026-09-20T12:00:00Z')
    expect(screen.getByText(/Register for Self Assessment/)).toBeTruthy()
    expect(screen.getByText(new RegExp(taxYearLabel(2025).replace('/', '\\/')))).toBeTruthy()
  })

  it('dismissing hides the banner and stays dismissed for the same deadline across remounts', () => {
    // If this fails, either the X does nothing or a dismissal for one
    // deadline suppresses every later one.
    const first = renderAt('2027-01-10T12:00:00Z')
    fireEvent.click(screen.getByLabelText('Dismiss'))
    expect(first.container.innerHTML).toBe('')

    // Same deadline, new mount: still dismissed.
    const again = render(<SADeadlineBanner />)
    expect(again.container.innerHTML).toBe('')

    // A different upcoming deadline is NOT suppressed by the old dismissal.
    cleanup()
    vi.setSystemTime(new Date('2027-07-10T12:00:00Z'))
    render(<SADeadlineBanner />)
    expect(screen.getByText(/Second payment on account due/)).toBeTruthy()
  })
})
