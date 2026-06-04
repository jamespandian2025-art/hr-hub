'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2, Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react'
import { requestVoiceIntent } from '@/lib/voice/intent'
import { withCsrfHeaders } from '@/lib/security/csrfClient'

type Destination = { aliases: string[]; route: string; label: string }

// Action commands open a create flow on the target page (via a voice intent the
// page listens for). Matched before navigation so "create rfq" doesn't just
// navigate to RFQs.
type ActionDef = { test: RegExp; intent: string; route: string; label: string }
const actionDefs: ActionDef[] = [
  { test: /\b(new|create|add)\b.*\b(rfq|request for quotation|quotation)\b/, intent: 'new-rfq', route: '/procurement/rfqs', label: 'New RFQ' },
  { test: /\b(new|create|add|start)\b.*\bproject\b/, intent: 'new-project', route: '/project-management', label: 'New Project' },
  { test: /\b(new|create|add)\b.*\b(dataset|data set)\b/, intent: 'new-dataset', route: '/datasets', label: 'New Dataset' },
]

// Navigation targets the voice command can reach. Aliases are matched loosely
// against the spoken phrase (longest alias wins) so "open client database",
// "clients", or "go to client db" all resolve correctly.
const destinations: Destination[] = [
  { aliases: ['dashboard', 'home'], route: '/dashboard', label: 'Dashboard' },
  { aliases: ['client database', 'clients', 'client db', 'client'], route: '/client-database', label: 'Client Database' },
  { aliases: ['sales'], route: '/sales', label: 'Sales' },
  { aliases: ['request for quotation', 'request for quotations', 'rfqs', 'rfq', 'quotations', 'quotation'], route: '/procurement/rfqs', label: 'RFQs' },
  { aliases: ['procurement'], route: '/procurement', label: 'Procurement' },
  { aliases: ['project management', 'projects', 'project'], route: '/project-management', label: 'Project Management' },
  { aliases: ['loan management', 'loans', 'loan'], route: '/financials/loan-management', label: 'Loan Management' },
  { aliases: ['financials', 'financial', 'finance'], route: '/financials', label: 'Financials' },
  { aliases: ['hr hub', 'human resources', 'hr'], route: '/hr', label: 'HR Hub' },
  { aliases: ['warehouse', 'inventory'], route: '/warehouse', label: 'Warehouse' },
  { aliases: ['workflows', 'workflow'], route: '/workflows', label: 'Workflows' },
  { aliases: ['datasets', 'dataset', 'data sets'], route: '/datasets', label: 'Datasets' },
  { aliases: ['accounting'], route: '/accounting', label: 'Accounting' },
  { aliases: ['account', 'users', 'user management'], route: '/account/users', label: 'Account Users' },
  { aliases: ['messages', 'chat'], route: '/chat', label: 'Messages' },
]

type Command =
  | { type: 'navigate'; route: string; label: string }
  | { type: 'action'; intent: string; route: string; label: string }
  | { type: 'back'; label: string }
  | { type: 'help'; label: string }
  | null

export function matchVoiceCommand(input: string): Command {
  const text = input.toLowerCase().trim()
  if (!text) return null
  const action = actionDefs.find(def => def.test.test(text))
  if (action) return { type: 'action', intent: action.intent, route: action.route, label: action.label }
  if (/\b(go|move|navigate)\b.*\bback\b|\bprevious\b/.test(text)) return { type: 'back', label: 'Go back' }
  if (/\bhelp\b|\bcommands?\b|what can (you|i)/.test(text)) return { type: 'help', label: 'Help' }
  const cleaned = text.replace(/^(please\s+)?(go to|open|show me|show|navigate to|take me to|go|launch)\s+/i, '').trim()
  let best: Destination | null = null
  let bestLen = 0
  for (const destination of destinations) {
    for (const alias of destination.aliases) {
      const hit = cleaned === alias || cleaned.startsWith(`${alias} `) || cleaned.endsWith(` ${alias}`) || text.includes(alias)
      if (hit && alias.length > bestLen) { best = destination; bestLen = alias.length }
    }
  }
  return best ? { type: 'navigate', route: best.route, label: best.label } : null
}

