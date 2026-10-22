import { createFileRoute, Link } from "@tanstack/react-router";
import { IconChevronLeft } from "#/components/money/icons";
import { BillingActions } from "#/components/billing/BillingActions";
import { buildPageMeta } from "#/lib/seo";
import { getBillingOverview } from "#/server/billing";

export const Route = createFileRoute("/app/billing")({
  loader: () => getBillingOverview(),
  head: () => ({
    meta: buildPageMeta({
      path: "/app/billing",
      title: "Plan & billing",
      description: "See your Wollie plan and manage billing.",
      noindex: true,
    }).meta,
  }),
  component: BillingPage,
});

function BillingPage() {
  const billing = Route.useLoaderData();
  if (!billing) return null;
  const earlyAccess = billing.billingMode === "early_access";
  const badge = earlyAccess
    ? "Early access"
    : billing.plan === "free"
      ? "Free"
      : "Household";

  return (
    <main id="main" className="m-screen">
      <header className="m-title-row m-title-row--back">
        <Link
          to="/settings"
          className="m-icon-button m-icon-button--glass"
          aria-label="Back to Profile"
        >
          <IconChevronLeft aria-hidden="true" />
        </Link>
      </header>
      <h1 className="m-page-title">Your plan</h1>

      <section className="w-plan">
        <span className="w-plan__badge">{badge}</span>
        <h2 className="w-plan__title">
          {earlyAccess ? "Wollie is free for now." : `${billing.statusLabel}.`}
        </h2>
        <p className="m-hint">
          {earlyAccess
            ? "Every feature is included. No card, no trial deadline."
            : billing.plan === "free"
              ? "Keep planning for free. Upgrade only if you need more than the Free plan includes."
              : "Your household has full Wollie access."}
        </p>
      </section>

      {earlyAccess && (
        <section className="m-section">
          <div className="m-section__head">
            <h2>Included</h2>
          </div>
          <ul className="m-list">
            {[
              "Bank connections",
              "Budgets and savings",
              "Sharing with a partner",
              "Exports and backups",
            ].map((item) => (
              <li key={item} className="m-row">
                <span className="m-row__main">
                  <span className="m-row__title">{item}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BillingActions billing={billing} />
    </main>
  );
}
