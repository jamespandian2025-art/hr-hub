// Seeds a demo employee with known portal credentials into the HR server store
// so anyone can log into the employee portal at /employee/login.
//
// Credentials (after seeding):
//   Email:    demo@wiseflow.employee
//   Password: demo12345
//
// The password hash is produced with the SAME algorithm the app uses
// (lib/security/password.ts -> portalPasswordFingerprint + pbkdf2-sha256,
// 210000 iterations, 256-bit, salt = UTF-8 bytes of a random hex string),
// using the identical WebCrypto API so the bytes match exactly.

import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import path from 'node:path'

const DEMO_EMAIL = 'demo@wiseflow.employee'
const DEMO_PASSWORD = 'demo12345'
const COMPANY_ID = 'pandian' // match the existing tenant so the demo lands in a real company

const dataDir = process.env.HRHUB_DATA_DIR || path.join(process.cwd(), '.data', 'hrhub')
const file = path.join(dataDir, 'employees.json')

// --- mirror lib/security/password.ts exactly ---
function portalPasswordFingerprint(value) {
  if (value === null || value === undefined) return ''
  const raw = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : ''
  return raw
    .replace(/[‐-―−]/g, '-')
    .trim()
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
}

function createPasswordSalt() {
  const values = new Uint8Array(16)
  globalThis.crypto.getRandomValues(values)
  return Array.from(values, v => v.toString(16).padStart(2, '0')).join('')
}

async function pbkdf2(password, salt) {
  const key = await globalThis.crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 210000 },
    key,
    256,
  )
  return Array.from(new Uint8Array(bits), v => v.toString(16).padStart(2, '0')).join('')
}

async function createPortalPasswordFields(password) {
  const fingerprint = portalPasswordFingerprint(password)
  const salt = createPasswordSalt()
  return {
    portalPasswordHash: await pbkdf2(fingerprint, salt),
    portalPasswordSalt: salt,
    portalPasswordAlgorithm: 'pbkdf2-sha256',
    portalPasswordUpdatedAt: new Date().toISOString(),
  }
}

async function readArray() {
  try {
    const raw = await readFile(file, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    if (error && error.code === 'ENOENT') return []
    throw error
  }
}

async function writeArray(value) {
  await mkdir(dataDir, { recursive: true })
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temp, file)
}

async function main() {
  const now = new Date().toISOString()
  const passwordFields = await createPortalPasswordFields(DEMO_PASSWORD)

  const demo = {
    id: 'emp_demo_portal',
    employeeId: 'EMP-DEMO',
    firstName: 'Demo',
    lastName: 'Employee',
    email: DEMO_EMAIL,
    portalEmail: DEMO_EMAIL,
    ...passwordFields,
    mustChangePassword: false,
    employeeType: 'Full Time',
    employeeRole: 'Employee',
    employmentStatus: 'Active',
    dateOfJoining: '2026-01-01',
    department: 'Operations',
    team: 'Operations Team',
    jobTitle: 'Associate',
    workLocation: 'Head Office',
    workType: 'On-Site',
    shift: 'General Shift (9:00 AM - 6:00 PM)',
    basicSalary: 30000,
    allowances: 2000,
    deductions: 0,
    paymentMethod: 'Bank Transfer',
    attendanceStatus: 'Present',
    payrollStatus: 'Pending',
    createdAt: now,
    updatedAt: now,
    companyId: COMPANY_ID,
  }

  const all = await readArray()
  const next = [demo, ...all.filter(row => row && row.id !== demo.id && row.portalEmail !== DEMO_EMAIL)]
  await writeArray(next)

  // Self-verify the hash round-trips with the same algorithm.
  const check = await pbkdf2(portalPasswordFingerprint(DEMO_PASSWORD), demo.portalPasswordSalt)
  console.log('Seeded demo employee into', file)
  console.log('  Email:   ', DEMO_EMAIL)
  console.log('  Password:', DEMO_PASSWORD)
  console.log('  Hash verifies:', check === demo.portalPasswordHash)
  console.log('  Total employees in store:', next.length)
}

main().catch(err => { console.error(err); process.exit(1) })
