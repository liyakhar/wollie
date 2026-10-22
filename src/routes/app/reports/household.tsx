import { createFileRoute, Link } from "@tanstack/react-router";
import { IconChevronLeft } from "#/components/money/icons";
import { formatMoney } from "#/lib/finance-demo";
import { buildPageMeta } from "#/lib/seo";
import { exportFinanceBackup } from "#/server/account-data";

export const Route = createFileRoute("/app/reports/household")({
  loader: () => exportFinanceBackup(),
  head: () => ({
    meta: buildPageMeta({
      path: "/app/reports/household",
      title: "Household report",
      description: "Printable household finance report.",
      noindex: true,
    }).meta,
  }),
  component: HouseholdReportPage,
});

function HouseholdReportPage() {
  const data = Route.useLoaderData();
  const workspace = data.finance.workspace;
  const currency =
    workspace.currency || workspace.accounts[0]?.currency || "EUR";
  const money = (minor: number, code = currency) =>
    formatMoney(Math.round(minor / 100), code);
  const balance = workspace.accounts.reduce((sum, account) => sum + account.balanceMinor, 0);
  const moneyIn = workspace.transactions
    .filter((transaction) => transaction.amountMinor > 0)
    .reduce((sum, transaction) => sum + transaction.amountMinor, 0);
  const moneyOut = workspace.transactions
    .filter((transaction) => transaction.amountMinor < 0)
    .reduce((sum, transaction) => sum + Math.abs(transaction.amountMinor), 0);
  const date = (value: string | Date) =>
    new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const memberName = (memberId: string) =>
    workspace.members.find((member) => member.id === memberId)?.user.name || "Someone";

  return (
    <main id="main" className="m-screen w-report">
      <header className="m-title-row m-title-row--back w-report__noprint">
        <Link
          to="/app/household"
          className="m-icon-button m-icon-button--glass"
          aria-label="Back to Household"
        >
          <IconChevronLeft aria-hidden="true" />
        </Link>
      </header>
      <h1 className="m-page-title">Household report</h1>
      <p className="m-hint">Made on {new Date(data.exportedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

      <section className="w-report__totals" aria-label="Totals">
        <div><span className="w-label">Balance</span><strong>{money(balance)}</strong></div>
        <div><span className="w-label">Money in</span><strong>{money(moneyIn)}</strong></div>
        <div><span className="w-label">Money out</span><strong>{money(moneyOut)}</strong></div>
      </section>

      <ReportList title="People">
        {workspace.members.map((member) => (
          <Row
            key={member.id}
            title={member.user.name}
            meta={`Pays ${member.householdShareBasisPoints / 100}% of shared costs`}
            value=""
          />
        ))}
      </ReportList>

      <ReportList title="Bank accounts">
        {workspace.accounts.map((account) => {
          const owners = account.ownershipShares.filter((share) => share.shareBasisPoints > 0);
          const owner = owners.length > 1 ? "Joint" : owners[0] ? memberName(owners[0].memberId) : "";
          return (
            <Row
              key={account.id}
              title={account.name}
              meta={[account.institution, owner].filter(Boolean).join(" · ")}
              value={money(account.balanceMinor, account.currency)}
            />
          );
        })}
      </ReportList>

      {workspace.recurringPayments.length > 0 && (
        <ReportList title="Bills">
          {workspace.recurringPayments.map((payment) => (
            <Row
              key={payment.id}
              title={payment.name}
              meta={`${payment.cadence === "YEARLY" ? "Yearly" : "Monthly"} · next ${date(payment.nextDate)}`}
              value={money(payment.amountMinor, payment.currency)}
            />
          ))}
        </ReportList>
      )}

      <button type="button" className="m-button m-button--wide w-report__noprint" onClick={() => window.print()}>
        Save as PDF
      </button>
    </main>
  );
}

function ReportList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="m-section">
      <div className="m-section__head m-section__head--static">
        <h2>{title}</h2>
      </div>
      <ul className="m-list">{children}</ul>
    </section>
  );
}

function Row({ title, meta, value }: { title: string; meta: string; value: string }) {
  return (
    <li className="m-row">
      <span className="m-row__main">
        <span className="m-row__title">{title}</span>
        {meta && <span className="m-row__meta">{meta}</span>}
      </span>
      <span className="m-row__amount">{value}</span>
    </li>
  );
}
