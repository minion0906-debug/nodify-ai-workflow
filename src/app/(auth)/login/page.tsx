
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/workflows');
    }
  }, [user, isUserLoading, router]);

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: 'Signed in successfully!',
        description: 'Welcome back.',
      });
      // Redirect handled by useEffect
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: 'Invalid email or password. Please try again.',
      });
    }
  };
  
  if (isUserLoading || (!isUserLoading && user)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-transparent">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-24 w-24 rounded-full bg-primary/10 animate-pulse"></div>
          <Image src="/assets/images/icon.png" alt="Nodify Logo" width={58} height={58} className="h-12 w-12 animate-pulse" style={{ animationDelay: '0.2s' }} />
        </div>
        <p className="mt-4 text-muted-foreground">Signing in...</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>
          Enter your email below to login to your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" passHref className="ml-auto inline-block text-sm underline">
                Forgot your password?
            </Link>
          </div>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col">
        <Button className="w-full" onClick={handleSignIn}>Sign in</Button>
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="underline">
            Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
