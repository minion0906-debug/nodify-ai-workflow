"use client";

import { Suspense } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import BottomNavbar from "@/components/bottom-navbar";
import {
  LayoutDashboard,
  Users,
  Ticket,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react";

function AdminLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Loading admin panel...</p>
      </div>
    </div>
  );
}

const adminMenuItems = [
  {
    path: "/admin",
    icon: <LayoutDashboard className="h-6 w-6"/>,
    label: "Dashboard",
  },
  {
    path: "/admin/users",
    icon: <Users className="h-6 w-6"/>,
    label: "Users",
  },
  {
    path: "/admin/support",
    icon: <Ticket className="h-6 w-6"/>,
    label: "Support",
  },
  {
    path: "/admin/analytics",
    icon: <BarChart3 className="h-6 w-6"/>,
    label: "Analytics",
  },
  {
    path: "/admin/audit-logs",
    icon: <FileText className="h-6 w-6"/>,
    label: "Logs",
  },
  {
    path: "/admin/settings",
    icon: <Settings className="h-6 w-6"/>,
    label: "Settings",
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  return (
    <ProtectedRoute requireAdmin redirectTo="/workflows">
      <div className={cn("flex h-svh", { 'pb-16': isMobile })}>
        {/* Sidebar - Hidden on mobile */}
        {!isMobile && <AdminSidebar />}

        {/* Main Content */}
        <div className="flex flex-col flex-1">
          {/* Header */}
          <AdminHeader />

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <Suspense fallback={<AdminLoadingFallback />}>
              {children}
            </Suspense>
          </main>
        </div>

        {/* Bottom Navigation - Only on mobile */}
        {isMobile && <BottomNavbar menuItems={adminMenuItems} />}
      </div>
    </ProtectedRoute>
  );
}
