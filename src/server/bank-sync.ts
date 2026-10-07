import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import {
  type BankSyncStatus,
  type FinanceCategory,
  type FinanceTransaction,
  type FinancialAccount,
  type TransactionCategoryName,
} from '#/lib/finance-demo'
import {
  decryptCredential,
  encryptCredential,
  isEncryptedCredential,
} from '#/server/credential-crypto'
import { loadEnableBankingData } from '#/server/enable-banking-sync'
import { getFinanceHouseholdForUser } from '#/server/household-access.server'

export type BankSyncProviderId = 'demo' | 'simplefin' | 'synci' | 'enable-banking' | 'plaid'

const SIMPLEFIN_REQUEST_TIMEOUT_MS = 15_000
const MAX_SIMPLEFIN_TOKEN_LENGTH = 8_192

export type NormalizedBankConnection = {
  provider: BankSyncProviderId
  status: BankSyncStatus
  accounts: FinancialAccount[]
  transactions: FinanceTransaction[]
}
type SimpleFinResponse = {
  errlist?: SimpleFinError[]
  accounts?: SimpleFinAccount[]
}

type SimpleFinError = {
  code?: string
  msg?: string
}

type SimpleFinAccount = {
  id?: string
  name?: string
  org?: {
    name?: string
  }
  balance?: string | number
  currency?: string
  ['balance-date']?: number
  transactions?: SimpleFinTransaction[]
}

type SimpleFinTransaction = {
  id?: string
  posted?: number
  amount?: string | number
  description?: string
  payee?: string
  pending?: boolean
}

type SimpleFinConnectionRecord = {
  id: string
  userId: string
  workspaceId: string
  accessUrl: string
}

export type SimpleFinPersistenceSnapshot = {
  accounts: Array<{
    providerAccountId: string
    name: string
    institution: string
    accountType: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD'
    balanceMinor: number
    currency: string
    lastSyncedAt: Date
    transactions: Array<{
      providerTransactionId: string
      postedAt: Date
      description: string
      merchantName: string
      categoryName: FinanceCategory
      amountMinor: number
      currency: string
      status: 'PENDING' | 'CLEARED' | 'NEEDS_REVIEW'
    }>
  }>
}

export const getBankSyncState = createServerFn({ method: 'GET' }).handler(async () => {
  await requireBankSyncUser()
  return loadBankSyncState()
})

export const claimSimpleFinConnection = createServerFn({ method: 'POST' })
  .validator((data: { token: string }) => ({
    token: String(data?.token ?? ''),
  }))
  .handler(async ({ data }) => {
    if (process.env.NODE_ENV === 'production' && !isLiveBankSyncEnabled()) {
      throw new Error('Live bank sync is not enabled in production.')
    }

    const user = await requireBankSyncUser()
    const token = data.token.trim()

    if (!token) {
      throw new Error('Paste the SimpleFIN token to connect your accounts.')
    }
    if (token.length > MAX_SIMPLEFIN_TOKEN_LENGTH) {
      throw new Error('That SimpleFIN token is too long.')
    }

    const claimUrl = decodeSimpleFinToken(token)
    const response = await fetch(claimUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(SIMPLEFIN_REQUEST_TIMEOUT_MS),
      redirect: 'error',
    })

    if (response.status === 403) {
      throw new Error(
        'That SimpleFIN token was already used or expired. Create a fresh token and try again.',
      )
    }

    if (!response.ok) {
      throw new Error(`SimpleFIN claim failed: ${response.status}`)
    }

    const accessUrl = (await response.text()).trim()
    assertSimpleFinUrl(accessUrl, 'SimpleFIN Access URL')

    await saveUserSimpleFinAccessUrl(user.id, accessUrl)

    return loadBankSyncState()
  })

export const disconnectSimpleFinConnection = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await requireBankSyncUser()
    await deleteUserSimpleFinConnection(user.id)

    return loadBankSyncState()
  },
)

