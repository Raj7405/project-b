// Public Routes
export const HOME_PATH = '/'
export const LOGIN_PATH = '/login'
export const REGISTRATION_PATH = '/registration'
export const DASHBOARD_PATH = '/dashboard'

// Income Routes
export const DIRECT_INCOME_PATH = '/direct-income'
export const LEVEL_INCOME_PATH = '/level-income'
export const POOL_INCOME_PATH = '/pool-income'

// Admin Routes
export const ADMIN_PATH = '/admin'
export const ADMIN_LOGIN_PATH = '/admin/login'
export const ADMIN_DASHBOARD_PATH = '/admin/dashboard'
export const ADMIN_MEMBERS_PATH = '/admin/members'
export const ADMIN_SLOTS_PATH = '/admin/slots'
export const ADMIN_LEVEL_INCOME_PATH = '/admin/level-income'
export const ADMIN_INCOME_REPORTS_PATH = '/admin/income-reports'

// Legacy/Alternative Routes (for backward compatibility)
export const REGISTER_PATH = '/register' // Alternative to /registration
export const RE_TOPUP_PATH = '/re-topup' // May be handled in dashboard
export const SIGNUP_PATH = '/signup' // Alternative to /registration

// User Routes (may not exist yet but referenced)
export const WALLET_PATH = '/wallet'
export const PROFILE_PATH = '/profile'
export const SETTINGS_PATH = '/settings'
export const LOGOUT_PATH = '/logout' // Usually handled programmatically

// Auth Routes (may not exist yet but referenced)
export const FORGOT_PASSWORD_PATH = '/forgot-password'
export const RESET_PASSWORD_PATH = '/reset-password'

// Legal/Info Routes (referenced in Footer)
export const TERMS_PATH = '/terms'
export const PRIVACY_PATH = '/privacy'
export const WHITEPAPER_PATH = '/whitepaper'

// Route Groups (for easier navigation)
export const PUBLIC_ROUTES = {
  HOME: HOME_PATH,
  LOGIN: LOGIN_PATH,
  REGISTRATION: REGISTRATION_PATH,
  DASHBOARD: DASHBOARD_PATH,
} as const

export const INCOME_ROUTES = {
  DIRECT: DIRECT_INCOME_PATH,
  LEVEL: LEVEL_INCOME_PATH,
  POOL: POOL_INCOME_PATH,
} as const

export const ADMIN_ROUTES = {
  BASE: ADMIN_PATH,
  LOGIN: ADMIN_LOGIN_PATH,
  DASHBOARD: ADMIN_DASHBOARD_PATH,
  MEMBERS: ADMIN_MEMBERS_PATH,
  SLOTS: ADMIN_SLOTS_PATH,
  LEVEL_INCOME: ADMIN_LEVEL_INCOME_PATH,
  INCOME_REPORTS: ADMIN_INCOME_REPORTS_PATH,
} as const