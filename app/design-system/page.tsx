'use client'

import { useState } from 'react'
import {
  Activity, AlertCircle, AlertTriangle, Archive,
  Box, CheckCircle2, ChevronDown, ChevronLeft,
  ChevronRight, ClipboardList, Copy, Download, Edit2, Eye, FileText,
  Filter, Grid, Info, LayoutDashboard,
  MoreHorizontal, Pen, Plus, QrCode, RefreshCw,
  Search, Settings, ShoppingCart, Tag, Trash2, Upload, UsersRound,
  X,
} from 'lucide-react'

const font = "var(--font-body)"
const green = '#22c55e'

const palette = {
  green: [
    { label: '50',  hex: '#f0fdf4' },
    { label: '100', hex: '#dcfce7' },
    { label: '200', hex: '#bbf7d0' },
    { label: '300', hex: '#86efac' },
    { label: '400', hex: '#4ade80' },
    { label: '500', hex: '#22c55e' },
    { label: '600', hex: '#16a34a' },
    { label: '700', hex: '#15803d' },
  ],
  neutral: [
    { label: '50',  hex: '#f9fafb' },
    { label: '100', hex: '#f3f4f6' },
    { label: '200', hex: '#e5e7eb' },
    { label: '300', hex: '#d1d5db' },
    { label: '400', hex: '#9ca3af' },
    { label: '500', hex: '#6b7280' },
    { label: '600', hex: '#4b5563' },
    { label: '700', hex: '#374151' },
    { label: '800', hex: '#1f2937' },
    { label: '900', hex: '#111827' },
  ],
  semantic: [
    { label: 'Success', hex: '#22c55e', sub: '#22C55E' },
    { label: 'Warning', hex: '#f59e0b', sub: '#F5E0B' },
    { label: 'Error',   hex: '#ef4444', sub: '#EF4444' },
    { label: 'Info',    hex: '#3b82f6', sub: '#3882F6' },
  ],
}

const typeScale = [
  { name: 'Display XL',  size: '36px', line: '44px', weight: 'Semi Bold' },
  { name: 'Display L',   size: '28px', line: '36px', weight: 'Semi Bold' },
  { name: 'Heading 1',   size: '22px', line: '28px', weight: 'Semi Bold' },
  { name: 'Heading 2',   size: '18px', line: '24px', weight: 'Semi Bold' },
  { name: 'Heading 3',   size: '16px', line: '20px', weight: 'Medium' },
  { name: 'Body Large',  size: '16px', line: '24px', weight: 'Regular' },
  { name: 'Body',        size: '14px', line: '20px', weight: 'Regular' },
  { name: 'Body Small',  size: '13px', line: '16px', weight: 'Regular' },
  { name: 'Caption',     size: '11px', line: '16px', weight: 'Regular' },
]

const tableItems = [
  { img: 'ðŸª¨', name: 'Cement Ordinary Portland', sku: 'MAT-0001', cat: 'Construction Materials', status: 'ACTIVE',   statusColor: green,     price: 'PHP 2,100.00' },
  { img: 'ðŸ”©', name: 'Steel Rebar 16mm',          sku: 'MAT-0002', cat: 'Construction Materials', status: 'ACTIVE',   statusColor: green,     price: 'PHP 91.80' },
  { img: 'ðŸª£', name: 'Paint Latex White',          sku: 'MAT-0003', cat: 'Finishing Materials',   status: 'ACTIVE',   statusColor: green,     price: 'PHP 495.00' },
  { img: 'ðŸªµ', name: 'Plywood 12mm',               sku: 'MAT-0004', cat: 'Wood & Boards',          status: 'LOW STOCK',statusColor: '#f59e0b', price: 'PHP 795.00' },
]

const navIcons = [Grid, LayoutDashboard, ClipboardList, ShoppingCart, Trash2, Archive, FileText, QrCode, Activity, Settings, UsersRound]
const actionIcons = [Plus, Pen, Trash2, Eye, Download, Upload, Filter, Tag, Copy, MoreHorizontal, X]
const statusIcons = [CheckCircle2, X, Info, AlertTriangle, AlertCircle, RefreshCw]