export const loadBankSyncState = createServerOnlyFn(
  async (): Promise<NormalizedBankConnection> => {
    const { getSessionUser } = await import('#/server/session.server')
    const user = await getSessionUser()
    const household = user ? await getFinanceHouseholdForUser(user.id) : null
    const european = user
      ? await loadEnableBankingData(user.id)
      : { accounts: [], transactions: [], lastSynced: 'Not connected' }

    let synced: NormalizedBankConnection
    if (!isLiveBankSyncEnabled()) {
      synced = await getSimpleFinConnection('', {
        disconnectedDescription: 'Live bank sync is currently disabled.',
      })
    } else {
      const userConnection = await getUserSimpleFinConnection()
      synced = userConnection
        ? await getSimpleFinConnection(
            userConnection.accessUrl,
            { disconnectedDescription: 'Connect a bank or card to start live sync.' },
            userConnection,
          )
        : await getSimpleFinConnection('', {
            disconnectedDescription: 'Connect a bank or card to start live sync.',
          })
    }

    if (household) {
      const persistedHousehold = await loadPersistedHouseholdSnapshot(household.workspaceId)
      if (persistedHousehold.accounts.length) return persistedHousehold
    }

    if (!european.accounts.length) return synced

    return {
      ...synced,
      status: {
        mode: 'live-connected',
        label: 'Connected',
        description: synced.status.mode === 'live-connected'
          ? 'North American and European accounts are connected.'
          : 'European bank accounts are connected through Enable Banking.',
        lastSynced: synced.status.mode === 'live-connected'
          ? synced.status.lastSynced
          : european.lastSynced,
        canConnectLive: true,
      },
      accounts: [...synced.accounts, ...european.accounts],
      transactions: [...synced.transactions, ...european.transactions],
    }
  },
)

export function isLiveBankSyncEnabled() {
  return process.env.ENABLE_LIVE_BANK_SYNC === 'true'
}

async function fetchSimpleFinAccountsFromUrl(accessUrl: string): Promise<SimpleFinResponse> {
  const request = buildSimpleFinAccountsRequest(accessUrl)
  const response = await fetch(request.url, {
    headers: request.authorization
      ? { Authorization: request.authorization }
      : undefined,
    signal: AbortSignal.timeout(SIMPLEFIN_REQUEST_TIMEOUT_MS),
    redirect: 'error',
  })

  if (!response.ok) {
    throw new Error(`SimpleFIN request failed: ${response.status}`)
  }

  const payload = (await response.json()) as SimpleFinResponse
  if (payload.errlist?.length) {
    const error = payload.errlist[0]
    throw new Error(error.msg || error.code || 'SimpleFIN returned an account error')
  }

  return payload
}

