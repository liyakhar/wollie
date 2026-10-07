/** Covers the app until Face ID or the passcode passes. */
export function LockScreen({ busy, onUnlock }: { busy: boolean; onUnlock: () => void }) {
  return (
    <div className="lock-screen" role="dialog" aria-modal="true" aria-label="Wollie is locked">
      <div className="lock-screen__inner">
        <div className="lock-screen__mark" aria-hidden="true">W</div>
        <h1>Wollie is locked.</h1>
        <p>Use Face ID to see your money.</p>
        <button type="button" className="m-button m-button--primary m-button--wide" disabled={busy} onClick={onUnlock}>
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </div>
    </div>
  )
}
