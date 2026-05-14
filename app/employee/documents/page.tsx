'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import EmployeeEmptyPage from '@/components/employee/EmployeeEmptyPage'
import { documentsKey, formatDate, HRDocument, loadStored, saveStored, useEmployeePortalData } from '../employeeData'

function readFile(file: File) {
  return new Promise<HRDocument>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ id: `doc_${Date.now()}_${file.name}`, name: file.name, type: file.name.split('.').pop()?.toUpperCase(), mimeType: file.type, sizeBytes: file.size, dataUrl: String(reader.result || ''), uploadedAt: new Date().toISOString(), status: 'Active' })
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function EmployeeDocumentsPage() {
  const { employee, employeeName, myDocuments } = useEmployeePortalData()
  const [notice, setNotice] = useState('')
  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    const docs = await Promise.all(Array.from(files).map(readFile))
    const all = loadStored<HRDocument[]>(documentsKey, [])
    saveStored(documentsKey, [...docs.map(doc => ({ ...doc, employeeId: employee.id, uploadedById: employee.id, uploadedByEmail: employee.email, uploadedByName: employeeName, category: 'Employee Documents' })), ...all])
    setNotice(`${docs.length} document${docs.length === 1 ? '' : 's'} uploaded.`)
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
        {myDocuments.length === 0 ? <div style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>No documents uploaded yet.</div> : <div style={{ display: 'grid', gap: 10 }}>{myDocuments.map(item => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 12, border: '1px solid #eef2f7', borderRadius: 8 }}><strong>{item.name}</strong><span style={{ color: '#64748b', fontSize: 13 }}>{formatDate(item.uploadedAt)}</span></div>)}</div>}
      </section>
    </EmployeeEmptyPage>
  )
}
