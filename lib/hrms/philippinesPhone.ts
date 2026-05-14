export const philippineMobilePlaceholder = '+63 917 123 4567'

function mobileDigits(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('639')) return digits.slice(2, 12)
  if (digits.startsWith('09')) return digits.slice(1, 11)
  if (digits.startsWith('9')) return digits.slice(0, 10)
  if (digits.startsWith('63')) return digits.slice(2, 12)
  if (digits.startsWith('0')) return digits.slice(1, 11)
  return digits.slice(0, 10)
}

export function formatPhilippineMobileNumber(value: string) {
  const digits = mobileDigits(value)
  if (!digits) return ''

  const first = digits.slice(0, 3)
  const second = digits.slice(3, 6)
  const third = digits.slice(6, 10)

  return [`+63 ${first}`, second, third].filter(Boolean).join(' ')
}

export function isValidPhilippineMobileNumber(value: string) {
  return /^9\d{9}$/.test(mobileDigits(value))
}
