'use client'

import { Download } from 'lucide-react'
import jsPDF from 'jspdf'
import EmployeeEmptyPage from '@/components/employee/EmployeeEmptyPage'
import StatusChip from '@/components/employee/StatusChip'
import { formatDate, money, PayrollRecord, useEmployeePortalData } from '../employeeData'

export default function EmployeePayslipsPage() {
  const { employee, employeeName, myPayroll } = useEmployeePortalData()
  const downloadPayslipPdf = (item: PayrollRecord) => {
    const doc = new jsPDF()
    const allowanceTotal = (item.allowanceLines || []).reduce((sum, line) => sum + Number(line.amount || 0), 0)
    const deductionBreakdown = item.deductionBreakdown
    let y = 18

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('Employee Payslip', 14, y)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 150, y)

    y += 12
    doc.setDrawColor(22, 163, 74)
    doc.setLineWidth(0.8)
    doc.line(14, y, 196, y)

    y += 12
    sectionTitle(doc, 'Employee Details', y)
    y += 8
    y = detailRow(doc, y, 'Employee Name', employeeName)
    y = detailRow(doc, y, 'Employee ID', employee.employeeId || employee.id)
    y = detailRow(doc, y, 'Department', employee.department || '-')
    y = detailRow(doc, y, 'Job Title', employee.jobTitle || '-')
    y = detailRow(doc, y, 'Payroll Cycle', item.period)
    y = detailRow(doc, y, 'Pay Date', formatDate(item.paidAt || item.createdAt))
    y = detailRow(doc, y, 'Status', item.status)

    y += 6
    sectionTitle(doc, 'Earnings', y)
    y += 8
    y = moneyRow(doc, y, 'Gross Earnings', item.gross, true)
    if (allowanceTotal > 0) y = moneyRow(doc, y, 'Approved Allowances', allowanceTotal)
    ;(item.allowanceLines || []).forEach(line => {
      y = moneyRow(doc, y, allowanceLabel(line.type), line.amount)
    })

    y += 6
    sectionTitle(doc, 'Deductions', y)
    y += 8
    if (deductionBreakdown) {
      y = moneyRow(doc, y, 'SSS', deductionBreakdown.sss)
      y = moneyRow(doc, y, 'PhilHealth', deductionBreakdown.philHealth)
      y = moneyRow(doc, y, 'Pag-IBIG', deductionBreakdown.pagIbig)
      y = moneyRow(doc, y, 'Tax', deductionBreakdown.tax)
    }
    if (item.loanDeductions?.length) {
      item.loanDeductions.forEach(line => {
        y = moneyRow(doc, y, line.type, line.amount)
      })
    } else {
      y = moneyRow(doc, y, 'Loan / Cash Advance', Number(deductionBreakdown?.loanOrCashAdvance || 0))
    }
    y = moneyRow(doc, y, 'Total Deductions', item.deductions, true)

    y += 8
    doc.setFillColor(236, 253, 245)
    doc.roundedRect(14, y, 182, 18, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(4, 120, 87)
    doc.text('NET PAY', 20, y + 11)
    doc.text(money(item.net), 190, y + 11, { align: 'right' })
    doc.setTextColor(0, 0, 0)

    const filename = `payslip-${(employee.employeeId || employee.id || 'employee').replace(/[^a-z0-9-]+/gi, '-')}-${item.period.replace(/[^a-z0-9-]+/gi, '-')}.pdf`
    doc.save(filename)
  }

  return (
    <EmployeeEmptyPage title="My Payslips" subtitle="View and download payslips generated for your employee profile.">
      <section className="employee-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 18, borderBottom: '1px solid #e2e8f0' }}><h2 style={{ margin: 0, fontSize: 17 }}>Payslips</h2></div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', color: '#000000', fontSize: 12, textAlign: 'left' }}><tr>{['Payroll Cycle', 'Pay Date', 'Gross', 'Allowances', 'Deductions', 'Loan Deductions', 'Net Pay', 'Status', 'Actions'].map(item => <th key={item} style={{ padding: '12px 16px' }}>{item}</th>)}</tr></thead>
            <tbody>{myPayroll.length === 0 ? <tr><td colSpan={9} style={{ padding: 42, textAlign: 'center', color: '#000000' }}>No payslips available yet.</td></tr> : myPayroll.map(item => <tr key={item.id} style={{ borderTop: '1px solid #eef2f7' }}><td style={cell}>{item.period}</td><td style={cell}>{formatDate(item.paidAt || item.createdAt)}</td><td style={cell}>{money(item.gross)}</td><td style={cell}><AllowanceLines item={item} /></td><td style={cell}>{money(item.deductions)}</td><td style={cell}><LoanDeductions item={item} /></td><td style={cell}><strong>{money(item.net)}</strong></td><td style={cell}><StatusChip value={item.status} /></td><td style={cell}><button className="employee-secondary-button" type="button" onClick={() => downloadPayslipPdf(item)}><Download size={15} /> Download PDF</button></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </EmployeeEmptyPage>
  )
}

function sectionTitle(doc: jsPDF, text: string, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text(text, 14, y)
}

function detailRow(doc: jsPDF, y: number, label: string, value: string) {
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(label, 14, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(value || '-', 80, y)
  return y + 6
}

function moneyRow(doc: jsPDF, y: number, label: string, value: number, strong = false) {
  doc.setFontSize(10)
  doc.setFont('helvetica', strong ? 'bold' : 'normal')
  doc.setTextColor(15, 23, 42)
  doc.text(label, 20, y)
  doc.text(money(value), 190, y, { align: 'right' })
  return y + 6
}

function allowanceLabel(type: string) {
  return type.toLowerCase().includes('allowance') ? type : `${type} Allowance`
}

function AllowanceLines({ item }: { item: { allowanceLines?: Array<{ allowanceId: string; type: string; amount: number }> } }) {
  if (item.allowanceLines?.length) {
    return <span style={{ display: 'grid', gap: 4 }}>{item.allowanceLines.map(line => <span key={line.allowanceId}>{line.type}: <strong>{money(line.amount)}</strong></span>)}</span>
  }
  return <span>-</span>
}

function LoanDeductions({ item }: { item: { loanDeductions?: Array<{ loanId: string; type: string; amount: number }>; deductionBreakdown?: { loanOrCashAdvance?: number } } }) {
  if (item.loanDeductions?.length) {
    return <span style={{ display: 'grid', gap: 4 }}>{item.loanDeductions.map(line => <span key={line.loanId}>{line.type}: <strong>{money(line.amount)}</strong></span>)}</span>
  }
  const fallback = Number(item.deductionBreakdown?.loanOrCashAdvance || 0)
  return fallback > 0 ? <span>Loan / Cash Advance: <strong>{money(fallback)}</strong></span> : <span>-</span>
}

const cell = { padding: '14px 16px', fontSize: 13, color: '#0f172a' } as const
