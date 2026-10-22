/**
 * Answers from the first-open questions. Kept in the browser until the person
 * has an account, then used once to set up payday, goals and the partner invite.
 */
export type SetupAnswers = {
  partner: boolean | null
  /** Day of the month, null for "it changes", undefined when skipped. */
  payday: number | null | undefined
  goals: string[]
}

const KEY = 'wollie_setup'

/** Monthly amounts and icons for the goals people can pick. */
export const SETUP_GOALS: Record<string, { name: string; icon: string; monthly: number }> = {
  'A home': { name: 'Home', icon: 'home', monthly: 500 },
  Travel: { name: 'Travel', icon: 'plane', monthly: 100 },
  'Safety net': { name: 'Safety net', icon: 'shield', monthly: 200 },
  'A car': { name: 'Car', icon: 'car', monthly: 150 },
}

export function saveSetupAnswers(answers: SetupAnswers) {
  try {
    localStorage.setItem(KEY, JSON.stringify(answers))
  } catch {
    // Private mode or blocked storage: setup simply starts empty.
  }
}

/** Reads the answers once and forgets them. */
export function takeSetupAnswers(): SetupAnswers | null {
  try {
    const raw = localStorage.getItem(KEY)
    localStorage.removeItem(KEY)
    return raw ? (JSON.parse(raw) as SetupAnswers) : null
  } catch {
    return null
  }
}
