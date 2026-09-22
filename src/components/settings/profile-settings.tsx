
'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useStorage, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useUserData } from '@/hooks/use-user-data';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials } from '@/lib/utils';
import { Camera, LoaderCircle, Save } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export function ProfileSettings() {
  const { user: authUser } = useUser();
  const { user: userData, isLoading } = useUserData();
  const storage = useStorage();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [company, setCompany] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user data from Firestore
  useEffect(() => {
    if (userData) {
      setDisplayName(userData.profile?.displayName || authUser?.displayName || '');
      setBio(userData.profile?.bio || '');
      setLocation(userData.profile?.location || '');
      setWebsite(userData.profile?.website || '');
      setCompany(userData.profile?.company || '');
    }
  }, [userData, authUser]);

  const handleSave = async () => {
    if (!authUser || !firestore) return;

    setIsSaving(true);

    try {
      // Update Firebase Auth profile
      await updateProfile(authUser, { displayName });

      // Update Firestore user document
      const userRef = doc(firestore, 'users', authUser.uid);
      await updateDoc(userRef, {
        'profile.displayName': displayName,
        'profile.bio': bio,
        'profile.location': location,
        'profile.website': website,
        'profile.company': company,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
      console.error('Error updating profile:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !authUser || !storage || !firestore) return;

    setIsUploading(true);

    // Use a path consistent with security rules: users/{userId}/...
    const storageRef = ref(storage, `users/${authUser.uid}/profile-picture`);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update Firebase Auth
      await updateProfile(authUser, { photoURL: downloadURL });

      // Update Firestore
      const userRef = doc(firestore, 'users', authUser.uid);
      await updateDoc(userRef, {
        'profile.photoURL': downloadURL,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Avatar Updated',
        description: 'Your profile picture has been changed.',
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload your new avatar. Please check storage rules.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Public Profile</CardTitle>
          <CardDescription>Loading your profile information...</CardDescription>
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
    <Card>
      <CardHeader>
        <CardTitle>Public Profile</CardTitle>
        <CardDescription>
          This information will be displayed publicly on your community profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
                <div className="relative group">
                    <Avatar className="h-20 w-20">
                        {(authUser?.photoURL || userData?.profile?.photoURL) && (
                          <AvatarImage
                            src={authUser?.photoURL || userData?.profile?.photoURL}
                            alt={displayName}
                          />
                        )}
                        <AvatarFallback className="text-2xl">{getInitials(displayName)}</AvatarFallback>
                    </Avatar>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-full transition-opacity"
                      onClick={handleAvatarClick}
                      disabled={isUploading}
                    >
                      {isUploading ? <LoaderCircle className="h-6 w-6 animate-spin"/> : <Camera className="h-6 w-6"/>}
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/png, image/jpeg, image/gif"
                    />
                </div>
                <div>
                    <p className="font-semibold">{displayName}</p>
                    <p className="text-sm text-muted-foreground">{authUser?.email}</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={authUser?.email || ''}
              disabled
              className="bg-muted"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            placeholder="Tell us a little bit about yourself"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., New York, USA"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g., Acme Inc."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourwebsite.com"
          />
        </div>

        <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
