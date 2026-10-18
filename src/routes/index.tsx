import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { ArrowRight, Launch } from "@carbon/icons-react";
import { BudgetsScreen } from "#/components/money/BudgetsScreen";
import { GoalsScreen } from "#/components/money/GoalsScreen";
import { HomeScreen } from "#/components/money/HomeScreen";
import { SpendingScreen } from "#/components/money/SpendingScreen";
import {
  IconBudgets,
  IconHome,
  IconSavings,
  IconSpending,
} from "#/components/money/icons";
import { getPublicDemoFinanceDashboard } from "#/lib/public-demo";
import { getDemoMoneyOverview } from "#/lib/money-overview";
import { FooterLinks } from "#/components/SitePage";
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
    question: "Is it safe to connect my bank?",
    answer:
      "Yes. The link is read-only, and you sign in at your own bank, so Wollie never sees your password. Wollie can look at your payments. It cannot make a payment or move your money.",
  },
  {
    question: "Do we need a joint bank account?",
    answer:
      "No. Each of you connects your own accounts, even at different banks. Wollie puts them together in one household view, so you plan as a team without opening a joint account. Your bank logins stay private.",
  },
  {
    question: "How do I invite my partner?",
    answer:
      "Send an invite by email. Your partner signs in, accepts it, and you can plan together.",
  },
  {
    question: "How does saving work if Wollie can't move money?",
    answer:
      "You pick an amount for each goal, like €1,000 a month for a home. On payday you move it to your savings, or set up a standing order at your bank. Wollie sees it arrive and ticks the month off.",
  },
  {
    question: "What does Wollie cost?",
    answer:
      "It is free to start. The paid plan is €7.99 a month or €59 a year, and everything is free while we are in early access.",
  },
  {
    question: "What if my bank is not on the list?",
    answer:
      "Banks depend on your country. Check the list above before you connect. If yours is not there, it is not supported yet.",
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
const APP_WIDTH = 390;
const APP_TABS = [
  { label: "Home", Icon: IconHome },
  { label: "Spending", Icon: IconSpending },
  { label: "Budgets", Icon: IconBudgets },
  { label: "Savings", Icon: IconSavings },
] as const;

/** The real app screens, fed with the public sample data and scaled into a phone frame. */
function PhoneHome() {
  const overview = useMemo(() => getDemoMoneyOverview(), []);
  const activity = useMemo(() => {
    const dashboard = getPublicDemoFinanceDashboard();
    return {
      transactions: dashboard.transactions,
      categoryOptions: [...new Set(dashboard.transactions.map((transaction) => transaction.category))],
    };
  }, []);
  const [screen, setScreen] = useState(0);
  const [size, setSize] = useState({ scale: 0.75, height: 844 });
  const stage = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const measure = () => {
      const scale = node.clientWidth / APP_WIDTH;
      if (scale > 0) setSize({ scale, height: node.clientHeight / scale });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // The screens are the app's own pages: keep them look-only inside the frame.
  useEffect(() => {
    const node = content.current;
    if (!node) return;
    node.setAttribute("inert", "");
    node.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  }, [screen]);

  return (
    <figure className="phone" aria-label="The Wollie app, with sample data">
      <div className="phone__body">
        <div className="phone__island" aria-hidden="true" />
        <div className="phone__status" aria-hidden="true">
          <span>9:41</span>
        </div>
        <div className="phone__stage" ref={stage}>
          <div
            className="phone__app"
            style={{ width: APP_WIDTH, height: size.height, transform: `scale(${size.scale})` }}
          >
            <div className="phone__app-scroll" ref={content} key={screen}>
              {screen === 0 ? <HomeScreen overview={overview} demo /> : null}
              {screen === 1 ? <SpendingScreen overview={overview} data={activity} readOnly /> : null}
              {screen === 2 ? <BudgetsScreen overview={overview} /> : null}
              {screen === 3 ? <GoalsScreen overview={overview} /> : null}
            </div>
            <nav className="phone-nav" aria-label="App screens" style={{ "--tab": screen } as CSSProperties}>
              <span className="phone-nav__indicator" aria-hidden="true" />
              {APP_TABS.map(({ label, Icon }, index) => (
                <button
                  key={label}
                  type="button"
                  className={`phone-nav__item${screen === index ? " is-active" : ""}`}
                  aria-current={screen === index ? "page" : undefined}
                  onClick={() => setScreen(index)}
                >
                  <Icon aria-hidden="true" strokeWidth={screen === index ? 2 : 1.6} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
        <span className="phone__home-bar" aria-hidden="true" />
      </div>
    </figure>
  );
}

const FILM_CAPTIONS: [number, number, string][] = [
  [0.35, 1.62, "Your salary comes in."],
  [1.68, 4.26, "Bills, shopping, subscriptions."],
  [4.41, 6.58, "And somehow, it's all gone."],
  [10.2, 12.53, "Meet Wollie. It gives your money a plan."],
  [13.0, 16.13, "It sorts every payment, so you can see where your money goes."],
  [16.58, 19.34, "See if you're spending more or less than last month."],
  [19.38, 22.34, "Set a budget for each category and stay on track."],
  [22.98, 25.0, "And it warns you before you overspend."],
  [25.58, 29.53, "Saving for a home, a trip, school, or retirement?"],
  [29.65, 31.66, "Choose how much to set aside each month."],
  [32.06, 35.06, "When the money lands in savings, Wollie checks it off."],
  [35.61, 38.5, "Plan together with your partner, even at different banks."],
];

function FilmPlayer() {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [caption, setCaption] = useState("");
  const [captionsOn, setCaptionsOn] = useState(true);
  const play = () => {
    const el = video.current;
    if (!el) return;
    el.muted = false;
    setStarted(true);
    void el.play().catch(() => setStarted(false));
  };
  const onTime = () => {
    const t = video.current?.currentTime ?? 0;
    const cue = FILM_CAPTIONS.find(([from, to]) => t >= from && t < to);
    setCaption(cue ? cue[2] : "");
  };
  return (
    <div className="film-frame">
      <div className="film-frame__bar" aria-hidden="true">
        <span /><span /><span />
        <em>getwollie.com</em>
      </div>
      <figure className="landing-film">
        <video
          ref={video}
          className="landing-film__video"
          src="/video/wollie-film-44s-v2.mp4"
          poster="/video/wollie-film-44s-v2.jpg"
          playsInline
          preload="metadata"
          controls={started}
          onTimeUpdate={onTime}
          onEnded={() => { setStarted(false); setCaption(""); }}
          aria-label="Wollie in 44 seconds"
        />
        {started && captionsOn && caption && (
          <p className="landing-film__caption" aria-live="off"><span>{caption}</span></p>
        )}
        {started && (
          <button
            type="button"
            className="landing-film__cc"
            aria-pressed={captionsOn}
            aria-label={captionsOn ? "Turn captions off" : "Turn captions on"}
            onClick={() => setCaptionsOn((v) => !v)}
          >
            CC
          </button>
        )}
        {!started && (
          <button type="button" className="landing-film__play" onClick={play} aria-label="Play the film, 44 seconds">
            <span className="landing-film__kicker">The film · 44 seconds</span>
            <span className="landing-film__title">Your money, <em>finally with a plan.</em></span>
            <span className="landing-film__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
            </span>
            <span className="landing-film__label">Watch it</span>
          </button>
        )}
      </figure>
    </div>
  );
}

/** Floating hero chips drift away from the cursor, then settle back. */
function useChipsFleeCursor() {
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".landing-hero--center");
    if (!hero) return;
    const wide = window.matchMedia("(min-width: 75rem)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const chips = Array.from(hero.querySelectorAll<HTMLElement>(".landing-hero__proof li"));
    const reset = () => chips.forEach((c) => c.style.removeProperty("translate"));
    const onMove = (e: PointerEvent) => {
      if (!wide.matches || calm.matches) return;
      const layer = hero.querySelector<HTMLElement>(".landing-hero__proof");
      if (!layer) return;
      const box = layer.getBoundingClientRect();
      const mx = e.clientX - box.left;
      const my = e.clientY - box.top;
      for (const c of chips) {
        const cx = c.offsetLeft + c.offsetWidth / 2;
        const cy = c.offsetTop + c.offsetHeight / 2;
        const dx = cx - mx;
        const dy = cy - my;
        const d = Math.hypot(dx, dy) || 1;
        const reach = 260;
        const push = d < reach ? ((reach - d) / reach) * 90 : 0;
        c.style.translate = push ? `${(dx / d) * push}px ${(dy / d) * push}px` : "";
      }
    };
    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", reset);
    return () => {
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", reset);
    };
  }, []);
}

function LandingPage() {
  useChipsFleeCursor();
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
            <div className="landing-hero__copy">
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
              <li>
                <svg className="proof-icon proof-icon--eye" viewBox="0 0 32 32" aria-hidden="true">
                  <path d="M3 16c3.5-5.5 8-8 13-8s9.5 2.5 13 8c-3.5 5.5-8 8-13 8S6.5 21.5 3 16z" />
                  <circle className="proof-icon__pupil" cx="16" cy="16" r="3.5" />
                </svg>
                <span>Read-only bank link</span>
              </li>
              <li>
                <svg className="proof-icon proof-icon--banks" viewBox="0 0 32 32" aria-hidden="true">
                  <circle className="proof-icon__a" cx="11" cy="16" r="7" />
                  <circle className="proof-icon__b" cx="21" cy="16" r="7" />
                </svg>
                <span>Different banks, one view</span>
              </li>
              <li>
                <svg className="proof-icon proof-icon--free" viewBox="0 0 32 32" aria-hidden="true">
                  <circle cx="16" cy="16" r="12" />
                  <path className="proof-icon__tick" d="M10.5 16.5l4 4 7.5-9" />
                </svg>
                <span>Free to start</span>
              </li>
              <li>
                <svg className="proof-icon proof-icon--bars" viewBox="0 0 32 32" aria-hidden="true">
                  <path className="proof-icon__bar1" d="M8 25V17" />
                  <path className="proof-icon__bar2" d="M16 25V9" />
                  <path className="proof-icon__bar3" d="M24 25V13" />
                </svg>
                <span>Budgets that warn you</span>
              </li>
              <li>
                <svg className="proof-icon proof-icon--sort" viewBox="0 0 32 32" aria-hidden="true">
                  <g className="proof-icon__spin">
                    <circle cx="16" cy="7" r="2.5" /><circle cx="25" cy="16" r="2.5" /><circle cx="16" cy="25" r="2.5" /><circle cx="7" cy="16" r="2.5" />
                  </g>
                </svg>
                <span>Every payment sorted</span>
              </li>
              <li>
                <svg className="proof-icon proof-icon--goal" viewBox="0 0 32 32" aria-hidden="true">
                  <circle className="proof-icon__track" cx="16" cy="16" r="10" />
                  <circle className="proof-icon__fill" cx="16" cy="16" r="10" pathLength="100" />
                </svg>
                <span>Savings goals</span>
              </li>
              <li>
                <svg className="proof-icon proof-icon--pair" viewBox="0 0 32 32" aria-hidden="true">
                  <circle className="proof-icon__track" cx="16" cy="16" r="9" />
                  <g className="proof-icon__orbit"><circle cx="16" cy="7" r="3" /></g>
                  <circle cx="16" cy="16" r="2.5" />
                </svg>
                <span>Plan with your partner</span>
              </li>
            </ul>
            </div>
            <div className="rise" style={{ "--d": "820ms", width: "100%" } as CSSProperties}>
              <FilmPlayer />
            </div>
          </div>
        </section>

        <section id="app" className="landing-show" aria-label="The app">
          <div className="ds-container">
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
                  <p className="ds-muted">Each of you connects your own bank. Wollie puts them together, so you see your household's spending, budgets and goals in one place. Your logins stay private.</p>
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
              <li data-reveal><span>3</span><h3>Invite your partner</h3><p className="ds-muted">Your partner connects their own bank. You both see the household's spending, budgets and goals in one plan.</p></li>
            </ol>
          </div>
        </section>

        <section id="banks" className="landing-band" aria-labelledby="banks-title" data-reveal>
         <div className="ds-container landing-banks">
          <div className="landing-banks__intro">
            <p className="landing-kicker">Banks</p>
            <h2 id="banks-title" className="landing-h2">
              Is your bank <em>on the list?</em>
            </h2>
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
      </main>

      <footer className="landing-footer">
        <div className="ds-container">
          <div className="landing-footer__top">
            <div className="landing-final__card landing-footer__cta">
              <h2 className="landing-final__title">Give your money <em>a plan.</em></h2>
              <div className="landing-final__actions">{primaryAction}</div>
            </div>
          </div>
          <FooterLinks />
        </div>
      </footer>
    </div>
  );
}
