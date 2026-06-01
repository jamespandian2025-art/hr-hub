import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  Grid2X2,
  Layers3,
  PlayCircle,
  ShieldCheck,
  UsersRound,
  Workflow,
} from 'lucide-react'
import RecoveryRedirect from '@/components/auth/RecoveryRedirect'
import styles from './page.module.css'

const customerLogos = ['Northline', 'ApexBuild', 'FieldCore', 'UrbanGrid', 'PrimeWorks', 'Atlas Co.']

const stats = [
  { value: '9+', label: 'connected workspaces' },
  { value: '40+', label: 'daily operations covered' },
  { value: '14', label: 'day beta trial' },
  { value: '24/7', label: 'business visibility' },
]

const platformPillars = [
  {
    label: 'RUN',
    title: 'Core operations',
    text: 'Manage HR, payroll, finance, procurement, warehouse, clients, suppliers, and projects from one system.',
    icon: Gauge,
  },
  {
    label: 'SEE',
    title: 'Business visibility',
    text: 'Track what is pending, approved, low-stock, overdue, assigned, and ready for action across every department.',
    icon: BarChart3,
  },
  {
    label: 'AUTOMATE',
    title: 'Workflows and datasets',
    text: 'Turn repeatable company processes into structured workflows, job records, approvals, and dataset views.',
    icon: Workflow,
  },
  {
    label: 'CONTROL',
    title: 'Roles and portals',
    text: 'Keep owners, admins, finance, HR, employees, and clients in the right portal with the right access.',
    icon: ShieldCheck,
  },
]

const solutionGroups = [
  {
    title: 'People and payroll',
    text: 'Employee records, attendance, leave, approvals, payslips, team pages, and HR reporting.',
    links: ['HR workspace', 'Employee portal', 'Payroll finance', 'Loan requests'],
    icon: UsersRound,
  },
  {
    title: 'Money and compliance',
    text: 'Invoices, banking, budgets, transactions, audit logs, tax compliance, and financial reports.',
    links: ['Accounting', 'Invoices', 'Budgeting', 'Reports'],
    icon: FileText,
  },
  {
    title: 'Supply chain',
    text: 'RFQs, quotations, purchase orders, receiving, vendor comparison, inventory, and stock movements.',
    links: ['Procurement', 'Warehouse', 'Pricebook', 'Suppliers'],
    icon: Boxes,
  },
]

const plans = [
  {
    name: 'Essential',
    monthly: '$89',
    yearly: '$890 yearly',
    text: 'For smaller teams that need one professional system fast.',
    features: ['Up to 12 users', 'All core modules', '14-day beta trial', 'Manual billing during beta'],
  },
  {
    name: 'Business',
    monthly: '$179',
    yearly: '$1,790 yearly',
    text: 'For growing companies coordinating multiple departments.',
    features: ['Up to 40 users', 'Advanced approvals', 'Company setup support', 'Manual billing during beta'],
    featured: true,
  },
  {
    name: 'Enterprise',
    monthly: '$349',
    yearly: '$3,490 yearly',
    text: 'For larger operations that need stronger controls and onboarding.',
    features: ['Unlimited users', 'Role-based access', 'Dedicated onboarding', 'Custom launch agreement'],
  },
]

const whyItems = [
  ['WiseFlow Advantage', 'Learn why operations teams choose one connected system'],
  ['About WiseFlow', 'Discover the platform and the working model behind it'],
  ['Success Setup', 'Implementation and support built for long-term adoption'],
  ['Customer Stories', 'Real outcomes from teams replacing manual operations'],
  ['Partner with WiseFlow', 'Offer the system to customers on a monthly basis'],
]

const solutionMenuItems = [
  { label: 'RUN', title: 'Operations Platform', text: 'Work, money, people, and inventory in one place', active: true },
  { label: 'SEE & PREDICT', title: 'Business Analytics', text: 'Insights from your own company data' },
  { label: 'AUTOMATE', title: 'Workflows & Datasets', text: 'Routine work, handled automatically' },
  { label: 'CONTROL', title: 'Portals & Permissions', text: 'Role-based access for every department' },
]

