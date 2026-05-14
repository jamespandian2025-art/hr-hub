'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle, Briefcase, Camera, ChevronDown,
  Copy, CreditCard, FileText, KeyRound, RefreshCw, Save, Trash2, Upload, User, Users, X,
} from 'lucide-react'
import { formatPhilippineMobileNumber, isValidPhilippineMobileNumber, philippineMobilePlaceholder } from '@/lib/hrms/philippinesPhone'

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const font = "var(--font-body)"

const DEPARTMENTS = ['Engineering','Human Resources','Finance','Design','Operations','Marketing','Sales','IT','Product','Legal','Customer Support']
const TEAMS       = ['Platform Team','HR Team','Finance Team','Product Team','Operations Team','Growth Team','Sales Team','Support Team','Dev Team','Design Team']
const JOB_TITLES  = ['Software Engineer','HR Coordinator','Accountant','UI/UX Designer','Project Manager','Marketing Specialist','Sales Executive','Content Writer','Data Analyst','DevOps Engineer','Product Manager','Team Lead','Department Head','Director']
const SHIFTS      = ['General Shift (9:00 AM - 6:00 PM)','Morning Shift (6:00 AM - 2:00 PM)','Afternoon Shift (2:00 PM - 10:00 PM)','Night Shift (10:00 PM - 6:00 AM)']
const GRADES      = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Senior','Principal','Lead','Manager']
const LOCATIONS   = ['Head Office','Remote','Branch - Manila','Branch - Cebu','Branch - Davao']
const WORK_TYPES  = ['On-Site','Hybrid','Remote']
const EMPLOYEE_TYPES = ['Full Time','Part Time','Contract','Intern','Probationary']
const EMPLOYEE_ROLES = ['Employee','Team Manager','Department Manager','HR Staff','HR Manager','Admin']
const STATUS_OPTS = ['Active','Inactive','On Leave','Probationary']
const GENDERS     = ['Male','Female','Non-binary','Prefer not to say']
const MARITAL     = ['Single','Married','Divorced','Widowed']
const LANGUAGES   = ['English','Filipino','Spanish','Chinese','Japanese','Korean','French','Arabic','Hindi','German']
const RELIGIONS   = ['Christianity','Islam','Buddhism','Hinduism','Judaism','Atheism / No Religion','Other']
const NATIONALITIES = ['Filipino','American','British','Australian','Canadian','Japanese','Korean','Chinese','Indian','Other']
const RELATIONS   = ['Spouse','Parent','Child','Sibling','Relative','Friend']

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface FormState {
  // Employment left panel
  employeeId: string; employeeType: string; employeeRole: string; employmentStatus: string
  dateOfJoining: string; probationPeriod: string
  // Personal
  firstName: string; middleName: string; lastName: string
  email: string; phone: string; alternatePhone: string
  dateOfBirth: string; gender: string; maritalStatus: string
  nationality: string; religion: string; languages: string[]
  address: string
  // Job
  department: string; team: string; jobTitle: string; reportsTo: string
  workLocation: string; workType: string; shift: string; employeeGrade: string
  noticePeriod: string; contractEndDate: string
  // Salary
  basicSalary: string; allowances: string; deductions: string
  paymentMethod: string; bankName: string; accountNumber: string
  // Emergency contact
  ecName: string; ecRelationship: string; ecPhone: string; ecEmail: string; ecAddress: string
  // Additional
  bloodGroup: string; medicalConditions: string; notes: string
}

interface EmployeeSummary {
  id: string
  employeeId?: string
  firstName?: string
  middleName?: string
  lastName?: string
  email?: string
  employeeType?: string
  employeeRole?: string
  employmentStatus?: string
  department?: string
  team?: string
  jobTitle?: string
}

interface HRTeamSummary {
  id: string
  name: string
  department?: string
  managerName?: string
  leadName?: string
}

interface UploadedDocument {
  id: string
  name: string
  type: string
  mimeType: string
  size: string
  sizeBytes: number
  dataUrl: string
  uploadedAt: string
  employeeId?: string
}

const emptyForm: FormState = {
  employeeId: '', employeeType: 'Full Time', employeeRole: 'Employee', employmentStatus: 'Active',
  dateOfJoining: new Date().toISOString().slice(0, 10), probationPeriod: '3',
  firstName: '', middleName: '', lastName: '',
  email: '', phone: '', alternatePhone: '',
  dateOfBirth: '', gender: '', maritalStatus: '',
  nationality: '', religion: '', languages: [],
  address: '',
  department: '', team: '', jobTitle: '', reportsTo: '',
  workLocation: 'Head Office', workType: 'Hybrid', shift: 'General Shift (9:00 AM - 6:00 PM)', employeeGrade: '',
  noticePeriod: '30', contractEndDate: '',
  basicSalary: '', allowances: '', deductions: '',
  paymentMethod: 'Bank Transfer', bankName: '', accountNumber: '',
  ecName: '', ecRelationship: '', ecPhone: '', ecEmail: '', ecAddress: '',
  bloodGroup: '', medicalConditions: '', notes: '',
}

