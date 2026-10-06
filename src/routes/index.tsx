import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { ArrowRight, Launch } from "@carbon/icons-react";
import {
  IconActivity,
  IconBudgets,
  IconGoals,
  IconHome,
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
  title: "Know What You Can Spend",
  description:
    "Wollie connects to your bank and shows what you can safely spend. Budgets reset on payday, goals keep count, on your own or as a couple.",
});

// The phone app has no landing page. The native WebView injects
// window.Capacitor before first paint, so this hides the page with no flash
// while LandingPage redirects into the app.
const nativeFlagScript = {
  children:
    "try{if(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()){document.documentElement.setAttribute('data-native','1')}}catch(e){}",
};

// Same pictures and titles as the app's first-launch intro. The drawings
// have uneven white space inside the files, so `ink` is where the lines
// really are (percent of the file), used to centre each one by eye.
const story = [
  {
    image: "/onboarding/intro-1.webp",
    title: "Your money, organised.",
    body: "Safe to spend, after bills and savings.",
    ink: { size: 776, x: 453, y: 442, w: 900, h: 900 },
  },
  {
    image: "/onboarding/intro-2.webp",
    title: "Know where it goes.",
    body: "Budgets reset on payday. Goals keep count.",
    ink: { size: 1029, x: 456, y: 664, w: 900, h: 1350 },
  },
  {
    image: "/onboarding/intro-3.webp",
    title: "On your own or together.",
    body: "Each partner connects their own accounts.",
    ink: { size: 826, x: 450, y: 674, w: 900, h: 1350 },
  },
] as const;

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
const BALANCE = 2557.82;
const GROCERIES_LEFT = 200;
const PURCHASES = [
  { label: "Bakery", amount: 4.2, groceries: false },
  { label: "Groceries", amount: 18.6, groceries: true },
  { label: "Tram", amount: 2.4, groceries: false },
] as const;

const formatWhole = (n: number) => Math.floor(n).toLocaleString("en-US");
const formatCents = (n: number) => String(Math.round((n - Math.floor(n)) * 100)).padStart(2, "0");

