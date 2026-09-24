import { createFileRoute } from "@tanstack/react-router";
import { BudgetsScreen } from "#/components/money/BudgetsScreen";
import { getDemoMoneyOverview } from "#/lib/money-overview";

export const Route = createFileRoute("/demo/budgets")({
  loader: () => getDemoMoneyOverview(),
  component: DemoBudgetsPage,
});

function DemoBudgetsPage() {
  return <BudgetsScreen overview={Route.useLoaderData()} demo />;
}
