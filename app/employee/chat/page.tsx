'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { useEmployeePortalData } from '../employeeData'

const chatStorageKey = 'flowsys-chat'
const chatChangeEvent = 'flowsys-chat-change'

interface ChatMessage {
  id: number
  channelId: string
  author: string
  role: string
  body: string
  createdAt: string
  reactions: string[]
  attachments: string[]
  payload?: {
    type?: string
    url?: string
    name?: string
    label?: string
    duration?: string
  }
}

interface ChatChannel {
  id: string
  name: string
  type: 'channel' | 'dm'
  description: string
  unread: number
  pinned: boolean
  members: string[]
  employeeId?: string
  employeePhoto?: string
}

interface ChatStore {
  channels: ChatChannel[]
  messages: ChatMessage[]
}

const emptyStore: ChatStore = { channels: [], messages: [] }
const maxStoredMessages = 120

function loadStore() {
  if (typeof window === 'undefined') return emptyStore
  try {
    const stored = window.localStorage.getItem(chatStorageKey)
    if (!stored) return emptyStore
    const parsed = JSON.parse(stored) as Partial<ChatStore>
    return {
      channels: Array.isArray(parsed.channels) ? parsed.channels : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    }
  } catch {
    return emptyStore
  }
}

function saveStore(store: ChatStore) {
  const compactStore = compactChatStore(store)
  try {
    window.localStorage.setItem(chatStorageKey, JSON.stringify(compactStore))
  } catch {
    try {
      window.localStorage.setItem(chatStorageKey, JSON.stringify({ ...compactStore, messages: compactStore.messages.slice(-40) }))
    } catch {
      window.localStorage.removeItem(chatStorageKey)
      window.localStorage.setItem(chatStorageKey, JSON.stringify({ channels: compactStore.channels, messages: [] }))
    }
  }
  window.setTimeout(() => window.dispatchEvent(new Event(chatChangeEvent)), 0)
}

function compactChatStore(store: ChatStore): ChatStore {
  return {
    channels: store.channels.map(channel => ({
      ...channel,
      employeePhoto: channel.employeePhoto?.startsWith('data:') ? undefined : channel.employeePhoto,
    })),
    messages: store.messages.slice(-maxStoredMessages).map(message => ({
      ...message,
      attachments: message.attachments?.map(name => String(name).slice(0, 120)) || [],
      payload: message.payload?.url?.startsWith('data:')
        ? { ...message.payload, type: 'text', url: undefined, label: message.payload.label || message.payload.name || 'Attachment saved outside local storage' }
        : message.payload,
    })),
  }
}

function nextMessageId(messages: ChatMessage[]) {
  return messages.reduce((max, message) => Math.max(max, Number(message.id) || 0), 0) + 1
}