const solutionColumns = [
  {
    label: 'Core operations',
    tone: 'blueDot',
    items: ['HR workspace', 'Payroll finance', 'Accounting', 'Client database', 'Project management', 'Tasks'],
  },
  {
    label: 'Supply chain',
    tone: 'purpleDot',
    items: ['Procurement', 'RFQs', 'Purchase orders', 'Warehouse inventory', 'Stock transfers', 'Suppliers'],
  },
  {
    label: 'Automation',
    tone: 'orangeDot',
    items: ['Workflow builder', 'Dataset tables', 'Approval routing', 'Audit logs', 'Access keys', 'Reports'],
  },
]

const industryItems = [
  ['Construction', 'Coordinate projects, procurement, warehouse, people, and finance'],
  ['Business Services', 'Run client work, billing, assignments, and admin operations'],
  ['Retail & Wholesale', 'Connect purchasing, inventory, suppliers, sales, and finance'],
  ['Manufacturing', 'Track stock, receiving, teams, approvals, and operating records'],
  ['Financial Operations', 'Keep budgets, transactions, invoices, controls, and reports aligned'],
]

const resourceItems = [
  ['Implementation Guide', 'How to roll out WiseFlow across departments'],
  ['Operations Playbook', 'Best practices for workflows, approvals, and records'],
  ['Pricing Brief', 'Monthly, yearly, beta trial, and manual billing details'],
  ['Product Updates', 'Latest improvements across modules and portals'],
  ['Security Notes', 'Permissions, session handling, and audit visibility'],
  ['Help Center', 'Setup guidance for admins and teams'],
]

