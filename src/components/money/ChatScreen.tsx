import { Link, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { runChatAction, sendChatMessage, type ChatMessage, type ChatProposal } from '#/server/chat'
import { IconChevronLeft, IconSend } from './icons'

type Entry = ChatMessage & {
  id: number
  proposal?: ChatProposal
  /** What happened to the proposal. */
  outcome?: 'running' | 'done' | 'cancelled' | 'failed'
  error?: boolean
}

const STARTERS = [
  'How much did we spend on food this month?',
  'Put €500 every month into savings',
  'Set a €300 budget for dining',
]

let nextId = 1

export function ChatScreen() {
  const router = useRouter()
  const [entries, setEntries] = useState<Entry[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [entries, busy])

  // Grow the box with the text, up to a few lines.
  useEffect(() => {
    const box = input.current
    if (!box) return
    box.style.height = 'auto'
    box.style.height = `${Math.min(box.scrollHeight, 140)}px`
  }, [draft])

  const update = (id: number, patch: Partial<Entry>) =>
    setEntries((list) => list.map((entry) => entry.id === id ? { ...entry, ...patch } : entry))

  async function ask(text: string) {
    const content = text.trim()
    if (!content || busy) return
    const question: Entry = { id: nextId++, role: 'user', content }
    const history = [...entries, question]
    setEntries(history)
    setDraft('')
    setBusy(true)
    try {
      const result = await sendChatMessage({
        data: { messages: history.filter((entry) => !entry.error).map(forModel) },
      })
      setEntries((list) => [...list, {
        id: nextId++,
        role: 'assistant',
        content: result.reply,
        proposal: result.proposal ?? undefined,
      }])
    } catch (cause) {
      setEntries((list) => [...list, {
        id: nextId++,
        role: 'assistant',
        content: cause instanceof Error ? cause.message : 'Something went wrong. Try again.',
        error: true,
      }])
    } finally {
      setBusy(false)
    }
  }

  async function confirm(entry: Entry) {
    if (!entry.proposal) return
    update(entry.id, { outcome: 'running' })
    try {
      await runChatAction({ data: { action: entry.proposal.action } })
      update(entry.id, { outcome: 'done' })
      void router.invalidate()
    } catch (cause) {
      update(entry.id, { outcome: 'failed' })
      setEntries((list) => [...list, {
        id: nextId++,
        role: 'assistant',
        content: cause instanceof Error ? cause.message : 'That did not work. Try again.',
        error: true,
      }])
    }
  }

  function cancel(entry: Entry) {
    update(entry.id, { outcome: 'cancelled' })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void ask(draft)
  }

  return (
    <main id="main" className="m-screen w-chat">
      <header className="m-title-row m-title-row--back w-chat__head">
        <Link to="/app" className="m-icon-button m-icon-button--glass" aria-label="Back to Home">
          <IconChevronLeft aria-hidden="true" />
        </Link>
        <h1>Ask Wollie</h1>
      </header>

      {entries.length === 0 ? (
        <section className="w-chat__intro">
          <p>Ask about your spending, budgets and savings. Wollie can also set things up for you. You confirm every change first.</p>
          <ul className="w-chat__starters">
            {STARTERS.map((starter) => (
              <li key={starter}>
                <button type="button" onClick={() => void ask(starter)}>{starter}</button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <ol className="w-chat__log" aria-live="polite">
          {entries.map((entry) => (
            <li key={entry.id} className={`w-chat__msg w-chat__msg--${entry.role}${entry.error ? ' is-error' : ''}`}>
              <p>{entry.content}</p>
              {entry.proposal && (
                <ChangeCard entry={entry} onConfirm={() => void confirm(entry)} onCancel={() => cancel(entry)} />
              )}
            </li>
          ))}
          {busy && (
            <li className="w-chat__msg w-chat__msg--assistant w-chat__thinking" aria-label="Wollie is thinking">
              <span /><span /><span />
            </li>
          )}
        </ol>
      )}
      <div ref={end} className="w-chat__end" />

      <div className="w-chat__dock">
      <form className="w-chat__composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="chat-input">Your question</label>
        <textarea
          id="chat-input"
          ref={input}
          rows={1}
          maxLength={1200}
          placeholder="Ask about your money"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              void ask(draft)
            }
          }}
        />
        <button type="submit" className="w-chat__send" aria-label="Send" disabled={busy || !draft.trim()}>
          <IconSend aria-hidden="true" />
        </button>
      </form>
      </div>
    </main>
  )
}

/** The model only sees text, so tell it what happened to each proposed change. */
function forModel(entry: Entry): ChatMessage {
  if (!entry.proposal) return { role: entry.role, content: entry.content }
  const note = entry.outcome === 'done'
    ? `[Confirmed and saved: ${entry.proposal.summary}]`
    : entry.outcome === 'cancelled'
      ? `[The person cancelled: ${entry.proposal.summary}]`
      : `[Proposed, not confirmed yet: ${entry.proposal.summary}]`
  return { role: entry.role, content: `${entry.content}\n\n${note}` }
}

function ChangeCard({ entry, onConfirm, onCancel }: { entry: Entry; onConfirm: () => void; onCancel: () => void }) {
  const { outcome, proposal } = entry
  if (!proposal) return null
  return (
    <div className={`w-chat__change${outcome === 'done' ? ' is-done' : ''}${outcome === 'cancelled' ? ' is-cancelled' : ''}`}>
      <span className="w-label">{outcome === 'done' ? 'Done' : outcome === 'cancelled' ? 'Not changed' : 'Change'}</span>
      <p>{proposal.summary}</p>
      {(!outcome || outcome === 'running' || outcome === 'failed') && (
        <div className="w-chat__change-actions">
          <button type="button" className="m-button m-button--primary" disabled={outcome === 'running'} onClick={onConfirm}>
            {outcome === 'running' ? 'Saving…' : 'Confirm'}
          </button>
          <button type="button" className="m-button m-button--ghost" disabled={outcome === 'running'} onClick={onCancel}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
