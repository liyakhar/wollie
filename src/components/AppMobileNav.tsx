import { Link, useLocation } from "@tanstack/react-router";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { ChartNoAxesColumn, CreditCard, House, Target } from "lucide-react";

const appTabs = [
  { to: "/app", label: "Home", icon: House },
  { to: "/app/transactions", label: "Activity", icon: CreditCard },
  { to: "/app/budgets", label: "Budgets", icon: ChartNoAxesColumn },
  { to: "/app/goals", label: "Goals", icon: Target },
] as const;

const demoTabs = [
  { to: "/demo", label: "Home", icon: House },
  { to: "/demo/transactions", label: "Activity", icon: CreditCard },
  { to: "/demo/budgets", label: "Budgets", icon: ChartNoAxesColumn },
  { to: "/demo/goals", label: "Goals", icon: Target },
] as const;

function activeTabIndex(pathname: string, tabs: ReadonlyArray<{ to: string }>) {
  const path = pathname.replace(/\/+$/, "") || "/";
  const [home, ...rest] = tabs;
  if (path === home.to) return 0;
  const index = rest.findIndex(
    (tab) => path === tab.to || path.startsWith(`${tab.to}/`),
  );
  return index === -1 ? -1 : index + 1;
}

export function AppMobileNav({
  locked = false,
  demo = false,
}: {
  locked?: boolean;
  demo?: boolean;
}) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const tabs = demo ? demoTabs : appTabs;
  const active = activeTabIndex(pathname, tabs);

  // The glass lens stretches while it travels to the new tab.
  const [moving, setMoving] = useState(false);
  const previous = useRef(active);
  useEffect(() => {
    if (previous.current === active) return;
    previous.current = active;
    setMoving(true);
    const timer = window.setTimeout(() => setMoving(false), 200);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (locked) return null;

  return (
    <nav
      className="app-mobile-nav"
      aria-label={demo ? "Demo pages" : "Mobile primary"}
      style={{ "--tab-index": Math.max(active, 0) } as CSSProperties}
      data-has-active={active !== -1}
      data-moving={moving || undefined}
    >
      <span className="app-mobile-nav__indicator" aria-hidden="true" />
      {tabs.map(({ to, label, icon: Icon }, index) => (
        <Link
          key={to}
          to={to}
          className={
            index === active
              ? "app-mobile-nav__item is-active"
              : "app-mobile-nav__item"
          }
          aria-current={index === active ? "page" : undefined}
        >
          <Icon aria-hidden="true" strokeWidth={index === active ? 2 : 1.5} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
