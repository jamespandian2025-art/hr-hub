const encoder = new TextEncoder()

export function constantTimeEqual(left: string | null | undefined, right: string | null | undefined) {
  const leftBytes = encoder.encode(left || '')
  const rightBytes = encoder.encode(right || '')
  const length = Math.max(leftBytes.length, rightBytes.length)
  let diff = leftBytes.length ^ rightBytes.length

  for (let index = 0; index < length; index += 1) {
    diff |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0)
  }

  return diff === 0
}
