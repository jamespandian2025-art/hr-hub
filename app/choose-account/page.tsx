'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Building2, Check, ChevronDown, LogOut, Plus, UserRound } from 'lucide-react'
import { accountKey, type AccountRole, sessionKey } from '@/lib/auth/localAuth'
import { logoutUser } from '@/lib/auth/logout'
import {
  companyChangeEvent,
  ensureDefaultCompany,
  getActiveCompany,
  loadAccessibleCompanies,
  setActiveCompanyId,
  type CompanyRecord,
} from '@/lib/tenant/company'

type AccountSnapshot = {
  company?: string
  email?: string
  fullName?: string
  name?: string
  role?: AccountRole
  username?: string
}

type ChooseAccountState = {
  account: AccountSnapshot | null
  activeCompanyId: string
  companies: CompanyRecord[]
}

export default function ChooseAccountPage() {
  const router = useRouter()
  const [accountState, setAccountState] = useState<ChooseAccountState>(readChooseAccountState)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!accountState.account) {
      router.replace('/login')
      return
    }

    const syncCompanyState = () => {
      setAccountState(readChooseAccountState())
    }

    window.addEventListener(companyChangeEvent, syncCompanyState)
    window.addEventListener('storage', syncCompanyState)
    return () => {
      window.removeEventListener(companyChangeEvent, syncCompanyState)
      window.removeEventListener('storage', syncCompanyState)
    }
  }, [accountState.account, router])

  const { account, activeCompanyId, companies } = accountState

  const displayName = account?.fullName || account?.name || account?.email?.split('@')[0] || 'WiseFlow User'
  const displayEmail = account?.email || 'signed-in account'
  const activeCompany = useMemo(
    () => companies.find(company => company.id === activeCompanyId) || companies[0],
    [activeCompanyId, companies],
  )
  const initials = useMemo(() => makeInitials(displayName), [displayName])

  function continueWith(companyId = activeCompany?.id) {
    if (!companyId) return
    const selected = setActiveCompanyId(companyId)
    if (!selected) return
    setAccountState(readChooseAccountState())
    router.replace(routeForRole(account?.role))
  }

  async function handleAddAccount() {
    await logoutUser()
    router.replace('/login')
  }

  async function handleLogoutAll() {
    await logoutUser()
    router.replace('/login')
  }

  return (
    <main className="choose-account-screen">
      <style>{chooseAccountCss}</style>
      <section className="choose-account-card" aria-label="Choose an account">
        <div className="choose-brand">
          <span aria-hidden="true">W</span>
        </div>

        <h1>Choose an account</h1>

        <div className="account-row primary-row">
          <span className="account-avatar" aria-hidden="true">
            {initials}
          </span>
          <button type="button" className="account-main" onClick={() => continueWith()}>
            <strong>{displayName}</strong>
            <small>{displayEmail}{account?.username ? ` - @${account.username}` : ''}</small>
            <small>Standard account in {activeCompany?.name || account?.company || 'WiseFlow Company'}</small>
          </button>
          <div className="continue-menu">
            <button type="button" className="continue-button" onClick={() => continueWith()}>
              Continue
            </button>
            <button
              type="button"
              className="menu-toggle"
              aria-label="Show companies"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(value => !value)}
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="company-list" aria-label="Company switcher">
            {companies.map(company => {
              const isActive = company.id === activeCompanyId
              return (
                <button
                  key={company.id}
                  type="button"
                  className={isActive ? 'company-option active' : 'company-option'}
                  onClick={() => continueWith(company.id)}
                >
                  <span className="company-icon" aria-hidden="true"><Building2 size={17} /></span>
                  <span>
                    <strong>{company.name}</strong>
                    <small>{company.type}</small>
                  </span>
                  {isActive ? <Check size={18} /> : <ArrowRight size={17} />}
                </button>
              )
            })}
          </div>
        )}

        <button type="button" className="action-row" onClick={handleAddAccount}>
          <span className="dashed-icon" aria-hidden="true"><Plus size={20} /></span>
          <span>Add another account</span>
          <ArrowRight size={20} />
        </button>

        <button type="button" className="logout-all" onClick={handleLogoutAll}>
          <LogOut size={15} />
          Logout from all accounts
        </button>
      </section>
    </main>
  )
}

