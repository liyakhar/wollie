import { createFileRoute } from "@tanstack/react-router";
import { GoalsScreen } from "#/components/money/GoalsScreen";
import { getDemoMoneyOverview } from "#/lib/money-overview";

export const Route = createFileRoute("/demo/goals")({
  loader: () => getDemoMoneyOverview(),
  component: DemoGoalsPage,
});

function DemoGoalsPage() {
  return <GoalsScreen overview={Route.useLoaderData()} demo />;
}
