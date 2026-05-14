'use client'

import EmployeeEmptyPage from '@/components/employee/EmployeeEmptyPage'
import { formatDate, useEmployeePortalData } from '../employeeData'

export default function EmployeeAnnouncementsPage() {
  const { announcements } = useEmployeePortalData()
  return <EmployeeEmptyPage title="Announcements" subtitle="Read company announcements published by HR.">{announcements.length === 0 ? undefined : <section className="employee-panel" style={{ padding: 18, display: 'grid', gap: 12 }}>{announcements.map(item => <article key={item.id} style={{ padding: 14, border: '1px solid #eef2f7', borderRadius: 8 }}><strong>{item.title}</strong><p>{item.body || 'No details provided.'}</p><small style={{ color: '#64748b' }}>{formatDate(item.createdAt)}</small></article>)}</section>}</EmployeeEmptyPage>
}