export function buildSimpleFinAccountsRequest(accessUrl: string) {
  if (!accessUrl) {
    throw new Error('SIMPLEFIN_ACCESS_URL is not set')
  }

  assertSimpleFinUrl(accessUrl, 'SimpleFIN Access URL')
  const url = new URL(accessUrl)
  const username = decodeURIComponent(url.username)
  const password = decodeURIComponent(url.password)
  url.username = ''
  url.password = ''

  if (!url.pathname.endsWith('/accounts')) {
    url.pathname = `${url.pathname.replace(/\/$/, '')}/accounts`
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  const requestedLookbackDays = Number(process.env.SIMPLEFIN_LOOKBACK_DAYS || 90)
  const lookbackDays = Number.isFinite(requestedLookbackDays)
    ? Math.min(730, Math.max(1, Math.floor(requestedLookbackDays)))
    : 90
  const startSeconds = nowSeconds - lookbackDays * 24 * 60 * 60

  if (!url.searchParams.has('start-date')) {
    url.searchParams.set('start-date', String(startSeconds))
  }
  if (!url.searchParams.has('end-date')) {
    url.searchParams.set('end-date', String(nowSeconds))
  }

  return {
    url: url.toString(),
    authorization:
      username || password
        ? `Basic ${base64Encode(`${username}:${password}`)}`
        : undefined,
  }
}

export function normalizeSimpleFinPayload(payload: SimpleFinResponse): {
  accounts: FinancialAccount[]
  transactions: FinanceTransaction[]
} {
  const accounts = payload.accounts ?? []

  return {
    accounts: accounts.map(normalizeSimpleFinAccount),
    transactions: accounts.flatMap((account) =>
      (account.transactions ?? []).map((transaction, index) =>
        normalizeSimpleFinTransaction(account, transaction, index),
      ),
    ),
  }
}

export function buildSimpleFinPersistenceSnapshot(
  payload: SimpleFinResponse,
  syncedAt = new Date(),
): SimpleFinPersistenceSnapshot {
  return {
    accounts: (payload.accounts ?? []).map((account, accountIndex) => {
      const providerAccountId =
        account.id?.trim() || account.name?.trim() || `simplefin-account-${accountIndex}`
      const accountType = inferAccountType(account)

      return {
        providerAccountId,
        name: account.name?.trim() || 'Bank account',
        institution: account.org?.name?.trim() || 'Connected bank',
        accountType:
          accountType === 'Credit card'
            ? 'CREDIT_CARD'
            : accountType === 'Savings'
              ? 'SAVINGS'
              : 'CHECKING',
        balanceMinor: Math.round(toAmount(account.balance) * 100),
        currency: account.currency?.trim().toUpperCase() || 'USD',
        lastSyncedAt: account['balance-date']
          ? new Date(account['balance-date'] * 1000)
          : syncedAt,
        transactions: (account.transactions ?? []).map((transaction, index) => {
          const amount = toAmount(transaction.amount)
          const merchantName = normalizeMerchant(transaction)

          return {
            providerTransactionId:
              transaction.id?.trim() ||
              `${providerAccountId}-${transaction.posted || 'pending'}-${index}`,
            postedAt: transaction.posted
              ? new Date(transaction.posted * 1000)
              : syncedAt,
            description: transaction.description?.trim() || merchantName,
            merchantName,
            categoryName: inferCategory(merchantName, amount),
            amountMinor: Math.round(amount * 100),
            currency: account.currency?.trim().toUpperCase() || 'USD',
            status: transaction.pending
              ? 'PENDING'
              : shouldReviewCategory(merchantName, amount)
                ? 'NEEDS_REVIEW'
                : 'CLEARED',
          }
        }),
      }
    }),
  }
}

function normalizeSimpleFinAccount(account: SimpleFinAccount): FinancialAccount {
  const balanceDate = formatSimpleFinDate(account['balance-date'])

  return {
    id: account.id || account.name || 'simplefin-account',
    name: account.name || 'Bank account',
    type: inferAccountType(account),
    balance: toAmount(account.balance),
    currency: account.currency?.trim().toUpperCase() || 'USD',
    institution: account.org?.name || 'Connected bank',
    lastSynced: balanceDate || 'Just now',
  }
}

function normalizeSimpleFinTransaction(
  account: SimpleFinAccount,
  transaction: SimpleFinTransaction,
  index: number,
): FinanceTransaction {
  const amount = toAmount(transaction.amount)
  const merchant = normalizeMerchant(transaction)

  return {
    id: transaction.id || `${account.id || 'simplefin'}-${transaction.posted || index}`,
    date: transaction.posted
      ? new Date(transaction.posted * 1000).toISOString()
      : 'Pending',
    merchant,
    account: account.name || 'Bank account',
    category: inferCategory(merchant, amount),
    amount,
    currency: account.currency?.trim().toUpperCase() || 'USD',
    status: transaction.pending
      ? 'pending'
      : shouldReviewCategory(merchant, amount)
        ? 'needs-review'
        : 'cleared',
  }
}

function inferAccountType(account: SimpleFinAccount): FinancialAccount['type'] {
  const name = `${account.name ?? ''} ${account.org?.name ?? ''}`.toLowerCase()
  if (name.includes('credit') || name.includes('card')) return 'Credit card'
  if (name.includes('saving')) return 'Savings'
  return 'Checking'
}

function inferCategory(merchant: string, amount: number): FinanceCategory {
  const text = merchant.toLowerCase()
  if (/\b(transfer|card payment|credit card payment|payment thank you|internal transfer)\b/.test(text)) {
    return 'Transfer'
  }
  if (amount > 0) return 'Income'
  if (text.includes('rent') || text.includes('mortgage')) return 'Housing'
  if (text.includes('whole foods') || text.includes('market') || text.includes('grocery')) {
    return 'Groceries'
  }
  if (text.includes('uber') || text.includes('lyft') || text.includes('transit')) {
    return 'Transport'
  }
  if (text.includes('figma') || text.includes('spotify') || text.includes('netflix')) {
    return 'Subscriptions'
  }
  if (text.includes('restaurant') || text.includes('cafe') || text.includes('coffee')) {
    return 'Dining'
  }
  return 'Shopping'
}

function shouldReviewCategory(merchant: string, amount: number) {
  if (amount >= 0) return false
  if (inferCategory(merchant, amount) !== 'Shopping') return false
  return !/\b(amazon|shop|store|retail|mall)\b/.test(merchant.toLowerCase())
}

function normalizeMerchant(transaction: SimpleFinTransaction) {
  return (
    transaction.payee?.trim() ||
    transaction.description?.trim() ||
    'Unknown merchant'
  )
}

function toAmount(value: string | number | undefined) {
  const amount = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

function formatSimpleFinDate(value?: number) {
  if (!value) return ''

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value * 1000))
}

