import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { BillsScreen } from "#/components/money/BillsScreen";
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
  formatMoney,
  type RecurringPayment,
  type TransactionCategoryName,
} from "#/lib/finance-demo";
import {
  getFinanceRecurringPayments,
  updateFinanceRecurringPayment,
} from "#/server/finance";

export const Route = createFileRoute("/app/recurring")({
  loader: () => getFinanceRecurringPayments(),
  component: BillsPage,
});

function BillsPage() {
  return <BillsScreen data={Route.useLoaderData()} />;
}

type Draft = Pick<
  RecurringPayment,
  | "id"
  | "merchant"
  | "amount"
  | "nextDate"
  | "cadence"
  | "category"
  | "confirmed"
>;

export function RecurringPage() {
  const { categoryOptions, currency, recurringPayments } =
    Route.useLoaderData();
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      recurringPayments.map((item) => [
        item.id,
        { ...item, nextDate: toDateInput(item.nextDate) },
      ]),
    ),
  );
  const [newBill, setNewBill] = useState<Draft>({
    id: "",
    merchant: "",
    amount: 0,
    nextDate: toDateInput(new Date().toISOString()),
    cadence: "monthly",
    category: "Subscriptions",
    confirmed: true,
  });
  const [showAddBill, setShowAddBill] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function persist(draft: Draft, action: "confirm" | "save" | "dismiss") {
    const key = draft.id || "new";
    setSaving(key);
    setMessage("");
    try {
      await updateFinanceRecurringPayment({ data: { ...draft, action } });
      await router.invalidate();
      if (!draft.id) setNewBill({ ...newBill, merchant: "", amount: 0 });
      setMessage(
        action === "dismiss"
          ? `${draft.merchant} dismissed.`
          : `${draft.merchant} saved.`,
      );
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "Could not update the bill.",
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
        <h1 className="text-2xl font-semibold tracking-tight">
          Upcoming
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
          See repeating bills and subscriptions before they are due.
        </p>
      </header>

      {showAddBill && (
        <section
          aria-labelledby="add-bill-heading"
          className="rounded-lg border border-zinc-200 p-4 sm:p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 id="add-bill-heading" className="font-semibold">
              Add a bill
            </h2>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAddBill(false)}
            >
              Cancel
            </Button>
          </div>
          <div className="mt-4">
            <BillFields
              categoryOptions={categoryOptions}
              draft={newBill}
              onChange={setNewBill}
            />
          </div>
          <Button
            className="wollie-primary-action mt-3 min-h-11"
            disabled={saving === "new"}
            onClick={() => void persist(newBill, "save")}
          >
            {saving === "new" ? "Adding…" : "Add bill"}
          </Button>
        </section>
      )}

      <section
        aria-labelledby="bill-list-heading"
        className="overflow-hidden rounded-lg border border-zinc-200"
      >
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <h2 id="bill-list-heading" className="font-semibold">
              Recurring payments
            </h2>
            {recurringPayments.length > 0 && (
              <span className="text-sm text-zinc-500">
                {recurringPayments.length}
              </span>
            )}
          </div>
          {!showAddBill && (
            <Button
              type="button"
              size="sm"
              className="wollie-primary-action"
              onClick={() => setShowAddBill(true)}
            >
              Add bill
            </Button>
          )}
        </div>
        {recurringPayments.length > 0 ? (
          <ul className="divide-y divide-zinc-200">
            {recurringPayments.map((item) => {
              const draft = drafts[item.id] ?? {
                ...item,
                nextDate: toDateInput(item.nextDate),
              };
              return (
                <li key={item.id} className="p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{item.merchant}</h3>
                        <Badge
                          variant="outline"
                          className="rounded-md font-normal"
                        >
                          {item.confirmed === false ? "Detected" : "Confirmed"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">
                        {formatMoney(-item.amount, item.currency || currency)} ·{" "}
                        {item.cadence}
                      </p>
                    </div>
                  </div>
                  <BillFields
                    categoryOptions={categoryOptions}
                    draft={draft}
                    onChange={(next) =>
                      setDrafts((current) => ({ ...current, [item.id]: next }))
                    }
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      className="wollie-primary-action min-h-11"
                      disabled={saving === item.id}
                      onClick={() =>
                        void persist(
                          draft,
                          item.confirmed === false ? "confirm" : "save",
                        )
                      }
                    >
                      {saving === item.id
                        ? "Saving…"
                        : item.confirmed === false
                          ? "Confirm bill"
                          : "Save changes"}
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-11 border-zinc-200 bg-white"
                      disabled={saving === item.id}
                      onClick={() => void persist(draft, "dismiss")}
                    >
                      {item.confirmed === false ? "Not recurring" : "Remove"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-zinc-500">
            No recurring payments yet.
          </p>
        )}
      </section>
      <p className="min-h-5 text-sm text-zinc-600" aria-live="polite">
        {message}
      </p>
    </main>
  );
}

function BillFields({
  categoryOptions,
  draft,
  onChange,
}: {
  categoryOptions: string[];
  draft: Draft;
  onChange: (draft: Draft) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_8rem_10rem_10rem_minmax(0,1fr)]">
      <label className="grid gap-1 text-xs text-zinc-500">
        Merchant
        <Input
          name={`merchant-${draft.id || "new"}`}
          value={draft.merchant}
          onChange={(event) =>
            onChange({ ...draft, merchant: event.target.value })
          }
          className="min-h-11 border-zinc-200 bg-white text-zinc-950"
        />
      </label>
      <label className="grid gap-1 text-xs text-zinc-500">
        Amount
        <Input
          name={`amount-${draft.id || "new"}`}
          inputMode="decimal"
          value={draft.amount || ""}
          onChange={(event) =>
            onChange({ ...draft, amount: Number(event.target.value) })
          }
          className="min-h-11 border-zinc-200 bg-white text-zinc-950"
        />
      </label>
      <label className="grid gap-1 text-xs text-zinc-500">
        Next date
        <Input
          name={`date-${draft.id || "new"}`}
          type="date"
          value={draft.nextDate}
          onChange={(event) =>
            onChange({ ...draft, nextDate: event.target.value })
          }
          className="min-h-11 border-zinc-200 bg-white text-zinc-950"
        />
      </label>
      <label className="grid gap-1 text-xs text-zinc-500">
        Cadence
        <Select
          value={draft.cadence}
          onValueChange={(value) =>
            onChange({ ...draft, cadence: value as Draft["cadence"] })
          }
        >
          <SelectTrigger className="min-h-11 border-zinc-200 bg-white text-zinc-950">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-xs text-zinc-500">
        Category
        <Select
          value={draft.category}
          onValueChange={(value) =>
            onChange({ ...draft, category: value as TransactionCategoryName })
          }
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
          </SelectContent>
        </Select>
      </label>
    </div>
  );
}

function toDateInput(value: string) {
  const hasYear = /\d{4}/.test(value);
  const date = new Date(
    hasYear
      ? `${value.slice(0, 10)}T12:00:00`
      : `${value}, ${new Date().getFullYear()} 12:00:00`,
  );
  if (Number.isNaN(date.getTime())) return toLocalDateInput(new Date());
  return toLocalDateInput(date);
}

function toLocalDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
