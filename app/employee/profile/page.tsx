'use client'

import EmployeeEmptyPage from '@/components/employee/EmployeeEmptyPage'
import { formatDate, useEmployeePortalData } from '../employeeData'

export default function EmployeeProfilePage() {
  const { employee, employeeName } = useEmployeePortalData()
  return (
    <EmployeeEmptyPage title="My Profile" subtitle="View your personal and employment information.">
      <section className="employee-panel" style={{ padding: 22, display: 'grid', gap: 14 }}>
        {[['Name', employeeName], ['Employee ID', employee.employeeId || employee.id], ['Email', employee.email || '-'], ['Department', employee.department || '-'], ['Team', employee.team || '-'], ['Job Title', employee.jobTitle || '-'], ['Employment Status', employee.employmentStatus || '-'], ['Date Joined', formatDate(employee.dateOfJoining)]].map(([label, value]) => <div key={label} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12 }}><span style={{ color: '#000000' }}>{label}</span><strong>{value}</strong></div>)}
      </section>
    </EmployeeEmptyPage>
  )
}
