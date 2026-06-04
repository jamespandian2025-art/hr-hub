'use client'

import { usePathname } from 'next/navigation'
import { ArrowRight, Database, Workflow } from 'lucide-react'
import { getProcurementRouteMeta } from '@/config/procurement-menu'

const font = 'var(--font-body)'

export default function ProcurementWorkspacePlaceholder() {
  const pathname = usePathname()
  const meta = getProcurementRouteMeta(pathname)
  const Icon = meta.icon

  return (
    <main className="procurement-placeholder" style={{ fontFamily: font }}>
      <style>{placeholderCss}</style>
      <section className="procurement-placeholder-hero">
        <span className="procurement-placeholder-icon"><Icon size={22} /></span>
        <div>
          <p className="procurement-placeholder-kicker">Procurement workspace</p>
          <h1>{meta.label}</h1>
          <p>{meta.description}</p>
        </div>
      </section>

      <section className="procurement-placeholder-grid">
        <article>
          <Database size={18} />
          <strong>Connected data source</strong>
          <p>This section is ready to use scoped procurement records for the active company.</p>
        </article>
        <article>
          <Workflow size={18} />
          <strong>Workflow ready</strong>
          <p>Approvals, actions, and reports can plug into the same procurement workspace shell.</p>
        </article>
        <article>
          <ArrowRight size={18} />
          <strong>Navigation wired</strong>
          <p>The route is available and shares the new responsive procurement layout.</p>
        </article>
      </section>
    </main>
  )
}

const placeholderCss = `
.procurement-placeholder {
  padding: 28px;
  color: #0f172a;
}
.procurement-placeholder-hero {
  min-height: 210px;
  border: 1px solid #e8edf4;
  border-radius: 16px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, .04);
}
.procurement-placeholder-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: #ecfdf3;
  color: #16a34a;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.procurement-placeholder-kicker {
  margin: 0 0 6px;
  color: #16a34a;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .08em;
}
.procurement-placeholder h1 {
  margin: 0;
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.05;
  font-weight: 950;
  letter-spacing: 0;
}
.procurement-placeholder p {
  color: #000000;
  font-size: 13px;
  line-height: 1.5;
}
.procurement-placeholder-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.procurement-placeholder-grid article {
  border: 1px solid #e8edf4;
  border-radius: 14px;
  background: #fff;
  padding: 18px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, .035);
}
.procurement-placeholder-grid svg {
  color: #16a34a;
  margin-bottom: 12px;
}
.procurement-placeholder-grid strong {
  display: block;
  font-size: 14px;
  font-weight: 950;
}
@media (max-width: 760px) {
  .procurement-placeholder {
    padding: 16px;
  }
  .procurement-placeholder-hero {
    align-items: flex-start;
    flex-direction: column;
    min-height: 0;
  }
  .procurement-placeholder-grid {
    grid-template-columns: 1fr;
  }
}
`
