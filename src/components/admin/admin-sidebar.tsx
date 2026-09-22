"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks";
import {
  LayoutDashboard,
  Users,
  Ticket,
  FileText,
  BarChart3,
  Settings,
  Workflow,
  Package,
  ArrowLeft,
  Shield,
} from "lucide-react";
import Image from "next/image";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar-vertical";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  title: string;
  href: string;
  icon: any;
  permission?: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
    permission: "users.view",
  },
  {
    title: "Support Tickets",
    href: "/admin/support",
    icon: Ticket,
    permission: "support.view_tickets",
  },
  {
    title: "Workflows",
    href: "/admin/workflows",
    icon: Workflow,
    permission: "workflows.view_all",
  },
  {
    title: "Custom Nodes",
    href: "/admin/nodes",
    icon: Package,
    permission: "nodes.approve",
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    permission: "analytics.view",
  },
  {
    title: "Audit Logs",
    href: "/admin/audit-logs",
    icon: FileText,
    permission: "audit.view",
  },
  {
    title: "System Settings",
    href: "/admin/settings",
    icon: Settings,
    permission: "system.view_settings",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, can } = usePermissions();
  const [isPending, startTransition] = useTransition();

  // Filter nav items based on permissions
  const visibleNavItems = navItems.filter((item) => {
    if (item.permission) {
      return can(item.permission as any);
    }
    return true;
  });

  const isActive = (path: string) => pathname === path;

  const handleNavigation = (href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (pathname === href) return; // Don't navigate if already on this page

    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarHeader>
          <Link href="/admin" className="flex items-center gap-2 font-semibold text-lg">
            <Image src="/assets/images/icon.png" alt="Nodify Logo" width={58} height={58} className="h-7 w-7" />
            <div className="flex flex-col">
              <span>Nodify</span>
              <Badge variant="destructive" className="w-fit text-[10px] h-4 gap-1 px-1.5">
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarMenu>
          {visibleNavItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <SidebarMenuItem key={item.href + index}>
                <Link
                  href={item.href}
                  className="w-full"
                  onClick={(e) => handleNavigation(item.href, e)}
                >
                  <SidebarMenuButton
                    className={cn(active && "bg-secondary text-primary-foreground", isPending && "opacity-50")}
                    variant={active ? "default" : "ghost"}
                    disabled={isPending}
                  >
                    <Icon className="h-6 w-6" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {/* Footer - Back to App */}
        <div className="mt-auto p-4 border-t">
          <Link href="/workflows">
            <SidebarMenuButton variant="ghost" className="w-full justify-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to App</span>
            </SidebarMenuButton>
          </Link>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
