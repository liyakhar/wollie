import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'

/** Shown when a page fails to load, instead of a blank screen. */
export function RouteError({ reset }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <main id="main" className="m-screen m-setup">
      <header className="m-setup__head">
        <p className="m-setup__kicker">Something went wrong</p>
        <h1>That did not load.</h1>
        <p>Check your connection and try again. Your data is safe.</p>
      </header>
      <button
        type="button"
        className="m-button m-button--primary m-button--wide"
        onClick={() => {
          reset()
          void router.invalidate()
        }}
      >
        Try again
      </button>
    </main>
  )
}
