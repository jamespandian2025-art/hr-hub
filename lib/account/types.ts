export type AccountView =
  | 'my-account'
  | 'account-security'
  | 'applications'
  | 'users'
  | 'guests'
  | 'user-groups'
  | 'general-info'
  | 'offices'
  | 'admin-roles'
  | 'customizations'
  | 'system-settings'

export type AccountStatus = 'Active' | 'Pending' | 'Deactivated'

export type AccountViewer = {
  id: string
  name: string
  email: string
  role: string
  provider?: string
  canManageAccount: boolean
}

export type AccountCompany = {
  id: string
  name: string
  type: string
  path: string
  status: AccountStatus
  introduction: string
  address: string
  phone: string
  website: string
  userLimit: number
  createdAt: string
  settings: {
    currency: string
    timezone: string
    fiscalYearStart: string
    language: string
    dateFormat: string
  }
}

export type AccountPerson = {
  id: string
  name: string
  role: string
  username: string
  email: string
  phone: string
  manager: string
  office: string
  joinedAt: string
  status: AccountStatus
  owner: boolean
  online: boolean
  type: 'member' | 'guest'
  expiresAt?: string
}

export type AccountGroup = {
  id: string
  name: string
  description: string
  status: AccountStatus
  memberIds: string[]
  createdAt: string
}

export type AccountApplication = {
  id: string
  name: string
  detail: string
  category: string
  plan: string
  enabled: boolean
  restricted: boolean
  visibleByDefault: boolean
  icon: string
}

export type AccountOffice = {
  id: string
  name: string
  detail: string
  location: string
  userIds: string[]
  status: AccountStatus
  createdAt: string
}

export type AccountAdminRole = {
  id: string
  name: string
  description: string
  permissions: string[]
  userIds: string[]
  system: boolean
}

export type AccountSecuritySession = {
  id: string
  userId: string
  device: string
  ip: string
  method: string
  status: 'Active' | 'Revoked'
  createdAt: string
}

export type AccountTrustedDevice = {
  id: string
  label: string
  lastSeenAt: string
  status: AccountStatus
}

export type AccountCustomizations = {
  brandColor: string
  logoUrl: string
  moduleVisibility: Record<string, boolean>
  profileFields: string[]
}

export type AccountSystemSettings = {
  timezone: string
  language: string
  dateFormat: string
  sessionTimeoutMinutes: number
  passwordMinLength: number
  requireTwoFactor: boolean
  invitationExpiryDays: number
  guestAccessEnabled: boolean
  emailSender: string
}

export type AccountWorkspace = {
  viewer: AccountViewer
  company: AccountCompany
  security: {
    twoFactorEnabled: boolean
    sessions: AccountSecuritySession[]
    devices: AccountTrustedDevice[]
  }
  users: AccountPerson[]
  guests: AccountPerson[]
  groups: AccountGroup[]
  applications: AccountApplication[]
  offices: AccountOffice[]
  adminRoles: AccountAdminRole[]
  customizations: AccountCustomizations
  systemSettings: AccountSystemSettings
  updatedAt: string
}

export type AccountMutationAction =
  | 'update-company'
  | 'update-profile'
  | 'set-two-factor'
  | 'revoke-session'
  | 'create-user'
  | 'create-guest'
  | 'create-group'
  | 'create-office'
  | 'create-role'
  | 'update-application'
  | 'update-customizations'
  | 'update-system-settings'
