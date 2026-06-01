import { readdirSync, readFileSync, statSync } from 'node:fs'

const checks = []

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

function check(name, pass, detail = '') {
  checks.push({ name, pass, detail })
}

function sourceFiles(dir, files = []) {
  const ignored = new Set(['.git', 'node_modules', '.next', '.data', 'test-results'])
  for (const entry of readdirSync(new URL(`../${dir}`, import.meta.url))) {
    if (ignored.has(entry)) continue
    const relative = dir === '.' ? entry : `${dir}/${entry}`
    const absolute = new URL(`../${relative}`, import.meta.url)
    const stat = statSync(absolute)
    if (stat.isDirectory()) {
      sourceFiles(relative, files)
    } else if (/\.(ts|tsx|js|mjs|sql|md|example|json)$/.test(entry)) {
      files.push(relative)
    }
  }
  return files
}

const packageJson = JSON.parse(read('package.json'))
check('Next.js is patched for known 16.2.x proxy advisories', packageJson.dependencies?.next === '16.2.6')
check('Vulnerable xlsx package is not installed as an app dependency', !packageJson.dependencies?.xlsx && !packageJson.devDependencies?.xlsx)

const sqlFiles = [
  'scripts/supabase-clients-table.sql',
  'scripts/supabase-sales-orders-table.sql',
  'scripts/supabase-hr-records-table.sql',
  'scripts/supabase-business-records-table.sql',
  'scripts/supabase-rate-limits-table.sql',
  'scripts/supabase-multi-company.sql',
  'scripts/supabase-production-verify.sql',
]
const sql = sqlFiles.map(file => read(file)).join('\n')
check('Supabase policies do not use permissive using(true)', !/using\s*\(\s*true\s*\)/i.test(sql))
check('Supabase policies do not use permissive with check(true)', !/with\s+check\s*\(\s*true\s*\)/i.test(sql))
check('Supabase policies use tenant membership checks', /is_company_member\s*\(\s*company_id\s*\)/i.test(sql))

const sessionRoute = read('app/api/auth/session/route.ts')
check('Session route verifies Supabase bearer identity', /verifiedSupabaseSession/.test(sessionRoute) && /supabase\.auth\.getUser/.test(sessionRoute))
check('Session route rejects unverified production sessions', /NODE_ENV === 'production'/.test(sessionRoute) && /A verified identity is required/.test(sessionRoute))

const csrfRoutes = [
  'app/api/ai/assistant/route.ts',
  'app/api/uploads/route.ts',
  'app/api/monitoring/client-errors/route.ts',
  'app/api/auth/session/route.ts',
  'app/api/auth/login-attempts/route.ts',
  'app/api/auth/invitations/route.ts',
  'app/api/hr/employee-credentials/route.ts',
  'app/api/hr/employee-portal-login/route.ts',
  'app/api/hr/records/[collection]/route.ts',
  'app/api/hr/records/[collection]/[id]/route.ts',
  'app/api/business-records/[collection]/route.ts',
  'app/api/business-records/[collection]/[id]/route.ts',
  'app/api/tenant/bootstrap/route.ts',
  'app/api/admin/backups/restore/route.ts',
]
csrfRoutes.forEach(file => {
  check(`${file} requires CSRF guard`, /requireCsrf\s*\(\s*request\s*\)/.test(read(file)))
})

const projectHtml = [
  'components/project-management/ProjectManagementModule.tsx',
  'components/project-management/ProjectTaskDetailsPage.tsx',
].map(file => read(file)).join('\n')
check('Project management views do not use dangerouslySetInnerHTML', !/dangerouslySetInnerHTML/.test(projectHtml))
check('Project report printing does not inject an inline onload script', !/<script>window\.onload/.test(projectHtml))

