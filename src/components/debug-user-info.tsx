'use client';

import { useUserData } from '@/hooks/use-user-data';
import { usePermissions } from '@/hooks/use-permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

export function DebugUserInfo() {
  const { user: userData, isLoading, error } = useUserData();
  const { canAccessAdmin, isStaff, role, permissions } = usePermissions();

  if (isLoading) {
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle>Debug: User Info</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="m-4 border-red-500">
        <CardHeader>
          <CardTitle>Debug: Error</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-red-500">{JSON.stringify(error, null, 2)}</pre>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Debug: User Info</CardTitle>
        <CardDescription>Current user data and permissions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium">User Data Loaded:</p>
          <Badge variant={userData ? 'success' : 'destructive'}>
            {userData ? 'Yes' : 'No'}
          </Badge>
        </div>

        {userData && (
          <>
            <div>
              <p className="text-sm font-medium">Role:</p>
              <Badge>{userData.role || 'none'}</Badge>
            </div>

            <div>
              <p className="text-sm font-medium">Account Status:</p>
              <Badge variant={userData.accountStatus === 'active' ? 'success' : 'destructive'}>
                {userData.accountStatus || 'unknown'}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium">Can Access Admin:</p>
              <Badge variant={canAccessAdmin ? 'success' : 'destructive'}>
                {canAccessAdmin ? 'Yes' : 'No'}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium">Is Staff:</p>
              <Badge variant={isStaff ? 'success' : 'destructive'}>
                {isStaff ? 'Yes' : 'No'}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium">Permissions Count:</p>
              <Badge>{permissions.length}</Badge>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Full User Object:</p>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-96">
                {JSON.stringify(userData, null, 2)}
              </pre>
            </div>
          </>
        )}

        {!userData && (
          <div>
            <p className="text-sm text-muted-foreground">
              No user data found in Firestore. Make sure you have run the add-admin-user script.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
