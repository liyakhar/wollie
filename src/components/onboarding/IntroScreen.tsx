import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { loginSearch } from '#/lib/auth-nav'
import { saveSetupAnswers, type SetupAnswers } from '#/lib/setup-answers'

type Slide = { key: string; title: string; body: string; art: ReactNode }

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    title: 'Money for two.',
    body: 'One calm place for your money, on your own or as a couple.',
    art: (
      <>
        <img src="/onboarding/intro-1.webp" alt="" width={900} height={1350} decoding="async" />
        <span className="m-intro__wordmark">
          Wollie<span aria-hidden="true">.</span>
        </span>
      </>
    ),
  },
  {
    key: 'spending',
    title: 'Where did it all go?',
    body: 'Wollie sorts every payment for you, so you can finally see where your money goes.',
    art: <img src="/onboarding/intro-spending.webp" alt="" width={900} height={1350} decoding="async" />,
  },
  {
    key: 'budgets',
    title: 'Spend without the worry.',
    body: 'Pick how much for groceries, eating out and fun. You always see what’s left this month.',
    art: <img src="/onboarding/intro-budgets.webp" alt="" width={900} height={1350} decoding="async" />,
  },
  {
    key: 'savings',
    title: 'Save without thinking.',
    body: 'Choose a monthly amount for each goal. Wollie ticks the month off when the money moves.',
    art: <img src="/onboarding/intro-savings.webp" alt="" width={900} height={1350} decoding="async" />,
  },
  {
    key: 'couples',
    title: 'Better together.',
    body: 'Keep your own banks. See your money as a couple, and split costs in a way that feels fair.',
    art: <img src="/onboarding/intro-3.webp" alt="" width={900} height={1350} decoding="async" />,
  },
]

type Step = 'slides' | 'who' | 'payday' | 'goals'

const PAYDAYS: Array<{ label: string; day: number | null }> = [
  { label: '1st', day: 1 },
  { label: '15th', day: 15 },
  { label: '25th', day: 25 },
  { label: 'Last day', day: 31 },
  { label: 'It changes', day: null },
]

const GOALS = ['A home', 'Travel', 'Safety net', 'A car']

/** Remembers that the intro was seen, so signed-out visits go straight to sign in. */
export function markIntroSeen() {
  document.cookie = 'wollie_intro=1; path=/; max-age=31536000; samesite=lax'
}

export function IntroScreen({ redirect }: { redirect: string }) {
  const navigate = useNavigate()
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState<Step>('slides')
  const [answers, setAnswers] = useState<SetupAnswers>({ partner: null, payday: undefined, goals: [] })
  const last = index === SLIDES.length - 1

  // Follow the swipe position so the dots and button stay in step.
  useEffect(() => {
    const element = track.current
    if (!element || step !== 'slides') return
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        setIndex(Math.round(element.scrollLeft / element.clientWidth))
      })
    }
    element.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      element.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [step])

  function goTo(next: number) {
    const element = track.current
    if (!element) return
    // Scroll the slide itself into view; this works with scroll snapping on every browser.
    const slide = element.children[next] as HTMLElement | undefined
    slide?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
    setIndex(next)
  }

  function finish(signup: boolean) {
    markIntroSeen()
    if (signup) saveSetupAnswers(answers)
    void navigate({ to: '/login', search: loginSearch({ redirect, signup }) })
  }

  if (step !== 'slides') {
    const number = step === 'who' ? 1 : step === 'payday' ? 2 : 3
    const next = () => (step === 'who' ? setStep('payday') : step === 'payday' ? setStep('goals') : finish(true))
    return (
      <main className="m-intro m-intro--single w-setup" aria-label="Set up Wollie">
        <div className="m-intro__top">
          <button type="button" className="m-intro__skip" onClick={next}>
            Skip
          </button>
        </div>
        <section className="w-setup__body">
          <p className="w-setup__count">Question {number} of 3</p>
          {step === 'who' && (
            <>
              <h1>Who will use Wollie?</h1>
              <div className="w-setup__big" role="radiogroup" aria-label="Who will use Wollie">
                {[{ label: 'Just me', value: false }, { label: 'Me and my partner', value: true }].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    role="radio"
                    aria-checked={answers.partner === option.value}
                    className={answers.partner === option.value ? 'is-on' : undefined}
                    onClick={() => setAnswers({ ...answers, partner: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="m-hint">With a partner? You can invite them right after setup.</p>
            </>
          )}
          {step === 'payday' && (
            <>
              <h1>When do you get paid?</h1>
              <div className="m-chips" role="radiogroup" aria-label="Payday">
                {PAYDAYS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    role="radio"
                    aria-checked={answers.payday === option.day}
                    className={`m-chip${answers.payday === option.day ? ' is-on' : ''}`}
                    onClick={() => setAnswers({ ...answers, payday: option.day })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="m-hint">Your month and your budgets start on payday.</p>
            </>
          )}
          {step === 'goals' && (
            <>
              <h1>Saving for something?</h1>
              <div className="m-chips" role="group" aria-label="Savings goals">
                {GOALS.map((goal) => {
                  const on = answers.goals.includes(goal)
                  return (
                    <button
                      key={goal}
                      type="button"
                      aria-pressed={on}
                      className={`m-chip${on ? ' is-on' : ''}`}
                      onClick={() => setAnswers({
                        ...answers,
                        goals: on ? answers.goals.filter((item) => item !== goal) : [...answers.goals, goal],
                      })}
                    >
                      {goal}
                    </button>
                  )
                })}
              </div>
              <p className="m-hint">Wollie sets these up as goals. Change the amounts any time.</p>
            </>
          )}
        </section>
        <div className="m-intro__bottom">
          <div className="m-intro__dots" aria-hidden="true">
            {[1, 2, 3].map((dot) => (
              <span key={dot} className={dot === number ? 'is-on' : undefined} />
            ))}
          </div>
          <button type="button" className="m-button m-button--primary m-button--wide" onClick={next}>
            {step === 'goals' ? 'Create my account' : 'Continue'}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="m-intro" aria-roledescription="carousel" aria-label="Welcome to Wollie">
      <div className="m-intro__top">
        {!last && (
          <button type="button" className="m-intro__skip" onClick={() => goTo(SLIDES.length - 1)}>
            Skip
          </button>
        )}
      </div>

      <div ref={track} className="m-intro__track">
        {SLIDES.map((slide, slideIndex) => (
          <section
            key={slide.key}
            className="m-intro__slide"
            aria-roledescription="slide"
            aria-label={`${slideIndex + 1} of ${SLIDES.length}`}
            aria-hidden={slideIndex !== index}
          >
            <div className="m-intro__art">{slide.art}</div>
            <div className="m-intro__copy">
              <h1>{slide.title}</h1>
              <p>{slide.body}</p>
            </div>
          </section>
        ))}
      </div>

      <div className="m-intro__bottom">
        <div className="m-intro__dots" aria-hidden="true">
          {SLIDES.map((slide, dotIndex) => (
            <span key={slide.key} className={dotIndex === index ? 'is-on' : undefined} />
          ))}
        </div>
        <button
          type="button"
          className="m-button m-button--primary m-button--wide"
          onClick={() => (last ? setStep('who') : goTo(index + 1))}
        >
          {last ? 'Set up Wollie' : 'Continue'}
        </button>
        <Link
          to="/login"
          search={loginSearch({ redirect })}
          className="m-link m-link--center"
          onClick={markIntroSeen}
        >
          I already have an account
        </Link>
      </div>
    </main>
  )
}
