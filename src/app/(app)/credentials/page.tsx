
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, Plus, Copy, Trash2, Edit, KeyRound, Search, LoaderCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Credential } from '@/lib/credentials-types';
import { AddCredentialSheet } from '@/components/credentials/add-credential-sheet';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { credentialDefinitions } from '@/lib/credentials-definitions';
import { formatDistanceToNow } from 'date-fns';

export default function CredentialsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const credentialsQuery = useMemo(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'credentials');
  }, [user, firestore]);
  const { data: credentials, isLoading } = useCollection<Credential>(credentialsQuery);
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  
  const types = useMemo(() => {
    const allTypes = new Set(credentialDefinitions.map(c => c.name));
    return ['all', ...Array.from(allTypes)];
  }, []);

  const filteredCredentials = useMemo(() => {
    if (!credentials) return [];
    return credentials.filter(credential => {
      const matchesType = selectedType === 'all' || credential.type === selectedType;
      const matchesSearch = searchTerm === '' ||
        credential.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [credentials, searchTerm, selectedType]);


  const handleAddCredential = async (newCredential: Omit<Credential, 'id' | 'createdAt'>) => {
    if (!user) return;
    const credentialsCollection = collection(firestore, 'users', user.uid, 'credentials');
    await addDoc(credentialsCollection, {
      ...newCredential,
      createdAt: serverTimestamp(),
    });
  };
  
  const handleUpdateCredential = async (updatedCredential: Credential) => {
    if (!user || !updatedCredential.id) return;
    const credDocRef = doc(firestore, 'users', user.uid, 'credentials', updatedCredential.id);
    const { id, ...credData } = updatedCredential;
    await updateDoc(credDocRef, credData);
    setEditingCredential(null);
  }

  const handleDeleteCredential = (credentialId: string) => {
    if (!user) return;
    const credDocRef = doc(firestore, 'users', user.uid, 'credentials', credentialId);
    deleteDoc(credDocRef);
  };
  
  const openAddSheet = () => {
    setEditingCredential(null);
    setIsSheetOpen(true);
  }

  const openEditSheet = (credential: Credential) => {
    setEditingCredential(credential);
    setIsSheetOpen(true);
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) { // Firebase Timestamp object
        return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
    }
    // Fallback for string dates
    return timestamp;
  };

  return (
    <>
      <div className="flex flex-col h-full">
         <header className="sticky top-0 z-10 flex flex-col md:flex-row items-center justify-between gap-4 border-b bg-background/80 p-4 backdrop-blur-md">
            <div className="flex items-center w-full max-w-md h-10 px-3 rounded-lg border bg-card focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background transition-shadow">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input 
                  placeholder="Search credentials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-9"
              />
              <Separator orientation="vertical" className="h-5" />
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-auto border-0 bg-transparent focus:ring-0 focus:ring-offset-0 shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.map(type => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type === 'all' ? 'All Types' : type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
            {isLoading || isUserLoading ? (
              <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg h-full">
                <LoaderCircle className="h-12 w-12 text-muted-foreground animate-spin" />
                <h3 className="mt-4 text-lg font-semibold">Loading Credentials...</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Just a moment while we fetch your data.
                </p>
              </div>
            ) : filteredCredentials.length > 0 ? (
                <div className="border rounded-lg">
                  <ul className="divide-y divide-border">
                    {filteredCredentials.map((credential) => (
                      <li key={credential.id} className="flex items-center justify-between p-4 hover:bg-secondary/50">
                        <div className="flex items-center gap-4">
                          <KeyRound className="h-6 w-6 text-muted-foreground" />
                          <div>
                            <p className="font-semibold">{credential.name}</p>
                            <p className="text-sm text-muted-foreground">{credential.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground hidden md:block">
                            Created: {formatTimestamp(credential.createdAt)}
                          </p>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditSheet(credential)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                                onClick={() => handleDeleteCredential(credential.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg h-full">
                  <KeyRound className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No Credentials Found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchTerm ? `No results for "${searchTerm}".` : 'Add your first credential to get started.'}
                  </p>
                  <Button className="mt-4" onClick={openAddSheet}>
                    <Plus className="mr-2 h-4 w-4" /> Add Credential
                  </Button>
                </div>
              )}
        </main>
        <div className="fixed bottom-20 right-6 z-30 md:bottom-6">
          <Button className="rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90" onClick={openAddSheet}>
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
      <AddCredentialSheet
        isOpen={isSheetOpen}
        setIsOpen={setIsSheetOpen}
        onAddCredential={handleAddCredential}
        onEditCredential={handleUpdateCredential}
        credentialToEdit={editingCredential}
      />
    </>
  );
}
