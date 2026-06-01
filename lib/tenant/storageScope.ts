'use client'

/**
 * Company-scoped localStorage shim.
 *
 * Most of the app reads/writes plain localStorage keys (e.g.
 * "flowsys-hr-employees"), which means every workspace sees the same data.
 * Patching every call site would be hundreds of edits and easy to miss.
 *
 * Instead we intercept `localStorage.getItem` / `setItem` / `removeItem` on
 * the live Storage instance and route them to a per-company namespace:
 *
 *     "flowsys-hr-employees"  ->  "flowsys-hr-employees:<activeCompanyId>"
 *
 * System keys (auth session, company list, theme, sidebar pref, etc.) and
 * keys that already look scoped (contain `:`) bypass the rewrite so the
 * shim composes cleanly with the existing `companyScopedKey` callers.
 *
 * On first install we migrate any existing unscoped values into the
 * currently-active company's namespace, so the workspace the user has
 * been using keeps all its data and other workspaces start clean.
 *
 * After install, switching the active company makes every subsequent read
 * pull from the new namespace; the caller is responsible for triggering a
 * reload (see `setActiveCompanyId`) so any mounted component re-fetches.
 */

const SYSTEM_KEYS = new Set<string>([
  // Tenant infrastructure
  'wiseflow-companies',
  'wiseflow-active-company-id',
  // Auth / account (user-level, not company-level)
  'flowsys-account',
  'flowsys-auth-session',
  // UI preferences (user-level)
  'wf-sidebar-collapsed',
  'wiseflow-theme',
  'wiseflow-theme-preference',
])

// Anything starting with one of these prefixes is treated as a system key
// and is never scoped (Supabase auth, Next.js internals, our own scope
// flags, and existing one-off scoped keys callers already maintain).
const SYSTEM_PREFIXES = ['sb-', 'next-', 'wiseflow-storage-']

let installed = false

function shouldScope(key: string): boolean {
  if (SYSTEM_KEYS.has(key)) return false
  if (SYSTEM_PREFIXES.some(prefix => key.startsWith(prefix))) return false
  // Keys that already embed a `:` are assumed to be scoped (or structured)
  // and are left alone. This is how the existing `companyScopedKey`
  // helper composes with the shim safely.
  if (key.includes(':')) return false
  return true
}

function buildScopedKey(key: string, companyId: string): string {
  return companyId ? `${key}:${companyId}` : key
}

function migrateLegacyData(
  native: Storage,
  origGet: (k: string) => string | null,
  origSet: (k: string, v: string) => void,
  origRemove: (k: string) => void,
  companyId: string,
) {
  if (!companyId) return
  const flag = `wiseflow-storage-migrated:${companyId}`
  if (origGet(flag)) return

  const legacyKeys: string[] = []
  for (let i = 0; i < native.length; i += 1) {
    const k = native.key(i)
    if (!k) continue
    if (!shouldScope(k)) continue
    legacyKeys.push(k)
  }

  for (const k of legacyKeys) {
    const value = origGet(k)
    if (value === null) continue
    const target = buildScopedKey(k, companyId)
    // Don't clobber an existing scoped value for this company.
    if (origGet(target) !== null) continue
    origSet(target, value)
    origRemove(k)
  }

  origSet(flag, '1')
}

export function installCompanyScopedStorage(): void {
  if (typeof window === 'undefined') return
  if (installed) return
  installed = true

  const native = window.localStorage

  // Bind the originals against the Storage prototype so our patched
  // methods can still reach the un-patched behavior.
  const origGet = Storage.prototype.getItem.bind(native)
  const origSet = Storage.prototype.setItem.bind(native)
  const origRemove = Storage.prototype.removeItem.bind(native)

  // Migrate before patching so the migration reads/writes plain keys.
  const bootCompanyId = origGet('wiseflow-active-company-id') || ''
  if (bootCompanyId) {
    try {
      migrateLegacyData(native, origGet, origSet, origRemove, bootCompanyId)
    } catch {
      // If migration fails (quota, malformed entry, etc.) we still want
      // the shim to install so subsequent reads/writes are scoped.
    }
  }

  Object.defineProperty(native, 'getItem', {
    configurable: true,
    writable: true,
    value(key: string) {
      if (!shouldScope(key)) return origGet(key)
      const id = origGet('wiseflow-active-company-id') || ''
      if (!id) return origGet(key)
      return origGet(buildScopedKey(key, id))
    },
  })

  Object.defineProperty(native, 'setItem', {
    configurable: true,
    writable: true,
    value(key: string, value: string) {
      if (!shouldScope(key)) return origSet(key, value)
      const id = origGet('wiseflow-active-company-id') || ''
      if (!id) return origSet(key, value)
      // Lazy migration: if this workspace was created/joined after boot,
      // migrate the moment it first writes anything.
      try { migrateLegacyData(native, origGet, origSet, origRemove, id) } catch {}
      return origSet(buildScopedKey(key, id), value)
    },
  })

  Object.defineProperty(native, 'removeItem', {
    configurable: true,
    writable: true,
    value(key: string) {
      if (!shouldScope(key)) return origRemove(key)
      const id = origGet('wiseflow-active-company-id') || ''
      if (!id) return origRemove(key)
      return origRemove(buildScopedKey(key, id))
    },
  })
}

// Auto-install on import in the browser so any client module that
// imports this file gets the shim before its own effects run.
if (typeof window !== 'undefined') {
  installCompanyScopedStorage()
}
