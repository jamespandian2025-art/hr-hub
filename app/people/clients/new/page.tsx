'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera, ChevronDown, CreditCard, FileText, Save, Trash2, UserPlus, UsersRound } from 'lucide-react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { uploadFileObject } from '@/lib/uploads/client'
import { addAccountManagerRecord, buildEmptyClient, loadAccountManagers, loadClients, saveClient, slugify, type ClientType } from '../clientData'

const font = 'var(--font-body)'

const industries = ['Technology', 'Construction', 'Residential', 'Consulting', 'IT Services', 'Logistics', 'Marketing', 'Healthcare', 'Finance']
const companySizes = ['1 - 10 employees', '11 - 50 employees', '51 - 200 employees', '201 - 500 employees', '500+ employees']
const companyTypes = ['Private', 'Corporation', 'Startup', 'Government', 'Non-profit']
const annualRevenues = ['Below PHP 10M', 'PHP 10M - PHP 20M', 'PHP 20M - PHP 50M', 'PHP 50M - PHP 100M', 'PHP 100M+']
const paymentTerms = ['Due on receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60']
const clientTypes: ClientType[] = ['Commercial', 'Residential']
const residentialPropertyTypes = ['Single-family home', 'Condominium', 'Townhouse', 'Apartment', 'Vacation home', 'Other']
const residentialProjectInterests = ['New home build', 'Renovation', 'Interior fit-out', 'Repair / maintenance', 'Consultation', 'Other']
const contactMethods = ['Email', 'Phone call', 'SMS', 'Viber', 'WhatsApp']
const maxClientPhotoBytes = 2 * 1024 * 1024

const emptyForm = {
  clientType: 'Commercial' as ClientType,
  photo: '',
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
  residentialPropertyType: '',
  projectInterest: '',
  preferredContact: '',
  createAnother: false,
}

type ClientFormState = typeof emptyForm
type RequiredFieldKey = Extract<keyof typeof emptyForm, 'name' | 'email' | 'phone' | 'industry' | 'companyType' | 'billingAddress' | 'residentialPropertyType' | 'projectInterest' | 'accountManager'>

const requiredFieldLabels: Record<RequiredFieldKey, string> = {
  name: 'Client name',
  email: 'Email address',
  phone: 'Phone number',
  industry: 'Industry',
  companyType: 'Company type',
  billingAddress: 'Home / property address',
  residentialPropertyType: 'Property type',
  projectInterest: 'Project / service interest',
  accountManager: 'Account manager',
}

