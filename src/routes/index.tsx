import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { ArrowRight, Launch } from "@carbon/icons-react";
import {
  IconBudgets,
  IconHome,
  IconSavings,
  IconSpending,
  categoryIcon,
  goalIcon,
} from "#/components/money/icons";
import { authClient } from "#/lib/auth-client";
import { loginSearch } from "#/lib/auth-nav";
import {
  buildPageMeta,
  faqPageJsonLd,
  jsonLdScript,
  softwareApplicationJsonLd,
  webSiteJsonLd,
} from "#/lib/seo";
import {
  defaultSynciCountryCode,
  findSynciDirectoryBanks,
  getSynciDirectoryCountry,
  synciDirectoryCountries,
  synciDirectoryUrl,
} from "#/lib/synci-coverage";

const landingMeta = buildPageMeta({
  path: "/",
  title: "A Plan For Your Money",
  description:
    "Wollie gives your money a plan. Spend within your means and save for what matters, alone or together, even with different banks.",
});

// The phone app has no landing page. The native WebView injects
// window.Capacitor before first paint, so this hides the page with no flash
// while LandingPage redirects into the app.
const nativeFlagScript = {
  children:
    "try{if(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()){document.documentElement.setAttribute('data-native','1')}}catch(e){}",
};

const faqs = [
  {
    question: "Do we need a joint bank account?",
    answer:
      "No. Each partner connects their own accounts. Nothing is merged and no bank passwords are shared.",
  },
  {
    question: "How does inviting my partner work?",
    answer:
      "Send an invitation by email. Your partner signs in, accepts it, and joins your household.",
  },
  {
    question: "Can Wollie move our money?",
    answer:
      "No. Bank connections are read-only. Wollie cannot make payments or see your bank password.",
  },
  {
    question: "How does saving work if Wollie cannot move money?",
    answer:
      "You set an amount for each goal, like €1,000 a month for a home. On payday you move it to your savings account, or set a standing order at your bank. Wollie sees the money arrive and ticks the month off.",
  },
  {
    question: "What if our bank is not available?",
    answer:
      "It depends on your country. Check the bank list on this page before you connect.",
  },
] as const;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: landingMeta.meta,
    links: landingMeta.links,
    scripts: [
      nativeFlagScript,
      jsonLdScript(webSiteJsonLd()),
      jsonLdScript(softwareApplicationJsonLd()),
      jsonLdScript(faqPageJsonLd([...faqs])),
    ],
  }),
  component: LandingPage,
});

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Eases a number toward its target. With `from`, the first run counts up from there. */
function useTween(target: number, opts: { from?: number; delay?: number } = {}) {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  const first = useRef(true);

  useEffect(() => {
    if (prefersReducedMotion()) {
      current.current = target;
      setValue(target);
      return;
    }
    const start = first.current && opts.from !== undefined ? opts.from : current.current;
    const wait = first.current ? (opts.delay ?? 0) : 0;
    first.current = false;
    let raf = 0;
    const timer = window.setTimeout(() => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / 1000);
        const eased = 1 - Math.pow(1 - p, 3);
        current.current = start + (target - start) * eased;
        setValue(current.current);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      current.current = start;
      setValue(start);
      raf = requestAnimationFrame(tick);
    }, wait);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, opts.from, opts.delay]);

  return value;
}

/** Sections marked data-reveal rise into view as they enter the screen. */
function useReveal() {
  useEffect(() => {
    const root = document.querySelector(".landing");
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-in"));
      return;
    }
    root.classList.add("landing--motion");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    items.forEach((item) => observer.observe(item));
    return () => {
      observer.disconnect();
      root.classList.remove("landing--motion");
    };
  }, []);
}

// A few sample purchases the phone "receives" in a loop. Sample data only.
const EVERYDAY = 429.12;
const GROCERIES_LEFT = 410;
const PURCHASES = [
  { label: "Bakery", amount: 4.2, groceries: true },
  { label: "Groceries", amount: 18.6, groceries: true },
  { label: "Tram", amount: 2.4, groceries: false },
] as const;
// Running total of everyday spending, day by day (sample).
const PACE_NOW = [12, 38, 61, 95, 140, 188, 236, 301, 360, 429];
const PACE_LAST = [10, 30, 72, 101, 133, 170, 214, 262, 300, 334, 380, 422, 470, 515, 560, 600, 652, 700, 744, 790, 832, 880, 925, 970, 1010, 1046, 1080, 1110, 1140, 1172];

