'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useUserData } from '@/hooks/use-user-data';
import { LoaderCircle, CreditCard, Receipt } from 'lucide-react';

function formatDate(value?: any) {
  try {
    if (!value) return '—';
    const d = value?.toDate ? value.toDate() : new Date(value);
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(d);
  } catch {
    return String(value) || '—';
  }
}

export function BillingSettings() {
  const { user: userData, isLoading } = useUserData();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>Loading your billing information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const sub = userData?.subscription;
  const usage = userData?.usage;
  const limits = sub?.limits;

  return (
    <div className="space-y-6">
      {/* Billing Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Billing Summary <CreditCard className="h-5 w-5" />
              </CardTitle>
              <CardDescription>Plan, period and next invoice</CardDescription>
            </div>
            <Badge variant={sub?.status === 'active' ? 'success' : 'secondary'}>
              {sub?.status?.toUpperCase() || 'UNKNOWN'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="text-base font-medium uppercase">{sub?.plan || 'free'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Billing Interval</p>
              <p className="text-base font-medium">{sub?.billingInterval || 'monthly'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Period</p>
              <p className="text-base font-medium">
                {formatDate(sub?.currentPeriodStart)} – {formatDate(sub?.currentPeriodEnd)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Invoice</p>
              <p className="text-base font-medium">{formatDate(sub?.currentPeriodEnd)}</p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            {sub?.stripeCustomerId && (
              <Badge variant="secondary">Customer: {sub.stripeCustomerId}</Badge>
            )}
            {sub?.stripeSubscriptionId && (
              <Badge variant="secondary">Subscription: {sub.stripeSubscriptionId}</Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Manage Payment Method
            </Button>
            <Button variant="outline" size="sm">
              Open Billing Portal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Invoices <Receipt className="h-5 w-5" /></CardTitle>
          <CardDescription>Download past invoices and receipts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No invoices found.</p>
        </CardContent>
      </Card>
    </div>
  );
}

