import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { BillingAccess } from '#/server/billing.server'
import { createCustomerPortalSession } from '#/server/billing'
import { loginSearch } from '#/lib/auth-nav'

export function BillingActions({ billing }: { billing: BillingAccess | null }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!billing) {
    return (
      <Link to="/login" search={loginSearch({ signup: true })} className="ds-btn ds-btn--primary ds-btn--lg">Create free account</Link>
    )
  }

  const canManageSubscription = billing.hasCustomer && billing.isHouseholdOwner !== false

  const openPortal = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await createCustomerPortalSession()
      window.location.assign(result.url)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Billing could not be opened.')
      setLoading(false)
    }
  }

  if (canManageSubscription) {
    return (
      <div className="grid gap-3">
        <button type="button" onClick={() => void openPortal()} disabled={loading} className="ds-btn ds-btn--lg">
          {loading ? 'Opening billing…' : 'Manage subscription'}
        </button>
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      </div>
    )
  }

  if (billing.paidPlansEnabled && billing.isHouseholdOwner !== false) {
    return <Link to="/pricing" className="ds-btn ds-btn--primary ds-btn--lg">See plans</Link>
  }

  return (
    <Link to="/app" className="ds-btn ds-btn--primary ds-btn--lg">Open Wollie</Link>
  )
}
