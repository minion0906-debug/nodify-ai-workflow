
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, LogOut, Settings, Shield } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import Image from 'next/image';
import { usePermissions } from '@/hooks';

const notifications = [
    { id: 1, title: 'New workflow run', description: 'User Onboarding Email completed successfully.' },
    { id: 2, title: 'Warning: High CPU', description: 'The "Daily Sales Report" workflow is using high resources.' },
    { id: 3, title: 'New node available!', description: 'A new "Twitter Post" node has been added to your library.' },
];


export default function AppHeader() {
  const pathname = usePathname();
  const [hasUnread, setHasUnread] = useState(true);
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { canAccessAdmin, isLoading } = usePermissions();

  const getTitle = () => {
    if (pathname.startsWith('/workflows')) return 'Workflows';
    if (pathname.startsWith('/credentials')) return 'Credentials';
    if (pathname.startsWith('/tables')) return 'Tables';
    if (pathname.startsWith('/node-labs')) return 'Node Labs';
    if (pathname.startsWith('/settings')) return 'Settings';
    return 'Dashboard';
  };
  
  const handleNotificationClick = () => {
    setHasUnread(false);
  }

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
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
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
                {!isLoading && canAccessAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Admin Panel</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
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
