'use client'

import { useState } from 'react'
import { Download, Trash2, Upload } from 'lucide-react'
import EmployeeEmptyPage from '@/components/employee/EmployeeEmptyPage'
import { documentsKey, formatDate, HRDocument, loadStored, saveStored, useEmployeePortalData } from '../employeeData'
import { uploadFileObject } from '@/lib/uploads/client'

async function uploadDocument(file: File): Promise<HRDocument> {
  const uploaded = await uploadFileObject(file, 'employee-documents')
  return {
    id: `doc_${Date.now()}_${file.name}`,
    name: file.name,
    type: file.name.split('.').pop()?.toUpperCase(),
    mimeType: file.type,
    sizeBytes: file.size,
    dataUrl: uploaded.url,
    fileUrl: uploaded.url,
    objectKey: uploaded.objectKey,
    storageProvider: uploaded.storageProvider,
    uploadedAt: new Date().toISOString(),
    status: 'Active',
  }
}

export default function EmployeeDocumentsPage() {
  const { employee, employeeName, myDocuments } = useEmployeePortalData()
  const [notice, setNotice] = useState('')
  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    let docs: HRDocument[]
    try {
      docs = await Promise.all(Array.from(files).map(uploadDocument))
    } catch {
      setNotice('Could not upload one or more documents. Please try again.')
      return
    }
    const all = loadStored<HRDocument[]>(documentsKey, [])
    saveStored(documentsKey, [...docs.map(doc => ({ ...doc, employeeId: employee.id, uploadedById: employee.id, uploadedByEmail: employee.email, uploadedByName: employeeName, category: 'Employee Documents' })), ...all])
    setNotice(`${docs.length} document${docs.length === 1 ? '' : 's'} uploaded.`)
    window.dispatchEvent(new StorageEvent('storage', { key: documentsKey }))
  }
  const downloadDocument = (document: HRDocument) => {
    const fileUrl = document.fileUrl || document.dataUrl
    if (!fileUrl) {
      setNotice('This document does not have a downloadable file attached.')
      return
    }
    const link = window.document.createElement('a')
    link.href = fileUrl
    link.download = document.name
    link.click()
  }
  const removeDocument = (documentId: string) => {
    const all = loadStored<HRDocument[]>(documentsKey, [])
    saveStored(documentsKey, all.filter(document => document.id !== documentId))
    setNotice('Document removed from your employee profile.')
    window.dispatchEvent(new StorageEvent('storage', { key: documentsKey }))
  }
  return (
    <EmployeeEmptyPage title="My Documents" subtitle="Upload and view documents connected to your employee profile.">
      <section className="employee-panel" style={{ padding: 18 }}>
        {notice && <div style={{ marginBottom: 12, color: '#15803d', fontSize: 13, fontWeight: 850 }}>{notice}</div>}
        <label onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void upload(event.dataTransfer.files) }} style={{ minHeight: 110, border: '1px dashed #cbd5e1', borderRadius: 10, display: 'grid', placeItems: 'center', cursor: 'pointer', marginBottom: 16, color: '#334155', fontWeight: 850 }}>
          <span style={{ display: 'grid', placeItems: 'center', gap: 8 }}><Upload size={22} /> Drag and drop files here or click to upload</span>
          <input type="file" multiple onChange={event => void upload(event.target.files)} style={{ display: 'none' }} />
        </label>
        {myDocuments.length === 0 ? <div style={{ padding: 36, textAlign: 'center', color: '#000000' }}>No documents uploaded yet.</div> : (
          <div style={{ display: 'grid', gap: 10 }}>
            {myDocuments.map(item => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 12, padding: 12, border: '1px solid #eef2f7', borderRadius: 8 }}>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</strong>
                  <small style={{ color: '#000000', fontSize: 13 }}>{formatDate(item.uploadedAt)}{item.sizeBytes ? ` - ${formatFileSize(item.sizeBytes)}` : ''}</small>
                </span>
                <span style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => downloadDocument(item)} style={iconButtonStyle} aria-label={`Download ${item.name}`}><Download size={15} /></button>
                  <button type="button" onClick={() => removeDocument(item.id)} style={{ ...iconButtonStyle, color: '#dc2626' }} aria-label={`Remove ${item.name}`}><Trash2 size={15} /></button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </EmployeeEmptyPage>
  )
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const iconButtonStyle = {
  width: 34,
  height: 34,
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  background: '#fff',
  color: '#0f172a',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
} as const
