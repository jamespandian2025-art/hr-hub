'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Copy,
  Download,
  FileText,
  Folder,
  History,
  Lock,
  MoreVertical,
  Printer,
  Search,
  Share2,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'

type HRDocument = {
  id: string
  employeeId?: string
  uploadedById?: string
  uploadedByEmail?: string
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
  sharedByName?: string
  sharedAt?: string
  sharedWithIds?: string[]
  sharedWithEmails?: string[]
  sharedWithNames?: string[]
  permission?: string
  deletedAt?: string
  lastOpenedAt?: string
  lastOpenedById?: string
  lastOpenedByEmail?: string
  lastOpenedByName?: string
}

type HRDocumentVersion = {
  id: string
  documentId: string
  version: string
  name: string
  type?: string
  mimeType?: string
  size?: string
  sizeBytes?: number
  dataUrl?: string
  uploadedById?: string
  uploadedByEmail?: string
  uploadedByName?: string
  uploadedAt?: string
  notes?: string
}

type StoredAccount = {
  userId?: string
  email?: string
  fullName?: string
  name?: string
  role?: string
}

type DetailTab = 'overview' | 'preview' | 'activity' | 'access' | 'related' | 'versions'

const font = "var(--font-body)"
const documentsKey = 'flowsys-hr-documents'
const deletedDocumentsKey = 'flowsys-hr-deleted-documents'
const documentVersionsKey = 'flowsys-hr-document-versions'
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatDate(value?: string, withTime = false) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

function fileExtension(name?: string) {
  if (!name || !name.includes('.')) return 'File'
  return name.split('.').pop()?.toUpperCase() || 'File'
}

function documentType(doc?: HRDocument | null) {
  if (!doc) return 'File'
  return (doc.type || fileExtension(doc.name)).replace('.', '').toUpperCase()
}

function typeTone(type: string) {
  const normalized = type.toLowerCase()
  if (normalized.includes('pdf')) return { bg: '#fee2e2', text: '#dc2626' }
  if (normalized.includes('xls') || normalized.includes('excel')) return { bg: '#dcfce7', text: '#15803d' }
  if (normalized.includes('doc') || normalized.includes('word')) return { bg: '#dbeafe', text: '#1d4ed8' }
  return { bg: '#f1f5f9', text: '#475569' }
}

