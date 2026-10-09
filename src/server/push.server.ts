import { getDb } from '#/server/db-access.server'
import type { MoneyOverview } from '#/lib/money-overview'

export type PushAlert = { key: string; title: string; body: string }

function money(value: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value)
}

/** What is worth a buzz right now. Each alert has a key that is unique per pay cycle. */
export function computeAlerts(overview: MoneyOverview, now = new Date()): PushAlert[] {
  const alerts: PushAlert[] = []
  const cycle = overview.cycle.start
  for (const budget of overview.budgets) {
    if (budget.state === 'over') {
      alerts.push({
        key: `budget-over:${budget.category}:${cycle}`,
        title: `Over budget: ${budget.category}`,
        body: `${money(Math.abs(budget.left), overview.currency)} over your ${money(budget.limit, overview.currency)} budget.`,
      })
    } else if (budget.state === 'low') {
      alerts.push({
        key: `budget-low:${budget.category}:${cycle}`,
        title: `${budget.category} is almost used up`,
        body: `${money(budget.left, overview.currency)} left of ${money(budget.limit, overview.currency)} until payday.`,
      })
    }
  }
  for (const bill of overview.bills) {
    const days = Math.ceil((new Date(bill.date).getTime() - now.getTime()) / 86_400_000)
    if (days >= 0 && days <= 3) {
      alerts.push({
        key: `bill:${bill.id}:${bill.date}`,
        title: days === 0 ? `${bill.name} is due today` : `${bill.name} is due in ${days} day${days === 1 ? '' : 's'}`,
        body: money(bill.amount, overview.currency),
      })
    }
  }
  // Savings: a nudge in the first days after payday, and a thank-you when it lands.
  const toMove = overview.goals.filter((goal) => goal.due > 0)
  if (toMove.length && overview.month.elapsed <= 3) {
    const total = toMove.reduce((sum, goal) => sum + goal.due, 0)
    alerts.push({
      key: `save:${cycle}`,
      title: `Time to save ${money(total, overview.currency)}`,
      body: toMove.map((goal) => `${goal.name} ${money(goal.due, overview.currency)}`).join(', ') + '. Move it to savings and Wollie ticks it off.',
    })
  }
  for (const goal of overview.goals) {
    if (goal.thisMonth.auto && goal.thisMonth.state === 'saved') {
      alerts.push({
        key: `saved:${goal.id}:${cycle}`,
        title: `Saved for ${goal.name}`,
        body: `${money(goal.thisMonth.amount, overview.currency)} moved this month. ${goal.target ? `${money(goal.saved, overview.currency)} of ${money(goal.target, overview.currency)} so far.` : ''}`.trim(),
      })
    }
  }
  return alerts
}

/* ------------------------------ APNs ------------------------------ */

export function apnsConfigured() {
  return Boolean(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_PRIVATE_KEY)
}

async function apnsJwt() {
  const { createSign } = await import('node:crypto')
  const b64 = (value: object | Buffer) => Buffer.from(value instanceof Buffer ? value : JSON.stringify(value)).toString('base64url')
  const head = b64({ alg: 'ES256', kid: process.env.APNS_KEY_ID })
  const body = b64({ iss: process.env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) })
  const signer = createSign('SHA256')
  signer.update(`${head}.${body}`)
  const key = (process.env.APNS_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
  const signature = signer.sign({ key, dsaEncoding: 'ieee-p1363' })
  return `${head}.${body}.${b64(signature)}`
}

/** Sends one alert to one phone. Returns 'gone' when Apple says the token is dead. */
async function sendApns(token: string, alert: PushAlert): Promise<'sent' | 'gone' | 'failed'> {
  const { connect } = await import('node:http2')
  const host = process.env.APNS_ENV === 'sandbox' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com'
  const jwt = await apnsJwt()
  return new Promise((resolve) => {
    const client = connect(host)
    client.on('error', () => resolve('failed'))
    const request = client.request({
      ':method': 'POST',
      ':path': `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': process.env.APNS_BUNDLE_ID ?? 'com.wollie.app',
      'apns-push-type': 'alert',
      'apns-priority': '10',
    })
    let status = 0
    request.on('response', (headers) => { status = Number(headers[':status']) })
    request.on('end', () => {
      client.close()
      resolve(status === 200 ? 'sent' : status === 410 || status === 400 ? 'gone' : 'failed')
    })
    request.on('error', () => { client.close(); resolve('failed') })
    request.end(JSON.stringify({ aps: { alert: { title: alert.title, body: alert.body }, sound: 'default' }, route: '/app/budgets' }))
  })
}

export async function pushToUser(userId: string, alert: PushAlert) {
  if (!apnsConfigured()) return { sent: 0, reason: 'apns-not-configured' as const }
  const prisma = await getDb()
  const devices = await prisma.pushDevice.findMany({ where: { userId } })
  let sent = 0
  for (const device of devices) {
    const result = await sendApns(device.token, alert)
    if (result === 'sent') sent += 1
    if (result === 'gone') await prisma.pushDevice.delete({ where: { id: device.id } }).catch(() => undefined)
  }
  return { sent }
}

/** Works out the alerts for a household and sends the ones nobody has had yet. */
export async function sendAlertsForWorkspace(workspaceId: string) {
  const prisma = await getDb()
  const members = await prisma.workspaceMember.findMany({ where: { workspaceId }, select: { userId: true } })
  const withDevices = await prisma.pushDevice.findMany({ where: { userId: { in: members.map((m) => m.userId) } }, select: { userId: true }, distinct: ['userId'] })
  if (!withDevices.length) return { sent: 0 }

  const { buildMoneyOverview } = await import('#/server/money')
  const alerts = computeAlerts(await buildMoneyOverview(workspaceId))
  let sent = 0
  for (const { userId } of withDevices) {
    for (const alert of alerts) {
      try {
        await prisma.pushLog.create({ data: { userId, key: alert.key } })
      } catch {
        continue // already sent this one
      }
      sent += (await pushToUser(userId, alert)).sent
    }
  }
  return { sent }
}

/* ------------------------------ Scheduler ------------------------------ */

let schedulerStarted = false

/** Every 30 minutes, send the alerts nobody has had yet. Starts once per server process. */
export function ensurePushScheduler() {
  if (schedulerStarted || !apnsConfigured()) return
  schedulerStarted = true
  const tick = async () => {
    try {
      await runAlertsForEveryone()
    } catch (error) {
      console.error('[wollie] push alerts failed:', error)
    }
  }
  setTimeout(() => void tick(), 60_000)
  setInterval(() => void tick(), 30 * 60_000)
}

export async function runAlertsForEveryone() {
  const prisma = await getDb()
  const rows = await prisma.workspaceMember.findMany({
    where: { user: { pushDevices: { some: {} } } },
    select: { workspaceId: true },
    distinct: ['workspaceId'],
  })
  let sent = 0
  for (const { workspaceId } of rows) sent += (await sendAlertsForWorkspace(workspaceId)).sent
  return { workspaces: rows.length, sent }
}
