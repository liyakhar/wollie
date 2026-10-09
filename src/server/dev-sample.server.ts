import { getDb } from '#/server/db-access.server'
import { devLoginEnabled } from '#/server/dev-login'

/** Bump when the sample changes; older dev workspaces are reseeded once. */
const SAMPLE_VERSION = 'Sample household v3'
const PARTNER_EMAIL = 'sam.partner@wollie.local'

/**
 * The dev account (dev@wollie.local) gets a sample household so every screen has
 * something to show: six months of spending for two people with different banks,
 * monthly budgets, and two savings goals that are paid by transfers on payday.
 */
export async function ensureDevSampleData(userId: string, workspaceId: string) {
  if (!devLoginEnabled()) return
  const prisma = await getDb()
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  if (user?.email !== 'dev@wollie.local') return
  const workspace = await prisma.budgetWorkspace.findUnique({ where: { id: workspaceId }, select: { name: true, userId: true } })
  if (!workspace || workspace.userId !== userId) return
  if (workspace.name === SAMPLE_VERSION) return

  // Start clean: this workspace only ever holds sample data.
  await prisma.financeTransaction.deleteMany({ where: { workspaceId } })
  await prisma.recurringPayment.deleteMany({ where: { workspaceId } })
  await prisma.categoryBudget.deleteMany({ where: { workspaceId } })
  await prisma.savingsGoal.deleteMany({ where: { workspaceId } })
  await prisma.financialAccount.deleteMany({ where: { workspaceId } })
  await prisma.budgetWorkspace.update({ where: { id: workspaceId }, data: { currency: 'EUR', paydayDay: null, name: SAMPLE_VERSION } })

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  const at = (monthsAgo: number, day: number) => new Date(now.getFullYear(), now.getMonth() - monthsAgo, day, 12)

  // Two people, two banks.
  const owner = await prisma.workspaceMember.update({ where: { workspaceId_userId: { workspaceId, userId } }, data: { householdShareBasisPoints: 5_000 } })
  const partnerUser = await prisma.user.upsert({
    where: { email: PARTNER_EMAIL },
    update: {},
    create: { id: `sample-partner-${workspaceId}`, name: 'Sam', email: PARTNER_EMAIL, emailVerified: false },
  })
  const partner = await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId: partnerUser.id } },
    update: {},
    create: { workspaceId, userId: partnerUser.id, role: 'MEMBER', householdShareBasisPoints: 5_000 },
  })

  const account = async (name: string, institution: string, type: 'CHECKING' | 'SAVINGS', balance: number, memberId?: string) => {
    const created = await prisma.financialAccount.create({
      data: { workspaceId, name, institution, type, currency: 'EUR', balanceMinor: Math.round(balance * 100), lastSyncedAt: now },
    })
    if (memberId) {
      await prisma.accountOwnership.create({ data: { accountId: created.id, memberId, shareBasisPoints: 10_000 } })
    }
    return created.id
  }
  const mine = await account('Everyday account', 'Example Bank', 'CHECKING', 2_846.12, owner?.id)
  await account('Savings', 'Example Bank', 'SAVINGS', 21_400, owner?.id)
  const sams = await account("Sam's account", 'North Bank', 'CHECKING', 1_912.4, partner.id)

  const names = ['Income', 'Housing', 'Groceries', 'Dining', 'Transport', 'Shopping', 'Subscriptions', 'Health', 'Savings', 'Fun']
  const cats: Record<string, string> = {}
  for (const name of names) {
    const category = await prisma.transactionCategory.upsert({
      where: { workspaceId_name: { workspaceId, name } },
      update: {},
      create: { workspaceId, name },
    })
    cats[name] = category.id
  }

  const merchants: Record<string, string> = {}
  const merchant = async (name: string) => {
    if (merchants[name]) return merchants[name]
    const created = await prisma.merchant.upsert({
      where: { workspaceId_normalizedName: { workspaceId, normalizedName: name.toLowerCase() } },
      update: {},
      create: { workspaceId, name, normalizedName: name.toLowerCase() },
    })
    merchants[name] = created.id
    return created.id
  }

  // Small seeded random, so the sample looks the same every time.
  let seed = 7
  const rand = () => {
    seed = (seed * 16_807) % 2_147_483_647
    return (seed - 1) / 2_147_483_646
  }
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)]
  const between = (low: number, high: number) => Math.round((low + rand() * (high - low)) * 100) / 100

  type Row = { accountId: string; name: string; category: string; amount: number; date: Date; recurring?: boolean }
  const rows: Row[] = []
  const add = (row: Row) => {
    if (row.date.getTime() <= today.getTime()) rows.push(row)
  }

  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo -= 1) {
    const days = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0).getDate()
    // Payday, bills and the monthly saving.
    add({ accountId: mine, name: 'Salary', category: 'Income', amount: 3_200, date: at(monthsAgo, 1) })
    add({ accountId: sams, name: 'Salary', category: 'Income', amount: 2_650, date: at(monthsAgo, 1) })
    add({ accountId: mine, name: 'Rent', category: 'Housing', amount: -1_400, date: at(monthsAgo, 1), recurring: true })
    add({ accountId: mine, name: 'To Savings · House', category: 'Savings', amount: -1_000, date: at(monthsAgo, 2) })
    // One month Travel was skipped; this month it is still to do.
    if (monthsAgo !== 3 && monthsAgo !== 0) {
      add({ accountId: mine, name: 'To Savings · Travel', category: 'Savings', amount: -200, date: at(monthsAgo, 2) })
    }
    add({ accountId: mine, name: 'City gym', category: 'Fun', amount: -39, date: at(monthsAgo, 5), recurring: true })
    add({ accountId: sams, name: 'Mobile plan', category: 'Subscriptions', amount: -24.99, date: at(monthsAgo, 12), recurring: true })
    add({ accountId: mine, name: 'Streaming service', category: 'Subscriptions', amount: -12.99, date: at(monthsAgo, 18), recurring: true })
    add({ accountId: mine, name: 'Monthly rail pass', category: 'Transport', amount: -49, date: at(monthsAgo, 3) })

    // Everyday spending, spread over the month.
    for (let day = 2; day <= days; day += 1) {
      const date = at(monthsAgo, day)
      if (day % 3 === 0) add({ accountId: pick([mine, sams]), name: pick(['Fresh Market', 'Corner grocer', 'Bio shop']), category: 'Groceries', amount: -between(18, 74), date })
      if (day % 4 === 1) add({ accountId: pick([mine, sams, sams]), name: pick(['Noodle bar', 'Corner café', 'Pizza place', 'Sushi bar']), category: 'Dining', amount: -between(9, 46), date })
      if (day % 7 === 3) add({ accountId: pick([mine, sams]), name: pick(['Book store', 'Home store', 'Pharmacy', 'Online shop']), category: 'Shopping', amount: -between(12, 95), date })
      if (day % 6 === 2) add({ accountId: pick([mine, sams]), name: pick(['City taxi', 'Ride share', 'Train ticket']), category: 'Transport', amount: -between(8, 32), date })
      if (day % 15 === 7) add({ accountId: pick([mine, sams]), name: pick(['Cinema', 'Concert hall', 'Museum']), category: 'Fun', amount: -between(14, 48), date })
    }
    if (monthsAgo === 2) add({ accountId: sams, name: 'Dentist', category: 'Health', amount: -120, date: at(monthsAgo, 14) })
  }
  // This month: a long train trip pushes Transport over its budget.
  add({ accountId: mine, name: 'Train to the coast', category: 'Transport', amount: -86.4, date: at(0, Math.max(1, Math.min(now.getDate(), 6))) })

  for (const row of rows) {
    await prisma.financeTransaction.create({
      data: {
        workspaceId,
        accountId: row.accountId,
        categoryId: cats[row.category],
        merchantId: await merchant(row.name),
        postedAt: row.date,
        description: row.name,
        amountMinor: Math.round(row.amount * 100),
        currency: 'EUR',
        recurring: Boolean(row.recurring),
      },
    })
  }

  for (const [category, limit] of [['Groceries', 600], ['Dining', 300], ['Transport', 120], ['Shopping', 250], ['Fun', 120]] as const) {
    await prisma.categoryBudget.create({ data: { workspaceId, categoryId: cats[category], limitMinor: limit * 100 } })
  }

  const started = at(6, 20)
  await prisma.savingsGoal.create({
    data: { workspaceId, name: 'House', icon: 'home', targetMinor: 6_000_000, monthlyMinor: 100_000, startingMinor: 1_400_000, createdAt: started },
  })
  await prisma.savingsGoal.create({
    data: { workspaceId, name: 'Travel', icon: 'plane', targetMinor: 300_000, monthlyMinor: 20_000, startingMinor: 60_000, createdAt: new Date(started.getTime() + 1000) },
  })

  const next = (day: number) => {
    const date = new Date(now.getFullYear(), now.getMonth(), day, 12)
    if (date < today) date.setMonth(date.getMonth() + 1)
    return date
  }
  await prisma.recurringPayment.createMany({
    data: [
      { workspaceId, name: 'Rent', amountMinor: 140_000, currency: 'EUR', cadence: 'MONTHLY', nextDate: next(1), categoryId: cats.Housing, confirmed: true },
      { workspaceId, name: 'City gym', amountMinor: 3_900, currency: 'EUR', cadence: 'MONTHLY', nextDate: next(5), categoryId: cats.Fun, confirmed: true },
      { workspaceId, name: 'Mobile plan', amountMinor: 2_499, currency: 'EUR', cadence: 'MONTHLY', nextDate: next(12), categoryId: cats.Subscriptions, confirmed: true },
      { workspaceId, name: 'Streaming service', amountMinor: 1_299, currency: 'EUR', cadence: 'MONTHLY', nextDate: next(18), categoryId: cats.Subscriptions, confirmed: true },
    ],
  })
}
