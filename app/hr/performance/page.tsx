'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Award,
  BarChart3,
  CalendarDays,
  Download,
  Eye,
  Flag,
  Grid2X2,
  LineChart,
  List,
  MoreVertical,
  Search,
  Star,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'

type PerformanceGoal = {
  id: string
  employeeId?: string
  employeeName?: string
  department?: string
  team?: string
  ownerName?: string
  ownerId?: string
  view?: string
  keyResults?: number
  completedKeyResults?: number
  alignment?: string
  priority?: string
  title: string
  progress?: number
  status?: 'On Track' | 'At Risk' | 'Behind' | 'Completed'
  dueDate?: string
  createdAt?: string
  source?: string
}

type PerformanceReview = {
  id: string
  employeeId?: string
  employeeName?: string
  reviewerName?: string
  department?: string
  team?: string
  managerName?: string
  reviewType?: string
  progress?: number
  dueDate?: string
  score?: number
  status?: 'Pending' | 'In Progress' | 'Completed' | 'Overdue'
  reviewDate?: string
  createdAt?: string
  source?: string
}

type PerformanceFeedback = {
  id: string
  employeeId?: string
  employeeName?: string
  author?: string
  rating?: number
  note?: string
  createdAt?: string
  source?: string
}

type TabKey = 'overview' | 'employees' | 'teams' | 'goals' | 'reviews' | 'insights'

type EmployeePerformanceRow = {
  id: string
  employeeName: string
  department: string
  managerName: string
  score: number | null
  attendance: number | null
  goalsProgress: number | null
  tasksCompletion: number | null
  trend: 'Improving' | 'Stable' | 'Declining' | '-'
  status: string
}

const font = "var(--font-body)"
const goalsKey = 'flowsys-hr-performance-goals'
const reviewsKey = 'flowsys-hr-performance-reviews'
const feedbackKey = 'flowsys-hr-performance-feedback'
const realSources = new Set(['manual', 'performance', 'imported'])

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

function formatScore(score: number) {
  return Number.isFinite(score) ? score.toFixed(1) : '0'
}

function monthInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function recordDateValue(record: { reviewDate?: string; dueDate?: string; createdAt?: string }) {
  return record.reviewDate || record.dueDate || record.createdAt || ''
}

function isWithinMonthRange(value: string | undefined, fromMonth: string, toMonth: string) {
  if (!fromMonth && !toMonth) return true
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const month = monthInputValue(date)
  return (!fromMonth || month >= fromMonth) && (!toMonth || month <= toMonth)
}

function periodLabel(fromMonth: string, toMonth: string) {
  if (fromMonth && toMonth) return `${fromMonth} to ${toMonth}`
  if (fromMonth) return `From ${fromMonth}`
  if (toMonth) return `Until ${toMonth}`
  return 'All recorded months'
}