function base64Encode(value: string) {
  if (typeof btoa === 'function') return btoa(value)
  return Buffer.from(value).toString('base64')
}

async function getSimpleFinConnection(
  accessUrl: string,
  options: { disconnectedDescription: string },
  connection?: SimpleFinConnectionRecord,
): Promise<NormalizedBankConnection> {
  if (!isLiveBankSyncEnabled() && !accessUrl) {
    return {
      provider: 'simplefin',
      status: {
        mode: 'live-disabled',
        label: 'Live sync off',
        description:
          'Live bank sync is disabled. Turn it on only when production credentials are ready.',
        lastSynced: 'Not connected',
        canConnectLive: true,
      },
      accounts: [],
      transactions: [],
    }
  }

  if (!accessUrl) {
    return {
      provider: 'simplefin',
      status: {
        mode: 'live-disabled',
        label: 'Not connected',
        description: options.disconnectedDescription,
        lastSynced: 'Not connected',
        canConnectLive: true,
      },
      accounts: [],
      transactions: [],
    }
  }

  try {
    const payload = await fetchSimpleFinAccountsFromUrl(accessUrl)
    const normalized = normalizeSimpleFinPayload(payload)

    if (connection) {
      await persistSimpleFinSnapshot(connection, payload)
    }

    return {
      provider: 'simplefin',
      status: {
        mode: 'live-connected',
        label: 'Live sync',
        description:
          normalized.accounts.length > 0
            ? 'Real accounts are connected through SimpleFIN.'
            : 'SimpleFIN responded, but no accounts were returned.',
        lastSynced: 'Just now',
        canConnectLive: true,
      },
      ...normalized,
    }
  } catch (error) {
    console.error('SimpleFIN sync failed:', error)
    const persisted = connection
      ? await loadPersistedSimpleFinSnapshot(connection).catch(() => ({
          accounts: [],
          transactions: [],
        }))
      : { accounts: [], transactions: [] }

    if (connection) {
      await recordFailedSimpleFinSync(connection, error).catch((recordError) => {
        console.error('Could not record SimpleFIN sync failure:', recordError)
      })
    }

    return {
      provider: 'simplefin',
      status: {
        mode: 'live-disabled',
        label: 'Sync needs attention',
        description: persisted.accounts.length
          ? 'SimpleFIN could not refresh. Showing your last successful sync.'
          : 'SimpleFIN is connected, but Wollie could not load accounts. Reconnect with a fresh token.',
        lastSynced: persisted.accounts.length ? 'Last saved sync' : 'Sync failed',
        canConnectLive: true,
      },
      ...persisted,
    }
  }
}

const requireBankSyncUser = createServerOnlyFn(async () => {
  const { requireFinanceHousehold } = await import('#/server/household-access.server')
  return (await requireFinanceHousehold()).user
})

