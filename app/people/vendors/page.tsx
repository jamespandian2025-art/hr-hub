'use client'
import { useState, useEffect } from 'react'

const font = "'DM Sans', sans-serif"

const vendors = [
  {
    id: 1,
    name: 'ABC Supplies',
    email: 'abc@supplier.com',
    contact: '09123456789',
    transactions: 5,
    cost: '₱25,000',
    color: '#6c63ff',
  },
  {
    id: 2,
    name: 'BuildPro Materials',
    email: 'buildpro@gmail.com',
    contact: '09987654321',
    transactions: 3,
    cost: '₱12,500',
    color: '#10b981',
  },
]

export default function VendorsPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [activeMenu, setActiveMenu] = useState<number | null>(null)

  // ✅ close dropdown
  useEffect(() => {
    const handleClick = () => setActiveMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const filtered = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.email.toLowerCase().includes(search.toLowerCase())
  )

  const toggleSelect = (id: number) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const menuItem = {
    padding: '10px 14px',
    fontSize: '13px',
    cursor: 'pointer',
    borderBottom: '1px solid #f3f4f6',
  }

  return (
    <div style={{ fontFamily: font }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontSize: '24px', fontWeight: 600 }}>Vendors</div>
        <button style={{
          padding: '10px 20px',
          background: '#111827',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          fontWeight: 600,
          cursor: 'pointer'
        }}>
          + Vendor
        </button>
      </div>

      {/* Breadcrumb */}
      <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '24px' }}>
        <span style={{ color: '#6c63ff', fontWeight: 500 }}>Vendors</span> • List
      </div>

      {/* Card */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>

        {/* Search */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f3f4f6' }}>
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              outline: 'none'
            }}
          />
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ padding: '12px 24px' }}></th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>Vendor</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>Contact</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>Email</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>Transactions</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>Total Cost</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filtered.map(vendor => (
              <tr key={vendor.id} style={{ borderTop: '1px solid #f3f4f6' }}>

                {/* Checkbox */}
                <td style={{ padding: '16px 24px' }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(vendor.id)}
                    onChange={() => toggleSelect(vendor.id)}
                  />
                </td>

                {/* Vendor Name */}
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: vendor.color,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600
                    }}>
                      {vendor.name.charAt(0)}
                    </div>
                    {vendor.name}
                  </div>
                </td>

                <td style={{ padding: '16px' }}>{vendor.contact}</td>
                <td style={{ padding: '16px' }}>{vendor.email}</td>

                <td style={{ padding: '16px', textAlign: 'center', fontWeight: 600 }}>
                  {vendor.transactions}
                </td>

                <td style={{ padding: '16px', fontWeight: 600 }}>
                  {vendor.cost}
                </td>

                {/* Dropdown */}
                <td style={{ padding: '16px', position: 'relative' }}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveMenu(activeMenu === vendor.id ? null : vendor.id)
                    }}
                    style={{ cursor: 'pointer', fontSize: '18px', color: '#9ca3af' }}
                  >
                    ⋮
                  </div>

                  {activeMenu === vendor.id && (
                    <div style={{
                      position: 'absolute',
                      right: '16px',
                      top: '40px',
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px',
                      width: '140px',
                      boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
                      overflow: 'hidden'
                    }}>
                      <div style={menuItem} onClick={() => { console.log('View', vendor.id); setActiveMenu(null) }}>View</div>
                      <div style={menuItem} onClick={() => { console.log('Edit', vendor.id); setActiveMenu(null) }}>Edit</div>
                      <div style={{ ...menuItem, color: '#ef4444', borderBottom: 'none' }} onClick={() => { console.log('Delete', vendor.id); setActiveMenu(null) }}>Delete</div>
                    </div>
                  )}
                </td>

              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', fontSize: '13px', color: '#6b7280' }}>
          {filtered.length} vendors
        </div>
      </div>
    </div>
  )
}