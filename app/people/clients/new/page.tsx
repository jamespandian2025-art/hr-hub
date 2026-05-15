'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, Save } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { accountManagers, buildEmptyClient, loadClients, saveClient, slugify } from '../clientData'

const font = 'var(--font-body)'

const industries = ['Technology', 'Construction', 'Consulting', 'IT Services', 'Logistics', 'Marketing', 'Healthcare', 'Finance']
const companySizes = ['1 - 10 employees', '11 - 50 employees', '51 - 200 employees', '201 - 500 employees', '500+ employees']
const companyTypes = ['Private', 'Corporation', 'Startup', 'Government', 'Non-profit']
const annualRevenues = ['Below PHP 10M', 'PHP 10M - PHP 20M', 'PHP 20M - PHP 50M', 'PHP 50M - PHP 100M', 'PHP 100M+']
const paymentTerms = ['Due on receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60']

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  website: '',
  industry: '',
  companySize: '',
  companyType: '',
  taxId: '',
  annualRevenue: '',
  billingAddress: '',
  accountManager: '',
  defaultCurrency: 'PHP - Philippine Peso',
  paymentTerms: '',
  description: '',
  tags: '',
  createAnother: false,
}

export default function AddClientPage() {
  const router = useRouter()
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const requiredMissing = useMemo(() => {
    return !form.name || !form.email || !form.phone || !form.industry || !form.companyType || !form.billingAddress || !form.accountManager
  }, [form])

  const update = (key: keyof typeof emptyForm, value: string | boolean) => {
    setForm(current => ({ ...current, [key]: value }))
    setError('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (requiredMissing) {
      setError('Please complete the required client fields before saving.')
      return
    }

    setSaving(true)
    const { clients } = await loadClients()
    const baseId = slugify(form.name)
    const id = clients.some(client => client.id === baseId) ? `${baseId}-${Date.now()}` : baseId
    const client = buildEmptyClient({
      id,
      name: form.name.trim(),
      company: form.website.trim().replace(/^https?:\/\//, '') || `${slugify(form.name)}.com`,
      email: form.email.trim(),
      phone: form.phone.trim(),
      website: form.website.trim(),
      industry: form.industry,
      status: 'Active',
      companySize: form.companySize || '-',
      companyType: form.companyType,
      annualRevenue: form.annualRevenue || '-',
      taxId: form.taxId.trim() || '-',
      billingAddress: form.billingAddress.trim(),
      accountManager: form.accountManager,
      defaultCurrency: form.defaultCurrency,
      paymentTerms: form.paymentTerms || '-',
      tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      description: form.description.trim() || 'No client description added yet.',
    })

    try {
      const result = await saveClient(client)
      if (form.createAnother) {
        setForm(emptyForm)
        setError(result.source === 'local' ? `Saved locally. Supabase is not available: ${result.error}` : '')
      } else {
        router.push(`/people/clients/${result.client.id}`)
      }
    } catch {
      setError('The client could not be saved. Please try again with less data.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="client-form-page" onSubmit={handleSubmit} style={{ fontFamily: font, display: 'grid', gap: 22 }}>
      <div style={pageHeader}>
        <div>
          <div style={breadcrumb}>Home / Client Database / Add Client</div>
          <h1 style={h1}>Add New Client</h1>
          <p style={subtitle}>Enter the client details below to create a new client profile.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/people/clients" style={secondaryLink}>Cancel</Link>
          <button type="submit" disabled={saving} style={{ ...primaryButton, opacity: saving ? .7 : 1 }}><Save size={16} /> {saving ? 'Saving...' : 'Save Client'}</button>
        </div>
      </div>

      {error ? <div style={errorBox}>{error}</div> : null}

      <Section title="Client Information">
        <div style={formGrid}>
          <TextField label="Client Name" required value={form.name} onChange={value => update('name', value)} placeholder="Enter client name" />
          <TextField label="Company Email" required value={form.email} onChange={value => update('email', value)} placeholder="Enter email address" type="email" />
          <PhoneField value={form.phone} onChange={value => update('phone', value)} />
          <TextField label="Company Website" value={form.website} onChange={value => update('website', value)} placeholder="Enter website URL" />
          <SelectField label="Industry" required value={form.industry} onChange={value => update('industry', value)} placeholder="Select industry" options={industries} />
          <SelectField label="Company Size" value={form.companySize} onChange={value => update('companySize', value)} placeholder="Select company size" options={companySizes} />
          <SelectField label="Company Type" required value={form.companyType} onChange={value => update('companyType', value)} placeholder="Select company type" options={companyTypes} />
          <TextField label="Tax ID / VAT Number" value={form.taxId} onChange={value => update('taxId', value)} placeholder="Enter tax ID or VAT number" />
          <SelectField label="Annual Revenue" value={form.annualRevenue} onChange={value => update('annualRevenue', value)} placeholder="Select annual revenue" options={annualRevenues} />
        </div>
        <TextArea label="Billing Address" required value={form.billingAddress} onChange={value => update('billingAddress', value)} placeholder="Enter complete billing address" />
      </Section>

      <Section title="Account Details">
        <div style={formGrid3}>
          <SelectField label="Account Manager" required value={form.accountManager} onChange={value => update('accountManager', value)} placeholder="Select account manager" options={accountManagers} help="Choose the person responsible for this client" />
          <SelectField label="Default Currency" required value={form.defaultCurrency} onChange={value => update('defaultCurrency', value)} placeholder="Select currency" options={['PHP - Philippine Peso']} help="Select the default currency for transactions" />
          <SelectField label="Payment Terms" value={form.paymentTerms} onChange={value => update('paymentTerms', value)} placeholder="Select payment terms" options={paymentTerms} help="e.g. Net 15, Net 30, Net 60" />
        </div>
      </Section>

      <Section title="Additional Information">
        <div style={twoColumnGrid}>
          <TextArea label="Description / Notes" value={form.description} onChange={value => update('description', value)} placeholder="Add any additional notes about this client..." help="Internal notes visible to your team only" />
          <TextField label="Tags" value={form.tags} onChange={value => update('tags', value)} placeholder="Type tags separated by commas" help="Add tags to categorize and easily find this client" />
        </div>
      </Section>

      <label style={checkboxRow}>
        <input type="checkbox" checked={form.createAnother} onChange={event => update('createAnother', event.target.checked)} />
        <span>
          <strong>Create another client</strong>
          <small>Save and create another client after this</small>
        </span>
      </label>
    </form>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={sectionStyle}>
      <h2 style={sectionTitle}>{title}</h2>
      <div style={{ display: 'grid', gap: 22 }}>{children}</div>
    </section>
  )
}

function TextField({ label, value, onChange, placeholder, required, type = 'text', help }: FieldProps & { type?: string }) {
  return (
    <label style={fieldWrap}>
      <span style={labelStyle}>{label}{required ? <b> *</b> : null}</span>
      <input type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} style={inputStyle} />
      {help ? <small style={helpStyle}>{help}</small> : null}
    </label>
  )
}

function TextArea({ label, value, onChange, placeholder, required, help }: FieldProps) {
  return (
    <label style={fieldWrap}>
      <span style={labelStyle}>{label}{required ? <b> *</b> : null}</span>
      <textarea value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} rows={4} style={{ ...inputStyle, height: 88, resize: 'vertical' }} />
      {help ? <small style={helpStyle}>{help}</small> : null}
    </label>
  )
}

function SelectField({ label, value, onChange, placeholder, required, options, help }: FieldProps & { options: string[] }) {
  return (
    <label style={fieldWrap}>
      <span style={labelStyle}>{label}{required ? <b> *</b> : null}</span>
      <span style={{ position: 'relative' }}>
        <select value={value} onChange={event => onChange(event.target.value)} style={{ ...inputStyle, appearance: 'none', paddingRight: 38 }}>
          <option value="">{placeholder}</option>
          {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: 13, color: '#64748b', pointerEvents: 'none' }} />
      </span>
      {help ? <small style={helpStyle}>{help}</small> : null}
    </label>
  )
}

