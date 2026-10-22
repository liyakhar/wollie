import type {
  BudgetCategory,
  FinanceTransaction,
  FinancialAccount,
  RecurringPayment,
} from './finance-demo'

export const BASIS_POINTS_TOTAL = 10_000

export type HouseholdRole = 'OWNER' | 'MEMBER'

export type HouseholdMember = {
  id: string
  name: string
  email?: string
  role: HouseholdRole
  householdShareBasisPoints: number
}

export type OwnershipShare = {
  memberId: string
  shareBasisPoints: number
}

export type HouseholdAccount = FinancialAccount & {
  ownership: OwnershipShare[]
  connectionStatus?: 'CONNECTED' | 'SYNCING' | 'NEEDS_RECONNECT' | 'FAILED' | 'DISABLED' | 'NOT_CONNECTED'
}

export type HouseholdTransaction = FinanceTransaction & {
  accountId?: string
}

export type HouseholdFinanceInput = {
  members: HouseholdMember[]
  accounts: HouseholdAccount[]
  transactions: HouseholdTransaction[]
  budget: BudgetCategory[]
  recurringPayments: RecurringPayment[]
}

export function validateBasisPointShares<T extends OwnershipShare>(shares: T[]): T[] {
  if (shares.length === 0) throw new Error('Add at least one ownership share.')

  const memberIds = new Set<string>()
  for (const share of shares) {
    if (memberIds.has(share.memberId)) {
      throw new Error('Each household member can appear only once.')
    }
    memberIds.add(share.memberId)

    if (!Number.isInteger(share.shareBasisPoints)) {
      throw new Error('Shares must use whole basis points.')
    }
    if (share.shareBasisPoints < 0 || share.shareBasisPoints > BASIS_POINTS_TOTAL) {
      throw new Error('Each share must be between 0% and 100%.')
    }
  }

  const total = shares.reduce((sum, share) => sum + share.shareBasisPoints, 0)
  if (total !== BASIS_POINTS_TOTAL) throw new Error('Shares must total 100%.')
  return shares
}

export function combineBasisPointShares(...shares: Array<number | null | undefined>) {
  const total = shares.reduce<number>((sum, share) => sum + (share ?? 0), 0)
  if (!Number.isInteger(total) || total < 0 || total > BASIS_POINTS_TOTAL) {
    throw new Error('Combined shares must stay between 0% and 100%.')
  }
  return total
}

export function buildMemberFinanceView(
  input: HouseholdFinanceInput,
  memberId: string,
) {
  const member = input.members.find((item) => item.id === memberId)
  if (!member) throw new Error('Household member not found.')

  const accountShares = new Map<string, number>()
  const accountNames = new Map<string, string>()
  const accounts = input.accounts.flatMap((account) => {
    const share = account.ownership.find((item) => item.memberId === memberId)?.shareBasisPoints ?? 0
    accountShares.set(account.id, share)
    accountNames.set(account.name, account.id)
    if (share === 0) return []
    return [{ ...account, balance: scaleAmount(account.balance, share) }]
  })

  const transactions = input.transactions.flatMap((transaction) => {
    const accountId = transaction.accountId || accountNames.get(transaction.account)
    const share = accountId ? accountShares.get(accountId) ?? 0 : 0
    if (share === 0) return []
    return [{ ...transaction, amount: scaleAmount(transaction.amount, share) }]
  })

  const householdShare = member.householdShareBasisPoints
  return {
    member,
    accounts,
    transactions,
    budget: input.budget.map((category) => ({
      ...category,
      allocated: scaleAmount(category.allocated, householdShare),
      spent: scaleAmount(category.spent, householdShare),
    })),
    recurringPayments: input.recurringPayments.map((payment) => ({
      ...payment,
      amount: scaleAmount(payment.amount, householdShare),
    })),
  }
}

export function scaleAmount(value: number, shareBasisPoints: number) {
  return Math.round(value * 100 * shareBasisPoints / BASIS_POINTS_TOTAL) / 100
}

export type IncomeSplit = {
  /** Average monthly income per member over the months looked at. */
  monthlyIncome: Record<string, number>
  /** Fair shares by income in whole percents, or null when no income was seen. */
  shares: Array<{ memberId: string; shareBasisPoints: number }> | null
  months: number
}

/**
 * Split shared costs by what each person earns. Income is money in that is
 * sorted as Income, over the last full calendar months, given to each person
 * by how much of the account they own.
 */
export function incomeSplit(
  input: {
    memberIds: string[]
    accounts: Array<{ id: string; ownership: OwnershipShare[] }>
    transactions: Array<Pick<FinanceTransaction, 'amount' | 'category' | 'date'> & { accountId?: string }>
  },
  referenceDate = new Date(),
  months = 3,
): IncomeSplit {
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
  const start = new Date(end.getFullYear(), end.getMonth() - months, 1)
  const ownership = new Map(input.accounts.map((account) => [account.id, account.ownership]))
  const totals = Object.fromEntries(input.memberIds.map((id) => [id, 0]))

  for (const transaction of input.transactions) {
    if (transaction.amount <= 0 || transaction.category.toLocaleLowerCase() !== 'income') continue
    const date = new Date(`${transaction.date.slice(0, 10)}T12:00:00`)
    if (!(date >= start && date < end)) continue
    for (const share of ownership.get(transaction.accountId ?? '') ?? []) {
      if (share.memberId in totals) {
        totals[share.memberId] += transaction.amount * share.shareBasisPoints / BASIS_POINTS_TOTAL
      }
    }
  }

  const monthlyIncome = Object.fromEntries(
    Object.entries(totals).map(([id, total]) => [id, Math.round(total / months * 100) / 100]),
  )
  const sum = Object.values(totals).reduce((a, b) => a + b, 0)
  if (sum <= 0 || input.memberIds.length === 0) return { monthlyIncome, shares: null, months }

  // Whole percents; the last person takes what rounding leaves so it adds up.
  let left = BASIS_POINTS_TOTAL
  const shares = input.memberIds.map((memberId, index) => {
    const share = index === input.memberIds.length - 1
      ? left
      : Math.round(totals[memberId] / sum * 100) * 100
    left -= share
    return { memberId, shareBasisPoints: share }
  })
  return { monthlyIncome, shares, months }
}
