import { createFileRoute } from "@tanstack/react-router";
import { HomeScreen } from "#/components/money/HomeScreen";
import { getDemoMoneyOverview } from "#/lib/money-overview";

export const Route = createFileRoute("/demo/")({
  loader: () => getDemoMoneyOverview(),
  component: DemoHomePage,
});

function DemoHomePage() {
  return <HomeScreen overview={Route.useLoaderData()} demo />;
}