// â”€â”€â”€ Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { const r = window.localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fallback } catch { return fallback }
}

function generateEmpId(existingIds: string[]): string {
  const nums = existingIds.map(id => parseInt(id.replace('EMP-', ''), 10)).filter(n => !isNaN(n))
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `EMP-${String(next).padStart(4, '0')}`
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
}

function buildPortalEmail(firstName: string, lastName: string, employeeId: string) {
  const namePart = [slug(firstName), slug(lastName)].filter(Boolean).join('.') || 'employee'
  const idPart = slug(employeeId) || 'new'
  return `${namePart}.${idPart}@wiseflow.employee`
}

function employeeFullName(employee?: Pick<EmployeeSummary, 'firstName' | 'middleName' | 'lastName'>) {
  return [employee?.firstName, employee?.middleName, employee?.lastName].filter(Boolean).join(' ').trim()
}

function isLeadershipRole(value?: string) {
  return /\b(team\s*manager|department\s*manager|manager|team\s*lead|lead|head|director|supervisor)\b/i.test(value || '')
}

function createInitialForm(): FormState {
  const existing: { employeeId: string }[] = loadStored('flowsys-hr-employees', [])
  return { ...emptyForm, employeeId: generateEmpId(existing.map(employee => employee.employeeId)) }
}

function randomToken(length: number) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const values = new Uint32Array(length)
    window.crypto.getRandomValues(values)
    return Array.from(values, value => chars[value % chars.length]).join('')
  }
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function generatePortalPassword() {
  return `WF-${randomToken(4)}-${randomToken(4)}`
}

const credentialEmailKey = 'flowsys-hr-credential-email-outbox'