function timeLabel(value: string) {
  return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function EmployeeChatPage() {
  const { employee, employeeName } = useEmployeePortalData()
  const [store, setStore] = useState<ChatStore>(() => emptyStore)
  const [draft, setDraft] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelId = `hr-dm-${employee.id}`

  useEffect(() => {
    const ensureEmployeeChannel = () => {
      const current = loadStore()
      const existing = current.channels.find(channel => channel.id === channelId)
      const employeeChannel: ChatChannel = {
        id: channelId,
        name: employeeName,
        type: 'dm',
        description: employee.jobTitle || employee.department || 'Employee direct message',
        unread: existing?.unread || 0,
        pinned: existing?.pinned || false,
        members: ['HR', employeeName],
        employeeId: employee.id,
        employeePhoto: employee.photo,
      }
      const nextStore = {
        channels: [...current.channels.filter(channel => channel.id !== channelId), employeeChannel],
        messages: current.messages,
      }
      saveStore(nextStore)
      setStore(nextStore)
    }

    ensureEmployeeChannel()
    const sync = () => setStore(loadStore())
    window.addEventListener('storage', sync)
    window.addEventListener(chatChangeEvent, sync)
    window.addEventListener('focus', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(chatChangeEvent, sync)
      window.removeEventListener('focus', sync)
    }
  }, [channelId, employee.department, employee.id, employee.jobTitle, employee.photo, employeeName])

  const messages = useMemo(() => store.messages.filter(message => message.channelId === channelId), [channelId, store.messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const sendMessage = (event: FormEvent) => {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return

    const current = loadStore()
    const nextStore: ChatStore = {
      channels: current.channels.some(channel => channel.id === channelId)
        ? current.channels
        : [...current.channels, {
          id: channelId,
          name: employeeName,
          type: 'dm',
          description: employee.jobTitle || employee.department || 'Employee direct message',
          unread: 0,
          pinned: false,
          members: ['HR', employeeName],
          employeeId: employee.id,
          employeePhoto: employee.photo,
        }],
      messages: [
        ...current.messages,
        {
          id: nextMessageId(current.messages),
          channelId,
          author: employeeName,
          role: 'Employee',
          body,
          createdAt: new Date().toISOString(),
          reactions: [],
          attachments: [],
        },
      ],
    }
    saveStore(nextStore)
    setStore(nextStore)
    setDraft('')
  }

  return (
    <div className="employee-page">
      <div className="employee-page-header" style={pageHeaderStyle}>
        <div>
          <h1>Chat with HR</h1>
          <p>Send messages to HR about attendance, leave, payroll, loans, and employee requests.</p>
        </div>
      </div>

      <section className="employee-panel" style={chatPanelStyle}>
        <header style={chatHeaderStyle}>
          <span style={chatIconStyle}><MessageCircle size={20} /></span>
          <div>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: 18 }}>Human Resources</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Messages here appear in the HR chat window.</p>
          </div>
        </header>

        <div style={threadStyle}>
          {messages.length === 0 ? (
            <div style={emptyStyle}>
              <MessageCircle size={28} />
              <strong>No messages yet</strong>
              <span>Start the conversation with HR.</span>
            </div>
          ) : messages.map(message => {
            const own = message.author === employeeName || message.role === 'Employee'
            return (
              <div key={message.id} style={{ ...messageRowStyle, justifyContent: own ? 'flex-end' : 'flex-start' }}>
                <div style={own ? ownBubbleStyle : otherBubbleStyle}>
                  {!own && <strong style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>{message.author}</strong>}
                  <div>{message.body}</div>
                  <small style={{ display: 'block', marginTop: 6, opacity: 0.72 }}>{timeLabel(message.createdAt)}</small>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} style={composerStyle}>
          <input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Message HR..." style={inputStyle} />
          <button type="submit" className="employee-primary-button"><Send size={16} /> Send</button>
        </form>
      </section>
    </div>
  )
}

const pageHeaderStyle = { alignItems: 'center' } as const
const chatPanelStyle = { padding: 0, overflow: 'hidden', minHeight: 560, display: 'grid', gridTemplateRows: 'auto minmax(320px, 1fr) auto' } as const
const chatHeaderStyle = { display: 'flex', alignItems: 'center', gap: 12, padding: 18, borderBottom: '1px solid #e2e8f0', background: '#fff' } as const
const chatIconStyle = { width: 42, height: 42, borderRadius: 12, background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center', flexShrink: 0 } as const
const threadStyle = { padding: 18, display: 'grid', gap: 10, alignContent: 'start', overflowY: 'auto' as const, background: '#f8fafc' }
const emptyStyle = { minHeight: 280, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 8, color: '#64748b', textAlign: 'center' as const }
const messageRowStyle = { display: 'flex' }
const ownBubbleStyle = { maxWidth: 'min(680px, 78%)', borderRadius: '16px 16px 4px 16px', background: '#16a34a', color: '#fff', padding: '10px 12px', fontSize: 13, lineHeight: 1.45 }
const otherBubbleStyle = { maxWidth: 'min(680px, 78%)', borderRadius: '16px 16px 16px 4px', background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', padding: '10px 12px', fontSize: 13, lineHeight: 1.45 }
const composerStyle = { display: 'flex', gap: 10, padding: 14, borderTop: '1px solid #e2e8f0', background: '#fff' }
const inputStyle = { flex: 1, minWidth: 0, minHeight: 42, border: '1px solid #dbe4ee', borderRadius: 10, padding: '0 12px', color: '#0f172a', font: 'inherit', outline: 'none' }
