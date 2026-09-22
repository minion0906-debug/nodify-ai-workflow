
"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Workflow,
  Settings,
  KeyRound,
  Table,
  FlaskConical,
  MessageSquare,
  Globe,
} from "lucide-react";
import AppHeader from "@/components/header";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar-vertical";
import Link from "next/link";
import { cn } from "@/lib/utils";
import BottomNavbar from "./bottom-navbar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUser } from "@/firebase";
import { usePermissions } from "@/hooks/use-permissions";
import Image from "next/image";
import LoadingScreen from "@/app/(app)/loading2"
import { useEnsureUsagePeriod } from "@/hooks/use-ensure-usage-period";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  
  const { hasAnyRole } = usePermissions();
  const canSeeNodeLabs = hasAnyRole(["developer", "admin", "super_admin"] as any);

  const mainMenuItems = [
    {
      path: "/workflows",
      icon: <Workflow className="h-6 w-6"/>,
      label: "Workflows",
    },
    {
      path: "/community",
      icon: <MessageSquare className="h-6 w-6"/>,
      label: "Community",
    },
    {
      path: "/credentials",
      icon: <KeyRound className="h-6 w-6"/>,
      label: "Credentials",
    },
    {
      path: "/tables",
      icon: <Table className="h-6 w-6"/>,
      label: "Tables",
    },
    // Conditionally include Node Labs only for privileged roles
    ...(canSeeNodeLabs ? [{
      path: "/node-labs",
      icon: <FlaskConical className="h-6 w-6"/>,
      label: "Node Labs",
    }] : []),
    {
      path: "/settings",
      icon: <Settings className="h-6 w-6"/>,
      label: "Settings",
    },
  ];
  
  const isAppPage = mainMenuItems.some(item => pathname.startsWith(item.path));
  const isWorkflowEditor = /^\/workflows\/[^/]+$/.test(pathname);
  const isNodeLabEditor = /^\/node-labs\//.test(pathname);

  // Ensure monthly usage counters are aligned with current billing period
  useEnsureUsagePeriod();

  useEffect(() => {
    if (!isUserLoading && !user && isAppPage) {
      router.push('/login');
    }
  }, [user, isUserLoading, isAppPage, router]);

  // Client-side guard for Node Labs routes (must run before any conditional returns)
  useEffect(() => {
    if (!isUserLoading && user && isNodeLabEditor) {
      if (!canSeeNodeLabs) {
        router.replace('/workflows');
      }
    }
  }, [isUserLoading, user, isNodeLabEditor, canSeeNodeLabs, router]);

  if (!isAppPage) {
    return <>{children}</>;
  }

  // Wait until both user and mobile status are determined
  if (isUserLoading || isMobile === undefined) {
    return <LoadingScreen />;
  }

  // Show loading while redirect is happening
  if (!user) {
    return <LoadingScreen />;
  }

  if (isWorkflowEditor || isNodeLabEditor) {
    return <>{children}</>;
  }

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <div className={cn("flex h-svh", { 'pb-16': isMobile })}>
        {!isMobile && (
            <Sidebar>
                <SidebarContent>
                    <SidebarHeader>
                        <Link href="/workflows" className="flex items-center gap-2 font-semibold text-lg">
                            <Image src="/assets/images/icon.png" alt="Nodify Logo" width={58} height={58} className="h-7 w-7" />
                            <span>Nodify</span>
                        </Link>
                    </SidebarHeader>
                    <SidebarMenu>
                        {mainMenuItems.map((item, index) => (
                            <SidebarMenuItem key={item.path + index}>
                                <Link href={item.path} className="w-full">
                                    <SidebarMenuButton 
                                        className={cn(isActive(item.path) && "bg-secondary text-primary-foreground")}
                                        variant={isActive(item.path) ? "default" : "ghost"}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>
            </Sidebar>
        )}
        <div className="flex flex-col flex-1">
            {<AppHeader />}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
        {isMobile && <BottomNavbar menuItems={mainMenuItems} />}
    </div>
  );
}