const SCREENS = ["Home", "Budgets", "Goals"] as const;

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
  const Safety = goalIcon("shield");
  const Future = goalIcon("sprout");
  const tabs = [
    { label: "Home", Icon: IconHome, screen: 0 },
    { label: "Activity", Icon: IconActivity, screen: -1 },
    { label: "Budgets", Icon: IconBudgets, screen: 1 },
    { label: "Goals", Icon: IconGoals, screen: 2 },
  ];

  const [screen, setScreen] = useState(0);
  const [picks, setPicks] = useState(0);
  const [balance, setBalance] = useState(BALANCE);
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
      setBalance(BALANCE - done.reduce((sum, p) => sum + p.amount, 0));
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
              <p className="phone__title">Home</p>
              <span className="phone__avatar" aria-hidden="true">W</span>
            </div>

            <div className="ds-balance phone__balance">
              <p className="ds-balance__label">Safe to spend</p>
              <p className="ds-money phone__money">
                €{formatWhole(shownBalance)}<small>.{formatCents(shownBalance)}</small>
              </p>
              <div className="ds-balance__chips">
                <span className="ds-chip ds-chip--on-lime">€82.51 a day</span>
                <span className="ds-chip ds-chip--on-lime">9 days to payday</span>
              </div>
            </div>

            <p className="phone__h">Budgets</p>
            <div className="phone__row">
              <Groceries className="phone__icon" />
              <div>
                <p className="phone__line">
                  <span>Groceries</span>
                  <span><b>€{Math.round(shownGroceries)}</b> <i>left of €400</i></span>
                </p>
                <div className="ds-bar phone__bar"><span style={{ width: `${(shownGroceries / 400) * 100}%` }} /></div>
              </div>
            </div>
            <div className="phone__row">
              <Transport className="phone__icon" />
              <div>
                <p className="phone__line">
                  <span>Transport</span>
                  <span className="phone__over">€18.40 over</span>
                </p>
                <div className="ds-bar is-over phone__bar"><span style={{ width: "100%" }} /></div>
              </div>
            </div>

            <p className="phone__h">Goals</p>
            <div className="phone__row">
              <Travel className="phone__icon" />
              <div>
                <p className="phone__line">
                  <span>Travel</span>
                  <span className="phone__save">€200 to save</span>
                </p>
                <div className="ds-bar phone__bar"><span style={{ width: "40%" }} /></div>
              </div>
            </div>
          </section>

          <section className={pageClass(1)} aria-hidden={screen !== 1}>
            <div className="phone__head">
              <p className="phone__title">Budgets</p>
            </div>
            <p className="phone__total">
              <b>€750</b> <i>left of €1,150</i>
            </p>
            <p className="phone__reset">Resets on payday</p>
            <div className="phone__rows">
              <div className="phone__row">
                <Groceries className="phone__icon" />
                <div>
                  <p className="phone__line"><span>Groceries</span><span><b>€200</b> <i>left of €400</i></span></p>
                  <div className="ds-bar phone__bar"><span style={{ width: "50%" }} /></div>
                </div>
              </div>
              <div className="phone__row">
                <Dining className="phone__icon" />
                <div>
                  <p className="phone__line"><span>Eating out</span><span><b>€250</b> <i>left of €250</i></span></p>
                  <div className="ds-bar phone__bar"><span style={{ width: "100%" }} /></div>
                </div>
              </div>
              <div className="phone__row">
                <Transport className="phone__icon" />
                <div>
                  <p className="phone__line"><span>Transport</span><span className="phone__over">€18.40 over</span></p>
                  <div className="ds-bar is-over phone__bar"><span style={{ width: "100%" }} /></div>
                </div>
              </div>
              <div className="phone__row">
                <Shopping className="phone__icon" />
                <div>
                  <p className="phone__line"><span>Shopping</span><span><b>€300</b> <i>left of €300</i></span></p>
                  <div className="ds-bar phone__bar"><span style={{ width: "100%" }} /></div>
                </div>
              </div>
            </div>
          </section>

          <section className={pageClass(2)} aria-hidden={screen !== 2}>
            <div className="phone__head">
              <p className="phone__title">Goals</p>
            </div>
            <div className="phone__rows">
              <div className="phone__row">
                <Travel className="phone__icon" />
                <div>
                  <p className="phone__line"><span>Travel</span><span className="phone__save">€200 to save</span></p>
                  <div className="ds-bar phone__bar"><span style={{ width: "40%" }} /></div>
                </div>
              </div>
              <div className="phone__row">
                <Safety className="phone__icon" />
                <div>
                  <p className="phone__line"><span>Safety cushion</span><span className="phone__save">€120 to save</span></p>
                  <div className="ds-bar phone__bar"><span style={{ width: "65%" }} /></div>
                </div>
              </div>
              <div className="phone__row">
                <Future className="phone__icon" />
                <div>
                  <p className="phone__line"><span>Pension</span><span><b>Saved</b> <i>this month</i></span></p>
                  <div className="ds-bar phone__bar"><span style={{ width: "100%" }} /></div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <nav className="ds-tabbar phone__tabs" aria-hidden="true">
          {tabs.map(({ label, Icon, screen: target }) => (
            <span key={label} className={`ds-tabbar__item${screen === target ? " is-active" : ""}`}>
              <Icon />
              {label}
            </span>
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
        <section className="landing-hero">
          <div className="ds-container landing-hero__grid">
            <div className="landing-hero__copy">
              <p className="landing-eyebrow rise" style={{ "--d": "0ms" } as CSSProperties}>
                <b>New</b> Money, for one or two
              </p>
              <h1 className="landing-hero__title">
                <span className="line"><span>Know what</span></span>
                <span className="line">
                  <span>
                    you can <span className="landing-hero__mark">spend.</span>
                  </span>
                </span>
              </h1>
              <p className="landing-hero__lede rise" style={{ "--d": "420ms" } as CSSProperties}>
                Connect your bank. See what is safe to spend, alone or with a
                partner.
              </p>
              <div className="landing-hero__actions rise" style={{ "--d": "560ms" } as CSSProperties}>
                {primaryAction}
                <Link to="/demo" className="ds-btn ds-btn--lg">
                  Try the demo
                </Link>
              </div>
              <ul className="landing-hero__proof rise" style={{ "--d": "700ms" } as CSSProperties}>
                <li>Read-only bank link</li>
                <li>No joint account needed</li>
                <li>Free to start</li>
              </ul>
            </div>

            <div className="landing-hero__stage" aria-hidden="false">
              <PhoneHome />
            </div>
          </div>
        </section>

        <section className="landing-story" aria-label="What Wollie does">
          <div className="ds-container">
            <p className="landing-kicker">What it does</p>
            <h2 className="landing-h2 landing-h2--xl">Three things. Done well.</h2>
            <ul className="landing-story__list">
              {story.map(({ image, title, body, ink }, index) => (
                <li key={title} className="landing-story__item" data-reveal style={{ "--i": index } as CSSProperties}>
                  <span className="landing-story__num">0{index + 1}</span>
                  <div className="landing-story__text">
                    <h3 className="landing-story__title">{title}</h3>
                    <p className="ds-muted">{body}</p>
                  </div>
                  <div className="landing-story__frame">
                    <img
                      src={image}
                      alt=""
                      width={ink.w}
                      height={ink.h}
                      loading="lazy"
                      decoding="async"
                      style={{
                        width: `${(ink.w * 0.8 * 100) / ink.size}%`,
                        left: `${50 - (ink.x * 0.8 * 100) / ink.size}%`,
                        top: `${50 - (ink.y * 0.8 * 100) / ink.size}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="landing-how" aria-label="How it works">
          <div className="ds-container">
            <p className="landing-kicker">How it works</p>
            <h2 className="landing-h2 landing-h2--xl">Start in <em>two minutes.</em></h2>
            <ol className="landing-how__steps">
              <li data-reveal><span>1</span><h3>Connect your bank</h3><p className="ds-muted">Pick your bank from the list. The link is read-only.</p></li>
              <li data-reveal><span>2</span><h3>See what is safe</h3><p className="ds-muted">Bills and goals come out first. What is left is yours.</p></li>
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
            <h2 className="landing-final__title">Know what is <em>yours</em> to spend.</h2>
            <div className="landing-final__actions">
              {primaryAction}
              <Link to="/demo" className="ds-btn ds-btn--lg landing-final__demo">Try the demo</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="ds-container">
          <div className="landing-footer__top">
            <Link to="/" className="ds-wordmark landing-footer__mark">Wollie</Link>
            <p className="landing-footer__tag">Know what you can spend.</p>
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
