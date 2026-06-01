import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import styles from './page.module.css'

export type LegalSection = {
  title: string
  body: string[]
}

type LegalPageProps = {
  eyebrow: string
  title: string
  intro: string
  updated: string
  summary: string[]
  sections: LegalSection[]
}

const legalName = process.env.NEXT_PUBLIC_LEGAL_NAME || 'WiseFlow'
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@your-domain.com'

export function LegalPage({ eyebrow, title, intro, updated, summary, sections }: LegalPageProps) {
  return (
    <main className={styles.marketingPage}>
      <nav className={styles.simpleNav}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>W</span>
          <span>WiseFlow</span>
        </Link>
        <div className={styles.simpleNavActions}>
          <Link href="/security" className={styles.textButton}>Security</Link>
          <Link href="/signup" className={styles.navButton}>Request access <ArrowRight size={17} /></Link>
        </div>
      </nav>

      <section className={styles.legalHero}>
        <div>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
        <aside className={styles.legalSummary} aria-label="Policy summary">
          <strong>Quick summary</strong>
          <span>Last updated: {updated}</span>
          <ul>
            {summary.map(item => <li key={item}>{item}</li>)}
          </ul>
        </aside>
      </section>

      <section className={styles.legalLayout}>
        <aside className={styles.legalMeta}>
          <strong>{legalName}</strong>
          <span>Business operations platform</span>
          <Link href={`mailto:${supportEmail}`}>{supportEmail}</Link>
        </aside>
        <article className={styles.legalContent}>
          {sections.map(section => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.body.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
        </article>
      </section>
    </main>
  )
}

