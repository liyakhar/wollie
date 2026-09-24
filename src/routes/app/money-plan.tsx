import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Plus, Settings2, Trash2, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { formatMoney } from "#/lib/finance-demo";
import type {
  BudgetBucketGroup,
  BudgetBucketPurpose,
  IncomeAllocationRuleType,
  IncomeEnvelopePlan,
} from "#/lib/income-allocation-engine";
import { getFinanceBudget, saveFinanceEnvelopeBudget } from "#/server/finance";

type PlanKind =
  | "MONTHLY_BILL"
  | "EVERYDAY_SPENDING"
  | "SET_ASIDE"
  | "SAVINGS_GOAL";
type MoneyPlanView = "spending" | "savings";

const PLAN_KIND_OPTIONS: Array<{ value: PlanKind; label: string }> = [
  { value: "MONTHLY_BILL", label: "Monthly bill" },
  { value: "EVERYDAY_SPENDING", label: "Everyday spending" },
  { value: "SET_ASIDE", label: "Set money aside" },
  { value: "SAVINGS_GOAL", label: "Save for a goal" },
];

const RULE_OPTIONS: Array<{ value: IncomeAllocationRuleType; label: string }> =
  [
    { value: "FIXED", label: "Amount each month" },
    { value: "PERCENT_OF_INCOME", label: "Percentage of income" },
    { value: "REMAINDER", label: "Whatever is left" },
  ];

const BUDGET_SAVE_NOTICE_KEY = "wollie:budget-save-notice";

type EnvelopeDraft = {
  id: string;
  name: string;
  group: BudgetBucketGroup;
  purpose: BudgetBucketPurpose;
  type: IncomeAllocationRuleType;
  fixedAmount: string;
  percentage: string;
  categoryNames: string[];
};

export type BudgetScreenData = {
  month: string;
  currency: string;
  budget: Array<{ name: string; allocated: number; spent: number }>;
  envelopeBudget?: IncomeEnvelopePlan;
  canChangeCurrency: boolean;
  availableCurrencies: string[];
};

type EnvelopePlanPayload = {
  currency?: string;
  buckets: Array<{
    name: string;
    group: BudgetBucketGroup;
    purpose: BudgetBucketPurpose;
    type: IncomeAllocationRuleType;
    fixedAmount?: string;
    percentage?: string;
    priority: number;
    categoryNames: string[];
  }>;
};

export const Route = createFileRoute("/app/money-plan")({
  loader: () => getFinanceBudget(),
  component: BudgetPage,
});

function BudgetPage() {
  const data = Route.useLoaderData();
  return <BudgetContent data={data} />;
}

export function BudgetContent({
  data,
  readOnly = false,
}: {
  data: BudgetScreenData;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const plan = data.envelopeBudget;
  const [editorMode, setEditorMode] = useState<
    "none" | "starter" | "blank" | "existing"
  >("none");
  const [message, setMessage] = useState("");
  const [saveNotice, setSaveNotice] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (window.sessionStorage.getItem(BUDGET_SAVE_NOTICE_KEY) ?? ""),
  );

  useEffect(() => {
    if (!saveNotice) return;
    const timeout = window.setTimeout(() => {
      window.sessionStorage.removeItem(BUDGET_SAVE_NOTICE_KEY);
      setSaveNotice("");
    }, 5_000);
    return () => window.clearTimeout(timeout);
  }, [saveNotice]);

  async function savePlan(payload: EnvelopePlanPayload) {
    if (readOnly) return;
    setMessage("");
    try {
      await saveFinanceEnvelopeBudget({ data: payload });
      const notice = "Money plan saved.";
      window.sessionStorage.setItem(BUDGET_SAVE_NOTICE_KEY, notice);
      setSaveNotice(notice);
      setEditorMode("none");
      await router.invalidate();
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Could not save the household plan.",
      );
      throw caught;
    }
  }

  const hasEnvelopePlan = Boolean(plan?.enabled);
  const categoryOptions = plan?.categoryOptions ?? [];

  return (
    <main
      id="main"
      className="wollie-workspace-page mx-auto grid w-full max-w-7xl gap-5 bg-white px-4 py-5 text-zinc-950 sm:px-6 lg:px-8"
    >
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Money plan</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Plan spending, savings, and goals in one place.
          </p>
        </div>
        {hasEnvelopePlan && editorMode === "none" && !readOnly && (
          <Button
            className="wollie-primary-action min-h-11 sm:shrink-0"
            onClick={() => setEditorMode("existing")}
          >
            <Settings2 aria-hidden="true" />
            Edit plan
          </Button>
        )}
      </header>

      {hasEnvelopePlan && plan && editorMode === "none" ? (
        <EnvelopeStatus month={data.month} plan={plan} />
      ) : editorMode === "none" ? (
        <EmptyEnvelopePlan
          hasLegacyPlan={data.budget.some((item) => item.allocated > 0)}
          onBlank={() => setEditorMode("blank")}
          onStarter={() => setEditorMode("starter")}
        />
      ) : null}

      {editorMode !== "none" && !readOnly && (
        <EnvelopeEditor
          key={`${editorMode}:${plan?.currency ?? data.currency}`}
          canChangeCurrency={data.canChangeCurrency}
          categoryOptions={categoryOptions}
          currency={plan?.currency ?? data.currency}
          initialPlan={editorMode === "existing" ? plan : undefined}
          initialDrafts={
            editorMode === "starter"
              ? householdStarterDrafts(categoryOptions)
              : undefined
          }
          availableCurrencies={data.availableCurrencies}
          onCancel={() => setEditorMode("none")}
          onSave={savePlan}
        />
      )}

      {(message || saveNotice) && (
        <p
          className="text-sm font-medium text-[var(--color-semantic-positive-strong)]"
          aria-live="polite"
        >
          {message || saveNotice}
        </p>
      )}

      {hasEnvelopePlan && editorMode === "none" && (
        <details className="border-t border-zinc-200 pt-4 text-sm text-zinc-600">
          <summary className="min-h-11 cursor-pointer content-center font-medium text-zinc-950 underline-offset-4 hover:underline">
            How this plan stays up to date
          </summary>
          <p className="mt-2 max-w-3xl leading-6">
            Wollie assigns income to your plan on screen; it does not move money
            between bank accounts. Purchases update the matching plan item
            automatically.
          </p>
        </details>
      )}
    </main>
  );
}

