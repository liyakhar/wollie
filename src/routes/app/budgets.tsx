import { createFileRoute } from "@tanstack/react-router";
import { BudgetsScreen } from "#/components/money/BudgetsScreen";
import { getMoneyOverview } from "#/server/money";

export const Route = createFileRoute("/app/budgets")({
  loader: () => getMoneyOverview(),
  head: () => ({ meta: [{ title: "Budgets · Wollie" }] }),
  component: BudgetsPage,
});

function BudgetsPage() {
  return <BudgetsScreen overview={Route.useLoaderData()} />;
}