export default function DesignSystemPage() {
  const [activeTab, setActiveTab] = useState('Details')
  const [checkedRows, setCheckedRows] = useState<number[]>([])
  const tabs = ['Details', 'Suppliers', 'Pricing History', 'Activity', 'Attachments']
  const drawerTabs = ['Details', 'Suppliers', 'Activity', 'Attachments']
  const [drawerTab, setDrawerTab] = useState('Details')

  return (
    <div style={{ fontFamily: font, display: 'flex', gap: 0, minHeight: '100%', alignItems: 'flex-start' }}>

      {/* â”€â”€ Left info panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <aside style={{ width: 232, minWidth: 232, flexShrink: 0, paddingRight: 28, position: 'sticky', top: 0 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#15803d', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 18, color: '#fff', fontFamily: font, letterSpacing: '-1px' }}>W</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', letterSpacing: '-0.3px' }}>WiseFlow</div>
            <div style={{ fontSize: 11, color: '#000000' }}>Enterprise OS</div>
          </div>
        </div>

        <div style={{ height: 1, background: '#e5e7eb', marginBottom: 20 }} />

        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px', marginBottom: 6 }}>Design System</h2>
        <p style={{ fontSize: 12, color: '#000000', lineHeight: 1.6, marginBottom: 24 }}>A comprehensive design system for a modern enterprise operating system.</p>

        {/* Colors */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#000000', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>Colors</div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Primary</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {palette.green.map(s => (
                <div key={s.label} style={{ flex: 1 }}>
                  <div style={{ height: 22, borderRadius: 4, background: s.hex, border: s.label === '50' ? '1px solid #e5e7eb' : 'none' }} />
                  <div style={{ fontSize: 9, color: '#000000', textAlign: 'center', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Semantic</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {palette.semantic.map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: s.hex, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#374151' }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: '#000000' }}>{s.hex.toUpperCase()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Neutral</div>
            <div style={{ display: 'flex', gap: 2 }}>
              {palette.neutral.map(s => (
                <div key={s.label} style={{ flex: 1 }}>
                  <div style={{ height: 18, borderRadius: 3, background: s.hex, border: s.label === '50' ? '1px solid #e5e7eb' : 'none' }} />
                  <div style={{ fontSize: 8, color: '#000000', textAlign: 'center', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Typography */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#000000', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>Typography</div>
          <div style={{ fontSize: 42, fontWeight: 700, color: '#111827', lineHeight: 1, letterSpacing: '-2px', marginBottom: 8 }}>Aa</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 3 }}>Geist Sans</div>
          <div style={{ fontSize: 11, color: '#000000', lineHeight: 1.5, marginBottom: 12 }}>Clean, modern and highly readable typeface for enterprise interfaces.</div>
          <div style={{ display: 'grid', gap: 5 }}>
            {typeScale.map(t => (
              <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{t.name}</span>
                <span style={{ fontSize: 10, color: '#000000' }}>{t.size}/{t.line}</span>
                <span style={{ fontSize: 10, color: '#000000' }}>{t.weight}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* â”€â”€ Main content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* â”€â”€ BUTTONS â”€â”€ */}
        <Section title="Buttons">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { label: 'Primary',   variant: 'primary' },
              { label: 'Secondary', variant: 'secondary' },
              { label: 'Tertiary',  variant: 'tertiary' },
              { label: 'Danger',    variant: 'danger' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 72, fontSize: 12, color: '#000000', flexShrink: 0 }}>{row.label}</span>
                <Btn v={row.variant} state="default" />
                <Btn v={row.variant} state="hover" />
                <Btn v={row.variant} state="pressed" />
                <Btn v={row.variant} state="disabled" />
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 72, fontSize: 12, color: '#000000', flexShrink: 0 }}>Icon Button</span>
              {[Plus, Pen, Trash2, Download, Upload, Edit2].map((Icon, i) => (
                <button key={i} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#374151' }}>
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* â”€â”€ INPUTS â”€â”€ */}
        <Section title="Inputs">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <InputField label="Text Input" placeholder="Enter text" rightIcon={<ChevronDown size={14} color="#000000" />} />
            <InputField label="Focused" placeholder="Enter text" focused />
            <InputField label="Dropdown" placeholder="Select an option" rightIcon={<ChevronDown size={14} color="#000000" />} />
            <div>
              <FieldLabel>Multi Select</FieldLabel>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', height: 40, background: '#fff', gap: 8 }}>
                <span style={{ flex: 1, fontSize: 13, color: '#000000' }}>Select options</span>
                <span style={{ background: green, color: '#fff', borderRadius: 99, fontSize: 11, fontWeight: 700, padding: '1px 7px', minWidth: 20, textAlign: 'center' }}>2</span>
                <ChevronDown size={14} color="#000000" />
              </div>
            </div>
            <div>
              <FieldLabel>Search</FieldLabel>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', height: 40, background: '#fff', gap: 8 }}>
                <Search size={14} color="#000000" />
                <span style={{ flex: 1, fontSize: 13, color: '#000000' }}>Search anything...</span>
              </div>
            </div>
            <div>
              <FieldLabel>Disabled</FieldLabel>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', height: 40, background: '#f9fafb', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#d1d5db' }}>Disabled input</span>
              </div>
            </div>
          </div>
        </Section>

        {/* â”€â”€ TABLE â”€â”€ */}
        <Section title="Table">
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '10px 14px', width: 36 }}><input type="checkbox" style={{ accentColor: green }} /></th>
                  <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#000000', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item Name</th>
                  <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#000000', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SKU</th>
                  <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#000000', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                  <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#000000', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#000000', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {tableItems.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <input type="checkbox" checked={checkedRows.includes(i)} onChange={() => setCheckedRows(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])} style={{ accentColor: green }} />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f3f4f6', display: 'grid', placeItems: 'center', fontSize: 16 }}>{item.img}</div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{item.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#000000' }}>{item.sku}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#000000' }}>{item.cat}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: `${item.statusColor}18`, color: item.statusColor, letterSpacing: '0.03em' }}>{item.status}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#111827', textAlign: 'right' }}>{item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 12, color: '#000000' }}>Showing 1 to 4 of 1,248 items</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <PageBtn><ChevronLeft size={13} /></PageBtn>
                <PageBtn active>1</PageBtn>
                <PageBtn>2</PageBtn>
                <PageBtn>3</PageBtn>
                <span style={{ fontSize: 12, color: '#000000', padding: '0 4px' }}>â€¦</span>
                <PageBtn>312</PageBtn>
                <PageBtn><ChevronRight size={13} /></PageBtn>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#000000' }}>
                <span>10 / page</span><ChevronDown size={12} />
              </div>
            </div>
          </div>
        </Section>

        {/* â”€â”€ BADGES & STATUS â”€â”€ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <Section title="Badges &amp; Status" noMargin>
            <div style={{ display: 'grid', gap: 14 }}>
              <BadgeRow label="Status" badges={[
                { label: 'ACTIVE',   bg: '#f0fdf4', color: '#16a34a' },
                { label: 'PENDING',  bg: '#fffbeb', color: '#d97706' },
                { label: 'INACTIVE', bg: '#f3f4f6', color: '#000000' },
                { label: 'REJECTED', bg: '#fef2f2', color: '#dc2626' },
                { label: 'DRAFT',    bg: '#eff6ff', color: '#2563eb' },
              ]} />
              <BadgeRow label="Stock Level" badges={[
                { label: 'IN STOCK',     bg: '#f0fdf4', color: '#16a34a' },
                { label: 'LOW STOCK',    bg: '#fffbeb', color: '#d97706' },
                { label: 'OUT OF STOCK', bg: '#fef2f2', color: '#dc2626' },
              ]} />
              <BadgeRow label="Priority" badges={[
                { label: 'LOW',      bg: '#f0fdf4', color: '#16a34a' },
                { label: 'MEDIUM',   bg: '#fffbeb', color: '#d97706' },
                { label: 'HIGH',     bg: '#fef2f2', color: '#dc2626' },
                { label: 'CRITICAL', bg: '#f5f3ff', color: '#7c3aed' },
              ]} />
              <div>
                <div style={{ fontSize: 12, color: '#000000', marginBottom: 8 }}>Count Badge</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {[{ n: '1', bg: green }, { n: '8', bg: '#3b82f6' }, { n: '32', bg: '#f59e0b' }, { n: '99+', bg: '#ef4444' }].map(b => (
                    <span key={b.n} style={{ background: b.bg, color: '#fff', borderRadius: 99, fontSize: 11, fontWeight: 700, padding: '2px 8px', minWidth: 22, textAlign: 'center' }}>{b.n}</span>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* CARDS */}
          <Section title="Cards" noMargin>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0fdf4', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <ShoppingCart size={20} color={green} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#000000', marginBottom: 2 }}>Total Items</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: '-0.5px', lineHeight: 1 }}>1,248</div>
                    <div style={{ fontSize: 12, color: green, marginTop: 3, fontWeight: 500 }}>â†‘ 12.5%</div>
                    <div style={{ fontSize: 11, color: '#000000' }}>Across all categories</div>
                  </div>
                </div>
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#faf5ff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Box size={20} color="#8b5cf6" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#000000', marginBottom: 2 }}>Total Cost</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.5px', lineHeight: 1 }}>PHP 2,000,000.00</div>
                    <div style={{ fontSize: 11, color: '#000000', marginTop: 3 }}>Base price total</div>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* â”€â”€ ALERTS â”€â”€ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <Section title="Alerts" noMargin>
            <div style={{ display: 'grid', gap: 8 }}>
              <Alert type="success" title="Success"     msg="Item has been added successfully." />
              <Alert type="info"    title="Information" msg="Price update completed successfully." />
              <Alert type="warning" title="Warning"     msg="Stock level is running low." />
              <Alert type="error"   title="Error"       msg="Failed to save changes. Please try again." />
            </div>
          </Section>

          {/* NOTIFICATIONS */}
          <Section title="Notifications (Toast)" noMargin>
            <div style={{ display: 'grid', gap: 8 }}>
              <Toast type="success" title="Item created successfully"  msg="The new item has been added to pricebook." />
              <Toast type="info"    title="Price updated"              msg="The price has been updated successfully." />
              <Toast type="warning" title="Low stock alert"            msg='"Plywood 12mm" is running low on stock.' />
              <Toast type="error"   title="Failed to save"             msg="Something went wrong. Please try again." />
            </div>
          </Section>
        </div>

        {/* â”€â”€ ICONS â”€â”€ */}
        <Section title="Icons">
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: '#000000', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Navigation</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {navIcons.map((Icon, i) => (
                  <div key={i} style={{ width: 36, height: 36, border: '1px solid #e5e7eb', borderRadius: 8, display: 'grid', placeItems: 'center', color: '#374151' }}><Icon size={16} /></div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#000000', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Actions</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {actionIcons.map((Icon, i) => (
                  <div key={i} style={{ width: 36, height: 36, border: '1px solid #e5e7eb', borderRadius: 8, display: 'grid', placeItems: 'center', color: '#374151' }}><Icon size={16} /></div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#000000', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Status</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {statusIcons.map((Icon, i) => (
                  <div key={i} style={{ width: 36, height: 36, border: '1px solid #e5e7eb', borderRadius: 8, display: 'grid', placeItems: 'center', color: '#374151' }}><Icon size={16} /></div>
                ))}
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#000000', fontStyle: 'italic' }}>
              Style: Outline &nbsp;|&nbsp; Stroke: 1.5px &nbsp;|&nbsp; Corner: 2px &nbsp;|&nbsp; Consistent grid
            </p>
          </div>
        </Section>

        {/* â”€â”€ PAGINATION â”€â”€ */}
        <Section title="Pagination">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <PageBtn><ChevronLeft size={13} /></PageBtn>
              <PageBtn>1</PageBtn>
              <PageBtn active>2</PageBtn>
              <PageBtn>3</PageBtn>
              <span style={{ fontSize: 12, color: '#000000', padding: '0 4px' }}>â€¦</span>
              <PageBtn>125</PageBtn>
              <PageBtn><ChevronRight size={13} /></PageBtn>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <PageBtn>Â«</PageBtn>
              <PageBtn>â€¹</PageBtn>
              <PageBtn active>1</PageBtn>
              <PageBtn>2</PageBtn>
              <PageBtn>3</PageBtn>
              <PageBtn>â€º</PageBtn>
              <PageBtn>Â»</PageBtn>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
                10 / page <ChevronDown size={13} color="#000000" />
              </div>
            </div>
          </div>
        </Section>

        {/* â”€â”€ TABS â”€â”€ */}
        <Section title="Tabs">
          <div style={{ borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 0 }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: activeTab === t ? 600 : 400, color: activeTab === t ? green : '#000000', border: 'none', borderBottom: `2px solid ${activeTab === t ? green : 'transparent'}`, background: 'transparent', cursor: 'pointer', transition: 'color 150ms' }}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ padding: '14px 0', fontSize: 13, color: '#000000' }}>
            Active tab: <strong style={{ color: '#111827' }}>{activeTab}</strong>
          </div>
        </Section>

        {/* â”€â”€ MODAL + DRAWER â”€â”€ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

          {/* MODAL */}
          <Section title="Modal Example" noMargin>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #e5e7eb', display: 'grid', placeItems: 'center', cursor: 'pointer', background: '#fff' }}>
                  <X size={13} color="#000000" />
                </div>
              </div>
              <div style={{ padding: '24px 20px', textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 99, background: '#fffbeb', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                  <AlertTriangle size={22} color="#f59e0b" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Delete Item</div>
                <div style={{ fontSize: 13, color: '#000000', lineHeight: 1.5, marginBottom: 20 }}>
                  Are you sure you want to delete this item?<br />This action cannot be undone.
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button style={{ padding: '8px 22px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>Cancel</button>
                  <button style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: '#ef4444', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            </div>
          </Section>

          {/* DRAWER */}
          <Section title="Drawer (Right Panel)" noMargin>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Cement Ordinary Portland</span>
                  <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: '#f0fdf4', color: '#16a34a' }}>ACTIVE</span>
                </div>
                <X size={15} color="#000000" style={{ cursor: 'pointer' }} />
              </div>
              <div style={{ borderBottom: '1px solid #e5e7eb', padding: '0 16px', display: 'flex', gap: 0 }}>
                {drawerTabs.map(t => (
                  <button key={t} onClick={() => setDrawerTab(t)} style={{ padding: '8px 12px', fontSize: 12, fontWeight: drawerTab === t ? 600 : 400, color: drawerTab === t ? green : '#000000', border: 'none', borderBottom: `2px solid ${drawerTab === t ? green : 'transparent'}`, background: 'transparent', cursor: 'pointer' }}>
                    {t}
                  </button>
                ))}
              </div>
              <div style={{ padding: '12px 16px', display: 'grid', gap: 10 }}>
                {[
                  { label: 'Category', value: 'Construction Materials' },
                  { label: 'Type',     value: 'Material' },
                  { label: 'Unit',     value: '20 pcs' },
                  { label: 'Cost (Base Price)', value: 'PHP 2,000.00' },
                  { label: 'Markup',   value: '5%' },
                  { label: 'Price (Selling Price)', value: 'PHP 2,100.00' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 12, color: '#000000', flexShrink: 0 }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#111827', textAlign: 'right' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </div>

      </div>
    </div>
  )
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Section({ title, children, noMargin }: { title: string; children: React.ReactNode; noMargin?: boolean }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px', marginBottom: noMargin ? 0 : 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#000000', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  )
}

function Btn({ v, state }: { v: string; state: string }) {
  const disabled = state === 'disabled'
  const pressed  = state === 'pressed'
  const hover    = state === 'hover'
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: pressed ? '#15803d' : hover ? '#16a34a' : disabled ? '#bbf7d0' : '#22c55e', color: disabled ? '#fff' : '#fff', border: 'none' },
    secondary: { background: pressed ? '#dcfce7' : hover ? '#f0fdf4' : '#fff', color: pressed || hover ? '#16a34a' : disabled ? '#d1d5db' : '#22c55e', border: `1px solid ${disabled ? '#e5e7eb' : '#22c55e'}` },
    tertiary:  { background: pressed ? '#f0fdf4' : hover ? '#f9fafb' : 'transparent', color: disabled ? '#d1d5db' : '#22c55e', border: '1px solid transparent' },
    danger:    { background: pressed ? '#b91c1c' : hover ? '#dc2626' : disabled ? '#fecaca' : '#ef4444', color: '#fff', border: 'none' },
  }
  const labels: Record<string, string> = { default: 'Default', hover: 'Hover', pressed: 'Pressed', disabled: 'Disabled' }
  return (
    <button disabled={disabled} style={{ ...styles[v], borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: 1, minWidth: 86, fontFamily: "var(--font-body)" }}>
      {labels[state]}
    </button>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>{children}</div>
}

function InputField({ label, placeholder, focused, rightIcon }: { label: string; placeholder: string; focused?: boolean; rightIcon?: React.ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${focused ? '#22c55e' : '#e5e7eb'}`, borderRadius: 8, padding: '0 12px', height: 40, background: '#fff', gap: 8, boxShadow: focused ? '0 0 0 3px rgba(34,197,94,0.12)' : 'none' }}>
        <span style={{ flex: 1, fontSize: 13, color: '#000000' }}>{placeholder}</span>
        {rightIcon}
      </div>
    </div>
  )
}

function PageBtn({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${active ? '#22c55e' : '#e5e7eb'}`, background: active ? '#22c55e' : '#fff', color: active ? '#fff' : '#374151', fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
      {children}
    </button>
  )
}

function BadgeRow({ label, badges }: { label: string; badges: { label: string; bg: string; color: string }[] }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: '#000000', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {badges.map(b => (
          <span key={b.label} style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: b.bg, color: b.color, letterSpacing: '0.04em' }}>{b.label}</span>
        ))}
      </div>
    </div>
  )
}

