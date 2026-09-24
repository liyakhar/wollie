import { createFileRoute } from "@tanstack/react-router";
import { GoalsScreen } from "#/components/money/GoalsScreen";
import { getMoneyOverview } from "#/server/money";

export const Route = createFileRoute("/app/goals")({
  loader: () => getMoneyOverview(),
  head: () => ({ meta: [{ title: "Goals · Wollie" }] }),
  component: GoalsPage,
});

function GoalsPage() {
  return <GoalsScreen overview={Route.useLoaderData()} />;
}
