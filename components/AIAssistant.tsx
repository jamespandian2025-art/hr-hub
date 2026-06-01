'use client'

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bot, Loader2, MessageCircle, Minimize2, RotateCcw, Send, Sparkles, X } from 'lucide-react'
import { withCsrfHeaders } from '@/lib/security/csrfClient'

type AssistantRole = 'assistant' | 'user'

type AssistantMessage = {
  id: string
  role: AssistantRole
  content: string
  createdAt: string
}

type AccountSnapshot = {
  company?: string
  role?: string
  fullName?: string
  name?: string
  email?: string
}

type StoredAssistant = {
  open?: boolean
  messages?: AssistantMessage[]
  provider?: 'openai' | 'local'
}

const assistantStorageKey = 'wiseflow-ai-assistant'
const accountStorageKey = 'flowsys-account'
const welcomeMessage: AssistantMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hi, I am WiseFlow AI. Ask me where to go, how to complete a workflow, or what to check next in invoices, clients, projects, payroll, HR, warehouse, or accounting.',
  createdAt: new Date(0).toISOString(),
}

const quickPrompts = [
  'How do I create an invoice?',
  'Where do client invoices appear?',
  'Help me check payroll details',
  'How do I update project status?',
]

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function readAccount(): AccountSnapshot {
  try {
    const raw = window.localStorage.getItem(accountStorageKey)
    return raw ? JSON.parse(raw) as AccountSnapshot : {}
  } catch {
    return {}
  }
}

function readStoredAssistant(): StoredAssistant {
  try {
    const raw = window.localStorage.getItem(assistantStorageKey)
    return raw ? JSON.parse(raw) as StoredAssistant : {}
  } catch {
    return {}
  }
}

function compactMessages(messages: AssistantMessage[]) {
  const cleaned = messages.filter(message => message.content.trim())
  return [welcomeMessage, ...cleaned.filter(message => message.id !== welcomeMessage.id).slice(-24)]
}

function localAssistantReply(content: string, pathname: string) {
  const latest = content.toLowerCase()
  if (/invoice|bill to|billing|payment|receivable/.test(latest) || pathname.includes('/accounting')) {
    return 'For invoices, start in Accounting > Invoices. Choose the client from the Customer dropdown, confirm the auto-filled email and Bill to details, add item lines with the right unit, then set the status before saving. After saving, the invoice should appear under that client record in the client database.'
  }
  if (/client|customer|contact/.test(latest) || pathname.includes('/people/clients')) {
    return 'For client work, open People > Client Database, select the client, then use the tabs for overview, invoices, contracts, activities, notes, documents, contacts, and history.'
  }
  if (/payroll|payslip|salary|deduction/.test(latest) || pathname.includes('/hr/payroll')) {
    return 'For payroll, open HR > Payroll, select a payroll cycle, then click an employee payslip row to review gross pay, deductions, net pay, pay period, pay date, and status.'
  }
  if (/project|task|status|priority|budget/.test(latest) || pathname.includes('/project-management')) {
    return 'For projects, use Project Management > Projects to update status, priority, budget, dates, and progress. Status and priority dropdowns should use the colored pill style.'
  }
  return 'I can help with WiseFlow workflows, page navigation, and next steps. Ask me about invoices, clients, projects, payroll, HR, warehouse, procurement, or accounting and I will keep the answer focused.'
}