const formatWhole = (n: number) => Math.floor(n).toLocaleString("en-US");
const formatCents = (n: number) => String(Math.round((n - Math.floor(n)) * 100)).padStart(2, "0");

const SCREENS = ["Home", "Spending", "Budgets", "Savings"] as const;

/** A tiny running-total line, like the app's Home card. */
function PhonePace() {
  const max = 1200;
  const days = PACE_LAST.length;
  const point = (value: number, index: number) => `${((index / (days - 1)) * 100).toFixed(1)},${(40 - (value / max) * 36).toFixed(1)}`;
  const now = PACE_NOW.map(point).join(" ");
  return (
    <svg className="phone__pace" viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={PACE_LAST.map(point).join(" ")} fill="none" stroke="rgb(17 17 17 / .35)" strokeWidth="1" strokeDasharray="2 2.5" vectorEffect="non-scaling-stroke" />
      <polygon points={`0,40 ${now} ${(((PACE_NOW.length - 1) / (days - 1)) * 100).toFixed(1)},40`} fill="rgb(17 17 17 / .08)" />
      <polyline points={now} fill="none" stroke="#111" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * The app at real iPhone proportions (1206 x 2622), cycling Home, Budgets, Goals.
 * Everything inside is sized in em, so the whole screen scales together.
 */
function PhoneHome() {
  const Groceries = categoryIcon("groceries");
  const Dining = categoryIcon("eating out");
  const Transport = categoryIcon("transport");
  const Shopping = categoryIcon("shopping");
  const Travel = goalIcon("plane");
  const House = goalIcon("home");
  const tabs = [
    { label: "Home", Icon: IconHome, screen: 0 },
    { label: "Spending", Icon: IconSpending, screen: 1 },
    { label: "Budgets", Icon: IconBudgets, screen: 2 },
    { label: "Savings", Icon: IconSavings, screen: 3 },
  ];

  const [screen, setScreen] = useState(0);
  const [picks, setPicks] = useState(0);
  const [balance, setBalance] = useState(EVERYDAY);
  const [groceries, setGroceries] = useState(GROCERIES_LEFT);
  const [toast, setToast] = useState<{ label: string; amount: number } | null>(null);
  const lastToast = useRef<{ label: string; amount: number }>({ label: "Bakery", amount: 4.2 });
  const step = useRef(0);

  // Every 7 seconds the phone moves to the next screen. Tapping a dot restarts the timer.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setScreen((current) => (current + 1) % SCREENS.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, [picks]);

  // On Home, two purchases arrive: a pill slides up and the numbers tick down.
  useEffect(() => {
    if (prefersReducedMotion() || screen !== 0) return;
    let hide = 0;
    const fire = () => {
      if (document.hidden) return;
      const index = step.current % PURCHASES.length;
      step.current += 1;
      const done = PURCHASES.slice(0, index + 1);
      const purchase = PURCHASES[index];
      lastToast.current = { label: purchase.label, amount: purchase.amount };
      setToast(lastToast.current);
      setBalance(EVERYDAY + done.reduce((sum, p) => sum + p.amount, 0));
      setGroceries(GROCERIES_LEFT - done.filter((p) => p.groceries).reduce((sum, p) => sum + p.amount, 0));
      window.clearTimeout(hide);
      hide = window.setTimeout(() => setToast(null), 1900);
    };
    const first = window.setTimeout(fire, 1800);
    const second = window.setTimeout(fire, 4600);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
      window.clearTimeout(hide);
      setToast(null);
    };
  }, [screen]);

  const shownBalance = useTween(balance, { from: 0, delay: 500 });
  const shownGroceries = useTween(groceries);
  const shown = toast ?? lastToast.current;
  const pageClass = (index: number) => `phone__page${screen === index ? " is-active" : ""}`;

  return (
    <figure className="phone" aria-label="The Wollie app, with sample data">
      <div className="phone__body">
        <div className="phone__island" aria-hidden="true" />
        <div className="phone__status" aria-hidden="true">
          <span>9:41</span>
        </div>
        <div className={`phone__toast${toast ? " is-on" : ""}`} aria-hidden="true">
          <span className="ds-dot" />
          <span>{shown.label}</span>
          <b>−€{shown.amount.toFixed(2)}</b>
        </div>

        <div className="phone__screen">
          <section className={pageClass(0)} aria-hidden={screen !== 0}>
            <div className="phone__head">
              <p className="phone__title">October</p>
              <span className="phone__avatar" aria-hidden="true">W</span>
            </div>

            <div className="ds-balance phone__balance">
              <p className="ds-balance__label">Spent this month</p>
              <p className="ds-money phone__money">
                €{formatWhole(shownBalance)}<small>.{formatCents(shownBalance)}</small>
              </p>
              <PhonePace />
              <div className="ds-balance__chips">
                <span className="ds-chip ds-chip--on-lime">↑ €95 more than Sep</span>
              </div>
            </div>

            <div className="phone__tiles">
              <div className="phone__tile">
                <p className="phone__sumlabel">Budgets</p>
                <p className="phone__tilenum">€{formatWhole(shownGroceries + 463)}</p>
                <div className="ds-bar phone__bar"><span style={{ width: "38%" }} /></div>
                <p className="phone__st phone__st--ok">Within budget</p>
              </div>
              <div className="phone__tile">
                <p className="phone__sumlabel">Saved</p>
                <p className="phone__tilenum">€1,000</p>
                <div className="ds-bar phone__bar"><span style={{ width: "83%" }} /></div>
                <p className="phone__st phone__st--todo">1 to move</p>
              </div>
            </div>

            <p className="phone__h">Needs you</p>
            <div className="phone__row">
              <span className="phone__icon phone__icon--neon">€</span>
              <div>
                <p className="phone__line"><span>Move €1,600 to your goals</span></p>
                <p className="phone__meta">Wollie ticks it when it lands</p>
              </div>
            </div>
          </section>

          <section className={pageClass(1)} aria-hidden={screen !== 1}>
            <div className="phone__head">
              <p className="phone__title">Spending</p>
            </div>
            <div className="phone__ring">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#ecece6" strokeWidth="12" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#111" strokeWidth="12" strokeDasharray="136 178" transform="rotate(-90 60 60)" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#cdea3a" strokeWidth="12" strokeDasharray="82 232" strokeDashoffset="-138" transform="rotate(-90 60 60)" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#8a8a82" strokeWidth="12" strokeDasharray="36 278" strokeDashoffset="-222" transform="rotate(-90 60 60)" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#6f7d1c" strokeWidth="12" strokeDasharray="30 284" strokeDashoffset="-260" transform="rotate(-90 60 60)" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#c9c9c1" strokeWidth="12" strokeDasharray="20 294" strokeDashoffset="-292" transform="rotate(-90 60 60)" />
              </svg>
              <p className="phone__ringnum"><small>Spent</small>€429</p>
            </div>
            <div className="phone__rows">
              {[
                { Icon: Groceries, name: "Groceries", value: "€190", share: "44%", color: "#111" },
                { Icon: Transport, name: "Transport", value: "€117", share: "27%", color: "#cdea3a" },
                { Icon: Dining, name: "Eating out", value: "€51", share: "12%", color: "#8a8a82" },
                { Icon: Shopping, name: "Shopping", value: "€29", share: "7%", color: "#c9c9c1" },
              ].map(({ Icon, name, value, share, color }) => (
                <div key={name} className="phone__row">
                  <span className="phone__icon phone__icon--swatch" style={{ background: color, color: color === "#111" ? "#fbfbf9" : "#111" }}><Icon /></span>
                  <div>
                    <p className="phone__line"><span>{name}</span><span><b>{value}</b></span></p>
                    <p className="phone__meta">{share} of the month</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={pageClass(2)} aria-hidden={screen !== 2}>
            <div className="phone__head">
              <p className="phone__title">Budgets</p>
            </div>
            <div className="phone__summary">
              <p className="phone__sumlabel">Left this month</p>
              <p className="phone__sumnum">€873<small> of €1,390</small></p>
              <div className="ds-bar phone__bar"><span style={{ width: "37%" }} /></div>
              <p className="phone__sumfoot"><span className="phone__okline">Within budget</span></p>
            </div>
            <div className="phone__rows">
              <div className="phone__row">
                <Transport className="phone__icon" />
                <div>
                  <p className="phone__line"><span>Transport</span><span className="phone__over">€46 over</span></p>
                  <div className="ds-bar is-over phone__bar"><span style={{ width: "100%" }} /></div>
                </div>
              </div>
              <div className="phone__row">
                <Groceries className="phone__icon" />
                <div>
                  <p className="phone__line"><span>Groceries</span><span><b>€410</b> <i>left</i></span></p>
                  <div className="ds-bar phone__bar"><span style={{ width: "32%" }} /></div>
                </div>
              </div>
              <div className="phone__row">
                <Dining className="phone__icon" />
                <div>
                  <p className="phone__line"><span>Eating out</span><span><b>€249</b> <i>left</i></span></p>
                  <div className="ds-bar phone__bar"><span style={{ width: "17%" }} /></div>
                </div>
              </div>
            </div>
          </section>

          <section className={pageClass(3)} aria-hidden={screen !== 3}>
            <div className="phone__head">
              <p className="phone__title">Savings</p>
            </div>
            <div className="ds-balance phone__balance phone__balance--small">
              <p className="ds-balance__label">Saved so far</p>
              <p className="ds-money phone__money">€21,400</p>
            </div>
            <div className="phone__goal">
              <p className="phone__line"><span><House className="phone__inline" /> House</span><span><b>€1,000</b> <i>/ month</i></span></p>
              <div className="ds-bar phone__bar"><span style={{ width: "33%" }} /></div>
              <p className="phone__goalfoot"><span className="phone__okline">Moved this month</span><span>Done by Feb 2030</span></p>
              <p className="phone__dots-row" aria-hidden="true"><i /><i /><i /><i /><i /><i /></p>
            </div>
            <div className="phone__goal">
              <p className="phone__line"><span><Travel className="phone__inline" /> Travel</span><span><b>€200</b> <i>/ month</i></span></p>
              <div className="ds-bar phone__bar"><span style={{ width: "47%" }} /></div>
              <p className="phone__goalfoot"><span className="phone__todoline">€200 to move</span><span>Done by Jun 2027</span></p>
            </div>
          </section>
        </div>

        <nav className="ds-tabbar phone__tabs" aria-label="App screens">
          {tabs.map(({ label, Icon, screen: target }) => (
            <button
              key={label}
              type="button"
              className={`ds-tabbar__item${screen === target ? " is-active" : ""}`}
              aria-current={screen === target ? "page" : undefined}
              onClick={() => {
                setScreen(target);
                setPicks((count) => count + 1);
              }}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>
        <span className="phone__home-bar" aria-hidden="true" />
      </div>

      <div className="phone__dots" role="group" aria-label="App screens">
        {SCREENS.map((name, index) => (
          <button
            key={name}
            type="button"
            className={`phone__dot${screen === index ? " is-on" : ""}`}
            aria-label={`Show the ${name} screen`}
            aria-pressed={screen === index}
            onClick={() => {
              setScreen(index);
              setPicks((count) => count + 1);
            }}
          >
            <span />
          </button>
        ))}
      </div>
    </figure>
  );
}

/** The 35-second film. Click to play with sound; subtitles are in the picture. */
function FilmPlayer() {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const play = () => {
    const el = video.current;
    if (!el) return;
    el.muted = false;
    setStarted(true);
    void el.play().catch(() => setStarted(false));
  };
  return (
    <figure className="landing-film">
      <video
        ref={video}
        className="landing-film__video"
        src="/video/wollie-promo.mp4"
        poster="/video/wollie-promo-poster.jpg"
        playsInline
        preload="metadata"
        controls={started}
        onEnded={() => setStarted(false)}
        aria-label="Wollie in 35 seconds"
      />
      {!started && (
        <button type="button" className="landing-film__play" onClick={play} aria-label="Play the film, 35 seconds">
          <span className="landing-film__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
          </span>
          <span className="landing-film__label">Watch the film · 35 s</span>
        </button>
      )}
    </figure>
  );
}

function LandingPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [coverageCountryCode, setCoverageCountryCode] = useState(
    defaultSynciCountryCode,
  );
  const [bankSearch, setBankSearch] = useState("");
  const [showAllBanks, setShowAllBanks] = useState(false);

  useReveal();

  // The header is clear over the lime hero and turns white once the page moves.
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // In the phone app, skip the landing page and open the app itself.
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || isPending) return;
    void router.navigate({ to: "/app", replace: true });
  }, [isPending, router]);

  const selectedSynciCountry = useMemo(
    () => getSynciDirectoryCountry(coverageCountryCode),
    [coverageCountryCode],
  );
  const matchedSynciBanks = useMemo(
    () => findSynciDirectoryBanks(coverageCountryCode, bankSearch),
    [bankSearch, coverageCountryCode],
  );
  const visibleSynciBanks = bankSearch.trim()
    ? matchedSynciBanks
    : showAllBanks
      ? selectedSynciCountry.banks
      : selectedSynciCountry.banks.slice(0, 6);

  const selectCoverageCountry = (countryCode: string) => {
    setCoverageCountryCode(countryCode);
    setBankSearch("");
    setShowAllBanks(false);
  };

  const primaryAction = session?.user ? (
    <Link to="/app" className="ds-btn ds-btn--primary ds-btn--lg">
      Open Wollie <ArrowRight aria-hidden="true" />
    </Link>
  ) : (
    <Link
      to="/login"
      search={loginSearch({ signup: true })}
      className="ds-btn ds-btn--primary ds-btn--lg"
    >
      Start free <ArrowRight aria-hidden="true" />
    </Link>
  );

  return (
    <div className="ds-page landing">
      <header className={`landing-header${stuck ? " is-stuck" : ""}`}>
        <div className="ds-container landing-header__row">
          <Link to="/" aria-label="Wollie home" className="ds-wordmark">
            Wollie
          </Link>
          <nav className="landing-header__nav" aria-label="Main navigation">
            <a href="#banks" className="ds-btn ds-btn--ghost landing-header__link">
              Banks
            </a>
            <Link
              to="/pricing"
              search={{ checkout: undefined }}
              className="ds-btn ds-btn--ghost landing-header__link"
            >
              Pricing
            </Link>
            {session?.user ? (
              <Link to="/app" className="ds-btn ds-btn--primary">
                Open app
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  search={loginSearch({ signup: false })}
                  className="ds-btn"
                >
                  Sign in
                </Link>
                <Link
                  to="/login"
                  search={loginSearch({ signup: true })}
                  className="ds-btn ds-btn--primary landing-header__start"
                >
                  Start free
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="landing-hero landing-hero--center">
          <div className="ds-container landing-hero__center">
            <h1 className="landing-hero__title">
              <span className="line"><span>A plan for</span></span>
              <span className="line">
                <span>
                  your <span className="landing-hero__mark">money.</span>
                </span>
              </span>
            </h1>
            <p className="landing-hero__lede rise" style={{ "--d": "420ms" } as CSSProperties}>
              Wollie helps you spend within your means and save for what
              matters. Alone or together, even with different banks.
            </p>
            <div className="landing-hero__actions rise" style={{ "--d": "560ms" } as CSSProperties}>
              {primaryAction}
              <a href="#app" className="ds-btn ds-btn--lg">
                See the app
              </a>
            </div>
            <ul className="landing-hero__proof rise" style={{ "--d": "700ms" } as CSSProperties}>
              <li>Read-only bank link</li>
              <li>Different banks, one view</li>
              <li>Free to start</li>
            </ul>
            <div className="rise" style={{ "--d": "820ms" } as CSSProperties}>
              <FilmPlayer />
            </div>
          </div>
        </section>

        <section id="app" className="landing-show" aria-label="Inside the app">
          <div className="ds-container">
            <p className="landing-kicker landing-show__kicker">Inside the app</p>
            <div className="landing-show__grid">
              <div className="landing-show__col landing-show__col--left">
                <article className="landing-note" data-reveal>
                  <p className="landing-note__num">01 · Spending</p>
                  <h3 className="landing-note__title">See where it goes.</h3>
                  <p className="ds-muted">Every payment sorted by category, and a clear look at this month against the last.</p>
                </article>
                <article className="landing-note" data-reveal>
                  <p className="landing-note__num">03 · Savings</p>
                  <h3 className="landing-note__title">Save for what matters.</h3>
                  <p className="ds-muted">A home, a trip, your kids&rsquo; education, retirement. Pick an amount for each month. Wollie ticks it off when it lands.</p>
                </article>
              </div>

              <div className="landing-show__stage">
                <PhoneHome />
              </div>

              <div className="landing-show__col landing-show__col--right">
                <article className="landing-note" data-reveal>
                  <p className="landing-note__num">02 · Budgets</p>
                  <h3 className="landing-note__title">Stay within your means.</h3>
                  <p className="ds-muted">Set a limit for each category. Wollie warns you before you overspend.</p>
                </article>
                <article className="landing-note" data-reveal>
                  <p className="landing-note__num">04 · Together</p>
                  <h3 className="landing-note__title">Different banks, one view.</h3>
                  <p className="ds-muted">Each of you connects your own accounts and keeps your own login. Nothing is merged.</p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="landing-how" aria-label="How it works">
          <div className="ds-container">
            <p className="landing-kicker">How it works</p>
            <h2 className="landing-h2 landing-h2--xl">Start in <em>two minutes.</em></h2>
            <ol className="landing-how__steps">
              <li data-reveal><span>1</span><h3>Connect your bank</h3><p className="ds-muted">Pick your bank from the list. The link is read-only.</p></li>
              <li data-reveal><span>2</span><h3>Make your plan</h3><p className="ds-muted">Set budgets and savings goals. Wollie suggests amounts from your past months.</p></li>
              <li data-reveal><span>3</span><h3>Invite your partner</h3><p className="ds-muted">Each of you connects your own accounts. Nothing is merged.</p></li>
            </ol>
          </div>
        </section>

        <section className="landing-promise" aria-label="Our promise">
          <div className="ds-container landing-promise__inner" data-reveal>
            <p className="landing-kicker landing-kicker--on-ink">Our promise</p>
            <p className="landing-promise__text">Wollie cannot move your money. It can only <em>look.</em></p>
            <p className="landing-promise__sub">Bank connections are read-only. We never see your bank password.</p>
          </div>
        </section>

        <section id="banks" className="ds-container landing-banks" aria-labelledby="banks-title" data-reveal>
          <div className="landing-banks__intro">
            <p className="landing-kicker">Banks</p>
            <h2 id="banks-title" className="landing-h2">
              Is your bank <em>on the list?</em>
            </h2>
            <p className="ds-muted">Pick your country and search. Check before you connect.</p>
          </div>

          <div className="ds-panel landing-finder">
            <div className="landing-finder__fields">
              <select
                name="coverageCountry"
                aria-label="Country"
                className="ds-input"
                value={coverageCountryCode}
                onChange={(event) =>
                  selectCoverageCountry(event.currentTarget.value)
                }
              >
                {synciDirectoryCountries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name} · {country.bankCount} banks
                  </option>
                ))}
              </select>
              <input
                name="bankSearch"
                aria-label="Bank name"
                className="ds-input"
                value={bankSearch}
                onChange={(event) => setBankSearch(event.currentTarget.value)}
                placeholder={`Search ${selectedSynciCountry.name} banks`}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="landing-finder__results" aria-live="polite">
              {visibleSynciBanks.length ? (
                <div className="landing-finder__chips">
                  {visibleSynciBanks.map((bank) => (
                    <span key={bank} className="landing-bank">
                      {bank}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="ds-muted">
                  No match in the {selectedSynciCountry.name} directory snapshot.
                </p>
              )}
            </div>

            <div className="landing-finder__foot">
              {!bankSearch.trim() ? (
                <button
                  type="button"
                  className="landing-finder__toggle"
                  onClick={() => setShowAllBanks((current) => !current)}
                >
                  {showAllBanks
                    ? "Show fewer"
                    : `Show all ${selectedSynciCountry.bankCount}`}
                </button>
              ) : (
                <span className="ds-muted">
                  {matchedSynciBanks.length} match{matchedSynciBanks.length === 1 ? "" : "es"}
                </span>
              )}
              <a
                href={synciDirectoryUrl(coverageCountryCode)}
                target="_blank"
                rel="noreferrer"
                className="landing-finder__link"
              >
                Synci directory <Launch aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section id="questions" className="ds-container landing-faq" aria-labelledby="questions-title" data-reveal>
          <div className="landing-faq__intro">
            <p className="landing-kicker">FAQ</p>
            <h2 id="questions-title" className="landing-h2">
              Questions, <em>answered.</em>
            </h2>
          </div>
          <div className="landing-faq__list">
            {faqs.map((faq) => (
              <details key={faq.question} className="landing-faq__item">
                <summary>
                  {faq.question}
                  <span aria-hidden="true" className="landing-faq__plus" />
                </summary>
                <p className="ds-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="ds-container landing-final" data-reveal>
          <div className="ds-balance landing-final__card">
            <h2 className="landing-final__title">Give your money <em>a plan.</em></h2>
            <div className="landing-final__actions">
              {primaryAction}
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="ds-container">
          <div className="landing-footer__top">
            <Link to="/" className="ds-wordmark landing-footer__mark">Wollie</Link>
            <p className="landing-footer__tag">A plan for your money.</p>
          </div>
          <div className="landing-footer__row">
            <nav aria-label="Footer navigation" className="landing-footer__nav">
              <Link to="/about">About</Link>
              <Link to="/pricing" search={{ checkout: undefined }}>Pricing</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </nav>
            <span className="ds-muted">© 2026 Wollie</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