function EmptyEnvelopePlan({
  hasLegacyPlan,
  onBlank,
  onStarter,
}: {
  hasLegacyPlan: boolean;
  onBlank: () => void;
  onStarter: () => void;
}) {
  return (
    <section
      aria-labelledby="envelope-setup-heading"
      className="wollie-sheet grid gap-5 border border-zinc-200 bg-zinc-50 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-7"
    >
      <div>
        <span className="grid size-11 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-950">
          <WalletCards className="size-5" aria-hidden="true" />
        </span>
        <h2
          id="envelope-setup-heading"
          className="mt-4 text-lg font-semibold tracking-tight"
        >
          Set up a shared monthly plan
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">
          Decide how this month’s household income should be used. Wollie tracks
          the plan without moving money between your bank accounts.
        </p>
        {hasLegacyPlan && (
          <p className="mt-3 text-sm text-zinc-500">
            Your existing category limits stay in place until you save this
            Money plan.
          </p>
        )}
      </div>
      <div className="grid gap-2 sm:justify-items-end">
        <Button className="wollie-primary-action min-h-11" onClick={onStarter}>
          Use household starter
        </Button>
        <Button
          variant="outline"
          className="min-h-11 border-zinc-200 bg-white text-zinc-950"
          onClick={onBlank}
        >
          Build from scratch
        </Button>
      </div>
    </section>
  );
}

function EnvelopeStatus({
  month,
  plan,
}: {
  month: string;
  plan: IncomeEnvelopePlan;
}) {
  const spendingBuckets = plan.buckets.filter(
    (bucket) => bucket.purpose === "SPENDING",
  );
  const futureBuckets = plan.buckets.filter(
    (bucket) => bucket.purpose !== "SPENDING",
  );
  const targetMinor = plan.buckets.reduce(
    (sum, bucket) => sum + bucket.requestedMinor,
    0,
  );
  const hasIncome = plan.incomeMinor > 0;
  const [view, setView] = useState<MoneyPlanView>(
    spendingBuckets.length > 0 ? "spending" : "savings",
  );

  return (
    <section
      aria-label="Money plan status"
      className="grid gap-4"
    >
      <nav
        aria-label="Money plan views"
        className="money-plan-view-switch flex overflow-x-auto overflow-y-hidden rounded-lg border border-zinc-200 bg-white px-4 sm:px-5"
      >
        <MoneyPlanViewButton
          active={view === "spending"}
          onClick={() => setView("spending")}
        >
          Spending this month
        </MoneyPlanViewButton>
        <MoneyPlanViewButton
          active={view === "savings"}
          onClick={() => setView("savings")}
        >
          Savings &amp; reserves
        </MoneyPlanViewButton>
      </nav>

      {view === "spending" ? (
        <SpendingPlanView
          hasIncome={hasIncome}
          month={month}
          plan={plan}
          spendingBuckets={spendingBuckets}
          targetMinor={targetMinor}
        />
      ) : (
        <SavingsPlanView
          hasIncome={hasIncome}
          month={month}
          plan={plan}
          futureBuckets={futureBuckets}
          targetMinor={targetMinor}
        />
      )}
    </section>
  );
}

function MoneyPlanViewButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`-mb-px min-h-11 shrink-0 border-b-2 px-1 pr-5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 ${active ? "border-zinc-950 text-zinc-950" : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-950"}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SpendingPlanView({
  hasIncome,
  month,
  plan,
  spendingBuckets,
  targetMinor,
}: {
  hasIncome: boolean;
  month: string;
  plan: IncomeEnvelopePlan;
  spendingBuckets: IncomeEnvelopePlan["buckets"];
  targetMinor: number;
}) {
  const fixedBuckets = spendingBuckets.filter(
    (bucket) => bucket.group === "FIXED",
  );
  const everydayBuckets = spendingBuckets.filter(
    (bucket) => bucket.group !== "FIXED",
  );
  const overEverydayPlan = plan.flexibleAvailableMinor < 0;
  const everydayAmount = formatMinor(
    Math.abs(plan.flexibleAvailableMinor),
    plan.currency,
  );

  return (
    <>
      {hasIncome ? (
        <section
          aria-labelledby="everyday-spending-heading"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-6 sm:px-5 sm:py-7"
        >
          <p
            id="everyday-spending-heading"
            className="text-sm font-medium text-zinc-600"
          >
            {overEverydayPlan
              ? "Over your everyday spending plan"
              : "Left for everyday spending"}
          </p>
          <p
            className={`mt-2 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl ${overEverydayPlan ? "text-[var(--color-semantic-negative)]" : "text-zinc-950"}`}
          >
            {everydayAmount}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            From {formatMinor(plan.incomeMinor, plan.currency)} received in{" "}
            {month}. Food, travel, Extra, and purchases still waiting for a
            category are included here.
          </p>
        </section>
      ) : (
        <WaitingForIncome month={month} plan={plan} targetMinor={targetMinor} />
      )}

      {fixedBuckets.length > 0 && (
        <PlanSection heading="Fixed costs">
          <ul className="money-plan-section__list">
            {fixedBuckets.map((bucket) => (
              <SpendingEnvelopeRow
                bucket={bucket}
                currency={plan.currency}
                key={bucket.id}
              />
            ))}
          </ul>
        </PlanSection>
      )}

      {everydayBuckets.length > 0 && (
        <PlanSection heading="Everyday spending">
          <ul className="money-plan-section__list">
            {everydayBuckets.map((bucket) => (
              <SpendingEnvelopeRow
                bucket={bucket}
                currency={plan.currency}
                key={bucket.id}
              />
            ))}
          </ul>
        </PlanSection>
      )}

      {spendingBuckets.length === 0 && (
        <EmptyPlanView text="Add an everyday spending or fixed-cost item in Edit plan." />
      )}
      <EnvelopeNotices plan={plan} />
    </>
  );
}

function SavingsPlanView({
  futureBuckets,
  hasIncome,
  month,
  plan,
  targetMinor,
}: {
  futureBuckets: IncomeEnvelopePlan["buckets"];
  hasIncome: boolean;
  month: string;
  plan: IncomeEnvelopePlan;
  targetMinor: number;
}) {
  const reserveBuckets = futureBuckets.filter(
    (bucket) => bucket.purpose === "RESERVE",
  );
  const goalBuckets = futureBuckets.filter(
    (bucket) => bucket.purpose === "GOAL",
  );

  return (
    <>
      {hasIncome ? (
        <section
          aria-labelledby="savings-reserves-heading"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-6 sm:px-5 sm:py-7"
        >
          <p
            id="savings-reserves-heading"
            className="text-sm font-medium text-zinc-600"
          >
            Reserved in your plan
          </p>
          <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
            {formatMinor(plan.reservedInPlanMinor, plan.currency)}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            {plan.contributedMinor > 0
              ? `${formatMinor(plan.contributedMinor, plan.currency)} has actually been saved, invested, or paid this month.`
              : "Nothing has been saved, invested, or paid from these items yet."}
          </p>
        </section>
      ) : (
        <WaitingForIncome month={month} plan={plan} targetMinor={targetMinor} />
      )}

      {reserveBuckets.length > 0 && (
        <PlanSection heading="Reserves">
          <ul className="money-plan-section__list">
            {reserveBuckets.map((bucket) => (
              <FutureEnvelopeRow
                bucket={bucket}
                currency={plan.currency}
                key={bucket.id}
              />
            ))}
          </ul>
        </PlanSection>
      )}

      {goalBuckets.length > 0 && (
        <PlanSection heading="Savings goals">
          <ul className="money-plan-section__list">
            {goalBuckets.map((bucket) => (
              <FutureEnvelopeRow
                bucket={bucket}
                currency={plan.currency}
                key={bucket.id}
              />
            ))}
          </ul>
        </PlanSection>
      )}

      {futureBuckets.length === 0 && (
        <EmptyPlanView text="Add a savings goal or reserve in Edit plan." />
      )}
    </>
  );
}

function WaitingForIncome({
  month,
  plan,
  targetMinor,
}: {
  month: string;
  plan: IncomeEnvelopePlan;
  targetMinor: number;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-5 sm:px-5">
      <p className="font-semibold text-zinc-950">Waiting for income</p>
      <p className="mt-1 text-sm leading-6 text-zinc-600">
        No cleared income in {month} yet.
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        {formatMinor(targetMinor, plan.currency)} planned this month.
      </p>
    </section>
  );
}

function EmptyPlanView({ text }: { text: string }) {
  return (
    <p className="border-b border-zinc-200 px-4 py-5 text-sm text-zinc-500 sm:px-5">
      {text}
    </p>
  );
}

function PlanSection({
  children,
  className,
  description,
  heading,
}: {
  children: React.ReactNode;
  className?: string;
  description?: string;
  heading: string;
}) {
  const headingId = `${heading.toLocaleLowerCase().replace(/[^a-z]+/g, "-")}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      className={`money-plan-section ${className ?? ""}`}
    >
      <div className="money-plan-section__header">
        <h3 id={headingId} className="money-plan-section__heading">
          {heading}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function SpendingEnvelopeRow({
  bucket,
  currency,
}: {
  bucket: IncomeEnvelopePlan["buckets"][number];
  currency: string;
}) {
  const awaitingIncome = bucket.fundedMinor === 0 && bucket.spentMinor === 0;
  const remainingLabel = awaitingIncome
    ? ""
    : bucket.availableMinor < 0
      ? `${formatMinor(Math.abs(bucket.availableMinor), currency)} over`
      : bucket.type === "REMAINDER"
        ? `${formatMinor(bucket.availableMinor, currency)} free to spend`
        : `${formatMinor(bucket.availableMinor, currency)} left`;
  const spentColour =
    bucket.state === "over"
      ? "bg-[var(--color-semantic-negative)]"
      : "bg-[var(--color-money-actual)]";

  return (
    <li className="money-plan-envelope grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="money-plan-envelope__name">{bucket.name}</h3>
            <span className="text-xs text-zinc-500">
              {ruleLabel(bucket, currency)}
            </span>
            {bucket.categoryNames.map((category) => (
              <Badge
                key={category}
                variant="outline"
                className="rounded-md border-zinc-200 bg-zinc-50 font-normal text-zinc-600"
              >
                {category}
              </Badge>
            ))}
          </div>
          {!awaitingIncome && (
            <p className="mt-1 text-xs text-zinc-500">
              {bucket.type === "REMAINDER"
                ? "Uses the income left after your other targets are assigned."
                : bucket.shortfallMinor > 0
                  ? `${formatMinor(bucket.shortfallMinor, currency)} still to assign this month.`
                  : "Fully assigned this month."}
            </p>
          )}
          {awaitingIncome && bucket.type === "REMAINDER" && (
            <p className="mt-1 text-xs text-zinc-500">
              Uses the income left after your other targets are assigned.
            </p>
          )}
        </div>
        {!awaitingIncome && (
          <p
            className={`text-right text-sm font-semibold tabular-nums ${bucket.availableMinor < 0 ? "text-[var(--color-semantic-negative)]" : "text-zinc-950"}`}
          >
            {remainingLabel}
          </p>
        )}
      </div>

      {bucket.type !== "REMAINDER" ? (
        <StackedPlanMeter
          actualColour={spentColour}
          actualWithinPlanned
          actualLabel="Spent"
          actualMinor={bucket.spentMinor}
          currency={currency}
          plannedColour="bg-[var(--color-money-available)]"
          plannedLabel="Available"
          plannedMinor={bucket.fundedMinor}
          targetMinor={bucket.requestedMinor}
        />
      ) : (
        <p className="text-sm tabular-nums text-zinc-500">
          {formatMinor(bucket.spentMinor, currency)} spent
          {bucket.pendingSpendMinor > 0
            ? `, including ${formatMinor(bucket.pendingSpendMinor, currency)} pending`
            : ""}
        </p>
      )}
    </li>
  );
}

