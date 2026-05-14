'use client'

import EmployeeEmptyPage from '@/components/employee/EmployeeEmptyPage'
import { formatDate, useEmployeePortalData } from '../employeeData'

export default function EmployeeCalendarPage() {
  const { holidays, myLeaveRequests } = useEmployeePortalData()
  const events = [...holidays.map(item => ({ id: item.id, title: item.name, date: item.date })), ...myLeaveRequests.map(item => ({ id: item.id, title: item.leaveType, date: item.startDate }))]
  return <EmployeeEmptyPage title="Calendar" subtitle="See your leave dates, holidays, and employee events.">{events.length === 0 ? undefined : <section className="employee-panel" style={{ padding: 18, display: 'grid', gap: 10 }}>{events.map(item => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, border: '1px solid #eef2f7', borderRadius: 8 }}><strong>{item.title}</strong><span>{formatDate(item.date)}</span></div>)}</section>}</EmployeeEmptyPage>
}
