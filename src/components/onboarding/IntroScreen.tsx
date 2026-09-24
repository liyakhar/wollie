import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { loginSearch } from '#/lib/auth-nav'

const SLIDES = [
  {
    image: '/onboarding/intro-1.webp',
    title: 'Your money, organised. Finally.',
    body: 'Every account and every payment in one calm place.',
    wordmark: true,
  },
  {
    image: '/onboarding/intro-2.webp',
    title: 'Know where it goes.',
    body: 'Spending sorted by category, budgets that reset on payday, and goals that keep count.',
    wordmark: false,
  },
  {
    image: '/onboarding/intro-3.webp',
    title: 'On your own or together.',
    body: 'Budget for yourself or with a partner. Different banks are no problem.',
    wordmark: false,
  },
] as const

/** Remembers that the intro was seen, so signed-out visits go straight to sign in. */
export function markIntroSeen() {
  document.cookie = 'wollie_intro=1; path=/; max-age=31536000; samesite=lax'
}

export function IntroScreen({ redirect }: { redirect: string }) {
  const navigate = useNavigate()
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const last = index === SLIDES.length - 1

  // Follow the swipe position so the dots and button stay in step.
  useEffect(() => {
    const element = track.current
    if (!element) return
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
  }, [])

  function goTo(next: number) {
    const element = track.current
    if (!element) return
    element.scrollTo({ left: next * element.clientWidth, behavior: 'smooth' })
  }

  function finish(signup: boolean) {
    markIntroSeen()
    void navigate({ to: '/login', search: loginSearch({ redirect, signup }) })
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
            key={slide.image}
            className="m-intro__slide"
            aria-roledescription="slide"
            aria-label={`${slideIndex + 1} of ${SLIDES.length}`}
            aria-hidden={slideIndex !== index}
          >
            <div className="m-intro__art">
              <img src={slide.image} alt="" width={900} height={1350} decoding="async" />
              {slide.wordmark && (
                <span className="m-intro__wordmark">
                  Wollie<span aria-hidden="true">.</span>
                </span>
              )}
            </div>
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
            <span key={slide.image} className={dotIndex === index ? 'is-on' : undefined} />
          ))}
        </div>
        {last ? (
          <>
            <button type="button" className="m-button m-button--primary m-button--wide" onClick={() => finish(true)}>
              Get started
            </button>
            <button type="button" className="m-link m-link--center" onClick={() => finish(false)}>
              I already have an account
            </button>
          </>
        ) : (
          <>
            <button type="button" className="m-button m-button--primary m-button--wide" onClick={() => goTo(index + 1)}>
              Continue
            </button>
            <Link
              to="/login"
              search={loginSearch({ redirect })}
              className="m-link m-link--center"
              onClick={markIntroSeen}
            >
              I already have an account
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
