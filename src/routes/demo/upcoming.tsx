import { createFileRoute } from "@tanstack/react-router";
import { BillsScreen } from "#/components/money/BillsScreen";
import { getPublicDemoFinanceDashboard } from "#/lib/public-demo";

export const Route = createFileRoute("/demo/upcoming")({
  loader: () => getPublicDemoFinanceDashboard(),
  component: DemoUpcomingPage,
});

function DemoUpcomingPage() {
  const dashboard = Route.useLoaderData();
  return (
    <BillsScreen
      readOnly
      data={{
        categoryOptions: [],
        currency: dashboard.accounts[0]?.currency || "EUR",
        recurringPayments: dashboard.recurringPayments.map((payment) => ({ ...payment, confirmed: true })),
      }}
    />
  );
}
