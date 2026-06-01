'use client'

import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  CalendarDays,
  Download,
  FileBarChart,
  FileSpreadsheet,
  Filter,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react'

type HrReport = {
  id: string
  name: string
  summary?: string
  category?: string
  department?: string
  location?: string
  leaveType?: string
  payrollGroup?: string
  reviewPeriod?: string
  complianceType?: string
  dataSource?: string
  lastRunAt?: string
  type?: string
  generatedBy?: string
  createdAt?: string
  format?: string
  downloads?: number
  status?: string
  source?: string
}

type ScheduledReport = {
  id: string
  name: string
  nextRun?: string
  active?: boolean
  source?: string
}

type ReportInsight = {
  id: string
  title: string
  description?: string
  source?: string
}

type ReportActionHandlers = {
  onExport: (format: string, report?: HrReport) => void
  onSchedule: (report?: HrReport) => void
  onRunReport: (report: HrReport) => void
}

const font = "var(--font-body)"
const reportsKey = 'flowsys-hr-reports'
const scheduledReportsKey = 'flowsys-hr-scheduled-reports'
const reportExportsKey = 'flowsys-hr-report-exports'
const reportInsightsKey = 'flowsys-hr-report-insights'
const realSources = new Set(['manual', 'imported', 'generated', 'report'])
const hrReportCategories = [
  'Employee Analytics',
  'Workforce Overview',
  'Employee Lifecycle',
  'Compensation & Benefits',
  'Diversity & Inclusion',
  'Compliance & Others',
]
const payrollReportCategories = [
  'Payroll Summary',
  'Payslip',
  'Analysis',
  'Deductions',
  'Overtime',
  'Remittance',
  'Bonus',
  'Variance',
]
const attendanceReportCategories = [
  'Attendance Summary',
  'Daily Attendance',
  'Late & Absenteeism',
  'Overtime Summary',
  'Attendance by Department',
  'Attendance Exception',
  'Biometric Logs',
  'Raw Biometric Logs',
]
const leaveReportCategories = [
  'Leave Summary',
  'Employee Leave Balance',
  'Leave Utilization',
  'Leave Approval',
  'Leave by Department',
  'Leave Encashment',
  'Long Leave',
  'Leave Without Pay',
]
const performanceReportCategories = [
  'Performance Summary',
  'Department Performance',
  'Manager Effectiveness',
  'Goal Achievement',
  'Performance Rating',
  'High Potential Talent',
  'PIP Progress',
  '360 Feedback',
]
const complianceReportCategories = [
  'SSS Contribution',
  'PhilHealth Contribution',
  'Pag-IBIG Contribution',
  'Withholding Tax',
  '13th Month Pay Compliance',
  'DOLE Report',
  'Labor Law Compliance',
  'Data Privacy Compliance',
]
const customReportCategories = [
  'Custom',
  'HR',
  'Payroll',
  'Leave',
  'Attendance',
  'Performance',
]

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function isRealRecord(record: { source?: string }) {
  return Boolean(record.source && realSources.has(record.source))
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function HrReportsPage() {
  const [reports, setReports] = useState<HrReport[]>([])
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([])
  const [exportsLog, setExportsLog] = useState<HrReport[]>([])
  const [insights, setInsights] = useState<ReportInsight[]>([])
  const [activeTab, setActiveTab] = useState('All Reports')
  const [category, setCategory] = useState('All Categories')
  const [type, setType] = useState('All Types')
  const [department, setDepartment] = useState('All Departments')
  const [location, setLocation] = useState('All Locations')
  const [leaveType, setLeaveType] = useState('All Leave Types')
  const [payrollGroup, setPayrollGroup] = useState('All Payroll Groups')
  const [reviewPeriod, setReviewPeriod] = useState('All Periods')
  const [complianceType, setComplianceType] = useState('All Compliance Types')
  const [dataSource, setDataSource] = useState('All Data Sources')
  const [createdBy, setCreatedBy] = useState('All Users')
  const [dateRange, setDateRange] = useState('Current Period')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [isCreateReportOpen, setIsCreateReportOpen] = useState(false)
  const [newReport, setNewReport] = useState({
    name: '',
    category: 'Custom',
    type: 'Custom Report',
    dataSource: 'Employee Records',
    summary: '',
    format: 'PDF',
  })
  const setPageNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 4000)
  }

  useEffect(() => {
    const load = () => {
      setReports(loadStored<HrReport[]>(reportsKey, []).filter(isRealRecord))
      setScheduledReports(loadStored<ScheduledReport[]>(scheduledReportsKey, []).filter(isRealRecord))
      setExportsLog(loadStored<HrReport[]>(reportExportsKey, []).filter(isRealRecord))
      setInsights(loadStored<ReportInsight[]>(reportInsightsKey, []).filter(isRealRecord))
    }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [])

  useEffect(() => {
    const handleAction = (event: Event) => {
      const action = (event as CustomEvent<string>).detail || ''
      if (action.toLowerCase().includes('create')) {
        setIsCreateReportOpen(true)
        return
      }
      setPageNotice(`${action} is ready from the report workspace.`)
    }
    window.addEventListener('hr-report-action', handleAction)
    return () => window.removeEventListener('hr-report-action', handleAction)
  }, [])

  const hrReports = reports.filter(report => isHrReport(report))
  const payrollReports = reports.filter(report => isPayrollReport(report))
  const attendanceReports = reports.filter(report => isAttendanceReport(report))
  const leaveReports = reports.filter(report => isLeaveReport(report))
  const performanceReports = reports.filter(report => isPerformanceReport(report))
  const complianceReports = reports.filter(report => isComplianceReport(report))
  const customReports = reports.filter(report => isCustomReport(report))
  const activeReports = activeTab === 'HR Reports'
    ? hrReports
    : activeTab === 'Payroll Reports'
      ? payrollReports
      : activeTab === 'Attendance Reports'
        ? attendanceReports
        : activeTab === 'Leave Reports'
          ? leaveReports
          : activeTab === 'Performance Reports'
            ? performanceReports
            : activeTab === 'Compliance Reports'
              ? complianceReports
              : activeTab === 'Custom Reports'
                ? customReports
        : reports
  const categories = useMemo(() => ['All Categories', ...Array.from(new Set(activeReports.map(report => report.category).filter(Boolean))) as string[]], [activeReports])
  const types = useMemo(() => ['All Types', ...Array.from(new Set(activeReports.map(report => report.type).filter(Boolean))) as string[]], [activeReports])
  const departments = useMemo(() => ['All Departments', ...Array.from(new Set(activeReports.map(report => report.department).filter(Boolean))) as string[]], [activeReports])
  const locations = useMemo(() => ['All Locations', ...Array.from(new Set(attendanceReports.map(report => report.location).filter(Boolean))) as string[]], [attendanceReports])
  const leaveTypes = useMemo(() => ['All Leave Types', ...Array.from(new Set(leaveReports.map(report => report.leaveType || report.type).filter(Boolean))) as string[]], [leaveReports])
  const reviewPeriods = useMemo(() => ['All Periods', ...Array.from(new Set(performanceReports.map(report => report.reviewPeriod).filter(Boolean))) as string[]], [performanceReports])
  const complianceTypes = useMemo(() => ['All Compliance Types', ...Array.from(new Set(complianceReports.map(report => report.complianceType || report.type).filter(Boolean))) as string[]], [complianceReports])
  const dataSources = useMemo(() => ['All Data Sources', ...Array.from(new Set(customReports.map(report => report.dataSource).filter(Boolean))) as string[]], [customReports])
  const payrollGroups = useMemo(() => ['All Payroll Groups', ...Array.from(new Set(payrollReports.map(report => report.payrollGroup).filter(Boolean))) as string[]], [payrollReports])
  const creators = useMemo(() => ['All Users', ...Array.from(new Set(activeReports.map(report => report.generatedBy).filter(Boolean))) as string[]], [activeReports])
  const generatedThisMonth = useMemo(() => {
    const now = new Date()
    return reports.filter(report => {
      const date = new Date(report.createdAt || '')
      return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).length
  }, [reports])
  const pendingReports = reports.filter(report => report.status === 'Pending' || report.status === 'In Progress').length
  const filteredHrReports = hrReports.filter(report => {
    const matchesCategory = category === 'All Categories' || report.category === category
    const matchesType = type === 'All Types' || report.type === type
    const matchesDepartment = department === 'All Departments' || report.department === department
    const matchesCreator = createdBy === 'All Users' || report.generatedBy === createdBy
    const matchesQuery = !query.trim() || `${report.name} ${report.summary || ''} ${report.category || ''} ${report.department || ''}`.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesType && matchesDepartment && matchesCreator && matchesQuery
  })
  const filteredPayrollReports = payrollReports.filter(report => {
    const matchesCategory = category === 'All Categories' || report.category === category
    const matchesType = type === 'All Types' || report.type === type
    const matchesPayrollGroup = payrollGroup === 'All Payroll Groups' || report.payrollGroup === payrollGroup
    const matchesDepartment = department === 'All Departments' || report.department === department
    const matchesQuery = !query.trim() || `${report.name} ${report.summary || ''} ${report.category || ''} ${report.payrollGroup || ''} ${report.department || ''}`.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesType && matchesPayrollGroup && matchesDepartment && matchesQuery
  })
  const filteredAttendanceReports = attendanceReports.filter(report => {
    const matchesCategory = category === 'All Categories' || report.category === category
    const matchesType = type === 'All Types' || report.type === type
    const matchesDepartment = department === 'All Departments' || report.department === department
    const matchesLocation = location === 'All Locations' || report.location === location
    const matchesQuery = !query.trim() || `${report.name} ${report.summary || ''} ${report.category || ''} ${report.department || ''} ${report.location || ''}`.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesType && matchesDepartment && matchesLocation && matchesQuery
  })
  const filteredLeaveReports = leaveReports.filter(report => {
    const matchesCategory = category === 'All Categories' || report.category === category
    const matchesType = type === 'All Types' || report.type === type
    const matchesLeaveType = leaveType === 'All Leave Types' || report.leaveType === leaveType || report.type === leaveType
    const matchesDepartment = department === 'All Departments' || report.department === department
    const matchesQuery = !query.trim() || `${report.name} ${report.summary || ''} ${report.category || ''} ${report.leaveType || ''} ${report.department || ''}`.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesType && matchesLeaveType && matchesDepartment && matchesQuery
  })
  const filteredPerformanceReports = performanceReports.filter(report => {
    const matchesCategory = category === 'All Categories' || report.category === category
    const matchesType = type === 'All Types' || report.type === type
    const matchesReviewPeriod = reviewPeriod === 'All Periods' || report.reviewPeriod === reviewPeriod
    const matchesDepartment = department === 'All Departments' || report.department === department
    const matchesCreator = createdBy === 'All Users' || report.generatedBy === createdBy
    const matchesQuery = !query.trim() || `${report.name} ${report.summary || ''} ${report.category || ''} ${report.reviewPeriod || ''} ${report.department || ''}`.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesType && matchesReviewPeriod && matchesDepartment && matchesCreator && matchesQuery
  })
  const filteredComplianceReports = complianceReports.filter(report => {
    const matchesCategory = category === 'All Categories' || report.category === category
    const matchesType = type === 'All Types' || report.type === type
    const matchesComplianceType = complianceType === 'All Compliance Types' || report.complianceType === complianceType || report.type === complianceType
    const matchesDepartment = department === 'All Departments' || report.department === department
    const matchesQuery = !query.trim() || `${report.name} ${report.summary || ''} ${report.category || ''} ${report.complianceType || ''} ${report.department || ''}`.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesType && matchesComplianceType && matchesDepartment && matchesQuery
  })
  const filteredCustomReports = customReports.filter(report => {
    const matchesCategory = category === 'All Categories' || report.category === category
    const matchesDataSource = dataSource === 'All Data Sources' || report.dataSource === dataSource
    const matchesCreator = createdBy === 'All Users' || report.generatedBy === createdBy
    const matchesQuery = !query.trim() || `${report.name} ${report.summary || ''} ${report.category || ''} ${report.dataSource || ''}`.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesDataSource && matchesCreator && matchesQuery
  })
  const activeScheduledReports = activeTab === 'HR Reports'
    ? scheduledReports.filter(report => report.name.toLowerCase().includes('hr'))
    : activeTab === 'Payroll Reports'
      ? scheduledReports.filter(report => report.name.toLowerCase().includes('payroll'))
      : activeTab === 'Attendance Reports'
        ? scheduledReports.filter(report => report.name.toLowerCase().includes('attendance') || report.name.toLowerCase().includes('absenteeism') || report.name.toLowerCase().includes('overtime') || report.name.toLowerCase().includes('shift'))
        : activeTab === 'Leave Reports'
          ? scheduledReports.filter(report => report.name.toLowerCase().includes('leave') || report.name.toLowerCase().includes('lwp') || report.name.toLowerCase().includes('pto'))
        : activeTab === 'Performance Reports'
          ? scheduledReports.filter(report => report.name.toLowerCase().includes('performance') || report.name.toLowerCase().includes('goal') || report.name.toLowerCase().includes('review') || report.name.toLowerCase().includes('talent'))
        : activeTab === 'Compliance Reports'
          ? scheduledReports.filter(report => report.name.toLowerCase().includes('compliance') || report.name.toLowerCase().includes('sss') || report.name.toLowerCase().includes('philhealth') || report.name.toLowerCase().includes('pag-ibig') || report.name.toLowerCase().includes('bir') || report.name.toLowerCase().includes('dole'))
        : activeTab === 'Custom Reports'
          ? scheduledReports.filter(report => report.name.toLowerCase().includes('custom'))
        : scheduledReports
  const activeExportsLog = activeTab === 'HR Reports'
    ? exportsLog.filter(report => isHrReport(report))
    : activeTab === 'Payroll Reports'
      ? exportsLog.filter(report => isPayrollReport(report))
      : activeTab === 'Attendance Reports'
        ? exportsLog.filter(report => isAttendanceReport(report))
        : activeTab === 'Leave Reports'
          ? exportsLog.filter(report => isLeaveReport(report))
        : activeTab === 'Performance Reports'
          ? exportsLog.filter(report => isPerformanceReport(report))
        : activeTab === 'Compliance Reports'
          ? exportsLog.filter(report => isComplianceReport(report))
        : activeTab === 'Custom Reports'
          ? exportsLog.filter(report => isCustomReport(report))
        : exportsLog
  const activeInsights = activeTab === 'HR Reports'
    ? insights.filter(insight => insight.title.toLowerCase().includes('hr') || insight.description?.toLowerCase().includes('hr'))
    : activeTab === 'Payroll Reports'
      ? insights.filter(insight => insight.title.toLowerCase().includes('payroll') || insight.description?.toLowerCase().includes('payroll'))
      : activeTab === 'Attendance Reports'
        ? insights.filter(insight => insight.title.toLowerCase().includes('attendance') || insight.description?.toLowerCase().includes('attendance') || insight.title.toLowerCase().includes('absenteeism') || insight.description?.toLowerCase().includes('absenteeism') || insight.title.toLowerCase().includes('overtime') || insight.description?.toLowerCase().includes('overtime'))
        : activeTab === 'Leave Reports'
          ? insights.filter(insight => insight.title.toLowerCase().includes('leave') || insight.description?.toLowerCase().includes('leave') || insight.title.toLowerCase().includes('lwp') || insight.description?.toLowerCase().includes('lwp'))
        : activeTab === 'Performance Reports'
          ? insights.filter(insight => insight.title.toLowerCase().includes('performance') || insight.description?.toLowerCase().includes('performance') || insight.title.toLowerCase().includes('goal') || insight.description?.toLowerCase().includes('goal') || insight.title.toLowerCase().includes('review') || insight.description?.toLowerCase().includes('review'))
        : activeTab === 'Compliance Reports'
          ? insights.filter(insight => insight.title.toLowerCase().includes('compliance') || insight.description?.toLowerCase().includes('compliance') || insight.title.toLowerCase().includes('sss') || insight.description?.toLowerCase().includes('sss') || insight.title.toLowerCase().includes('philhealth') || insight.description?.toLowerCase().includes('philhealth') || insight.title.toLowerCase().includes('bir') || insight.description?.toLowerCase().includes('bir'))
        : activeTab === 'Custom Reports'
          ? insights.filter(insight => insight.title.toLowerCase().includes('custom') || insight.description?.toLowerCase().includes('custom') || insight.title.toLowerCase().includes('report usage') || insight.description?.toLowerCase().includes('report usage'))
        : insights
  const activeGeneratedThisMonth = useMemo(() => {
    const now = new Date()
    return activeReports.filter(report => {
      const date = new Date(report.createdAt || '')
      return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).length
  }, [activeReports])
  const activePendingReports = activeReports.filter(report => report.status === 'Pending' || report.status === 'In Progress').length
  const reportAreaLabel = activeTab === 'HR Reports' ? 'HR' : activeTab === 'Payroll Reports' ? 'Payroll' : activeTab === 'Attendance Reports' ? 'Attendance' : activeTab === 'Leave Reports' ? 'Leave' : activeTab === 'Performance Reports' ? 'Performance' : activeTab === 'Compliance Reports' ? 'Compliance' : activeTab === 'Custom Reports' ? 'Custom' : ''
  const filteredReports = reports.filter(report => {
    const matchesTab = activeTab === 'All Reports' || report.category === activeTab.replace(' Reports', '')
    const matchesCategory = category === 'All Categories' || report.category === category
    const matchesType = type === 'All Types' || report.type === type
    const matchesCreator = createdBy === 'All Users' || report.generatedBy === createdBy
    const matchesQuery = !query.trim() || `${report.name} ${report.summary || ''} ${report.category || ''}`.toLowerCase().includes(query.toLowerCase())
    return matchesTab && matchesCategory && matchesType && matchesCreator && matchesQuery
  })
  const clearFilters = () => {
    setCategory('All Categories')
    setType('All Types')
    setDepartment('All Departments')
    setLocation('All Locations')
    setLeaveType('All Leave Types')
    setPayrollGroup('All Payroll Groups')
    setReviewPeriod('All Periods')
    setComplianceType('All Compliance Types')
    setDataSource('All Data Sources')
    setCreatedBy('All Users')
    setDateRange('Current Period')
    setQuery('')
  }
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setNotice('')
    clearFilters()
  }
  const updateNewReport = (field: keyof typeof newReport, value: string) => {
    setNewReport(current => ({ ...current, [field]: value }))
  }
  const closeCreateReport = () => {
    setIsCreateReportOpen(false)
    setNewReport({
      name: '',
      category: 'Custom',
      type: 'Custom Report',
      dataSource: 'Employee Records',
      summary: '',
      format: 'PDF',
    })
  }
  const handleCreateReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = newReport.name.trim()
    if (!name) return

    const createdAt = new Date().toISOString()
    const report: HrReport = {
      id: `hr-report-${reports.length + 1}-${createdAt.replace(/\D/g, '')}`,
      name,
      summary: newReport.summary.trim() || `${newReport.type} created from ${newReport.dataSource}.`,
      category: newReport.category,
      type: newReport.type,
      dataSource: newReport.dataSource,
      generatedBy: 'HR Admin',
      createdAt,
      format: newReport.format,
      downloads: 0,
      status: 'Ready',
      source: 'manual',
    }
    const nextReports = [report, ...reports]
    setReports(nextReports)
    window.localStorage.setItem(reportsKey, JSON.stringify(nextReports))
    setActiveTab('Custom Reports')
    setCategory('All Categories')
    setType('All Types')
    setCreatedBy('All Users')
    setDataSource('All Data Sources')
    setQuery('')
    closeCreateReport()
    setPageNotice(`${report.name} was created and saved to Custom Reports.`)
  }
  const handleApplyFilters = () => {
    setPageNotice(`${activeReports.length} ${reportAreaLabel || 'total'} report${activeReports.length === 1 ? '' : 's'} match the current view.`)
  }
  const persistReports = (nextReports: HrReport[]) => {
    setReports(nextReports)
    window.localStorage.setItem(reportsKey, JSON.stringify(nextReports))
  }
  const persistExports = (nextExports: HrReport[]) => {
    setExportsLog(nextExports)
    window.localStorage.setItem(reportExportsKey, JSON.stringify(nextExports))
  }
  const persistSchedules = (nextSchedules: ScheduledReport[]) => {
    setScheduledReports(nextSchedules)
    window.localStorage.setItem(scheduledReportsKey, JSON.stringify(nextSchedules))
  }
  const handleExport = (format: string, report?: HrReport) => {
    const createdAt = new Date().toISOString()
    const exportRecord: HrReport = {
      id: `hr-export-${exportsLog.length + 1}-${createdAt.replace(/\D/g, '')}`,
      name: report?.name || `${reportAreaLabel || activeTab.replace(' Reports', '') || 'HR'} ${format} Export`,
      summary: report?.summary || `Exported from ${activeTab}.`,
      category: report?.category || (reportAreaLabel ? `${reportAreaLabel} Reports` : 'Custom'),
      type: report?.type || 'Export',
      dataSource: report?.dataSource || 'Filtered Reports',
      generatedBy: 'HR Admin',
      createdAt,
      format,
      downloads: 1,
      status: 'Complete',
      source: 'generated',
    }
    persistExports([exportRecord, ...exportsLog])
    if (report) {
      persistReports(reports.map(item => item.id === report.id ? { ...item, downloads: (item.downloads ?? 0) + 1, lastRunAt: createdAt } : item))
    }
    setPageNotice(`${format} export is ready for ${exportRecord.name}.`)
  }
  const handleSchedule = (report?: HrReport) => {
    const scheduledAt = new Date().toISOString()
    const nextRun = new Date()
    nextRun.setDate(nextRun.getDate() + 7)
    const schedule: ScheduledReport = {
      id: `hr-schedule-${scheduledReports.length + 1}-${scheduledAt.replace(/\D/g, '')}`,
      name: report?.name || `${reportAreaLabel || 'Custom'} Report Schedule`,
      nextRun: nextRun.toISOString(),
      active: true,
      source: 'manual',
    }
    persistSchedules([schedule, ...scheduledReports])
    setPageNotice(`${schedule.name} was scheduled for next week.`)
  }
  const handleRunReport = (report: HrReport) => {
    persistReports(reports.map(item => item.id === report.id ? { ...item, status: 'Complete', lastRunAt: new Date().toISOString() } : item))
    setPageNotice(`${report.name} was run successfully.`)
  }

  return (
    <section className="hr-module-page hr-reports-page" style={{ fontFamily: font }}>
      <div className="hr-reports-hero" style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>Reports</h1>
          <p style={pageSubtitleStyle}>Access, analyze, and export business reports across your organization.</p>
        </div>
        <div className="hr-reports-toolbar" style={toolbarStyle}>
          <label className="hr-reports-search" style={searchBoxStyle}>
            <Search size={15} color="#94a3b8" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search reports..." style={plainInputStyle} />
          </label>
          <button type="button" style={primaryButtonStyle} onClick={() => setIsCreateReportOpen(true)}><Plus size={15} /> Create Report</button>
        </div>
      </div>

      <div className="hr-reports-metrics" style={metricGridStyle}>
        <Metric icon={FileBarChart} label={reportAreaLabel ? `Total ${reportAreaLabel} Reports` : 'Total Reports'} value={activeReports.length} sub="Real reports only" color="#16a34a" bg="#dcfce7" />
        <Metric icon={FileSpreadsheet} label="Generated This Month" value={reportAreaLabel ? activeGeneratedThisMonth : generatedThisMonth} sub="Current month" color="#16a34a" bg="#dcfce7" />
        <Metric icon={CalendarDays} label="Scheduled Reports" value={activeScheduledReports.length} sub="Real schedules only" color="#7c3aed" bg="#ede9fe" />
        <Metric icon={Download} label="Exports" value={activeExportsLog.length} sub="Real export history" color="#ea580c" bg="#ffedd5" />
        <Metric icon={CalendarDays} label="Pending Reports" value={reportAreaLabel ? activePendingReports : pendingReports} sub="Waiting to finish" color="#f59e0b" bg="#fef3c7" />
      </div>

      <div className="hr-reports-tabs" style={tabsStyle}>
        {['All Reports', 'HR Reports', 'Payroll Reports', 'Attendance Reports', 'Leave Reports', 'Performance Reports', 'Compliance Reports', 'Custom Reports'].map(tab => (
          <button key={tab} onClick={() => handleTabChange(tab)} style={tabStyle(activeTab === tab)}>{tab}</button>
        ))}
      </div>

      <div className="hr-reports-filterbar" style={filterBarStyle}>
        <SelectFilter value={category} onChange={setCategory} label="Report Category" options={categories} />
        <SelectFilter value={type} onChange={setType} label="Report Type" options={types} />
        {activeTab === 'Payroll Reports' && <SelectFilter value={payrollGroup} onChange={setPayrollGroup} label="Payroll Group" options={payrollGroups} />}
        {activeTab === 'HR Reports' && <SelectFilter value={department} onChange={setDepartment} label="Department" options={departments} />}
        {activeTab === 'Payroll Reports' && <SelectFilter value={department} onChange={setDepartment} label="Department" options={departments} />}
        {activeTab === 'Attendance Reports' && <SelectFilter value={department} onChange={setDepartment} label="Department" options={departments} />}
        {activeTab === 'Attendance Reports' && <SelectFilter value={location} onChange={setLocation} label="Location" options={locations} />}
        {activeTab === 'Leave Reports' && <SelectFilter value={leaveType} onChange={setLeaveType} label="Leave Type" options={leaveTypes} />}
        {activeTab === 'Leave Reports' && <SelectFilter value={department} onChange={setDepartment} label="Department" options={departments} />}
        {activeTab === 'Performance Reports' && <SelectFilter value={reviewPeriod} onChange={setReviewPeriod} label="Review Period" options={reviewPeriods} />}
        {activeTab === 'Performance Reports' && <SelectFilter value={department} onChange={setDepartment} label="Department" options={departments} />}
        {activeTab === 'Performance Reports' && <SelectFilter value={createdBy} onChange={setCreatedBy} label="Created By" options={creators} />}
        {activeTab === 'Compliance Reports' && <SelectFilter value={complianceType} onChange={setComplianceType} label="Compliance Type" options={complianceTypes} />}
        {activeTab === 'Compliance Reports' && <SelectFilter value={department} onChange={setDepartment} label="Department" options={departments} />}
        {activeTab === 'Custom Reports' && <SelectFilter value={createdBy} onChange={setCreatedBy} label="Created By" options={creators} />}
        {activeTab === 'Custom Reports' && <SelectFilter value={dataSource} onChange={setDataSource} label="Data Source" options={dataSources} />}
        {activeTab !== 'Payroll Reports' && activeTab !== 'Attendance Reports' && activeTab !== 'Leave Reports' && activeTab !== 'Performance Reports' && activeTab !== 'Compliance Reports' && activeTab !== 'Custom Reports' && <SelectFilter value={createdBy} onChange={setCreatedBy} label="Created By" options={creators} />}
        <SelectFilter value={dateRange} onChange={setDateRange} label="Date Range" options={['Current Period']} />
        <button type="button" style={secondaryButtonStyle} onClick={handleApplyFilters}><Filter size={15} /> Filters</button>
        {(activeTab === 'Payroll Reports' || activeTab === 'Attendance Reports' || activeTab === 'Leave Reports' || activeTab === 'Performance Reports' || activeTab === 'Compliance Reports' || activeTab === 'Custom Reports') && <button style={linkButtonStyle} onClick={clearFilters}>Clear All</button>}
      </div>
      {notice && <div style={noticeStyle}>{notice}</div>}

      {activeTab === 'HR Reports' ? (
        <HrReportsView
          reports={filteredHrReports}
          allReports={hrReports}
          scheduledReports={activeScheduledReports}
          insights={activeInsights}
          onExport={handleExport}
          onSchedule={handleSchedule}
          onRunReport={handleRunReport}
        />
      ) : activeTab === 'Payroll Reports' ? (
        <PayrollReportsView
          reports={filteredPayrollReports}
          allReports={payrollReports}
          scheduledReports={activeScheduledReports}
          insights={activeInsights}
          onExport={handleExport}
          onSchedule={handleSchedule}
          onRunReport={handleRunReport}
        />
      ) : activeTab === 'Attendance Reports' ? (
        <AttendanceReportsView
          reports={filteredAttendanceReports}
          allReports={attendanceReports}
          scheduledReports={activeScheduledReports}
          insights={activeInsights}
          onExport={handleExport}
          onSchedule={handleSchedule}
          onRunReport={handleRunReport}
        />
      ) : activeTab === 'Leave Reports' ? (
        <LeaveReportsView
          reports={filteredLeaveReports}
          allReports={leaveReports}
          scheduledReports={activeScheduledReports}
          insights={activeInsights}
          onExport={handleExport}
          onSchedule={handleSchedule}
          onRunReport={handleRunReport}
        />
      ) : activeTab === 'Performance Reports' ? (
        <PerformanceReportsView
          reports={filteredPerformanceReports}
          allReports={performanceReports}
          scheduledReports={activeScheduledReports}
          insights={activeInsights}
          onExport={handleExport}
          onSchedule={handleSchedule}
          onRunReport={handleRunReport}
        />
      ) : activeTab === 'Compliance Reports' ? (
        <ComplianceReportsView
          reports={filteredComplianceReports}
          allReports={complianceReports}
          scheduledReports={activeScheduledReports}
          insights={activeInsights}
          onExport={handleExport}
          onSchedule={handleSchedule}
          onRunReport={handleRunReport}
        />
      ) : activeTab === 'Custom Reports' ? (
        <CustomReportsView
          reports={filteredCustomReports}
          allReports={customReports}
          scheduledReports={activeScheduledReports}
          insights={activeInsights}
          onExport={handleExport}
          onSchedule={handleSchedule}
          onRunReport={handleRunReport}
        />
      ) : (
        <>
      <div className="hr-reports-workspace" style={reportsGridStyle}>
        <section style={mainCardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Reports Library</h2>
          </div>
          {filteredReports.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Report Name</Th>
                    <Th>Category</Th>
                    <Th>Generated By</Th>
                    <Th>Created Date</Th>
                    <Th>Format</Th>
                    <Th>Downloads</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map(report => (
                    <tr key={report.id}>
                      <Td><strong>{report.name}</strong><small style={cellSubtextStyle}>{report.summary || '-'}</small></Td>
                      <Td>{report.category || '-'}</Td>
                      <Td>{report.generatedBy || '-'}</Td>
                      <Td>{formatDate(report.createdAt)}</Td>
                      <Td>{report.format || '-'}</Td>
                      <Td>{report.downloads ?? 0}</Td>
                      <Td><StatusPill status={report.status || '-'} /></Td>
                      <Td>
                        <span style={actionGroupStyle}>
                          <button style={iconButtonStyle} aria-label={`Download ${report.name}`} onClick={() => handleExport(report.format || 'PDF', report)}><Download size={14} /></button>
                          <button style={iconButtonStyle} aria-label={`Schedule ${report.name}`} onClick={() => handleSchedule(report)}><MoreVertical size={14} /></button>
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel title="No reports yet." text="Generated HR reports will appear here once real report records exist." icon={FileBarChart} />
          )}
        </section>

        <aside style={sidePanelStackStyle}>
          <Panel title="Scheduled Reports" icon={CalendarDays}>
            {scheduledReports.length ? (
              <div style={compactListStyle}>
                {scheduledReports.map(report => (
                  <div key={report.id} style={compactListRowStyle}>
                    <span>{report.name}</span>
                    <b>{formatDate(report.nextRun)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No scheduled reports." text="Scheduled report runs will appear here." icon={CalendarDays} />
            )}
          </Panel>
          <Panel title="AI Insights" icon={Sparkles}>
            {insights.length ? (
              <div style={compactListStyle}>
                {insights.map(insight => (
                  <div key={insight.id} style={recommendationRowStyle}>
                    <strong>{insight.title}</strong>
                    <span>{insight.description || '-'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No report insights yet." text="AI insights will appear after reports are generated." icon={Sparkles} />
            )}
          </Panel>
          <Panel title="Quick Export" icon={Download}>
            <QuickExportActions onExport={handleExport} onSchedule={handleSchedule} />
          </Panel>
        </aside>
      </div>

      <div style={analyticsGridStyle}>
        <Panel title="Reports Usage Trend" icon={BarChart3}>
          <EmptyPanel title="No report usage trend yet." text="Usage charts need real report generation and download history." icon={BarChart3} />
        </Panel>
        <Panel title="Reports by Department" icon={BarChart3}>
          <EmptyPanel title="No department report breakdown yet." text="Department analytics will appear after report metadata exists." icon={BarChart3} />
        </Panel>
        <Panel title="Top Report Types" icon={BarChart3}>
          <EmptyPanel title="No report type analytics yet." text="Top report types will appear when reports are generated." icon={BarChart3} />
        </Panel>
      </div>

      <div style={bottomActionsStyle}>
        <ActionCard title="Create Custom Reports" text="Design custom reports with real HR data." action="Create Custom Report" />
        <ActionCard title="Report Builder" text="Build advanced reports with filters, groups, and calculations." action="Open Report Builder" />
        <ActionCard title="Need Help?" text="Learn how to create, schedule, and share reports." action="View Help Center" />
      </div>
        </>
      )}
      {isCreateReportOpen && (
        <div style={modalBackdropStyle} role="presentation" onMouseDown={closeCreateReport}>
          <form
            style={modalStyle}
            aria-modal="true"
            role="dialog"
            aria-labelledby="create-hr-report-title"
            onMouseDown={event => event.stopPropagation()}
            onSubmit={handleCreateReport}
          >
            <div style={modalHeaderStyle}>
              <div>
                <h2 id="create-hr-report-title" style={{ ...sectionTitleStyle, fontSize: 22 }}>Create Report</h2>
                <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>Build a company report from live HR records.</p>
              </div>
              <button type="button" style={iconCloseButtonStyle} aria-label="Close create report" onClick={closeCreateReport}>
                <X size={18} />
              </button>
            </div>

            <div style={modalBodyStyle}>
              <label style={formFieldStyle}>
                <span>Report name *</span>
                <input
                  required
                  value={newReport.name}
                  onChange={event => updateNewReport('name', event.target.value)}
                  placeholder="Example: Monthly HR Summary"
                  style={inputStyle}
                />
              </label>
              <label style={formFieldStyle}>
                <span>Category</span>
                <select value={newReport.category} onChange={event => updateNewReport('category', event.target.value)} style={selectStyle}>
                  {customReportCategories.map(option => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label style={formFieldStyle}>
                <span>Report type</span>
                <select value={newReport.type} onChange={event => updateNewReport('type', event.target.value)} style={selectStyle}>
                  {['Custom Report', 'Summary Report', 'Detail Report', 'Compliance Report', 'Payroll Report'].map(option => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label style={formFieldStyle}>
                <span>Data source</span>
                <select value={newReport.dataSource} onChange={event => updateNewReport('dataSource', event.target.value)} style={selectStyle}>
                  {['Employee Records', 'Payroll Records', 'Attendance Records', 'Leave Requests', 'Performance Reviews', 'Compliance Records'].map(option => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label style={formFieldStyle}>
                <span>Format</span>
                <select value={newReport.format} onChange={event => updateNewReport('format', event.target.value)} style={selectStyle}>
                  {['PDF', 'XLSX', 'CSV'].map(option => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label style={{ ...formFieldStyle, gridColumn: '1 / -1' }}>
                <span>Description</span>
                <textarea
                  value={newReport.summary}
                  onChange={event => updateNewReport('summary', event.target.value)}
                  placeholder="Describe what this report should track."
                  style={textareaStyle}
                />
              </label>
            </div>

            <div style={modalFooterStyle}>
              <button type="button" style={secondaryButtonStyle} onClick={closeCreateReport}>Cancel</button>
              <button type="submit" style={primaryButtonStyle}><Plus size={15} /> Create Report</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

function isHrReport(report: HrReport) {
  const haystack = `${report.category || ''} ${report.type || ''} ${report.name || ''}`.toLowerCase()
  return haystack.includes('hr') || hrReportCategories.some(category => haystack.includes(category.toLowerCase()))
}

function isPayrollReport(report: HrReport) {
  const haystack = `${report.category || ''} ${report.type || ''} ${report.name || ''} ${report.summary || ''}`.toLowerCase()
  return haystack.includes('payroll') || payrollReportCategories.some(category => haystack.includes(category.toLowerCase()))
}

function isAttendanceReport(report: HrReport) {
  const haystack = `${report.category || ''} ${report.type || ''} ${report.name || ''} ${report.summary || ''}`.toLowerCase()
  return haystack.includes('attendance')
    || haystack.includes('absent')
    || haystack.includes('late')
    || haystack.includes('overtime')
    || haystack.includes('shift')
    || attendanceReportCategories.some(category => haystack.includes(category.toLowerCase()))
}

function isLeaveReport(report: HrReport) {
  const haystack = `${report.category || ''} ${report.type || ''} ${report.name || ''} ${report.summary || ''} ${report.leaveType || ''}`.toLowerCase()
  return haystack.includes('leave')
    || haystack.includes('lwp')
    || haystack.includes('pto')
    || haystack.includes('vacation')
    || haystack.includes('sick')
    || leaveReportCategories.some(category => haystack.includes(category.toLowerCase()))
}

function isPerformanceReport(report: HrReport) {
  const haystack = `${report.category || ''} ${report.type || ''} ${report.name || ''} ${report.summary || ''} ${report.reviewPeriod || ''}`.toLowerCase()
  return haystack.includes('performance')
    || haystack.includes('review')
    || haystack.includes('goal')
    || haystack.includes('okr')
    || haystack.includes('talent')
    || haystack.includes('pip')
    || haystack.includes('feedback')
    || performanceReportCategories.some(category => haystack.includes(category.toLowerCase()))
}

function isComplianceReport(report: HrReport) {
  const haystack = `${report.category || ''} ${report.type || ''} ${report.name || ''} ${report.summary || ''} ${report.complianceType || ''}`.toLowerCase()
  return haystack.includes('compliance')
    || haystack.includes('sss')
    || haystack.includes('philhealth')
    || haystack.includes('pag-ibig')
    || haystack.includes('bir')
    || haystack.includes('dole')
    || haystack.includes('labor law')
    || haystack.includes('data privacy')
    || haystack.includes('withholding tax')
    || complianceReportCategories.some(category => haystack.includes(category.toLowerCase()))
}

function isCustomReport(report: HrReport) {
  const haystack = `${report.category || ''} ${report.type || ''} ${report.name || ''} ${report.summary || ''} ${report.dataSource || ''}`.toLowerCase()
  return haystack.includes('custom')
    || customReportCategories.some(category => haystack.includes(category.toLowerCase()) && haystack.includes('custom'))
}

function HrReportsView({ reports, allReports, scheduledReports, insights, onExport, onSchedule, onRunReport }: {
  reports: HrReport[]
  allReports: HrReport[]
  scheduledReports: ScheduledReport[]
  insights: ReportInsight[]
  onExport: (format: string, report?: HrReport) => void
  onSchedule: (report?: HrReport) => void
  onRunReport: (report: HrReport) => void
}) {
  return (
    <>
      <section style={mainCardStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>HR Reports Overview</h2>
        </div>
        <div style={categoryOverviewStyle}>
          {hrReportCategories.map(category => (
            <article key={category} style={categoryCardStyle}>
              <FileBarChart size={18} color="#16a34a" />
              <span style={{ display: 'grid', gap: 2 }}>
                <strong>{allReports.filter(report => report.category === category).length}</strong>
                <small>{category}</small>
              </span>
            </article>
          ))}
        </div>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>HR Reports Library</h2>
        </div>
        {reports.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <Th>Report Name</Th>
                  <Th>Category</Th>
                  <Th>Description</Th>
                  <Th>Generated By</Th>
                  <Th>Created Date</Th>
                  <Th>Format</Th>
                  <Th>Downloads</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {reports.map(report => (
                  <tr key={report.id}>
                    <Td><strong>{report.name}</strong></Td>
                    <Td>{report.category || '-'}</Td>
                    <Td>{report.summary || '-'}</Td>
                    <Td>{report.generatedBy || '-'}</Td>
                    <Td>{formatDate(report.createdAt)}</Td>
                    <Td>{report.format || '-'}</Td>
                    <Td>{report.downloads ?? 0}</Td>
                    <Td><StatusPill status={report.status || '-'} /></Td>
                    <Td>
                      <span style={actionGroupStyle}>
                        <button style={iconButtonStyle} aria-label={`Download ${report.name}`} onClick={() => onExport(report.format || 'PDF', report)}><Download size={14} /></button>
                        <button style={iconButtonStyle} aria-label={`Run ${report.name}`} onClick={() => onRunReport(report)}><Plus size={14} /></button>
                        <button style={iconButtonStyle} aria-label={`Schedule ${report.name}`} onClick={() => onSchedule(report)}><MoreVertical size={14} /></button>
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPanel title="No HR reports yet." text="Real HR reports will appear here after they are generated or imported." icon={FileBarChart} />
        )}
      </section>

      <div className="hr-reports-workspace" style={reportsGridStyle}>
        <div style={analyticsGridStyle}>
          <Panel title="HR Reports Usage" icon={BarChart3}>
            <EmptyPanel title="No HR report usage yet." text="Usage charts need real HR report generation and download history." icon={BarChart3} />
          </Panel>
          <Panel title="Reports by Department" icon={BarChart3}>
            <EmptyPanel title="No department breakdown yet." text="Department analytics will appear after HR report metadata exists." icon={BarChart3} />
          </Panel>
          <Panel title="Top HR Report Types" icon={BarChart3}>
            <EmptyPanel title="No top HR report types yet." text="Top report types will appear when real HR reports exist." icon={BarChart3} />
          </Panel>
        </div>
        <aside style={sidePanelStackStyle}>
          <Panel title="Scheduled HR Reports" icon={CalendarDays}>
            {scheduledReports.length ? (
              <div style={compactListStyle}>
                {scheduledReports.map(report => (
                  <div key={report.id} style={compactListRowStyle}>
                    <span>{report.name}</span>
                    <b>{formatDate(report.nextRun)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No scheduled HR reports." text="Scheduled HR report runs will appear here." icon={CalendarDays} />
            )}
          </Panel>
          <Panel title="HR Insights" icon={Sparkles}>
            {insights.length ? (
              <div style={compactListStyle}>
                {insights.map(insight => (
                  <div key={insight.id} style={recommendationRowStyle}>
                    <strong>{insight.title}</strong>
                    <span>{insight.description || '-'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No HR insights yet." text="Insights will appear after HR reports are generated." icon={Sparkles} />
            )}
          </Panel>
          <Panel title="Quick Export" icon={Download}>
            <div style={quickGridStyle}>
              <button style={secondaryButtonStyle} onClick={() => onExport('PDF')}>Export PDF</button>
              <button style={secondaryButtonStyle} onClick={() => onExport('XLSX')}>Export Excel</button>
              <button style={secondaryButtonStyle} onClick={() => onExport('CSV')}>Export CSV</button>
              <button style={secondaryButtonStyle} onClick={() => onSchedule()}>Schedule Report</button>
            </div>
          </Panel>
        </aside>
      </div>
    </>
  )
}

function QuickExportActions({ onExport, onSchedule }: Pick<ReportActionHandlers, 'onExport' | 'onSchedule'>) {
  return (
    <div style={quickGridStyle}>
      <button type="button" style={secondaryButtonStyle} onClick={() => onExport('PDF')}>Export PDF</button>
      <button type="button" style={secondaryButtonStyle} onClick={() => onExport('XLSX')}>Export Excel</button>
      <button type="button" style={secondaryButtonStyle} onClick={() => onExport('CSV')}>Export CSV</button>
      <button type="button" style={secondaryButtonStyle} onClick={() => onSchedule()}>Schedule Report</button>
    </div>
  )
}

function PayrollReportsView({ reports, allReports, scheduledReports, insights, onExport, onSchedule, onRunReport }: {
  reports: HrReport[]
  allReports: HrReport[]
  scheduledReports: ScheduledReport[]
  insights: ReportInsight[]
} & ReportActionHandlers) {
  return (
    <>
      <div className="hr-reports-workspace" style={reportsGridStyle}>
        <section style={mainCardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Payroll Reports Library</h2>
          </div>
          {reports.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Report Name</Th>
                    <Th>Category</Th>
                    <Th>Description</Th>
                    <Th>Generated By</Th>
                    <Th>Created Date</Th>
                    <Th>Format</Th>
                    <Th>Downloads</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(report => (
                    <tr key={report.id}>
                      <Td><strong>{report.name}</strong></Td>
                      <Td>{report.category || '-'}</Td>
                      <Td>{report.summary || '-'}</Td>
                      <Td>{report.generatedBy || '-'}</Td>
                      <Td>{formatDate(report.createdAt)}</Td>
                      <Td>{report.format || '-'}</Td>
                      <Td>{report.downloads ?? 0}</Td>
                      <Td><StatusPill status={report.status || '-'} /></Td>
                      <Td>
                        <span style={actionGroupStyle}>
                          <button style={iconButtonStyle} aria-label={`Download ${report.name}`} onClick={() => onExport(report.format || 'PDF', report)}><Download size={14} /></button>
                          <button style={iconButtonStyle} aria-label={`Run ${report.name}`} onClick={() => onRunReport(report)}><Plus size={14} /></button>
                          <button style={iconButtonStyle} aria-label={`Schedule ${report.name}`} onClick={() => onSchedule(report)}><MoreVertical size={14} /></button>
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel title="No payroll reports yet." text="Real payroll reports will appear here after payroll reports are generated or imported." icon={FileBarChart} />
          )}
        </section>

        <aside style={sidePanelStackStyle}>
          <Panel title="Scheduled Payroll Reports" icon={CalendarDays}>
            {scheduledReports.length ? (
              <div style={compactListStyle}>
                {scheduledReports.map(report => (
                  <div key={report.id} style={compactListRowStyle}>
                    <span>{report.name}</span>
                    <b>{formatDate(report.nextRun)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No scheduled payroll reports." text="Scheduled payroll report runs will appear here." icon={CalendarDays} />
            )}
          </Panel>
          <Panel title="Payroll Insights" icon={Sparkles}>
            {insights.length ? (
              <div style={compactListStyle}>
                {insights.map(insight => (
                  <div key={insight.id} style={recommendationRowStyle}>
                    <strong>{insight.title}</strong>
                    <span>{insight.description || '-'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No payroll insights yet." text="Insights will appear after payroll reports are generated." icon={Sparkles} />
            )}
          </Panel>
          <Panel title="Quick Export" icon={Download}>
            <QuickExportActions onExport={onExport} onSchedule={onSchedule} />
          </Panel>
        </aside>
      </div>

      <div style={analyticsGridStyle}>
        <Panel title="Payroll Spend Trend" icon={BarChart3}>
          <EmptyPanel title="No payroll spend trend yet." text="Spend charts need real payroll report data." icon={BarChart3} />
        </Panel>
        <Panel title="Payroll by Department" icon={BarChart3}>
          <EmptyPanel title="No payroll department breakdown yet." text="Department payroll analytics will appear after payroll metadata exists." icon={BarChart3} />
        </Panel>
        <Panel title="Payroll Composition" icon={BarChart3}>
          <EmptyPanel title="No payroll composition yet." text="Payroll composition needs real payroll summary data." icon={BarChart3} />
        </Panel>
      </div>

      <div style={bottomActionsStyle}>
        <ActionCard title="Custom Payroll Reports" text="Build custom payroll reports with advanced filters." action="Create Custom Report" />
        <ActionCard title="Report Builder" text="Design and generate advanced payroll reports." action="Open Report Builder" />
        <ActionCard title="Need Help?" text="Learn how to create, schedule, and share payroll reports." action="View Help Center" />
      </div>

      {!allReports.length && (
        <div style={emptyNoticeStyle}>
          Payroll Reports is ready. It will stay empty until real payroll report records are generated or imported.
        </div>
      )}
    </>
  )
}

function AttendanceReportsView({ reports, allReports, scheduledReports, insights, onExport, onSchedule, onRunReport }: {
  reports: HrReport[]
  allReports: HrReport[]
  scheduledReports: ScheduledReport[]
  insights: ReportInsight[]
} & ReportActionHandlers) {
  return (
    <>
      <div className="hr-reports-workspace" style={reportsGridStyle}>
        <section style={mainCardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Attendance Reports Library</h2>
          </div>
          {reports.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Report Name</Th>
                    <Th>Category</Th>
                    <Th>Description</Th>
                    <Th>Generated By</Th>
                    <Th>Created Date</Th>
                    <Th>Format</Th>
                    <Th>Downloads</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(report => (
                    <tr key={report.id}>
                      <Td><strong>{report.name}</strong></Td>
                      <Td>{report.category || '-'}</Td>
                      <Td>{report.summary || '-'}</Td>
                      <Td>{report.generatedBy || '-'}</Td>
                      <Td>{formatDate(report.createdAt)}</Td>
                      <Td>{report.format || '-'}</Td>
                      <Td>{report.downloads ?? 0}</Td>
                      <Td><StatusPill status={report.status || '-'} /></Td>
                      <Td>
                        <span style={actionGroupStyle}>
                          <button style={iconButtonStyle} aria-label={`Download ${report.name}`} onClick={() => onExport(report.format || 'PDF', report)}><Download size={14} /></button>
                          <button style={iconButtonStyle} aria-label={`Run ${report.name}`} onClick={() => onRunReport(report)}><Plus size={14} /></button>
                          <button style={iconButtonStyle} aria-label={`Schedule ${report.name}`} onClick={() => onSchedule(report)}><MoreVertical size={14} /></button>
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel title="No attendance reports yet." text="Real attendance reports will appear here after attendance reports are generated or imported." icon={FileBarChart} />
          )}
        </section>

        <aside style={sidePanelStackStyle}>
          <Panel title="Scheduled Attendance Reports" icon={CalendarDays}>
            {scheduledReports.length ? (
              <div style={compactListStyle}>
                {scheduledReports.map(report => (
                  <div key={report.id} style={compactListRowStyle}>
                    <span>{report.name}</span>
                    <b>{formatDate(report.nextRun)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No scheduled attendance reports." text="Scheduled attendance report runs will appear here." icon={CalendarDays} />
            )}
          </Panel>
          <Panel title="Attendance Insights" icon={Sparkles}>
            {insights.length ? (
              <div style={compactListStyle}>
                {insights.map(insight => (
                  <div key={insight.id} style={recommendationRowStyle}>
                    <strong>{insight.title}</strong>
                    <span>{insight.description || '-'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No attendance insights yet." text="Insights will appear after attendance reports are generated." icon={Sparkles} />
            )}
          </Panel>
          <Panel title="Quick Export" icon={Download}>
            <QuickExportActions onExport={onExport} onSchedule={onSchedule} />
          </Panel>
        </aside>
      </div>

      <div style={analyticsGridStyle}>
        <Panel title="Attendance Trend" icon={BarChart3}>
          <EmptyPanel title="No attendance trend yet." text="Attendance trend charts need real attendance report data." icon={BarChart3} />
        </Panel>
        <Panel title="Attendance by Department" icon={BarChart3}>
          <EmptyPanel title="No attendance department breakdown yet." text="Department attendance analytics will appear after attendance metadata exists." icon={BarChart3} />
        </Panel>
        <Panel title="Top Attendance Metrics" icon={BarChart3}>
          <EmptyPanel title="No attendance metrics yet." text="Attendance metrics will appear when attendance reports exist." icon={BarChart3} />
        </Panel>
      </div>

      <div style={bottomActionsStyle}>
        <ActionCard title="Create Custom Attendance Report" text="Build custom attendance reports with advanced filters." action="Create Custom Report" />
        <ActionCard title="Report Builder" text="Design and generate advanced attendance reports." action="Open Report Builder" />
        <ActionCard title="Need Help?" text="Learn how to create, schedule, and share attendance reports." action="View Help Center" />
      </div>

      {!allReports.length && (
        <div style={emptyNoticeStyle}>
          Attendance Reports is ready. It will stay empty until real attendance report records are generated or imported.
        </div>
      )}
    </>
  )
}

function LeaveReportsView({ reports, allReports, scheduledReports, insights, onExport, onSchedule, onRunReport }: {
  reports: HrReport[]
  allReports: HrReport[]
  scheduledReports: ScheduledReport[]
  insights: ReportInsight[]
} & ReportActionHandlers) {
  return (
    <>
      <div className="hr-reports-workspace" style={reportsGridStyle}>
        <section style={mainCardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Leave Reports Library</h2>
          </div>
          {reports.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Report Name</Th>
                    <Th>Category</Th>
                    <Th>Description</Th>
                    <Th>Generated By</Th>
                    <Th>Created Date</Th>
                    <Th>Format</Th>
                    <Th>Downloads</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(report => (
                    <tr key={report.id}>
                      <Td><strong>{report.name}</strong></Td>
                      <Td>{report.category || '-'}</Td>
                      <Td>{report.summary || '-'}</Td>
                      <Td>{report.generatedBy || '-'}</Td>
                      <Td>{formatDate(report.createdAt)}</Td>
                      <Td>{report.format || '-'}</Td>
                      <Td>{report.downloads ?? 0}</Td>
                      <Td><StatusPill status={report.status || '-'} /></Td>
                      <Td>
                        <span style={actionGroupStyle}>
                          <button style={iconButtonStyle} aria-label={`Download ${report.name}`} onClick={() => onExport(report.format || 'PDF', report)}><Download size={14} /></button>
                          <button style={iconButtonStyle} aria-label={`Run ${report.name}`} onClick={() => onRunReport(report)}><Plus size={14} /></button>
                          <button style={iconButtonStyle} aria-label={`Schedule ${report.name}`} onClick={() => onSchedule(report)}><MoreVertical size={14} /></button>
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel title="No leave reports yet." text="Real leave reports will appear here after leave reports are generated or imported." icon={FileBarChart} />
          )}
        </section>

        <aside style={sidePanelStackStyle}>
          <Panel title="Scheduled Leave Reports" icon={CalendarDays}>
            {scheduledReports.length ? (
              <div style={compactListStyle}>
                {scheduledReports.map(report => (
                  <div key={report.id} style={compactListRowStyle}>
                    <span>{report.name}</span>
                    <b>{formatDate(report.nextRun)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No scheduled leave reports." text="Scheduled leave report runs will appear here." icon={CalendarDays} />
            )}
          </Panel>
          <Panel title="Leave Insights" icon={Sparkles}>
            {insights.length ? (
              <div style={compactListStyle}>
                {insights.map(insight => (
                  <div key={insight.id} style={recommendationRowStyle}>
                    <strong>{insight.title}</strong>
                    <span>{insight.description || '-'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No leave insights yet." text="Insights will appear after leave reports are generated." icon={Sparkles} />
            )}
          </Panel>
          <Panel title="Quick Export" icon={Download}>
            <QuickExportActions onExport={onExport} onSchedule={onSchedule} />
          </Panel>
        </aside>
      </div>

      <div style={analyticsGridStyle}>
        <Panel title="Leave Trend Overview" icon={BarChart3}>
          <EmptyPanel title="No leave trend yet." text="Leave trend charts need real leave report data." icon={BarChart3} />
        </Panel>
        <Panel title="Leaves by Type" icon={BarChart3}>
          <EmptyPanel title="No leave type breakdown yet." text="Leave type analytics will appear after leave metadata exists." icon={BarChart3} />
        </Panel>
        <Panel title="Leaves by Department" icon={BarChart3}>
          <EmptyPanel title="No leave department breakdown yet." text="Department leave analytics will appear when leave reports exist." icon={BarChart3} />
        </Panel>
      </div>

      <div style={bottomActionsStyle}>
        <ActionCard title="Create Custom Leave Report" text="Build custom leave reports with advanced filters." action="Create Custom Report" />
        <ActionCard title="Report Builder" text="Design and generate advanced leave reports." action="Open Report Builder" />
        <ActionCard title="Need Help?" text="Learn how to create, schedule, and share leave reports." action="View Help Center" />
      </div>

      {!allReports.length && (
        <div style={emptyNoticeStyle}>
          Leave Reports is ready. It will stay empty until real leave report records are generated or imported.
        </div>
      )}
    </>
  )
}

function PerformanceReportsView({ reports, allReports, scheduledReports, insights, onExport, onSchedule, onRunReport }: {
  reports: HrReport[]
  allReports: HrReport[]
  scheduledReports: ScheduledReport[]
  insights: ReportInsight[]
} & ReportActionHandlers) {
  return (
    <>
      <div className="hr-reports-workspace" style={reportsGridStyle}>
        <section style={mainCardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Performance Reports Library</h2>
          </div>
          {reports.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Report Name</Th>
                    <Th>Category</Th>
                    <Th>Description</Th>
                    <Th>Review Period</Th>
                    <Th>Generated By</Th>
                    <Th>Created Date</Th>
                    <Th>Format</Th>
                    <Th>Downloads</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(report => (
                    <tr key={report.id}>
                      <Td><strong>{report.name}</strong></Td>
                      <Td>{report.category || '-'}</Td>
                      <Td>{report.summary || '-'}</Td>
                      <Td>{report.reviewPeriod || '-'}</Td>
                      <Td>{report.generatedBy || '-'}</Td>
                      <Td>{formatDate(report.createdAt)}</Td>
                      <Td>{report.format || '-'}</Td>
                      <Td>{report.downloads ?? 0}</Td>
                      <Td><StatusPill status={report.status || '-'} /></Td>
                      <Td>
                        <span style={actionGroupStyle}>
                          <button style={iconButtonStyle} aria-label={`Download ${report.name}`} onClick={() => onExport(report.format || 'PDF', report)}><Download size={14} /></button>
                          <button style={iconButtonStyle} aria-label={`Run ${report.name}`} onClick={() => onRunReport(report)}><Plus size={14} /></button>
                          <button style={iconButtonStyle} aria-label={`Schedule ${report.name}`} onClick={() => onSchedule(report)}><MoreVertical size={14} /></button>
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel title="No performance reports yet." text="Real performance reports will appear here after performance reports are generated or imported." icon={FileBarChart} />
          )}
        </section>

        <aside style={sidePanelStackStyle}>
          <Panel title="Scheduled Performance Reports" icon={CalendarDays}>
            {scheduledReports.length ? (
              <div style={compactListStyle}>
                {scheduledReports.map(report => (
                  <div key={report.id} style={compactListRowStyle}>
                    <span>{report.name}</span>
                    <b>{formatDate(report.nextRun)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No scheduled performance reports." text="Scheduled performance report runs will appear here." icon={CalendarDays} />
            )}
          </Panel>
          <Panel title="Performance Insights" icon={Sparkles}>
            {insights.length ? (
              <div style={compactListStyle}>
                {insights.map(insight => (
                  <div key={insight.id} style={recommendationRowStyle}>
                    <strong>{insight.title}</strong>
                    <span>{insight.description || '-'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No performance insights yet." text="Insights will appear after performance reports are generated." icon={Sparkles} />
            )}
          </Panel>
          <Panel title="Quick Export" icon={Download}>
            <QuickExportActions onExport={onExport} onSchedule={onSchedule} />
          </Panel>
        </aside>
      </div>

      <div style={analyticsGridStyle}>
        <Panel title="Performance Score Trend" icon={BarChart3}>
          <EmptyPanel title="No performance trend yet." text="Performance score charts need real performance report data." icon={BarChart3} />
        </Panel>
        <Panel title="Performance by Department" icon={BarChart3}>
          <EmptyPanel title="No performance department breakdown yet." text="Department performance analytics will appear after performance metadata exists." icon={BarChart3} />
        </Panel>
        <Panel title="Performance Rating Distribution" icon={BarChart3}>
          <EmptyPanel title="No performance rating distribution yet." text="Rating distribution will appear when performance reports exist." icon={BarChart3} />
        </Panel>
      </div>

      <div style={bottomActionsStyle}>
        <ActionCard title="Create Custom Performance Report" text="Build custom performance reports with advanced filters." action="Create Custom Report" />
        <ActionCard title="Report Builder" text="Design and generate advanced performance reports." action="Open Report Builder" />
        <ActionCard title="Need Help?" text="Learn how to create, schedule, and share performance reports." action="View Help Center" />
      </div>

      {!allReports.length && (
        <div style={emptyNoticeStyle}>
          Performance Reports is ready. It will stay empty until real performance report records are generated or imported.
        </div>
      )}
    </>
  )
}

function ComplianceReportsView({ reports, allReports, scheduledReports, insights, onExport, onSchedule, onRunReport }: {
  reports: HrReport[]
  allReports: HrReport[]
  scheduledReports: ScheduledReport[]
  insights: ReportInsight[]
} & ReportActionHandlers) {
  return (
    <>
      <div className="hr-reports-workspace" style={reportsGridStyle}>
        <section style={mainCardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Compliance Reports Library</h2>
          </div>
          {reports.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Report Name</Th>
                    <Th>Compliance Type</Th>
                    <Th>Description</Th>
                    <Th>Generated By</Th>
                    <Th>Created Date</Th>
                    <Th>Format</Th>
                    <Th>Downloads</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(report => (
                    <tr key={report.id}>
                      <Td><strong>{report.name}</strong></Td>
                      <Td>{report.complianceType || report.type || report.category || '-'}</Td>
                      <Td>{report.summary || '-'}</Td>
                      <Td>{report.generatedBy || '-'}</Td>
                      <Td>{formatDate(report.createdAt)}</Td>
                      <Td>{report.format || '-'}</Td>
                      <Td>{report.downloads ?? 0}</Td>
                      <Td><StatusPill status={report.status || '-'} /></Td>
                      <Td>
                        <span style={actionGroupStyle}>
                          <button style={iconButtonStyle} aria-label={`Download ${report.name}`} onClick={() => onExport(report.format || 'PDF', report)}><Download size={14} /></button>
                          <button style={iconButtonStyle} aria-label={`Run ${report.name}`} onClick={() => onRunReport(report)}><Plus size={14} /></button>
                          <button style={iconButtonStyle} aria-label={`Schedule ${report.name}`} onClick={() => onSchedule(report)}><MoreVertical size={14} /></button>
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel title="No compliance reports yet." text="Real compliance reports will appear here after compliance reports are generated or imported." icon={FileBarChart} />
          )}
        </section>

        <aside style={sidePanelStackStyle}>
          <Panel title="Scheduled Compliance Reports" icon={CalendarDays}>
            {scheduledReports.length ? (
              <div style={compactListStyle}>
                {scheduledReports.map(report => (
                  <div key={report.id} style={compactListRowStyle}>
                    <span>{report.name}</span>
                    <b>{formatDate(report.nextRun)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No scheduled compliance reports." text="Scheduled compliance report runs will appear here." icon={CalendarDays} />
            )}
          </Panel>
          <Panel title="Compliance Insights" icon={Sparkles}>
            {insights.length ? (
              <div style={compactListStyle}>
                {insights.map(insight => (
                  <div key={insight.id} style={recommendationRowStyle}>
                    <strong>{insight.title}</strong>
                    <span>{insight.description || '-'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No compliance insights yet." text="Insights will appear after compliance reports are generated." icon={Sparkles} />
            )}
          </Panel>
          <Panel title="Quick Export" icon={Download}>
            <QuickExportActions onExport={onExport} onSchedule={onSchedule} />
          </Panel>
        </aside>
      </div>

      <div style={analyticsGridStyle}>
        <Panel title="Compliance Status Overview" icon={BarChart3}>
          <EmptyPanel title="No compliance status overview yet." text="Compliance status charts need real compliance report data." icon={BarChart3} />
        </Panel>
        <Panel title="Compliance by Type" icon={BarChart3}>
          <EmptyPanel title="No compliance type breakdown yet." text="Compliance type analytics will appear after compliance metadata exists." icon={BarChart3} />
        </Panel>
        <Panel title="Compliance Trend" icon={BarChart3}>
          <EmptyPanel title="No compliance trend yet." text="Compliance trend charts will appear when compliance reports exist." icon={BarChart3} />
        </Panel>
      </div>

      <div style={bottomActionsStyle}>
        <ActionCard title="Create Custom Compliance Report" text="Build custom compliance reports with advanced filters." action="Create Custom Report" />
        <ActionCard title="Report Builder" text="Design and generate advanced compliance reports." action="Open Report Builder" />
        <ActionCard title="Need Help?" text="Learn how to create, schedule, and share compliance reports." action="View Help Center" />
      </div>

      {!allReports.length && (
        <div style={emptyNoticeStyle}>
          Compliance Reports is ready. It will stay empty until real compliance report records are generated or imported.
        </div>
      )}
    </>
  )
}

function CustomReportsView({ reports, allReports, scheduledReports, insights, onExport, onSchedule, onRunReport }: {
  reports: HrReport[]
  allReports: HrReport[]
  scheduledReports: ScheduledReport[]
  insights: ReportInsight[]
} & ReportActionHandlers) {
  return (
    <>
      <div className="hr-reports-workspace" style={reportsGridStyle}>
        <section style={mainCardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Custom Reports Library</h2>
          </div>
          {reports.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Report Name</Th>
                    <Th>Category</Th>
                    <Th>Description</Th>
                    <Th>Created By</Th>
                    <Th>Created Date</Th>
                    <Th>Data Source</Th>
                    <Th>Last Run</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(report => (
                    <tr key={report.id}>
                      <Td><strong>{report.name}</strong></Td>
                      <Td>{report.category || '-'}</Td>
                      <Td>{report.summary || '-'}</Td>
                      <Td>{report.generatedBy || '-'}</Td>
                      <Td>{formatDate(report.createdAt)}</Td>
                      <Td>{report.dataSource || '-'}</Td>
                      <Td>{formatDate(report.lastRunAt)}</Td>
                      <Td><StatusPill status={report.status || '-'} /></Td>
                      <Td>
                        <span style={actionGroupStyle}>
                          <button style={iconButtonStyle} aria-label={`Run ${report.name}`} onClick={() => onRunReport(report)}><Plus size={14} /></button>
                          <button style={iconButtonStyle} aria-label={`Schedule ${report.name}`} onClick={() => onSchedule(report)}><MoreVertical size={14} /></button>
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel title="No custom reports yet." text="Custom reports will appear here after users create real custom report records." icon={FileBarChart} />
          )}
        </section>

        <aside style={sidePanelStackStyle}>
          <Panel title="My Custom Reports" icon={CalendarDays}>
            {scheduledReports.length ? (
              <div style={compactListStyle}>
                {scheduledReports.map(report => (
                  <div key={report.id} style={compactListRowStyle}>
                    <span>{report.name}</span>
                    <b>{formatDate(report.nextRun)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No scheduled custom reports." text="Saved or scheduled custom reports will appear here." icon={CalendarDays} />
            )}
          </Panel>
          <Panel title="Custom Reports Insights" icon={Sparkles}>
            {insights.length ? (
              <div style={compactListStyle}>
                {insights.map(insight => (
                  <div key={insight.id} style={recommendationRowStyle}>
                    <strong>{insight.title}</strong>
                    <span>{insight.description || '-'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No custom report insights yet." text="Insights will appear after custom reports are created and run." icon={Sparkles} />
            )}
          </Panel>
          <Panel title="Quick Export" icon={Download}>
            <QuickExportActions onExport={onExport} onSchedule={onSchedule} />
          </Panel>
        </aside>
      </div>

      <div style={analyticsGridStyle}>
        <Panel title="Reports by Category" icon={BarChart3}>
          <EmptyPanel title="No custom report category data yet." text="Category analytics will appear after custom reports exist." icon={BarChart3} />
        </Panel>
        <Panel title="Reports Trend" icon={BarChart3}>
          <EmptyPanel title="No custom report trend yet." text="Trend charts need real custom report run history." icon={BarChart3} />
        </Panel>
        <Panel title="Top Data Sources Used" icon={BarChart3}>
          <EmptyPanel title="No data source analytics yet." text="Data source usage will appear after custom reports are run." icon={BarChart3} />
        </Panel>
      </div>

      <div style={bottomActionsStyle}>
        <ActionCard title="Create Custom Report" text="Build custom reports with advanced filters and multiple data sources." action="Create Custom Report" />
        <ActionCard title="Report Builder" text="Design and generate advanced reports with drag-and-drop tools." action="Open Report Builder" />
        <ActionCard title="Need Help?" text="Learn how to create, schedule, and share custom reports." action="View Help Center" />
      </div>

      {!allReports.length && (
        <div style={emptyNoticeStyle}>
          Custom Reports is ready. It will stay empty until real custom report records are created or imported.
        </div>
      )}
    </>
  )
}

function SelectFilter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="hr-reports-filter-field" style={selectFieldStyle}>
      <span>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} style={selectStyle}>
        {options.map(option => <option key={option}>{option}</option>)}
      </select>
    </label>
  )
}

function Metric({ icon: Icon, label, value, sub, color, bg }: { icon: typeof FileBarChart; label: string; value: string | number; sub: string; color: string; bg: string }) {
  return (
    <article className="hr-report-metric" style={metricCardStyle}>
      <span style={{ ...metricIconStyle, background: bg }}><Icon size={22} color={color} /></span>
      <span>
        <small style={{ color: '#475569', fontSize: 12 }}>{label}</small>
        <strong style={{ display: 'block', marginTop: 6, fontSize: 22, color: '#0f172a' }}>{value}</strong>
        <small style={{ display: 'block', marginTop: 8, color: '#64748b', fontSize: 12 }}>{sub}</small>
      </span>
    </article>
  )
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof FileBarChart; children: React.ReactNode }) {
  return (
    <section style={panelStyle}>
      <div style={sectionHeaderStyle}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Icon size={16} color="#64748b" />
          <h2 style={sectionTitleStyle}>{title}</h2>
        </span>
      </div>
      {children}
    </section>
  )
}

function EmptyPanel({ title, text, icon: Icon }: { title: string; text: string; icon: typeof FileBarChart }) {
  return (
    <div style={emptyPanelStyle}>
      <Icon size={32} color="#94a3b8" />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const style = normalized.includes('complete')
    ? { background: '#dcfce7', color: '#16a34a' }
    : normalized.includes('pending') || normalized.includes('progress')
      ? { background: '#fef3c7', color: '#d97706' }
      : { background: '#f1f5f9', color: '#475569' }
  return <span style={{ ...statusPillStyle, ...style }}>{status}</span>
}

function ActionCard({ title, text, action }: { title: string; text: string; action: string }) {
  return (
    <article style={actionCardStyle}>
      <FileBarChart size={22} color="#16a34a" />
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
      <button
        type="button"
        style={secondaryButtonStyle}
        onClick={() => window.dispatchEvent(new CustomEvent('hr-report-action', { detail: action }))}
      >
        {action}
      </button>
    </article>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={thStyle}>{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={tdStyle}>{children}</td>
}

const pageHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' as const, marginBottom: 18, padding: 24, border: '1px solid #dbeafe', borderRadius: 18, background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 56%, #eef7ff 100%)', boxShadow: '0 14px 38px rgba(15,23,42,0.07)' }
const pageTitleStyle = { margin: 0, color: '#0f172a', fontSize: 32, fontWeight: 900, letterSpacing: 0 }
const pageSubtitleStyle = { margin: '8px 0 0', color: '#475569', fontSize: 14, maxWidth: 620, lineHeight: 1.55 }
const toolbarStyle = { display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'center', justifyContent: 'flex-end' as const }
const searchBoxStyle = { minHeight: 44, minWidth: 360, border: '1px solid #d8e0eb', borderRadius: 999, background: '#fff', padding: '0 14px', display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontSize: 13, fontFamily: font, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' }
const plainInputStyle = { border: 'none', outline: 'none', background: 'transparent', width: '100%', font: 'inherit' }
const primaryButtonStyle = { minHeight: 42, border: '1px solid #16a34a', borderRadius: 999, background: '#16a34a', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 16px', fontSize: 13, fontWeight: 900, cursor: 'pointer', fontFamily: font, boxShadow: '0 10px 20px rgba(22,163,74,0.18)', whiteSpace: 'nowrap' as const }
const secondaryButtonStyle = { minHeight: 40, border: '1px solid #d8e0eb', borderRadius: 999, background: '#fff', color: '#0f172a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap' as const }
const linkButtonStyle = { minHeight: 40, border: 'none', background: 'transparent', color: '#16a34a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px', fontSize: 13, fontWeight: 900, cursor: 'pointer', fontFamily: font }
const metricGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }
const metricCardStyle = { minHeight: 108, padding: 16, background: '#fff', border: '1px solid #e6edf5', borderRadius: 14, boxShadow: '0 8px 22px rgba(15,23,42,0.045)', display: 'flex', alignItems: 'center', gap: 14 }
const metricIconStyle = { width: 48, height: 48, borderRadius: 12, display: 'grid', placeItems: 'center', flexShrink: 0 }
const tabsStyle = { display: 'flex', gap: 6, border: '1px solid #e5eaf0', borderRadius: 14, background: '#fff', padding: 6, overflowX: 'auto' as const, marginBottom: 14, boxShadow: '0 8px 22px rgba(15,23,42,0.04)' }
const tabStyle = (active: boolean) => ({ border: 'none', background: active ? '#e8f5ee' : 'transparent', padding: '10px 13px', borderRadius: 10, color: active ? '#0f7a3b' : '#334155', fontSize: 13, fontWeight: 850, cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap' as const })
const filterBarStyle = { marginBottom: 14, padding: 14, background: '#fff', border: '1px solid #e5eaf0', borderRadius: 14, display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' as const, boxShadow: '0 8px 22px rgba(15,23,42,0.04)' }
const noticeStyle = { margin: '-4px 0 14px', padding: '11px 14px', border: '1px solid #bbf7d0', borderRadius: 12, background: '#f0fdf4', color: '#15803d', fontSize: 13, fontWeight: 850 }
const selectFieldStyle = { display: 'grid', gap: 5, color: '#64748b', fontSize: 11, fontWeight: 800 }
const selectStyle = { minHeight: 40, minWidth: 168, border: '1px solid #d8e0eb', borderRadius: 10, background: '#fff', color: '#0f172a', padding: '0 12px', fontSize: 13, fontFamily: font }
const reportsGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 14, alignItems: 'start', marginBottom: 14 }
const mainCardStyle = { minHeight: 520, background: '#fff', border: '1px solid #e5eaf0', borderRadius: 14, boxShadow: '0 8px 24px rgba(15,23,42,0.045)', overflow: 'hidden' }
const sidePanelStackStyle = { display: 'grid', gap: 14 }
const panelStyle = { minHeight: 240, background: '#fff', border: '1px solid #e5eaf0', borderRadius: 14, boxShadow: '0 8px 24px rgba(15,23,42,0.045)', overflow: 'hidden' }
const sectionHeaderStyle = { padding: '15px 16px', borderBottom: '1px solid #edf2f7', background: '#fbfdff' }
const sectionTitleStyle = { margin: 0, color: '#0f172a', fontSize: 14, fontWeight: 900 }
const emptyPanelStyle = { minHeight: 220, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 8, padding: 20, color: '#64748b', fontSize: 13, textAlign: 'center' as const }
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, minWidth: 820 }
const thStyle = { textAlign: 'left' as const, padding: '12px 16px', color: '#475569', fontSize: 11, fontWeight: 900, background: '#f7faff' }
const tdStyle = { padding: '14px 16px', borderTop: '1px solid #eef2f7', color: '#0f172a', fontSize: 12, verticalAlign: 'top' as const }
const cellSubtextStyle = { display: 'block', marginTop: 3, color: '#64748b', fontSize: 11, fontWeight: 500 }
const actionGroupStyle = { display: 'inline-flex', gap: 6 }
const iconButtonStyle = { width: 30, height: 30, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#475569', display: 'inline-grid', placeItems: 'center', cursor: 'pointer' }
const statusPillStyle = { display: 'inline-flex', alignItems: 'center', minHeight: 22, padding: '0 8px', borderRadius: 999, fontSize: 11, fontWeight: 900 }
const compactListStyle = { display: 'grid', gap: 0, padding: 14 }
const compactListRowStyle = { display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontSize: 12 }
const recommendationRowStyle = { display: 'grid', gap: 4, padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontSize: 12 }
const quickGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 14 }
const analyticsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 14 }
const bottomActionsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }
const actionCardStyle = { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, alignItems: 'start', color: '#0f172a', fontSize: 13 }
const categoryOverviewStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, padding: 14, borderBottom: '1px solid #f1f5f9' }
const categoryCardStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: '1px solid #eef2f7', borderRadius: 10, background: '#fff', color: '#0f172a', fontSize: 12 }
const emptyNoticeStyle = { marginTop: 14, padding: 14, border: '1px dashed #bbf7d0', borderRadius: 12, background: '#f0fdf4', color: '#15803d', fontSize: 13, fontWeight: 800 }
const modalBackdropStyle = { position: 'fixed' as const, inset: 0, zIndex: 80, background: 'rgba(15,23,42,0.42)', display: 'flex', justifyContent: 'flex-end', padding: 12 }
const modalStyle = { width: 'min(560px, 100%)', maxHeight: 'calc(100vh - 24px)', overflowY: 'auto' as const, background: '#fff', border: '1px solid #d8e0eb', borderRadius: 18, boxShadow: '0 24px 70px rgba(15,23,42,0.28)', display: 'flex', flexDirection: 'column' as const }
const modalHeaderStyle = { padding: 20, borderBottom: '1px solid #edf2f7', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }
const modalBodyStyle = { padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }
const modalFooterStyle = { padding: 16, borderTop: '1px solid #edf2f7', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fbfdff', flexWrap: 'wrap' as const }
const formFieldStyle = { display: 'grid', gap: 7, color: '#334155', fontSize: 12, fontWeight: 850 }
const inputStyle = { minHeight: 42, width: '100%', border: '1px solid #d8e0eb', borderRadius: 10, background: '#fff', color: '#0f172a', padding: '0 12px', fontSize: 13, fontFamily: font, outline: 'none' }
const textareaStyle = { minHeight: 96, width: '100%', border: '1px solid #d8e0eb', borderRadius: 10, background: '#fff', color: '#0f172a', padding: 12, fontSize: 13, fontFamily: font, outline: 'none', resize: 'vertical' as const }
const iconCloseButtonStyle = { width: 38, height: 38, border: '1px solid #d8e0eb', borderRadius: 12, background: '#fff', color: '#0f172a', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }
