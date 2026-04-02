// src/utils/roleGuard.js
// Role-based access control helpers

import { ROLES, ROLE_DASHBOARDS } from './constants';

/** Check if a role is allowed to access a resource */
export function hasRole(userRoleName, allowedRoles = []) {
  if (!allowedRoles.length) return true;
  return allowedRoles.includes(userRoleName);
}

/** Get the dashboard redirect path for a given role */
export function getDashboardPath(roleName) {
  return ROLE_DASHBOARDS[roleName] || '/login';
}

/** Check if user can manage content (admin or marketing staff) */
export function canManageContent(roleName) {
  return [ROLES.ADMIN, ROLES.MARKETING_STAFF].includes(roleName);
}

/** Check if user can view analytics (admin or business owner) */
export function canViewAnalytics(roleName) {
  return [ROLES.ADMIN, ROLES.BUSINESS_OWNER].includes(roleName);
}

/** Check if user is admin */
export function isAdmin(roleName) {
  return roleName === ROLES.ADMIN;
}
