import { devLoginEnabled } from '#/server/dev-login'
import type Stripe from 'stripe'
import { getSiteUrl } from '#/lib/site'
import { getDb } from '#/server/db-access.server'
import { getSessionUser } from '#/server/session.server'
import {
  getBillingMode,
  planLimits,
  type BillingMode,
  type PlanLimits,
  type WolliePlanId,
} from '#/lib/billing-plans'

const ACCESS_STATUSES = new Set(['active', 'trialing', 'past_due'])

export type BillingAccess = {
  hasAccess: boolean
  state: 'development' | 'founder' | 'early_access' | 'free' | 'subscribed'
  plan: WolliePlanId
  billingMode: BillingMode
  limits: PlanLimits
  status: string
  statusLabel: string
  billingConfigured: boolean
  paidPlansEnabled: boolean
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  hasCustomer: boolean
  interval: 'month' | 'year' | null
  isHouseholdOwner?: boolean
  householdOwnerName?: string
}

export function isFounderEmail(
  email: string,
  env: { FOUNDER_EMAILS?: string } = process.env,
) {
  const normalizedEmail = email.trim().toLowerCase()
  return (env.FOUNDER_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalizedEmail)
}

export async function loadBillingAccess(userId: string): Promise<BillingAccess> {
  const prisma = await getDb()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      billingSubscription: {
        select: {
          stripeCustomerId: true,
          stripePriceId: true,
          status: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
        },
      },
    },
  })

  if (!user) throw new Error('Account not found.')

  const subscription = user.billingSubscription
  const status = subscription?.status || 'none'
  const subscribed = ACCESS_STATUSES.has(status)
  const founder = isFounderEmail(user.email)
  const isDevelopmentAccount =
    devLoginEnabled() && user.email === 'dev@wollie.local'
  const billingMode = getBillingMode()

  const state = isDevelopmentAccount
    ? 'development'
    : founder
      ? 'founder'
      : subscribed
        ? 'subscribed'
        : billingMode === 'early_access'
          ? 'early_access'
          : 'free'
  const plan: WolliePlanId = state === 'free' ? 'free' : 'household'
  const billingConfigured = isStripeBillingConfigured()

  return {
    hasAccess: true,
    state,
    plan,
    billingMode,
    limits: planLimits(plan),
    status,
    statusLabel: state === 'early_access'
      ? 'Free during early access'
      : founder
        ? 'Founder access'
        : state === 'free'
          ? 'Free plan'
          : billingStatusLabel(status, subscription?.cancelAtPeriodEnd || false),
    billingConfigured,
    paidPlansEnabled: billingMode === 'freemium' && billingConfigured,
    currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() || null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
    hasCustomer: Boolean(subscription?.stripeCustomerId),
    interval: intervalForPrice(subscription?.stripePriceId),
  }
}

export function isStripeBillingConfigured(
  env: {
    STRIPE_SECRET_KEY?: string
    STRIPE_MONTHLY_PRICE_ID?: string
    STRIPE_YEARLY_PRICE_ID?: string
  } = process.env,
) {
  return Boolean(
    env.STRIPE_SECRET_KEY?.trim()
      && env.STRIPE_MONTHLY_PRICE_ID?.trim()
      && env.STRIPE_YEARLY_PRICE_ID?.trim(),
  )
}

export function shouldCollectCheckoutTermsConsent(
  env: { STRIPE_CHECKOUT_TERMS_CONSENT?: string } = process.env,
) {
  return env.STRIPE_CHECKOUT_TERMS_CONSENT !== 'false'
}

export async function requireBillingUser() {
  const user = await getSessionUser()
  if (!user) throw new Error('Sign in required.')
  return user
}

export async function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Stripe is not configured yet.')
  const { default: StripeClient } = await import('stripe')
  return new StripeClient(key, {
    httpClient: StripeClient.createFetchHttpClient(),
  })
}

export async function createStripeCheckout(
  userId: string,
  interval: 'month' | 'year',
) {
  if (getBillingMode() !== 'freemium' || !isStripeBillingConfigured()) {
    throw new Error('Paid plans are not available during early access.')
  }
  const prisma = await getDb()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      billingSubscription: {
        select: { stripeCustomerId: true, status: true },
      },
    },
  })
  if (!user) throw new Error('Account not found.')
  if (ACCESS_STATUSES.has(user.billingSubscription?.status || '')) {
    throw new Error('Your subscription is already active. Use billing settings to manage it.')
  }

  const price = interval === 'year'
    ? process.env.STRIPE_YEARLY_PRICE_ID
    : process.env.STRIPE_MONTHLY_PRICE_ID
  if (!price) throw new Error(`The ${interval === 'year' ? 'yearly' : 'monthly'} price is not configured yet.`)

  const stripe = await getStripeClient()
  const siteUrl = getSiteUrl()
  const automaticTax = process.env.STRIPE_AUTOMATIC_TAX === 'true'
  const collectTermsConsent = shouldCollectCheckoutTermsConsent()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    billing_address_collection: 'required',
    automatic_tax: { enabled: automaticTax },
    ...(collectTermsConsent
      ? { consent_collection: { terms_of_service: 'required' as const } }
      : {}),
    custom_text: {
      submit: {
        message: 'By subscribing, you request immediate access before the 14-day withdrawal period ends. Statutory withdrawal rights remain available as described in the Terms.',
      },
    },
    client_reference_id: user.id,
    metadata: { wollieUserId: user.id },
    subscription_data: { metadata: { wollieUserId: user.id } },
    success_url: `${siteUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/app/billing?checkout=cancelled`,
    ...(user.billingSubscription?.stripeCustomerId
      ? { customer: user.billingSubscription.stripeCustomerId }
      : { customer_email: user.email }),
  })

  if (!session.url) throw new Error('Stripe did not return a checkout URL.')
  return session.url
}

