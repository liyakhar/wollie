import { createFileRoute, useRouter } from "@tanstack/react-router";
import { type FormEvent, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { ActivityScreen } from "#/components/money/ActivityScreen";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import {
  filterFinanceTransactions,
  formatMoney,
  type FinanceTransaction,
  type TransactionCategoryName,
} from "#/lib/finance-demo";
import type { IncomeEnvelopePlan } from "#/lib/income-allocation-engine";
import {
  buildTransactionCategoryTotals,
  sumTransactionCategoryTotals,
  type TransactionCategoryTotal,
} from "#/lib/transaction-category-totals";
import {
  addDevFinanceTransaction,
  createFinanceTransactionCategory,
  getFinanceTransactions,
  updateFinanceTransactionCategory,
} from "#/server/finance";

export const Route = createFileRoute("/app/transactions")({
  loader: () =>
    getFinanceTransactions({ data: { status: "all", category: "all" } }),
  component: TransactionsPage,
});

const CREATE_CATEGORY_VALUE = "__create_category__";

export type TransactionsScreenData = {
  canAddManual: boolean;
  categoryOptions: string[];
  envelopeBudget?: IncomeEnvelopePlan;
  transactions: FinanceTransaction[];
};

function TransactionsPage() {
  return <ActivityScreen data={Route.useLoaderData()} />;
}

export function TransactionsContent({
  data,
  readOnly = false,
}: {
  data: TransactionsScreenData;
  readOnly?: boolean;
}) {
  const { canAddManual, categoryOptions, envelopeBudget, transactions } = data;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FinanceTransaction["status"] | "all">(
    "all",
  );
  const [category, setCategory] = useState<TransactionCategoryName | "all">(
    "all",
  );
  const [month, setMonth] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount =
    Number(status !== "all") + Number(category !== "all") + Number(month !== "all");
  const [manualMerchant, setManualMerchant] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualCategory, setManualCategory] =
    useState<TransactionCategoryName>("Groceries");
  const [manualDate, setManualDate] = useState(toDateInput(new Date()));
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showCategoryCreator, setShowCategoryCreator] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryNotice, setCategoryNotice] = useState("");
  const allCategoryOptions = Array.from(
    new Set([
      "Income",
      "Transfer",
      ...categoryOptions,
      ...transactions.map((transaction) => transaction.category),
    ]),
  );
  const months = useMemo(
    () =>
      Array.from(
        new Set(
          transactions
            .map((transaction) => transactionMonth(transaction.date))
            .filter(Boolean),
        ),
      ),
    [transactions],
  );
  const filtered = useMemo(
    () =>
      filterFinanceTransactions(transactions, {
        q: query,
        status,
        category,
      }).filter(
        (transaction) =>
          month === "all" || transactionMonth(transaction.date) === month,
      ),
    [category, month, query, status, transactions],
  );
  const categoryTotals = useMemo(
    () => buildTransactionCategoryTotals(filtered, envelopeBudget),
    [envelopeBudget, filtered],
  );
  const canShowEnvelopeAvailability =
    month === currentMonthKey() && !query.trim() && status === "all";

  async function updateCategory(
    transaction: FinanceTransaction,
    next: TransactionCategoryName,
  ) {
    setSaving(transaction.id);
    setError("");
    try {
      await updateFinanceTransactionCategory({
        data: { transactionId: transaction.id, category: next },
      });
      await router.invalidate();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update transaction.",
      );
    } finally {
      setSaving(null);
    }
  }

  async function addManualTransaction() {
    setSaving("manual");
    setError("");
    try {
      await addDevFinanceTransaction({
        data: {
          merchant: manualMerchant,
          amount: Number(manualAmount),
          category: manualCategory,
          date: manualDate,
        },
      });
      setManualMerchant("");
      setManualAmount("");
      await router.invalidate();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not add manual spending.",
      );
    } finally {
      setSaving(null);
    }
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("category");
    setError("");
    setCategoryNotice("");
    try {
      const result = await createFinanceTransactionCategory({
        data: { name: newCategoryName },
      });
      setNewCategoryName("");
      setShowCategoryCreator(false);
      await router.invalidate();
      setCategoryNotice(
        result.created
          ? `${result.category} is ready to use. Keep it as tracked spending, or map it in Money plan when you want a budget.`
          : `${result.category} is already available.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not add category.",
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <main
      id="main"
      className="wollie-workspace-page mx-auto grid w-full max-w-7xl gap-5 bg-white px-4 py-5 text-zinc-950 sm:px-6 lg:px-8"
    >
      <header className="border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Transactions
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Search, verify, and categorize every transaction.
          </p>
        </div>
      </header>

      {showCategoryCreator && !readOnly && (
        <section
          aria-labelledby="new-category-heading"
          className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:p-5"
        >
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(event) => void createCategory(event)}
          >
            <label className="grid flex-1 gap-1 text-xs text-zinc-500">
              <span id="new-category-heading">New category</span>
              <Input
                autoFocus
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="e.g. Pets"
                className="min-h-11 border-zinc-200 bg-white text-sm text-zinc-950"
              />
            </label>
            <Button
              className="wollie-primary-action min-h-11"
              disabled={saving === "category"}
              type="submit"
            >
              {saving === "category" ? "Adding…" : "Add category"}
            </Button>
            <Button
              className="min-h-11 whitespace-nowrap"
              onClick={() => setShowCategoryCreator(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          </form>
        </section>
      )}

      {categoryNotice && (
        <p
          role="status"
          className="text-sm font-medium text-[var(--color-semantic-positive-strong)]"
        >
          {categoryNotice}
        </p>
      )}

      {canAddManual && !readOnly && (
        <section
          aria-labelledby="manual-spending-heading"
          className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:p-5"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="manual-spending-heading" className="font-semibold">
                Add manual spending
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Dev-only sample transaction for testing plans and Home.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_8rem_11rem_10rem_auto] lg:items-end">
            <label className="grid gap-1 text-xs text-zinc-500">
              Merchant
              <Input
                value={manualMerchant}
                onChange={(event) => setManualMerchant(event.target.value)}
                placeholder="LLC Lia"
                className="min-h-11 border-zinc-200 bg-white text-sm text-zinc-950"
              />
            </label>
            <label className="grid gap-1 text-xs text-zinc-500">
              Amount
              <Input
                inputMode="decimal"
                value={manualAmount}
                onChange={(event) => setManualAmount(event.target.value)}
                placeholder="24.50"
                className="min-h-11 border-zinc-200 bg-white text-sm text-zinc-950"
              />
            </label>
            <label className="grid gap-1 text-xs text-zinc-500">
              Category
              <Select
                value={manualCategory}
                onValueChange={(value) => {
                  if (value === CREATE_CATEGORY_VALUE) {
                    setShowCategoryCreator(true);
                    return;
                  }
                  setManualCategory(value as TransactionCategoryName);
                }}
              >
                <SelectTrigger className="min-h-11 border-zinc-200 bg-white text-zinc-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                  <SelectItem value={CREATE_CATEGORY_VALUE}>
                    + Create category
                  </SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-xs text-zinc-500">
              Date
              <Input
                type="date"
                value={manualDate}
                onChange={(event) => setManualDate(event.target.value)}
                className="min-h-11 border-zinc-200 bg-white text-sm text-zinc-950"
              />
            </label>
            <Button
              className="wollie-primary-action min-h-11"
              disabled={saving === "manual"}
              onClick={() => void addManualTransaction()}
            >
              {saving === "manual" ? "Adding..." : "Add spending"}
            </Button>
          </div>
        </section>
      )}

      <section
        aria-label="Transaction filters"
        className="wollie-transaction-filters"
        data-open={filtersOpen || undefined}
      >
        <div className="wollie-transaction-filters__search-row">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            aria-label="Search transactions"
            className="wollie-transaction-filters__search min-h-11 border-zinc-200 bg-white"
          />
          <button
            type="button"
            className="wollie-transaction-filters__toggle"
            aria-expanded={filtersOpen}
            aria-label={
              activeFilterCount
                ? `Filters, ${activeFilterCount} on`
                : "Filters"
            }
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <SlidersHorizontal aria-hidden="true" />
            {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
          </button>
        </div>
        <div className="wollie-transaction-filters__controls">
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as typeof status)}
          >
            <SelectTrigger
              className="wollie-transaction-filters__trigger min-h-11 border-zinc-200 bg-white"
              aria-label="Transaction status"
            >
              <SelectValue>{labelStatus(status)}</SelectValue>
            </SelectTrigger>
            <SelectContent
              align="start"
              className="wollie-transaction-filters__content"
              position="popper"
              sideOffset={8}
            >
              {["all", "needs-review", "pending", "cleared"].map((item) => (
                <SelectItem key={item} value={item}>
                  {labelStatus(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={category}
            onValueChange={(value) => {
              if (value === CREATE_CATEGORY_VALUE && !readOnly) {
                setShowCategoryCreator(true);
                return;
              }
              setCategory(value as typeof category);
            }}
          >
            <SelectTrigger
              className="wollie-transaction-filters__trigger min-h-11 border-zinc-200 bg-white"
              aria-label="Transaction category"
            >
              <SelectValue>{category === "all" ? "All categories" : category}</SelectValue>
            </SelectTrigger>
            <SelectContent
              align="start"
              className="wollie-transaction-filters__content"
              position="popper"
              sideOffset={8}
            >
              <SelectItem value="all">All categories</SelectItem>
              {allCategoryOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
              {!readOnly && (
                <SelectItem value={CREATE_CATEGORY_VALUE}>
                  + Create category
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger
              className="wollie-transaction-filters__trigger min-h-11 border-zinc-200 bg-white"
              aria-label="Transaction month"
            >
              <SelectValue>{month === "all" ? "All months" : formatMonth(month)}</SelectValue>
            </SelectTrigger>
            <SelectContent
              align="start"
              className="wollie-transaction-filters__content"
              position="popper"
              sideOffset={8}
            >
              <SelectItem value="all">All months</SelectItem>
              {months.map((item) => (
                <SelectItem key={item} value={item}>
                  {formatMonth(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <CategoryTotals
        activeCategory={category}
        baseCurrency={envelopeBudget?.currency}
        canShowEnvelopeAvailability={canShowEnvelopeAvailability}
        onSelect={setCategory}
        periodLabel={month === "all" ? "All time" : formatMonth(month)}
        totals={categoryTotals}
      />

      <section
        aria-labelledby="transactions-heading"
        className="overflow-hidden rounded-lg border border-zinc-200"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 sm:px-5">
          <h2 id="transactions-heading" className="font-semibold">
            Transactions
          </h2>
          <span className="text-sm text-zinc-500">{filtered.length}</span>
        </div>
        {filtered.length > 0 ? (
          <ul className="divide-y divide-zinc-200">
            {filtered.map((transaction) => {
              return (
                <li
                  key={transaction.id}
                  className="wollie-transaction-row grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-center sm:px-5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {readableMerchant(transaction.merchant)}
                      </p>
                      {transaction.status !== "cleared" && (
                        <Badge
                          variant="outline"
                          className="rounded-md font-normal"
                        >
                          {labelStatus(transaction.status)}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {formatDate(transaction.date)} · {transaction.account}
                    </p>
                  </div>
                  <Select
                    value={transaction.category}
                    disabled={readOnly || saving === transaction.id}
                    onValueChange={(value) => {
                      if (value === CREATE_CATEGORY_VALUE && !readOnly) {
                        setShowCategoryCreator(true);
                        return;
                      }
                      void updateCategory(
                        transaction,
                        value as TransactionCategoryName,
                      );
                    }}
                  >
                    <SelectTrigger
                      className="min-h-11 border-zinc-200 bg-white"
                      aria-label={`Category for ${transaction.merchant}`}
                    >
                      <SelectValue>{transaction.category}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {allCategoryOptions.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                      {!readOnly && (
                        <SelectItem value={CREATE_CATEGORY_VALUE}>
                          + Create category
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-right text-sm font-medium tabular-nums">
                    {formatMoney(
                      transaction.amount,
                      transaction.currency || "USD",
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-16 text-center text-sm text-zinc-500">
            No matching transactions.
          </p>
        )}
      </section>
      {error && (
        <p
          role="alert"
          className="text-sm font-medium text-[var(--color-semantic-negative)]"
        >
          {error}
        </p>
      )}
    </main>
  );
}

function CategoryTotals({
  activeCategory,
  baseCurrency,
  canShowEnvelopeAvailability,
  onSelect,
  periodLabel,
  totals,
}: {
  activeCategory: TransactionCategoryName | "all";
  baseCurrency?: string;
  canShowEnvelopeAvailability: boolean;
  onSelect: (category: TransactionCategoryName | "all") => void;
  periodLabel: string;
  totals: TransactionCategoryTotal[];
}) {
  if (totals.length === 0) return null;

  const spendingTotals = totals.filter(
    (total) =>
      total.bucket?.purpose !== "RESERVE" && total.bucket?.purpose !== "GOAL",
  );
  const savingTotals = totals.filter(
    (total) =>
      total.bucket?.purpose === "RESERVE" || total.bucket?.purpose === "GOAL",
  );

  return (
    <section
      aria-label="Category totals"
      className="overflow-hidden rounded-lg border border-zinc-200"
    >
      {spendingTotals.length > 0 && (
        <CategoryTotalGroup
          activeCategory={activeCategory}
          baseCurrency={baseCurrency}
          canShowEnvelopeAvailability={canShowEnvelopeAvailability}
          headingId="category-totals-heading"
          onSelect={onSelect}
          periodLabel={periodLabel}
          totalVerb="spent"
          title="Spending by category"
          totals={spendingTotals}
        />
      )}
      {savingTotals.length > 0 && (
        <CategoryTotalGroup
          activeCategory={activeCategory}
          baseCurrency={baseCurrency}
          canShowEnvelopeAvailability={canShowEnvelopeAvailability}
          headingId="saved-category-totals-heading"
          onSelect={onSelect}
          periodLabel={periodLabel}
          totalVerb="saved"
          title="Saved & invested"
          totals={savingTotals}
        />
      )}
    </section>
  );
}

function CategoryTotalGroup({
  activeCategory,
  baseCurrency,
  canShowEnvelopeAvailability,
  headingId,
  onSelect,
  periodLabel,
  totalVerb,
  title,
  totals,
}: {
  activeCategory: TransactionCategoryName | "all";
  baseCurrency?: string;
  canShowEnvelopeAvailability: boolean;
  headingId: string;
  onSelect: (category: TransactionCategoryName | "all") => void;
  periodLabel: string;
  totalVerb: "saved" | "spent";
  title: string;
  totals: TransactionCategoryTotal[];
}) {
  const totalAmounts = sumTransactionCategoryTotals(totals);
  const rankedTotals = rankCategoryTotals(totals, totalAmounts);
  const hasSingleCurrency = totalAmounts.length === 1;
  const [expanded, setExpanded] = useState(false);
  const activeIsHidden = rankedTotals.slice(3).some(
    (total) =>
      total.category.toLocaleLowerCase() ===
      activeCategory.toLocaleLowerCase(),
  );
  const visibleTotals =
    expanded || activeIsHidden ? rankedTotals : rankedTotals.slice(0, 3);

  return (
    <div className="border-b border-zinc-200 last:border-b-0">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-5">
        <div>
          <h2 id={headingId} className="font-semibold">
            {title}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{periodLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Total {totalVerb}</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-950">
            {totalAmounts.map((value) => (
              <span className="block" key={value.currency}>
                {formatMoney(value.amount, value.currency)}
              </span>
            ))}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {totals.length} {totals.length === 1 ? "category" : "categories"}
          </p>
        </div>
      </div>
      <ul className="divide-y divide-zinc-200">
        {visibleTotals.map((total) => {
          const active =
            activeCategory.toLocaleLowerCase() ===
            total.category.toLocaleLowerCase();
          const availabilityLabel = categoryAvailabilityLabel(
            total,
            baseCurrency,
            canShowEnvelopeAvailability,
          );
          const share = hasSingleCurrency
            ? categoryShare(total, totalAmounts)
            : null;

          return (
            <li key={total.category} className="bg-white">
              <button
                aria-pressed={active}
                className={`w-full px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-950 sm:px-5 ${active ? "bg-zinc-100" : "hover:bg-zinc-50"}`}
                onClick={() => onSelect(active ? "all" : total.category)}
                type="button"
              >
                <span className="flex items-start justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-zinc-950">
                      {total.category}
                    </span>
                    <span
                      className={`mt-1 block text-xs ${availabilityLabel?.isOver ? "font-medium text-[var(--color-semantic-negative)]" : "text-zinc-500"}`}
                    >
                      {availabilityLabel?.label ?? categoryTotalLabel(total)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-zinc-950">
                    {total.totals.map((value) => (
                      <span className="block" key={value.currency}>
                        {formatMoney(value.amount, value.currency)}{" "}
                        {categoryAmountLabel(total)}
                      </span>
                    ))}
                    {share !== null && (
                      <span className="mt-1 block text-xs font-normal text-zinc-500">
                        {Math.round(share * 100)}% of total
                      </span>
                    )}
                  </span>
                </span>
                {share !== null && (
                  <span
                    aria-hidden="true"
                    className="mt-3 block h-1 overflow-hidden rounded-full bg-zinc-100"
                  >
                    <span
                      className="block h-full rounded-full bg-zinc-950"
                      style={{ width: `${Math.max(3, share * 100)}%` }}
                    />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {rankedTotals.length > 3 && (
        <div className="border-t border-zinc-200 px-4 py-2 sm:px-5">
          <button
            className="min-h-11 whitespace-nowrap text-sm font-medium underline-offset-4 hover:underline focus-visible:underline"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            {expanded
              ? "Show less"
              : `View all ${rankedTotals.length} categories`}
          </button>
        </div>
      )}
    </div>
  );
}

function categoryAmountLabel(total: TransactionCategoryTotal) {
  return total.bucket && total.bucket.purpose !== "SPENDING"
    ? "saved"
    : "spent";
}

function categoryAvailabilityLabel(
  total: TransactionCategoryTotal,
  baseCurrency: string | undefined,
  canShowEnvelopeAvailability: boolean,
) {
  if (
    !baseCurrency ||
    !canShowEnvelopeAvailability ||
    total.bucket?.purpose !== "SPENDING" ||
    total.totals.length !== 1 ||
    total.totals[0]?.currency !== baseCurrency
  )
    return null;

  const amount = total.bucket.availableMinor;
  return {
    isOver: amount < 0,
    label: `${total.bucket.name} plan · ${amount < 0 ? `${formatMoney(Math.abs(amount) / 100, baseCurrency)} over` : `${formatMoney(amount / 100, baseCurrency)} left`}`,
  };
}

function categoryTotalLabel(total: TransactionCategoryTotal) {
  if (!total.bucket) return "No monthly budget";
  if (total.bucket.purpose === "RESERVE") return `${total.bucket.name} reserve`;
  if (total.bucket.purpose === "GOAL") return `${total.bucket.name} goal`;
  return `${total.bucket.name} plan`;
}

function categoryShare(
  total: TransactionCategoryTotal,
  totalAmounts: Array<{ amount: number; currency: string }>,
) {
  const amount = total.totals[0];
  const totalAmount = totalAmounts.find(
    (value) => value.currency === amount?.currency,
  );
  if (!amount || !totalAmount || totalAmount.amount <= 0) return null;
  return amount.amount / totalAmount.amount;
}

function rankCategoryTotals(
  totals: TransactionCategoryTotal[],
  totalAmounts: Array<{ amount: number; currency: string }>,
) {
  const singleCurrency =
    totalAmounts.length === 1 &&
    totals.every(
      (total) =>
        total.totals.length === 1 &&
        total.totals[0]?.currency === totalAmounts[0]?.currency,
    );

  if (!singleCurrency) return totals;

  return [...totals].sort((left, right) => {
    const amountDifference =
      (right.totals[0]?.amount ?? 0) - (left.totals[0]?.amount ?? 0);
    return amountDifference || left.category.localeCompare(right.category);
  });
}

function labelStatus(value: string) {
  if (value === "all") return "All statuses";
  if (value === "needs-review") return "Needs review";
  return value.charAt(0).toUpperCase() + value.slice(1);
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

function formatDate(value: string) {
  const date = new Date(
    /\d{4}/.test(value) ? value : `${value}, ${new Date().getFullYear()}`,
  );
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
}

function transactionMonth(value: string) {
  const date = new Date(
    /\d{4}/.test(value) ? value : `${value}, ${new Date().getFullYear()}`,
  );
  return Number.isNaN(date.getTime())
    ? ""
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year!, month! - 1, 1));
}

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
