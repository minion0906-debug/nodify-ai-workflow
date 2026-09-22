
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useAuth, useUser } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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

  const handleSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`.trim(),
      });
      
      toast({
        title: 'Account created!',
        description: 'You have been successfully signed up.',
      });
      // Redirect is handled by the useEffect
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        variant: 'destructive',
        title: 'Sign up failed',
        description: error.message || 'An unexpected error occurred.',
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
        <p className="mt-4 text-muted-foreground">Creating your account...</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Sign Up</CardTitle>
        <CardDescription>
          Enter your information to create an account.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="first-name">First name</Label>
                <Input id="first-name" placeholder="Max" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="last-name">Last name</Label>
                <Input id="last-name" placeholder="Robinson" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col">
        <Button className="w-full" onClick={handleSignUp}>Create account</Button>
        <div className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
