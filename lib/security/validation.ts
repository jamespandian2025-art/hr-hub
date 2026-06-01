export type FieldRule = {
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'date' | 'array'
  maxLength?: number
  min?: number
  max?: number
  allowed?: readonly string[]
}

const unsafeTextPattern = /<\s*script|javascript:|on\w+\s*=/i

export function cleanText(input: unknown, maxLength = 500) {
  if (typeof input !== 'string') return ''
  return input.replace(/\p{C}/gu, '').trim().slice(0, maxLength)
}

function validDate(input: unknown) {
  if (typeof input !== 'string') return false
  const value = input.includes('T') ? input : `${input}T00:00:00`
  return !Number.isNaN(new Date(value).getTime())
}

export function validateObject(input: Record<string, unknown>, rules: Record<string, FieldRule>) {
  const errors: string[] = []
  const output: Record<string, unknown> = { ...input }

  for (const [field, value] of Object.entries(input)) {
    if (typeof value !== 'string') continue
    const cleaned = cleanText(value)
    if (unsafeTextPattern.test(cleaned)) errors.push(`${field} contains unsafe text.`)
    output[field] = cleaned
  }

  for (const [field, rule] of Object.entries(rules)) {
    const value = input[field]
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required.`)
      continue
    }
    if (value === undefined || value === null || value === '') continue

    if (rule.type === 'string') {
      if (typeof value !== 'string') {
        errors.push(`${field} must be text.`)
        continue
      }
      const cleaned = cleanText(value, rule.maxLength)
      if (unsafeTextPattern.test(cleaned)) errors.push(`${field} contains unsafe text.`)
      if (rule.allowed && !rule.allowed.includes(cleaned)) errors.push(`${field} is not an allowed value.`)
      output[field] = cleaned
    }
    if (rule.type === 'number') {
      const number = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(number)) {
        errors.push(`${field} must be a number.`)
        continue
      }
      if (rule.min !== undefined && number < rule.min) errors.push(`${field} is below the minimum.`)
      if (rule.max !== undefined && number > rule.max) errors.push(`${field} is above the maximum.`)
      output[field] = number
    }
    if (rule.type === 'boolean' && typeof value !== 'boolean') errors.push(`${field} must be true or false.`)
    if (rule.type === 'date' && !validDate(value)) errors.push(`${field} must be a valid date.`)
    if (rule.type === 'array' && !Array.isArray(value)) errors.push(`${field} must be a list.`)
  }

  return { ok: errors.length === 0, errors, value: output }
}

export function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
