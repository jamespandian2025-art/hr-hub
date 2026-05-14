'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type KeyboardEvent, type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  Download,
  Eye,
  File,
  FileText,
  Filter,
  Folder,
  Grid2X2,
  List,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'

type HRDocument = {
  id: string
  employeeId?: string
  uploadedById?: string
  uploadedByEmail?: string
  sharedByName?: string
  sharedAt?: string
  sharedWithIds?: string[]
  sharedWithEmails?: string[]
  sharedWithNames?: string[]
  expiresAt?: string
  permission?: string
  lastOpenedAt?: string
  lastOpenedById?: string
  lastOpenedByEmail?: string
  lastOpenedByName?: string
  deletedById?: string
  deletedByEmail?: string
  deletedByName?: string
  name: string
  type?: string
  mimeType?: string
  size?: string
  sizeBytes?: number
  dataUrl?: string
  category?: string
  uploadedByName?: string
  uploadedAt?: string
  status?: string
  folderId?: string
  shared?: boolean
  deletedAt?: string
}

type HRFolder = {
  id: string
  name: string
  createdAt: string
}

type DocumentTab = 'folders' | 'all' | 'mine' | 'shared' | 'recent' | 'trash'

type StoredAccount = {
  userId?: string
  email?: string
  fullName?: string
  name?: string
  role?: string
}

const font = "var(--font-body)"
const documentsKey = 'flowsys-hr-documents'
const deletedDocumentsKey = 'flowsys-hr-deleted-documents'
const foldersKey = 'flowsys-hr-document-folders'
const accountKey = 'flowsys-account'
const sessionKey = 'flowsys-auth-session'

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveStored<T>(key: string, value: T) {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value))
}

function parseStoredAccount(value: string | null): StoredAccount {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed as StoredAccount : {}
  } catch {
    return {}
  }
}

