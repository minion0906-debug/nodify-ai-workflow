'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUserData } from '@/hooks/use-user-data';
import { LoaderCircle, Crown, Zap, Check, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function SubscriptionSettings() {
  const { user: userData, isLoading } = useUserData();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription & Usage</CardTitle>
          <CardDescription>Loading your subscription information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const subscription = userData?.subscription;
  const usage = userData?.usage;
  const limits = subscription?.limits;

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 'pro':
        return <Zap className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getPlanBadgeVariant = (plan: string): "default" | "secondary" | "success" | "warning" => {
    switch (plan) {
      case 'enterprise':
        return 'warning';
      case 'pro':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Unlimited' : limit.toLocaleString();
  };

  const calculatePercentage = (used: number, max: number) => {
    if (max === -1) return 0; // Unlimited
    return (used / max) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                {subscription?.plan && getPlanIcon(subscription.plan)}
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing preferences
              </CardDescription>
            </div>
            <Badge variant={getPlanBadgeVariant(subscription?.plan || 'free')}>
              {subscription?.plan?.toUpperCase() || 'FREE'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Status</p>
              <p className="text-sm text-muted-foreground">
                {subscription?.status === 'active' ? 'Active' : 'Inactive'}
              </p>
            </div>
            <Badge variant={subscription?.status === 'active' ? 'success' : 'secondary'}>
              {subscription?.status?.toUpperCase() || 'UNKNOWN'}
            </Badge>
          </div>

          {subscription?.plan !== 'enterprise' && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Upgrade your plan</p>
                <p className="text-xs text-muted-foreground">
                  Get access to more features and higher limits
                </p>
                <Button className="w-full sm:w-auto">
                  <Zap className="mr-2 h-4 w-4" />
                  Upgrade to Pro
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
          <CardDescription>
            Track your resource usage and limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Workflows */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Workflows</p>
              <p className="text-sm text-muted-foreground">
                {usage?.workflowCount || 0} / {formatLimit(limits?.maxWorkflows || 0)}
              </p>
            </div>
            {limits?.maxWorkflows !== -1 && (
              <Progress
                value={calculatePercentage(usage?.workflowCount || 0, limits?.maxWorkflows || 0)}
              />
            )}
          </div>

          {/* Executions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Workflow Executions</p>
              <p className="text-sm text-muted-foreground">
                {usage?.executionsThisMonth || 0} / {formatLimit(limits?.maxExecutionsPerMonth || 0)}
              </p>
            </div>
            {limits?.maxExecutionsPerMonth !== -1 && (
              <Progress
                value={calculatePercentage(
                  usage?.executionsThisMonth || 0,
                  limits?.maxExecutionsPerMonth || 0
                )}
              />
            )}
          </div>

          {/* API Calls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">API Calls</p>
              <p className="text-sm text-muted-foreground">
                {usage?.apiCallsThisMonth || 0} / {formatLimit(limits?.maxApiCalls || 0)}
              </p>
            </div>
            {limits?.maxApiCalls !== -1 && (
              <Progress
                value={calculatePercentage(usage?.apiCallsThisMonth || 0, limits?.maxApiCalls || 0)}
              />
            )}
          </div>

          {/* Storage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Storage Used</p>
              <p className="text-sm text-muted-foreground">
                {((usage?.storageUsed || 0) / 1024 / 1024).toFixed(2)} MB /{' '}
                {formatLimit((limits?.maxStorage || 0) / 1024 / 1024)} MB
              </p>
            </div>
            {limits?.maxStorage !== -1 && (
              <Progress
                value={calculatePercentage(usage?.storageUsed || 0, limits?.maxStorage || 0)}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature Access */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Access</CardTitle>
          <CardDescription>Features included in your plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              {limits?.canUseAI ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">AI Features</span>
            </div>

            <div className="flex items-center gap-2">
              {limits?.canUseAdvancedNodes ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Advanced Nodes</span>
            </div>

            <div className="flex items-center gap-2">
              {limits?.canUseScheduler ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Workflow Scheduler</span>
            </div>

            <div className="flex items-center gap-2">
              {limits?.canUseWebhooks ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Webhooks</span>
            </div>

            <div className="flex items-center gap-2">
              {limits?.prioritySupport ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Priority Support</span>
            </div>

            <div className="flex items-center gap-2">
              {limits?.customBranding ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Custom Branding</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
