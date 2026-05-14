'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  ChevronDown,
  Hash,
  Info,
  Lock,
  Paperclip,
  Plus,
  Search,
  Send,
  Smile,
  Star,
  Users,
} from 'lucide-react'

const font = "var(--font-body)"
const storageKey = 'flowsys-chat'
const chatChangeEvent = 'flowsys-chat-change'
const maxStoredMessages = 120
const maxChatAttachmentBytes = 5 * 1024 * 1024
const employeesStorageKey = 'flowsys-hr-employees'
const accountStorageKey = 'flowsys-account'
const sessionStorageKey = 'flowsys-auth-session'

type ChannelType = 'channel' | 'dm'

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
    type: 'text' | 'photo' | 'voice' | 'gif' | 'sticker' | 'emoji' | 'system'
    url?: string
    name?: string
    label?: string
    duration?: string
  }
}

interface ChatChannel {
  id: string
  name: string
  type: ChannelType
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

interface Employee {
  id: string
  employeeId?: string
  firstName?: string
  lastName?: string
  email?: string
  photo?: string
  jobTitle?: string
  department?: string
}

interface AccountState {
  fullName?: string
  name?: string
  role?: string
}

const initialStore: ChatStore = {
  channels: [
    {
      id: 'general',
      name: 'general',
      type: 'channel',
      description: 'Company-wide project updates and daily coordination.',
      unread: 0,
      pinned: true,
      members: ['James', 'Operations', 'Finance', 'Site Team'],
    },
    {
      id: 'projects',
      name: 'projects',
      type: 'channel',
      description: 'Project schedules, issues, scope updates, and delivery notes.',
      unread: 2,
      pinned: false,
      members: ['James', 'Project Managers', 'Site Team'],
    },
    {
      id: 'finance',
      name: 'finance',
      type: 'channel',
      description: 'Invoices, budgets, purchase orders, and bills.',
      unread: 0,
      pinned: false,
      members: ['James', 'Finance'],
    },
    {
      id: 'dm-liza',
      name: 'Liza W.',
      type: 'dm',
      description: 'Direct message',
      unread: 1,
      pinned: false,
      members: ['James', 'Liza W.'],
    },
    {
      id: 'dm-site',
      name: 'Site Team',
      type: 'dm',
      description: 'Direct message',
      unread: 0,
      pinned: false,
      members: ['James', 'Site Team'],
    },
  ],
  messages: [
    {
      id: 1,
      channelId: 'general',
      author: 'James',
      role: 'Admin',
      body: 'Good morning. Please keep today\'s updates short: blocker, next action, and target date.',
      createdAt: '2026-05-06T08:30:00',
      reactions: ['👍 3'],
      attachments: [],
    },
    {
      id: 2,
      channelId: 'projects',
      author: 'Site Team',
      role: 'Field',
      body: 'Swimming Pool project materials are ready for review. Waiting for supplier confirmation.',
      createdAt: '2026-05-06T09:05:00',
      reactions: ['✅ 1'],
      attachments: ['materials-list.csv'],
    },
    {
      id: 3,
      channelId: 'finance',
      author: 'Finance',
      role: 'Accounting',
      body: 'Please tag new invoices with the related project so they show correctly in project financials.',
      createdAt: '2026-05-06T10:15:00',
      reactions: [],
      attachments: [],
    },
    {
      id: 4,
      channelId: 'dm-liza',
      author: 'Liza W.',
      role: 'Client',
      body: 'Can you send the latest quotation summary when ready?',
      createdAt: '2026-05-06T10:45:00',
      reactions: [],
      attachments: [],
    },
  ],
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : fallback
  } catch {
    return fallback
  }
}

function employeeFullName(employee: Employee) {
  return [employee.firstName, employee.lastName].filter(Boolean).join(' ').trim() || employee.email || 'Employee'
}

function employeeChannel(employee: Employee): ChatChannel {
  const name = employeeFullName(employee)
  return {
    id: `hr-dm-${employee.id}`,
    name,
    type: 'dm',
    description: employee.jobTitle || employee.department || 'Employee direct message',
    unread: 0,
    pinned: false,
    members: ['HR', name],
    employeeId: employee.id,
    employeePhoto: employee.photo,
  }
}