const getUserSimpleFinConnection = createServerOnlyFn(async () => {
  const [{ getDb }, { getSessionUser }] = await Promise.all([
    import('#/server/db-access.server'),
    import('#/server/session.server'),
  ])
  const user = await getSessionUser()
  if (!user) return null

  const prisma = await getDb()
  const connection = await prisma.bankConnection.findFirst({
    where: {
      userId: user.id,
      provider: 'SIMPLEFIN',
      status: { in: ['CONNECTED', 'SYNCING', 'NEEDS_RECONNECT', 'FAILED'] },
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, userId: true, workspaceId: true, tokenRef: true },
  })

  if (!connection?.tokenRef) return null

  const encryptionSecret = getBankSyncEncryptionSecret()
  let accessUrl: string

  if (isEncryptedCredential(connection.tokenRef)) {
    try {
      accessUrl = await decryptCredential(connection.tokenRef, encryptionSecret)
    } catch (error) {
      console.error('Could not decrypt SimpleFIN credential:', error)
      await prisma.bankConnection.update({
        where: { id: connection.id },
        data: { status: 'NEEDS_RECONNECT' },
      })
      return null
    }
  } else {
    // Transparently migrate credentials written by pre-encryption builds.
    accessUrl = connection.tokenRef
    await prisma.bankConnection.update({
      where: { id: connection.id },
      data: {
        tokenRef: await encryptCredential(accessUrl, encryptionSecret),
      },
    })
  }

  return {
    id: connection.id,
    userId: connection.userId,
    workspaceId: connection.workspaceId,
    accessUrl,
  } satisfies SimpleFinConnectionRecord
})

const persistSimpleFinSnapshot = createServerOnlyFn(
  async (connection: SimpleFinConnectionRecord, payload: SimpleFinResponse) => {
    const { getDb } = await import('#/server/db-access.server')
    const prisma = await getDb()
    const syncedAt = new Date()
    const snapshot = buildSimpleFinPersistenceSnapshot(payload, syncedAt)
    return prisma.$transaction(async (tx) => {
      await tx.bankConnection.update({
        where: { id: connection.id },
        data: { status: 'SYNCING' },
      })
      let transactionsAdded = 0

      for (const account of snapshot.accounts) {
        const savedAccount = await tx.financialAccount.upsert({
          where: {
            bankConnectionId_providerAccountId: {
              bankConnectionId: connection.id,
              providerAccountId: account.providerAccountId,
            },
          },
          create: {
            workspaceId: connection.workspaceId,
            bankConnectionId: connection.id,
            providerAccountId: account.providerAccountId,
            name: account.name,
            institution: account.institution,
            type: account.accountType,
            currency: account.currency,
            balanceMinor: account.balanceMinor,
            lastSyncedAt: account.lastSyncedAt,
          },
          update: {
            name: account.name,
            institution: account.institution,
            type: account.accountType,
            currency: account.currency,
            balanceMinor: account.balanceMinor,
            lastSyncedAt: account.lastSyncedAt,
          },
        })

        const member = await tx.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: connection.workspaceId,
              userId: connection.userId,
            },
          },
          select: { id: true },
        })
        if (!member) throw new Error('Bank connection owner is not a household member.')
        const ownershipCount = await tx.accountOwnership.count({ where: { accountId: savedAccount.id } })
        if (ownershipCount === 0) {
          await tx.accountOwnership.create({
            data: { accountId: savedAccount.id, memberId: member.id, shareBasisPoints: 10_000 },
          })
        }

        for (const transaction of account.transactions) {
          const normalizedMerchantName = normalizeMerchantName(transaction.merchantName)
          const [category, merchant, existingTransaction] = await Promise.all([
            tx.transactionCategory.upsert({
              where: {
                workspaceId_name: {
                  workspaceId: connection.workspaceId,
                  name: transaction.categoryName,
                },
              },
              create: {
                workspaceId: connection.workspaceId,
                name: transaction.categoryName,
                system: true,
              },
              update: {},
            }),
            tx.merchant.upsert({
              where: {
                workspaceId_normalizedName: {
                  workspaceId: connection.workspaceId,
                  normalizedName: normalizedMerchantName,
                },
              },
              create: {
                workspaceId: connection.workspaceId,
                name: transaction.merchantName,
                normalizedName: normalizedMerchantName,
              },
              update: { name: transaction.merchantName },
            }),
            tx.financeTransaction.findUnique({
              where: {
                accountId_providerTransactionId: {
                  accountId: savedAccount.id,
                  providerTransactionId: transaction.providerTransactionId,
                },
              },
              select: { id: true },
            }),
          ])

          if (!existingTransaction) transactionsAdded += 1

          const savedRule = await tx.categoryRule.findFirst({
            where: {
              workspaceId: connection.workspaceId,
              merchantId: merchant.id,
            },
            select: { categoryId: true },
          })
          const categoryId = savedRule?.categoryId ?? category.id
          const status = transaction.status === 'PENDING'
            ? 'PENDING'
            : savedRule
              ? 'CLEARED'
              : transaction.status

          await tx.financeTransaction.upsert({
            where: {
              accountId_providerTransactionId: {
                accountId: savedAccount.id,
                providerTransactionId: transaction.providerTransactionId,
              },
            },
            create: {
              workspaceId: connection.workspaceId,
              accountId: savedAccount.id,
              categoryId,
              merchantId: merchant.id,
              providerTransactionId: transaction.providerTransactionId,
              postedAt: transaction.postedAt,
              description: transaction.description,
              amountMinor: transaction.amountMinor,
              currency: transaction.currency,
              status,
            },
            update: {
              categoryId,
              merchantId: merchant.id,
              postedAt: transaction.postedAt,
              description: transaction.description,
              amountMinor: transaction.amountMinor,
              currency: transaction.currency,
              status,
            },
          })
        }
      }

    const transactionsSeen = snapshot.accounts.reduce(
      (total, account) => total + account.transactions.length,
      0,
    )

    await Promise.all([
      tx.bankConnection.update({
        where: { id: connection.id },
        data: { status: 'CONNECTED', lastSyncedAt: syncedAt },
      }),
      tx.syncRun.create({
        data: {
          workspaceId: connection.workspaceId,
          bankConnectionId: connection.id,
          provider: 'SIMPLEFIN',
          status: 'SUCCESS',
          startedAt: syncedAt,
          finishedAt: new Date(),
          transactionsSeen,
          transactionsAdded,
        },
      }),
      ])
    }, { maxWait: 5_000, timeout: 60_000 })
  },
)