export default function AIAssistant() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<AssistantMessage[]>([welcomeMessage])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [provider, setProvider] = useState<'openai' | 'local' | null>(null)
  const [account, setAccount] = useState<AccountSnapshot>({})
  const threadRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    const id = window.setTimeout(() => {
      const stored = readStoredAssistant()
      const storedMessages = Array.isArray(stored.messages) && stored.messages.length ? stored.messages : [welcomeMessage]
      setMessages(compactMessages(storedMessages))
      setOpen(Boolean(stored.open))
      setProvider(stored.provider || null)
      setAccount(readAccount())
      loadedRef.current = true
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    const refreshAccount = () => setAccount(readAccount())
    window.addEventListener('storage', refreshAccount)
    window.addEventListener('focus', refreshAccount)
    return () => {
      window.removeEventListener('storage', refreshAccount)
      window.removeEventListener('focus', refreshAccount)
    }
  }, [])

  useEffect(() => {
    if (!loadedRef.current) return
    window.localStorage.setItem(assistantStorageKey, JSON.stringify({
      open,
      provider,
      messages: compactMessages(messages),
    }))
  }, [messages, open, provider])

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
      inputRef.current?.focus()
    }, 0)
    return () => window.clearTimeout(id)
  }, [messages, open])

  const subtitle = useMemo(() => {
    if (sending) return 'Thinking through your workflow'
    if (provider === 'openai') return 'AI connected'
    if (provider === 'local') return 'Local help mode'
    return 'Ready to help'
  }, [provider, sending])

  const sendMessage = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || sending) return

    const userMessage: AssistantMessage = {
      id: createId(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    }
    const nextMessages = compactMessages([...messages, userMessage])
    setMessages(nextMessages)
    setDraft('')
    setSending(true)

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          messages: nextMessages.slice(-10).map(message => ({ role: message.role, content: message.content })),
          context: {
            path: pathname,
            pageTitle: typeof document !== 'undefined' ? document.title : '',
            company: account.company,
            role: account.role,
          },
        }),
      })
      const payload = await response.json().catch(() => null) as { ok?: boolean; reply?: string; provider?: 'openai' | 'local'; error?: string } | null
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'The assistant could not answer right now.')
      }
      const assistantMessage: AssistantMessage = {
        id: createId(),
        role: 'assistant',
        content: payload.reply || 'I am here, but I could not produce a full answer for that request.',
        createdAt: new Date().toISOString(),
      }
      setProvider(payload.provider || null)
      setMessages(current => compactMessages([...current, assistantMessage]))
    } catch (error) {
      const assistantMessage: AssistantMessage = {
        id: createId(),
        role: 'assistant',
        content: error instanceof Error && /Authentication required/i.test(error.message)
          ? 'Please sign in again so I can help from inside your WiseFlow workspace.'
          : localAssistantReply(trimmed, pathname),
        createdAt: new Date().toISOString(),
      }
      setProvider('local')
      setMessages(current => compactMessages([...current, assistantMessage]))
    } finally {
      setSending(false)
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void sendMessage(draft)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    void sendMessage(draft)
  }

  const clearThread = () => {
    setMessages([welcomeMessage])
    setProvider(null)
  }

  return (
    <div className="ai-assistant-root">
      {open && (
        <section className="ai-assistant-panel" aria-label="WiseFlow AI Assistant">
          <header className="ai-assistant-header">
            <div className="ai-assistant-title">
              <span className="ai-assistant-mark"><Sparkles size={18} /></span>
              <span>
                <strong>WiseFlow AI</strong>
                <small>{subtitle}</small>
              </span>
            </div>
            <div className="ai-assistant-actions">
              <button type="button" aria-label="Clear assistant chat" onClick={clearThread}><RotateCcw size={16} /></button>
              <button type="button" aria-label="Minimize assistant" onClick={() => setOpen(false)}><Minimize2 size={16} /></button>
              <button type="button" aria-label="Close assistant" onClick={() => setOpen(false)}><X size={17} /></button>
            </div>
          </header>

          <div ref={threadRef} className="ai-assistant-thread">
            {messages.map(message => (
              <div key={message.id} className={`ai-assistant-message is-${message.role}`}>
                <span className="ai-assistant-message-icon">{message.role === 'assistant' ? <Bot size={15} /> : <MessageCircle size={15} />}</span>
                <p>{message.content}</p>
              </div>
            ))}
            {sending && (
              <div className="ai-assistant-message is-assistant">
                <span className="ai-assistant-message-icon"><Loader2 size={15} className="ai-assistant-spin" /></span>
                <p>Checking the best next step...</p>
              </div>
            )}
          </div>

          <div className="ai-assistant-prompts" aria-label="Suggested assistant prompts">
            {quickPrompts.map(prompt => (
              <button key={prompt} type="button" onClick={() => void sendMessage(prompt)} disabled={sending}>
                {prompt}
              </button>
            ))}
          </div>

          <form className="ai-assistant-composer" onSubmit={submit}>
            <textarea
              ref={inputRef}
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask WiseFlow AI..."
              rows={2}
            />
            <button type="submit" aria-label="Send assistant message" disabled={sending || !draft.trim()}>
              {sending ? <Loader2 size={18} className="ai-assistant-spin" /> : <Send size={18} />}
            </button>
          </form>
        </section>
      )}

      {!open && (
        <button
          type="button"
          className="ai-assistant-fab"
          aria-label="Open WiseFlow AI Assistant"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Bot size={22} />
          <span>AI</span>
        </button>
      )}
    </div>
  )
}
