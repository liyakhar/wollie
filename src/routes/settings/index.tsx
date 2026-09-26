import { createFileRoute } from "@tanstack/react-router";
import { ProfileScreen } from "#/components/money/ProfileScreen";
import { buildPageMeta } from "#/lib/seo";
import { getBillingOverview } from "#/server/billing";
import { getMoneyOverview } from "#/server/money";

const profileMeta = buildPageMeta({
  path: "/settings",
  title: "Profile",
  description: "Your Wollie profile.",
  noindex: true,
});

export const Route = createFileRoute("/settings/")({
  head: () => ({ meta: profileMeta.meta, links: profileMeta.links }),
  loader: async () => {
    const [billing, overview] = await Promise.all([getBillingOverview(), getMoneyOverview()]);
    return { billing, overview };
  },
  component: ProfilePage,
});

function ProfilePage() {
  const { billing, overview } = Route.useLoaderData();
  return (
    <ProfileScreen
      planName={billing?.plan === "household" ? "Household" : "Free"}
      paydayLabel={overview.cycle.paydayDay ? `${overview.cycle.paydayDay}${ordinal(overview.cycle.paydayDay)} of the month` : "1st of the month"}
      paydayAuto={overview.paydaySetting === null}
      billCount={overview.bills.length}
    />
  );
}

function ordinal(day: number) {
  if (day % 10 === 1 && day !== 11) return "st";
  if (day % 10 === 2 && day !== 12) return "nd";
  if (day % 10 === 3 && day !== 13) return "rd";
  return "th";
}
