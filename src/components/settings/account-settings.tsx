
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '../ui/separator';
import { useUser } from '@/firebase';
import { useUserData } from '@/hooks/use-user-data';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth';
import { LoaderCircle, Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export function AccountSettings() {
  const { user: authUser } = useUser();
  const { user: userData, isLoading } = useUserData();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');

  const handlePasswordUpdate = async () => {
    if (!authUser || !authUser.email) {
      toast({
        title: 'Error',
        description: 'No user found',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(authUser.email, currentPassword);
      await reauthenticateWithCredential(authUser, credential);

      // Update password
      await updatePassword(authUser, newPassword);

      toast({
        title: 'Password Updated',
        description: 'Your password has been changed successfully.',
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);

      let errorMessage = 'Failed to update password';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!authUser || !authUser.email) return;

    setIsDeletingAccount(true);

    try {
      // Re-authenticate before deletion
      const credential = EmailAuthProvider.credential(authUser.email, deleteConfirmPassword);
      await reauthenticateWithCredential(authUser, credential);

      // Delete user
      await deleteUser(authUser);

      toast({
        title: 'Account Deleted',
        description: 'Your account has been permanently deleted.',
      });
    } catch (error: any) {
      console.error('Error deleting account:', error);

      let errorMessage = 'Failed to delete account';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Password is incorrect';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Loading account information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>View your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Account Status</p>
              <p className="text-xs text-muted-foreground">
                {userData?.accountStatus || 'active'}
              </p>
            </div>
            <Badge variant={userData?.accountStatus === 'active' ? 'success' : 'secondary'}>
              {userData?.accountStatus?.toUpperCase() || 'ACTIVE'}
            </Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Role</p>
              <p className="text-xs text-muted-foreground">Your permission level</p>
            </div>
            <Badge variant="secondary">{userData?.role?.toUpperCase() || 'USER'}</Badge>
          </div>

          {userData?.createdAt && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Member Since</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(userData.createdAt.seconds * 1000), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handlePasswordUpdate} disabled={isUpdatingPassword}>
              {isUpdatingPassword ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-medium text-destructive">Delete Account</p>
                <p className="text-xs text-destructive/80">
                  Permanently delete your account and all of your data. This action cannot be undone.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="shrink-0">
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <p>
                        This action cannot be undone. This will permanently delete your account and
                        remove all of your data from our servers, including:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>All your workflows</li>
                        <li>All your credentials</li>
                        <li>All your custom nodes</li>
                        <li>All your tables and data</li>
                      </ul>
                      <div className="space-y-2 pt-4">
                        <Label htmlFor="delete-password">
                          Enter your password to confirm:
                        </Label>
                        <Input
                          id="delete-password"
                          type="password"
                          value={deleteConfirmPassword}
                          onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                          placeholder="Your password"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={!deleteConfirmPassword || isDeletingAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeletingAccount ? (
                        <>
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Account'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