export default function HRDocumentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const [document, setDocument] = useState<HRDocument | null>(null)
  const [allDocuments, setAllDocuments] = useState<HRDocument[]>([])
  const [deletedDocuments, setDeletedDocuments] = useState<HRDocument[]>([])
  const [versions, setVersions] = useState<HRDocumentVersion[]>([])
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const load = () => {
      const active = loadStored<HRDocument[]>(documentsKey, []).filter(doc => Boolean(doc.dataUrl) && !doc.deletedAt)
      const deleted = loadStored<HRDocument[]>(deletedDocumentsKey, []).filter(doc => Boolean(doc.dataUrl))
      const storedVersions = loadStored<HRDocumentVersion[]>(documentVersionsKey, [])
        .filter(version => version.documentId === id)
        .sort((first, second) => new Date(second.uploadedAt || 0).getTime() - new Date(first.uploadedAt || 0).getTime())
      setAllDocuments(active)
      setDeletedDocuments(deleted)
      setVersions(storedVersions)
      const found = [...active, ...deleted].find(doc => doc.id === id) || null
      if (found && !found.deletedAt) {
        const account = {
          ...parseStoredAccount(window.localStorage.getItem(sessionKey)),
          ...parseStoredAccount(window.localStorage.getItem(accountKey)),
        }
        const openedDocument = {
          ...found,
          lastOpenedAt: new Date().toISOString(),
          lastOpenedById: account.userId || found.lastOpenedById,
          lastOpenedByEmail: account.email || found.lastOpenedByEmail,
          lastOpenedByName: account.fullName || account.name || found.lastOpenedByName,
        }
        const updatedActive = active.map(doc => doc.id === found.id ? openedDocument : doc)
        saveStored(documentsKey, updatedActive)
        setAllDocuments(updatedActive)
        setDocument(openedDocument)
        return
      }
      setDocument(found)
    }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [id])

  const relatedDocuments = useMemo(() => {
    if (!document) return []
    return allDocuments
      .filter(doc => doc.id !== document.id)
      .filter(doc => {
        const sameCategory = document.category && doc.category === document.category
        const sameFolder = document.folderId && doc.folderId === document.folderId
        const sameType = documentType(doc) === documentType(document)
        return sameCategory || sameFolder || sameType
      })
      .slice(0, 4)
  }, [allDocuments, document])

  const accessEntries = useMemo(() => {
    if (!document?.shared) return []
    const names = document.sharedWithNames || []
    const emails = document.sharedWithEmails || []
    const ids = document.sharedWithIds || []
    const count = Math.max(names.length, emails.length, ids.length)

    return Array.from({ length: count }, (_, index) => ({
      id: ids[index] || emails[index] || names[index] || `access-${index}`,
      name: names[index] || emails[index] || ids[index] || '-',
      type: 'User',
      permission: document.permission || 'View Only',
      grantedBy: document.sharedByName || document.uploadedByName || '-',
      grantedOn: formatDate(document.sharedAt, true),
    }))
  }, [document])

  const isDeleted = Boolean(document?.deletedAt)
  const docType = documentType(document)
  const isImage = Boolean(document?.mimeType?.startsWith('image/'))
  const isPdf = document?.mimeType === 'application/pdf' || docType === 'PDF'

  function downloadDocument() {
    if (!document?.dataUrl) return
    const link = window.document.createElement('a')
    link.href = document.dataUrl
    link.download = document.name
    link.click()
  }

  function downloadVersion(version: HRDocumentVersion) {
    if (!version.dataUrl) return
    const link = window.document.createElement('a')
    link.href = version.dataUrl
    link.download = version.name
    link.click()
  }

  function printDocument() {
    if (!document?.dataUrl) return
    const printWindow = window.open(document.dataUrl, '_blank', 'noopener,noreferrer')
    printWindow?.focus()
  }

  async function replaceDocumentFile(file?: File | null) {
    if (!document || !file || isDeleted) return
    const account = {
      ...parseStoredAccount(window.localStorage.getItem(sessionKey)),
      ...parseStoredAccount(window.localStorage.getItem(accountKey)),
    }
    const previousVersions = loadStored<HRDocumentVersion[]>(documentVersionsKey, [])
    const previousVersionNumber = `${previousVersions.filter(version => version.documentId === document.id).length + 1}.0`
    const previousVersion: HRDocumentVersion = {
      id: `doc_version_${Date.now()}`,
      documentId: document.id,
      version: previousVersionNumber,
      name: document.name,
      type: document.type,
      mimeType: document.mimeType,
      size: document.size,
      sizeBytes: document.sizeBytes,
      dataUrl: document.dataUrl,
      uploadedById: document.uploadedById,
      uploadedByEmail: document.uploadedByEmail,
      uploadedByName: document.uploadedByName,
      uploadedAt: document.uploadedAt,
      notes: 'Previous file before replacement.',
    }
    const updated: HRDocument = {
      ...document,
      name: file.name,
      type: fileExtension(file.name),
      mimeType: file.type || 'application/octet-stream',
      size: formatFileSize(file.size),
      sizeBytes: file.size,
      dataUrl: await readFileAsDataUrl(file),
      uploadedById: account.userId || document.uploadedById,
      uploadedByEmail: account.email || document.uploadedByEmail,
      uploadedByName: account.fullName || account.name || document.uploadedByName,
      uploadedAt: new Date().toISOString(),
      status: document.status || 'Active',
    }
    const active = loadStored<HRDocument[]>(documentsKey, []).map(doc => doc.id === document.id ? updated : doc)
    const nextVersions = [previousVersion, ...previousVersions]
    saveStored(documentsKey, active)
    saveStored(documentVersionsKey, nextVersions)
    setAllDocuments(active.filter(doc => Boolean(doc.dataUrl) && !doc.deletedAt))
    setVersions(nextVersions.filter(version => version.documentId === document.id))
    setDocument(updated)
    if (replaceInputRef.current) replaceInputRef.current.value = ''
  }

  async function copyDocumentLink() {
    if (typeof window === 'undefined') return
    await window.navigator.clipboard?.writeText(window.location.href)
  }

  function moveToTrash() {
    if (!document || isDeleted) return
    const trashed = { ...document, deletedAt: new Date().toISOString(), status: 'Deleted' }
    const active = loadStored<HRDocument[]>(documentsKey, []).filter(doc => doc.id !== document.id)
    const deleted = [trashed, ...deletedDocuments.filter(doc => doc.id !== document.id)]
    saveStored(documentsKey, active)
    saveStored(deletedDocumentsKey, deleted)
    setAllDocuments(active.filter(doc => Boolean(doc.dataUrl) && !doc.deletedAt))
    setDeletedDocuments(deleted)
    setDocument(trashed)
  }

  function restoreDocument() {
    if (!document || !isDeleted) return
    const restored = { ...document, deletedAt: undefined, status: document.status === 'Deleted' ? 'Active' : document.status }
    const deleted = deletedDocuments.filter(doc => doc.id !== document.id)
    const active = [restored, ...loadStored<HRDocument[]>(documentsKey, [])]
    saveStored(documentsKey, active)
    saveStored(deletedDocumentsKey, deleted)
    setAllDocuments(active.filter(doc => Boolean(doc.dataUrl) && !doc.deletedAt))
    setDeletedDocuments(deleted)
    setDocument(restored)
  }

  function deleteForever() {
    if (!document || !isDeleted) return
    const deleted = deletedDocuments.filter(doc => doc.id !== document.id)
    saveStored(deletedDocumentsKey, deleted)
    router.push('/hr/documents')
  }

  return (
    <section className="hr-module-page" style={{ fontFamily: font }}>
      <div style={topBarStyle}>
        <div>
          <h1 style={pageTitleStyle}>Document Details</h1>
          <div style={breadcrumbStyle}>
            <Link href="/hr/documents" style={breadcrumbLinkStyle}>Documents</Link>
            <span>&gt;</span>
            <span>{document?.name || 'Document Details'}</span>
          </div>
        </div>
        <div style={toolbarStyle}>
          <label style={searchBoxStyle}>
            <Search size={15} color="#94a3b8" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search documents..." style={plainInputStyle} />
          </label>
          <button style={secondaryButtonStyle} onClick={downloadDocument} disabled={!document}><Download size={15} /> Download</button>
          <button style={secondaryButtonStyle} onClick={printDocument} disabled={!document}><Printer size={15} /> Print</button>
          <button style={secondaryButtonStyle} onClick={copyDocumentLink} disabled={!document}><Share2 size={15} /> Share</button>
          <input ref={replaceInputRef} type="file" hidden onChange={event => replaceDocumentFile(event.target.files?.[0])} />
          <button style={secondaryButtonStyle} onClick={() => replaceInputRef.current?.click()} disabled={!document || isDeleted}><Upload size={15} /> Replace File</button>
          <button style={secondaryButtonStyle} disabled={!document}><MoreVertical size={15} /> More Actions</button>
        </div>
      </div>

      {!document ? (
        <div style={emptyStateStyle}>
          <FileText size={40} color="#94a3b8" />
          <strong>No document selected.</strong>
          <span>Upload a document first, then open it from the documents list.</span>
          <Link href="/hr/documents" style={primaryLinkStyle}><ArrowLeft size={15} /> Back to Documents</Link>
        </div>
      ) : (
        <>
          <section style={heroCardStyle}>
            <div style={heroMainStyle}>
              <DocumentIcon type={docType} large />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h2 style={heroTitleStyle}>{document.name}</h2>
                  <Badge value={isDeleted ? 'Deleted' : document.status || 'Active'} green={!isDeleted} red={isDeleted} />
                </div>
                <div style={badgeRowStyle}>
                  <TypeBadge type={docType} />
                  <Badge value={document.category || 'Uncategorized'} />
                  {document.shared && <Badge value="Shared" />}
                </div>
                <p style={heroSubtitleStyle}>{document.mimeType || 'Uploaded HR document'}</p>
              </div>
            </div>
            <div style={factsGridStyle}>
              <Fact label="Document ID" value={document.id} />
              <Fact label="Uploaded By" value={document.uploadedByName || '-'} />
              <Fact label="Uploaded On" value={formatDate(document.uploadedAt, true)} />
              <Fact label="Category" value={document.category || 'Uncategorized'} />
              <Fact label="Type" value={docType} />
              <Fact label="Size" value={document.size || '-'} />
            </div>
          </section>

          <div style={tabsStyle}>
            {[
              ['overview', 'Overview'],
              ['preview', 'Preview'],
              ['activity', 'Activity History'],
              ['access', 'Access & Permissions'],
              ['related', 'Related Documents'],
              ['versions', 'Version History'],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key as DetailTab)} style={tabStyle(activeTab === key)}>{label}</button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div style={contentGridStyle}>
              <div style={stackStyle}>
                <InfoCard title="Document Information" icon={FileText}>
                  <InfoRow label="Document Name" value={document.name} />
                  <InfoRow label="Document Type" value={docType} />
                  <InfoRow label="Category" value={document.category || 'Uncategorized'} />
                  <InfoRow label="Status" value={isDeleted ? 'Deleted' : document.status || 'Active'} />
                  <InfoRow label="Shared" value={document.shared ? 'Yes' : 'No'} />
                </InfoCard>
                <InfoCard title="File Information" icon={Upload}>
                  <InfoRow label="File Name" value={document.name} />
                  <InfoRow label="MIME Type" value={document.mimeType || '-'} />
                  <InfoRow label="File Size" value={document.size || '-'} />
                  <InfoRow label="Uploaded By" value={document.uploadedByName || '-'} />
                  <InfoRow label="Uploaded On" value={formatDate(document.uploadedAt, true)} />
                </InfoCard>
              </div>
              <aside style={stackStyle}>
                <InfoCard title="Access & Permissions" icon={ShieldCheck}>
                  <InfoRow label="Permission Level" value={document.shared ? 'Shared' : 'Private'} />
                  <InfoRow label="Employee Access" value={document.employeeId ? 'Linked employee only' : 'Not assigned'} />
                  <InfoRow label="Folder" value={document.folderId || '-'} />
                </InfoCard>
                <InfoCard title="Quick Actions" icon={MoreVertical}>
                  <button style={actionButtonStyle} onClick={downloadDocument}><Download size={15} /> Download Document</button>
                  <button style={actionButtonStyle} onClick={copyDocumentLink}><Copy size={15} /> Copy Link</button>
                  {isDeleted ? (
                    <>
                      <button style={actionButtonStyle} onClick={restoreDocument}><Upload size={15} /> Restore Document</button>
                      <button style={dangerActionStyle} onClick={deleteForever}><Trash2 size={15} /> Delete Forever</button>
                    </>
                  ) : (
                    <button style={dangerActionStyle} onClick={moveToTrash}><Trash2 size={15} /> Move to Trash</button>
                  )}
                </InfoCard>
              </aside>
            </div>
          )}

          {activeTab === 'preview' && (
            <div style={previewPageStyle}>
              <section style={previewWorkspaceStyle}>
                <div style={previewToolbarStyle}>
                  <button style={previewToolButtonStyle} disabled>-</button>
                  <span style={previewZoomStyle}>100%</span>
                  <button style={previewToolButtonStyle} onClick={downloadDocument} aria-label="Download preview"><Download size={15} /></button>
                  <button style={previewToolButtonStyle} onClick={printDocument} aria-label="Print preview"><Printer size={15} /></button>
                </div>
                <div style={previewCanvasStyle}>
                  {isImage && document.dataUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={document.dataUrl} alt={document.name} style={previewImageStyle} />
                  )}
                  {isPdf && document.dataUrl && <iframe src={document.dataUrl} title={document.name} style={previewFrameStyle} />}
                  {!isImage && !isPdf && (
                    <EmptyPanel icon={FileText} title="Preview is not available." text="Download this document to view it with the right app." />
                  )}
                </div>
              </section>
              <aside style={stackStyle}>
                <InfoCard title="Document Summary" icon={FileText}>
                  <InfoRow label="Document Name" value={document.name} />
                  <InfoRow label="Category" value={document.category || 'Uncategorized'} />
                  <InfoRow label="Uploaded By" value={document.uploadedByName || '-'} />
                  <InfoRow label="Type" value={docType} />
                  <InfoRow label="Size" value={document.size || '-'} />
                  <InfoRow label="Last Modified" value={formatDate(document.uploadedAt, true)} />
                </InfoCard>
                <InfoCard title="Activity Timeline" icon={History}>
                  {document.uploadedAt ? (
                    <div style={timelineItemStyle}>
                      <span style={timelineDotStyle} />
                      <div>
                        <strong>Document uploaded</strong>
                        <p style={mutedTextStyle}>{formatDate(document.uploadedAt, true)} {document.uploadedByName ? `by ${document.uploadedByName}` : ''}</p>
                      </div>
                    </div>
                  ) : (
                    <EmptyPanel icon={History} title="No activity yet." text="Preview activity will appear here." />
                  )}
                </InfoCard>
                <InfoCard title="Comments" icon={MoreVertical}>
                  <EmptyPanel icon={MoreVertical} title="No comments yet." text="Comments for this document will appear here." />
                </InfoCard>
              </aside>
            </div>
          )}

          {activeTab === 'activity' && (
            <div style={singleCardStyle}>
              {document.uploadedAt ? (
                <div style={timelineItemStyle}>
                  <span style={timelineDotStyle} />
                  <div>
                    <strong>Document uploaded</strong>
                    <p style={mutedTextStyle}>{formatDate(document.uploadedAt, true)} {document.uploadedByName ? `by ${document.uploadedByName}` : ''}</p>
                  </div>
                </div>
              ) : (
                <EmptyPanel icon={History} title="No activity yet." text="Document actions will appear here once available." />
              )}
            </div>
          )}

          {activeTab === 'access' && (
            <div style={versionGridStyle}>
              <section style={versionMainCardStyle}>
                <div style={versionHeaderStyle}>
                  <div>
                    <h3 style={sectionTitleStyle}>Who has access</h3>
                    <p style={sectionSubtitleStyle}>Manage users and groups who can access this document.</p>
                  </div>
                  <button style={secondaryButtonStyle} disabled><ShieldCheck size={15} /> Manage Access</button>
                </div>
                {accessEntries.length ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={versionTableStyle}>
                      <thead>
                        <tr>
                          <Th>Name / Group</Th>
                          <Th>Type</Th>
                          <Th>Permission Level</Th>
                          <Th>Access Granted By</Th>
                          <Th>Access Granted On</Th>
                          <Th>Actions</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {accessEntries.map(entry => (
                          <tr key={entry.id}>
                            <Td><strong>{entry.name}</strong></Td>
                            <Td><Badge value={entry.type} green /></Td>
                            <Td>{entry.permission}</Td>
                            <Td>{entry.grantedBy}</Td>
                            <Td>{entry.grantedOn}</Td>
                            <Td><button style={secondaryButtonStyle} disabled><MoreVertical size={15} /></button></Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyPanel icon={Lock} title="No access rules configured yet." text="Shared users and permission records will appear here." />
                )}
              </section>
              <aside style={stackStyle}>
                <InfoCard title="Permission Levels" icon={ShieldCheck}>
                  <EmptyPanel icon={ShieldCheck} title="No custom permission levels." text="Permission levels will appear when access rules are configured." />
                </InfoCard>
                <InfoCard title="Document Visibility" icon={Lock}>
                  <InfoRow label="Visibility" value={document.shared ? 'Shared' : 'Private'} />
                  <InfoRow label="Linked Employee" value={document.employeeId || '-'} />
                </InfoCard>
                <InfoCard title="Link Sharing" icon={Share2}>
                  <EmptyPanel icon={Share2} title="Link sharing is not enabled." text="Only explicit access records will appear here." />
                </InfoCard>
              </aside>
            </div>
          )}

          {activeTab === 'related' && (
            <div style={singleCardStyle}>
              {relatedDocuments.length ? (
                <div style={relatedGridStyle}>
                  {relatedDocuments.map(doc => (
                    <Link key={doc.id} href={`/hr/documents/${encodeURIComponent(doc.id)}`} style={relatedCardStyle}>
                      <DocumentIcon type={documentType(doc)} />
                      <span>
                        <strong>{doc.name}</strong>
                        <small>{doc.category || 'Uncategorized'} - {formatDate(doc.uploadedAt)}</small>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyPanel icon={Folder} title="No related documents." text="Related files will appear here when they share a category, type, or folder." />
              )}
            </div>
          )}

          {activeTab === 'versions' && (
            <div style={versionGridStyle}>
              <section style={versionMainCardStyle}>
                <div style={versionHeaderStyle}>
                  <div>
                    <h3 style={sectionTitleStyle}>Version History</h3>
                    <p style={sectionSubtitleStyle}>Track replaced files for this document.</p>
                  </div>
                  <button style={secondaryButtonStyle} disabled={!versions.length}>Compare Versions</button>
                </div>
                {versions.length ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={versionTableStyle}>
                      <thead>
                        <tr>
                          <Th>Version</Th>
                          <Th>Status</Th>
                          <Th>Uploaded By</Th>
                          <Th>Changes / Notes</Th>
                          <Th>Size</Th>
                          <Th>Uploaded On</Th>
                          <Th>Actions</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {versions.map(version => (
                          <tr key={version.id}>
                            <Td><strong>{version.version}</strong></Td>
                            <Td><Badge value="Previous" /></Td>
                            <Td>{version.uploadedByName || '-'}</Td>
                            <Td>{version.notes || '-'}</Td>
                            <Td>{version.size || '-'}</Td>
                            <Td>{formatDate(version.uploadedAt, true)}</Td>
                            <Td><button style={actionButtonStyle} onClick={() => downloadVersion(version)}><Download size={15} /> Download</button></Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyPanel icon={History} title="No version history yet." text="Replaced files and future document versions will appear here." />
                )}
              </section>
              <aside style={stackStyle}>
                <InfoCard title="Version Details" icon={History}>
                  <InfoRow label="Current Version" value={versions.length ? `${versions.length + 1}.0` : '1.0'} />
                  <InfoRow label="Previous Versions" value={String(versions.length)} />
                  <InfoRow label="Latest Upload" value={formatDate(document.uploadedAt, true)} />
                  <InfoRow label="Size" value={document.size || '-'} />
                </InfoCard>
                <InfoCard title="Version Preview" icon={FileText}>
                  <EmptyPanel icon={FileText} title="No previous version selected." text="Select a saved version when version history is available." />
                </InfoCard>
              </aside>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <small style={factLabelStyle}>{label}</small>
      <strong style={factValueStyle}>{value}</strong>
    </div>
  )
}

function InfoCard({ title, icon: Icon, children }: { title: string; icon: typeof FileText; children: React.ReactNode }) {
  return (
    <section style={infoCardStyle}>
      <div style={infoHeaderStyle}><Icon size={17} color="#64748b" /><h3>{title}</h3></div>
      <div style={infoRowsStyle}>{children}</div>
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoRowStyle}>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}

function EmptyPanel({ icon: Icon, title, text }: { icon: typeof FileText; title: string; text: string }) {
  return (
    <div style={innerEmptyStyle}>
      <Icon size={34} color="#94a3b8" />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  )
}

function DocumentIcon({ type, large }: { type: string; large?: boolean }) {
  const tone = typeTone(type)
  return (
    <span style={{ width: large ? 58 : 38, height: large ? 58 : 38, borderRadius: 12, background: tone.bg, color: tone.text, display: 'grid', placeItems: 'center', fontSize: large ? 13 : 10, fontWeight: 900, flexShrink: 0 }}>
      {type.slice(0, 4)}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const tone = typeTone(type)
  return <span style={{ ...badgeStyle, background: tone.bg, color: tone.text }}>{type}</span>
}

function Badge({ value, green, red }: { value: string; green?: boolean; red?: boolean }) {
  const bg = red ? '#fee2e2' : green ? '#dcfce7' : '#f1f5f9'
  const color = red ? '#dc2626' : green ? '#15803d' : '#475569'
  return <span style={{ ...badgeStyle, background: bg, color }}>{value}</span>
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={thStyle}>{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={tdStyle}>{children}</td>
}

const topBarStyle = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' as const, marginBottom: 18 }
const pageTitleStyle = { margin: 0, color: '#0f172a', fontSize: 28, fontWeight: 900 }
const breadcrumbStyle = { display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, color: '#64748b', fontSize: 13 }
const breadcrumbLinkStyle = { color: '#475569', textDecoration: 'none' }
const toolbarStyle = { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' as const }
const searchBoxStyle = { minHeight: 40, minWidth: 330, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontSize: 13, fontFamily: font }
const plainInputStyle = { border: 'none', outline: 'none', background: 'transparent', width: '100%', font: 'inherit' }
const secondaryButtonStyle = { minHeight: 40, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: font }
const primaryLinkStyle = { minHeight: 40, borderRadius: 8, background: '#16a34a', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 16px', fontSize: 13, fontWeight: 900, textDecoration: 'none', fontFamily: font }
const emptyStateStyle = { minHeight: 420, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 10, color: '#64748b', fontSize: 13, textAlign: 'center' as const, boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }
const heroCardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', padding: 22, display: 'grid', gridTemplateColumns: 'minmax(280px, 1.3fr) minmax(420px, 1fr)', gap: 26, marginBottom: 18 }
const heroMainStyle = { display: 'flex', gap: 16, alignItems: 'flex-start' }
const heroTitleStyle = { margin: 0, color: '#0f172a', fontSize: 20, fontWeight: 900 }
const heroSubtitleStyle = { margin: '14px 0 0', color: '#475569', fontSize: 13, lineHeight: 1.5 }
const badgeRowStyle = { display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginTop: 8 }
const factsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, borderLeft: '1px solid #e5e7eb', paddingLeft: 24 }
const factLabelStyle = { display: 'block', color: '#64748b', fontSize: 12, marginBottom: 6 }
const factValueStyle = { display: 'block', color: '#0f172a', fontSize: 13, overflowWrap: 'anywhere' as const }
const tabsStyle = { display: 'flex', gap: 28, borderBottom: '1px solid #e5e7eb', overflowX: 'auto' as const, marginBottom: 16 }
const tabStyle = (active: boolean) => ({ border: 'none', background: 'transparent', padding: '14px 0', borderBottom: active ? '2px solid #22c55e' : '2px solid transparent', color: active ? '#16a34a' : '#334155', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap' as const })
const contentGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 0.8fr)', gap: 18 }
const stackStyle = { display: 'grid', gap: 14, alignContent: 'start' }
const singleCardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', padding: 18, minHeight: 360 }
const sectionTitleStyle = { margin: 0, color: '#0f172a', fontSize: 16, fontWeight: 900 }
const sectionSubtitleStyle = { margin: '6px 0 0', color: '#64748b', fontSize: 13 }
const versionGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(320px, 0.75fr)', gap: 18 }
const versionMainCardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', overflow: 'hidden', minHeight: 420 }
const versionHeaderStyle = { padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' as const }
const versionTableStyle = { width: '100%', minWidth: 880, borderCollapse: 'collapse' as const }
const thStyle = { textAlign: 'left' as const, padding: '13px 18px', color: '#475569', fontSize: 11, fontWeight: 900, background: '#fbfdff', whiteSpace: 'nowrap' as const }
const tdStyle = { padding: '13px 18px', borderTop: '1px solid #f1f5f9', color: '#0f172a', fontSize: 12, verticalAlign: 'middle' as const }
const previewPageStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(320px, 0.75fr)', gap: 18 }
const previewWorkspaceStyle = { background: '#0f172a', border: '1px solid #111827', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }
const previewToolbarStyle = { minHeight: 52, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', background: '#111827', color: '#e5e7eb', borderBottom: '1px solid rgba(255,255,255,0.08)' }
const previewToolButtonStyle = { width: 34, height: 34, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: '#e5e7eb', display: 'grid', placeItems: 'center', cursor: 'pointer', fontFamily: font }
const previewZoomStyle = { minHeight: 34, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '0 12px', display: 'inline-flex', alignItems: 'center', fontSize: 13, fontWeight: 800 }
const previewCanvasStyle = { minHeight: 640, padding: 18, background: '#111827', display: 'grid', placeItems: 'center' }
const infoCardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', overflow: 'hidden' }
const infoHeaderStyle = { display: 'flex', gap: 9, alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid #f1f5f9', color: '#0f172a' }
const infoRowsStyle = { display: 'grid', padding: '8px 18px 16px' }
const infoRowStyle = { display: 'grid', gridTemplateColumns: '180px minmax(0, 1fr)', gap: 16, padding: '9px 0', color: '#475569', fontSize: 13, borderBottom: '1px solid #f8fafc' }
const actionButtonStyle = { minHeight: 38, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: font }
const dangerActionStyle = { ...actionButtonStyle, color: '#dc2626', borderColor: '#fecaca' }
const badgeStyle = { borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 800, display: 'inline-flex' }
const previewImageStyle = { maxWidth: '100%', maxHeight: 720, borderRadius: 10, border: '1px solid #e5e7eb', objectFit: 'contain' as const, display: 'block', margin: '0 auto' }
const previewFrameStyle = { width: '100%', minHeight: 720, border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }
const innerEmptyStyle = { minHeight: 300, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 8, color: '#64748b', fontSize: 13, textAlign: 'center' as const }
const timelineItemStyle = { display: 'flex', gap: 12, alignItems: 'flex-start', color: '#0f172a', fontSize: 13 }
const timelineDotStyle = { width: 10, height: 10, borderRadius: 999, background: '#16a34a', marginTop: 4 }
const mutedTextStyle = { margin: '4px 0 0', color: '#64748b', fontSize: 12 }
const relatedGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }
const relatedCardStyle = { border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, display: 'flex', gap: 12, alignItems: 'center', color: '#0f172a', textDecoration: 'none', fontSize: 13 }
