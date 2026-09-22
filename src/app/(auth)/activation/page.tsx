'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function ActivationPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Check your email</CardTitle>
        <CardDescription>
          We&apos;ve sent a six-digit activation code to your email address.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="activation-code">Activation Code</Label>
          <Input id="activation-code" placeholder="- - - - - -" required />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col">
        <Button className="w-full">Activate Account</Button>
        <div className="mt-4 text-center text-sm">
          Didn&apos;t receive a code?{' '}
          <button className="underline">
            Resend
          </button>
        </div>
      </CardFooter>
    </Card>
  );
}
