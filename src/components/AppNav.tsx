import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ChartNoAxesColumn,
  CreditCard,
  House,
  Landmark,
  Settings,
  Target,
  Users,
} from "lucide-react";
import BetterAuthHeader from "#/integrations/better-auth/header-user";
import { authClient } from "#/lib/auth-client";

export default function AppNav({
  locked = false,
  demo = false,
}: {
  locked?: boolean;
  demo?: boolean;
}) {
  const { data: session } = authClient.useSession();
  const isSignedIn = Boolean(session?.user);

  return (
    <aside className="app-nav">
      <div className="app-nav__inner">
        <Link to={demo ? "/demo" : "/app"} className="app-nav__brand" aria-label="Wollie home">
          <strong>Wollie</strong>
          <span>{demo ? "Sample data" : "Shared money"}</span>
        </Link>

        {!locked && demo ? (
          <nav className="app-nav__tabs" aria-label="Demo pages">
            <p className="app-nav__section-label">Example household</p>
            <Link
              to="/demo"
              activeOptions={{ exact: true }}
              className="app-nav__tab"
              activeProps={{ className: "app-nav__tab is-active" }}
            >
              <House aria-hidden="true" />
              <span>Home</span>
            </Link>
            <Link
              to="/demo/transactions"
              className="app-nav__tab"
              activeProps={{ className: "app-nav__tab is-active" }}
            >
              <CreditCard aria-hidden="true" />
              <span>Activity</span>
            </Link>
            <Link
              to="/demo/budgets"
              className="app-nav__tab"
              activeProps={{ className: "app-nav__tab is-active" }}
            >
              <ChartNoAxesColumn aria-hidden="true" />
              <span>Budgets</span>
            </Link>
            <Link
              to="/demo/goals"
              className="app-nav__tab"
              activeProps={{ className: "app-nav__tab is-active" }}
            >
              <Target aria-hidden="true" />
              <span>Goals</span>
            </Link>
            <Link
              to="/demo/upcoming"
              className="app-nav__tab"
              activeProps={{ className: "app-nav__tab is-active" }}
            >
              <CalendarDays aria-hidden="true" />
              <span>Bills</span>
            </Link>
            <Link
              to="/demo/accounts"
              className="app-nav__tab"
              activeProps={{ className: "app-nav__tab is-active" }}
            >
              <Landmark aria-hidden="true" />
              <span>Accounts</span>
            </Link>
          </nav>
        ) : !locked ? (
          <nav className="app-nav__tabs" aria-label="Primary">
            <p className="app-nav__section-label">Your money</p>
            <Link
              to="/app"
              activeOptions={{ exact: true }}
              className="app-nav__tab"
              activeProps={{ className: "app-nav__tab is-active" }}
            >
              <House aria-hidden="true" />
              <span>Home</span>
            </Link>
            <Link
              to="/app/transactions"
              className="app-nav__tab"
              activeProps={{ className: "app-nav__tab is-active" }}
            >
              <CreditCard aria-hidden="true" />
              <span>Activity</span>
            </Link>
            <Link
              to="/app/budgets"
              className="app-nav__tab"
              activeProps={{ className: "app-nav__tab is-active" }}
            >
              <ChartNoAxesColumn aria-hidden="true" />
              <span>Budgets</span>
            </Link>
            <Link
              to="/app/goals"
              className="app-nav__tab"
              activeProps={{ className: "app-nav__tab is-active" }}
            >
              <Target aria-hidden="true" />
              <span>Goals</span>
            </Link>
            <Link
              to="/app/recurring"
              className="app-nav__tab"
              activeProps={{ className: "app-nav__tab is-active" }}
            >
              <CalendarDays aria-hidden="true" />
              <span>Bills</span>
            </Link>
            <Link
              to="/app/accounts"
              className="app-nav__tab"
              activeProps={{ className: "app-nav__tab is-active" }}
            >
              <Landmark aria-hidden="true" />
              <span>Accounts</span>
            </Link>
          </nav>
        ) : null}

        {!demo ? (
          <div className="app-nav__actions">
            {!locked && (
              <Link
                to="/app/household"
                className="app-nav__account-link"
                activeProps={{ className: "app-nav__account-link is-active" }}
              >
                <Users aria-hidden="true" />
                <span>Household</span>
              </Link>
            )}
            {isSignedIn && (
              <Link
                to="/settings"
                className="app-nav__account-link"
                activeProps={{ className: "app-nav__account-link is-active" }}
              >
                <Settings aria-hidden="true" />
                <span>Profile &amp; settings</span>
              </Link>
            )}
            <BetterAuthHeader />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
