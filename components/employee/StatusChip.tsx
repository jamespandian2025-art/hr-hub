import type { CSSProperties } from 'react'

// Shared status pill for the employee portal (and reusable elsewhere).
// One canonical status->tone map so Paid/Approved/Pending/Rejected/etc. look
// identical on every page, instead of each page re-inventing its own colors.
type Tone = 'green' | 'amber' | 'red' | 'blue' | 'neutral'

const TONES: Record<Tone, { bg: string; color: string }> = {
  green: { bg: '#dcfce7', color: '#15803d' },
  amber: { bg: '#fef3c7', color: '#b45309' },
  red: { bg: '#fee2e2', color: '#dc2626' },
  blue: { bg: '#dbeafe', color: '#1d4ed8' },
  neutral: { bg: '#f1f5f9', color: '#000000' },
}

function toneFor(value: string): Tone {
  const v = value.toLowerCase().trim()
  // Word boundaries on the ambiguous ones: \bpaid\b avoids matching "unpaid",
  // \bactive\b avoids matching "inactive".
  if (/(\bapproved\b|\bactive\b|\bpaid\b|processed|complete|released|present|cleared|accepted|granted)/.test(v)) return 'green'
  if (/(rejected|declined|cancel|overdue|failed|void|absent|inactive|expired)/.test(v)) return 'red'
  if (/(pending|processing|awaiting|review|submitted|partial|on leave|late|hold|unpaid)/.test(v)) return 'amber'
  return 'neutral'
}

export default function StatusChip({ value, style }: { value?: string; style?: CSSProperties }) {
  const label = (value || '').trim() || '—'
  const tone = TONES[toneFor(label)]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        padding: '4px 10px',
        fontSize: 12,
        fontWeight: 800,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        background: tone.bg,
        color: tone.color,
        ...style,
      }}
    >
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', opacity: 0.75 }} />
      {label}
    </span>
  )
}
