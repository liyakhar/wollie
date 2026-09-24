import { createFileRoute } from "@tanstack/react-router";
import { ActivityScreen } from "#/components/money/ActivityScreen";
import { getPublicDemoTransactionsData } from "#/lib/public-demo";

export const Route = createFileRoute("/demo/transactions")({
  loader: () => getPublicDemoTransactionsData(),
  component: DemoTransactionsPage,
});

function DemoTransactionsPage() {
  return <ActivityScreen data={Route.useLoaderData()} readOnly />;
}
