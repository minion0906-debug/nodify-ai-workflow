
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, CreditCard, Bell, SlidersHorizontal, User, Shield, ChevronLeft, Receipt } from 'lucide-react';
import { ProfileSettings } from '@/components/settings/profile-settings';
import { WorkspaceSettings } from '@/components/settings/workspace-settings';
import { AccountSettings } from '@/components/settings/account-settings';
import { AiSettings } from '@/components/settings/ai-settings';
import { SubscriptionSettings } from '@/components/settings/subscription-settings';
import { PreferencesSettings } from '@/components/settings/preferences-settings';
import { BillingSettings } from '@/components/settings/billing-settings';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const tabs = [
  { value: 'profile', label: 'Profile', icon: User },
  { value: 'account', label: 'Account', icon: Shield },
  { value: 'subscription', label: 'Subscription', icon: CreditCard },
  { value: 'billing', label: 'Billing', icon: Receipt },
  { value: 'preferences', label: 'Preferences', icon: Bell },
  { value: 'workspace', label: 'Workspace', icon: SlidersHorizontal },
  { value: 'ai', label: 'AI', icon: Bot },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [showMenu, setShowMenu] = useState(true);

  const activeTabData = tabs.find(tab => tab.value === activeTab);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3">
          {!showMenu && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMenu(true)}
              className="shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold">
              {showMenu ? 'Settings' : activeTabData?.label}
            </h1>
            {showMenu && (
              <p className="text-xs text-muted-foreground">
                Manage your account
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block px-6 py-4 border-b">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col md:flex-row h-full">
          {/* Mobile: Menu or Content */}
          <div className="md:hidden h-full">
            {showMenu ? (
              // Menu List for Mobile
              <div className="h-full overflow-auto">
                <div className="p-4 space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.value}
                        onClick={() => {
                          setActiveTab(tab.value);
                          setShowMenu(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                          "hover:bg-accent active:scale-95",
                          activeTab === tab.value
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="text-base">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Content for Mobile
              <div className="h-full overflow-auto">
                <TabsContent value="profile" className="m-0 h-full p-4">
                  <ProfileSettings />
                </TabsContent>
                <TabsContent value="account" className="m-0 h-full p-4">
                  <AccountSettings />
                </TabsContent>
                <TabsContent value="subscription" className="m-0 h-full p-4">
                  <SubscriptionSettings />
                </TabsContent>
                <TabsContent value="billing" className="m-0 h-full p-4">
                  <BillingSettings />
                </TabsContent>
                <TabsContent value="preferences" className="m-0 h-full p-4">
                  <PreferencesSettings />
                </TabsContent>
                <TabsContent value="workspace" className="m-0 h-full p-4">
                  <WorkspaceSettings />
                </TabsContent>
                <TabsContent value="ai" className="m-0 h-full p-4">
                  <AiSettings />
                </TabsContent>
              </div>
            )}
          </div>

          {/* Desktop: Sidebar + Content */}
          <div className="hidden md:flex md:flex-row gap-6 h-full p-6">
            <TabsList className="flex flex-col h-fit w-56 shrink-0 items-start p-2 bg-muted/50">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="w-full justify-start gap-3 text-base py-3 data-[state=active]:bg-background"
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <div className="flex-1 overflow-auto">
              <TabsContent value="profile" className="mt-0 h-full">
                <ProfileSettings />
              </TabsContent>
              <TabsContent value="account" className="mt-0 h-full">
                <AccountSettings />
              </TabsContent>
              <TabsContent value="subscription" className="mt-0 h-full">
                <SubscriptionSettings />
              </TabsContent>
              <TabsContent value="billing" className="mt-0 h-full">
                <BillingSettings />
              </TabsContent>
              <TabsContent value="preferences" className="mt-0 h-full">
                <PreferencesSettings />
              </TabsContent>
              <TabsContent value="workspace" className="mt-0 h-full">
                <WorkspaceSettings />
              </TabsContent>
              <TabsContent value="ai" className="mt-0 h-full">
                <AiSettings />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
