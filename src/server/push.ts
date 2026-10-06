import { createServerFn } from '@tanstack/react-start'
import { getDb } from '#/server/db-access.server'
import { requireFinanceHousehold } from '#/server/household-access.server'
import { apnsConfigured, pushToUser } from '#/server/push.server'

export const getPushStatus = createServerFn({ method: 'GET' }).handler(async () => {
  const context = await requireFinanceHousehold()
  const prisma = await getDb()
  const devices = await prisma.pushDevice.count({ where: { userId: context.userId } })
  return { enabled: devices > 0, configured: apnsConfigured() }
})

export const registerPushDevice = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const context = await requireFinanceHousehold()
    const token = String(data.token ?? '').trim()
    if (!/^[0-9a-fA-F]{32,200}$/.test(token)) throw new Error('That device token is not valid.')
    const prisma = await getDb()
    await prisma.pushDevice.upsert({
      where: { token },
      create: { token, userId: context.userId, platform: 'ios' },
      update: { userId: context.userId },
    })
    return { enabled: true }
  })

export const removePushDevices = createServerFn({ method: 'POST' }).handler(async () => {
  const context = await requireFinanceHousehold()
  const prisma = await getDb()
  await prisma.pushDevice.deleteMany({ where: { userId: context.userId } })
  return { enabled: false }
})

export const sendTestPush = createServerFn({ method: 'POST' }).handler(async () => {
  const context = await requireFinanceHousehold()
  const result = await pushToUser(context.userId, {
    key: `test:${Date.now()}`,
    title: 'Wollie alerts are on',
    body: 'You will hear from us when a budget runs low or a bill is due.',
  })
  return { ...result, configured: apnsConfigured() }
})
