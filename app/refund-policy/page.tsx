import type { Metadata } from 'next'
import { LegalPage } from '../legal-content'

export const metadata: Metadata = {
  title: 'Refund and Cancellation Policy | WiseFlow',
  description: 'WiseFlow trial, cancellation, and refund policy.',
}

const updated = 'June 2, 2026'

export default function RefundPolicyPage() {
  return (
    <LegalPage
      eyebrow="Billing"
      title="Refund and Cancellation Policy"
      intro="This policy explains how WiseFlow handles trials, manual beta billing, cancellations, and refund requests."
      updated={updated}
      summary={[
        'Closed beta billing may be handled manually.',
        'Customers can cancel renewal before the next billing period.',
        'Refunds are reviewed case by case unless a written agreement says otherwise.',
      ]}
      sections={[
        {
          title: 'Trial and beta period',
          body: [
            'WiseFlow may offer a free trial or closed beta access so customers can test the platform before committing to paid service. During beta, online checkout may be unavailable and billing may be handled manually.',
            'Trial access may be limited, extended, or ended if the workspace is inactive, misused, or requires production configuration before real data can be safely used.',
          ],
        },
        {
          title: 'Manual billing',
          body: [
            'Until automated subscription checkout is enabled, customers may be billed by invoice, bank transfer, payment link, or another written arrangement. The invoice or agreement should define the plan, price, billing period, due date, and support scope.',
          ],
        },
        {
          title: 'Cancellations',
          body: [
            'Customers may request cancellation before the next billing period. Access may continue until the end of the paid period unless the account is terminated for misuse, security risk, or non-payment.',
            'Customers should export needed records before cancellation. Data deletion or retention will follow the Privacy Policy and any written customer agreement.',
          ],
        },
        {
          title: 'Refunds',
          body: [
            'Refund requests are reviewed case by case unless a signed agreement or invoice states a different refund term. Refunds may be considered for duplicate charges, billing errors, or service access issues that WiseFlow cannot reasonably resolve.',
            'Fees for completed onboarding, custom setup, data migration, or professional services may be non-refundable if work has already been performed.',
          ],
        },
        {
          title: 'Contact',
          body: [
            'For billing, cancellation, or refund questions, contact the support email listed on this page and include your company name, workspace email, invoice number if available, and reason for the request.',
          ],
        },
      ]}
    />
  )
}

