import { constantTimeEqual } from './constantTime'

export type PasswordAlgorithm = 'pbkdf2-sha256'

export type PasswordHashFields = {
  passwordHash?: string
  passwordSalt?: string
  passwordAlgorithm?: PasswordAlgorithm
  passwordUpdatedAt?: string
}

export type PortalPasswordHashFields = {
  portalPasswordHash?: string
  portalPasswordSalt?: string
  portalPasswordAlgorithm?: PasswordAlgorithm
  portalPasswordUpdatedAt?: string
}

function cryptoApi() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues) {
    throw new Error('Secure password hashing is not available in this runtime.')
  }
  return globalThis.crypto
}

export function createPasswordSalt() {
  const values = new Uint8Array(16)
  cryptoApi().getRandomValues(values)
  return Array.from(values, value => value.toString(16).padStart(2, '0')).join('')
}

async function sha256(value: string) {
  const digest = await cryptoApi().subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('')
}

async function pbkdf2(password: string, salt: string) {
  const key = await cryptoApi().subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await cryptoApi().subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(salt),
      iterations: 210000,
    },
    key,
    256,
  )
  return Array.from(new Uint8Array(bits), value => value.toString(16).padStart(2, '0')).join('')
}

export async function createPasswordFields(password: string, salt = createPasswordSalt()): Promise<Required<PasswordHashFields>> {
  return {
    passwordHash: await pbkdf2(password, salt),
    passwordSalt: salt,
    passwordAlgorithm: 'pbkdf2-sha256',
    passwordUpdatedAt: new Date().toISOString(),
  }
}

export async function verifyPasswordHash(fields: PasswordHashFields, password: string, legacyPlainPassword?: string) {
  if (fields.passwordHash && fields.passwordSalt) {
    if (fields.passwordAlgorithm === 'pbkdf2-sha256') {
      return constantTimeEqual(await pbkdf2(password, fields.passwordSalt), fields.passwordHash)
    }
    return constantTimeEqual(await sha256(`${fields.passwordSalt}:${password}`), fields.passwordHash)
  }

  return Boolean(legacyPlainPassword) && constantTimeEqual(legacyPlainPassword, password)
}

export function normalizePortalPassword(value: unknown) {
  if (value === null || value === undefined) return ''
  const raw = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : ''
  return raw
    .replace(/Ã¢â‚¬[\u0090\u0091\u0092\u0093\u0094]/g, '-')
    .replace(/Ã¢Ë†â€™/g, '-')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .trim()
}

export function portalPasswordFingerprint(value: unknown) {
  return normalizePortalPassword(value).replace(/[^a-z0-9]/gi, '').toLowerCase()
}

export async function createPortalPasswordFields(password: string): Promise<Required<PortalPasswordHashFields>> {
  const fields = await createPasswordFields(portalPasswordFingerprint(password))
  return {
    portalPasswordHash: fields.passwordHash,
    portalPasswordSalt: fields.passwordSalt,
    portalPasswordAlgorithm: fields.passwordAlgorithm,
    portalPasswordUpdatedAt: fields.passwordUpdatedAt,
  }
}

export async function verifyPortalPassword(fields: PortalPasswordHashFields & { portalPassword?: string }, password: string) {
  return verifyPasswordHash(
    {
      passwordHash: fields.portalPasswordHash,
      passwordSalt: fields.portalPasswordSalt,
      passwordAlgorithm: fields.portalPasswordAlgorithm,
      passwordUpdatedAt: fields.portalPasswordUpdatedAt,
    },
    portalPasswordFingerprint(password),
    portalPasswordFingerprint(fields.portalPassword),
  )
}
