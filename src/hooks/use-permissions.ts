"use client";

import { useMemo } from "react";
import { useUserData } from "./use-user-data";
import type {
  User,
  UserRole,
  SystemPermission,
} from "@/lib/types";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isStaff,
  canAccessAdminPanel,
  getUserPermissions,
} from "@/lib/types";

/**
 * Hook for checking user permissions and roles
 * @returns Object with permission checking utilities
 */
export function usePermissions() {
  const { user, isLoading } = useUserData();

  const permissions = useMemo(() => {
    if (!user) return [];
    return getUserPermissions(user);
  }, [user]);

  const role = useMemo(() => {
    return user?.role || "user";
  }, [user]);

  const checkPermission = useMemo(() => {
    return (permission: SystemPermission) => {
      if (!user) return false;
      return hasPermission(user, permission);
    };
  }, [user]);

  const checkAnyPermission = useMemo(() => {
    return (permissionList: SystemPermission[]) => {
      if (!user) return false;
      return hasAnyPermission(user, permissionList);
    };
  }, [user]);

  const checkAllPermissions = useMemo(() => {
    return (permissionList: SystemPermission[]) => {
      if (!user) return false;
      return hasAllPermissions(user, permissionList);
    };
  }, [user]);

  const checkRole = useMemo(() => {
    return (targetRole: UserRole) => {
      if (!user) return false;
      return user.role === targetRole;
    };
  }, [user]);

  const checkAnyRole = useMemo(() => {
    return (roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    };
  }, [user]);

  const isStaffMember = useMemo(() => {
    if (!user) return false;
    return isStaff(user);
  }, [user]);

  const canAccessAdmin = useMemo(() => {
    if (!user) return false;
    return canAccessAdminPanel(user);
  }, [user]);

  const isAccountActive = useMemo(() => {
    if (!user) return false;
    return user.accountStatus === "active";
  }, [user]);

  return {
    // User data
    user,
    role,
    permissions,
    isAuthenticated: !!user,
    isAccountActive,
    isLoading,

    // Role checks
    isUser: checkRole("user"),
    isSupport: checkRole("support"),
    isModerator: checkRole("moderator"),
    isDeveloper: checkRole("developer"),
    isAdmin: checkRole("admin"),
    isSuperAdmin: checkRole("super_admin"),
    isStaff: isStaffMember,
    canAccessAdmin,

    // Permission checks
    can: checkPermission,
    canAny: checkAnyPermission,
    canAll: checkAllPermissions,
    hasRole: checkRole,
    hasAnyRole: checkAnyRole,
  };
}

/**
 * Hook for checking a specific permission
 * @param permission - The permission to check
 * @returns Boolean indicating if user has the permission
 */
export function usePermission(permission: SystemPermission): boolean {
  const { can } = usePermissions();
  return can(permission);
}

/**
 * Hook for checking if user has specific role
 * @param role - The role to check
 * @returns Boolean indicating if user has the role
 */
export function useRole(role: UserRole): boolean {
  const { hasRole } = usePermissions();
  return hasRole(role);
}

/**
 * Hook for checking if user is staff
 * @returns Boolean indicating if user is staff
 */
export function useIsStaff(): boolean {
  const { isStaff } = usePermissions();
  return isStaff;
}

/**
 * Hook for checking if user can access admin panel
 * @returns Boolean indicating if user can access admin
 */
export function useCanAccessAdmin(): boolean {
  const { canAccessAdmin } = usePermissions();
  return canAccessAdmin;
}
