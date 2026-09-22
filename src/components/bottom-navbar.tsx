
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import React from 'react';

type BottomNavbarProps = {
  menuItems: {
    path: string;
    icon: React.ReactNode;
    label: string; // Label is kept for accessibility and context but not rendered
  }[];
};

export default function BottomNavbar({ menuItems }: BottomNavbarProps) {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
      <nav className="flex items-center justify-around gap-2 bg-black rounded-full shadow-lg p-2">
        {menuItems.map((item, index) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <React.Fragment key={item.path}>
              <Link
                href={item.path}
                className={cn(
                  'relative flex items-center justify-center w-12 h-12 rounded-full transition-colors duration-300 ease-out',
                  'text-muted-foreground hover:text-white'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute inset-0 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className={cn('relative z-10', isActive ? 'text-white' : 'text-neutral-400')}>
                  {item.icon}
                </div>
              </Link>
              {index < menuItems.length - 1 && (
                 <div className="w-1 h-1 bg-neutral-700 rounded-full" />
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
}