function FutureEnvelopeRow({
  bucket,
  currency,
}: {
  bucket: IncomeEnvelopePlan["buckets"][number];
  currency: string;
}) {
  const awaitingIncome = bucket.fundedMinor === 0 && bucket.spentMinor === 0;
  const contributedBeyondPlan = bucket.availableMinor < 0;
  const label = awaitingIncome
    ? "Waiting for income"
    : contributedBeyondPlan
      ? `${formatMinor(Math.abs(bucket.availableMinor), currency)} contributed beyond this month’s target`
      : `${formatMinor(bucket.availableMinor, currency)} assigned in plan`;
  const contributionText =
    bucket.pendingContributionMinor > 0
      ? `${formatMinor(bucket.contributedMinor, currency)} contributed · ${formatMinor(bucket.pendingContributionMinor, currency)} pending`
      : `${formatMinor(bucket.contributedMinor, currency)} contributed this month`;

  return (
    <li className="money-plan-envelope grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="money-plan-envelope__name">{bucket.name}</h3>
            <span className="text-xs text-zinc-500">
              {bucket.purpose === "RESERVE" ? "reserve" : "savings goal"} ·{" "}
              {ruleLabel(bucket, currency)}
            </span>
            {bucket.categoryNames.map((category) => (
              <Badge
                key={category}
                variant="outline"
                className="rounded-md border-zinc-200 bg-zinc-50 font-normal text-zinc-600"
              >
                {category}
              </Badge>
            ))}
          </div>
          {!awaitingIncome && (
            <p className="mt-1 text-xs text-zinc-500">
              {contributionText}
              {bucket.shortfallMinor > 0
                ? ` · ${formatMinor(bucket.shortfallMinor, currency)} still to assign`
                : ""}
            </p>
          )}
        </div>
        {!awaitingIncome && (
          <p
            className={`max-w-56 text-right text-sm font-semibold tabular-nums ${contributedBeyondPlan ? "text-[var(--color-semantic-positive-strong)]" : "text-zinc-950"}`}
          >
            {label}
          </p>
        )}
      </div>

      <StackedPlanMeter
        actualColour="bg-[var(--color-money-available)]"
        actualLabel="Contributed"
        actualMinor={bucket.contributedMinor}
        currency={currency}
        plannedColour="bg-[var(--color-money-available-soft)]"
        plannedLabel="Reserved"
        plannedMinor={bucket.fundedMinor}
        targetMinor={bucket.requestedMinor}
      />
    </li>
  );
}