function fileExtension(name: string) {
  return name.includes('.') ? name.split('.').pop()?.toUpperCase() || 'File' : 'File'
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatDate(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysInTrash(value?: string) {
  if (!value) return 0
  const deletedTime = new Date(value).getTime()
  if (Number.isNaN(deletedTime)) return 0
  return Math.max(0, Math.floor((Date.now() - deletedTime) / (1000 * 60 * 60 * 24)))
}

function documentType(doc: HRDocument) {
  return (doc.type || fileExtension(doc.name)).replace('.', '').toUpperCase()
}

function isImageDocument(doc: HRDocument) {
  return Boolean(doc.dataUrl && (doc.mimeType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(doc.name)))
}

function typeTone(type: string) {
  const normalized = type.toLowerCase()
  if (normalized.includes('pdf')) return { bg: '#fee2e2', text: '#dc2626' }
  if (normalized.includes('xls') || normalized.includes('excel')) return { bg: '#dcfce7', text: '#15803d' }
  if (normalized.includes('doc') || normalized.includes('word')) return { bg: '#dbeafe', text: '#1d4ed8' }
  return { bg: '#f1f5f9', text: '#475569' }
}

export default function HrDocumentsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderFileInputRef = useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = useState<HRDocument[]>([])
  const [deletedDocuments, setDeletedDocuments] = useState<HRDocument[]>([])
  const [folders, setFolders] = useState<HRFolder[]>([])
  const [activeTab, setActiveTab] = useState<DocumentTab>('folders')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [uploaderFilter, setUploaderFilter] = useState('All')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [account, setAccount] = useState<StoredAccount>({})

  useEffect(() => {
    const load = () => {
      const storedDocs = loadStored<HRDocument[]>(documentsKey, [])
      setDocuments(storedDocs.filter(doc => Boolean(doc.dataUrl) && !doc.deletedAt))
      setDeletedDocuments(loadStored<HRDocument[]>(deletedDocumentsKey, []))
      setFolders(loadStored<HRFolder[]>(foldersKey, []))
      setAccount({
        ...parseStoredAccount(window.localStorage.getItem(sessionKey)),
        ...parseStoredAccount(window.localStorage.getItem(accountKey)),
      })
    }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [])

  const currentUserName = account.fullName || account.name || ''
  const currentUserEmail = account.email || ''
  const currentUserId = account.userId || ''

  const isMine = (doc: HRDocument) => {
    const byId = Boolean(currentUserId && doc.uploadedById === currentUserId)
    const byEmail = Boolean(currentUserEmail && doc.uploadedByEmail === currentUserEmail)
    const byName = Boolean(currentUserName && doc.uploadedByName === currentUserName)
    return byId || byEmail || byName
  }

  const isSharedWithMe = (doc: HRDocument) => {
    const byId = Boolean(currentUserId && doc.sharedWithIds?.includes(currentUserId))
    const byEmail = Boolean(currentUserEmail && doc.sharedWithEmails?.includes(currentUserEmail))
    const byName = Boolean(currentUserName && doc.sharedWithNames?.includes(currentUserName))
    return Boolean(doc.shared && (byId || byEmail || byName))
  }

  const sharedWithMeDocuments = documents.filter(isSharedWithMe)
  const selectedFolder = folders.find(folder => folder.id === selectedFolderId) || null

  const visibleBase = activeTab === 'trash'
    ? deletedDocuments
    : documents.filter(doc => {
      if (activeTab === 'folders') return selectedFolder ? doc.folderId === selectedFolder.id : false
      if (activeTab === 'mine') return isMine(doc)
      if (activeTab === 'shared') return isSharedWithMe(doc)
      if (activeTab === 'recent') return Boolean(doc.lastOpenedAt)
      return true
    })

  const filterOptions = useMemo(() => {
    const types = Array.from(new Set(documents.map(doc => documentType(doc)).filter(Boolean)))
    const categories = Array.from(new Set(documents.map(doc => doc.category || 'Uncategorized')))
    const uploaders = Array.from(new Set(documents.map(doc => doc.uploadedByName || '-')))
    return {
      types: ['All', ...types],
      categories: ['All', ...categories],
      uploaders: ['All', ...uploaders],
    }
  }, [documents])

  const filteredDocuments = visibleBase.filter(doc => {
    const type = documentType(doc)
    const category = doc.category || 'Uncategorized'
    const uploader = doc.uploadedByName || '-'
    const matchesType = typeFilter === 'All' || type === typeFilter
    const matchesCategory = categoryFilter === 'All' || category === categoryFilter
    const matchesUploader = uploaderFilter === 'All' || uploader === uploaderFilter
    const matchesSearch = [doc.name, type, category, uploader, doc.size, doc.status]
      .some(value => String(value || '').toLowerCase().includes(query.trim().toLowerCase()))
    return matchesType && matchesCategory && matchesUploader && matchesSearch
  }).sort((first, second) => {
    if (activeTab !== 'recent') return 0
    return new Date(second.lastOpenedAt || 0).getTime() - new Date(first.lastOpenedAt || 0).getTime()
  })

  const filteredFolders = folders.filter(folder => folder.name.toLowerCase().includes(query.trim().toLowerCase()))

  const storageUsed = documents.reduce((sum, doc) => sum + Number(doc.sizeBytes || 0), 0)

  function openDocument(doc: HRDocument) {
    router.push(`/hr/documents/${encodeURIComponent(doc.id)}`)
  }

  function openDocumentWithKeyboard(event: KeyboardEvent, doc: HRDocument) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openDocument(doc)
    }
  }

  async function uploadDocuments(files?: FileList | null, targetFolder?: HRFolder | null) {
    setUploadError('')
    if (!files?.length) return

    const next: HRDocument[] = []
    for (const file of Array.from(files)) {
      if (file.size > 1024 * 1024) {
        setUploadError('Each document must be 1MB or smaller while using local browser storage.')
        continue
      }
      try {
        next.push({
          id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: fileExtension(file.name),
          mimeType: file.type || 'application/octet-stream',
          size: formatFileSize(file.size),
          sizeBytes: file.size,
          dataUrl: await readFileAsDataUrl(file),
          category: targetFolder?.name || 'Uncategorized',
          uploadedById: currentUserId || undefined,
          uploadedByEmail: currentUserEmail || undefined,
          uploadedByName: currentUserName || undefined,
          uploadedAt: new Date().toISOString(),
          status: 'Active',
          folderId: targetFolder?.id,
        })
      } catch {
        setUploadError(`Could not upload ${file.name}. Please try again.`)
      }
    }

    if (next.length) {
      const storedDocs = loadStored<HRDocument[]>(documentsKey, [])
      const updated = [...next, ...storedDocs]
      saveStored(documentsKey, updated)
      setDocuments(updated.filter(doc => Boolean(doc.dataUrl) && !doc.deletedAt))
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (folderFileInputRef.current) folderFileInputRef.current.value = ''
  }

  function createFolder() {
    const name = folderName.trim()
    if (!name) return
    const created = { id: `folder_${Date.now()}`, name, createdAt: new Date().toISOString() }
    const next = [created, ...folders]
    setFolders(next)
    saveStored(foldersKey, next)
    setSelectedFolderId(created.id)
    setFolderName('')
    setFolderModalOpen(false)
  }

  function handleFolderDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDraggingFiles(false)
    if (!selectedFolder) {
      setUploadError('Choose a folder before uploading files into it.')
      return
    }
    uploadDocuments(event.dataTransfer.files, selectedFolder)
  }

  function downloadDocument(doc: HRDocument) {
    if (!doc.dataUrl) return
    const link = document.createElement('a')
    link.href = doc.dataUrl
    link.download = doc.name
    link.click()
  }

  function moveToTrash(doc: HRDocument) {
    const active = documents.filter(item => item.id !== doc.id)
    const trashed = [{
      ...doc,
      deletedAt: new Date().toISOString(),
      deletedById: currentUserId || undefined,
      deletedByEmail: currentUserEmail || undefined,
      deletedByName: currentUserName || undefined,
      status: 'Deleted',
    }, ...deletedDocuments]
    setDocuments(active)
    setDeletedDocuments(trashed)
    saveStored(documentsKey, loadStored<HRDocument[]>(documentsKey, []).filter(item => item.id !== doc.id))
    saveStored(deletedDocumentsKey, trashed)
  }

  function restoreDocument(doc: HRDocument) {
    const restored = { ...doc, deletedAt: undefined }
    const active = [restored, ...documents]
    const trash = deletedDocuments.filter(item => item.id !== doc.id)
    setDocuments(active)
    setDeletedDocuments(trash)
    saveStored(documentsKey, [restored, ...loadStored<HRDocument[]>(documentsKey, [])])
    saveStored(deletedDocumentsKey, trash)
  }

  function deleteForever(id: string) {
    const trash = deletedDocuments.filter(doc => doc.id !== id)
    setDeletedDocuments(trash)
    saveStored(deletedDocumentsKey, trash)
  }

  function emptyTrash() {
    setDeletedDocuments([])
    saveStored<HRDocument[]>(deletedDocumentsKey, [])
  }

  return (
    <section className="hr-module-page" style={{ fontFamily: font }}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>Documents</h1>
          <p style={pageSubtitleStyle}>Manage and organize HR related documents.</p>
        </div>
        <div style={toolbarStyle}>
          <SearchBox value={query} onChange={setQuery} placeholder="Search documents..." />
          <input ref={fileInputRef} type="file" multiple hidden onChange={event => uploadDocuments(event.target.files)} />
          <input ref={folderFileInputRef} type="file" multiple hidden onChange={event => uploadDocuments(event.target.files, selectedFolder)} />
          <button style={secondaryButtonStyle} onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Upload Document</button>
          <button style={primaryButtonStyle} onClick={() => setFolderModalOpen(true)}><Plus size={15} /> New Folder</button>
        </div>
      </div>

      {uploadError && <div style={errorStyle}>{uploadError}</div>}

      <div style={metricGridStyle}>
        <Metric icon={FileText} label="Total Documents" value={documents.length} sub="Uploaded files" color="#16a34a" bg="#dcfce7" />
        <Metric icon={Folder} label="Folders" value={folders.length} sub="Created folders" color="#2563eb" bg="#dbeafe" />
        <Metric icon={Users} label="Shared Documents" value={sharedWithMeDocuments.length} sub="Shared with you" color="#7c3aed" bg="#ede9fe" />
        <Metric icon={File} label="Storage Used" value={formatFileSize(storageUsed)} sub="Local browser storage" color="#d97706" bg="#fef3c7" />
        <Metric icon={Trash2} label="Trash" value={deletedDocuments.length} sub={deletedDocuments.length ? 'Empty trash' : 'Deleted documents'} color="#ca8a04" bg="#fef9c3" />
      </div>

      <div style={tabsStyle}>
        {[
          ['folders', 'Folders'],
          ['all', 'All Documents'],
          ['mine', 'My Documents'],
          ['shared', 'Shared With Me'],
          ['recent', 'Recent'],
          ['trash', 'Trash'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key as DocumentTab)} style={tabStyle(activeTab === key)}>{label}</button>
        ))}
      </div>

      <div style={cardStyle}>
        {activeTab === 'folders' ? (
          <div style={folderWorkspaceStyle}>
            <div style={folderPanelStyle}>
              <div style={folderPanelHeaderStyle}>
                <div>
                  <h2 style={sectionTitleStyle}>Folders</h2>
                  <p style={sectionHintStyle}>Create folders, open one, then upload files into it.</p>
                </div>
                <button style={primaryButtonStyle} onClick={() => setFolderModalOpen(true)}><Plus size={15} /> New Folder</button>
              </div>
              <SearchBox value={query} onChange={setQuery} placeholder="Search folders..." compact />
              <div style={folderListStyle}>
                {filteredFolders.map(folder => {
                  const folderCount = documents.filter(doc => doc.folderId === folder.id).length
                  const active = selectedFolderId === folder.id
                  return (
                    <button key={folder.id} onClick={() => setSelectedFolderId(folder.id)} style={folderTileStyle(active)}>
                      <span style={folderIconStyle}><Folder size={20} /></span>
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</strong>
                        <small style={{ color: '#64748b' }}>{folderCount} files</small>
                      </span>
                    </button>
                  )
                })}
              </div>
              {filteredFolders.length === 0 && (
                <div style={emptyStateStyle}>
                  <Folder size={34} color="#94a3b8" />
                  <strong>No folders yet.</strong>
                  <span>Create a folder first, then upload HR documents inside it.</span>
                </div>
              )}
            </div>

            <div style={folderContentStyle}>
              <div style={folderPanelHeaderStyle}>
                <div>
                  <h2 style={sectionTitleStyle}>{selectedFolder?.name || 'Select a folder'}</h2>
                  <p style={sectionHintStyle}>{selectedFolder ? 'Drag files here or upload manually into this folder.' : 'Choose a folder from the left to manage its files.'}</p>
                </div>
                <button style={secondaryButtonStyle} disabled={!selectedFolder} onClick={() => folderFileInputRef.current?.click()}><Upload size={15} /> Upload Files</button>
              </div>

              <div
                style={dropZoneStyle(Boolean(selectedFolder), isDraggingFiles)}
                onDragOver={event => {
                  event.preventDefault()
                  setIsDraggingFiles(true)
                }}
                onDragLeave={() => setIsDraggingFiles(false)}
                onDrop={handleFolderDrop}
              >
                <Upload size={24} color={selectedFolder ? '#16a34a' : '#94a3b8'} />
                <strong>{selectedFolder ? 'Drop files to upload' : 'No folder selected'}</strong>
                <span>{selectedFolder ? 'You can also use the Upload Files button.' : 'Select or create a folder before uploading files.'}</span>
              </div>

              {selectedFolder && (
                <>
                  <div style={{ marginTop: 18, overflowX: 'auto' }}>
                    <table style={{ ...tableStyle, minWidth: 780 }}>
                      <thead>
                        <tr>
                          <Th>Name</Th>
                          <Th>Type</Th>
                          <Th>Uploaded By</Th>
                          <Th>Uploaded On</Th>
                          <Th>Size</Th>
                          <Th>Actions</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDocuments.map(doc => (
                          <tr key={doc.id} style={trStyle}>
                            <Td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <DocumentThumb doc={doc} />
                                <span>
                                  <strong style={{ display: 'block', color: '#0f172a' }}>{doc.name}</strong>
                                  <small style={{ color: '#64748b' }}>{doc.mimeType || 'Document'}</small>
                                </span>
                              </div>
                            </Td>
                            <Td><TypeBadge type={documentType(doc)} /></Td>
                            <Td>{doc.uploadedByName || '-'}</Td>
                            <Td>{formatDate(doc.uploadedAt)}</Td>
                            <Td>{doc.size || '-'}</Td>
                            <Td>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <IconLink href={`/hr/documents/${encodeURIComponent(doc.id)}`} icon={Eye} label={`View ${doc.name}`} />
                                <IconButton onClick={() => downloadDocument(doc)} icon={Download} />
                                <IconButton onClick={() => moveToTrash(doc)} icon={Trash2} />
                              </div>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredDocuments.length === 0 && (
                    <div style={emptyStateStyle}>
                      <FileText size={34} color="#94a3b8" />
                      <strong>This folder is empty.</strong>
                      <span>Drag and drop files here or upload manually.</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <>
        <div style={filterBarStyle}>
          <SearchBox value={query} onChange={setQuery} placeholder={activeTab === 'mine' ? 'Search my documents...' : activeTab === 'shared' ? 'Search shared documents...' : activeTab === 'recent' ? 'Search recent documents...' : activeTab === 'trash' ? 'Search trashed documents...' : 'Search documents by name, type, or tags...'} compact />
          <SelectFilter value={typeFilter} onChange={setTypeFilter} options={filterOptions.types} />
          <SelectFilter value={categoryFilter} onChange={setCategoryFilter} options={filterOptions.categories} />
          <SelectFilter value={uploaderFilter} onChange={setUploaderFilter} options={filterOptions.uploaders} />
          <button style={secondaryButtonStyle}><CalendarDays size={15} /> Date Range</button>
          <button style={secondaryButtonStyle}><Filter size={15} /> Filters</button>
          <div style={viewToggleStyle}>
            <button onClick={() => setViewMode('list')} style={viewButtonStyle(viewMode === 'list')} aria-label="List view"><List size={16} /></button>
            <button onClick={() => setViewMode('grid')} style={viewButtonStyle(viewMode === 'grid')} aria-label="Grid view"><Grid2X2 size={16} /></button>
          </div>
        </div>

        {activeTab === 'trash' && deletedDocuments.length > 0 && (
          <div style={trashNoticeStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Trash2 size={20} color="#d97706" />
              <span>
                <strong style={{ display: 'block', color: '#0f172a' }}>Items in trash are deleted permanently when you choose Delete forever.</strong>
                <small style={{ color: '#64748b' }}>You can restore documents before permanent deletion.</small>
              </span>
            </div>
            <button style={dangerButtonStyle} onClick={emptyTrash}>Empty Trash</button>
          </div>
        )}

        {viewMode === 'list' ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <Th><input type="checkbox" aria-label="Select all documents" /></Th>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Category</Th>
                  <Th>{activeTab === 'trash' ? 'Deleted By' : activeTab === 'shared' ? 'Shared By' : activeTab === 'recent' ? 'Opened By' : 'Uploaded By'}</Th>
                  <Th>{activeTab === 'trash' ? 'Date Deleted' : activeTab === 'shared' ? 'Shared On' : activeTab === 'recent' ? 'Last Opened' : 'Uploaded On'}</Th>
                  <Th>{activeTab === 'trash' ? 'Original Location' : activeTab === 'shared' ? 'Expires On' : activeTab === 'recent' ? 'Location' : 'Size'}</Th>
                  <Th>{activeTab === 'trash' ? 'Days In Trash' : activeTab === 'shared' ? 'Permission' : activeTab === 'recent' ? 'Access Type' : 'Status'}</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map(doc => {
                  const canOpenDocument = activeTab !== 'trash'
                  return (
                  <tr
                    key={doc.id}
                    style={canOpenDocument ? clickableTrStyle : trStyle}
                    onClick={canOpenDocument ? () => openDocument(doc) : undefined}
                    onKeyDown={canOpenDocument ? event => openDocumentWithKeyboard(event, doc) : undefined}
                    tabIndex={canOpenDocument ? 0 : undefined}
                    role={canOpenDocument ? 'link' : undefined}
                    title={canOpenDocument ? `Open ${doc.name}` : undefined}
                  >
                    <Td><input type="checkbox" aria-label={`Select ${doc.name}`} onClick={event => event.stopPropagation()} /></Td>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <DocumentThumb doc={doc} />
                        <span>
                          <strong style={{ display: 'block', color: '#0f172a' }}>{doc.name}</strong>
                          <small style={{ color: '#64748b' }}>{doc.mimeType || 'Document'}</small>
                        </span>
                      </div>
                    </Td>
                    <Td><TypeBadge type={documentType(doc)} /></Td>
                    <Td><Badge value={doc.category || 'Uncategorized'} /></Td>
                    <Td>{activeTab === 'trash' ? doc.deletedByName || '-' : activeTab === 'shared' ? doc.sharedByName || doc.uploadedByName || '-' : activeTab === 'recent' ? doc.lastOpenedByName || '-' : doc.uploadedByName || '-'}</Td>
                    <Td>{formatDate(activeTab === 'trash' ? doc.deletedAt : activeTab === 'shared' ? doc.sharedAt : activeTab === 'recent' ? doc.lastOpenedAt : doc.uploadedAt)}</Td>
                    <Td>{activeTab === 'trash' ? doc.category || 'All Documents' : activeTab === 'shared' ? formatDate(doc.expiresAt) : activeTab === 'recent' ? doc.category || 'All Documents' : doc.size || '-'}</Td>
                    <Td>{activeTab === 'trash' ? <Badge value={`${daysInTrash(doc.deletedAt)} days`} red /> : <Badge value={activeTab === 'shared' ? doc.permission || 'View Only' : activeTab === 'recent' ? 'Opened' : doc.status || 'Active'} green />}</Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 8 }} onClick={event => event.stopPropagation()}>
                        {activeTab === 'trash' ? (
                          <>
                            <button style={smallButtonStyle} onClick={() => restoreDocument(doc)}>Restore</button>
                            <button style={dangerButtonStyle} onClick={() => deleteForever(doc.id)}>Delete forever</button>
                          </>
                        ) : (
                          <>
                            <IconLink href={`/hr/documents/${encodeURIComponent(doc.id)}`} icon={Eye} label={`View ${doc.name}`} />
                            <IconButton onClick={() => downloadDocument(doc)} icon={Download} />
                            <IconButton onClick={() => moveToTrash(doc)} icon={Trash2} />
                            <IconButton onClick={() => undefined} icon={MoreVertical} />
                          </>
                        )}
                      </div>
                    </Td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={gridStyle}>
            {filteredDocuments.map(doc => (
              <article
                key={doc.id}
                style={activeTab === 'trash' ? documentCardStyle : clickableDocumentCardStyle}
                onClick={activeTab === 'trash' ? undefined : () => openDocument(doc)}
                onKeyDown={activeTab === 'trash' ? undefined : event => openDocumentWithKeyboard(event, doc)}
                tabIndex={activeTab === 'trash' ? undefined : 0}
                role={activeTab === 'trash' ? undefined : 'link'}
                title={activeTab === 'trash' ? undefined : `Open ${doc.name}`}
              >
                <div style={documentCardHeaderStyle}>
                  <span style={documentCardTypeIconStyle}><File size={14} /></span>
                  <strong style={{ color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</strong>
                  <button style={documentCardMenuStyle} aria-label={`More actions for ${doc.name}`} onClick={event => event.stopPropagation()}><MoreVertical size={16} /></button>
                </div>
                <div style={documentPreviewStyle(doc)}>
                  {!isImageDocument(doc) && <DocumentIcon type={documentType(doc)} large />}
                </div>
                <span style={{ color: '#64748b', fontSize: 12 }}>{doc.size || '-'} - {formatDate(doc.uploadedAt)}</span>
                <div style={{ display: 'flex', gap: 8 }} onClick={event => event.stopPropagation()}>
                  <IconLink href={`/hr/documents/${encodeURIComponent(doc.id)}`} icon={Eye} label={`View ${doc.name}`} />
                  <IconButton onClick={() => downloadDocument(doc)} icon={Download} />
                  <IconButton onClick={() => moveToTrash(doc)} icon={Trash2} />
                </div>
              </article>
            ))}
          </div>
        )}

        {filteredDocuments.length === 0 && (
          <div style={emptyStateStyle}>
            <FileText size={34} color="#94a3b8" />
            <strong>{emptyStateCopy(activeTab).title}</strong>
            <span>{emptyStateCopy(activeTab).text}</span>
          </div>
        )}
          </>
        )}
      </div>

      {folderModalOpen && (
        <div style={modalOverlayStyle} role="dialog" aria-modal="true" aria-label="Create new folder">
          <div style={modalCardStyle}>
            <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>New Folder</h2>
            <p style={{ margin: '6px 0 16px', fontSize: 13, color: '#64748b' }}>Create a folder to organize uploaded HR documents.</p>
            <label style={fieldStyle}>
              <span style={labelStyle}>Folder name</span>
              <input value={folderName} onChange={event => setFolderName(event.target.value)} placeholder="Enter folder name" style={inputBoxStyle} />
            </label>
            <div style={modalFooterStyle}>
              <button style={secondaryButtonStyle} onClick={() => setFolderModalOpen(false)}>Cancel</button>
              <button style={primaryButtonStyle} onClick={createFolder}>Create Folder</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function emptyStateCopy(tab: DocumentTab) {
  if (tab === 'mine') return { title: 'No personal documents yet.', text: 'Documents you upload will appear here.' }
  if (tab === 'shared') return { title: 'No shared documents yet.', text: 'Documents shared with HR will appear here.' }
  if (tab === 'recent') return { title: 'No recently opened documents.', text: 'Documents you open from the library will appear here.' }
  if (tab === 'trash') return { title: 'Trash is empty.', text: 'Deleted documents will appear here before permanent removal.' }
  return { title: 'No documents uploaded yet.', text: 'Upload HR documents to start building your document library.' }
}

function SearchBox({ value, onChange, placeholder, compact }: { value: string; onChange: (value: string) => void; placeholder: string; compact?: boolean }) {
  return (
    <label style={{ ...searchBoxStyle, minWidth: compact ? 320 : 360 }}>
      <Search size={15} color="#94a3b8" />
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} style={plainInputStyle} />
    </label>
  )
}

function SelectFilter({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={event => onChange(event.target.value)} style={selectStyle}>
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  )
}

function Metric({ icon: Icon, label, value, sub, color, bg }: { icon: typeof FileText; label: string; value: string | number; sub: string; color: string; bg: string }) {
  return (
    <article style={metricCardStyle}>
      <span style={{ ...metricIconStyle, background: bg }}><Icon size={24} color={color} /></span>
      <span>
        <small style={{ color: '#475569', fontSize: 12 }}>{label}</small>
        <strong style={{ display: 'block', marginTop: 6, fontSize: 22, color: '#0f172a' }}>{value}</strong>
        <small style={{ display: 'block', marginTop: 8, color: '#16a34a', fontSize: 12 }}>{sub}</small>
      </span>
    </article>
  )
}

function DocumentIcon({ type, large }: { type: string; large?: boolean }) {
  const tone = typeTone(type)
  return (
    <span style={{ width: large ? 52 : 34, height: large ? 52 : 34, borderRadius: 10, background: tone.bg, color: tone.text, display: 'grid', placeItems: 'center', fontSize: large ? 12 : 10, fontWeight: 900, flexShrink: 0 }}>
      {type.slice(0, 4)}
    </span>
  )
}

function DocumentThumb({ doc }: { doc: HRDocument }) {
  if (isImageDocument(doc)) {
    return <span aria-label={doc.name} role="img" style={documentThumbStyle(doc)} />
  }

  return <DocumentIcon type={documentType(doc)} />
}

function TypeBadge({ type }: { type: string }) {
  const tone = typeTone(type)
  return <span style={{ ...badgeStyle, background: tone.bg, color: tone.text }}>{type}</span>
}

function Badge({ value, green, red }: { value: string; green?: boolean; red?: boolean }) {
  const background = red ? '#fee2e2' : green ? '#dcfce7' : '#f1f5f9'
  const color = red ? '#dc2626' : green ? '#15803d' : '#475569'
  return <span style={{ ...badgeStyle, background, color }}>{value}</span>
}

function IconButton({ onClick, icon: Icon }: { onClick: () => void; icon: typeof Download }) {
  return (
    <button
      onClick={event => {
        event.stopPropagation()
        onClick()
      }}
      style={iconButtonStyle}
    >
      <Icon size={15} />
    </button>
  )
}

function IconLink({ href, icon: Icon, label }: { href: string; icon: typeof Download; label: string }) {
  return (
    <Link href={href} style={iconLinkStyle} aria-label={label} onClick={(event: MouseEvent) => event.stopPropagation()}>
      <Icon size={15} />
    </Link>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={thStyle}>{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={tdStyle}>{children}</td>
}

const pageHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' as const, marginBottom: 18 }
const pageTitleStyle = { margin: 0, color: '#0f172a', fontSize: 28, fontWeight: 900 }
const pageSubtitleStyle = { margin: '6px 0 0', color: '#475569', fontSize: 14 }
const toolbarStyle = { display: 'flex', gap: 10, flexWrap: 'wrap' as const }
const metricGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', marginBottom: 20, overflow: 'hidden' }
const metricCardStyle = { minHeight: 110, padding: 18, display: 'flex', alignItems: 'center', gap: 16, borderRight: '1px solid #f1f5f9' }
const metricIconStyle = { width: 54, height: 54, borderRadius: 14, display: 'grid', placeItems: 'center' }
const tabsStyle = { display: 'flex', gap: 28, borderBottom: '1px solid #e5e7eb', overflowX: 'auto' as const }
const tabStyle = (active: boolean) => ({ border: 'none', background: 'transparent', padding: '14px 0', borderBottom: active ? '2px solid #22c55e' : '2px solid transparent', color: active ? '#16a34a' : '#334155', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap' as const })
const cardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderTop: 'none', boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }
const folderWorkspaceStyle = { display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)', gap: 18, padding: 18 }
const folderPanelStyle = { border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, display: 'grid', gap: 14, alignContent: 'start' }
const folderContentStyle = { border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, minWidth: 0 }
const folderPanelHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' as const }
const sectionTitleStyle = { margin: 0, color: '#0f172a', fontSize: 16, fontWeight: 900 }
const sectionHintStyle = { margin: '5px 0 0', color: '#64748b', fontSize: 13 }
const folderListStyle = { display: 'grid', gap: 10 }
const folderIconStyle = { width: 40, height: 40, borderRadius: 12, background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center', flexShrink: 0 }
const folderTileStyle = (active: boolean) => ({ width: '100%', border: active ? '1px solid #22c55e' : '1px solid #e5e7eb', borderRadius: 12, background: active ? '#f0fdf4' : '#fff', padding: 12, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' as const, cursor: 'pointer', fontFamily: font, boxShadow: active ? '0 10px 22px rgba(22, 163, 74, 0.08)' : 'none' })
const dropZoneStyle = (enabled: boolean, active: boolean) => ({ minHeight: 138, border: `1.5px dashed ${active ? '#16a34a' : enabled ? '#86efac' : '#cbd5e1'}`, borderRadius: 12, background: active ? '#ecfdf5' : enabled ? '#f7fee7' : '#f8fafc', display: 'grid', placeItems: 'center', gap: 6, padding: 18, color: enabled ? '#166534' : '#64748b', textAlign: 'center' as const, fontSize: 13 })
const filterBarStyle = { padding: 18, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, borderBottom: '1px solid #f1f5f9' }
const trashNoticeStyle = { margin: '0 0 0', padding: '14px 18px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' as const }
const searchBoxStyle = { minHeight: 40, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontSize: 13, fontFamily: font }
const plainInputStyle = { border: 'none', outline: 'none', background: 'transparent', width: '100%', font: 'inherit' }
const selectStyle = { minHeight: 40, minWidth: 150, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', padding: '0 12px', fontSize: 13, fontFamily: font }
const primaryButtonStyle = { minHeight: 40, border: 'none', borderRadius: 8, background: '#16a34a', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 16px', fontSize: 13, fontWeight: 900, cursor: 'pointer', fontFamily: font }
const secondaryButtonStyle = { minHeight: 40, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: font }
const viewToggleStyle = { display: 'flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }
const viewButtonStyle = (active: boolean) => ({ width: 38, height: 38, border: 'none', borderRight: '1px solid #e5e7eb', background: active ? '#dcfce7' : '#fff', color: active ? '#16a34a' : '#64748b', display: 'grid', placeItems: 'center', cursor: 'pointer' })
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, minWidth: 1120 }
const thStyle = { textAlign: 'left' as const, padding: '13px 18px', color: '#475569', fontSize: 11, fontWeight: 900, background: '#fbfdff', whiteSpace: 'nowrap' as const }
const tdStyle = { padding: '13px 18px', borderTop: '1px solid #f1f5f9', color: '#0f172a', fontSize: 12, verticalAlign: 'middle' as const }
const trStyle = { background: '#fff' }
const clickableTrStyle = { ...trStyle, cursor: 'pointer' }
const badgeStyle = { borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 800, display: 'inline-flex' }
const iconButtonStyle = { width: 34, height: 34, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'inline-grid', placeItems: 'center', cursor: 'pointer' }
const iconLinkStyle = { ...iconButtonStyle, textDecoration: 'none' }
const smallButtonStyle = { minHeight: 32, border: '1px solid #bbf7d0', borderRadius: 7, background: '#fff', color: '#15803d', padding: '0 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: font }
const dangerButtonStyle = { minHeight: 32, border: '1px solid #fecaca', borderRadius: 7, background: '#fff', color: '#dc2626', padding: '0 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: font }
const emptyStateStyle = { padding: '54px 18px', display: 'grid', placeItems: 'center', gap: 8, color: '#64748b', fontSize: 13, textAlign: 'center' as const }
const documentThumbStyle = (doc: HRDocument) => ({ width: 42, height: 42, borderRadius: 10, backgroundColor: '#f1f5f9', backgroundImage: `url("${doc.dataUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center', overflow: 'hidden', display: 'block', flexShrink: 0, border: '1px solid #e5e7eb' })
const gridStyle = { padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }
const documentCardStyle = { border: '1px solid #e5e7eb', borderRadius: 12, padding: 8, display: 'grid', gap: 8, background: '#eef2f7', overflow: 'hidden' }
const clickableDocumentCardStyle = { ...documentCardStyle, cursor: 'pointer' }
const documentCardHeaderStyle = { display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr) 24px', alignItems: 'center', gap: 8, padding: '6px 6px 2px' }
const documentCardTypeIconStyle = { width: 18, height: 18, borderRadius: 4, background: '#ef4444', color: '#fff', display: 'grid', placeItems: 'center' }
const documentCardMenuStyle = { width: 24, height: 24, border: 'none', background: 'transparent', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#0f172a' }
const documentPreviewStyle = (doc: HRDocument) => ({ minHeight: 150, borderRadius: 8, backgroundColor: '#fff', backgroundImage: isImageDocument(doc) ? `url("${doc.dataUrl}")` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', display: 'grid', placeItems: 'center', border: '1px solid #e5e7eb', overflow: 'hidden' })
const errorStyle = { marginBottom: 14, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', borderRadius: 8, padding: '10px 12px', fontSize: 13 }
const modalOverlayStyle = { position: 'fixed' as const, inset: 0, zIndex: 90, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }
const modalCardStyle = { width: 'min(480px, 100%)', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 24px 70px rgba(15,23,42,0.22)', padding: 20 }
const fieldStyle = { display: 'grid', gap: 7 }
const labelStyle = { color: '#475569', fontSize: 12, fontWeight: 800 }
const inputBoxStyle = { minHeight: 40, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', fontSize: 13, fontFamily: font }
const modalFooterStyle = { marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 10 }
