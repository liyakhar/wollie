import { CalendarDays, Landmark } from "lucide-react";
import { formatMoney, type FinancialAccount, type RecurringPayment } from "#/lib/finance-demo";

export function PublicDemoAccountsPage({
  accounts,
}: {
  accounts: FinancialAccount[];
}) {
  const totalBalance = accounts.reduce((total, account) => total + account.balance, 0);

  return (
    <main id="main" className="m-screen">
      <header className="m-title-row">
        <h1>Accounts</h1>
      </header>

      <section className="m-summary m-summary--card" aria-label="Total balance">
        <p className="m-summary__label">Total balance</p>
        <p className="m-summary__number">{formatMoney(totalBalance, "EUR")}</p>
        <p className="m-summary__foot">
          <span>
            {accounts.length} connected {accounts.length === 1 ? "account" : "accounts"}
          </span>
          <span>Read-only</span>
        </p>
      </section>

      <section className="m-section" aria-label="Connected accounts">
        <div className="m-section__head m-section__head--static">
          <h2>Connected accounts</h2>
          <span className="m-section__count">{accounts.length}</span>
        </div>
        <ul className="m-list">
          {accounts.map((account) => (
            <li key={account.id}>
              <div className="m-row">
                <Landmark aria-hidden="true" className="m-row__icon" />
                <span className="m-row__main">
                  <span className="m-row__title">{account.name}</span>
                  <span className="m-row__meta">
                    {account.institution} · {account.type} · {account.lastSynced}
                  </span>
                </span>
                <span className="m-row__amount">
                  {formatMoney(account.balance, account.currency || "EUR")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="m-footnote">Example data. Create a workspace to connect your own bank.</p>
    </main>
  );
}

export function PublicDemoUpcomingPage({
  recurringPayments,
}: {
  recurringPayments: RecurringPayment[];
}) {
  return (
    <main
      id="main"
      className="wollie-workspace-page mx-auto grid w-full max-w-7xl gap-5 bg-white px-4 py-5 text-zinc-950 sm:px-6 lg:px-8"
    >
      <header className="border-b border-zinc-200 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Upcoming</h1>
        <p className="mt-1 text-sm text-zinc-500">
          See repeating bills and subscriptions before they are due.
        </p>
      </header>

      <section
        aria-labelledby="demo-upcoming-title"
        className="overflow-hidden rounded-lg border border-zinc-200"
      >
        <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-4 sm:px-5">
          <CalendarDays aria-hidden="true" className="size-4 text-zinc-500" />
          <h2 id="demo-upcoming-title" className="font-semibold">
            Recurring payments
          </h2>
          <span className="text-sm text-zinc-500">{recurringPayments.length}</span>
        </div>
        {recurringPayments.length ? (
          <ul className="divide-y divide-zinc-200">
            {recurringPayments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5"
              >
                <div>
                  <p className="font-medium">{payment.merchant}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {payment.cadence} · {payment.category}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold">
                    {formatMoney(-payment.amount, payment.currency || "EUR")}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Due {formatDemoDate(payment.nextDate)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-zinc-500">
            No repeating payments yet.
          </p>
        )}
      </section>

      <p className="text-sm text-zinc-500">
        Example data only. Create a workspace to add and manage your own bills.
      </p>
    </main>
  );
}

function formatDemoDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}
