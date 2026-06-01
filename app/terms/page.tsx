import type { Metadata } from 'next'
import { LegalPage } from '../legal-content'

export const metadata: Metadata = {
  title: 'Terms of Service | WiseFlow',
  description: 'Terms governing access to and use of the WiseFlow platform.',
}

const updated = 'June 2, 2026'

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of Service"
      intro="These terms describe the rules for using WiseFlow during beta, trial, and paid service periods."
      updated={updated}
      summary={[
        'Use WiseFlow only for lawful business operations.',
        'Customers control user access and workspace data.',
        'Beta features may change as the product is hardened for launch.',
      ]}
      sections={[
        {
          title: 'Using WiseFlow',
          body: [
            'WiseFlow is a business operations platform for managing work such as HR, payroll, finance, procurement, warehouse, projects, workflows, datasets, documents, and portals. You may use the service only for lawful business purposes and in line with these terms.',
            'You are responsible for keeping your login details secure, inviting only authorized users, and making sure the information entered into your workspace is accurate and lawful.',
          ],
        },
        {
          title: 'Beta and trial access',
          body: [
            'During a closed beta, trial, pilot, or evaluation period, some modules may be marked beta, manually supported, or subject to additional review before production use with real customer, employee, payroll, or finance data.',
            'WiseFlow may update, improve, limit, or disable beta features to protect customers, improve reliability, or complete launch hardening.',
          ],
        },
        {
          title: 'Customer data',
          body: [
            'Customer workspace data remains the customer responsibility and should be accessed only by authorized users. WiseFlow may process customer data to provide the service, maintain security, provide support, comply with law, and improve platform reliability.',
            'Customers should export important records and maintain appropriate internal approvals before making payroll, tax, banking, employment, or financial decisions based on information in the system.',
          ],
        },
        {
          title: 'Payments and subscriptions',
          body: [
            'Published prices describe intended subscription plans. Until online checkout is enabled, billing may be handled manually by invoice or written agreement.',
            'A paid subscription, invoice, or signed agreement may define additional terms such as billing period, payment method, cancellation, support level, and onboarding scope.',
          ],
        },
        {
          title: 'Acceptable use',
          body: [
            'You may not misuse the service, attempt to bypass security, access data you are not authorized to view, upload malicious files, overload the system, or use WiseFlow to violate privacy, employment, tax, financial, or intellectual property laws.',
            'WiseFlow may suspend or restrict access if misuse, security risk, non-payment, or harmful activity is detected.',
          ],
        },
        {
          title: 'No professional advice',
          body: [
            'WiseFlow helps organize operational data, but it is not a substitute for legal, tax, accounting, payroll, HR, or financial advice. Customers should review outputs with qualified professionals before relying on them for regulated decisions.',
          ],
        },
      ]}
    />
  )
}