export default function VoiceCommand() {
  const router = useRouter()
  const pathname = usePathname()
  const [supported, setSupported] = useState(true)
  const [listening, setListening] = useState(false)
  const [open, setOpen] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [message, setMessage] = useState('')
  const [thinking, setThinking] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [muted, setMuted] = useState(false)
  const recognitionRef = useRef<unknown>(null)
  const mutedRef = useRef(false)
  mutedRef.current = muted

  function speak(text: string) {
    if (mutedRef.current || typeof window === 'undefined') return
    const synth = window.speechSynthesis
    if (!synth) return
    try {
      synth.cancel()
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 600))
      utterance.lang = 'en-US'
      utterance.rate = 1.03
      utterance.pitch = 1
      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      synth.speak(utterance)
    } catch { /* ignore */ }
  }

  function stopSpeaking() {
    try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
    setSpeaking(false)
  }

  function respond(text: string) {
    setMessage(text)
    speak(text)
  }

  // Anything that isn't a known command goes to the WiseFlow AI assistant, and
  // the spoken reply makes it feel conversational (Siri-style). The assistant
  // answers from the local knowledge base even without an OpenAI key.
  async function askAssistant(text: string) {
    setThinking(true)
    setMessage('Thinking…')
    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          messages: [{ role: 'user', content: text }],
          context: { path: pathname, pageTitle: typeof document !== 'undefined' ? document.title : '' },
        }),
      })
      const payload = await response.json().catch(() => null) as { ok?: boolean; reply?: string; error?: string } | null
      if (!response.ok || !payload?.ok || !payload.reply) throw new Error(payload?.error || 'assistant unavailable')
      respond(payload.reply)
    } catch {
      respond("Sorry, I couldn't reach the assistant right now. You can still say things like \"open datasets\" or \"create a new RFQ\".")
    } finally {
      setThinking(false)
    }
  }

  async function runCommand(text: string): Promise<boolean> {
    const command = matchVoiceCommand(text)
    if (!command) { await askAssistant(text); return true }
    if (command.type === 'navigate') {
      respond(`Opening ${command.label}.`)
      router.push(command.route)
      window.setTimeout(() => setOpen(false), 1400)
      return true
    }
    if (command.type === 'action') {
      respond(`Sure — opening the ${command.label.toLowerCase()} form.`)
      requestVoiceIntent(command.intent)
      if (pathname !== command.route) router.push(command.route)
      window.setTimeout(() => setOpen(false), 1600)
      return true
    }
    if (command.type === 'back') {
      respond('Going back.')
      router.back()
      window.setTimeout(() => setOpen(false), 1400)
      return true
    }
    respond('You can say things like "open datasets", "go to RFQs", "create a new project", or just ask me a question about invoices, clients, payroll, or projects.')
    return true
  }

  const runCommandRef = useRef(runCommand)
  runCommandRef.current = runCommand

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SpeechRecognitionImpl = (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    if (!SpeechRecognitionImpl) { setSupported(false); return }
    const recognition = new (SpeechRecognitionImpl as new () => {
      lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number
      start: () => void; stop: () => void
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
      onerror: ((event: { error: string }) => void) | null
      onend: (() => void) | null
    })()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.maxAlternatives = 1
    recognition.onresult = event => {
      const said = Array.from(event.results).map(result => result[0]?.transcript || '').join(' ').trim()
      setTranscript(said)
      void runCommandRef.current(said)
    }
    recognition.onerror = event => {
      setListening(false)
      setMessage(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone access was blocked. Allow mic permission to use voice commands.'
        : event.error === 'no-speech' ? 'No speech detected — try again.' : 'Voice recognition error. Try again.')
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    // Dev-only hook so the command routing can be verified without a microphone.
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as { __wiseflowVoice?: unknown }).__wiseflowVoice = {
        match: matchVoiceCommand,
        run: (text: string) => runCommandRef.current(text),
        speak,
      }
    }
    return () => { try { recognition.stop() } catch { /* ignore */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleListening = () => {
    setOpen(true)
    const recognition = recognitionRef.current as { start: () => void; stop: () => void } | null
    if (!recognition) return
    if (listening) { try { recognition.stop() } catch { /* ignore */ } return }
    stopSpeaking() // don't let the mic hear our own voice
    setTranscript('')
    setMessage('Listening… ask me anything or say "go to datasets".')
    try { recognition.start(); setListening(true) } catch { /* already started */ }
  }

  return (
    <div className="voice-command-root">
      <style>{css}</style>
      {open && (
        <div className="voice-command-panel" role="dialog" aria-label="Voice command">
          <div className="voice-command-panel-head">
            <strong><Mic size={14} /> WiseFlow Assistant{speaking && <span className="voice-command-speaking" aria-label="Speaking"><i /><i /><i /></span>}</strong>
            <div className="voice-command-panel-actions">
              <button
                type="button"
                aria-label={muted ? 'Unmute voice replies' : 'Mute voice replies'}
                aria-pressed={muted}
                onClick={() => { if (!muted) stopSpeaking(); setMuted(m => !m) }}
              >{muted ? <VolumeX size={14} /> : <Volume2 size={14} />}</button>
              <button type="button" aria-label="Close voice command" onClick={() => { setOpen(false); stopSpeaking(); const r = recognitionRef.current as { stop: () => void } | null; try { r?.stop() } catch { /* ignore */ } }}><X size={14} /></button>
            </div>
          </div>
          {!supported ? (
            <p className="voice-command-msg">Voice commands need a Chromium browser (Chrome/Edge). Your browser doesn&apos;t support the Web Speech API.</p>
          ) : (
            <>
              {transcript && <p className="voice-command-heard">"{transcript}"</p>}
              <p className="voice-command-msg">
                {thinking && <Loader2 size={13} className="voice-command-spin" />}
                {message || 'Tap the mic, then ask a question or say where to go.'}
              </p>
              <p className="voice-command-hint">Try: "Open RFQs", "Create a new RFQ", "New project", or "How do I send an invoice?"</p>
            </>
          )}
        </div>
      )}
      <button
        type="button"
        className={`voice-command-fab${listening ? ' is-listening' : ''}`}
        aria-label={listening ? 'Stop voice command' : 'Start voice command'}
        aria-pressed={listening}
        onClick={toggleListening}
        disabled={!supported && open}
      >
        {supported ? <Mic size={20} /> : <MicOff size={20} />}
      </button>
    </div>
  )
}

const css = `
.voice-command-root { position: fixed; right: 150px; bottom: 20px; z-index: 215; font-family: var(--font-body), system-ui, sans-serif; }
.voice-command-fab {
  width: 52px; height: 52px; border-radius: 50%; border: 0; cursor: pointer;
  background: #0f7f86; color: #fff; display: grid; place-items: center;
  box-shadow: 0 14px 34px rgba(15,127,134,.4);
}
.voice-command-fab:hover { background: #0c6a70; }
.voice-command-fab.is-listening { background: #dc2626; box-shadow: 0 0 0 0 rgba(220,38,38,.5); animation: voice-pulse 1.4s ease-out infinite; }
@keyframes voice-pulse { 0% { box-shadow: 0 0 0 0 rgba(220,38,38,.45); } 100% { box-shadow: 0 0 0 16px rgba(220,38,38,0); } }
.voice-command-panel {
  position: absolute; right: 0; bottom: 64px; width: 290px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px;
  box-shadow: 0 24px 60px rgba(15,23,42,.22);
}
.voice-command-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.voice-command-panel-head strong { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: #0f172a; }
.voice-command-panel-actions { display: inline-flex; align-items: center; gap: 2px; }
.voice-command-panel-head button { border: 0; background: transparent; cursor: pointer; color: #64748b; display: inline-flex; padding: 2px; border-radius: 6px; }
.voice-command-panel-head button:hover { background: #f1f5f9; color: #0f172a; }
.voice-command-panel-head button[aria-pressed="true"] { color: #dc2626; }
.voice-command-speaking { display: inline-flex; align-items: flex-end; gap: 2px; height: 12px; }
.voice-command-speaking i { width: 3px; height: 4px; background: #0f7f86; border-radius: 2px; animation: voice-eq .9s ease-in-out infinite; }
.voice-command-speaking i:nth-child(2) { animation-delay: .15s; }
.voice-command-speaking i:nth-child(3) { animation-delay: .3s; }
@keyframes voice-eq { 0%,100% { height: 4px; } 50% { height: 12px; } }
.voice-command-spin { display: inline-block; vertical-align: -2px; margin-right: 5px; color: #0f7f86; animation: voice-spin 1s linear infinite; }
@keyframes voice-spin { to { transform: rotate(360deg); } }
.voice-command-heard { margin: 0 0 6px; font-size: 14px; font-weight: 700; color: #0f172a; }
.voice-command-msg { margin: 0; font-size: 13px; color: #334155; line-height: 1.4; }
.voice-command-hint { margin: 8px 0 0; font-size: 11px; color: #94a3b8; }
@media (max-width: 760px) {
  .voice-command-root { right: 74px; bottom: 74px; }
  .voice-command-panel { width: min(280px, calc(100vw - 90px)); }
}
`