const loadPersistedSimpleFinSnapshot = createServerOnlyFn(
  async (connection: SimpleFinConnectionRecord) => {
    const { getDb } = await import('#/server/db-access.server')
    const prisma = await getDb()
    const savedAccounts = await prisma.financialAccount.findMany({
      where: { bankConnectionId: connection.id },
      include: {
        transactions: {
          include: { category: true, merchant: true },
          orderBy: { postedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const accounts: FinancialAccount[] = savedAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      type:
        account.type === 'CREDIT_CARD'
          ? 'Credit card'
          : account.type === 'SAVINGS'
            ? 'Savings'
            : 'Checking',
      balance: account.balanceMinor / 100,
      currency: account.currency,
      institution: account.institution || 'Connected bank',
      lastSynced: formatSavedDate(account.lastSyncedAt),
    }))

    const transactions: FinanceTransaction[] = savedAccounts
      .flatMap((account) =>
        account.transactions.map((transaction) => ({
          id: transaction.id,
          accountId: account.id,
          date: transaction.postedAt.toISOString(),
          merchant: transaction.merchant?.name || transaction.description,
          account: account.name,
          category: toFinanceCategory(transaction.category?.name),
          amount: transaction.amountMinor / 100,
          currency: transaction.currency,
          status:
            transaction.status === 'PENDING'
              ? ('pending' as const)
              : transaction.status === 'NEEDS_REVIEW'
                ? ('needs-review' as const)
                : ('cleared' as const),
          recurring: transaction.recurring,
        })),
      )

    return { accounts, transactions }
  },
)

const loadPersistedHouseholdSnapshot = createServerOnlyFn(async (
  workspaceId: string,
): Promise<NormalizedBankConnection> => {
  const { getDb } = await import('#/server/db-access.server')
  const prisma = await getDb()
  const [savedAccounts, connections] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { workspaceId },
      include: {
        ownershipShares: true,
        bankConnection: { select: { provider: true, status: true, lastSyncedAt: true } },
        transactions: {
          include: { category: true, merchant: true },
          orderBy: { postedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.bankConnection.findMany({
      where: { workspaceId, status: { not: 'DISABLED' } },
      select: { provider: true, status: true, lastSyncedAt: true },
    }),
  ])
  const latestSync = connections
    .map((connection) => connection.lastSyncedAt)
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => right.getTime() - left.getTime())[0]
  const attention = connections.filter((connection) =>
    connection.status === 'FAILED' || connection.status === 'NEEDS_RECONNECT',
  )
  const accounts: FinancialAccount[] = savedAccounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type === 'CREDIT_CARD' ? 'Credit card' : account.type === 'SAVINGS' ? 'Savings' : 'Checking',
    balance: account.balanceMinor / 100,
    currency: account.currency,
    institution: account.institution || 'Connected bank',
    lastSynced: formatSavedDate(account.lastSyncedAt),
    connectionStatus: account.bankConnection?.status || 'NOT_CONNECTED',
    ownership: account.ownershipShares.map((share) => ({
      memberId: share.memberId,
      shareBasisPoints: share.shareBasisPoints,
    })),
  }))
  const transactions: FinanceTransaction[] = savedAccounts
    .flatMap((account) => account.transactions.map((transaction) => ({
      id: transaction.id,
      accountId: account.id,
      date: transaction.postedAt.toISOString(),
      merchant: transaction.merchant?.name || transaction.description,
      account: account.name,
      category: toFinanceCategory(transaction.category?.name),
      amount: transaction.amountMinor / 100,
      currency: transaction.currency,
      status: transaction.status === 'PENDING'
        ? 'pending' as const
        : transaction.status === 'NEEDS_REVIEW'
          ? 'needs-review' as const
          : 'cleared' as const,
      recurring: transaction.recurring,
    })))
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
  const provider: BankSyncProviderId = connections.some((connection) => connection.provider === 'SYNCI')
    ? 'synci'
    : connections.some((connection) => connection.provider === 'ENABLE_BANKING')
      ? 'enable-banking'
      : 'simplefin'
  return {
    provider,
    status: {
      mode: connections.length ? 'live-connected' : 'live-disabled',
      label: attention.length ? 'Sync needs attention' : 'Connected',
      description: attention.length
        ? `${attention.length} bank connection${attention.length === 1 ? '' : 's'} need attention. Showing the last saved data.`
        : `${connections.length} household bank connection${connections.length === 1 ? '' : 's'} available.`,
      lastSynced: formatSavedDate(latestSync),
      canConnectLive: true,
    },
    accounts,
    transactions,
  }
})