function StackedPlanMeter({
  actualColour,
  actualLabel,
  actualMinor,
  actualWithinPlanned = false,
  currency,
  plannedColour,
  plannedLabel,
  plannedMinor,
  targetMinor,
}: {
  actualColour: string;
  actualLabel: string;
  actualMinor: number;
  actualWithinPlanned?: boolean;
  currency: string;
  plannedColour: string;
  plannedLabel: string;
  plannedMinor: number;
  targetMinor: number;
}) {
  const total = Math.max(targetMinor, 1);
  const actual = Math.max(
    0,
    Math.min(actualMinor, actualWithinPlanned ? plannedMinor : total, total),
  );
  const plannedUnused = Math.max(
    0,
    Math.min(plannedMinor - actualMinor, total - actual),
  );
  const representedProgress = actualWithinPlanned
    ? plannedMinor
    : Math.max(actualMinor, plannedMinor);
  const notFunded = Math.max(targetMinor - representedProgress, 0);
  const actualPercent = (actual / total) * 100;
  const plannedPercent = (plannedUnused / total) * 100;

  return (
    <div className="grid gap-2.5">
      <div
        aria-label={`${actualLabel} ${formatMinor(actualMinor, currency)}, ${plannedLabel} ${formatMinor(plannedUnused, currency)}, not funded ${formatMinor(notFunded, currency)}`}
        className="flex h-2.5 overflow-hidden rounded-full bg-zinc-100"
        role="img"
      >
        {actualPercent > 0 && (
          <span
            aria-hidden="true"
            className={`h-full ${actualColour}`}
            style={{ width: `${actualPercent}%` }}
          />
        )}
        {plannedPercent > 0 && (
          <span
            aria-hidden="true"
            className={`h-full ${plannedColour}`}
            style={{ width: `${plannedPercent}%` }}
          />
        )}
      </div>
      <div className="money-plan-legend flex flex-wrap gap-x-5 gap-y-1 text-sm tabular-nums text-zinc-600">
        {actualMinor > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <i aria-hidden="true" className={`size-2 rounded-full ${actualColour}`} />
            {actualLabel} {formatMinor(actualMinor, currency)}
          </span>
        )}
        {plannedUnused > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <i aria-hidden="true" className={`size-2 rounded-full ${plannedColour}`} />
            {plannedLabel} {formatMinor(plannedUnused, currency)}
          </span>
        )}
        {notFunded > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <i aria-hidden="true" className="size-2 rounded-full bg-zinc-200" />
            Not funded {formatMinor(notFunded, currency)}
          </span>
        )}
      </div>
    </div>
  );
}

function EnvelopeNotices({ plan }: { plan: IncomeEnvelopePlan }) {
  const notices: Array<{
    id: string;
    text: React.ReactNode;
    tone: "attention" | "neutral";
  }> = [];
  if (plan.incomeMinor > 0 && plan.shortfallMinor > 0) {
    notices.push({
      id: "shortfall",
      tone: "neutral",
      text: (
        <>
          {formatMinor(plan.shortfallMinor, plan.currency)} of this month’s plan
          is still waiting for income. Income is shared across every target as
          it arrives.
        </>
      ),
    });
  }
  if (plan.unallocatedMinor > 0) {
    notices.push({
      id: "unallocated",
      tone: "neutral",
      text: (
        <>
          {formatMinor(plan.unallocatedMinor, plan.currency)} has no plan item
          yet. Add a “Whatever is left” item or another target in Edit plan.
        </>
      ),
    });
  }
  if (plan.pendingSpendMinor > 0) {
    notices.push({
      id: "pending",
      tone: "neutral",
      text: (
        <>
          {formatMinor(plan.pendingSpendMinor, plan.currency)} of pending
          transactions is already reflected in this plan.
        </>
      ),
    });
  }
  if (plan.unassignedSpendMinor > 0) {
    const extraExists = plan.buckets.some(
      (bucket) => bucket.purpose === "SPENDING" && bucket.type === "REMAINDER",
    );
    notices.push({
      id: "unassigned",
      tone: "attention",
      text: extraExists ? (
        <>
          {formatMinor(plan.unassignedSpendMinor, plan.currency)} of purchases
          is included in Extra because its category is not connected to a plan
          item.{" "}
          <Link
            to="/app/transactions"
            className="font-medium underline underline-offset-4"
          >
            Review categories
          </Link>
          .
        </>
      ) : (
        <>
          {formatMinor(plan.unassignedSpendMinor, plan.currency)} of purchases
          has no plan item yet and reduces your everyday amount.{" "}
          <Link
            to="/app/transactions"
            className="font-medium underline underline-offset-4"
          >
            Review categories
          </Link>
          .
        </>
      ),
    });
  }
  if (plan.excludedIncomeMinor > 0 || plan.excludedSpendMinor > 0) {
    notices.push({
      id: "currency",
      tone: "neutral",
      text: (
        <>
          Transactions in other currencies are excluded:{" "}
          {formatMinor(plan.excludedIncomeMinor, plan.currency)} income and{" "}
          {formatMinor(plan.excludedSpendMinor, plan.currency)} spending. Wollie
          does not convert currencies automatically.
        </>
      ),
    });
  }
  if (notices.length === 0) return null;

  return (
    <div className="wollie-notes grid gap-px border-t border-zinc-200 bg-zinc-200">
      {notices.map((notice) => (
        <p
          className={`bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-700 sm:px-5 ${notice.tone === "attention" ? "font-medium" : ""}`}
          key={notice.id}
        >
          {notice.text}
        </p>
      ))}
    </div>
  );
}