const datasetsModule = read('components/datasets/ReworkDatasetsModule.tsx')
check('Datasets module does not import xlsx parser', !/from ['"]xlsx['"]|import \* as XLSX/.test(datasetsModule))
check('Datasets HTML import decoder avoids DOM innerHTML', !/function\s+decodeHtml[\s\S]*?innerHTML/.test(datasetsModule))

const recoveryPage = read('app/account-recovery/page.tsx')
const supabaseClient = read('lib/auth/supabaseClient.ts')
const employeePortalLoginRoute = read('app/api/hr/employee-portal-login/route.ts')
const loginAttemptsRoute = read('app/api/auth/login-attempts/route.ts')
const newEmployeePage = read('app/hr/employees/new/page.tsx')
const employeeDetailPage = read('app/hr/employees/[id]/page.tsx')
const hrServerStore = read('lib/hrms/serverStore.ts')
check('Production account recovery sends Supabase reset email', /resetPasswordForEmail/.test(recoveryPage) && /\/account-recovery/.test(recoveryPage))
check('Production account recovery completes password reset through Supabase', /exchangeCodeForSession/.test(recoveryPage) && /auth\.updateUser\s*\(\s*\{\s*password/.test(recoveryPage))
check('Production account recovery does not read browser challenge storage', /clientOnlyRecoveryEnabled\s*\?\s*readChallenge\(\)\s*:\s*null/.test(recoveryPage))
check('Supabase recovery client can avoid persistent browser token storage', /persistSession\s*:\s*false/.test(recoveryPage) && /persistSession/.test(supabaseClient))
check('Employee portal login verifies hashed portal passwords', /verifyPortalPassword/.test(employeePortalLoginRoute) && !/constantTimeEqual\s*\([^)]*portalPassword/.test(employeePortalLoginRoute))
check('New employee records store portal password hashes', /createPortalPasswordFields/.test(newEmployeePage) && !/\n\s*portalPassword,\n/.test(newEmployeePage))
check('Employee profile reissues login without storing plaintext password', /createPortalPasswordFields/.test(employeeDetailPage) && /portalPassword:\s*undefined/.test(employeeDetailPage))
check('HR public records redact portal password hashes', /delete copy\.portalPasswordHash/.test(hrServerStore) && /delete copy\.portalPasswordSalt/.test(hrServerStore))
check('Login attempt rate limits use persistent shared storage', !/new Map/.test(loginAttemptsRoute) && /hitRateLimit/.test(loginAttemptsRoute) && /rateLimitPolicies\.login/.test(loginAttemptsRoute))

const businessServerStore = read('lib/business/serverStore.ts')
const businessRoute = read('app/api/business-records/[collection]/route.ts')
const businessItemRoute = read('app/api/business-records/[collection]/[id]/route.ts')
const businessClient = read('lib/business/client.ts')
const tenantServerStore = read('lib/tenant/serverStore.ts')
const tenantBootstrapRoute = read('app/api/tenant/bootstrap/route.ts')
const backupExportRoute = read('app/api/admin/backups/route.ts')
const backupRestoreRoute = read('app/api/admin/backups/restore/route.ts')
const assistantRoute = read('app/api/ai/assistant/route.ts')
const uploadsRoute = read('app/api/uploads/route.ts')
const monitoringRoute = read('app/api/monitoring/client-errors/route.ts')
const backupServer = read('lib/backup/server.ts')
const hrRecordsRoute = read('app/api/hr/records/[collection]/route.ts')
const hrRecordsItemRoute = read('app/api/hr/records/[collection]/[id]/route.ts')
const signupPage = read('app/signup/page.tsx')
const loginPage = read('app/login/page.tsx')
check('Business records use server-owned persistence', /business_records/.test(businessServerStore) && /SUPABASE_SERVICE_ROLE_KEY/.test(businessServerStore) && /\.data.+business/.test(businessServerStore))
check('Business records API requires server session and company context', /actorFromBusinessRequest/.test(businessRoute) && /companyIdFromRequest/.test(businessRoute))
check('Business records API verifies tenant membership before service-role access', /assertBusinessCompanyAccess/.test(businessRoute) && /assertBusinessCompanyAccess/.test(businessItemRoute))
check('Business records client uses CSRF headers for mutations', /withCsrfHeaders/.test(businessClient) && /x-wiseflow-company-id/.test(businessClient))
check('Tenant bootstrap API requires CSRF and verified session', /requireCsrf\s*\(\s*request\s*\)/.test(tenantBootstrapRoute) && /requireVerifiedSession/.test(tenantBootstrapRoute))
check('Backup export API is admin-only and tenant checked', /requireVerifiedSession\s*\(\s*request,\s*['"]admin['"]\s*\)/.test(backupExportRoute) && /assertCompanyAccess/.test(backupExportRoute) && /Content-Disposition/.test(backupExportRoute))
check('Backup restore API is admin-only, CSRF protected, tenant checked, and confirmed', /requireVerifiedSession\s*\(\s*request,\s*['"]admin['"]\s*\)/.test(backupRestoreRoute) && /requireCsrf\s*\(\s*request\s*\)/.test(backupRestoreRoute) && /assertCompanyAccess/.test(backupRestoreRoute) && /dryRun/.test(backupRestoreRoute) && /confirm/.test(backupRestoreRoute))
check('Backup server exports and restores company-scoped critical domains', /businessCollections/.test(backupServer) && /hrCollections/.test(backupServer) && /sales_orders/.test(backupServer) && /company_members/.test(backupServer) && /RESTORE/.test(backupServer))
check('Business record mutations are server-audited', /appendAuditLog/.test(businessRoute) && /business\.\$\{collection\}\.create/.test(businessRoute) && /business\.\$\{collection\}\.replace/.test(businessRoute) && /appendAuditLog/.test(businessItemRoute) && /business\.\$\{collection\}\.update/.test(businessItemRoute) && /business\.\$\{collection\}\.delete/.test(businessItemRoute))
check('Destructive business and HR deletes require typed confirmation', /DELETE \$\{id\}/.test(businessItemRoute) && /x-wiseflow-confirm-delete/.test(businessItemRoute) && /DELETE \$\{id\}/.test(hrRecordsItemRoute) && /x-wiseflow-confirm-delete/.test(hrRecordsItemRoute))
check('Upload route uses server-side object storage validation', /maxUploadBytes/.test(uploadsRoute) && /allowedMimeTypes/.test(uploadsRoute) && /supabase\.storage\.from\(bucket\)\.upload/.test(uploadsRoute) && /\.data['"], ['"]uploads/.test(uploadsRoute))
check('HR document uploads store object metadata instead of new base64 payloads', /uploadFileObject/.test(read('app/hr/documents/page.tsx')) && !/readAsDataURL/.test(read('app/hr/documents/page.tsx')))
check('Browser upload flows do not store new base64 file payloads', !/readAsDataURL/.test([
  read('app/hr/documents/page.tsx'),
  read('app/hr/documents/[id]/page.tsx'),
  read('app/hr/employees/new/page.tsx'),
  read('app/hr/employees/[id]/page.tsx'),
  read('app/hr/settings/page.tsx'),
  read('app/employee/documents/page.tsx'),
  read('app/employee/leave-requests/new/page.tsx'),
  read('app/employee/allowances/page.tsx'),
  read('components/project-management/ProjectManagementModule.tsx'),
  read('components/project-management/ProjectTaskDetailsPage.tsx'),
  read('components/datasets/ReworkDatasetsModule.tsx'),
  read('components/hr/HrMessenger.tsx'),
  read('app/resources/inventory/page.tsx'),
  read('app/resources/inventory/[id]/page.tsx'),
].join('\n')) && /uploadFileObject/.test(read('lib/uploads/client.ts')))
check('Monitoring captures client runtime and API failures', /ClientMonitoring/.test(read('components/AppShell.tsx')) && /api-failure/.test(read('components/ClientMonitoring.tsx')) && /runtime-error/.test(read('components/ClientMonitoring.tsx')) && /appendAuditLog/.test(monitoringRoute))
check('Health and staging/email scripts exist', /api\/health/.test(sourceFiles('.').join('\n')) && /monitoring-smoke/.test(read('package.json')) && /check-email-production/.test(read('package.json')) && /seed-staging/.test(read('package.json')) && /NEXT_PUBLIC_SUPABASE_URL/.test(read('.env.staging.example')))
check('Tenant server store creates companies and owner memberships', /from\('companies'\)[\s\S]*\.insert/.test(tenantServerStore) && /from\('company_members'\)[\s\S]*\.upsert/.test(tenantServerStore))
check('Tenant server store verifies company membership', /assertCompanyAccess/.test(tenantServerStore) && /status !== 'Active'/.test(tenantServerStore))
check('HR records API verifies tenant membership', /assertCompanyAccess/.test(hrRecordsRoute) && /companyIdFromRequest/.test(hrRecordsRoute) && /assertCompanyAccess/.test(hrRecordsItemRoute))
check('First Admin signup uses Supabase Auth and tenant bootstrap', /auth\.signUp/.test(signupPage) && /bootstrapCompanyOnServer/.test(signupPage))
check('Production login supports Supabase password auth', /signInWithPassword/.test(loginPage) && /bootstrapCompanyOnServer/.test(loginPage))
check('Supabase production verification RPC is installed', /verify_wiseflow_production_setup/.test(sql))
check('Supabase rate limit RPC is installed', /record_rate_limit_hit/.test(sql) && /public\.rate_limits/.test(sql))

const rateLimitStore = read('lib/security/rateLimit.ts')
check('Rate limiter uses Supabase or local durable fallback', /record_rate_limit_hit/.test(rateLimitStore) && /RATE_LIMIT_DATA_DIR/.test(rateLimitStore))
check('Sensitive mutation endpoints enforce persistent rate limits',
  /rateLimitPolicies\.sessionCreate/.test(sessionRoute)
  && /rateLimitPolicies\.employeeLogin/.test(employeePortalLoginRoute)
  && /rateLimitPolicies\.invitationCreate/.test(read('app/api/auth/invitations/route.ts'))
  && /rateLimitPolicies\.credentialEmail/.test(read('app/api/hr/employee-credentials/route.ts'))
  && /rateLimitPolicies\.backupExport/.test(backupExportRoute)
  && /rateLimitPolicies\.backupRestore/.test(backupRestoreRoute)
  && /rateLimitPolicies\.aiAssistant/.test(assistantRoute)
  && /rateLimitPolicies\.fileUpload/.test(uploadsRoute)
  && /rateLimitPolicies\.monitoringEvent/.test(monitoringRoute)
  && /rateLimitPolicies\.businessMutation/.test(businessRoute)
  && /rateLimitPolicies\.businessMutation/.test(businessItemRoute)
  && /rateLimitPolicies\.hrMutation/.test(hrRecordsRoute)
  && /rateLimitPolicies\.hrMutation/.test(hrRecordsItemRoute)
)

const publicServiceRolePattern = new RegExp('NEXT_PUBLIC_' + 'SUPABASE_SERVICE_ROLE_KEY')
const allSources = sourceFiles('.').map(file => ({ file, content: read(file) }))
check('No NEXT_PUBLIC service-role environment variable exists', !allSources.some(item => publicServiceRolePattern.test(item.content)))
check('Supabase service-role key is not referenced in client modules', !allSources.some(item => /^\s*['"]use client['"]/.test(item.content) && /SUPABASE_SERVICE_ROLE_KEY/.test(item.content)))

const coreBusinessFiles = [
  'app/accounting/page.tsx',
  'app/accounting/invoices/page.tsx',
  'app/accounting/budgeting/page.tsx',
  'app/accounting/banking/page.tsx',
  'app/financials/invoices/page.tsx',
  'app/financials/bills/page.tsx',
  'app/financials/budget/page.tsx',
  'app/people/clients/clientData.ts',
  'app/projects/page.tsx',
  'lib/accounting/data.ts',
  'lib/project-management/service.ts',
  'lib/warehouse/store.ts',
  'components/project-management/useProjectManagement.ts',
  'components/warehouse/WarehouseModule.tsx',
]
const coreBusinessSource = coreBusinessFiles.map(file => read(file)).join('\n')
check('Core launch business modules do not persist records through browser storage', !/localStorage\.setItem\s*\(/.test(coreBusinessSource))

const failed = checks.filter(item => !item.pass)
if (failed.length) {
  failed.forEach(item => {
    console.error(`FAIL ${item.name}${item.detail ? `: ${item.detail}` : ''}`)
  })
  process.exit(1)
}

checks.forEach(item => {
  console.log(`PASS ${item.name}`)
})
