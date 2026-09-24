import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * Bottom sheet for small edits. Slides up over a dimmed page, closes on
 * the backdrop, the close button, or Escape.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  // Keep the latest onClose without re-running the open effect on each render.
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLElement>('.m-sheet__body input, .m-sheet__body button')?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
    }
    window.addEventListener('keydown', onKey)
    document.documentElement.classList.add('m-sheet-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('m-sheet-open')
      previous?.focus?.({ preventScroll: true })
    }
  }, [open])

  if (!open) return null

  return (
    <div className="m-sheet" role="presentation">
      <button type="button" className="m-sheet__backdrop" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <div ref={panel} className="m-sheet__panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="m-sheet__grip" aria-hidden="true" />
        <div className="m-sheet__head">
          <h2>{title}</h2>
          <button type="button" className="m-icon-button" onClick={onClose} aria-label="Close">
            <X aria-hidden="true" strokeWidth={1.75} />
          </button>
        </div>
        <div className="m-sheet__body">{children}</div>
      </div>
    </div>
  )
}
