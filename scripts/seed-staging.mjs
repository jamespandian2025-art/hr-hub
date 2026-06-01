import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const companyId = process.env.STAGING_COMPANY_ID || 'wiseflow-staging'
const adminEmail = process.env.STAGING_ADMIN_EMAIL || 'admin@staging.wiseflow.local'

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const now = new Date().toISOString()

async function upsert(table, rows, options = { onConflict: 'id' }) {
  const { error } = await supabase.from(table).upsert(rows, options)
  if (error) throw new Error(`${table}: ${error.message}`)
}

await upsert('companies', [{
  id: companyId,
  name: 'WiseFlow Staging Company',
  type: 'Staging',
  owner_user_id: null,
  settings: { currency: 'PHP', timezone: 'Asia/Manila', fiscalYearStart: 'January' },
  created_at: now,
  updated_at: now,
}])

await upsert('company_members', [{
  company_id: companyId,
  user_id: null,
  email: adminEmail,
  role: 'Owner',
  permissions: ['dashboard', 'clients', 'sales', 'projects', 'financials', 'hr', 'procurement', 'warehouse', 'workflows', 'datasets', 'documents', 'reports', 'settings', 'members'],
  status: 'Active',
  invited_at: now,
  joined_at: now,
}], { onConflict: 'company_id,email' })

await upsert('business_records', [
  {
    id: 'staging-client-rasmus',
    company_id: companyId,
    collection: 'clients',
    payload: {
      id: 'staging-client-rasmus',
      companyId,
      name: 'Rasmus Pandian',
      company: 'Staging Consulting Services',
      email: 'rasmus.staging@example.com',
      phone: '9457850160',
      taxId: 'STAGING-TAX-001',
      billingAddress: 'Matina Drive, Davao City',
      status: 'Active',
      createdAt: now,
    },
    created_at: now,
    updated_at: now,
  },
  {
    id: 'staging-invoice-001',
    company_id: companyId,
    collection: 'accounting-invoices',
    payload: {
      id: 'staging-invoice-001',
      companyId,
      invoiceNumber: 'INV-STAGING-001',
      customerId: 'staging-client-rasmus',
      customer: 'Rasmus Pandian',
      email: 'rasmus.staging@example.com',
      status: 'Draft',
      total: 1700,
      currency: 'PHP - Philippine peso',
      createdAt: now,
    },
    created_at: now,
    updated_at: now,
  },
  {
    id: 'staging-project-state',
    company_id: companyId,
    collection: 'project-management-state',
    payload: {
      id: 'staging-project-state',
      companyId,
      projects: [{
        id: 'staging-project-001',
        name: 'Staging Residential Build',
        status: 'Planning',
        priority: 'Medium',
        budget: 250000,
        currency: 'PHP',
      }],
      tasks: [],
      documents: [],
      createdAt: now,
      updatedAt: now,
    },
    created_at: now,
    updated_at: now,
  },
], { onConflict: 'company_id,collection,id' })

await upsert('hr_records', [
  {
    id: 'staging-employee-001',
    company_id: companyId,
    collection: 'employees',
    payload: {
      id: 'staging-employee-001',
      companyId,
      employeeId: 'EMP-STAGING-001',
      firstName: 'Christina',
      lastName: 'Pandian',
      email: 'christina.staging@example.com',
      portalEmail: 'christina.staging@wiseflow.employee',
      employmentStatus: 'Active',
      jobTitle: 'Accountant',
      createdAt: now,
      updatedAt: now,
    },
    created_at: now,
    updated_at: now,
  },
  {
    id: 'staging-payroll-001',
    company_id: companyId,
    collection: 'payroll-records',
    payload: {
      id: 'staging-payroll-001',
      companyId,
      employeeId: 'staging-employee-001',
      period: 'May 2026',
      gross: 70000,
      deductions: 14500,
      net: 55500,
      status: 'Pending',
      createdAt: now,
      updatedAt: now,
    },
    created_at: now,
    updated_at: now,
  },
])

console.log(`Seeded staging company ${companyId} with fake client, invoice, project, employee, and payroll records.`)
