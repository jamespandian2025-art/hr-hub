import type { Metadata } from 'next'
import { LegalPage } from '../legal-content'

export const metadata: Metadata = {
  title: 'Privacy Policy | WiseFlow',
  description: 'How WiseFlow collects, uses, protects, and manages customer data.',
}

const updated = 'June 2, 2026'

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="This policy explains what information WiseFlow collects, why it is used, and how customers can request access, correction, or deletion."
      updated={updated}
      summary={[
        'WiseFlow collects account, company, operational, and support information needed to run the service.',
        'Customer business records belong to the customer workspace.',
        'Sensitive payroll, HR, finance, and file data should be protected by role permissions.',
      ]}
      sections={[
        {
          title: 'Information we collect',
          body: [
            'WiseFlow may collect account details such as name, email address, company name, role, login activity, and workspace membership. The product may also store operational records entered by customers, including HR records, payroll records, invoices, clients, suppliers, inventory, project data, workflow data, documents, messages, and audit logs.',
            'The service may collect technical information such as browser errors, API failures, IP address, device/browser details, and security events so the system can be monitored and protected.',
          ],
        },
        {
          title: 'How we use information',
          body: [
            'Information is used to provide the WiseFlow platform, authenticate users, enforce role-based access, support customer workflows, send service emails, maintain audit logs, improve reliability, and respond to support or security requests.',
            'WiseFlow does not sell customer business records. Customer workspace data should only be used to operate, secure, support, and improve the service, or as required by law.',
          ],
        },
        {
          title: 'Customer responsibility',
          body: [
            'Customers are responsible for choosing which users receive access to HR, payroll, finance, banking, client, supplier, warehouse, project, and document areas. Customers should invite only authorized users and remove access when a user no longer needs it.',
            'Customers should not upload data they are not allowed to process, and should verify that their own use of WiseFlow follows their employment, privacy, tax, and industry obligations.',
          ],
        },
        {
          title: 'Storage and service providers',
          body: [
            'WiseFlow may use infrastructure, authentication, email, storage, monitoring, and AI service providers to operate the product. Production deployments should use server-side storage for business records, private object storage for uploads, and secure environment variables for service keys.',
            'During local demos or development, some data may be stored on the local device or local development server. Real customer or payroll data should only be entered after the production services are configured.',
          ],
        },
        {
          title: 'Retention and deletion',
          body: [
            'Workspace records may be retained while the customer account is active or as needed for backups, audits, legal obligations, dispute resolution, and security. Customers may request export or deletion of their data, subject to legal and operational requirements.',
            'Deleted data may remain in backups for a limited period until those backups expire or are overwritten.',
          ],
        },
        {
          title: 'Contact',
          body: [
            'For privacy questions, data access requests, or deletion requests, contact the support email listed on this page or the WiseFlow administrator who manages your workspace.',
          ],
        },
      ]}
    />
  )
}