export default function AddClientPage() {
  const router = useRouter()
  const [form, setForm] = useState(emptyForm)
  const [accountManagers, setAccountManagers] = useState<string[]>([])
  const [error, setError] = useState('')
  const [manualManagerName, setManualManagerName] = useState('')
  const [manualManagerError, setManualManagerError] = useState('')
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)

  useEffect(() => {
    let active = true
    const refreshManagers = () => {
      void loadAccountManagers()
        .then(managers => {
          if (active) setAccountManagers(managers)
        })
        .catch(() => {
          if (active) setAccountManagers([])
        })
    }
    refreshManagers()
    window.addEventListener('storage', refreshManagers)
    window.addEventListener('wiseflow-project-management-refresh', refreshManagers)
    return () => {
      active = false
      window.removeEventListener('storage', refreshManagers)
      window.removeEventListener('wiseflow-project-management-refresh', refreshManagers)
    }
  }, [])

  const isResidential = form.clientType === 'Residential'

  const missingRequiredFields = useMemo<RequiredFieldKey[]>(() => getMissingRequiredFields(form), [form])

  const missingFieldSet = useMemo(() => new Set(missingRequiredFields), [missingRequiredFields])
  const validationMessage = showValidationErrors && missingRequiredFields.length
    ? `Please complete the highlighted fields: ${missingRequiredFields.map(field => requiredFieldLabels[field]).join(', ')}.`
    : ''
  const visibleError = validationMessage || error
  const isFieldInvalid = (field: RequiredFieldKey) => showValidationErrors && missingFieldSet.has(field)
  const getFieldError = (field: RequiredFieldKey) => `${requiredFieldLabels[field]} is required.`

  const update = (key: keyof typeof emptyForm, value: string | boolean) => {
    setForm(current => ({ ...current, [key]: value }))
    setError('')
  }

  const updateClientType = (clientType: ClientType) => {
    setForm(current => ({
      ...current,
      clientType,
      industry: clientType === 'Residential' ? 'Residential' : current.industry === 'Residential' ? '' : current.industry,
      companyType: clientType === 'Residential' ? '' : current.companyType,
      companySize: clientType === 'Residential' ? '' : current.companySize,
      annualRevenue: clientType === 'Residential' ? '' : current.annualRevenue,
      taxId: clientType === 'Residential' ? '' : current.taxId,
      website: clientType === 'Residential' ? '' : current.website,
    }))
    setError('')
  }

  const handleAddAccountManager = async () => {
    const managerName = manualManagerName.trim()
    if (!managerName) {
      setManualManagerError('Enter the account manager name.')
      return
    }

    try {
      const savedName = await addAccountManagerRecord(managerName)
      if (!savedName) {
        setManualManagerError('Enter the account manager name.')
        return
      }

      setAccountManagers(current => Array.from(new Set([...current, savedName])).sort((a, b) => a.localeCompare(b)))
      setManualManagerName('')
      setManualManagerError('')
      update('accountManager', savedName)
    } catch {
      setManualManagerError('Could not add this manager to HR records. Select an existing manager or ask an admin to add them in HR.')
    }
  }

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file for the client photo or logo.')
      return
    }

    if (file.size > maxClientPhotoBytes) {
      setError('Client photo or logo must be 2MB or smaller.')
      return
    }

    setError('')
    setPhotoUploading(true)
    try {
      const uploaded = await uploadFileObject(file, 'client-photos')
      update('photo', uploaded.url)
    } catch (error) {
      setError(photoUploadErrorMessage(error))
    } finally {
      setPhotoUploading(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (photoUploading) {
      setError('Please wait for the client photo upload to finish, then save again.')
      return
    }

    let formToSave = form
    if (!formToSave.accountManager && !accountManagers.length && manualManagerName.trim()) {
      try {
        const savedName = await addAccountManagerRecord(manualManagerName)
        if (savedName) {
          formToSave = { ...formToSave, accountManager: savedName }
          setForm(formToSave)
          setAccountManagers(current => Array.from(new Set([...current, savedName])).sort((a, b) => a.localeCompare(b)))
          setManualManagerName('')
          setManualManagerError('')
        }
      } catch {
        setManualManagerError('Could not add this manager to HR records. Select an existing manager or ask an admin to add them in HR.')
      }
    }

    const submitMissingFields = getMissingRequiredFields(formToSave)
    if (submitMissingFields.length) {
      setShowValidationErrors(true)
      setError('')
      focusFirstMissingField(submitMissingFields[0])
      return
    }

    setShowValidationErrors(false)
    setError('')
    setSaving(true)
    const { clients } = await loadClients()
    const baseId = slugify(formToSave.name)
    const id = clients.some(client => client.id === baseId) ? `${baseId}-${Date.now()}` : baseId
    const isResidentialForSave = formToSave.clientType === 'Residential'
    const tags = [
      formToSave.clientType,
      formToSave.projectInterest,
      ...formToSave.tags.split(','),
    ].map(tag => tag.trim()).filter(Boolean)
    const descriptionParts = [
      formToSave.description.trim(),
      isResidentialForSave && formToSave.preferredContact ? `Preferred contact: ${formToSave.preferredContact}.` : '',
      isResidentialForSave && formToSave.projectInterest ? `Project interest: ${formToSave.projectInterest}.` : '',
    ].filter(Boolean)
    const client = buildEmptyClient({
      id,
      clientType: formToSave.clientType,
      photo: formToSave.photo,
      name: formToSave.name.trim(),
      company: isResidentialForSave ? formToSave.name.trim() : formToSave.website.trim().replace(/^https?:\/\//, '') || `${slugify(formToSave.name)}.com`,
      email: formToSave.email.trim(),
      phone: formToSave.phone.trim(),
      website: isResidentialForSave ? '' : formToSave.website.trim(),
      industry: isResidentialForSave ? 'Residential' : formToSave.industry,
      status: 'Active',
      companySize: isResidentialForSave ? '-' : formToSave.companySize || '-',
      companyType: isResidentialForSave ? formToSave.residentialPropertyType : formToSave.companyType,
      annualRevenue: isResidentialForSave ? '-' : formToSave.annualRevenue || '-',
      taxId: isResidentialForSave ? '-' : formToSave.taxId.trim() || '-',
      billingAddress: formToSave.billingAddress.trim() || '-',
      accountManager: formToSave.accountManager,
      defaultCurrency: formToSave.defaultCurrency,
      paymentTerms: formToSave.paymentTerms || '-',
      tags: Array.from(new Set(tags)),
      description: descriptionParts.join('\n') || 'No client description added yet.',
    })

    try {
      const result = await saveClient(client)
      if (formToSave.createAnother) {
        setForm({ ...emptyForm, clientType: formToSave.clientType })
        setError(result.error ? `Saved with a warning: ${result.error}` : '')
      } else {
        router.push(`/people/clients/${result.client.id}`)
      }
    } catch (error) {
      setError(clientSaveErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="client-form-page" onSubmit={handleSubmit} style={formPage}>
      <div style={pageHeader}>
        <div>
          <div style={breadcrumb}><Link href="/dashboard" style={breadcrumbLink}>Home</Link><ChevronDown size={13} style={crumbChevron} /><Link href="/people/clients" style={breadcrumbLink}>Client Database</Link><ChevronDown size={13} style={crumbChevron} /><span>Add Client</span></div>
          <h1 style={h1}>Add New Client</h1>
          <p style={subtitle}>Create a new client profile for your workspace.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/people/clients" style={secondaryLink}>Cancel</Link>
          <button type="submit" disabled={saving || photoUploading} style={{ ...primaryButton, opacity: saving || photoUploading ? .7 : 1 }}><Save size={16} /> {saving ? 'Saving...' : 'Save Client'}</button>
        </div>
      </div>

      {visibleError ? <div role="alert" aria-live="assertive" style={errorBox}>{visibleError}</div> : null}

      <Section title="Client Information" icon={<UsersRound size={18} />}>
        <ClientPhotoField photo={form.photo} name={form.name} uploading={photoUploading} onUpload={handlePhotoUpload} onRemove={() => update('photo', '')} />
        <div style={clientTypeFieldWrap}>
          <SelectField
            label="Client Type"
            required
            value={form.clientType}
            onChange={value => updateClientType(value as ClientType)}
            placeholder="Select client type"
            options={clientTypes}
            help="Choose Commercial for companies or Residential for homeowners and individual clients."
          />
        </div>
        {isResidential ? (
          <>
            <div style={formGridResidential}>
              <TextField fieldKey="name" label="Client Name" required invalid={isFieldInvalid('name')} errorMessage={getFieldError('name')} value={form.name} onChange={value => update('name', value)} placeholder="Enter homeowner or resident name" />
              <TextField fieldKey="email" label="Email Address" required invalid={isFieldInvalid('email')} errorMessage={getFieldError('email')} value={form.email} onChange={value => update('email', value)} placeholder="Enter email address" type="email" />
              <PhoneField invalid={isFieldInvalid('phone')} errorMessage={getFieldError('phone')} value={form.phone} onChange={value => update('phone', value)} />
              <SelectField fieldKey="residentialPropertyType" label="Property Type" required invalid={isFieldInvalid('residentialPropertyType')} errorMessage={getFieldError('residentialPropertyType')} value={form.residentialPropertyType} onChange={value => update('residentialPropertyType', value)} placeholder="Select property type" options={residentialPropertyTypes} />
              <SelectField fieldKey="projectInterest" label="Project / Service Interest" required invalid={isFieldInvalid('projectInterest')} errorMessage={getFieldError('projectInterest')} value={form.projectInterest} onChange={value => update('projectInterest', value)} placeholder="Select service" options={residentialProjectInterests} />
              <SelectField label="Preferred Contact" value={form.preferredContact} onChange={value => update('preferredContact', value)} placeholder="Select contact method" options={contactMethods} />
            </div>
            <TextArea fieldKey="billingAddress" label="Home / Property Address" required invalid={isFieldInvalid('billingAddress')} errorMessage={getFieldError('billingAddress')} value={form.billingAddress} onChange={value => update('billingAddress', value)} placeholder="Enter residential address or project site" />
          </>
        ) : (
          <>
            <div style={formGrid}>
              <TextField fieldKey="name" label="Client Name" required invalid={isFieldInvalid('name')} errorMessage={getFieldError('name')} value={form.name} onChange={value => update('name', value)} placeholder="Enter client name" />
              <TextField fieldKey="email" label="Company Email" required invalid={isFieldInvalid('email')} errorMessage={getFieldError('email')} value={form.email} onChange={value => update('email', value)} placeholder="Enter email address" type="email" />
              <PhoneField invalid={isFieldInvalid('phone')} errorMessage={getFieldError('phone')} value={form.phone} onChange={value => update('phone', value)} />
              <TextField label="Company Website" value={form.website} onChange={value => update('website', value)} placeholder="Enter website URL" />
              <SelectField fieldKey="industry" label="Industry" required invalid={isFieldInvalid('industry')} errorMessage={getFieldError('industry')} value={form.industry} onChange={value => update('industry', value)} placeholder="Select industry" options={industries} />
              <SelectField label="Company Size" value={form.companySize} onChange={value => update('companySize', value)} placeholder="Select company size" options={companySizes} />
              <SelectField fieldKey="companyType" label="Company Type" required invalid={isFieldInvalid('companyType')} errorMessage={getFieldError('companyType')} value={form.companyType} onChange={value => update('companyType', value)} placeholder="Select company type" options={companyTypes} />
              <TextField label="Tax ID / VAT Number" value={form.taxId} onChange={value => update('taxId', value)} placeholder="Enter tax ID or VAT number" />
              <SelectField label="Annual Revenue" value={form.annualRevenue} onChange={value => update('annualRevenue', value)} placeholder="Select annual revenue" options={annualRevenues} />
            </div>
            <TextArea label="Billing Address" value={form.billingAddress} onChange={value => update('billingAddress', value)} placeholder="Enter complete billing address" />
          </>
        )}
      </Section>

      <Section title="Account Details" icon={<CreditCard size={18} />}>
        <div style={formGrid3}>
          <AccountManagerField value={form.accountManager} options={accountManagers} manualName={manualManagerName} manualError={manualManagerError} invalid={isFieldInvalid('accountManager')} errorMessage={getFieldError('accountManager')} onChange={value => update('accountManager', value)} onManualNameChange={value => { setManualManagerName(value); setManualManagerError('') }} onManualAdd={handleAddAccountManager} />
          <SelectField label="Default Currency" required value={form.defaultCurrency} onChange={value => update('defaultCurrency', value)} placeholder="Select currency" options={['PHP - Philippine Peso']} help="Select the default currency for transactions" />
          <SelectField label="Payment Terms" value={form.paymentTerms} onChange={value => update('paymentTerms', value)} placeholder="Select payment terms" options={paymentTerms} help="e.g. Net 15, Net 30, Net 60" />
        </div>
      </Section>

      <Section title="Additional Information" icon={<FileText size={18} />}>
        <div style={twoColumnGrid}>
          <TextArea label={isResidential ? 'Residential Notes' : 'Description / Notes'} value={form.description} onChange={value => update('description', value)} placeholder={isResidential ? 'Add household preferences, site notes, or project details...' : 'Add any additional notes about this client...'} help="Internal notes visible to your team only" />
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

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section style={sectionStyle}>
      <h2 style={sectionTitle}><span style={sectionIcon}>{icon}</span>{title}</h2>
      <div style={{ display: 'grid', gap: 22 }}>{children}</div>
    </section>
  )
}

function ClientPhotoField({ photo, name, uploading, onUpload, onRemove }: { photo: string; name: string; uploading: boolean; onUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>; onRemove: () => void }) {
  return (
    <div style={photoFieldWrap}>
      <div style={photoPreview(photo)}>
        {photo ? null : <span>{getPhotoInitials(name)}</span>}
      </div>
      <div style={photoCopy}>
        <span style={labelStyle}>Client logo or photo</span>
        <small style={helpStyle}>Upload a logo for commercial clients or a profile photo for residential clients.</small>
        <div style={photoActions}>
          <label style={{ ...photoUploadButton, opacity: uploading ? .72 : 1, cursor: uploading ? 'progress' : 'pointer' }}>
            <Camera size={15} /> {uploading ? 'Uploading...' : 'Upload image'}
            <input type="file" accept="image/*" hidden disabled={uploading} onChange={onUpload} />
          </label>
          {photo ? (
            <button type="button" disabled={uploading} style={{ ...photoRemoveButton, opacity: uploading ? .65 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }} onClick={onRemove}>
              <Trash2 size={14} /> Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function AccountManagerField({ value, options, manualName, manualError, invalid, errorMessage, onChange, onManualNameChange, onManualAdd }: {
  value: string
  options: string[]
  manualName: string
  manualError: string
  invalid?: boolean
  errorMessage?: string
  onChange: (value: string) => void
  onManualNameChange: (value: string) => void
  onManualAdd: () => void
}) {
  if (options.length) {
    return (
      <SelectField
        fieldKey="accountManager"
        label="Account Manager"
        required
        invalid={invalid}
        errorMessage={errorMessage}
        value={value}
        onChange={onChange}
        placeholder="Select account manager"
        options={options}
        help="Choose the employee or client supervisor responsible for this client"
      />
    )
  }

  const fieldId = 'client-accountManager-field'
  const errorId = `${fieldId}-error`
  const manualErrorId = `${fieldId}-manual-error`
  const describedBy = [invalid ? errorId : undefined, manualError ? manualErrorId : undefined].filter(Boolean).join(' ')

  return (
    <label style={fieldWrap} data-client-field="accountManager" data-client-invalid={invalid || manualError ? 'true' : undefined}>
      <span style={labelStyle}>Account Manager <b>*</b></span>
      <div style={manualManagerRow}>
        <input
          id={fieldId}
          type="text"
          value={manualName}
          onChange={event => onManualNameChange(event.target.value)}
          placeholder="Type account manager name"
          style={inputStyle}
          aria-invalid={invalid || Boolean(manualError) || undefined}
          aria-describedby={describedBy || undefined}
        />
        <button type="button" onClick={onManualAdd} style={manualManagerButton}>
          <UserPlus size={15} /> Add
        </button>
      </div>
      {manualError ? <small id={manualErrorId} data-client-error-message="true" style={fieldErrorStyle}>{manualError}</small> : null}
      {invalid ? <small id={errorId} data-client-error-message="true" style={fieldErrorStyle}>{errorMessage || 'Account manager is required.'}</small> : null}
      <small style={helpStyle}>No account managers found. Add one here to create the employee record and assign this client.</small>
    </label>
  )
}

function TextField({ fieldKey, label, value, onChange, placeholder, required, type = 'text', help, invalid, errorMessage }: FieldProps & { type?: string }) {
  const fieldId = fieldKey ? `client-${fieldKey}-field` : undefined
  const errorId = fieldId ? `${fieldId}-error` : undefined
  const helpId = fieldId ? `${fieldId}-help` : undefined
  const describedBy = [invalid ? errorId : undefined, help ? helpId : undefined].filter(Boolean).join(' ')

  return (
    <label style={fieldWrap} data-client-field={fieldKey} data-client-invalid={invalid ? 'true' : undefined}>
      <span style={labelStyle}>{label}{required ? <b> *</b> : null}</span>
      <input id={fieldId} type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} style={inputStyle} aria-invalid={invalid || undefined} aria-describedby={describedBy || undefined} />
      {invalid ? <small id={errorId} data-client-error-message="true" style={fieldErrorStyle}>{errorMessage || 'This field is required.'}</small> : null}
      {help ? <small id={helpId} style={helpStyle}>{help}</small> : null}
    </label>
  )
}

function TextArea({ fieldKey, label, value, onChange, placeholder, required, help, invalid, errorMessage }: FieldProps) {
  const fieldId = fieldKey ? `client-${fieldKey}-field` : undefined
  const errorId = fieldId ? `${fieldId}-error` : undefined
  const helpId = fieldId ? `${fieldId}-help` : undefined
  const describedBy = [invalid ? errorId : undefined, help ? helpId : undefined].filter(Boolean).join(' ')

  return (
    <label style={fieldWrap} data-client-field={fieldKey} data-client-invalid={invalid ? 'true' : undefined}>
      <span style={labelStyle}>{label}{required ? <b> *</b> : null}</span>
      <textarea id={fieldId} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} rows={4} style={{ ...inputStyle, height: 88, resize: 'vertical' }} aria-invalid={invalid || undefined} aria-describedby={describedBy || undefined} />
      {invalid ? <small id={errorId} data-client-error-message="true" style={fieldErrorStyle}>{errorMessage || 'This field is required.'}</small> : null}
      {help ? <small id={helpId} style={helpStyle}>{help}</small> : null}
    </label>
  )
}

function SelectField({ fieldKey, label, value, onChange, placeholder, required, options, help, invalid, errorMessage }: FieldProps & { options: string[] }) {
  const fieldId = fieldKey ? `client-${fieldKey}-field` : undefined
  const errorId = fieldId ? `${fieldId}-error` : undefined
  const helpId = fieldId ? `${fieldId}-help` : undefined
  const describedBy = [invalid ? errorId : undefined, help ? helpId : undefined].filter(Boolean).join(' ')

  return (
    <label style={fieldWrap} data-client-field={fieldKey} data-client-invalid={invalid ? 'true' : undefined}>
      <span style={labelStyle}>{label}{required ? <b> *</b> : null}</span>
      <span style={{ position: 'relative' }}>
        <select id={fieldId} value={value} onChange={event => onChange(event.target.value)} style={{ ...inputStyle, appearance: 'none', paddingRight: 38 }} aria-invalid={invalid || undefined} aria-describedby={describedBy || undefined}>
          <option value="">{placeholder}</option>
          {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: 13, color: '#64748b', pointerEvents: 'none' }} />
      </span>
      {invalid ? <small id={errorId} data-client-error-message="true" style={fieldErrorStyle}>{errorMessage || 'This field is required.'}</small> : null}
      {help ? <small id={helpId} style={helpStyle}>{help}</small> : null}
    </label>
  )
}

function PhoneField({ value, onChange, invalid, errorMessage }: { value: string; onChange: (value: string) => void; invalid?: boolean; errorMessage?: string }) {
  return (
    <label style={fieldWrap} data-client-field="phone" data-client-invalid={invalid ? 'true' : undefined}>
      <span style={labelStyle}>Phone Number <b>*</b></span>
      <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr' }}>
        <div data-client-phone-prefix="true" style={{ ...inputStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0, display: 'grid', placeItems: 'center', fontWeight: 800 }}>PH +63</div>
        <input id="client-phone-field" value={value} onChange={event => onChange(event.target.value)} placeholder="Enter phone number" style={{ ...inputStyle, borderLeft: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }} aria-invalid={invalid || undefined} aria-describedby={invalid ? 'client-phone-field-error' : undefined} />
      </div>
      {invalid ? <small id="client-phone-field-error" data-client-error-message="true" style={fieldErrorStyle}>{errorMessage || 'Phone number is required.'}</small> : null}
    </label>
  )
}

interface FieldProps {
  fieldKey?: RequiredFieldKey
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  required?: boolean
  help?: string
  invalid?: boolean
  errorMessage?: string
}

function getMissingRequiredFields(formState: ClientFormState) {
  const missing: RequiredFieldKey[] = []
  const requireField = (key: RequiredFieldKey) => {
    if (!String(formState[key]).trim()) missing.push(key)
  }

  requireField('name')
  requireField('email')
  requireField('phone')
  requireField('accountManager')

  if (formState.clientType === 'Residential') {
    requireField('billingAddress')
    requireField('residentialPropertyType')
    requireField('projectInterest')
  } else {
    requireField('industry')
    requireField('companyType')
  }

  return missing
}

function focusFirstMissingField(field: RequiredFieldKey) {
  window.requestAnimationFrame(() => {
    const wrapper = document.querySelector<HTMLElement>(`[data-client-field="${field}"]`)
    const control = wrapper?.querySelector<HTMLElement>('input, select, textarea')

    wrapper?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    control?.focus({ preventScroll: true })
  })
}

function errorDetail(error: unknown) {
  return error instanceof Error ? error.message.trim() : ''
}

function photoUploadErrorMessage(error: unknown) {
  const detail = errorDetail(error)
  return detail ? `Could not upload this client photo. ${detail}` : 'Could not upload this client photo. Please try another image.'
}

function clientSaveErrorMessage(error: unknown) {
  const detail = errorDetail(error)
  return detail ? `The client could not be saved. ${detail}` : 'The client could not be saved. Please check the form and try again.'
}

function getPhotoInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'CL'
}

const formPage = { fontFamily: font, display: 'grid', gap: 24, color: 'var(--foreground)', padding: 'var(--space-page)' }
const pageHeader = { display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' as const, marginBottom: 10 }
const breadcrumb = { display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'var(--foreground)', fontWeight: 500, marginBottom: 24 }
const breadcrumbLink = { color: 'var(--muted-foreground)', textDecoration: 'none' }
const crumbChevron = { color: 'var(--muted-foreground)', transform: 'rotate(-90deg)' }
const h1 = { margin: 0, fontSize: 31, lineHeight: 1.1, color: 'var(--foreground)', fontWeight: 600, letterSpacing: 0 }
const subtitle = { margin: '10px 0 0', color: '#d4d4d8', fontSize: 14, fontWeight: 400 }
const primaryButton = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, minWidth: 176, padding: '0 18px', borderRadius: 8, border: '1px solid var(--foreground)', background: 'var(--foreground)', color: 'var(--background)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }
const secondaryLink = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 42, minWidth: 128, padding: '0 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.012)', color: 'var(--foreground)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }
const sectionStyle = { background: 'linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.008))', border: '1px solid var(--border)', borderRadius: 8, padding: 18, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)' }
const sectionTitle = { margin: '0 0 26px', color: 'var(--foreground)', fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 12 }
const sectionIcon = { width: 22, height: 22, display: 'inline-grid', placeItems: 'center', color: 'var(--foreground)' }
const photoFieldWrap = { display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 16, alignItems: 'center', padding: 14, border: '1px solid var(--border)', borderRadius: 8, background: 'rgba(255,255,255,0.012)' }
const photoPreview = (photo: string) => ({
  width: 76,
  height: 76,
  borderRadius: 14,
  border: '1px solid var(--border)',
  backgroundColor: photo ? '#f8fafc' : '#ecfdf5',
  backgroundImage: photo ? `url(${photo})` : undefined,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  color: '#0f9f52',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 22,
  fontWeight: 800,
  overflow: 'hidden',
})
const photoCopy = { display: 'grid', gap: 7, minWidth: 0 }
const photoActions = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const, marginTop: 2 }
const photoUploadButton = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 36, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#ffffff', color: '#0f172a', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const photoRemoveButton = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 36, padding: '0 11px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff1f2', color: '#be123c', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const clientTypeFieldWrap = { maxWidth: 440 }
const manualManagerRow = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'center' }
const manualManagerButton = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 40, padding: '0 13px', borderRadius: 8, border: '1px solid #0f9f52', background: '#0f9f52', color: '#ffffff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const formGrid = { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(150px, 1fr))', gap: 22 }
const formGridResidential = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))', gap: 22 }
const formGrid3 = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))', gap: 24 }
const twoColumnGrid = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24 }
const fieldWrap = { display: 'grid', gap: 8, minWidth: 0 }
const labelStyle = { color: '#d4d4d8', fontSize: 13, fontWeight: 500 }
const inputStyle = { width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', background: 'rgba(0,0,0,0.22)', color: 'var(--foreground)', fontSize: 13, fontFamily: font, outline: 'none', boxSizing: 'border-box' as const }
const helpStyle = { color: 'var(--muted-foreground)', fontSize: 12, fontWeight: 400 }
const fieldErrorStyle = { color: '#fca5a5', fontSize: 12, fontWeight: 700 }
const errorBox = { border: '1px solid #7f1d1d', background: 'rgba(127,29,29,0.16)', color: '#fecaca', borderRadius: 8, padding: '12px 14px', fontSize: 13, fontWeight: 500 }
const checkboxRow = { minHeight: 54, display: 'flex', gap: 12, alignItems: 'center', color: 'var(--foreground)', fontSize: 13, fontWeight: 500, border: '1px solid var(--border)', borderRadius: 8, background: 'rgba(255,255,255,0.012)', padding: '12px 18px' }
