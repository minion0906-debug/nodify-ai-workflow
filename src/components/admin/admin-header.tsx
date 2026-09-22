"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, LogOut, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import Image from "next/image";

const notifications = [
  { id: 1, title: 'New user registered', description: 'John Doe just signed up.' },
  { id: 2, title: 'Support ticket escalated', description: 'Ticket #1234 needs attention.' },
  { id: 3, title: 'System update available', description: 'Version 2.1.0 is ready to install.' },
];

export function AdminHeader() {
  const pathname = usePathname();
  const [hasUnread, setHasUnread] = useState(true);
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();

  const getTitle = () => {
    if (pathname === '/admin') return 'Dashboard';
    if (pathname.startsWith('/admin/users')) return 'Users';
    if (pathname.startsWith('/admin/support')) return 'Support Tickets';
    if (pathname.startsWith('/admin/workflows')) return 'Workflows';
    if (pathname.startsWith('/admin/nodes')) return 'Custom Nodes';
    if (pathname.startsWith('/admin/analytics')) return 'Analytics';
    if (pathname.startsWith('/admin/audit-logs')) return 'Audit Logs';
    if (pathname.startsWith('/admin/settings')) return 'System Settings';
    return 'Admin';
  };

  const handleNotificationClick = () => {
    setHasUnread(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 p-4 backdrop-blur-md">
      <div className="flex items-center gap-2">
        {isMobile && <Image src="/assets/images/icon.png" alt="Nodify Logo" width={58} height={58} className="h-7 w-7" />}
        <h1 className="text-xl font-bold">{getTitle()}</h1>
        <Badge variant="destructive" className="text-[10px] h-5 gap-1">
          <Shield className="h-3 w-3" />
          Admin Mode
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" onClick={handleNotificationClick}>
              <Bell className="h-5 w-5" />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Admin Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1">
                <p className="font-semibold">{notification.title}</p>
                <p className="text-xs text-muted-foreground">{notification.description}</p>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />}
                <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <p className="font-medium">{user?.displayName}</p>
              <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
