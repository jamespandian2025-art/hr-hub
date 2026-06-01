import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import styles from '../page.module.css'

const groups = [
  ['Core operations', ['HR workspace', 'Payroll finance', 'Accounting', 'Client database', 'Project management', 'Tasks']],
  ['Supply chain', ['Procurement', 'RFQs', 'Purchase orders', 'Warehouse inventory', 'Stock transfers', 'Suppliers']],
  ['Automation', ['Workflow builder', 'Dataset tables', 'Approval routing', 'Audit logs', 'Access keys', 'Reports']],
]

export default function PlatformSolutionsPage() {
  return (
    <main className={styles.marketingPage}>
      <nav className={styles.simpleNav}>
        <Link href="/" className={styles.brand}><span className={styles.brandMark}>W</span><span>WiseFlow</span></Link>
        <div className={styles.simpleNavActions}>
          <Link href="/login" className={styles.textButton}>Login</Link>
          <Link href="/signup" className={styles.navButton}>Request access <ArrowRight size={17} /></Link>
        </div>
      </nav>
      <section className={styles.marketingHero}>
        <div>
          <span className={styles.eyebrow}>Solutions</span>
          <h1>Every business function connected in one platform.</h1>
          <p>Choose the modules your customer needs today, then expand into a complete operating system as their team grows.</p>
        </div>
        <div className={styles.marketingHeroCard}><strong>40+</strong><span>daily workflows covered across departments</span></div>
      </section>
      <section className={styles.marketingSection}>
        {groups.map(([title, items]) => (
          <article className={styles.marketingCard} key={title as string}>
            <h2>{title}</h2>
            <div className={styles.marketingList}>
              {(items as string[]).map(item => <span key={item}>{item}</span>)}
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