function PhoneField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label style={fieldWrap}>
      <span style={labelStyle}>Phone Number <b>*</b></span>
      <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr' }}>
        <div style={{ ...inputStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0, display: 'grid', placeItems: 'center', fontWeight: 800 }}>PH +63</div>
        <input value={value} onChange={event => onChange(event.target.value)} placeholder="Enter phone number" style={{ ...inputStyle, borderLeft: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }} />
      </div>
    </label>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  required?: boolean
  help?: string
}

const pageHeader = { display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' as const }
const breadcrumb = { fontSize: 13, color: '#008b4a', fontWeight: 800, marginBottom: 24 }
const h1 = { margin: 0, fontSize: 30, lineHeight: 1.12, color: '#020617', fontWeight: 900, letterSpacing: 0 }
const subtitle = { margin: '8px 0 0', color: '#475569', fontSize: 14, fontWeight: 500 }
const primaryButton = { display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 18px', borderRadius: 8, border: '1px solid #16a34a', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 900, cursor: 'pointer' }
const secondaryLink = { display: 'inline-flex', alignItems: 'center', height: 42, padding: '0 18px', borderRadius: 8, border: '1px solid #dbe3ea', background: '#fff', color: '#0f172a', textDecoration: 'none', fontSize: 13, fontWeight: 800 }
const sectionStyle = { background: '#fff', border: '1px solid #dfe7ee', borderRadius: 12, padding: 24, boxShadow: '0 10px 24px rgba(15,23,42,.04)' }
const sectionTitle = { margin: '0 0 24px', color: '#0f172a', fontSize: 17, fontWeight: 900 }
const formGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 22 }
const formGrid3 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 22 }
const twoColumnGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22 }
const fieldWrap = { display: 'grid', gap: 8, minWidth: 0 }
const labelStyle = { color: '#0f172a', fontSize: 13, fontWeight: 800 }
const inputStyle = { width: '100%', height: 42, border: '1px solid #dbe3ea', borderRadius: 8, padding: '0 12px', background: '#fff', color: '#0f172a', fontSize: 13, fontFamily: font, outline: 'none', boxSizing: 'border-box' as const }
const helpStyle = { color: '#64748b', fontSize: 12, fontWeight: 500 }
const errorBox = { border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 800 }
const checkboxRow = { display: 'flex', gap: 10, alignItems: 'flex-start', color: '#0f172a', fontSize: 13, fontWeight: 700 }