const recordFailedSimpleFinSync = createServerOnlyFn(
  async (connection: SimpleFinConnectionRecord, error: unknown) => {
    const { getDb } = await import('#/server/db-access.server')
    const prisma = await getDb()
    const message = error instanceof Error ? error.message : 'Unknown SimpleFIN error'

    await Promise.all([
      prisma.bankConnection.update({
        where: { id: connection.id },
        data: { status: 'FAILED' },
      }),
      prisma.syncRun.create({
        data: {
          workspaceId: connection.workspaceId,
          bankConnectionId: connection.id,
          provider: 'SIMPLEFIN',
          status: 'FAILED',
          finishedAt: new Date(),
          errorCode: 'SIMPLEFIN_REFRESH_FAILED',
          errorMessage: message.slice(0, 500),
        },
      }),
    ])
  },
)

function normalizeMerchantName(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ')
  return normalized || 'unknown merchant'
}

function formatSavedDate(value?: Date | null) {
  if (!value) return 'Not synced'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(value)
}

function toFinanceCategory(value?: string | null): TransactionCategoryName {
  const category = value?.trim()
  // Keep household-defined category rules intact instead of coercing them to
  // Shopping before their envelope mapping is evaluated.
  return category || 'Shopping'
}

const saveUserSimpleFinAccessUrl = createServerOnlyFn(
  async (userId: string, accessUrl: string) => {
    const { getDb } = await import('#/server/db-access.server')
    const prisma = await getDb()
    const workspace = await getOrCreateFinanceWorkspace(userId)
    const encryptedAccessUrl = await encryptCredential(
      accessUrl,
      getBankSyncEncryptionSecret(),
    )
    const providerItemId = `${userId}:simplefin`
    const existing = await prisma.bankConnection.findFirst({
      where: {
        userId,
        provider: 'SIMPLEFIN',
      },
    })

    if (existing) {
      await prisma.bankConnection.update({
        where: { id: existing.id },
        data: {
          workspaceId: workspace.id,
          providerItemId,
          tokenRef: encryptedAccessUrl,
          status: 'CONNECTED',
          lastSyncedAt: new Date(),
        },
      })
      return
    }

    await prisma.bankConnection.create({
      data: {
        userId,
        workspaceId: workspace.id,
        provider: 'SIMPLEFIN',
        providerItemId,
        tokenRef: encryptedAccessUrl,
        status: 'CONNECTED',
        lastSyncedAt: new Date(),
      },
    })
  },
)

