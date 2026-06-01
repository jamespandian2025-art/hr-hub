const defaultAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

export function secureRandomString(length: number, alphabet = defaultAlphabet) {
  if (!Number.isSafeInteger(length) || length < 1) return ''
  if (!alphabet) throw new Error('Alphabet is required.')

  const values = new Uint32Array(length)
  globalThis.crypto.getRandomValues(values)
  return Array.from(values, value => alphabet[value % alphabet.length]).join('')
}

export function secureId(prefix: string, length = 10) {
  return `${prefix}_${Date.now()}_${secureRandomString(length)}`
}

export function secureNumericId() {
  const values = new Uint32Array(1)
  globalThis.crypto.getRandomValues(values)
  return Date.now() * 1000 + (values[0] % 1000)
}