function routeForRole(role?: AccountRole) {
  if (role === 'Client') return '/client-portal'
  if (role === 'Finance') return '/financials/loan-management'
  if (role === 'HR') return '/hr/overview'
  if (role === 'Employee' || role === 'Team Manager') return '/employee/dashboard'
  return '/dashboard'
}

function readChooseAccountState(): ChooseAccountState {
  const session = readJson<AccountSnapshot>(sessionKey)
  const storedAccount = readJson<AccountSnapshot>(accountKey)
  if (!session && !storedAccount) {
    return { account: null, activeCompanyId: '', companies: [] }
  }

  const account = { ...session, ...storedAccount }
  const active = ensureDefaultCompany(account)
  return {
    account,
    activeCompanyId: getActiveCompany()?.id || active.id,
    companies: loadAccessibleCompanies(account),
  }
}

function makeInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || <UserRound size={18} />
}

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) as T : null
  } catch {
    return null
  }
}

const chooseAccountCss = `
.choose-account-screen {
  min-height: 100vh;
  background: #eeeeee;
  color: #000;
  display: grid;
  place-items: center;
  padding: 40px 18px;
  font-family: var(--font-body), Arial, sans-serif;
}

.choose-account-screen * {
  box-sizing: border-box;
}

.choose-account-card {
  width: min(580px, 100%);
  min-height: 426px;
  background: #fff;
  border: 1px solid #d8d8d8;
  border-radius: 3px;
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.08);
  padding: 42px 40px 36px;
}

.choose-brand {
  display: flex;
  justify-content: center;
  margin-bottom: 22px;
}

.choose-brand span {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  background: #000;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0;
}

.choose-account-card h1 {
  margin: 0 0 34px;
  color: #000;
  font-size: 22px;
  font-weight: 900;
  line-height: 1.2;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0;
}

.account-row,
.action-row {
  border-top: 1px solid #e7e7e7;
}

.primary-row {
  min-height: 96px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 18px 0;
}

.account-avatar {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: #9c9cf3;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 850;
}

.account-main {
  border: 0;
  background: transparent;
  color: #000;
  display: grid;
  gap: 5px;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.account-main strong,
.company-option strong {
  color: #000;
  font-size: 14px;
  font-weight: 850;
}

.account-main small,
.company-option small {
  color: #697386;
  font-size: 12px;
  line-height: 1.2;
}

.continue-menu {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.continue-button,
.menu-toggle {
  border: 0;
  background: transparent;
  color: #000;
  min-height: 32px;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.continue-button {
  padding: 0 8px;
}

.menu-toggle {
  width: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.company-list {
  border-top: 1px solid #e7e7e7;
  padding: 8px 0;
}

.company-option {
  width: 100%;
  min-height: 58px;
  border: 1px solid transparent;
  background: #fff;
  color: #000;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 22px;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;
  text-align: left;
  cursor: pointer;
}

.company-option + .company-option {
  margin-top: 6px;
}

.company-option.active {
  background: #eefaf3;
  border-color: #9edcba;
}

.company-icon {
  width: 31px;
  height: 31px;
  border: 1px solid #d6d6d6;
  color: #111;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.company-option span:nth-child(2) {
  display: grid;
  gap: 4px;
}

.action-row {
  width: 100%;
  min-height: 72px;
  border-right: 0;
  border-bottom: 1px solid #e7e7e7;
  border-left: 0;
  background: transparent;
  color: #303642;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 24px;
  align-items: center;
  gap: 14px;
  padding: 0;
  text-align: left;
  font-size: 15px;
  cursor: pointer;
}

.dashed-icon {
  width: 34px;
  height: 34px;
  border: 1px dashed #aeb4bd;
  border-radius: 999px;
  color: #6b7280;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.logout-all {
  width: 100%;
  border: 0;
  background: transparent;
  color: #9aa0a6;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 26px;
  min-height: 32px;
  font-size: 12px;
  cursor: pointer;
}

button:hover {
  color: #000;
}

.company-option:hover,
.action-row:hover {
  background: #fafafa;
}

@media (max-width: 640px) {
  .choose-account-screen {
    align-items: start;
    padding-top: 28px;
  }

  .choose-account-card {
    padding: 32px 22px 28px;
  }

  .primary-row {
    grid-template-columns: 38px minmax(0, 1fr);
  }

  .continue-menu {
    grid-column: 2;
    justify-content: flex-start;
  }
}
`