function getBankSyncEncryptionSecret() {
  const explicitSecret = process.env.BANK_SYNC_ENCRYPTION_KEY?.trim()
  if (explicitSecret) return explicitSecret

  if (process.env.NODE_ENV !== 'production') {
    const developmentFallback = process.env.BETTER_AUTH_SECRET?.trim()
    if (developmentFallback) return developmentFallback
  }

  throw new Error('BANK_SYNC_ENCRYPTION_KEY is required for bank sync.')
}

const deleteUserSimpleFinConnection = createServerOnlyFn(async (userId: string) => {
  const { getDb } = await import('#/server/db-access.server')
  const prisma = await getDb()
  await prisma.$transaction(async (tx) => {
    const lockedConnections = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "BankConnection"
      WHERE "userId" = ${userId}
        AND provider = 'SIMPLEFIN'::"FinanceConnectionProvider"
      FOR UPDATE
    `
    const lockedConnectionIds = lockedConnections.map((connection) => connection.id)

    const connections = await tx.bankConnection.findMany({
      where: { id: { in: lockedConnectionIds } },
      select: {
        id: true,
        accounts: { select: { id: true } },
      },
    })
    const connectionIds = connections.map((connection) => connection.id)
    const accountIds = connections.flatMap((connection) =>
      connection.accounts.map((account) => account.id),
    )

    if (connectionIds.length) {
      await tx.bankConnection.updateMany({
        where: { id: { in: connectionIds } },
        data: { status: 'DISABLED' },
      })
    }
    if (accountIds.length) {
      await tx.financeTransaction.deleteMany({
        where: { accountId: { in: accountIds } },
      })
      await tx.financialAccount.deleteMany({
        where: { id: { in: accountIds } },
      })
    }
    if (connectionIds.length) {
      await tx.syncRun.deleteMany({
        where: { bankConnectionId: { in: connectionIds } },
      })
    }
    await tx.bankConnection.deleteMany({
      where: { userId, provider: 'SIMPLEFIN' },
    })
  }, { maxWait: 5_000, timeout: 30_000 })
})

const getOrCreateFinanceWorkspace = createServerOnlyFn(async (userId: string) => {
  const { getOrCreateFinanceHousehold } = await import('#/server/household-access.server')
  const context = await getOrCreateFinanceHousehold(userId, 'EUR')
  return { id: context.workspaceId }
})

function decodeSimpleFinToken(token: string) {
  let decoded = ''

  try {
    decoded =
      typeof atob === 'function'
        ? atob(token)
        : Buffer.from(token, 'base64').toString('utf8')
  } catch {
    throw new Error('That SimpleFIN token is not valid.')
  }

  assertSimpleFinUrl(decoded, 'SimpleFIN claim URL')
  return decoded
}

export function assertSimpleFinUrl(value: string, label: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') {
      throw new Error(`${label} must use HTTPS.`)
    }
    if (url.username && label.includes('claim')) {
      throw new Error(`${label} must not contain embedded credentials.`)
    }
    const allowedHosts = new Set(
      (process.env.SIMPLEFIN_ALLOWED_HOSTS || 'bridge.simplefin.org')
        .split(',')
        .map((host) => host.trim().toLowerCase())
        .filter(Boolean),
    )
    if (!allowedHosts.has(url.hostname.toLowerCase())) {
      throw new Error(`${label} host is not allowed.`)
    }
    if (url.port && url.port !== '443') {
      throw new Error(`${label} must use the standard HTTPS port.`)
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('HTTPS') ||
        error.message.includes('embedded credentials') ||
        error.message.includes('host is not allowed') ||
        error.message.includes('standard HTTPS port'))
    ) {
      throw error
    }
    throw new Error(`${label} is not a valid URL.`)
  }
}
