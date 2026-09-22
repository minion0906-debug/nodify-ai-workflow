"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePermissions } from "@/hooks";
import type { SystemPermission, UserRole } from "@/lib/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireRole?: UserRole | UserRole[];
  requirePermission?: SystemPermission | SystemPermission[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Component to protect routes based on authentication, roles, and permissions
 * Redirects or shows fallback if user doesn't have required access
 */
export function ProtectedRoute({
  children,
  requireAuth = true,
  requireAdmin = false,
  requireRole,
  requirePermission,
  fallback,
  redirectTo,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);
  const {
    isAuthenticated,
    isLoading,
    canAccessAdmin,
    hasRole,
    hasAnyRole,
    can,
    canAny,
  } = usePermissions();

  // Memoize role check result
  const hasRequiredRole = useMemo(() => {
    if (!requireRole) return true;
    const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
    return hasAnyRole(roles);
  }, [requireRole, hasAnyRole]);

  // Memoize permission check result
  const hasRequiredPermission = useMemo(() => {
    if (!requirePermission) return true;
    const permissions = Array.isArray(requirePermission)
      ? requirePermission
      : [requirePermission];
    return canAny(permissions);
  }, [requirePermission, canAny]);

  // Memoize final access check based on simple boolean values
  const hasAccess = useMemo(() => {
    if (requireAuth && !isAuthenticated) return false;
    if (requireAdmin && !canAccessAdmin) return false;
    if (!hasRequiredRole) return false;
    if (!hasRequiredPermission) return false;
    return true;
  }, [
    requireAuth,
    isAuthenticated,
    requireAdmin,
    canAccessAdmin,
    hasRequiredRole,
    hasRequiredPermission,
  ]);

  useEffect(() => {
    // Wait for loading to complete
    if (isLoading) return;

    // Prevent multiple redirects
    if (hasRedirected.current) return;

    // Redirect if no access (use replace to avoid back button issues)
    if (!hasAccess) {
      hasRedirected.current = true;

      if (requireAuth && !isAuthenticated) {
        router.replace(redirectTo || `/login?redirect=${pathname}`);
        return;
      }

      if (requireAdmin || requireRole || requirePermission) {
        router.replace(redirectTo || "/workflows");
        return;
      }
    }

    // Reset redirect flag when access is restored
    if (hasAccess && hasRedirected.current) {
      hasRedirected.current = false;
    }
  }, [
    isLoading,
    hasAccess,
    isAuthenticated,
    requireAuth,
    requireAdmin,
    requireRole,
    requirePermission,
    redirectTo,
    pathname,
    router,
  ]);

  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children until we verify access
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    // Show loading while redirect is happening
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Component to show content only if user has permission
 */
export function RequirePermission({
  children,
  permission,
  fallback,
}: {
  children: React.ReactNode;
  permission: SystemPermission | SystemPermission[];
  fallback?: React.ReactNode;
}) {
  const { can, canAny } = usePermissions();

  const hasPermission = Array.isArray(permission)
    ? canAny(permission)
    : can(permission);

  if (!hasPermission) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

/**
 * Component to show content only if user has role
 */
export function RequireRole({
  children,
  role,
  fallback,
}: {
  children: React.ReactNode;
  role: UserRole | UserRole[];
  fallback?: React.ReactNode;
}) {
  const { hasRole, hasAnyRole } = usePermissions();

  const hasRequiredRole = Array.isArray(role)
    ? hasAnyRole(role)
    : hasRole(role);

  if (!hasRequiredRole) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

/**
 * Component to show content only for staff members
 */
export function RequireStaff({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isStaff } = usePermissions();

  if (!isStaff) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
