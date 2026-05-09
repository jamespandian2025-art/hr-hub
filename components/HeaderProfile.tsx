'use client'
import { useState } from 'react'
import ProfileDropdown from './ProfileDropdown'

export default function HeaderProfile() {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: '#e5e7eb',
          cursor: 'pointer'
        }}
      />

      {open && (
        <div style={{
          position: 'absolute',
          top: '48px',
          right: 0
        }}>
          <ProfileDropdown />
        </div>
      )}
    </div>
  )
}