export async function createStripePortal(userId: string) {
  const prisma = await getDb()
  const billing = await prisma.billingSubscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  })
  if (!billing?.stripeCustomerId) {
    throw new Error('No billing account exists yet. Choose a plan first.')
  }

  const stripe = await getStripeClient()
  const session = await stripe.billingPortal.sessions.create({
    customer: billing.stripeCustomerId,
    return_url: `${getSiteUrl()}/settings`,
  })
  return session.url
}

export async function synchronizeCheckoutSession(sessionId: string, expectedUserId: string) {
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) {
    throw new Error('Invalid checkout session.')
  }
  const stripe = await getStripeClient()
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  const wollieUserId = session.client_reference_id || session.metadata?.wollieUserId
  if (!wollieUserId || wollieUserId !== expectedUserId) {
    throw new Error('This checkout does not belong to the signed-in account.')
  }
  if (typeof session.subscription !== 'string') {
    throw new Error('The subscription is still being prepared. Refresh in a moment.')
  }
  const subscription = await stripe.subscriptions.retrieve(session.subscription)
  await syncStripeSubscription(subscription, wollieUserId)
  return loadBillingAccess(wollieUserId)
}

export async function constructStripeEvent(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('Stripe webhook signing is not configured.')
  const signature = request.headers.get('stripe-signature')
  if (!signature) throw new Error('Missing Stripe signature.')
  const payload = await request.text()
  const stripe = await getStripeClient()
  const { default: StripeClient } = await import('stripe')
  return stripe.webhooks.constructEventAsync(
    payload,
    signature,
    secret,
    undefined,
    StripeClient.createSubtleCryptoProvider(),
  )
}

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const userId = session.client_reference_id || session.metadata?.wollieUserId
      const customerId = stripeId(session.customer)
      if (userId && customerId) {
        const prisma = await getDb()
        await prisma.billingSubscription.upsert({
          where: { userId },
          create: { userId, stripeCustomerId: customerId },
          update: { stripeCustomerId: customerId },
        })
      }
      if (userId && typeof session.subscription === 'string') {
        const stripe = await getStripeClient()
        const subscription = await stripe.subscriptions.retrieve(session.subscription)
        await syncStripeSubscription(subscription, userId)
      }
      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncStripeSubscription(event.data.object)
      break
    default:
      break
  }
}

export async function syncStripeSubscription(
  subscription: Stripe.Subscription,
  userIdHint?: string,
) {
  const prisma = await getDb()
  const customerId = stripeId(subscription.customer)
  const existing = await prisma.billingSubscription.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: subscription.id },
        ...(customerId ? [{ stripeCustomerId: customerId }] : []),
      ],
    },
    select: { userId: true },
  })
  const userId = userIdHint || subscription.metadata.wollieUserId || existing?.userId
  if (!userId) {
    console.warn(`[wollie] Ignoring Stripe subscription ${subscription.id} without a Wollie user.`)
    return
  }

  const userStillExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!userStillExists) {
    console.warn(`[wollie] Ignoring Stripe subscription ${subscription.id} for a deleted Wollie account.`)
    return
  }

  const item = subscription.items.data[0]
  const currentPeriodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1_000)
    : null

  await prisma.billingSubscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: item?.price.id || null,
      status: subscription.status,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: item?.price.id || null,
      status: subscription.status,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  })
}

function stripeId(value: string | { id: string } | null) {
  return typeof value === 'string' ? value : value?.id || null
}

function intervalForPrice(priceId?: string | null): 'month' | 'year' | null {
  if (!priceId) return null
  if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) return 'month'
  if (priceId === process.env.STRIPE_YEARLY_PRICE_ID) return 'year'
  return null
}

function billingStatusLabel(status: string, cancelAtPeriodEnd: boolean) {
  if (cancelAtPeriodEnd && status === 'active') return 'Cancels at period end'
  switch (status) {
    case 'active': return 'Active'
    case 'trialing': return 'Stripe trial'
    case 'past_due': return 'Payment needs attention'
    case 'unpaid': return 'Unpaid'
    case 'canceled': return 'Canceled'
    case 'incomplete': return 'Checkout incomplete'
    default: return 'No subscription'
  }
}