async function openCredentialEmail(employee: { employeeId?: string; firstName?: string; lastName?: string; email?: string; portalEmail?: string; portalPassword?: string; jobTitle?: string }) {
  const recipient = employee.email?.trim()
  if (!recipient || !employee.portalEmail || !employee.portalPassword) return false

  const employeeName = [employee.firstName, employee.lastName].filter(Boolean).join(' ').trim() || 'Employee'
  const loginUrl = `${window.location.origin}/employee/login`
  const subject = `WiseFlow employee portal login details`
  const body = [
    `Hello ${employeeName},`,
    '',
    'Your WiseFlow Employee Self-Service portal account is ready.',
    '',
    `Login page: ${loginUrl}`,
    `Login email: ${employee.portalEmail}`,
    `Temporary password: ${employee.portalPassword}`,
    '',
    'Please sign in and change your temporary password after your first login.',
    '',
    'Thank you,',
    'WiseFlow HR',
  ].join('\n')

  let status = 'Prepared'
  try {
    const response = await fetch('/api/hr/employee-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient,
        employeeName,
        portalEmail: employee.portalEmail,
        portalPassword: employee.portalPassword,
        loginUrl,
      }),
    })
    const result = await response.json()
    status = result?.ok ? 'Sent' : 'Prepared'
  } catch {
    status = 'Prepared'
  }

  const outbox = loadStored<object[]>(credentialEmailKey, [])
  window.localStorage.setItem(credentialEmailKey, JSON.stringify([
    ...outbox,
    {
      id: `credential_email_${Date.now()}`,
      employeeId: employee.employeeId,
      employeeName,
      recipient,
      portalEmail: employee.portalEmail,
      status,
      createdAt: new Date().toISOString(),
    },
  ]))

  if (status !== 'Sent') window.open(`mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
  return true
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileExtension(name: string) {
  return name.includes('.') ? name.split('.').pop()?.toLowerCase() || 'file' : 'file'
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
      {children} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text', disabled, inputMode, maxLength, list }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; maxLength?: number; list?: string
}) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled} inputMode={inputMode} maxLength={maxLength} list={list}
      style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#111827', background: disabled ? '#f9fafb' : '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: font }}
    />
  )
}

function SelectInput({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 32px 8px 12px', fontSize: 13, color: value ? '#111827' : '#9ca3af', background: '#fff', outline: 'none', appearance: 'none', boxSizing: 'border-box', fontFamily: font, cursor: 'pointer' }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={13} color="#9ca3af" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  )
}

function MultiSelect({ value, onChange, options, placeholder }: {
  value: string[]; onChange: (v: string[]) => void; options: string[]; placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 32px 6px 10px', minHeight: 38, cursor: 'pointer', background: '#fff', position: 'relative' }}>
        {value.length === 0 && <span style={{ fontSize: 13, color: '#9ca3af' }}>{placeholder || 'Select...'}</span>}
        {value.map(v => (
          <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, background: '#dcfce7', color: '#15803d', borderRadius: 99, padding: '2px 8px', fontWeight: 500 }}>
            {v}
            <span onClick={e => { e.stopPropagation(); onChange(value.filter(x => x !== v)) }} style={{ cursor: 'pointer', lineHeight: 1 }}><X size={10} /></span>
          </span>
        ))}
        <ChevronDown size={13} color="#9ca3af" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }} />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 80, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
          {options.map(o => (
            <div key={o} onClick={() => { onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o]) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', cursor: 'pointer', background: value.includes(o) ? '#f0fdf4' : 'transparent', fontSize: 13, color: value.includes(o) ? '#15803d' : '#374151' }}>
              <span style={{ width: 14, height: 14, border: `2px solid ${value.includes(o) ? '#22c55e' : '#d1d5db'}`, borderRadius: 3, background: value.includes(o) ? '#22c55e' : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                {value.includes(o) && <span style={{ width: 6, height: 6, background: '#fff', borderRadius: 1 }} />}
              </span>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const TABS = [
  { id: 'personal',   label: 'Personal Information', Icon: User },
  { id: 'job',        label: 'Job Information',       Icon: Briefcase },
  { id: 'salary',     label: 'Salary Information',    Icon: CreditCard },
  { id: 'documents',  label: 'Documents',             Icon: FileText },
  { id: 'emergency',  label: 'Emergency Contact',     Icon: AlertCircle },
  { id: 'additional', label: 'Additional Information',Icon: Users },
]

// â”€â”€â”€ Add Employee page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function AddEmployeePage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(() => createInitialForm())
  const [activeTab, setActiveTab] = useState('personal')
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [documentError, setDocumentError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveWarning, setSaveWarning] = useState('')
  const [saving, setSaving] = useState(false)
  const [portalPassword, setPortalPassword] = useState(() => generatePortalPassword())
  const [copiedCredential, setCopiedCredential] = useState('')
  const [emailCredentials, setEmailCredentials] = useState(true)
  const [employees] = useState<EmployeeSummary[]>(() => loadStored<EmployeeSummary[]>('flowsys-hr-employees', []))
  const [teams] = useState<HRTeamSummary[]>(() => loadStored<HRTeamSummary[]>('flowsys-hr-teams', []))
  const photoInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  const teamOptions = useMemo(() => {
    const savedTeams = teams.map(team => team.name).filter(Boolean)
    return Array.from(new Set([...savedTeams, ...TEAMS])).sort((a, b) => a.localeCompare(b))
  }, [teams])

  const departmentOptions = useMemo(() => {
    const savedDepartments = teams.map(team => team.department || '').filter(Boolean)
    return Array.from(new Set([...savedDepartments, ...DEPARTMENTS])).sort((a, b) => a.localeCompare(b))
  }, [teams])

  const reportsToOptions = useMemo(() => {
    const selectedTeam = form.team.trim().toLowerCase()
    const selectedDepartment = form.department.trim().toLowerCase()
    const matchingTeams = teams.filter(team => {
      if (selectedTeam) return team.name.trim().toLowerCase() === selectedTeam
      if (selectedDepartment) return (team.department || '').trim().toLowerCase() === selectedDepartment
      return true
    })

    const names = new Set<string>()
    matchingTeams.forEach(team => {
      if (team.managerName?.trim()) names.add(team.managerName.trim())
      if (team.leadName?.trim()) names.add(team.leadName.trim())
    })

    employees.forEach(employee => {
      const sameTeam = !selectedTeam || (employee.team || '').trim().toLowerCase() === selectedTeam
      const sameDepartment = !selectedDepartment || (employee.department || '').trim().toLowerCase() === selectedDepartment
      const isActive = !employee.employmentStatus || employee.employmentStatus === 'Active' || employee.employmentStatus === 'Probationary'
      const isLeader = isLeadershipRole(employee.employeeRole) || isLeadershipRole(employee.jobTitle) || isLeadershipRole(employee.employeeType)
      const name = employeeFullName(employee)
      if (name && sameTeam && sameDepartment && isActive && isLeader) names.add(name)
    })

    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [employees, form.department, form.team, teams])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    const phoneField = key === 'phone' || key === 'alternatePhone' || key === 'ecPhone'
    const nextValue = phoneField ? formatPhilippineMobileNumber(String(value)) : value
    setForm(prev => ({ ...prev, [key]: nextValue, ...(key === 'department' || key === 'team' ? { reportsTo: '' } : {}) }))
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e })
  }

  function validate(): boolean {
    const e: typeof errors = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim())  e.lastName  = 'Required'
    if (!form.phone.trim())     e.phone     = 'Required'
    else if (!isValidPhilippineMobileNumber(form.phone)) e.phone = `Use Philippine mobile format: ${philippineMobilePlaceholder}`
    if (form.alternatePhone.trim() && !isValidPhilippineMobileNumber(form.alternatePhone)) e.alternatePhone = `Use Philippine mobile format: ${philippineMobilePlaceholder}`
    if (form.ecPhone.trim() && !isValidPhilippineMobileNumber(form.ecPhone)) e.ecPhone = `Use Philippine mobile format: ${philippineMobilePlaceholder}`
    if (!form.dateOfBirth)      e.dateOfBirth = 'Required'
    if (!form.gender)           e.gender    = 'Required'
    if (!form.department)       e.department = 'Required'
    if (!form.team)             e.team      = 'Required'
    if (!form.jobTitle)         e.jobTitle  = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function copyCredential(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedCredential(label)
      window.setTimeout(() => setCopiedCredential(''), 1400)
    } catch {
      setCopiedCredential('')
    }
  }

  async function handlePhotoSelect(file?: File) {
    setPhotoError('')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose a JPG, PNG, or WEBP image.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Profile photo must be 2MB or smaller.')
      return
    }
    try {
      setPhotoPreview(await readFileAsDataUrl(file))
    } catch {
      setPhotoError('Could not read this image. Please try another file.')
    }
  }

  async function handleDocumentSelect(files?: FileList | null) {
    setDocumentError('')
    if (!files?.length) return

    const next: UploadedDocument[] = []
    for (const file of Array.from(files)) {
      if (file.size > 1024 * 1024) {
        setDocumentError('Each document must be 1MB or smaller while using local browser storage.')
        continue
      }
      try {
        next.push({
          id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: fileExtension(file.name),
          mimeType: file.type || 'application/octet-stream',
          size: formatFileSize(file.size),
          sizeBytes: file.size,
          dataUrl: await readFileAsDataUrl(file),
          uploadedAt: new Date().toISOString(),
        })
      } catch {
        setDocumentError(`Could not read ${file.name}. Please try again.`)
      }
    }

    if (next.length) setDocuments(prev => [...prev, ...next])
    if (documentInputRef.current) documentInputRef.current.value = ''
  }

  async function save() {
    if (!validate()) { setActiveTab('personal'); return }
    setSaving(true)
    setSaveError('')
    setSaveWarning('')
    const existing: { id: string; employeeId: string }[] = loadStored('flowsys-hr-employees', [])
    const empId = form.employeeId.trim() || generateEmpId(existing.map(e => e.employeeId))
    const now   = new Date().toISOString()
    const portalEmail = buildPortalEmail(form.firstName, form.lastName, empId)
    const newEmp = {
      id: `emp_${Date.now()}`,
      employeeId: empId,
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      portalEmail,
      portalPassword,
      mustChangePassword: true,
      phone: form.phone.trim(),
      alternatePhone: form.alternatePhone.trim(),
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      maritalStatus: form.maritalStatus,
      nationality: form.nationality,
      religion: form.religion,
      languages: form.languages,
      address: form.address.trim(),
      employeeType: form.employeeType,
      employeeRole: form.employeeRole,
      employmentStatus: form.employmentStatus,
      dateOfJoining: form.dateOfJoining,
      probationPeriod: parseInt(form.probationPeriod) || 0,
      department: form.department,
      team: form.team,
      jobTitle: form.jobTitle,
      reportsTo: form.reportsTo,
      workLocation: form.workLocation,
      workType: form.workType,
      shift: form.shift,
      employeeGrade: form.employeeGrade,
      noticePeriod: parseInt(form.noticePeriod) || 30,
      contractEndDate: form.contractEndDate,
      basicSalary: parseFloat(form.basicSalary) || 0,
      allowances: parseFloat(form.allowances) || 0,
      deductions: parseFloat(form.deductions) || 0,
      paymentMethod: form.paymentMethod,
      bankName: form.bankName,
      accountNumber: form.accountNumber,
      photo: photoPreview,
      emergencyContactName: form.ecName,
      emergencyContactRelationship: form.ecRelationship,
      emergencyContactPhone: form.ecPhone,
      attendanceStatus: 'Present',
      payrollStatus: 'Pending',
      bloodGroup: form.bloodGroup,
      notes: form.notes,
      createdAt: now,
      updatedAt: now,
    }
    try {
      const all = loadStored<Array<typeof newEmp>>('flowsys-hr-employees', [])
      const nextEmployees = [...all.filter(employee => employee.id !== newEmp.id), newEmp]
      window.localStorage.setItem('flowsys-hr-employees', JSON.stringify(nextEmployees))

      const savedEmployees = loadStored<Array<{ id?: string; employeeId?: string }>>('flowsys-hr-employees', [])
      const savedEmployee = savedEmployees.find(employee => employee.id === newEmp.id || employee.employeeId === newEmp.employeeId)
      if (!savedEmployee) {
        throw new Error('Employee could not be verified after saving.')
      }

      let warning = ''
      if (documents.length) {
        try {
          const allDocs = loadStored<UploadedDocument[]>('flowsys-hr-documents', [])
          const employeeDocs = documents.map(doc => ({ ...doc, employeeId: newEmp.id }))
          window.localStorage.setItem('flowsys-hr-documents', JSON.stringify([...allDocs, ...employeeDocs]))
        } catch (error) {
          console.error('Could not save employee documents', error)
          warning = 'Employee saved, but one or more documents could not be saved in browser storage. Please re-upload them from the employee profile.'
        }
      }

      if (emailCredentials) {
        try {
          const emailOpened = await openCredentialEmail(newEmp)
          if (!emailOpened && !warning) {
            warning = 'Employee saved, but the login email could not be opened. You can share the credentials manually from the employee profile.'
          }
        } catch (error) {
          console.error('Could not open credential email', error)
          if (!warning) warning = 'Employee saved, but the login email could not be opened. You can share the credentials manually from the employee profile.'
        }
      }

      if (warning) {
        setSaveWarning(warning)
        window.sessionStorage.setItem(`flowsys-hr-employee-warning-${newEmp.id}`, warning)
      }

      setSaving(false)
      router.push(`/hr/employees/${encodeURIComponent(newEmp.id)}`)
    } catch (error) {
      console.error('Could not save employee', error)
      setSaveError(error instanceof DOMException && error.name === 'QuotaExceededError'
        ? 'The employee could not be saved because browser storage is full. Try a smaller profile photo or fewer documents, then save again.'
        : 'The employee could not be saved. Please check the form and try again.')
      setSaving(false)
    }
  }

  const sectionTitle = (text: string) => (
    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 14, marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
      <span style={{ flexShrink: 0, padding: '0 10px' }}>{text}</span>
      <span style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
    </div>
  )

  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }
  const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }
  const portalEmail = buildPortalEmail(form.firstName, form.lastName, form.employeeId)

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <main style={{ fontFamily: font, padding: '0 20px 40px', minHeight: '100vh', background: '#f8fafc' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 20, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>Add New Employee</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Fill in the details below to add a new employee to your organization.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/hr/employees">
            <button style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>Cancel</button>
          </Link>
          <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, background: saving ? '#9ca3af' : '#22c55e', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer' }}>
            <Save size={14} /> Save Employee
          </button>
        </div>
      </div>

      {(saveError || saveWarning) && (
        <div style={{ marginBottom: 16, border: `1px solid ${saveError ? '#fecaca' : '#fde68a'}`, background: saveError ? '#fef2f2' : '#fffbeb', color: saveError ? '#b91c1c' : '#92400e', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 700 }}>
          {saveError || saveWarning}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'flex-start' }}>

        {/* Left panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Photo upload */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 16px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Profile Photo</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 14 }}>Upload a profile photo of the employee.</div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={e => handlePhotoSelect(e.target.files?.[0])}
              style={{ display: 'none' }}
            />
            <div
              onClick={() => photoInputRef.current?.click()}
              style={{ width: 90, height: 90, borderRadius: '50%', background: '#f3f4f6', border: photoPreview ? '2px solid #22c55e' : '2px dashed #d1d5db', display: 'grid', placeItems: 'center', margin: '0 auto 12px', cursor: 'pointer', overflow: 'hidden' }}
            >
              {photoPreview ? (
                <span
                  role="img"
                  aria-label="Employee profile preview"
                  style={{ width: '100%', height: '100%', backgroundImage: `url(${photoPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
              ) : (
                <Camera size={24} color="#9ca3af" />
              )}
            </div>
            <button type="button" onClick={() => photoInputRef.current?.click()} style={{ border: '1px solid #22c55e', background: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 500, color: '#22c55e', cursor: 'pointer', width: '100%' }}>
              Upload Photo
            </button>
            {photoPreview && (
              <button type="button" onClick={() => { setPhotoPreview(''); setPhotoError('') }} style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
                Remove photo
              </button>
            )}
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 8 }}>JPG, PNG or WEBP. Max size 2MB.</div>
            {photoError && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>{photoError}</div>}
          </div>

          {/* Employment info */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14 }}>Employment Information</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <FieldLabel required>Employee ID</FieldLabel>
                <TextInput value={form.employeeId} onChange={v => set('employeeId', v)} placeholder="EMP-0001 (auto)" />
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>Unique ID will be auto-generated if left blank.</div>
              </div>
              <div>
                <FieldLabel required>Employee Type</FieldLabel>
                <SelectInput value={form.employeeType} onChange={v => set('employeeType', v)} options={EMPLOYEE_TYPES} />
              </div>
              <div>
                <FieldLabel required>Employee Role</FieldLabel>
                <SelectInput value={form.employeeRole} onChange={v => set('employeeRole', v)} options={EMPLOYEE_ROLES} />
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>Role controls portal access and employee permissions.</div>
              </div>
              <div>
                <FieldLabel required>Employment Status</FieldLabel>
                <SelectInput value={form.employmentStatus} onChange={v => set('employmentStatus', v)} options={STATUS_OPTS} />
              </div>
              <div>
                <FieldLabel required>Date of Joining</FieldLabel>
                <TextInput type="date" value={form.dateOfJoining} onChange={v => set('dateOfJoining', v)} />
              </div>
              <div>
                <FieldLabel>Probation Period (Months)</FieldLabel>
                <TextInput type="number" value={form.probationPeriod} onChange={v => set('probationPeriod', v)} placeholder="3" />
              </div>
            </div>
          </div>
        </div>

        {/* Right panel: tabs */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', overflowX: 'auto' }}>
            {TABS.map(t => {
              const TIcon = t.Icon
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', border: 'none', borderBottom: `2px solid ${activeTab === t.id ? '#22c55e' : 'transparent'}`, background: 'transparent', color: activeTab === t.id ? '#22c55e' : '#6b7280', fontSize: 12, fontWeight: activeTab === t.id ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: font }}>
                  <TIcon size={13} /> {t.label}
                </button>
              )
            })}
          </div>

          <div style={{ padding: '20px 24px' }}>

            {/* Personal Information */}
            {activeTab === 'personal' && (
              <div>
                <div style={grid3}>
                  <div>
                    <FieldLabel required>First Name</FieldLabel>
                    <TextInput value={form.firstName} onChange={v => set('firstName', v)} placeholder="First name" />
                    {errors.firstName && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.firstName}</div>}
                  </div>
                  <div>
                    <FieldLabel>Middle Name</FieldLabel>
                    <TextInput value={form.middleName} onChange={v => set('middleName', v)} placeholder="Middle name" />
                  </div>
                  <div>
                    <FieldLabel required>Last Name</FieldLabel>
                    <TextInput value={form.lastName} onChange={v => set('lastName', v)} placeholder="Last name" />
                    {errors.lastName && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.lastName}</div>}
                  </div>
                </div>
                <div style={{ ...grid3, marginTop: 14 }}>
                  <div>
                    <FieldLabel>Work Email Address</FieldLabel>
                    <TextInput type="email" value={form.email} onChange={v => set('email', v)} placeholder="employee@company.com" />
                    {errors.email && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.email}</div>}
                  </div>
                  <div>
                    <FieldLabel required>Phone Number</FieldLabel>
                    <TextInput value={form.phone} onChange={v => set('phone', v)} placeholder={philippineMobilePlaceholder} inputMode="tel" maxLength={17} />
                    {errors.phone && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.phone}</div>}
                  </div>
                  <div>
                    <FieldLabel>Alternate Phone</FieldLabel>
                    <TextInput value={form.alternatePhone} onChange={v => set('alternatePhone', v)} placeholder={philippineMobilePlaceholder} inputMode="tel" maxLength={17} />
                    {errors.alternatePhone && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.alternatePhone}</div>}
                  </div>
                </div>
                <div style={{ ...grid3, marginTop: 14 }}>
                  <div>
                    <FieldLabel required>Date of Birth</FieldLabel>
                    <TextInput type="date" value={form.dateOfBirth} onChange={v => set('dateOfBirth', v)} />
                    {errors.dateOfBirth && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.dateOfBirth}</div>}
                  </div>
                  <div>
                    <FieldLabel required>Gender</FieldLabel>
                    <SelectInput value={form.gender} onChange={v => set('gender', v)} options={GENDERS} placeholder="Select gender" />
                    {errors.gender && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.gender}</div>}
                  </div>
                  <div>
                    <FieldLabel>Marital Status</FieldLabel>
                    <SelectInput value={form.maritalStatus} onChange={v => set('maritalStatus', v)} options={MARITAL} placeholder="Select status" />
                  </div>
                </div>
                <div style={{ ...grid3, marginTop: 14 }}>
                  <div>
                    <FieldLabel>Nationality</FieldLabel>
                    <SelectInput value={form.nationality} onChange={v => set('nationality', v)} options={NATIONALITIES} placeholder="Select nationality" />
                  </div>
                  <div>
                    <FieldLabel>Religion</FieldLabel>
                    <SelectInput value={form.religion} onChange={v => set('religion', v)} options={RELIGIONS} placeholder="Select religion" />
                  </div>
                  <div>
                    <FieldLabel>Languages Known</FieldLabel>
                    <MultiSelect value={form.languages} onChange={v => set('languages', v)} options={LANGUAGES} placeholder="Select languages" />
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <FieldLabel>Current Address</FieldLabel>
                  <TextInput value={form.address} onChange={v => set('address', v)} placeholder="Street, City, State, Country" />
                </div>
                {sectionTitle('Employee Portal Login')}
                <div style={{ border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <KeyRound size={17} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#14532d' }}>Auto-generated employee login</div>
                      <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>Give these credentials to the employee after saving. They can use them at the employee login page.</div>
                    </div>
                  </div>
                  <div style={grid2}>
                    <div>
                      <FieldLabel>Login Email</FieldLabel>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <TextInput value={portalEmail} onChange={() => undefined} disabled />
                        <button type="button" onClick={() => copyCredential('email', portalEmail)} title="Copy login email" style={{ width: 38, height: 38, border: '1px solid #bbf7d0', borderRadius: 8, background: '#fff', color: '#16a34a', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                          <Copy size={14} />
                        </button>
                      </div>
                      {copiedCredential === 'email' && <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>Email copied.</div>}
                    </div>
                    <div>
                      <FieldLabel>Temporary Password</FieldLabel>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <TextInput value={portalPassword} onChange={() => undefined} disabled />
                        <button type="button" onClick={() => copyCredential('password', portalPassword)} title="Copy password" style={{ width: 38, height: 38, border: '1px solid #bbf7d0', borderRadius: 8, background: '#fff', color: '#16a34a', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                          <Copy size={14} />
                        </button>
                        <button type="button" onClick={() => setPortalPassword(generatePortalPassword())} title="Regenerate password" style={{ width: 38, height: 38, border: '1px solid #bbf7d0', borderRadius: 8, background: '#fff', color: '#16a34a', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                          <RefreshCw size={14} />
                        </button>
                      </div>
                      {copiedCredential === 'password' && <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>Password copied.</div>}
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid #bbf7d0', color: '#166534', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={emailCredentials}
                      onChange={event => setEmailCredentials(event.target.checked)}
                      style={{ marginTop: 2, accentColor: '#16a34a' }}
                    />
                    <span>
                      Send login details to the work email after saving.
                      <span style={{ display: 'block', fontWeight: 400, color: '#15803d', marginTop: 2 }}>
                        This opens a ready-to-send email using the device mail app and logs the email in the HR outbox.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Job Information */}
            {activeTab === 'job' && (
              <div>
                <div style={grid2}>
                  <div>
                    <FieldLabel required>Department</FieldLabel>
                    <TextInput value={form.department} onChange={v => set('department', v)} placeholder="Type or select department" list="department-options" />
                    <datalist id="department-options">
                      {departmentOptions.map(department => <option key={department} value={department} />)}
                    </datalist>
                    {errors.department && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.department}</div>}
                  </div>
                  <div>
                    <FieldLabel required>Team</FieldLabel>
                    <TextInput value={form.team} onChange={v => set('team', v)} placeholder="Type or select team" list="team-options" />
                    <datalist id="team-options">
                      {teamOptions.map(team => <option key={team} value={team} />)}
                    </datalist>
                    {errors.team && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.team}</div>}
                  </div>
                </div>
                <div style={{ ...grid2, marginTop: 14 }}>
                  <div>
                    <FieldLabel required>Job Title / Position</FieldLabel>
                    <TextInput value={form.jobTitle} onChange={v => set('jobTitle', v)} placeholder="Type or select position" list="job-title-options" />
                    <datalist id="job-title-options">
                      {JOB_TITLES.map(title => <option key={title} value={title} />)}
                    </datalist>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>You can type a custom position if it is not in the list.</div>
                    {errors.jobTitle && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.jobTitle}</div>}
                  </div>
                  <div>
                    <FieldLabel>Reports To</FieldLabel>
                    <TextInput value={form.reportsTo} onChange={v => set('reportsTo', v)} placeholder={reportsToOptions.length ? 'Type or select team leader' : 'Type reporting manager'} list="reports-to-options" />
                    <datalist id="reports-to-options">
                      {reportsToOptions.map(leader => <option key={leader} value={leader} />)}
                    </datalist>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                      You can type a manager manually if they are not in the list.
                    </div>
                  </div>
                </div>
                <div style={{ ...grid2, marginTop: 14 }}>
                  <div>
                    <FieldLabel required>Work Location</FieldLabel>
                    <TextInput value={form.workLocation} onChange={v => set('workLocation', v)} placeholder="Type or select work location" list="work-location-options" />
                    <datalist id="work-location-options">
                      {LOCATIONS.map(location => <option key={location} value={location} />)}
                    </datalist>
                  </div>
                  <div>
                    <FieldLabel required>Work Type</FieldLabel>
                    <SelectInput value={form.workType} onChange={v => set('workType', v)} options={WORK_TYPES} />
                  </div>
                </div>
                <div style={{ ...grid2, marginTop: 14 }}>
                  <div>
                    <FieldLabel>Shift</FieldLabel>
                    <SelectInput value={form.shift} onChange={v => set('shift', v)} options={SHIFTS} placeholder="Select shift" />
                  </div>
                  <div>
                    <FieldLabel>Employee Grade</FieldLabel>
                    <SelectInput value={form.employeeGrade} onChange={v => set('employeeGrade', v)} options={GRADES} placeholder="Select grade" />
                  </div>
                </div>
                <div style={{ ...grid2, marginTop: 14 }}>
                  <div>
                    <FieldLabel>Notice Period (Days)</FieldLabel>
                    <TextInput type="number" value={form.noticePeriod} onChange={v => set('noticePeriod', v)} placeholder="30" />
                  </div>
                  <div>
                    <FieldLabel>Contract End Date</FieldLabel>
                    <TextInput type="date" value={form.contractEndDate} onChange={v => set('contractEndDate', v)} />
                  </div>
                </div>
              </div>
            )}

            {/* Salary Information */}
            {activeTab === 'salary' && (
              <div>
                <div style={grid3}>
                  <div>
                    <FieldLabel>Basic Salary</FieldLabel>
                    <TextInput type="number" value={form.basicSalary} onChange={v => set('basicSalary', v)} placeholder="0.00" />
                  </div>
                  <div>
                    <FieldLabel>Total Allowances</FieldLabel>
                    <TextInput type="number" value={form.allowances} onChange={v => set('allowances', v)} placeholder="0.00" />
                  </div>
                  <div>
                    <FieldLabel>Total Deductions</FieldLabel>
                    <TextInput type="number" value={form.deductions} onChange={v => set('deductions', v)} placeholder="0.00" />
                  </div>
                </div>
                {sectionTitle('Net Salary Preview')}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#15803d' }}>Estimated Net Salary</span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#15803d' }}>
                      PHP {((parseFloat(form.basicSalary) || 0) + (parseFloat(form.allowances) || 0) - (parseFloat(form.deductions) || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>Monthly</div>
                </div>
                {sectionTitle('Payment Method')}
                <div style={grid2}>
                  <div>
                    <FieldLabel>Payment Method</FieldLabel>
                    <SelectInput value={form.paymentMethod} onChange={v => set('paymentMethod', v)} options={['Bank Transfer','Cash','Check','E-Wallet']} />
                  </div>
                  <div>
                    <FieldLabel>Bank Name</FieldLabel>
                    <TextInput value={form.bankName} onChange={v => set('bankName', v)} placeholder="Bank name" />
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <FieldLabel>Account Number</FieldLabel>
                  <TextInput value={form.accountNumber} onChange={v => set('accountNumber', v)} placeholder="Account number" />
                </div>
              </div>
            )}

            {/* Documents */}
            {activeTab === 'documents' && (
              <div>
                <input
                  ref={documentInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
                  onChange={e => handleDocumentSelect(e.target.files)}
                  style={{ display: 'none' }}
                />
                <div
                  onClick={() => documentInputRef.current?.click()}
                  style={{ border: '1px dashed #bbf7d0', borderRadius: 12, background: '#f0fdf4', padding: '28px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 14 }}
                >
                  <Upload size={34} color="#22c55e" style={{ marginBottom: 10 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#166534', marginBottom: 5 }}>Upload employee documents</div>
                  <div style={{ fontSize: 13, color: '#16a34a' }}>Contracts, IDs, certificates, onboarding forms, and payroll files.</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>PDF, Word, Excel, images, or text. Max 1MB per file.</div>
                </div>
                {documentError && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{documentError}</div>}
                {documents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '18px 0', color: '#9ca3af', fontSize: 13 }}>No documents selected yet.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {documents.map(doc => (
                      <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ecfdf5', color: '#16a34a', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <FileText size={16} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>{doc.type.toUpperCase()} - {doc.size}</div>
                        </div>
                        <button type="button" onClick={() => setDocuments(prev => prev.filter(item => item.id !== doc.id))} aria-label={`Remove ${doc.name}`} style={{ width: 30, height: 30, border: 'none', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Emergency Contact */}
            {activeTab === 'emergency' && (
              <div>
                <div style={grid2}>
                  <div>
                    <FieldLabel>Contact Name</FieldLabel>
                    <TextInput value={form.ecName} onChange={v => set('ecName', v)} placeholder="Full name" />
                  </div>
                  <div>
                    <FieldLabel>Relationship</FieldLabel>
                    <SelectInput value={form.ecRelationship} onChange={v => set('ecRelationship', v)} options={RELATIONS} placeholder="Select relationship" />
                  </div>
                </div>
                <div style={{ ...grid2, marginTop: 14 }}>
                  <div>
                    <FieldLabel>Phone Number</FieldLabel>
                    <TextInput value={form.ecPhone} onChange={v => set('ecPhone', v)} placeholder={philippineMobilePlaceholder} inputMode="tel" maxLength={17} />
                    {errors.ecPhone && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.ecPhone}</div>}
                  </div>
                  <div>
                    <FieldLabel>Email Address</FieldLabel>
                    <TextInput type="email" value={form.ecEmail} onChange={v => set('ecEmail', v)} placeholder="email@example.com" />
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <FieldLabel>Address</FieldLabel>
                  <TextInput value={form.ecAddress} onChange={v => set('ecAddress', v)} placeholder="Full address" />
                </div>
              </div>
            )}

            {/* Additional Information */}
            {activeTab === 'additional' && (
              <div>
                <div style={grid2}>
                  <div>
                    <FieldLabel>Blood Group</FieldLabel>
                    <SelectInput value={form.bloodGroup} onChange={v => set('bloodGroup', v)} options={['A+','A-','B+','B-','AB+','AB-','O+','O-']} placeholder="Select blood group" />
                  </div>
                  <div>
                    <FieldLabel>Medical Conditions</FieldLabel>
                    <TextInput value={form.medicalConditions} onChange={v => set('medicalConditions', v)} placeholder="Any known conditions" />
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <FieldLabel>Notes / Remarks</FieldLabel>
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes about this employee..." rows={5}
                    style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#111827', fontFamily: font, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
