// src/utils/constants.js
export const ROLES = {
    ADMIN:           'admin',
    BUSINESS_OWNER:  'business_owner',
    MARKETING_STAFF: 'marketing_staff',
  };
  
  export const ROLE_LABELS = {
    admin:           'Admin',
    business_owner:  'Business Owner',
    marketing_staff: 'Marketing Staff',
  };
  
  export const ROLE_COLORS = {
    admin:           'text-purple-400 bg-purple-500/10 border-purple-500/20',
    business_owner:  'text-amber-400  bg-amber-500/10  border-amber-500/20',
    marketing_staff: 'text-sky-400    bg-sky-500/10    border-sky-500/20',
  };
  
  export const ROLE_DASHBOARDS = {
    admin:           '/dashboard/admin',
    business_owner:  '/dashboard/owner',
    marketing_staff: '/dashboard/staff',
  };
  
  export const STORAGE_KEYS = {
    ACCESS_TOKEN:  'lf_access_token',
    USER:          'lf_user',
    PENDING_EMAIL: 'lf_pending_email',
  };
  
  export const OTP_RESEND_COOLDOWN = 60; // seconds
  