export default function Home() {
  return (
    <main className={styles.page}>
      <RecoveryRedirect />
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/" className={styles.brand} aria-label="WiseFlow home">
          <span className={styles.brandMark}>W</span>
          <span>WiseFlow</span>
        </Link>
        <div className={styles.navLinks}>
          <div className={styles.navItem}>
            <Link className={styles.menuButton} href="/why-wiseflow">
              Why WiseFlow
              <ChevronDown size={15} aria-hidden="true" />
            </Link>
            <div className={`${styles.megaMenu} ${styles.whyMenu}`}>
              <h2>Why WiseFlow?</h2>
              <div className={styles.whyGrid}>
                {whyItems.map(([title, text]) => (
                  <Link href="/why-wiseflow" key={title}>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.navItem}>
            <Link className={styles.menuButton} href="/platform-solutions">
              Solutions
              <ChevronDown size={15} aria-hidden="true" />
            </Link>
            <div className={`${styles.megaMenu} ${styles.solutionsMenu}`}>
              <h2>Solutions</h2>
              <div className={styles.megaSolutionsLayout}>
                <div className={styles.solutionMenuRail}>
                  {solutionMenuItems.map(item => (
                    <Link href="/platform-solutions" key={item.title} className={item.active ? styles.activeMegaItem : undefined}>
                      <small>{item.label}</small>
                      <strong>{item.title}</strong>
                      <span>{item.text}</span>
                    </Link>
                  ))}
                  <Link href="/platform-solutions" className={styles.allSolutionsLink}>
                    <Grid2X2 size={18} aria-hidden="true" />
                    <span>
                      <strong>All Solutions</strong>
                      <em>Browse the full system</em>
                    </span>
                    <ExternalLink size={16} aria-hidden="true" />
                  </Link>
                </div>
                <div className={styles.solutionMenuDetail}>
                  <div className={styles.detailHeader}>
                    <div>
                      <h3>Operations Platform</h3>
                      <p>Run every department from one connected workspace built for visibility, control, and growth.</p>
                    </div>
                    <Link href="/platform-solutions">
                      All Solutions
                      <ExternalLink size={15} aria-hidden="true" />
                    </Link>
                  </div>
                  {solutionColumns.map(column => (
                    <div className={styles.solutionColumn} key={column.label}>
                      <h4>
                        <i className={styles[column.tone]} />
                        {column.label}
                      </h4>
                      <div>
                        {column.items.map(item => (
                          <Link href="/platform-solutions" key={item}>{item}</Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.navItem}>
            <Link className={styles.menuButton} href="/industries">
              Industries
              <ChevronDown size={15} aria-hidden="true" />
            </Link>
            <div className={`${styles.megaMenu} ${styles.industriesMenu}`}>
              <div className={styles.industryList}>
                <h2>Industries</h2>
                {industryItems.map(([title, text]) => (
                  <Link href="/industries" key={title}>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </Link>
                ))}
              </div>
              <div className={styles.featuredList}>
                <h3>Featured Guides</h3>
                <Link href="/industries"><span>2026 Operating System Rollout Checklist</span><PlayCircle size={18} /></Link>
                <Link href="/industries"><span>From Spreadsheets to Connected Workflows</span><PlayCircle size={18} /></Link>
                <Link href="/industries"><span>How to Package WiseFlow as a Monthly Platform</span><PlayCircle size={18} /></Link>
                <h3 className={styles.limeHeader}>Featured Briefs</h3>
                <Link href="/industries"><span>WiseFlow Pricing Overview</span><Download size={18} /></Link>
                <Link href="/industries"><span>Full Module Capability Map</span><Download size={18} /></Link>
              </div>
            </div>
          </div>

          <div className={styles.navItem}>
            <Link className={styles.menuButton} href="/resource-center">
              Resources
              <ChevronDown size={15} aria-hidden="true" />
            </Link>
            <div className={`${styles.megaMenu} ${styles.resourcesMenu}`}>
              <h2>Resources</h2>
              <div className={styles.resourceGrid}>
                {resourceItems.map(([title, text]) => (
                  <Link href="/resource-center" key={title}>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.navActions}>
          <Link href="/login" className={styles.textButton}>Login</Link>
          <Link href="/signup" className={styles.navButton}>
            Request access
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1>
            <span className={styles.headlineLine}>The <span className={styles.greenText}>Operations-First</span> AI platform for</span>
            <span className={styles.headlineLine}><span className={styles.blueText}>Work</span>, <span className={styles.tealText}>People</span>, Money, and Inventory.</span>
          </h1>
          <p>
            Empower every department with WiseFlow&apos;s connected HR, payroll, finance,
            procurement, warehouse, and workflow system designed to simplify daily work
            and elevate company performance.
          </p>
        </div>

        <div className={styles.heroVisual} aria-label="WiseFlow product preview">
          <div className={styles.dashboardPanel}>
            <div className={styles.windowBar}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.dashboardBody}>
              <div className={styles.sideRail}>
                <strong>WiseFlow</strong>
                <span className={styles.activeNav}>Overview</span>
                <span>HR</span>
                <span>Finance</span>
                <span>Procurement</span>
                <span>Warehouse</span>
              </div>
              <div className={styles.previewMain}>
                <div className={styles.previewHeader}>
                  <div>
                    <small>Company command center</small>
                    <h2>Today&apos;s operating picture</h2>
                  </div>
                  <span>Live</span>
                </div>
                <div className={styles.kpiRow}>
                  <div><strong>$428K</strong><span>Open invoices</span></div>
                  <div><strong>97%</strong><span>Attendance</span></div>
                  <div><strong>42</strong><span>Pending RFQs</span></div>
                </div>
                <div className={styles.timeline}>
                  <div><Check size={15} /> Payroll batch ready</div>
                  <div><Check size={15} /> Purchase order approved</div>
                  <div><Check size={15} /> Low stock transfer scheduled</div>
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles.peopleCard} ${styles.peopleCardLeft}`}>
            <div className={styles.arcShape} />
            <span className={styles.portraitLeft} role="img" aria-label="Smiling operations professional using WiseFlow" />
          </div>
          <div className={`${styles.peopleCard} ${styles.peopleCardRight}`}>
            <div className={styles.arcShape} />
            <span className={styles.portraitRight} role="img" aria-label="Smiling team manager using WiseFlow" />
          </div>
        </div>
      </section>

      <section className={styles.logoBand} aria-label="Example customer types">
          <span>Built for teams that run complex daily operations</span>
        <div>
          {customerLogos.map(logo => (
            <strong key={logo}>{logo}</strong>
          ))}
        </div>
      </section>

      <section className={styles.statsBand}>
        {stats.map(stat => (
          <div key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      <section id="platform" className={styles.platformSection}>
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>One connected platform</span>
          <h2>Built to scale with your company and your departments.</h2>
          <p>
            Start with the modules you need today, then expand into stronger approvals,
            reporting, workflows, and role-based portals as the business grows.
          </p>
        </div>
        <div className={styles.pillarGrid}>
          {platformPillars.map(({ icon: Icon, label, title, text }) => (
            <article key={title} className={styles.pillarCard}>
              <Icon size={24} aria-hidden="true" />
              <span>{label}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="solutions" className={styles.solutionsSection}>
        <div className={styles.solutionTabs} aria-label="Solution categories">
          <span className={styles.activeTab}>Core operations</span>
          <span>Finance</span>
          <span>Supply chain</span>
        </div>
        <div className={styles.solutionLayout}>
          <div className={styles.sectionIntro}>
            <span className={styles.eyebrow}>Complete workspace</span>
            <h2>Everything your team expects from a modern operating system.</h2>
            <p>
              WiseFlow covers the operational backbone: people, money, procurement,
              warehouse, projects, datasets, client records, and internal work.
            </p>
            <Link href="/signup" className={styles.inlineCta}>
              Request beta access
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.solutionCards}>
            {solutionGroups.map(({ icon: Icon, title, text, links }) => (
              <article key={title} className={styles.solutionCard}>
                <Icon size={25} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
                <div>
                  {links.map(link => (
                    <span key={link}>{link}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className={styles.pricingSection}>
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>Closed beta pricing</span>
          <h2>Monthly, yearly, and a guided 14-day beta trial.</h2>
          <p>Every plan includes the full system. Online checkout is not active yet, so beta billing is handled manually after setup review.</p>
        </div>
        <div className={styles.pricingGrid}>
          {plans.map(plan => (
            <article key={plan.name} className={`${styles.planCard} ${plan.featured ? styles.featuredPlan : ''}`}>
              {plan.featured && <span className={styles.planBadge}>Best value</span>}
              <h3>{plan.name}</h3>
              <p>{plan.text}</p>
              <div className={styles.price}>
                <strong>{plan.monthly}</strong>
                <span>/month</span>
              </div>
              <small>{plan.yearly}</small>
              <ul>
                {plan.features.map(feature => (
                  <li key={feature}>
                    <Check size={16} aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className={plan.featured ? styles.primaryButton : styles.planButton}>
                Request beta access
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section id="trial" className={styles.ctaSection}>
        <div>
          <Layers3 size={28} aria-hidden="true" />
          <h2>Start WiseFlow with guided beta onboarding.</h2>
          <p>
            Give customers two weeks to test the real product, then move them into the monthly
            or annual plan that matches their operation once billing is confirmed.
          </p>
        </div>
        <Link href="/signup" className={styles.primaryButton}>
          Request beta access
          <ArrowRight size={19} aria-hidden="true" />
        </Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <span>WiseFlow</span>
          <div>
            <BriefcaseBusiness size={16} aria-hidden="true" />
            <span>Professional business management system</span>
          </div>
        </div>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/refund-policy">Refunds</Link>
          <Link href="/security">Security</Link>
        </div>
      </footer>
    </main>
  )
}
