import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import styles from '../page.module.css'

const resources = [
  ['Implementation Guide', 'How to roll out WiseFlow across departments.'],
  ['Operations Playbook', 'Best practices for workflows, approvals, and records.'],
  ['Pricing Brief', 'Monthly, yearly, and trial details for sales conversations.'],
  ['Product Updates', 'Latest improvements across modules and portals.'],
  ['Security Notes', 'Permissions, session handling, and audit visibility.'],
  ['Help Center', 'Setup guidance for admins and teams.'],
]

export default function ResourceCenterPage() {
  return (
    <main className={styles.marketingPage}>
      <nav className={styles.simpleNav}>
        <Link href="/" className={styles.brand}><span className={styles.brandMark}>W</span><span>WiseFlow</span></Link>
        <div className={styles.simpleNavActions}>
          <Link href="/login" className={styles.textButton}>Login</Link>
          <Link href="/signup" className={styles.navButton}>Start free <ArrowRight size={17} /></Link>
        </div>
      </nav>
      <section className={styles.marketingHero}>
        <div>
          <span className={styles.eyebrow}>Resources</span>
          <h1>Everything needed to sell and support WiseFlow.</h1>
          <p>Use the resource center to explain implementation, pricing, security, modules, and operating workflows to customers.</p>
        </div>
        <div className={styles.marketingHeroCard}><strong>14</strong><span>days for customers to try the full system free</span></div>
      </section>
      <section className={styles.marketingSection}>
        {resources.map(([title, text]) => (
          <article className={styles.marketingCard} key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