function normalizeStore(store: Partial<ChatStore> | null | undefined, employees: Employee[] = []): ChatStore {
  const storedChannels = Array.isArray(store?.channels) ? store.channels : []
  const storedMessages = Array.isArray(store?.messages) ? store.messages : []
  const employeeChannels = employees.filter(employee => employee.id).map(employeeChannel)
  const channelMap = new Map<string, ChatChannel>()

  initialStore.channels.forEach(channel => channelMap.set(channel.id, channel))
  storedChannels.forEach(channel => channel?.id && channelMap.set(channel.id, { ...channel, unread: Number(channel.unread || 0), members: Array.isArray(channel.members) ? channel.members : [] }))
  employeeChannels.forEach(channel => {
    const existing = channelMap.get(channel.id)
    channelMap.set(channel.id, existing ? { ...existing, ...channel, unread: existing.unread || 0, pinned: existing.pinned || false } : channel)
  })

  return {
    channels: Array.from(channelMap.values()),
    messages: storedMessages.filter(message => message && message.channelId && message.body).map(message => ({
      ...message,
      reactions: Array.isArray(message.reactions) ? message.reactions : [],
      attachments: Array.isArray(message.attachments) ? message.attachments : [],
    })),
  }
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

function saveStore(store: ChatStore) {
  const compactStore = compactChatStore(store)
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(compactStore))
  } catch {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ ...compactStore, messages: compactStore.messages.slice(-40) }))
    } catch {
      window.localStorage.removeItem(storageKey)
      window.localStorage.setItem(storageKey, JSON.stringify({ channels: compactStore.channels, messages: [] }))
    }
  }
}

const loadStore = () => {
  if (typeof window === 'undefined') return initialStore
  const employees = loadJson<Employee[]>(employeesStorageKey, [])
  return normalizeStore(loadJson<ChatStore | null>(storageKey, null), employees)
}

function loadAccount() {
  return {
    ...loadJson<AccountState>(sessionStorageKey, {}),
    ...loadJson<AccountState>(accountStorageKey, {}),
  }
}

const nextMessageId = (messages: ChatMessage[]) => messages.reduce((max, message) => Math.max(max, message.id), 0) + 1
const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
const formatDay = (date: string) =>
  new Date(date).toLocaleDateString('en-PH', { month: 'long', day: '2-digit', year: 'numeric' })
const avatarColor = (name: string) => ['#2563eb', '#7c3aed', '#059669', '#f59e0b', '#e11d48'][name.length % 5]

export default function ChatPage() {
  const [store, setStore] = useState<ChatStore>(loadStore)
  const [account, setAccount] = useState<AccountState>(() => typeof window === 'undefined' ? {} : loadAccount())
  const [activeChannelId, setActiveChannelId] = useState(() => loadStore().channels[0]?.id || 'general')
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [attachmentNotice, setAttachmentNotice] = useState('')
  const [search, setSearch] = useState('')
  const [showDetails, setShowDetails] = useState(true)
  const [newChannelName, setNewChannelName] = useState('')
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    saveStore(store)
  }, [store])

  useEffect(() => {
    const reload = () => {
      const nextStore = loadStore()
      setAccount(loadAccount())
      setStore(nextStore)
      setActiveChannelId(previous => nextStore.channels.some(channel => channel.id === previous) ? previous : nextStore.channels[0]?.id || 'general')
    }
    window.addEventListener('storage', reload)
    window.addEventListener(chatChangeEvent, reload)
    window.addEventListener('focus', reload)
    return () => {
      window.removeEventListener('storage', reload)
      window.removeEventListener(chatChangeEvent, reload)
      window.removeEventListener('focus', reload)
    }
  }, [])

  const activeChannel = store.channels.find(channel => channel.id === activeChannelId) || store.channels[0] || initialStore.channels[0]
  const channelMessages = store.messages.filter(item => item.channelId === activeChannel.id)
  const visibleChannels = store.channels.filter(channel => {
    const query = search.toLowerCase()
    return channel.name.toLowerCase().includes(query) || channel.description.toLowerCase().includes(query)
  })
  const channels = visibleChannels.filter(channel => channel.type === 'channel')
  const dms = visibleChannels.filter(channel => channel.type === 'dm')
  const latestMessage = useMemo(() => channelMessages[channelMessages.length - 1], [channelMessages])
  const authorName = account.fullName || account.name || 'James'
  const authorRole = account.role || 'Admin'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChannelId, store.messages.length])

  const selectChannel = (id: string) => {
    setActiveChannelId(id)
    setStore(previous => ({
      ...previous,
      channels: previous.channels.map(channel => (channel.id === id ? { ...channel, unread: 0 } : channel)),
    }))
  }

  const sendMessage = () => {
    const trimmed = message.trim()
    if (!trimmed && attachments.length === 0) return

    setStore(previous => ({
      ...previous,
      messages: [
        ...previous.messages,
        {
          id: nextMessageId(previous.messages),
          channelId: activeChannel.id,
          author: authorName,
          role: authorRole,
          body: trimmed || `[Attached: ${attachments.join(', ')}]`,
          createdAt: new Date().toISOString(),
          reactions: [],
          attachments,
        },
      ],
    }))
    setMessage('')
    setAttachments([])
    setAttachmentNotice('')
    setEmojiOpen(false)
  }

  const addChannel = () => {
    const trimmed = newChannelName.trim().replace(/\s+/g, '-').toLowerCase()
    if (!trimmed || store.channels.some(channel => channel.id === trimmed)) return

    setStore(previous => ({
      ...previous,
      channels: [
        ...previous.channels,
        {
          id: trimmed,
          name: trimmed,
          type: 'channel',
          description: 'New team channel',
          unread: 0,
          pinned: false,
          members: ['James'],
        },
      ],
    }))
    setNewChannelName('')
    setShowNewChannel(false)
    setActiveChannelId(trimmed)
  }

  const addReaction = (messageId: number) => {
    setStore(previous => ({
      ...previous,
      messages: previous.messages.map(item =>
        item.id === messageId
          ? {
              ...item,
              reactions: item.reactions.includes('👍 1') ? item.reactions : [...item.reactions, '👍 1'],
            }
          : item
      ),
    }))
  }

  const attachFile = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (file.size > maxChatAttachmentBytes) {
      setAttachmentNotice('This file is too large. Please attach a file up to 5 MB.')
      return
    }

    setAttachmentNotice('')
    setAttachments(previous => previous.includes(file.name) ? previous : [...previous, file.name])
  }

  return (
    <div style={{ fontFamily: font }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>Chat</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Workspace conversations, project updates, and client messages</div>
        </div>
        <button onClick={() => setShowNewChannel(true)} style={primaryButtonStyle}>
          <Plus size={16} /> New Channel
        </button>
      </div>

      <div style={{ height: 'calc(100vh - 176px)', minHeight: '620px', display: 'grid', gridTemplateColumns: showDetails ? '270px minmax(0, 1fr) 280px' : '270px minmax(0, 1fr)', border: '1px solid #e5e7eb', borderRadius: '14px', overflow: 'hidden', background: '#fff' }}>
        <aside style={{ background: '#172033', color: '#e5e7eb', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ padding: '18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>WiseFlow</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>{store.channels.length} active conversations</div>
              </div>
              <ChevronDown size={16} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '9px 10px' }}>
              <Search size={15} color="#94a3b8" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search chats" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: '#fff', fontSize: '13px' }} />
            </div>
          </div>

          <div style={{ padding: '14px 10px', overflowY: 'auto', flex: 1 }}>
            <NavSection title="Channels" onAdd={() => setShowNewChannel(true)} />
            {channels.map(channel => (
              <ChannelRow key={channel.id} channel={channel} active={channel.id === activeChannel.id} onClick={() => selectChannel(channel.id)} />
            ))}

            <div style={{ height: '18px' }} />
            <NavSection title="Direct Messages" />
            {dms.map(channel => (
              <ChannelRow key={channel.id} channel={channel} active={channel.id === activeChannel.id} onClick={() => selectChannel(channel.id)} />
            ))}
          </div>

          {showNewChannel && (
            <div style={{ padding: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: '8px' }}>
              <input value={newChannelName} onChange={event => setNewChannelName(event.target.value)} placeholder="channel-name" style={{ ...inputStyle, background: '#0f172a', borderColor: '#334155', color: '#fff' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={addChannel} style={{ ...smallButtonStyle, background: '#fff', color: '#111827' }}>Create</button>
                <button onClick={() => setShowNewChannel(false)} style={{ ...smallButtonStyle, background: 'transparent', color: '#cbd5e1', border: '1px solid #334155' }}>Cancel</button>
              </div>
            </div>
          )}
        </aside>

        <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
          <header style={{ height: '72px', padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                {activeChannel.type === 'channel' ? <Hash size={18} /> : <span style={{ width: 22, height: 22, borderRadius: '50%', background: avatarColor(activeChannel.name), color: '#fff', display: 'grid', placeItems: 'center', fontSize: '11px' }}>{activeChannel.name.charAt(0)}</span>}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeChannel.name}</span>
                {activeChannel.pinned && <Star size={15} fill="#f59e0b" color="#f59e0b" />}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>{activeChannel.description}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={iconButtonStyle}><Bell size={17} /></button>
              <button onClick={() => setShowDetails(!showDetails)} style={iconButtonStyle}><Info size={17} /></button>
            </div>
          </header>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 20px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 18px' }}>
              <span style={{ border: '1px solid #e5e7eb', borderRadius: '20px', padding: '6px 12px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{channelMessages[0] ? formatDay(channelMessages[0].createdAt) : 'Today'}</span>
            </div>

            {channelMessages.length === 0 ? (
              <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#94a3b8', textAlign: 'center' }}>
                <div>
                  <Hash size={42} />
                  <div style={{ fontSize: '18px', fontWeight: 600, marginTop: '12px' }}>No messages yet</div>
                  <div style={{ fontSize: '13px', marginTop: '6px' }}>Start the conversation in this workspace.</div>
                </div>
              </div>
            ) : (
              channelMessages.map(item => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '38px minmax(0, 1fr)', gap: '12px', padding: '10px 0' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: avatarColor(item.author), color: '#fff', display: 'grid', placeItems: 'center', fontSize: '14px', fontWeight: 600 }}>
                    {item.author.charAt(0)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{item.author}</span>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{item.role}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{formatTime(item.createdAt)}</span>
                    </div>
                    <div style={{ marginTop: '5px', fontSize: '14px', color: '#1f2937', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{item.body}</div>
                    {item.attachments.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                        {item.attachments.map(file => (
                          <span key={file} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '7px 10px', fontSize: '12px', color: '#374151', fontWeight: 600 }}>
                            <Paperclip size={13} /> {file}
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '9px', flexWrap: 'wrap' }}>
                      {item.reactions.map(reaction => (
                        <span key={reaction} style={{ border: '1px solid #e5e7eb', borderRadius: '16px', padding: '3px 8px', fontSize: '12px', background: '#f8fafc' }}>{reaction}</span>
                      ))}
                      <button onClick={() => addReaction(item.id)} style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
                        <Smile size={14} /> React
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '14px 18px', borderTop: '1px solid #e5e7eb', background: '#fff' }}>
            <div style={{ border: '1px solid #dbe2ea', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
              <textarea value={message} onChange={event => setMessage(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage() } }} placeholder={`Message ${activeChannel.type === 'channel' ? '#' : ''}${activeChannel.name}`} rows={3} style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', padding: '12px', fontSize: '14px', color: '#111827' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', padding: '8px 10px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <label style={composerButtonStyle} title="Attach file">
                    <Paperclip size={16} />
                    <input type="file" onChange={event => attachFile(event.target.files)} style={{ display: 'none' }} />
                  </label>
                  <button type="button" style={composerButtonStyle} onClick={() => setEmojiOpen(open => !open)}><Smile size={16} /></button>
                </div>
                <button onClick={sendMessage} disabled={!message.trim() && attachments.length === 0} style={{ ...primaryButtonStyle, padding: '9px 13px', opacity: message.trim() || attachments.length ? 1 : 0.45, cursor: message.trim() || attachments.length ? 'pointer' : 'not-allowed' }}>
                  <Send size={15} /> Send
                </button>
              </div>
              {(attachments.length > 0 || emojiOpen) && (
                <div style={{ borderTop: '1px solid #f1f5f9', padding: '9px 10px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {attachments.map(file => (
                    <button key={file} type="button" onClick={() => setAttachments(previous => previous.filter(item => item !== file))} style={{ border: '1px solid #e5e7eb', background: '#f8fafc', borderRadius: 999, padding: '5px 9px', color: '#334155', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      <Paperclip size={12} /> {file} ×
                    </button>
                  ))}
                  {emojiOpen && ['👍', '✅', '🙏', '🎉', '💚', '⭐'].map(emoji => (
                    <button key={emoji} type="button" onClick={() => { setMessage(previous => `${previous}${emoji}`); setEmojiOpen(false) }} style={{ width: 30, height: 30, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer' }}>{emoji}</button>
                  ))}
                </div>
              )}
              {attachmentNotice && <div style={attachmentNoticeStyle}>{attachmentNotice}</div>}
            </div>
          </div>
        </main>

        {showDetails && (
          <aside style={{ borderLeft: '1px solid #e5e7eb', background: '#f8fafc', padding: '18px', overflowY: 'auto' }}>
            <div style={{ fontSize: '15px', color: '#111827', fontWeight: 600, marginBottom: '14px' }}>Channel Details</div>
            <div style={detailCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                {activeChannel.type === 'channel' ? <Hash size={18} /> : <Users size={18} />}
                <strong>{activeChannel.name}</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.55 }}>{activeChannel.description}</div>
            </div>

            <div style={detailCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#111827', fontWeight: 600, marginBottom: '12px' }}>
                <Users size={16} /> Members
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {activeChannel.members.map(member => (
                  <div key={member} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: avatarColor(member), color: '#fff', display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 600 }}>{member.charAt(0)}</span>
                    <span style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>{member}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={detailCardStyle}>
              <div style={{ fontSize: '13px', color: '#111827', fontWeight: 600, marginBottom: '10px' }}>Latest Activity</div>
              <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.55 }}>
                {latestMessage ? `${latestMessage.author}: ${latestMessage.body}` : 'No activity yet.'}
              </div>
            </div>

            <div style={detailCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#111827', fontWeight: 600 }}>
                <Lock size={15} /> Data
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', lineHeight: 1.5 }}>
                Messages are saved locally in this browser for this prototype.
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

function NavSection({ title, onAdd }: { title: string; onAdd?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 8px', color: '#94a3b8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      <span>{title}</span>
      {onAdd && <button onClick={onAdd} style={{ border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', display: 'inline-flex' }}><Plus size={14} /></button>}
    </div>
  )
}

function ChannelRow({ channel, active, onClick }: { channel: ChatChannel; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: '100%', border: 'none', borderRadius: '8px', background: active ? '#334155' : 'transparent', color: active ? '#fff' : '#cbd5e1', display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr) auto', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer', textAlign: 'left', marginBottom: '2px' }}>
      {channel.type === 'channel' ? <Hash size={15} /> : <span style={{ width: 16, height: 16, borderRadius: '50%', background: avatarColor(channel.name), display: 'block' }} />}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '14px', fontWeight: active ? 900 : 700 }}>{channel.name}</span>
      {channel.unread > 0 && <span style={{ minWidth: '20px', height: '20px', borderRadius: '10px', background: '#ef4444', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 600 }}>{channel.unread}</span>}
    </button>
  )
}

const primaryButtonStyle = {
  border: 'none',
  borderRadius: '9px',
  background: '#111827',
  color: '#fff',
  padding: '10px 14px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
}

const smallButtonStyle = {
  border: 'none',
  borderRadius: '8px',
  padding: '8px 10px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
}

const inputStyle = {
  width: '100%',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '9px 10px',
  outline: 'none',
  fontSize: '13px',
}

const iconButtonStyle = {
  width: '36px',
  height: '36px',
  border: '1px solid #e5e7eb',
  borderRadius: '9px',
  background: '#fff',
  color: '#334155',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}

const composerButtonStyle = {
  width: '32px',
  height: '32px',
  border: 'none',
  borderRadius: '8px',
  background: '#f8fafc',
  color: '#475569',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}

const attachmentNoticeStyle = {
  borderTop: '1px solid #f1f5f9',
  padding: '9px 10px',
  color: '#92400e',
  background: '#fffbeb',
  fontSize: '12px',
  fontWeight: 800,
}

const detailCardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '14px',
  marginBottom: '12px',
}
