import { getDb } from '#/server/db-access.server'
import { devLoginEnabled } from '#/server/dev-login'

/**
 * The dev account (dev@wollie.local) gets a sample household so every screen has
 * something to show. Runs once: only when the workspace has no accounts yet.
 */
export async function ensureDevSampleData(userId: string, workspaceId: string) {
  if (!devLoginEnabled()) return
  const prisma = await getDb()
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  if (user?.email !== 'dev@wollie.local') return
  const existing = await prisma.financialAccount.count({ where: { workspaceId } })
  if (existing > 0) return

  await prisma.budgetWorkspace.update({ where: { id: workspaceId }, data: { currency: 'EUR' } })

  const now = new Date()
  const day = (offset: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() - offset)
    d.setHours(12, 0, 0, 0)
    return d
  }
  const monthDay = (n: number) => new Date(now.getFullYear(), now.getMonth(), n, 12)

  const checking = await prisma.financialAccount.create({
    data: { workspaceId, name: 'Everyday account', institution: 'Example Bank', type: 'CHECKING', currency: 'EUR', balanceMinor: 573448, lastSyncedAt: now },
  })
  await prisma.financialAccount.create({
    data: { workspaceId, name: 'Savings', institution: 'Example Bank', type: 'SAVINGS', currency: 'EUR', balanceMinor: 820000, lastSyncedAt: now },
  })

  const names = ['Groceries', 'Dining', 'Transport', 'Shopping', 'Subscriptions', 'Housing', 'Income']
  const cats: Record<string, string> = {}
  for (const name of names) {
    const c = await prisma.transactionCategory.upsert({
      where: { workspaceId_name: { workspaceId, name } },
      update: {},
      create: { workspaceId, name },
    })
    cats[name] = c.id
  }

  const merchants: Record<string, string> = {}
  const merchant = async (name: string) => {
    if (merchants[name]) return merchants[name]
    const m = await prisma.merchant.upsert({
      where: { workspaceId_normalizedName: { workspaceId, normalizedName: name.toLowerCase() } },
      update: {},
      create: { workspaceId, name, normalizedName: name.toLowerCase() },
    })
    merchants[name] = m.id
    return m.id
  }

  const txns: Array<[string, string, number, Date, boolean?]> = [
    ['Bakery', 'Groceries', -4.2, day(0)],
    ['City Rail', 'Transport', -3.1, day(0)],
    ['Noodle bar', 'Dining', -14.5, day(1)],
    ['Fresh Market', 'Groceries', -42.1, day(2)],
    ['Pharmacy', 'Shopping', -18.9, day(4)],
    ['Streaming service', 'Subscriptions', -6.69, day(4), true],
    ['Rail pass', 'Transport', -168.4, day(3)],
    ['Fresh Market', 'Groceries', -58.2, day(8)],
    ['Corner café', 'Dining', -9.8, day(9)],
    ['Rent', 'Housing', -980, monthDay(1), true],
    ['Salary', 'Income', 3200, monthDay(1)],
  ]
  for (const [name, cat, amount, postedAt, recurring] of txns) {
    await prisma.financeTransaction.create({
      data: {
        workspaceId,
        accountId: checking.id,
        categoryId: cats[cat],
        merchantId: await merchant(name),
        postedAt,
        description: name,
        amountMinor: Math.round(amount * 100),
        currency: 'EUR',
        recurring: Boolean(recurring),
      },
    })
  }

  for (const [cat, limit] of [['Groceries', 400], ['Dining', 250], ['Transport', 150], ['Shopping', 300]] as const) {
    await prisma.categoryBudget.upsert({
      where: { categoryId: cats[cat] },
      update: { limitMinor: limit * 100 },
      create: { workspaceId, categoryId: cats[cat], limitMinor: limit * 100 },
    })
  }

  await prisma.savingsGoal.createMany({
    data: [
      { workspaceId, name: 'Travel', icon: 'plane', targetMinor: 300000, monthlyMinor: 20000 },
      { workspaceId, name: 'Safety cushion', icon: 'shield', targetMinor: 500000, monthlyMinor: 12000 },
    ],
  })

  const nextFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1, 12)
  await prisma.recurringPayment.createMany({
    data: [
      { workspaceId, name: 'Rent', amountMinor: 98000, currency: 'EUR', cadence: 'MONTHLY', nextDate: nextFirst, categoryId: cats.Housing, confirmed: true },
      { workspaceId, name: 'Streaming service', amountMinor: 669, currency: 'EUR', cadence: 'MONTHLY', nextDate: new Date(now.getFullYear(), now.getMonth() + 1, 4, 12), categoryId: cats.Subscriptions, confirmed: true },
    ],
  })
}
