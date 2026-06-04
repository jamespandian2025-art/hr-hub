import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import styles from '../page.module.css'

const cards = [
  ['One operating system', 'Replace scattered spreadsheets and disconnected tools with one workspace for people, money, purchasing, stock, and work.'],
  ['Built for adoption', 'Start with the daily workflows teams already understand, then add approvals, reporting, portals, and automation as the company matures.'],
  ['Launch-ready access', 'Offer guided access with manual billing first, then add online checkout when payment processing is approved.'],
]

export default function WhyWiseFlowPage() {
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
          <span className={styles.eyebrow}>Why WiseFlow</span>
          <h1>Run the business from one clear source of truth.</h1>
          <p>WiseFlow gives owners and operators a practical system for controlling daily work across HR, finance, procurement, warehouse, projects, and client records.</p>
        </div>
        <div className={styles.marketingHeroCard}><strong>9+</strong><span>connected workspaces included from day one</span></div>
      </section>
      <section className={styles.marketingSection}>
        {cards.map(([title, text]) => (
          <article className={styles.marketingCard} key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