const alertConfig = {
  success: { icon: CheckCircle2, bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a', titleColor: '#14532d' },
  info:    { icon: Info,         bg: '#eff6ff', border: '#bfdbfe', color: '#3b82f6', titleColor: '#1e3a8a' },
  warning: { icon: AlertTriangle,bg: '#fffbeb', border: '#fde68a', color: '#f59e0b', titleColor: '#78350f' },
  error:   { icon: AlertCircle,  bg: '#fef2f2', border: '#fecaca', color: '#ef4444', titleColor: '#7f1d1d' },
}

function Alert({ type, title, msg }: { type: keyof typeof alertConfig; title: string; msg: string }) {
  const c = alertConfig[type]; const Icon = c.icon
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 9, padding: '10px 12px' }}>
      <Icon size={16} color={c.color} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: c.titleColor }}>{title}</div>
        <div style={{ fontSize: 13, color: c.color, marginTop: 1 }}>{msg}</div>
      </div>
      <X size={13} color={c.color} style={{ cursor: 'pointer', flexShrink: 0, marginTop: 1 }} />
    </div>
  )
}

function Toast({ type, title, msg }: { type: keyof typeof alertConfig; title: string; msg: string }) {
  const c = alertConfig[type]; const Icon = c.icon
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 9, padding: '10px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <Icon size={15} color={c.color} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{title}</div>
        <div style={{ fontSize: 11, color: '#000000', marginTop: 1, lineHeight: 1.4 }}>{msg}</div>
      </div>
      <X size={12} color="#000000" style={{ cursor: 'pointer', flexShrink: 0, marginTop: 1 }} />
    </div>
  )
}
