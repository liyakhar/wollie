import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowRight, Landmark, RefreshCw } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { ProfileButton } from "#/components/ProfileButton";
import { HomeScreen } from "#/components/money/HomeScreen";
import { getMoneyOverview } from "#/server/money";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import {
  formatMoney,
  getFinanceSummary,
  type BudgetCategory,
  type FinanceDashboardData,
  type FinanceTransaction,
  type RecurringPayment,
} from "#/lib/finance-demo";
import { buildMemberFinanceView } from "#/lib/household-finance";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { buildPageMeta } from "#/lib/seo";

const dashboardMeta = buildPageMeta({
  path: "/app",
  title: "Home",
  description: "Your household money at a glance.",
  noindex: true,
});

export const Route = createFileRoute("/app/")({
  loader: () => getMoneyOverview(),
  head: () => ({
    meta: dashboardMeta.meta,
    links: dashboardMeta.links,
  }),
  component: MoneyHomePage,
});

function MoneyHomePage() {
  return <HomeScreen overview={Route.useLoaderData()} />;
}

export function MoneyDashboardContent({
  dashboard,
  demo = false,
}: {
  dashboard: FinanceDashboardData;
  demo?: boolean;
}) {
  const { household, month, rules, syncStatus } = dashboard;
  const currentMember = household?.members.find(
    (member) => member.id === household.currentMemberId,
  );
  const [viewId, setViewId] = useState(
    currentMember?.role === "MEMBER" ? currentMember.id : "household",
  );
  const selectedMember = household?.members.find(
    (member) => member.id === viewId,
  );
  const memberView =
    selectedMember && household
      ? buildMemberFinanceView(
          {
            members: household.members,
            accounts: dashboard.accounts.map((account) => ({
              ...account,
              ownership: account.ownership || [
                {
                  memberId: household.currentMemberId,
                  shareBasisPoints: 10_000,
                },
              ],
            })),
            transactions: dashboard.transactions,
            budget: dashboard.budget,
            recurringPayments: dashboard.recurringPayments,
          },
          selectedMember.id,
        )
      : null;
  const accounts = memberView?.accounts || dashboard.accounts;
  const transactions = memberView?.transactions || dashboard.transactions;
  const budget: BudgetCategory[] = memberView?.budget || dashboard.budget;
  const recurringPayments =
    memberView?.recurringPayments || dashboard.recurringPayments;
  const hasAccounts = accounts.length > 0;
  const currencies = Array.from(
    new Set(accounts.map((account) => account.currency || "USD")),
  );
  const [currency, setCurrency] = useState(currencies[0] || "USD");
  const visibleAccounts = accounts.filter(
    (account) => (account.currency || "USD") === currency,
  );
  const visibleTransactions = transactions.filter(
    (transaction) => (transaction.currency || "USD") === currency,
  );
  const visibleRecurringPayments = recurringPayments.filter(
    (payment) => (payment.currency || currency) === currency,
  );
  const summary = getFinanceSummary({
    accounts: visibleAccounts,
    transactions: visibleTransactions,
    budget,
    recurringPayments: visibleRecurringPayments,
    rules,
  });
  const recentTransactions = visibleTransactions.slice(0, 8);
  const reviewTransactions = visibleTransactions
    .filter((transaction) => transaction.status === "needs-review")
    .slice(0, 5);
  const detectedBills = visibleRecurringPayments.filter(
    (payment) => payment.confirmed === false,
  );
  const upcomingBills = visibleRecurringPayments.filter((payment) =>
    isWithinNextDays(payment.nextDate, 30),
  );
  const pendingTransactions = visibleTransactions.filter(
    (transaction) => transaction.status === "pending",
  );
  const safeToSpend = summary.safeToSpend;
  const hasPlan = budget.some((item) => item.allocated > 0);
  const hasEnvelopePlan = dashboard.envelopeBudget?.enabled === true;
  const hasMoneyPlan = hasPlan || hasEnvelopePlan;
  const connectedInstitution = visibleAccounts[0]?.institution || "your bank";
  const today = new Date();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();
  const daysRemaining = Math.max(daysInMonth - today.getDate() + 1, 1);
  const dailyAllowance = Math.max(safeToSpend, 0) / daysRemaining;
  const attentionCount = reviewTransactions.length + detectedBills.length;
  const showAttention =
    attentionCount > 0 ||
    (syncStatus.mode !== "live-connected" && syncStatus.mode !== "demo");
  const showUpcomingBills = upcomingBills.length > 0;

  return (
    <main
      id="main"
      className="wollie-workspace-page mx-auto grid w-full max-w-7xl gap-5 bg-white px-4 py-5 text-zinc-950 sm:px-6 lg:px-8"
    >
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="wollie-page-title-row">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
              Home
            </h1>
            <ProfileButton demo={demo} />
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {month}
            {hasAccounts ? ` · Updated ${syncStatus.lastSynced}` : ""}
            {memberView
              ? ` · ${selectedMember?.name}'s view`
              : " · Household view"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {household && household.members.length > 1 && (
            <Select value={viewId} onValueChange={setViewId}>
              <SelectTrigger
                className="min-h-11 w-40 border-zinc-200 bg-white"
                aria-label="Money view"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-200 bg-white">
                <SelectItem value="household">Our household</SelectItem>
                {household.members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.id === household.currentMemberId
                      ? "My view"
                      : `${member.name}'s view`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {currencies.length > 1 && (
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger
                className="min-h-11 w-24 border-zinc-200 bg-white"
                aria-label="Dashboard currency"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-200 bg-white">
                {currencies.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      {hasAccounts && !hasMoneyPlan && (
        <section
          className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-5 sm:grid-cols-[1fr_auto] sm:items-center"
          aria-labelledby="setup-heading"
        >
          <div>
            <h2
              id="setup-heading"
              className="text-base font-semibold tracking-tight"
            >
              Finish setting up Wollie
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
              Set a monthly plan to turn your {connectedInstitution} balance
              into a safe-to-spend number.
            </p>
            <p className="mt-2 text-xs text-zinc-400">
              {visibleAccounts.length} account
              {visibleAccounts.length === 1 ? "" : "s"} ·{" "}
              {visibleTransactions.length} transactions imported
            </p>
          </div>
          <Button asChild className="wollie-primary-action sm:justify-self-end">
            <Link to="/app/budgets">
              Set monthly plan
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </section>
      )}

      {hasAccounts &&
        (hasMoneyPlan ? (
          <section
            className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
            aria-labelledby="available-heading"
          >
            <div className="p-5 sm:p-7">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                  Available to spend
                </p>
                <h2
                  id="available-heading"
                  className="mt-3 text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-none tracking-[-0.045em] tabular-nums"
                >
                  {formatMoney(safeToSpend, currency)}
                </h2>
                {safeToSpend > 0 && (
                  <p className="mt-3 text-sm font-medium text-[var(--color-semantic-positive-strong)]">
                    {formatMoney(dailyAllowance, currency)} a day for{" "}
                    {daysRemaining} days
                  </p>
                )}
                {hasEnvelopePlan &&
                  dashboard.envelopeBudget?.incomeMinor === 0 && (
                    <p className="mt-3 text-sm text-zinc-500">
                      No cleared income in {month} yet. This month’s envelopes
                      will fill when income arrives.
                    </p>
                  )}
              </div>
              <details className="mt-5 border-t border-zinc-200 pt-4 text-sm">
                <summary className="min-h-11 cursor-pointer content-center font-medium underline-offset-4 hover:underline">
                  How this is calculated
                </summary>
                <p className="mt-2 leading-6 text-zinc-600">
                  This is the lower of the money left in your everyday plan and
                  the cash available after card debt and confirmed upcoming
                  bills. Upcoming bills are not counted as spent.
                </p>
                {memberView && (
                  <p className="mt-2 leading-6 text-zinc-600">
                    Account balances and transactions use {selectedMember?.name}
                    's ownership percentage. Shared budgets and bills use their{" "}
                    {selectedMember?.householdShareBasisPoints
                      ? selectedMember.householdShareBasisPoints / 100
                      : 0}
                    % household cost share.
                  </p>
                )}
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {reviewTransactions.length + pendingTransactions.length}{" "}
                  unresolved transaction
                  {reviewTransactions.length + pendingTransactions.length === 1
                    ? ""
                    : "s"}{" "}
                  · bank status: {syncStatus.label.toLowerCase()} · last update:{" "}
                  {syncStatus.lastSynced}
                </p>
              </details>
            </div>
          </section>
        ) : (
          <section
            className="grid overflow-hidden rounded-lg border border-zinc-200 bg-white sm:grid-cols-4"
            aria-label="Money this month"
          >
            <SummaryStat
              label="Balance"
              value={formatMoney(summary.liquidCash, currency)}
            />
            <SummaryStat
              label="Spent this month"
              value={formatMoney(-summary.spent, currency)}
            />
            <SummaryStat
              label="Saved / invested"
              value={formatMoney(-summary.saved, currency)}
            />
            <SummaryStat
              label="Income this month"
              value={formatMoney(summary.monthlyIncome, currency)}
            />
          </section>
        ))}

      {!hasAccounts ? (
        <Card className="min-h-[22rem] justify-center rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="mx-auto grid max-w-md justify-items-center gap-4 py-10 text-center">
            <span className="grid size-11 place-items-center rounded-full border border-zinc-200 text-zinc-950">
              <Landmark className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">
                Connect your first account
              </h2>
              <p className="mt-1.5 text-sm text-zinc-500">
                Add a bank or credit card to see balances and transactions.
              </p>
            </div>
            <Button asChild className="wollie-primary-action">
              <Link to="/app/accounts">
                Connect account
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {(showAttention || showUpcomingBills) && (
            <section
              className={`grid gap-4 ${showAttention && showUpcomingBills ? "lg:grid-cols-2" : ""}`}
            >
              {showAttention && (
                <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
                  <CardHeader className="border-b border-zinc-200 pb-4">
                    <CardTitle>Needs attention</CardTitle>
                    {attentionCount > 0 && (
                      <CardAction>
                        <span className="text-sm text-zinc-500">
                          {attentionCount}
                        </span>
                      </CardAction>
                    )}
                  </CardHeader>
                  <CardContent className="divide-y divide-zinc-200 pt-2">
                    {syncStatus.mode !== "live-connected" &&
                      syncStatus.mode !== "demo" && (
                        <ActionRow
                          icon={AlertTriangle}
                          title={syncStatus.label}
                          detail={syncStatus.description}
                          to="/app/accounts"
                          action="Fix sync"
                        />
                      )}
                    {reviewTransactions.length > 0 && (
                      <ActionRow
                        icon={AlertTriangle}
                        title={`${reviewTransactions.length} transaction${reviewTransactions.length === 1 ? "" : "s"} need review`}
                        detail="Confirm categories before trusting the monthly plan."
                        to="/app/transactions"
                        action="Review"
                      />
                    )}
                    {detectedBills.length > 0 && (
                      <ActionRow
                        icon={RefreshCw}
                        title={`${detectedBills.length} possible recurring bill${detectedBills.length === 1 ? "" : "s"}`}
                        detail="Confirm or dismiss charges Wollie detected from history."
                        to="/app/recurring"
                        action="Check"
                      />
                    )}
                  </CardContent>
                </Card>
              )}
              {showUpcomingBills && (
                <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
                  <CardHeader className="border-b border-zinc-200 pb-4">
                    <CardTitle>Next 30 days</CardTitle>
                    <CardAction>
                      <Link
                        to="/app/recurring"
                        className="text-sm font-medium underline-offset-4 hover:underline focus-visible:underline"
                      >
                        View upcoming
                      </Link>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <BillTimeline items={upcomingBills} currency={currency} />
                  </CardContent>
                </Card>
              )}
            </section>
          )}

          <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
            <CardHeader className="border-b border-zinc-200 pb-4">
              <CardTitle>Recent transactions</CardTitle>
              <CardAction>
                {demo ? (
                  <Link
                    to="/app/transactions"
                    className="text-sm font-medium underline-offset-4 hover:underline focus-visible:underline"
                  >
                    View all
                  </Link>
                ) : (
                  <Link
                    to="/app/transactions"
                    className="text-sm font-medium underline-offset-4 hover:underline focus-visible:underline"
                  >
                    View all
                  </Link>
                )}
              </CardAction>
            </CardHeader>
            <CardContent className="pt-2">
              {recentTransactions.length > 0 ? (
                <MoneyList
                  items={recentTransactions.map(toMoneyItem)}
                  currency={currency}
                />
              ) : (
                <CompactEmpty label="No transactions" />
              )}
            </CardContent>
          </Card>
          {pendingTransactions.length > 0 && (
            <p className="text-xs leading-5 text-zinc-500">
              {pendingTransactions.length} pending transaction
              {pendingTransactions.length === 1 ? "" : "s"} may still change.
              Connected-bank balances determine the available amount, so Wollie
              does not subtract them a second time.
            </p>
          )}
        </>
      )}
    </main>
  );
}

function ActionRow({
  action,
  detail,
  icon: Icon,
  title,
  to,
}: {
  action: string;
  detail: string;
  icon: LucideIcon;
  title: string;
  to: "/app/accounts" | "/app/transactions" | "/app/recurring";
}) {
  return (
    <div className="flex items-start gap-3 py-4 first:pt-2 last:pb-1">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-zinc-100">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-zinc-500">{detail}</p>
      </div>
      <Link
        to={to}
        className="min-h-11 shrink-0 self-center py-3 text-sm font-medium underline-offset-4 hover:underline focus-visible:underline"
      >
        {action}
      </Link>
    </div>
  );
}

function BillTimeline({
  currency,
  items,
}: {
  currency: string;
  items: RecurringPayment[];
}) {
  const sorted = [...items].sort(
    (a, b) =>
      parseRecurringDate(a.nextDate).getTime() -
      parseRecurringDate(b.nextDate).getTime(),
  );
  return (
    <ol className="divide-y divide-zinc-200">
      {sorted.map((item) => (
        <li
          key={item.id}
          className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 py-3 first:pt-2 last:pb-1"
        >
          <time
            dateTime={item.nextDate}
            className="grid size-11 place-items-center rounded-md bg-zinc-100 text-center text-[0.68rem] font-medium uppercase leading-tight text-zinc-600"
          >
            {formatBillDate(item.nextDate)}
          </time>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.merchant}</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {item.confirmed === false
                ? "Needs confirmation"
                : `${item.cadence} · confirmed`}
            </p>
          </div>
          <span className="text-sm font-medium tabular-nums">
            {formatMoney(-item.amount, currency)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-zinc-200 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 truncate text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

function MoneyList({
  items,
  currency,
}: {
  items: Array<{
    id: string;
    title: string;
    meta: string;
    amount: number;
    status?: FinanceTransaction["status"];
  }>;
  currency: string;
}) {
  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-4 py-3 first:pt-2 last:pb-1"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="mt-0.5 truncate text-xs text-zinc-500">{item.meta}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {item.status === "needs-review" && (
              <span
                className="size-1.5 rounded-full bg-zinc-950"
                aria-label="Needs review"
              />
            )}
            {item.status === "pending" && (
              <Badge
                variant="outline"
                className="rounded-md px-1.5 py-0 text-[0.65rem] font-normal"
              >
                Pending
              </Badge>
            )}
            <p className="text-sm font-medium tabular-nums">
              {formatMoney(item.amount, currency)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CompactEmpty({ label }: { label: string }) {
  return <p className="py-8 text-center text-sm text-zinc-500">{label}</p>;
}

function toMoneyItem(transaction: FinanceTransaction) {
  return {
    id: transaction.id,
    title: readableMerchant(transaction.merchant),
    meta: `${formatTransactionDate(transaction.date)} · ${transaction.account} · ${transaction.category}`,
    amount: transaction.amount,
    status: transaction.status,
  };
}

function readableMerchant(value: string) {
  const issuedBy = value.match(/\bissued by\s+(.+)$/i);
  const name = (issuedBy?.[1] || value)
    .replace(/^CARD-\d+\s*[·-]\s*/i, "")
    .trim();
  return (
    name.replace(/\b([\p{L}'-]+)\s+\1$/iu, "$1").trim() || "Unknown transaction"
  );
}

function formatTransactionDate(value: string) {
  if (value === "Pending") return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function parseRecurringDate(value: string) {
  const hasYear = /\d{4}/.test(value);
  const date = new Date(
    hasYear ? `${value}T12:00:00` : `${value}, ${new Date().getFullYear()}`,
  );
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function isWithinNextDays(value: string, days: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  const date = parseRecurringDate(value);
  return date >= start && date <= end;
}

function formatBillDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parseRecurringDate(value));
}
