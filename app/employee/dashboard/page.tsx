'use client'

import Link from 'next/link'
import { CalendarDays, Clock3, FileText, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatDate, leaveBalanceFor, money, useEmployeePortalData } from '../employeeData'

function StatCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="employee-card" style={statCardStyle}>
      <div style={statIconStyle}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={statLabelStyle}>{label}</div>
        <strong style={statValueStyle}>{value}</strong>
        <span style={statSubStyle}>{sub}</span>
      </div>
    </div>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <div style={emptyLineStyle}>{text}</div>
}

function PanelTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div style={panelTitleStyle}>
      <h2 style={sectionTitleStyle}>{title}</h2>
      {action}
    </div>
  )
}

export default function EmployeeDashboardPage() {
  const { employeeName, myAttendance, myLeaveRequests, myPayroll, announcements, holidays } = useEmployeePortalData()
  const balances = leaveBalanceFor(myLeaveRequests)
  const remainingLeave = balances.find(item => item.type === 'Annual Leave')?.remaining || 0
  const pendingRequests = myLeaveRequests.filter(item => item.status === 'Pending').length
  const present = myAttendance.filter(item => item.status === 'Present' || item.status === 'Late').length
  const attendanceRate = myAttendance.length ? Math.round((present / myAttendance.length) * 100) : 0
  const overtimeMinutes = myAttendance.reduce((sum, item) => {
    if (!item.clockIn || !item.clockOut) return sum
    const [inH, inM] = item.clockIn.split(':').map(Number)
    const [outH, outM] = item.clockOut.split(':').map(Number)
    const minutes = (outH * 60 + outM) - (inH * 60 + inM) - (item.breakMinutes || 0)
    return sum + Math.max(0, minutes - 480)
  }, 0)
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const pendingLeaveRequests = myLeaveRequests.filter(item => item.status === 'Pending')
  const latestPayroll = myPayroll[0]

  return (
    <div className="employee-page" style={pageShellStyle}>
      <div className="employee-page-header">
        <div>
          <h1>Good day, {employeeName.split(' ')[0] || 'Employee'}.</h1>
          <p>Here is your personal HR workspace. Only your own records are shown here.</p>
        </div>
        <div style={datePillStyle}>
          <CalendarDays size={16} /> {currentDate}
        </div>
      </div>

      <div className="employee-grid">
        <StatCard icon={<ShieldCheck size={24} />} label="Attendance Rate" value={`${attendanceRate}%`} sub={myAttendance.length ? `${myAttendance.length} attendance records` : 'No attendance records yet'} />
        <StatCard icon={<FileText size={24} />} label="Remaining Leave" value={String(remainingLeave)} sub="annual leave days available" />
        <StatCard icon={<Clock3 size={24} />} label="Overtime Hours" value={`${Math.floor(overtimeMinutes / 60)}h ${String(overtimeMinutes % 60).padStart(2, '0')}m`} sub="from your attendance logs" />
        <StatCard icon={<FileText size={24} />} label="Pending Requests" value={String(pendingRequests)} sub="leave requests pending" />
      </div>

      <div style={primaryGridStyle}>
        <section className="employee-panel" style={mainPanelStyle}>
          <PanelTitle
            title="Leave Balance"
            action={<Link href="/employee/leave-requests" style={greenActionStyle}>View all</Link>}
          />
          <div style={balanceListStyle}>
            {balances.map(item => (
              <div key={item.type}>
                <div style={balanceHeaderStyle}>
                  <span>{item.type}</span>
                  <span>{item.remaining} / {item.limit} Days</span>
                </div>
                <div style={progressTrackStyle}>
                  <div style={{ width: `${Math.max(0, (item.remaining / item.limit) * 100)}%`, height: '100%', background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="employee-panel" style={sidePanelStyle}>
          <PanelTitle title="Quick Actions" />
          <div style={quickActionsStyle}>
            <Link className="employee-secondary-button" href="/employee/leave-requests/new">Apply Leave</Link>
            <Link className="employee-secondary-button" href="/employee/attendance">View Attendance</Link>
            <Link className="employee-secondary-button" href="/employee/payslips">Download Payslip</Link>
            <Link className="employee-secondary-button" href="/employee/documents">Upload Document</Link>
          </div>
        </section>
      </div>

      <div style={bottomGridStyle}>
        <section className="employee-panel" style={summaryPanelStyle}>
          <PanelTitle title="Pending Requests" />
          {pendingLeaveRequests.length === 0 ? <EmptyLine text="No pending leave requests." /> : (
            <div style={compactListStyle}>
              {pendingLeaveRequests.slice(0, 3).map(item => (
                <div key={item.id} style={listRowStyle}>
                  <strong>{item.leaveType}</strong>
                  <span style={pendingBadgeStyle}>Pending</span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="employee-panel" style={summaryPanelStyle}>
          <PanelTitle title="Recent Payslips" />
          {!latestPayroll ? <EmptyLine text="No payslips available yet." /> : (
            <div style={payslipPreviewStyle}>
              <span style={payslipPeriodStyle}>{latestPayroll.period}</span>
              <strong style={payslipAmountStyle}>{money(latestPayroll.net)}</strong>
            </div>
          )}
        </section>
        <section className="employee-panel" style={summaryPanelStyle}>
          <PanelTitle title="Upcoming Holidays" />
          {holidays.length === 0 ? <EmptyLine text="No holidays have been published yet." /> : (
            <div style={compactListStyle}>
              {holidays.slice(0, 3).map(item => <div key={item.id} style={simpleRowStyle}><strong>{item.name}</strong><span>{formatDate(item.date)}</span></div>)}
            </div>
          )}
        </section>
        <section className="employee-panel" style={summaryPanelStyle}>
          <PanelTitle title="Company Announcements" />
          {announcements.length === 0 ? <EmptyLine text="No announcements posted yet." /> : (
            <div style={compactListStyle}>
              {announcements.slice(0, 3).map(item => <div key={item.id} style={simpleRowStyle}><strong>{item.title}</strong><span>{formatDate(item.createdAt)}</span></div>)}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

const pageShellStyle = { background: '#f4f8f5' } as const
const datePillStyle = { display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontWeight: 850, fontSize: 13, whiteSpace: 'nowrap' } as const
const statCardStyle = { minHeight: 108, padding: 18, display: 'flex', gap: 14, alignItems: 'center', borderRadius: 9, boxShadow: 'none' } as const
const statIconStyle = { width: 48, height: 48, borderRadius: 14, background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center', flexShrink: 0 } as const
const statLabelStyle = { color: '#334155', fontSize: 13, fontWeight: 850 } as const
const statValueStyle = { display: 'block', marginTop: 4, color: '#020617', fontSize: 26, lineHeight: 1.05 } as const
const statSubStyle = { display: 'block', marginTop: 6, color: '#000000', fontSize: 12 } as const
const primaryGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16, marginTop: 18, alignItems: 'stretch' } as const
const mainPanelStyle = { padding: 20, minHeight: 266 } as const
const sidePanelStyle = { padding: 20, minHeight: 266 } as const
const panelTitleStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 } as const
const sectionTitleStyle = { margin: 0, color: '#0f172a', fontSize: 18, lineHeight: 1.2 } as const
const greenActionStyle = { color: '#16a34a', fontSize: 13, fontWeight: 900, textDecoration: 'none' } as const
const balanceListStyle = { display: 'grid', gap: 18, marginTop: 18 } as const
const balanceHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, color: '#020617', fontSize: 13, fontWeight: 900 } as const
const progressTrackStyle = { height: 7, borderRadius: 99, background: '#e5e7eb', marginTop: 8, overflow: 'hidden' } as const
const quickActionsStyle = { display: 'grid', gap: 10, marginTop: 16 } as const
const bottomGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginTop: 16 } as const
const summaryPanelStyle = { padding: 20, minHeight: 130 } as const
const emptyLineStyle = { minHeight: 62, display: 'grid', placeItems: 'center', color: '#000000', fontSize: 13, textAlign: 'center' as const } as const
const compactListStyle = { display: 'grid', gap: 12, marginTop: 14 } as const
const listRowStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12, fontSize: 13 } as const
const simpleRowStyle = { display: 'grid', gap: 4, borderTop: '1px solid #f1f5f9', paddingTop: 12, fontSize: 13, color: '#0f172a' } as const
const pendingBadgeStyle = { color: '#d97706', background: '#fef3c7', borderRadius: 999, padding: '3px 8px', fontWeight: 900, fontSize: 12 } as const
const payslipPreviewStyle = { display: 'grid', gap: 6, marginTop: 22, color: '#0f172a', lineHeight: 1.25 } as const
const payslipPeriodStyle = { fontSize: 14 } as const
const payslipAmountStyle = { fontSize: 16 } as const
