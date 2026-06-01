import type { Metadata } from 'next'
import { LegalPage } from '../legal-content'

export const metadata: Metadata = {
  title: 'Security and Data Protection | WiseFlow',
  description: 'WiseFlow security, access control, data protection, and responsible use notes.',
}

const updated = 'June 2, 2026'

export default function SecurityPage() {
  return (
    <LegalPage
      eyebrow="Security"
      title="Security and Data Protection"
      intro="WiseFlow is designed for sensitive business operations, so production use depends on secure hosting, private keys, role access, backups, and monitoring."
      updated={updated}
      summary={[
        'Production data should use server-side storage and private object storage.',
        'Role permissions protect HR, payroll, finance, banking, employee, and client areas.',
        'Backups, audit logs, and monitoring should be enabled before real launch.',
      ]}
      sections={[
        {
          title: 'Access control',
          body: [
            'WiseFlow uses role-based access controls for Admin, Finance, HR, Employee, Team Manager, Project Manager, Support, and Client users. Protected pages and server APIs should verify identity and role before returning sensitive information.',
            'Workspace owners are responsible for inviting the right users, assigning the right role, reviewing access regularly, and removing users who no longer need access.',
          ],
        },
        {
          title: 'Production configuration',
          body: [
            'Before entering real customer, employee, payroll, finance, or document data, production must have Supabase configured, a strong server auth secret, private upload storage, email delivery, rate limit storage, backups, and health monitoring.',
            'Service-role keys, API keys, and auth secrets must remain server-side only and must never be exposed with a public browser environment variable.',
          ],
        },
        {
          title: 'Data storage boundary',
          body: [
            'Production business records should be stored in server-owned database tables with tenant isolation. Browser storage should be limited to low-risk settings such as theme, filters, active tabs, drafts, and migration markers.',
            'Local development and demos may use local files or browser storage, but those modes are not approved for real customer or payroll data.',
          ],
        },
        {
          title: 'Uploads and files',
          body: [
            'Production file uploads should use private object storage with server-side size and type validation. Download links should be short-lived or protected by authenticated server routes.',
            'Customers should avoid uploading malware, unlawful content, or files containing information they are not authorized to process.',
          ],
        },
        {
          title: 'Backups and monitoring',
          body: [
            'Production should enable database backups or point-in-time recovery, plus per-company export/restore checks. Restore should be rehearsed in staging before real customer launch.',
            'Health checks, client error monitoring, failed-login audit events, and API failure monitoring should be reviewed during beta and after launch.',
          ],
        },
        {
          title: 'Security reports',
          body: [
            'If you believe you found a security issue, contact the support email listed on this page with enough detail to reproduce the issue. Do not access, copy, delete, or disclose data that does not belong to you.',
          ],
        },
      ]}
    />
  )
}