function EnvelopeEditor({
  availableCurrencies,
  canChangeCurrency,
  categoryOptions,
  currency,
  initialDrafts,
  initialPlan,
  onCancel,
  onSave,
}: {
  availableCurrencies: string[];
  canChangeCurrency: boolean;
  categoryOptions: string[];
  currency: string;
  initialDrafts?: EnvelopeDraft[];
  initialPlan?: IncomeEnvelopePlan;
  onCancel: () => void;
  onSave: (payload: EnvelopePlanPayload) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<EnvelopeDraft[]>(
    () => initialDrafts ?? draftsFromPlan(initialPlan) ?? [emptyDraft()],
  );
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newCategoryNames, setNewCategoryNames] = useState<
    Record<string, string>
  >({});
  const selectableCategories = Array.from(
    new Set([
      ...categoryOptions,
      ...drafts.flatMap((draft) => draft.categoryNames),
    ]),
  ).sort((left, right) => left.localeCompare(right));

  function updateDraft(id: string, change: Partial<EnvelopeDraft>) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === id ? { ...draft, ...change } : draft,
      ),
    );
  }

  function updateRuleType(id: string, type: IncomeAllocationRuleType) {
    setDrafts((current) => {
      const next = current.map((draft) => {
        if (draft.id === id) return { ...draft, type };
        if (type === "REMAINDER" && draft.type === "REMAINDER")
          return { ...draft, type: "FIXED" as const, fixedAmount: "" };
        return draft;
      });
      if (type !== "REMAINDER") return next;
      const selected = next.find((draft) => draft.id === id)!;
      return [...next.filter((draft) => draft.id !== id), selected];
    });
  }

  function updatePlanKind(id: string, kind: PlanKind) {
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== id) return draft;
        const { group, purpose } = planKindValues(kind);
        return {
          ...draft,
          group,
          purpose,
          type:
            purpose === "SPENDING" || draft.type !== "REMAINDER"
              ? draft.type
              : "FIXED",
        };
      }),
    );
  }

  function toggleCategory(id: string, categoryName: string) {
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== id) {
          return {
            ...draft,
            categoryNames: draft.categoryNames.filter(
              (name) => name !== categoryName,
            ),
          };
        }
        const selected = draft.categoryNames.includes(categoryName);
        return {
          ...draft,
          categoryNames: selected
            ? draft.categoryNames.filter((name) => name !== categoryName)
            : [...draft.categoryNames, categoryName],
        };
      }),
    );
  }

  function addEnvelope() {
    setDrafts((current) => {
      const next = emptyDraft();
      const remainderIndex = current.findIndex(
        (draft) => draft.type === "REMAINDER",
      );
      return remainderIndex < 0
        ? [...current, next]
        : [
            ...current.slice(0, remainderIndex),
            next,
            ...current.slice(remainderIndex),
          ];
    });
  }

  function addCategory(id: string) {
    const categoryName = newCategoryNames[id]?.trim().replace(/\s+/g, " ");
    if (!categoryName) return;
    toggleCategory(id, categoryName);
    setNewCategoryNames((current) => ({ ...current, [id]: "" }));
  }

  async function submit() {
    setSaving(true);
    setError("");
    try {
      await onSave({
        currency: canChangeCurrency ? selectedCurrency : undefined,
        buckets: drafts.map((draft, priority) => ({
          name: draft.name,
          group: draft.group,
          purpose: draft.purpose,
          type: draft.type,
          fixedAmount: draft.type === "FIXED" ? draft.fixedAmount : undefined,
          percentage:
            draft.type === "PERCENT_OF_INCOME" ? draft.percentage : undefined,
          priority,
          categoryNames: draft.categoryNames,
        })),
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save the plan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="allocation-rules-heading"
      className="border border-zinc-200 bg-white"
    >
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
        <div>
          <h2 id="allocation-rules-heading" className="font-semibold">
            Your plan items
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            Income is shared across your targets proportionally. This is a plan
            only. Wollie does not move money between your bank accounts.
          </p>
        </div>
        {canChangeCurrency ? (
          <label className="grid gap-1 text-xs text-zinc-500">
            Base currency
            <select
              value={selectedCurrency}
              onChange={(event) => setSelectedCurrency(event.target.value)}
              className="min-h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 outline-none focus-visible:border-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-300"
            >
              {availableCurrencies.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm text-zinc-500">
            Base currency · {selectedCurrency}
            <br />
            <span className="text-xs">
              Only the household owner can change it.
            </span>
          </p>
        )}
      </div>

      <div className="divide-y divide-zinc-200">
        {drafts.map((draft, index) => (
          <article className="grid gap-4 px-4 py-5 sm:px-5" key={draft.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                Plan item {index + 1}
              </p>
              <Button
                aria-label={`Remove ${draft.name || "plan item"}`}
                className="min-h-11 border-zinc-200 text-zinc-700 hover:text-[var(--color-semantic-negative)]"
                disabled={drafts.length === 1}
                onClick={() =>
                  setDrafts((current) =>
                    current.filter((candidate) => candidate.id !== draft.id),
                  )
                }
                size="sm"
                type="button"
                variant="outline"
              >
                <Trash2 aria-hidden="true" />
                Remove
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.25fr)_minmax(11rem,0.9fr)_minmax(11rem,0.9fr)_minmax(9rem,0.6fr)] xl:items-end">
              <label className="grid gap-1 text-xs text-zinc-500">
                Name
                <Input
                  aria-label="Plan item name"
                  className="min-h-11 border-zinc-200 bg-white text-sm text-zinc-950"
                  onChange={(event) =>
                    updateDraft(draft.id, { name: event.target.value })
                  }
                  placeholder="Food"
                  value={draft.name}
                />
              </label>
              <label className="grid gap-1 text-xs text-zinc-500">
                Plan for
                <select
                  value={planKindFor(draft)}
                  onChange={(event) =>
                    updatePlanKind(draft.id, event.target.value as PlanKind)
                  }
                  className="min-h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus-visible:border-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-300"
                >
                  {PLAN_KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-zinc-500">
                Income rule
                <select
                  value={draft.type}
                  onChange={(event) =>
                    updateRuleType(
                      draft.id,
                      event.target.value as IncomeAllocationRuleType,
                    )
                  }
                  className="min-h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus-visible:border-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-300"
                >
                  {(draft.purpose === "SPENDING"
                    ? RULE_OPTIONS
                    : RULE_OPTIONS.filter(
                        (option) => option.value !== "REMAINDER",
                      )
                  ).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {draft.type === "FIXED" && (
                <label className="grid gap-1 text-xs text-zinc-500">
                  Amount per month
                  <Input
                    aria-label={`Amount per month for ${draft.name || "plan item"}`}
                    className="min-h-11 border-zinc-200 bg-white text-sm text-zinc-950"
                    inputMode="decimal"
                    onChange={(event) =>
                      updateDraft(draft.id, { fixedAmount: event.target.value })
                    }
                    placeholder="0.00"
                    value={draft.fixedAmount}
                  />
                </label>
              )}
              {draft.type === "PERCENT_OF_INCOME" && (
                <label className="grid gap-1 text-xs text-zinc-500">
                  % of income
                  <Input
                    aria-label={`Income percentage for ${draft.name || "plan item"}`}
                    className="min-h-11 border-zinc-200 bg-white text-sm text-zinc-950"
                    inputMode="decimal"
                    onChange={(event) =>
                      updateDraft(draft.id, { percentage: event.target.value })
                    }
                    placeholder="10"
                    value={draft.percentage}
                  />
                </label>
              )}
              {draft.type === "REMAINDER" && (
                <div className="min-h-11 content-center text-sm text-zinc-500">
                  Receives any income left after the other targets.
                </div>
              )}
            </div>

            <details className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
              <summary className="min-h-9 cursor-pointer content-center text-sm font-medium text-zinc-700">
                Connect transaction categories
                {draft.categoryNames.length > 0
                  ? ` · ${draft.categoryNames.length} selected`
                  : ""}
              </summary>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                {draft.purpose === "SPENDING"
                  ? "Purchases in these categories update this plan item. Each category can connect to one plan item."
                  : "Choose categories only when a real payment should count as saved or contributed. You can leave this empty."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectableCategories.length > 0 ? (
                  selectableCategories.map((category) => {
                    const selected = draft.categoryNames.includes(category);
                    return (
                      <button
                        aria-pressed={selected}
                        className={`min-h-11 rounded-md border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${selected ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-500"}`}
                        key={category}
                        onClick={() => toggleCategory(draft.id, category)}
                        type="button"
                      >
                        {category}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-zinc-500">
                    Save once to create the standard transaction categories,
                    then map them here.
                  </p>
                )}
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:max-w-sm sm:flex-row">
                <Input
                  aria-label={`New transaction category for ${draft.name || "plan item"}`}
                  className="min-h-11 border-zinc-200 bg-white text-sm text-zinc-950"
                  maxLength={48}
                  onChange={(event) =>
                    setNewCategoryNames((current) => ({
                      ...current,
                      [draft.id]: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCategory(draft.id);
                    }
                  }}
                  placeholder="Add a custom category"
                  value={newCategoryNames[draft.id] ?? ""}
                />
                <Button
                  className="min-h-11 border-zinc-200 bg-white text-zinc-950"
                  onClick={() => addCategory(draft.id)}
                  type="button"
                  variant="outline"
                >
                  Add
                </Button>
              </div>
            </details>
          </article>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <Button
          className="min-h-11 border-zinc-200 bg-white text-zinc-950"
          onClick={addEnvelope}
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" />
          Add plan item
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="min-h-11 border-zinc-200 bg-white text-zinc-950"
            disabled={saving}
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="wollie-primary-action min-h-11"
            disabled={saving}
            onClick={() => void submit()}
            type="button"
          >
            {saving ? "Saving…" : "Save plan"}
          </Button>
        </div>
      </div>
      {error && (
        <p
          className="border-t border-[var(--color-semantic-negative-border)] bg-[var(--color-semantic-negative-soft)] px-4 py-3 text-sm font-medium text-[var(--color-semantic-negative)] sm:px-5"
          role="alert"
        >
          {error}
        </p>
      )}
    </section>
  );
}

function formatMinor(amount: number, currency: string) {
  return formatMoney(amount / 100, currency);
}

function planKindFor(
  draft: Pick<EnvelopeDraft, "group" | "purpose">,
): PlanKind {
  if (draft.purpose === "RESERVE") return "SET_ASIDE";
  if (draft.purpose === "GOAL") return "SAVINGS_GOAL";
  return draft.group === "FIXED" ? "MONTHLY_BILL" : "EVERYDAY_SPENDING";
}

function planKindValues(kind: PlanKind): {
  group: BudgetBucketGroup;
  purpose: BudgetBucketPurpose;
} {
  if (kind === "MONTHLY_BILL") return { group: "FIXED", purpose: "SPENDING" };
  if (kind === "EVERYDAY_SPENDING")
    return { group: "FLEXIBLE", purpose: "SPENDING" };
  if (kind === "SET_ASIDE") return { group: "FUTURE", purpose: "RESERVE" };
  return { group: "FUTURE", purpose: "GOAL" };
}

function ruleLabel(
  bucket: IncomeEnvelopePlan["buckets"][number],
  currency: string,
) {
  if (bucket.type === "REMAINDER") return "uses what is left";
  if (bucket.type === "PERCENT_OF_INCOME")
    return `${(bucket.percentageBasisPoints ?? 0) / 100}% of income`;
  return `${formatMinor(bucket.fixedMinor ?? 0, currency)} each month`;
}

function draftsFromPlan(
  plan?: IncomeEnvelopePlan,
): EnvelopeDraft[] | undefined {
  if (!plan?.enabled) return undefined;
  return plan.buckets.map((bucket) => ({
    id: bucket.id,
    name: bucket.name,
    group: bucket.group,
    purpose: bucket.purpose,
    type: bucket.type,
    fixedAmount:
      bucket.fixedMinor == null ? "" : String(bucket.fixedMinor / 100),
    percentage:
      bucket.percentageBasisPoints == null
        ? ""
        : String(bucket.percentageBasisPoints / 100),
    categoryNames: bucket.categoryNames,
  }));
}

function householdStarterDrafts(categoryOptions: string[]) {
  const available = new Set(categoryOptions);
  const categories = (...names: string[]) =>
    names.filter((name) => available.has(name));
  return [
    draft({
      name: "Pension",
      group: "FUTURE",
      purpose: "GOAL",
      type: "FIXED",
      fixedAmount: "5000",
    }),
    draft({
      name: "Savings",
      group: "FUTURE",
      purpose: "GOAL",
      type: "FIXED",
      fixedAmount: "5000",
    }),
    draft({
      name: "Tax",
      group: "FUTURE",
      purpose: "RESERVE",
      type: "FIXED",
      fixedAmount: "7000",
      categoryNames: ["Tax"],
    }),
    draft({
      name: "Rent",
      group: "FIXED",
      purpose: "SPENDING",
      type: "FIXED",
      fixedAmount: "300",
      categoryNames: categories("Housing"),
    }),
    draft({
      name: "Food",
      group: "FLEXIBLE",
      purpose: "SPENDING",
      type: "FIXED",
      fixedAmount: "1000",
      categoryNames: categories("Groceries", "Dining"),
    }),
    draft({
      name: "Travel",
      group: "FLEXIBLE",
      purpose: "SPENDING",
      type: "FIXED",
      fixedAmount: "1000",
      categoryNames: categories("Transport"),
    }),
    draft({
      name: "Extra",
      group: "FLEXIBLE",
      purpose: "SPENDING",
      type: "REMAINDER",
      categoryNames: categories("Shopping", "Health", "Subscriptions"),
    }),
  ];
}

function emptyDraft(): EnvelopeDraft {
  return draft({
    name: "",
    group: "FLEXIBLE",
    purpose: "SPENDING",
    type: "FIXED",
    fixedAmount: "",
  });
}

function draft(
  input: Omit<
    EnvelopeDraft,
    "id" | "percentage" | "categoryNames" | "fixedAmount"
  > &
    Partial<
      Pick<EnvelopeDraft, "percentage" | "categoryNames" | "fixedAmount">
    >,
): EnvelopeDraft {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fixedAmount: "",
    percentage: "",
    categoryNames: [],
    ...input,
  };
}
