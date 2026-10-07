import { Link, useLocation } from "@tanstack/react-router";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { tapHaptic } from "#/lib/app-lock";
import { IconActivity, IconBudgets, IconGoals, IconHome } from "#/components/money/icons";

const appTabs = [
  { to: "/app", label: "Home", icon: IconHome },
  { to: "/app/transactions", label: "Activity", icon: IconActivity },
  { to: "/app/budgets", label: "Budgets", icon: IconBudgets },
  { to: "/app/goals", label: "Goals", icon: IconGoals },
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
  const tabs = appTabs;
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
          onClick={() => void tapHaptic()}
        >
          <Icon aria-hidden="true" strokeWidth={index === active ? 2 : 1.6} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