export default function HRPerformancePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('All Departments')
  const [team, setTeam] = useState('All Teams')
  const [employmentType, setEmploymentType] = useState('All Types')
  const [location, setLocation] = useState('All Locations')
  const [manager, setManager] = useState('All Managers')
  const [performanceRating, setPerformanceRating] = useState('All Ratings')
  const [reviewCycle, setReviewCycle] = useState('Current Cycle')
  const [goalView, setGoalView] = useState('All OKRs')
  const [goalOwner, setGoalOwner] = useState('All Owners')
  const [goalStatus, setGoalStatus] = useState('All Statuses')
  const [goalPeriod, setGoalPeriod] = useState('Current Period')
  const [reviewDepartment, setReviewDepartment] = useState('All Departments')
  const [reviewTeam, setReviewTeam] = useState('All Teams')
  const [reviewManager, setReviewManager] = useState('All Managers')
  const [reviewType, setReviewType] = useState('All Review Types')
  const [reviewStatus, setReviewStatus] = useState('All Statuses')
  const [insightDateRange, setInsightDateRange] = useState('Current Period')
  const [insightComparison, setInsightComparison] = useState('Previous Period')
  const [insightJobLevel, setInsightJobLevel] = useState('All Levels')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [exportPeriod, setExportPeriod] = useState<'Weekly' | 'Monthly' | 'Yearly'>('Monthly')
  const [fromMonth, setFromMonth] = useState(`${new Date().getFullYear()}-01`)
  const [toMonth, setToMonth] = useState(monthInputValue())
  const [goals, setGoals] = useState<PerformanceGoal[]>([])
  const [reviews, setReviews] = useState<PerformanceReview[]>([])
  const [feedback, setFeedback] = useState<PerformanceFeedback[]>([])

  useEffect(() => {
    const load = () => {
      setGoals(loadStored<PerformanceGoal[]>(goalsKey, []).filter(isRealRecord))
      setReviews(loadStored<PerformanceReview[]>(reviewsKey, []).filter(isRealRecord))
      setFeedback(loadStored<PerformanceFeedback[]>(feedbackKey, []).filter(isRealRecord))
    }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [])

  const filteredGoalsByPeriod = useMemo(
    () => goals.filter(goal => isWithinMonthRange(recordDateValue(goal), fromMonth, toMonth)),
    [fromMonth, goals, toMonth],
  )
  const filteredReviewsByPeriod = useMemo(
    () => reviews.filter(review => isWithinMonthRange(recordDateValue(review), fromMonth, toMonth)),
    [fromMonth, reviews, toMonth],
  )
  const filteredFeedbackByPeriod = useMemo(
    () => feedback.filter(item => isWithinMonthRange(item.createdAt, fromMonth, toMonth)),
    [feedback, fromMonth, toMonth],
  )

  const stats = useMemo(() => {
    const completedReviews = filteredReviewsByPeriod.filter(review => review.status === 'Completed')
    const scoreFromReviews = completedReviews.filter(review => typeof review.score === 'number')
    const scoreFromFeedback = filteredFeedbackByPeriod.filter(item => typeof item.rating === 'number')
    const averageReviewScore = scoreFromReviews.length
      ? scoreFromReviews.reduce((sum, review) => sum + Number(review.score || 0), 0) / scoreFromReviews.length
      : 0
    const averageFeedbackScore = scoreFromFeedback.length
      ? (scoreFromFeedback.reduce((sum, item) => sum + Number(item.rating || 0), 0) / scoreFromFeedback.length) * 20
      : 0
    const averageScore = averageReviewScore || averageFeedbackScore
    const completedGoals = filteredGoalsByPeriod.filter(goal => goal.status === 'Completed' || Number(goal.progress || 0) >= 100).length
    const goalsOnTrack = filteredGoalsByPeriod.length ? Math.round((filteredGoalsByPeriod.filter(goal => goal.status === 'On Track').length / filteredGoalsByPeriod.length) * 100) : 0

    return {
      averageScore,
      topPerformers: filteredReviewsByPeriod.filter(review => Number(review.score || 0) >= 90).length,
      goalsOnTrack,
      pendingReviews: filteredReviewsByPeriod.filter(review => review.status === 'Pending' || review.status === 'In Progress').length,
      employeesAtRisk: filteredGoalsByPeriod.filter(goal => goal.status === 'At Risk' || goal.status === 'Behind').length,
      completedGoals,
    }
  }, [filteredFeedbackByPeriod, filteredGoalsByPeriod, filteredReviewsByPeriod])

  const hasPerformanceData = filteredGoalsByPeriod.length > 0 || filteredReviewsByPeriod.length > 0 || filteredFeedbackByPeriod.length > 0
  const employeeRows = useMemo(() => {
    const rows = new Map<string, EmployeePerformanceRow & { scores: number[]; goalProgress: number[] }>()

    const ensureRow = (id: string, name?: string, dept?: string, managerName?: string) => {
      const key = id || name || 'unknown'
      const existing = rows.get(key)
      if (existing) {
        if (name && existing.employeeName === '-') existing.employeeName = name
        if (dept && existing.department === '-') existing.department = dept
        if (managerName && existing.managerName === '-') existing.managerName = managerName
        return existing
      }
      const row = {
        id: key,
        employeeName: name || '-',
        department: dept || '-',
        managerName: managerName || '-',
        score: null,
        attendance: null,
        goalsProgress: null,
        tasksCompletion: null,
        trend: '-' as const,
        status: '-',
        scores: [],
        goalProgress: [],
      }
      rows.set(key, row)
      return row
    }

    filteredReviewsByPeriod.forEach(review => {
      const row = ensureRow(review.employeeId || review.employeeName || review.id, review.employeeName, review.department, review.reviewerName)
      if (typeof review.score === 'number') row.scores.push(review.score)
      if (review.status) row.status = review.status
    })

    filteredFeedbackByPeriod.forEach(item => {
      const row = ensureRow(item.employeeId || item.employeeName || item.id, item.employeeName)
      if (typeof item.rating === 'number') row.scores.push(item.rating * 20)
    })

    filteredGoalsByPeriod.forEach(goal => {
      const row = ensureRow(goal.employeeId || goal.employeeName || goal.id, goal.employeeName, goal.department)
      if (typeof goal.progress === 'number') row.goalProgress.push(goal.progress)
      if (goal.status === 'At Risk' || goal.status === 'Behind') row.status = goal.status
    })

    return Array.from(rows.values())
      .map(row => ({
        ...row,
        score: row.scores.length ? row.scores.reduce((sum, score) => sum + score, 0) / row.scores.length : null,
        goalsProgress: row.goalProgress.length ? row.goalProgress.reduce((sum, progress) => sum + progress, 0) / row.goalProgress.length : null,
      }))
      .filter(row => {
        const matchesQuery = !query.trim() || `${row.employeeName} ${row.department} ${row.managerName}`.toLowerCase().includes(query.toLowerCase())
        const matchesDepartment = department === 'All Departments' || row.department === department
        const matchesManager = manager === 'All Managers' || row.managerName === manager
        const matchesRating = performanceRating === 'All Ratings' || row.status === performanceRating
        return matchesQuery && matchesDepartment && matchesManager && matchesRating
      })
  }, [department, filteredFeedbackByPeriod, filteredGoalsByPeriod, filteredReviewsByPeriod, manager, performanceRating, query])
  const bestEmployee = useMemo(
    () => employeeRows.filter(row => row.score !== null).sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0],
    [employeeRows],
  )
  const lowestEmployee = useMemo(
    () => employeeRows.filter(row => row.score !== null).sort((a, b) => Number(a.score || 0) - Number(b.score || 0))[0],
    [employeeRows],
  )
  const departmentOptions = useMemo(() => ['All Departments', ...Array.from(new Set(employeeRows.map(row => row.department).filter(value => value && value !== '-')))], [employeeRows])
  const managerOptions = useMemo(() => ['All Managers', ...Array.from(new Set(employeeRows.map(row => row.managerName).filter(value => value && value !== '-')))], [employeeRows])
  const filteredGoals = useMemo(() => {
    return filteredGoalsByPeriod.filter(goal => {
      const matchesQuery = !query.trim() || `${goal.title} ${goal.employeeName || ''} ${goal.ownerName || ''} ${goal.department || ''}`.toLowerCase().includes(query.toLowerCase())
      const matchesDepartment = department === 'All Departments' || goal.department === department
      const matchesTeam = team === 'All Teams' || goal.team === team
      const matchesOwner = goalOwner === 'All Owners' || goal.ownerName === goalOwner || goal.employeeName === goalOwner
      const matchesStatus = goalStatus === 'All Statuses' || goal.status === goalStatus
      const matchesView = goalView === 'All OKRs' || goal.view === goalView
      return matchesQuery && matchesDepartment && matchesTeam && matchesOwner && matchesStatus && matchesView
    })
  }, [department, filteredGoalsByPeriod, goalOwner, goalStatus, goalView, query, team])
  const goalDepartmentOptions = useMemo(() => ['All Departments', ...Array.from(new Set(filteredGoalsByPeriod.map(goal => goal.department).filter(Boolean))) as string[]], [filteredGoalsByPeriod])
  const goalTeamOptions = useMemo(() => ['All Teams', ...Array.from(new Set(filteredGoalsByPeriod.map(goal => goal.team).filter(Boolean))) as string[]], [filteredGoalsByPeriod])
  const goalOwnerOptions = useMemo(() => ['All Owners', ...Array.from(new Set(filteredGoalsByPeriod.map(goal => goal.ownerName || goal.employeeName).filter(Boolean))) as string[]], [filteredGoalsByPeriod])
  const filteredReviews = useMemo(() => {
    return filteredReviewsByPeriod.filter(review => {
      const matchesQuery = !query.trim() || `${review.employeeName || ''} ${review.reviewerName || ''} ${review.department || ''} ${review.reviewType || ''}`.toLowerCase().includes(query.toLowerCase())
      const matchesDepartment = reviewDepartment === 'All Departments' || review.department === reviewDepartment
      const matchesTeam = reviewTeam === 'All Teams' || review.team === reviewTeam
      const matchesManager = reviewManager === 'All Managers' || review.managerName === reviewManager || review.reviewerName === reviewManager
      const matchesType = reviewType === 'All Review Types' || review.reviewType === reviewType
      const matchesStatus = reviewStatus === 'All Statuses' || review.status === reviewStatus
      return matchesQuery && matchesDepartment && matchesTeam && matchesManager && matchesType && matchesStatus
    })
  }, [filteredReviewsByPeriod, query, reviewDepartment, reviewManager, reviewStatus, reviewTeam, reviewType])
  const reviewDepartmentOptions = useMemo(() => ['All Departments', ...Array.from(new Set(filteredReviewsByPeriod.map(review => review.department).filter(Boolean))) as string[]], [filteredReviewsByPeriod])
  const reviewTeamOptions = useMemo(() => ['All Teams', ...Array.from(new Set(filteredReviewsByPeriod.map(review => review.team).filter(Boolean))) as string[]], [filteredReviewsByPeriod])
  const reviewManagerOptions = useMemo(() => ['All Managers', ...Array.from(new Set(filteredReviewsByPeriod.map(review => review.managerName || review.reviewerName).filter(Boolean))) as string[]], [filteredReviewsByPeriod])
  const reviewTypeOptions = useMemo(() => ['All Review Types', ...Array.from(new Set(filteredReviewsByPeriod.map(review => review.reviewType).filter(Boolean))) as string[]], [filteredReviewsByPeriod])
  const tabs: Array<[TabKey, string]> = [
    ['overview', 'Overview'],
    ['employees', 'Employee Performance'],
    ['teams', 'Team Performance'],
    ['goals', 'Goals & OKRs'],
    ['reviews', 'Reviews'],
    ['insights', 'Insights & Reports'],
  ]

  function exportPerformanceReport() {
    const rows = [
      ['Period', exportPeriod],
      ['Month Range', periodLabel(fromMonth, toMonth)],
      ['Employees With Scores', String(employeeRows.length)],
      ['Average Score', formatScore(stats.averageScore)],
      ['Goals On Track %', String(stats.goalsOnTrack)],
      ['Pending Reviews', String(stats.pendingReviews)],
      [],
      ['Employee', 'Department', 'Manager', 'Score', 'Goals Progress', 'Status'],
      ...employeeRows.map(row => [row.employeeName, row.department, row.managerName, row.score === null ? '' : formatScore(row.score), row.goalsProgress === null ? '' : `${Math.round(row.goalsProgress)}%`, row.status]),
    ]
    const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `performance-${exportPeriod.toLowerCase()}-${fromMonth || 'all'}-${toMonth || 'all'}-report.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="hr-module-page" style={{ fontFamily: font }}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>Performance</h1>
          <p style={pageSubtitleStyle}>Track and analyze employee performance, productivity, and engagement across your organization.</p>
        </div>
        <div style={toolbarStyle}>
          <label style={searchBoxStyle}>
            <Search size={15} color="#94a3b8" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search performance records..." style={plainInputStyle} />
          </label>
          <button style={secondaryButtonStyle} onClick={exportPerformanceReport}><Download size={15} /> Export Report</button>
          <select style={selectStyle} value={exportPeriod} onChange={event => setExportPeriod(event.target.value as typeof exportPeriod)} aria-label="Performance period">
            <option>Weekly</option>
            <option>Monthly</option>
            <option>Yearly</option>
          </select>
        </div>
      </div>

      <div style={periodBarStyle}>
        <label style={monthFieldStyle}>
          <span>From month</span>
          <input type="month" value={fromMonth} onChange={event => setFromMonth(event.target.value)} style={monthInputStyle} />
        </label>
        <label style={monthFieldStyle}>
          <span>To month</span>
          <input type="month" value={toMonth} onChange={event => setToMonth(event.target.value)} style={monthInputStyle} />
        </label>
      </div>

      <div style={tabsStyle}>
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={tabStyle(activeTab === key)}>{label}</button>
        ))}
      </div>

      <div style={metricGridStyle}>
        {activeTab === 'goals' ? (
          <>
            <Metric icon={Target} label="Overall OKR Progress" value={`${stats.goalsOnTrack}%`} sub="Real OKRs only" color="#16a34a" bg="#dcfce7" />
            <Metric icon={Flag} label="Total OKRs" value={goals.length} sub="Active OKRs" color="#2563eb" bg="#dbeafe" />
            <Metric icon={Target} label="On Track" value={goals.filter(goal => goal.status === 'On Track').length} sub="No trend yet" color="#7c3aed" bg="#ede9fe" />
            <Metric icon={CalendarDays} label="At Risk" value={goals.filter(goal => goal.status === 'At Risk').length} sub="No trend yet" color="#ea580c" bg="#ffedd5" />
            <Metric icon={AlertTriangle} label="Behind" value={goals.filter(goal => goal.status === 'Behind').length} sub="No trend yet" color="#dc2626" bg="#fee2e2" />
            <Metric icon={Users} label="Completion Rate" value={goals.length ? `${Math.round((stats.completedGoals / goals.length) * 100)}%` : '0%'} sub="Avg. completion" color="#0891b2" bg="#cffafe" />
          </>
        ) : activeTab === 'reviews' ? (
          <>
            <Metric icon={Target} label="Total Reviews" value={reviews.length} sub="Real reviews only" color="#16a34a" bg="#dcfce7" />
            <Metric icon={Target} label="Completed Reviews" value={reviews.filter(review => review.status === 'Completed').length} sub="No trend yet" color="#2563eb" bg="#dbeafe" />
            <Metric icon={CalendarDays} label="In Progress Reviews" value={reviews.filter(review => review.status === 'In Progress').length} sub="No trend yet" color="#7c3aed" bg="#ede9fe" />
            <Metric icon={CalendarDays} label="Pending Reviews" value={reviews.filter(review => review.status === 'Pending').length} sub="Requires review action" color="#ea580c" bg="#ffedd5" />
            <Metric icon={Star} label="Average Rating" value={averageReviewRating(reviews)} sub="From scored reviews" color="#16a34a" bg="#dcfce7" />
          </>
        ) : activeTab === 'insights' ? (
          <>
            <Metric icon={TrendingUp} label="Overall Performance Score" value={`${formatScore(stats.averageScore)} /100`} sub="From real scores" color="#16a34a" bg="#dcfce7" />
            <Metric icon={Users} label="High Performers" value={reviews.filter(review => Number(review.score || 0) >= 90).length} sub="Real reviews only" color="#2563eb" bg="#dbeafe" />
            <Metric icon={Target} label="Performance Improvement" value="-" sub="Needs trend history" color="#7c3aed" bg="#ede9fe" />
            <Metric icon={AlertTriangle} label="At Risk Employees" value={stats.employeesAtRisk} sub="From real risk signals" color="#ea580c" bg="#ffedd5" />
            <Metric icon={Users} label="Engagement Score" value="-" sub="No engagement records" color="#0891b2" bg="#cffafe" />
          </>
        ) : (
          <>
            <Metric icon={Users} label="Average Performance Score" value={`${formatScore(stats.averageScore)} /100`} sub="No trend yet" color="#16a34a" bg="#dcfce7" />
            <Metric icon={Star} label="Top Performers" value={stats.topPerformers} sub="Real reviews only" color="#2563eb" bg="#dbeafe" />
            <Metric icon={activeTab === 'employees' ? TrendingUp : Flag} label={activeTab === 'employees' ? 'Employees Improving' : 'Goals On Track'} value={activeTab === 'employees' ? 0 : `${stats.goalsOnTrack}%`} sub={activeTab === 'employees' ? 'No trend records yet' : `${stats.completedGoals} completed goals`} color="#7c3aed" bg="#ede9fe" />
            <Metric icon={AlertTriangle} label="Employees at Risk" value={stats.employeesAtRisk} sub="No risk records" color="#dc2626" bg="#fee2e2" />
            <Metric icon={CalendarDays} label="Pending Reviews" value={stats.pendingReviews} sub="Requires review data" color="#ea580c" bg="#ffedd5" />
            {activeTab !== 'employees' && <Metric icon={Award} label="Best Employee" value={bestEmployee?.employeeName || '-'} sub={bestEmployee?.score === null || !bestEmployee ? 'No score in range' : `${formatScore(bestEmployee.score)} /100`} color="#0891b2" bg="#cffafe" />}
            {activeTab !== 'employees' && <Metric icon={AlertTriangle} label="Needs Attention" value={lowestEmployee?.employeeName || '-'} sub={lowestEmployee?.score === null || !lowestEmployee ? 'No score in range' : `${formatScore(lowestEmployee.score)} /100`} color="#dc2626" bg="#fee2e2" />}
          </>
        )}
      </div>

      <div style={filterBarStyle}>
        {activeTab === 'employees' ? (
          <>
            <SelectFilter value={department} onChange={setDepartment} label="Department" options={departmentOptions} />
            <SelectFilter value={team} onChange={setTeam} label="Team" options={['All Teams']} />
            <SelectFilter value={manager} onChange={setManager} label="Manager" options={managerOptions} />
            <SelectFilter value={performanceRating} onChange={setPerformanceRating} label="Performance Rating" options={['All Ratings', 'Excellent', 'Good', 'Average', 'Needs Improvement', 'At Risk']} />
            <SelectFilter value={reviewCycle} onChange={setReviewCycle} label="Review Cycle" options={['Current Cycle']} />
          </>
        ) : activeTab === 'goals' ? (
          <>
            <SelectFilter value={goalView} onChange={setGoalView} label="View" options={['All OKRs', 'Company OKRs', 'Department OKRs', 'Team Goals', 'My OKRs']} />
            <SelectFilter value={department} onChange={setDepartment} label="Department" options={goalDepartmentOptions} />
            <SelectFilter value={team} onChange={setTeam} label="Team" options={goalTeamOptions} />
            <SelectFilter value={goalOwner} onChange={setGoalOwner} label="Owner" options={goalOwnerOptions} />
            <SelectFilter value={goalStatus} onChange={setGoalStatus} label="Status" options={['All Statuses', 'On Track', 'At Risk', 'Behind', 'Completed']} />
            <SelectFilter value={goalPeriod} onChange={setGoalPeriod} label="Time Period" options={['Current Period']} />
          </>
        ) : activeTab === 'reviews' ? (
          <>
            <SelectFilter value={reviewCycle} onChange={setReviewCycle} label="Review Cycle" options={['Current Cycle']} />
            <SelectFilter value={reviewDepartment} onChange={setReviewDepartment} label="Department" options={reviewDepartmentOptions} />
            <SelectFilter value={reviewTeam} onChange={setReviewTeam} label="Team" options={reviewTeamOptions} />
            <SelectFilter value={reviewManager} onChange={setReviewManager} label="Manager" options={reviewManagerOptions} />
            <SelectFilter value={reviewType} onChange={setReviewType} label="Review Type" options={reviewTypeOptions} />
            <SelectFilter value={reviewStatus} onChange={setReviewStatus} label="Status" options={['All Statuses', 'Pending', 'In Progress', 'Completed', 'Overdue']} />
          </>
        ) : activeTab === 'insights' ? (
          <>
            <SelectFilter value={insightDateRange} onChange={setInsightDateRange} label="Date Range" options={['Current Period']} />
            <SelectFilter value={insightComparison} onChange={setInsightComparison} label="Comparison" options={['Previous Period']} />
            <SelectFilter value={department} onChange={setDepartment} label="Department" options={departmentOptions} />
            <SelectFilter value={team} onChange={setTeam} label="Team" options={['All Teams']} />
            <SelectFilter value={location} onChange={setLocation} label="Location" options={['All Locations']} />
            <SelectFilter value={insightJobLevel} onChange={setInsightJobLevel} label="Job Level" options={['All Levels']} />
          </>
        ) : (
          <>
            <SelectFilter value={department} onChange={setDepartment} label="Department" options={['All Departments']} />
            <SelectFilter value={team} onChange={setTeam} label="Team" options={['All Teams']} />
            <SelectFilter value={employmentType} onChange={setEmploymentType} label="Employment Type" options={['All Types']} />
            <SelectFilter value={location} onChange={setLocation} label="Location" options={['All Locations']} />
          </>
        )}
        <div style={viewToggleStyle}>
          <button onClick={() => setViewMode('list')} style={viewButtonStyle(viewMode === 'list')} aria-label="List view"><List size={16} /></button>
          <button onClick={() => setViewMode('grid')} style={viewButtonStyle(viewMode === 'grid')} aria-label="Grid view"><Grid2X2 size={16} /></button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div style={dashboardGridStyle}>
          <Panel title="Performance Score Trend" icon={LineChart}>
            <EmptyPanel title="No score trend yet." text="Completed performance reviews will build this trend." icon={LineChart} />
          </Panel>
          <Panel title="Performance by Department" icon={BarChart3}>
            <EmptyPanel title="No department performance yet." text="Department charts will appear after reviews are recorded." icon={BarChart3} />
          </Panel>
          <Panel title="Goal Completion Overview" icon={Flag}>
            <EmptyPanel title="No goal progress yet." text="Goals and OKRs will appear once created." icon={Flag} />
          </Panel>
          <Panel title="Top Performers" icon={Star}>
            <EmptyPanel title="No top performers yet." text="Employees with completed high-scoring reviews will appear here." icon={Star} />
          </Panel>
          <Panel title="Performance Distribution" icon={BarChart3}>
            <EmptyPanel title="No distribution yet." text="Scores will be grouped here when review data exists." icon={BarChart3} />
          </Panel>
          <Panel title="Recent Reviews" icon={CalendarDays}>
            {filteredReviewsByPeriod.length ? <ReviewsTable reviews={filteredReviewsByPeriod} /> : <EmptyPanel title="No reviews in this period." text="Performance reviews will appear here for the selected months." icon={CalendarDays} />}
          </Panel>
        </div>
      )}

      {activeTab === 'employees' && (
        <EmployeePerformanceView rows={employeeRows} reviews={reviews} />
      )}

      {activeTab === 'goals' && (
        <GoalsOkrsView goals={filteredGoals} allGoals={filteredGoalsByPeriod} />
      )}

      {activeTab === 'reviews' && (
        <ReviewsView reviews={filteredReviews} allReviews={filteredReviewsByPeriod} />
      )}

      {activeTab === 'insights' && (
        <InsightsReportsView reviews={filteredReviewsByPeriod} goals={filteredGoalsByPeriod} feedback={filteredFeedbackByPeriod} />
      )}

      {activeTab !== 'overview' && activeTab !== 'employees' && activeTab !== 'goals' && activeTab !== 'reviews' && activeTab !== 'insights' && (
        <Panel title={tabs.find(([key]) => key === activeTab)?.[1] || 'Performance'} icon={BarChart3}>
          <EmptyPanel
            title={emptyTitle(activeTab)}
            text="Real records will appear here after HR creates or imports performance data."
            icon={BarChart3}
          />
        </Panel>
      )}

      {!hasPerformanceData && (
        <div style={insightStripStyle}>
          <Insight icon={LineChart} title="Performance Insight" text="No performance insight is available yet." />
          <Insight icon={Star} title="Top Strength" text="Strengths will appear after reviews are completed." />
          <Insight icon={AlertTriangle} title="Attention Needed" text="Risk alerts will appear when goals or reviews require action." />
          <Insight icon={CalendarDays} title="Recommendation" text="Create or import review records to start tracking performance." />
        </div>
      )}
    </section>
  )
}

function EmployeePerformanceView({ rows, reviews }: { rows: EmployeePerformanceRow[]; reviews: PerformanceReview[] }) {
  const topPerformers = rows.filter(row => Number(row.score || 0) >= 90).slice(0, 5)
  const departments = Array.from(new Set(rows.map(row => row.department).filter(value => value && value !== '-')))
  const completedReviews = reviews.filter(review => review.status === 'Completed').length

  return (
    <>
      <div style={employeePerformanceGridStyle}>
        <section style={employeeTableCardStyle}>
          <div style={panelHeaderStyle}>
            <h2 style={panelTitleStyle}>Employee Performance</h2>
          </div>
          {rows.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Employee</Th>
                    <Th>Department</Th>
                    <Th>Manager</Th>
                    <Th>Performance Score</Th>
                    <Th>Attendance</Th>
                    <Th>Goals Progress</Th>
                    <Th>Tasks Completion</Th>
                    <Th>Trend</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id}>
                      <Td><strong>{row.employeeName}</strong></Td>
                      <Td>{row.department}</Td>
                      <Td>{row.managerName}</Td>
                      <Td>{row.score === null ? '-' : <ScoreGauge value={row.score} />}</Td>
                      <Td>{row.attendance === null ? '-' : <ProgressValue value={row.attendance} />}</Td>
                      <Td>{row.goalsProgress === null ? '-' : <ProgressValue value={row.goalsProgress} />}</Td>
                      <Td>{row.tasksCompletion === null ? '-' : <ProgressValue value={row.tasksCompletion} />}</Td>
                      <Td>{row.trend}</Td>
                      <Td><StatusPill status={row.status} /></Td>
                      <Td>
                        <span style={actionGroupStyle}>
                          <button style={iconButtonStyle} aria-label={`View ${row.employeeName}`}><Eye size={14} /></button>
                          <button style={iconButtonStyle} aria-label={`More actions for ${row.employeeName}`}><MoreVertical size={14} /></button>
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel title="No employee performance records yet." text="Real employee performance records will appear here after HR creates reviews, goals, or feedback." icon={Users} />
          )}
        </section>

        <aside style={sidePanelStackStyle}>
          <Panel title="Top Performers" icon={Star}>
            {topPerformers.length ? (
              <div style={compactListStyle}>
                {topPerformers.map((row, index) => (
                  <div key={row.id} style={compactListRowStyle}>
                    <strong>{index + 1}</strong>
                    <span>{row.employeeName}</span>
                    <b>{formatScore(row.score || 0)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No top performers yet." text="Employees with high review scores will appear here." icon={Star} />
            )}
          </Panel>
          <Panel title="Performance Distribution" icon={BarChart3}>
            <EmptyPanel title="No distribution yet." text="Score ranges will appear after completed reviews." icon={BarChart3} />
          </Panel>
          <Panel title="Department Rankings" icon={BarChart3}>
            {departments.length ? (
              <div style={compactListStyle}>
                {departments.map(dept => <div key={dept} style={compactListRowStyle}><span>{dept}</span><b>-</b></div>)}
              </div>
            ) : (
              <EmptyPanel title="No department rankings yet." text="Department performance needs real review scores." icon={BarChart3} />
            )}
          </Panel>
          <Panel title="Review Completion" icon={CalendarDays}>
            <EmptyPanel title="No review completion data yet." text={`${completedReviews} completed reviews are recorded.`} icon={CalendarDays} />
          </Panel>
        </aside>
      </div>

      {!rows.length && (
        <div style={employeeInsightStripStyle}>
          <Insight icon={TrendingUp} title="AI Insight" text="Employee insights will appear after performance records are created." />
          <Insight icon={AlertTriangle} title="Employees At Risk" text="Risk signals need real goals, reviews, or feedback." />
          <Insight icon={CalendarDays} title="Review Reminder" text="Pending review reminders will appear when review cycles are added." />
          <Insight icon={Star} title="Quick Actions" text="Start a review or add feedback after configuring performance workflows." />
        </div>
      )}
    </>
  )
}

function GoalsOkrsView({ goals, allGoals }: { goals: PerformanceGoal[]; allGoals: PerformanceGoal[] }) {
  const onTrack = allGoals.filter(goal => goal.status === 'On Track').length
  const atRisk = allGoals.filter(goal => goal.status === 'At Risk').length
  const behind = allGoals.filter(goal => goal.status === 'Behind').length
  const completed = allGoals.filter(goal => goal.status === 'Completed' || Number(goal.progress || 0) >= 100).length
  const total = allGoals.length
  const overallProgress = total ? Math.round(allGoals.reduce((sum, goal) => sum + Number(goal.progress || 0), 0) / total) : 0
  const contributors = Array.from(new Set(allGoals.map(goal => goal.ownerName || goal.employeeName).filter(Boolean))) as string[]
  const upcoming = allGoals
    .filter(goal => goal.dueDate)
    .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime())
    .slice(0, 5)

  return (
    <>
      <div style={goalsDashboardGridStyle}>
        <section style={goalsMainCardStyle}>
          <div style={okrHeaderStyle}>
            <span>
              <h2 style={panelTitleStyle}>Goals & OKRs Overview</h2>
              <small style={{ color: '#64748b' }}>{goals.length ? `${goals.length} real OKRs shown` : 'No real OKRs yet'}</small>
            </span>
            <button style={primaryButtonStyle} disabled>Create OKR</button>
          </div>
          {goals.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>OKR Title</Th>
                    <Th>Owner</Th>
                    <Th>Key Results</Th>
                    <Th>Progress</Th>
                    <Th>Status</Th>
                    <Th>Due Date</Th>
                    <Th>Alignment</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {goals.map(goal => (
                    <tr key={goal.id}>
                      <Td><strong>{goal.title}</strong></Td>
                      <Td>{goal.ownerName || goal.employeeName || '-'}</Td>
                      <Td>{typeof goal.completedKeyResults === 'number' || typeof goal.keyResults === 'number' ? `${goal.completedKeyResults ?? 0} / ${goal.keyResults ?? 0}` : '-'}</Td>
                      <Td>{typeof goal.progress === 'number' ? <ProgressValue value={goal.progress} /> : '-'}</Td>
                      <Td><StatusPill status={goal.status || '-'} /></Td>
                      <Td>{goal.dueDate || '-'}</Td>
                      <Td>{goal.alignment || '-'}</Td>
                      <Td>
                        <span style={actionGroupStyle}>
                          <button style={iconButtonStyle} aria-label={`View ${goal.title}`}><Eye size={14} /></button>
                          <button style={iconButtonStyle} aria-label={`More actions for ${goal.title}`}><MoreVertical size={14} /></button>
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel title="No goals or OKRs yet." text="Real OKRs will appear here after HR creates or imports performance goals." icon={Target} />
          )}
        </section>

        <aside style={sidePanelStackStyle}>
          <Panel title="OKR Progress Overview" icon={Target}>
            {total ? (
              <div style={okrSummaryStyle}>
                <strong style={okrPercentStyle}>{overallProgress}%</strong>
                <div style={summaryRowsStyle}>
                  <SummaryLine label="On Track" value={onTrack} color="#16a34a" />
                  <SummaryLine label="At Risk" value={atRisk} color="#f59e0b" />
                  <SummaryLine label="Behind" value={behind} color="#ef4444" />
                  <SummaryLine label="Completed" value={completed} color="#2563eb" />
                </div>
              </div>
            ) : (
              <EmptyPanel title="No OKR progress yet." text="Progress charts need real OKR data." icon={Target} />
            )}
          </Panel>
          <Panel title="OKR Alignment" icon={Flag}>
            <EmptyPanel title="No alignment data yet." text="Company, department, team, and individual alignment will appear after OKRs are linked." icon={Flag} />
          </Panel>
          <Panel title="Top OKR Contributors" icon={Users}>
            {contributors.length ? (
              <div style={compactListStyle}>
                {contributors.map((name, index) => (
                  <div key={name} style={compactListRowStyle}>
                    <strong>{index + 1}</strong>
                    <span>{name}</span>
                    <b>{allGoals.filter(goal => (goal.ownerName || goal.employeeName) === name).length}</b>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No contributors yet." text="Owners will appear after OKRs are assigned." icon={Users} />
            )}
          </Panel>
          <Panel title="Upcoming Deadlines" icon={CalendarDays}>
            {upcoming.length ? (
              <div style={compactListStyle}>
                {upcoming.map(goal => (
                  <div key={goal.id} style={deadlineRowStyle}>
                    <span>{goal.title}</span>
                    <b>{goal.dueDate}</b>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No upcoming deadlines." text="Deadlines will appear when OKRs have due dates." icon={CalendarDays} />
            )}
          </Panel>
        </aside>
      </div>

      {!goals.length && (
        <div style={employeeInsightStripStyle}>
          <Insight icon={TrendingUp} title="AI Insights" text="OKR insights will appear after goals are created." />
          <Insight icon={AlertTriangle} title="OKRs At Risk" text="At-risk OKRs will be shown from real goal statuses." />
          <Insight icon={Target} title="OKR Health Check" text="Health checks need progress and status data." />
          <Insight icon={Star} title="Quick Actions" text="Create OKR, check-ins, and reports can be wired after data flows exist." />
        </div>
      )}
    </>
  )
}

function ReviewsView({ reviews, allReviews }: { reviews: PerformanceReview[]; allReviews: PerformanceReview[] }) {
  const completed = allReviews.filter(review => review.status === 'Completed').length
  const inProgress = allReviews.filter(review => review.status === 'In Progress').length
  const pending = allReviews.filter(review => review.status === 'Pending').length
  const total = allReviews.length
  const completionRate = total ? Math.round((completed / total) * 100) : 0
  const dueReviews = allReviews
    .filter(review => review.dueDate)
    .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime())
    .slice(0, 5)
  const departments = Array.from(new Set(allReviews.map(review => review.department).filter(Boolean))) as string[]

  return (
    <>
      <div style={goalsDashboardGridStyle}>
        <section style={goalsMainCardStyle}>
          <div style={okrHeaderStyle}>
            <span>
              <h2 style={panelTitleStyle}>Reviews Overview</h2>
              <small style={{ color: '#64748b' }}>{reviews.length ? `${reviews.length} real reviews shown` : 'No real reviews yet'}</small>
            </span>
            <span style={actionGroupStyle}>
              <button style={secondaryButtonStyle} disabled>Bulk Actions</button>
              <button style={primaryButtonStyle} disabled>Start Review</button>
            </span>
          </div>
          <div style={subTabsStyle}>
            {['All Reviews', 'Self Reviews', 'Manager Reviews', 'Peer Reviews', '360 Reviews', 'Calibration'].map((tab, index) => (
              <button key={tab} style={subTabStyle(index === 0)}>{tab}</button>
            ))}
          </div>
          {reviews.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Employee</Th>
                    <Th>Department</Th>
                    <Th>Review Type</Th>
                    <Th>Reviewer</Th>
                    <Th>Review Status</Th>
                    <Th>Overall Rating</Th>
                    <Th>Progress</Th>
                    <Th>Due Date</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map(review => (
                    <tr key={review.id}>
                      <Td><strong>{review.employeeName || '-'}</strong></Td>
                      <Td>{review.department || '-'}</Td>
                      <Td>{review.reviewType || '-'}</Td>
                      <Td>{review.reviewerName || '-'}</Td>
                      <Td><StatusPill status={review.status || '-'} /></Td>
                      <Td>{typeof review.score === 'number' ? `${normalizeRating(review.score)} â˜…` : '-'}</Td>
                      <Td>{typeof review.progress === 'number' ? <ProgressValue value={review.progress} /> : '-'}</Td>
                      <Td>{review.dueDate || review.reviewDate || '-'}</Td>
                      <Td>
                        <span style={actionGroupStyle}>
                          <button style={iconButtonStyle} aria-label={`View review for ${review.employeeName || 'employee'}`}><Eye size={14} /></button>
                          <button style={iconButtonStyle} aria-label={`More actions for ${review.employeeName || 'employee review'}`}><MoreVertical size={14} /></button>
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel title="No reviews yet." text="Real review records will appear here after HR starts a review cycle or imports reviews." icon={CalendarDays} />
          )}
        </section>

        <aside style={sidePanelStackStyle}>
          <Panel title="Review Cycle Progress" icon={Target}>
            {total ? (
              <div style={okrSummaryStyle}>
                <strong style={okrPercentStyle}>{completionRate}%</strong>
                <div style={summaryRowsStyle}>
                  <SummaryLine label="Completed" value={completed} color="#16a34a" />
                  <SummaryLine label="In Progress" value={inProgress} color="#2563eb" />
                  <SummaryLine label="Pending" value={pending} color="#f59e0b" />
                </div>
              </div>
            ) : (
              <EmptyPanel title="No review cycle progress yet." text="Progress will appear after review records are created." icon={Target} />
            )}
          </Panel>
          <Panel title="Review Type Distribution" icon={BarChart3}>
            <EmptyPanel title="No review type distribution yet." text="Review types will be grouped once real reviews exist." icon={BarChart3} />
          </Panel>
          <Panel title="Upcoming Review Deadlines" icon={CalendarDays}>
            {dueReviews.length ? (
              <div style={compactListStyle}>
                {dueReviews.map(review => (
                  <div key={review.id} style={deadlineRowStyle}>
                    <span>{review.employeeName || '-'}</span>
                    <b>{review.dueDate}</b>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No upcoming deadlines." text="Review deadlines will appear when due dates are added." icon={CalendarDays} />
            )}
          </Panel>
          <Panel title="Review Completion by Department" icon={BarChart3}>
            {departments.length ? (
              <div style={compactListStyle}>
                {departments.map(dept => <div key={dept} style={compactListRowStyle}><span>{dept}</span><b>-</b></div>)}
              </div>
            ) : (
              <EmptyPanel title="No department completion yet." text="Department completion needs real review records." icon={BarChart3} />
            )}
          </Panel>
        </aside>
      </div>

      {!reviews.length && (
        <div style={employeeInsightStripStyle}>
          <Insight icon={Flag} title="Review Guidelines" text="Guidelines will appear after review templates are configured." />
          <Insight icon={Users} title="Calibration Sessions" text="Calibration sessions will appear when scheduled." />
          <Insight icon={BarChart3} title="Feedback Analytics" text="Feedback analytics need completed real reviews." />
          <Insight icon={Star} title="Quick Actions" text="Start review, send reminders, and review reports can be wired to real workflows." />
        </div>
      )}
    </>
  )
}

function InsightsReportsView({ reviews, goals, feedback }: { reviews: PerformanceReview[]; goals: PerformanceGoal[]; feedback: PerformanceFeedback[] }) {
  const hasData = reviews.length > 0 || goals.length > 0 || feedback.length > 0
  const departments = Array.from(new Set(reviews.map(review => review.department).filter(Boolean))) as string[]
  const highPerformers = reviews.filter(review => Number(review.score || 0) >= 90)
  const riskGoals = goals.filter(goal => goal.status === 'At Risk' || goal.status === 'Behind')

  return (
    <>
      <div style={insightsGridStyle}>
        <section style={insightsMainStackStyle}>
          <div style={insightChartsGridStyle}>
            <Panel title="Performance Trend" icon={LineChart}>
              <EmptyPanel title="No performance trend yet." text="Trend lines need real historical performance scores." icon={LineChart} />
            </Panel>
            <Panel title="Performance by Department" icon={BarChart3}>
              {departments.length ? (
                <div style={compactListStyle}>
                  {departments.map(dept => (
                    <div key={dept} style={compactListRowStyle}>
                      <span>{dept}</span>
                      <b>{reviews.filter(review => review.department === dept).length}</b>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyPanel title="No department report yet." text="Department reporting needs real review records." icon={BarChart3} />
              )}
            </Panel>
          </div>

          <div style={insightChartsGridStyle}>
            <Panel title="Performance Distribution" icon={BarChart3}>
              <EmptyPanel title="No distribution yet." text="Score distribution will appear after completed reviews." icon={BarChart3} />
            </Panel>
            <Panel title="Top Strengths" icon={Star}>
              <EmptyPanel title="No strengths yet." text="Strengths need real review criteria or feedback tags." icon={Star} />
            </Panel>
            <Panel title="Areas for Improvement" icon={AlertTriangle}>
              <EmptyPanel title="No improvement areas yet." text="Improvement areas will appear from real review feedback." icon={AlertTriangle} />
            </Panel>
          </div>

          <Panel title="Reports Library" icon={Download}>
            <div style={subTabsStyle}>
              {['Popular Reports', 'Performance Reports', 'Team Reports', 'Trend Reports', 'Compliance Reports', 'Custom Reports'].map((tab, index) => (
                <button key={tab} style={subTabStyle(index === 0)}>{tab}</button>
              ))}
            </div>
            <EmptyPanel title="No performance reports yet." text="Generated performance reports will appear here after real reports are created." icon={Download} />
          </Panel>
        </section>

        <aside style={sidePanelStackStyle}>
          <Panel title="AI Insights" icon={TrendingUp}>
            {hasData ? (
              <div style={compactListStyle}>
                <div style={recommendationRowStyle}>
                  <strong>{highPerformers.length} high performers found</strong>
                  <span>Based only on real scored reviews.</span>
                </div>
                <div style={recommendationRowStyle}>
                  <strong>{riskGoals.length} at-risk goals found</strong>
                  <span>Based only on real OKR statuses.</span>
                </div>
              </div>
            ) : (
              <EmptyPanel title="No AI insights yet." text="AI insights need real performance, goal, or feedback records." icon={TrendingUp} />
            )}
          </Panel>
          <Panel title="Recommended Actions" icon={Flag}>
            <EmptyPanel title="No recommendations yet." text="Recommendations will appear when real performance signals need action." icon={Flag} />
          </Panel>
          <Panel title="Schedule Reports" icon={CalendarDays}>
            <EmptyPanel title="No scheduled reports yet." text="Scheduled performance reports will appear here." icon={CalendarDays} />
          </Panel>
        </aside>
      </div>

      {!hasData && (
        <div style={poweredInsightStyle}>
          <span>Powered by WiseFlow AI: insights will activate when real performance data exists.</span>
        </div>
      )}
    </>
  )
}

function SummaryLine({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={summaryLineStyle}>
      <span style={{ ...summaryDotStyle, background: color }} />
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}

function normalizeRating(score: number) {
  const rating = score > 5 ? score / 20 : score
  return rating.toFixed(1)
}

function averageReviewRating(reviews: PerformanceReview[]) {
  const scored = reviews.filter(review => typeof review.score === 'number')
  if (!scored.length) return '- / 5'
  const average = scored.reduce((sum, review) => sum + Number(review.score || 0), 0) / scored.length
  return `${normalizeRating(average)} / 5`
}

function emptyTitle(tab: TabKey) {
  if (tab === 'employees') return 'No employee performance records yet.'
  if (tab === 'teams') return 'No team performance records yet.'
  if (tab === 'goals') return 'No goals or OKRs yet.'
  if (tab === 'reviews') return 'No reviews yet.'
  return 'No insights or reports yet.'
}

function SelectFilter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label style={selectFieldStyle}>
      <span>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} style={selectStyle}>
        {options.map(option => <option key={option}>{option}</option>)}
      </select>
    </label>
  )
}

function Metric({ icon: Icon, label, value, sub, color, bg }: { icon: typeof Users; label: string; value: string | number; sub: string; color: string; bg: string }) {
  return (
    <article style={metricCardStyle}>
      <span style={{ ...metricIconStyle, background: bg }}><Icon size={22} color={color} /></span>
      <span>
        <small style={{ color: '#475569', fontSize: 12 }}>{label}</small>
        <strong style={{ display: 'block', marginTop: 6, fontSize: 22, color: '#0f172a' }}>{value}</strong>
        <small style={{ display: 'block', marginTop: 8, color: '#64748b', fontSize: 12 }}>{sub}</small>
      </span>
    </article>
  )
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof BarChart3; children: React.ReactNode }) {
  return (
    <section style={panelStyle}>
      <div style={panelHeaderStyle}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Icon size={16} color="#64748b" />
          <h2 style={panelTitleStyle}>{title}</h2>
        </span>
      </div>
      {children}
    </section>
  )
}

function EmptyPanel({ title, text, icon: Icon }: { title: string; text: string; icon: typeof BarChart3 }) {
  return (
    <div style={emptyPanelStyle}>
      <Icon size={32} color="#94a3b8" />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  )
}

function ReviewsTable({ reviews }: { reviews: PerformanceReview[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Employee</Th>
            <Th>Reviewer</Th>
            <Th>Score</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {reviews.map(review => (
            <tr key={review.id}>
              <Td>{review.employeeName || '-'}</Td>
              <Td>{review.reviewerName || '-'}</Td>
              <Td>{review.score ?? '-'}</Td>
              <Td>{review.status || '-'}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Insight({ icon: Icon, title, text }: { icon: typeof LineChart; title: string; text: string }) {
  return (
    <article style={insightStyle}>
      <Icon size={20} color="#16a34a" />
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </article>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={thStyle}>{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={tdStyle}>{children}</td>
}

function ScoreGauge({ value }: { value: number }) {
  const color = value >= 85 ? '#16a34a' : value >= 70 ? '#f59e0b' : '#ef4444'
  return <span style={{ ...scoreGaugeStyle, borderColor: color, color }}>{formatScore(value)}</span>
}

function ProgressValue({ value }: { value: number }) {
  return (
    <span style={progressWrapStyle}>
      <span style={progressTrackStyle}><span style={{ ...progressFillStyle, width: `${Math.max(0, Math.min(100, value))}%` }} /></span>
      <b>{Math.round(value)}%</b>
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const style = normalized.includes('risk') || normalized.includes('behind')
    ? { background: '#fee2e2', color: '#dc2626' }
    : normalized.includes('completed') || normalized.includes('excellent')
      ? { background: '#dcfce7', color: '#16a34a' }
      : { background: '#f1f5f9', color: '#475569' }
  return <span style={{ ...statusPillStyle, ...style }}>{status}</span>
}

const pageHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' as const, marginBottom: 18 }
const pageTitleStyle = { margin: 0, color: '#0f172a', fontSize: 28, fontWeight: 900 }
const pageSubtitleStyle = { margin: '6px 0 0', color: '#475569', fontSize: 14 }
const toolbarStyle = { display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'center' }
const periodBarStyle = { marginBottom: 16, padding: 14, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' as const, boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }
const monthFieldStyle = { display: 'grid', gap: 5, color: '#64748b', fontSize: 11, fontWeight: 800 }
const monthInputStyle = { minHeight: 40, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', padding: '0 12px', fontSize: 13, fontFamily: font }
const tabsStyle = { display: 'flex', gap: 26, borderBottom: '1px solid #e5e7eb', overflowX: 'auto' as const, marginBottom: 18 }
const tabStyle = (active: boolean) => ({ border: 'none', background: 'transparent', padding: '13px 0', borderBottom: active ? '2px solid #111827' : '2px solid transparent', color: active ? '#111827' : '#334155', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap' as const })
const searchBoxStyle = { minHeight: 40, minWidth: 330, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontSize: 13, fontFamily: font }
const plainInputStyle = { border: 'none', outline: 'none', background: 'transparent', width: '100%', font: 'inherit' }
const secondaryButtonStyle = { minHeight: 40, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: font }
const selectStyle = { minHeight: 40, minWidth: 150, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', padding: '0 12px', fontSize: 13, fontFamily: font }
const metricGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }
const metricCardStyle = { minHeight: 126, padding: 18, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', display: 'flex', alignItems: 'center', gap: 16 }
const metricIconStyle = { width: 54, height: 54, borderRadius: 14, display: 'grid', placeItems: 'center', flexShrink: 0 }
const filterBarStyle = { marginBottom: 18, padding: 14, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' as const, boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }
const selectFieldStyle = { display: 'grid', gap: 5, color: '#64748b', fontSize: 11, fontWeight: 800 }
const viewToggleStyle = { marginLeft: 'auto', display: 'flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }
const viewButtonStyle = (active: boolean) => ({ width: 38, height: 38, border: 'none', borderRight: '1px solid #e5e7eb', background: active ? '#dcfce7' : '#fff', color: active ? '#16a34a' : '#64748b', display: 'grid', placeItems: 'center', cursor: 'pointer' })
const dashboardGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(260px, 1fr))', gap: 14 }
const employeePerformanceGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 14, alignItems: 'start' }
const employeeTableCardStyle = { minHeight: 520, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', overflow: 'hidden' }
const goalsDashboardGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 14, alignItems: 'start' }
const goalsMainCardStyle = { minHeight: 560, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', overflow: 'hidden' }
const okrHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '15px 16px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' as const }
const primaryButtonStyle = { minHeight: 36, border: '1px solid #16a34a', borderRadius: 8, background: '#16a34a', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 14px', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font }
const subTabsStyle = { display: 'flex', gap: 22, padding: '0 16px', borderBottom: '1px solid #f1f5f9', overflowX: 'auto' as const }
const subTabStyle = (active: boolean) => ({ border: 'none', background: 'transparent', padding: '12px 0', borderBottom: active ? '2px solid #22c55e' : '2px solid transparent', color: active ? '#16a34a' : '#334155', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap' as const })
const sidePanelStackStyle = { display: 'grid', gap: 14 }
const panelStyle = { minHeight: 290, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', overflow: 'hidden' }
const panelHeaderStyle = { padding: '15px 16px', borderBottom: '1px solid #f1f5f9' }
const panelTitleStyle = { margin: 0, color: '#0f172a', fontSize: 14, fontWeight: 900 }
const emptyPanelStyle = { minHeight: 220, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 8, padding: 20, color: '#64748b', fontSize: 13, textAlign: 'center' as const }
const insightStripStyle = { marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }
const employeeInsightStripStyle = { ...insightStripStyle, marginTop: 14 }
const insightStyle = { padding: 18, borderRight: '1px solid #f1f5f9', display: 'flex', gap: 12, alignItems: 'flex-start', color: '#0f172a', fontSize: 13 }
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, minWidth: 520 }
const thStyle = { textAlign: 'left' as const, padding: '12px 16px', color: '#475569', fontSize: 11, fontWeight: 900, background: '#fbfdff' }
const tdStyle = { padding: '12px 16px', borderTop: '1px solid #f1f5f9', color: '#0f172a', fontSize: 12 }
const scoreGaugeStyle = { width: 42, height: 42, borderRadius: 999, border: '3px solid', display: 'inline-grid', placeItems: 'center', fontSize: 11, fontWeight: 900 }
const progressWrapStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 110 }
const progressTrackStyle = { width: 74, height: 6, borderRadius: 999, background: '#e5e7eb', overflow: 'hidden', display: 'inline-flex' }
const progressFillStyle = { height: '100%', borderRadius: 999, background: '#16a34a', display: 'block' }
const statusPillStyle = { display: 'inline-flex', alignItems: 'center', minHeight: 22, padding: '0 8px', borderRadius: 999, fontSize: 11, fontWeight: 900 }
const actionGroupStyle = { display: 'inline-flex', gap: 6 }
const iconButtonStyle = { width: 30, height: 30, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#475569', display: 'inline-grid', placeItems: 'center', cursor: 'pointer' }
const compactListStyle = { display: 'grid', gap: 0, padding: 14 }
const compactListRowStyle = { display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontSize: 12 }
const okrSummaryStyle = { display: 'grid', placeItems: 'center', gap: 14, padding: 18, minHeight: 220 }
const okrPercentStyle = { width: 96, height: 96, borderRadius: 999, border: '12px solid #16a34a', display: 'grid', placeItems: 'center', color: '#0f172a', fontSize: 22 }
const summaryRowsStyle = { display: 'grid', gap: 8, width: '100%' }
const summaryLineStyle = { display: 'grid', gridTemplateColumns: '10px 1fr auto', alignItems: 'center', gap: 8, color: '#0f172a', fontSize: 12 }
const summaryDotStyle = { width: 8, height: 8, borderRadius: 999 }
const deadlineRowStyle = { display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontSize: 12 }
const insightsGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 14, alignItems: 'start' }
const insightsMainStackStyle = { display: 'grid', gap: 14 }
const insightChartsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }
const recommendationRowStyle = { display: 'grid', gap: 4, padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontSize: 12 }
const poweredInsightStyle = { marginTop: 14, padding: '12px 16px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 10, color: '#047857', fontSize: 13, fontWeight: 800 }
