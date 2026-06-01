'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Image as ImageIcon,
  MessageCircle,
  Mic,
  Minus,
  Phone,
  Search,
  Send,
  Smile,
  ThumbsUp,
  Video,
  X,
} from 'lucide-react'
import { uploadFileObject } from '@/lib/uploads/client'

type Employee = {
  id: string
  employeeId?: string
  firstName?: string
  lastName?: string
  email?: string
  photo?: string
  jobTitle?: string
  department?: string
  employmentStatus?: string
}

type StoredAccount = {
  fullName?: string
  name?: string
  email?: string
  role?: string
}

type ChatChannel = {
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

type RichPayload = {
  type: 'text' | 'photo' | 'voice' | 'gif' | 'sticker' | 'emoji' | 'system'
  url?: string
  name?: string
  label?: string
  duration?: string
}

type ChatMessage = {
  id: number
  channelId: string
  author: string
  role: string
  body: string
  createdAt: string
  reactions: string[]
  attachments: string[]
  payload?: RichPayload
}

type ChatStore = {
  channels: ChatChannel[]
  messages: ChatMessage[]
}

const chatStorageKey = 'flowsys-chat'
const chatChangeEvent = 'flowsys-chat-change'
const employeesStorageKey = 'flowsys-hr-employees'
const accountStorageKey = 'flowsys-account'
const sessionStorageKey = 'flowsys-auth-session'

const emptyStore: ChatStore = { channels: [], messages: [] }
const maxStoredMessages = 120
const maxChatImageBytes = 2 * 1024 * 1024
const maxVoiceNoteBytes = 1024 * 1024
const emojis = ['😀', '😄', '😂', '😊', '😍', '🥳', '😎', '😅', '🙂', '👏', '🙏', '👍', '🔥', '✅', '💚', '⭐']
const stickers = ['Great work', 'Approved', 'On it', 'Thank you', 'Welcome', 'Done']
const gifs = ['Celebration', 'Good job', 'Thumbs up', 'Teamwork']
function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveStore(store: ChatStore, notify = true) {
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
  if (notify) window.setTimeout(() => window.dispatchEvent(new Event(chatChangeEvent)), 0)
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

function fullName(employee?: Employee) {
  return [employee?.firstName, employee?.lastName].filter(Boolean).join(' ').trim()
}

function initials(name?: string) {
  const clean = name?.trim() || 'User'
  return clean.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase()
}

function nextMessageId(messages: ChatMessage[]) {
  return messages.reduce((max, message) => Math.max(max, Number(message.id) || 0), 0) + 1
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
}

function channelIdFor(employee: Employee) {
  return `hr-dm-${employee.id}`
}

function createChannel(employee: Employee): ChatChannel {
  const name = fullName(employee) || employee.email || 'Employee'
  return {
    id: channelIdFor(employee),
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

function parseAccount(): StoredAccount {
  return {
    ...loadStored<StoredAccount>(sessionStorageKey, {}),
    ...loadStored<StoredAccount>(accountStorageKey, {}),
  }
}

function isImageData(value?: string) {
  return Boolean(value && (value.startsWith('data:image/') || value.startsWith('/api/uploads') || /^https?:\/\//.test(value)))
}

function isAudioData(value?: string) {
  return Boolean(value && (value.startsWith('data:audio/') || value.startsWith('/api/uploads') || /^https?:\/\//.test(value)))
}

export default function HrMessenger() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [store, setStore] = useState<ChatStore>(emptyStore)
  const [account, setAccount] = useState<StoredAccount>({})
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [chatNotice, setChatNotice] = useState('')
  const [picker, setPicker] = useState<'emoji' | 'gif' | 'sticker' | null>(null)
  const [recording, setRecording] = useState(false)
  const [dismissedEmployeeIds, setDismissedEmployeeIds] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    const load = () => {
      const loadedEmployees = loadStored<Employee[]>(employeesStorageKey, [])
      const nextEmployees = loadedEmployees.filter(employee => employee.id)
      const savedStore = loadStored<ChatStore | null>(chatStorageKey, null)
      const sourceStore: ChatStore = {
        channels: Array.isArray(savedStore?.channels) ? savedStore.channels : [],
        messages: Array.isArray(savedStore?.messages) ? savedStore.messages : [],
      }
      const employeeChannels = nextEmployees.map(createChannel)
      const mergedChannels = [
        ...sourceStore.channels.filter(channel => !channel.id.startsWith('hr-dm-')),
        ...employeeChannels.map(channel => {
          const existing = sourceStore.channels.find(item => item.id === channel.id)
          return existing ? { ...existing, name: channel.name, description: channel.description, employeePhoto: channel.employeePhoto, employeeId: channel.employeeId } : channel
        }),
      ]
      const nextStore = { channels: mergedChannels, messages: sourceStore.messages || [] }

      setEmployees(nextEmployees)
      setAccount(parseAccount())
      setStore(nextStore)
      setActiveEmployeeId(previous => nextEmployees.some(employee => employee.id === previous) ? previous : nextEmployees[0]?.id || '')
      if (sourceStore.channels.length || sourceStore.messages.length || employeeChannels.length) {
        saveStore(nextStore, false)
      }
    }

    load()
    window.addEventListener('storage', load)
    window.addEventListener(chatChangeEvent, load)
    return () => {
      window.removeEventListener('storage', load)
      window.removeEventListener(chatChangeEvent, load)
    }
  }, [])

  useEffect(() => {
    if (!open || minimized) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [open, minimized, activeEmployeeId, store.messages.length])

  const activeEmployee = employees.find(employee => employee.id === activeEmployeeId) || employees[0]
  const activeChannelId = activeEmployee ? channelIdFor(activeEmployee) : ''
  const activeChannel = store.channels.find(channel => channel.id === activeChannelId)
  const activeMessages = store.messages.filter(item => item.channelId === activeChannelId)
  const displayName = account.fullName || account.name || 'HR User'
  const role = account.role || 'HR'

  const visibleEmployees = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return employees
    return employees.filter(employee => {
      const values = [fullName(employee), employee.email, employee.jobTitle, employee.department, employee.employeeId]
      return values.some(value => value?.toLowerCase().includes(query))
    })
  }, [employees, search])

  const recentEmployees = useMemo(() => {
    return [...employees]
      .filter(employee => !dismissedEmployeeIds.includes(employee.id))
      .sort((a, b) => {
        const aLast = store.messages.filter(item => item.channelId === channelIdFor(a)).at(-1)?.createdAt || ''
        const bLast = store.messages.filter(item => item.channelId === channelIdFor(b)).at(-1)?.createdAt || ''
        return bLast.localeCompare(aLast)
      })
      .slice(0, 3)
  }, [dismissedEmployeeIds, employees, store.messages])

  const updateStore = (updater: (previous: ChatStore) => ChatStore) => {
    setStore(previous => {
      const next = updater(previous)
      saveStore(next)
      return next
    })
  }

  const openConversation = (employeeId: string) => {
    setDismissedEmployeeIds(previous => previous.filter(id => id !== employeeId))
    setActiveEmployeeId(employeeId)
    setOpen(true)
    setMinimized(false)
    setPicker(null)
  }

  const dismissConversationPreview = (employeeId: string) => {
    setDismissedEmployeeIds(previous => previous.includes(employeeId) ? previous : [...previous, employeeId])
    if (activeEmployeeId === employeeId && !open) {
      setActiveEmployeeId(employees.find(employee => employee.id !== employeeId)?.id || '')
    }
  }

  const sendPayload = (payload: RichPayload, body: string, attachments: string[] = []) => {
    if (!activeEmployee) return
    setChatNotice('')
    updateStore(previous => ({
      ...previous,
      messages: [
        ...previous.messages,
        {
          id: nextMessageId(previous.messages),
          channelId: activeChannelId,
          author: displayName,
          role,
          body,
          createdAt: new Date().toISOString(),
          reactions: [],
          attachments,
          payload,
        },
      ],
    }))
  }

  const sendText = () => {
    const trimmed = message.trim()
    if (!trimmed) return
    sendPayload({ type: 'text' }, trimmed)
    setMessage('')
  }

  const sendEmoji = (emoji: string) => {
    sendPayload({ type: 'emoji', label: emoji }, emoji)
    setPicker(null)
  }

  const sendGif = (label: string) => {
    sendPayload({ type: 'gif', label }, `[GIF: ${label}]`)
    setPicker(null)
  }

  const sendSticker = (label: string) => {
    sendPayload({ type: 'sticker', label }, `[Sticker: ${label}]`)
    setPicker(null)
  }

  const sendCallNote = (kind: 'voice call' | 'video call') => {
    sendPayload({ type: 'system', label: kind }, `Started a ${kind}`)
  }

  const sendQuickLike = () => {
    sendPayload({ type: 'emoji', label: '👍' }, '👍')
  }

  const sendPhoto = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setChatNotice('Only image files can be sent in chat.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (file.size > maxChatImageBytes) {
      setChatNotice('This image is too large. Please upload an image up to 2 MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    try {
      const uploaded = await uploadFileObject(file, 'chat-media')
      sendPayload({ type: 'photo', url: uploaded.url, name: file.name }, `[Photo: ${file.name}]`, [file.name])
    } catch {
      setChatNotice('Could not upload this photo. Please try again.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
      return
    }
    setRecording(false)
  }

  const startRecording = async () => {
    if (recording) {
      stopRecording()
      return
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      sendPayload({ type: 'voice', label: 'Voice note', duration: '0:05' }, '[Voice note]', ['voice-note.webm'])
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const startedAt = Date.now()
      audioChunksRef.current = []
      mediaRecorderRef.current = recorder
      setRecording(true)

      recorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        if (blob.size > maxVoiceNoteBytes) {
          setChatNotice('This voice note is too large. Please keep voice notes short or send a text message.')
          stream.getTracks().forEach(track => track.stop())
          setRecording(false)
          return
        }
        const file = new File([blob], 'voice-note.webm', { type: blob.type || 'audio/webm' })
        uploadFileObject(file, 'chat-media').then(uploaded => {
          sendPayload({ type: 'voice', url: uploaded.url, name: 'voice-note.webm', duration: `0:${String(durationSeconds).padStart(2, '0')}` }, '[Voice note]', ['voice-note.webm'])
        }).catch(() => {
          setChatNotice('Could not upload this voice note. Please try again.')
        })
        stream.getTracks().forEach(track => track.stop())
        setRecording(false)
      }
      recorder.start()
    } catch {
      setRecording(false)
      sendPayload({ type: 'voice', label: 'Voice note', duration: '0:05' }, '[Voice note]', ['voice-note.webm'])
    }
  }

  return (
    <div className="hr-messenger" aria-label="HR Messenger">
      {!open && (
        <div className="hr-messenger-tray">
          {recentEmployees.slice(0, 2).map(employee => {
            const lastMessage = store.messages.filter(item => item.channelId === channelIdFor(employee)).at(-1)
            return (
              <div key={employee.id} className="hr-messenger-preview-shell">
                <button type="button" className="hr-messenger-preview" onClick={() => openConversation(employee.id)}>
                  <Avatar employee={employee} size={52} />
                  <span className="hr-messenger-preview-text">
                    <strong>{fullName(employee)}</strong>
                    <small>{lastMessage ? `You: ${lastMessage.body.replace(/^\[(.*)\]$/, '$1')}` : 'Start a chat'}</small>
                  </span>
                </button>
                <button
                  type="button"
                  className="hr-messenger-preview-close"
                  aria-label={`Close ${fullName(employee)} chat preview`}
                  onClick={() => dismissConversationPreview(employee.id)}
                >
                  <X size={13} />
                </button>
              </div>
            )
          })}
          <button type="button" className="hr-messenger-compose" aria-label="Compose HR message" onClick={() => setOpen(true)}>
            <MessageCircle size={22} />
          </button>
        </div>
      )}

      {open && (
        <section className={minimized ? 'hr-chat-window is-minimized' : 'hr-chat-window'}>
          <header className="hr-chat-header">
            <button type="button" className="hr-chat-person" onClick={() => setMinimized(false)}>
              {activeEmployee ? <Avatar employee={activeEmployee} size={34} /> : <span className="hr-chat-empty-avatar"><MessageCircle size={18} /></span>}
              <span>
                <strong>{activeEmployee ? fullName(activeEmployee) : 'HR Messenger'}</strong>
                <small>{activeEmployee ? activeEmployee.jobTitle || activeEmployee.department || 'Employee' : 'No employees available'}</small>
              </span>
            </button>
            <div className="hr-chat-header-actions">
              <button type="button" aria-label="Start voice call" onClick={() => sendCallNote('voice call')}><Phone size={16} /></button>
              <button type="button" aria-label="Start video call" onClick={() => sendCallNote('video call')}><Video size={16} /></button>
              <button type="button" aria-label="Minimize chat" onClick={() => setMinimized(true)}><Minus size={16} /></button>
              <button type="button" aria-label="Close chat" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
          </header>

          {!minimized && (
            <>
              <div className="hr-chat-body">
                <aside className="hr-chat-people">
                  <label className="hr-chat-search">
                    <Search size={14} />
                    <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search employees" />
                  </label>
                  <div className="hr-chat-people-list">
                    {visibleEmployees.length === 0 ? (
                      <div className="hr-chat-empty-list">No employees found</div>
                    ) : visibleEmployees.map(employee => (
                      <button key={employee.id} type="button" className={employee.id === activeEmployee?.id ? 'is-active' : ''} onClick={() => openConversation(employee.id)}>
                        <Avatar employee={employee} size={34} />
                        <span>
                          <strong>{fullName(employee)}</strong>
                          <small>{employee.jobTitle || employee.department || 'Employee'}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </aside>

                <main className="hr-chat-thread">
                  {!activeEmployee ? (
                    <div className="hr-chat-empty">
                      <span className="hr-chat-empty-large"><MessageCircle size={28} /></span>
                      <strong>No employees yet</strong>
                      <span>Add employees in HR first, then they will appear here for chat.</span>
                    </div>
                  ) : activeMessages.length === 0 ? (
                    <div className="hr-chat-empty">
                      <Avatar employee={activeEmployee} size={62} />
                      <strong>{fullName(activeEmployee)}</strong>
                      <span>{activeChannel?.description || 'Start a direct HR conversation.'}</span>
                    </div>
                  ) : (
                    activeMessages.map(item => <MessageBubble key={item.id} message={item} own={item.author === displayName} />)
                  )}
                  <div ref={messagesEndRef} />
                </main>
              </div>

              {activeEmployee && <div className="hr-chat-composer-wrap">
                {chatNotice && <div className="hr-chat-upload-notice">{chatNotice}</div>}
                {picker && (
                  <Picker
                    type={picker}
                    onEmoji={sendEmoji}
                    onGif={sendGif}
                    onSticker={sendSticker}
                    onClose={() => setPicker(null)}
                  />
                )}

                <div className="hr-chat-composer">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={event => sendPhoto(event.target.files)} style={{ display: 'none' }} />
                  <button type="button" title="Voice note" className={recording ? 'is-recording' : ''} onClick={startRecording}><Mic size={18} /></button>
                  <button type="button" title="Photo" onClick={() => fileInputRef.current?.click()}><ImageIcon size={18} /></button>
                  <button type="button" title="Sticker" onClick={() => setPicker(picker === 'sticker' ? null : 'sticker')}><MessageCircle size={18} /></button>
                  <button type="button" title="GIF" className="hr-chat-gif" onClick={() => setPicker(picker === 'gif' ? null : 'gif')}>GIF</button>
                  <input
                    value={message}
                    onChange={event => setMessage(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        sendText()
                      }
                    }}
                    placeholder={recording ? 'Recording voice note...' : 'Aa'}
                  />
                  <button type="button" title="Emoji" onClick={() => setPicker(picker === 'emoji' ? null : 'emoji')}><Smile size={19} /></button>
                  {message.trim() ? (
                    <button type="button" title="Send" onClick={sendText}><Send size={18} /></button>
                  ) : (
                    <button type="button" title="Quick like" onClick={sendQuickLike}><ThumbsUp size={19} /></button>
                  )}
                </div>
              </div>}
            </>
          )}
        </section>
      )}
    </div>
  )
}

function Avatar({ employee, size }: { employee: Employee; size: number }) {
  const name = fullName(employee) || employee.email || 'Employee'
  return (
    <span className="hr-chat-avatar" style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size / 3.1)) }}>
      {employee.photo ? <span style={{ backgroundImage: `url(${employee.photo})` }} /> : initials(name)}
    </span>
  )
}

function MessageBubble({ message, own }: { message: ChatMessage; own: boolean }) {
  const payload = message.payload

  return (
    <div className={own ? 'hr-chat-message is-own' : 'hr-chat-message'}>
      {!own && <div className="hr-chat-message-author">{message.author}</div>}
      <div className="hr-chat-bubble">
        {payload?.type === 'photo' && isImageData(payload.url) && (
          <span
            role="img"
            aria-label={payload.name || 'Shared photo'}
            className="hr-chat-photo-message"
            style={{ backgroundImage: `url(${payload.url})` }}
          />
        )}
        {payload?.type === 'voice' && isAudioData(payload.url) && <audio controls src={payload.url} />}
        {payload?.type === 'voice' && !isAudioData(payload.url) && (
          <div className="hr-chat-voice"><Mic size={16} /> Voice note {payload.duration || '0:05'}</div>
        )}
        {payload?.type === 'gif' && <div className="hr-chat-gif-card"><span>{payload.label}</span><small>GIF</small></div>}
        {payload?.type === 'sticker' && <div className="hr-chat-sticker">{payload.label}</div>}
        {payload?.type !== 'photo' && payload?.type !== 'voice' && payload?.type !== 'gif' && payload?.type !== 'sticker' && message.body}
        {!payload && message.body}
      </div>
      <time>{formatTime(message.createdAt)}</time>
    </div>
  )
}

function Picker({
  type,
  onEmoji,
  onGif,
  onSticker,
  onClose,
}: {
  type: 'emoji' | 'gif' | 'sticker'
  onEmoji: (emoji: string) => void
  onGif: (label: string) => void
  onSticker: (label: string) => void
  onClose: () => void
}) {
  return (
    <div className="hr-chat-picker">
      <div className="hr-chat-picker-head">
        <strong>{type === 'emoji' ? 'Emoji' : type === 'gif' ? 'GIFs' : 'Stickers'}</strong>
        <button type="button" onClick={onClose}><X size={14} /></button>
      </div>
      {type === 'emoji' && (
        <div className="hr-chat-emoji-grid">
          {emojis.map(emoji => <button key={emoji} type="button" onClick={() => onEmoji(emoji)}>{emoji}</button>)}
        </div>
      )}
      {type === 'gif' && (
        <div className="hr-chat-media-grid">
          {gifs.map(gif => <button key={gif} type="button" onClick={() => onGif(gif)}><span>{gif}</span><small>GIF</small></button>)}
        </div>
      )}
      {type === 'sticker' && (
        <div className="hr-chat-media-grid">
          {stickers.map(sticker => <button key={sticker} type="button" onClick={() => onSticker(sticker)}><span>{sticker}</span><small>Sticker</small></button>)}
        </div>
      )}
    </div>
  )
}
