import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import styles from '../page.module.css'

const industries = [
  ['Construction', 'Coordinate projects, procurement, warehouse, people, and finance.'],
  ['Business Services', 'Run client work, billing, assignments, and admin operations.'],
  ['Retail & Wholesale', 'Connect purchasing, inventory, suppliers, sales, and finance.'],
  ['Manufacturing', 'Track stock, receiving, teams, approvals, and operating records.'],
  ['Financial Operations', 'Keep budgets, transactions, invoices, controls, and reports aligned.'],
  ['Field Teams', 'Give managers and employees role-based portals for the work they need.'],
]

export default function IndustriesPage() {
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
          <span className={styles.eyebrow}>Industries</span>
          <h1>Made for companies with moving parts.</h1>
          <p>WiseFlow fits teams that need operational control across departments, approvals, inventory, customer work, payroll, and finance.</p>
        </div>
        <div className={styles.marketingHeroCard}><strong>24/7</strong><span>visibility into what is pending, approved, overdue, and ready</span></div>
      </section>
      <section className={styles.marketingSection}>
        {industries.map(([title, text]) => (
          <article className={styles.marketingCard} key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
