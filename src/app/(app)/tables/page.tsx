
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, Plus, Trash2, Edit, Table as TableIcon, Database, LoaderCircle, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Table, Column, TableRowData } from '@/lib/tables-types';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { useCollection, useFirestore, useUser, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, runTransaction, increment } from "firebase/firestore";
import { AddTableDialog } from '@/components/tables/add-table-dialog';
import { AddRowSheet } from '@/components/tables/add-row-sheet';
import { useToast } from '@/hooks/use-toast';

export default function TablesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const tablesQuery = useMemo(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'tables');
  }, [user, firestore]);
  const { data: tables, isLoading } = useCollection<Table>(tablesQuery);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [isAddRowSheetOpen, setIsAddRowSheetOpen] = useState(false);
  const [selectedTableForAddRow, setSelectedTableForAddRow] = useState<Table | null>(null);

  const filteredTables = useMemo(() => {
    if (!tables) return [];
    return tables.filter(table => {
      return searchTerm === '' ||
        table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (table.description && table.description.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [tables, searchTerm]);

  const handleAddTable = async (name: string, columns: Column[]) => {
    if (!user || !name) return;
    const tablesCollection = collection(firestore, 'users', user.uid, 'tables');
    const newTableData = {
        name: name,
        description: `A table for ${name.toLowerCase()}.`,
        columns: columns,
        rowCount: 0,
        createdAt: serverTimestamp(),
    };
    try {
        const newDocRef = await addDoc(tablesCollection, newTableData);
        await updateDoc(newDocRef, { id: newDocRef.id });
    } catch (error) {
        console.error("Error creating new table: ", error);
    }
    setIsCreateTableOpen(false);
  };

  const handleDeleteTable = (tableId: string) => {
    if (!user) return;
    const tableDocRef = doc(firestore, 'users', user.uid, 'tables', tableId);
    deleteDoc(tableDocRef);
  };
  
  const handleOpenAddRowSheet = (table: Table) => {
    setSelectedTableForAddRow(table);
    setIsAddRowSheetOpen(true);
  };

  const handleAddRow = async (rowData: Omit<TableRowData, 'id'>) => {
    if (!user || !selectedTableForAddRow) return;

    const rowsCollection = collection(firestore, `users/${user.uid}/tables/${selectedTableForAddRow.id}/rows`);
    const tableDocRef = doc(firestore, 'users', user.uid, 'tables', selectedTableForAddRow.id);

    try {
        const newDocRef = doc(rowsCollection);
        await runTransaction(firestore, async (transaction) => {
            const newRow = { ...rowData, id: newDocRef.id, tableId: selectedTableForAddRow.id, ownerId: user.uid };
            transaction.set(newDocRef, newRow);
            transaction.update(tableDocRef, { rowCount: increment(1) });
        });
        
        toast({
            title: "Row Added",
            description: `A new row has been added to the '${selectedTableForAddRow.name}' table.`,
        });
    } catch (serverError: any) {
        console.error("Error adding row: ", serverError);
        const permissionError = new FirestorePermissionError({
            path: rowsCollection.path,
            operation: 'create',
            requestResourceData: { ...rowData, tableId: selectedTableForAddRow.id, ownerId: user.uid },
        });
        errorEmitter.emit('permission-error', permissionError);
    }

    setIsAddRowSheetOpen(false);
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <header className="sticky top-0 z-10 flex flex-col md:flex-row items-center justify-between gap-4 border-b bg-background/80 p-4 backdrop-blur-md">
          <div className="flex items-center w-full max-w-md h-10 px-3 rounded-lg border bg-card focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background transition-shadow">
            <Database className="h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-9"
            />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {isLoading || isUserLoading ? (
              <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg h-full">
                  <LoaderCircle className="h-12 w-12 text-muted-foreground animate-spin" />
                  <h3 className="mt-4 text-lg font-semibold">Loading Tables...</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                      Just a moment while we fetch your data.
                  </p>
              </div>
          ) : filteredTables.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTables.map((table) => (
                <Card key={table.id} className="hover:shadow-md hover:-translate-y-1 transition-all duration-200 h-full flex flex-col relative">
                  <Link href={`/tables/${table.id}`} className="block flex-grow">
                      <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                          <CardTitle className="font-semibold text-base flex items-center gap-2">
                              <TableIcon className="h-5 w-5 text-muted-foreground"/>
                              {table.name}
                          </CardTitle>
                      </div>
                      <CardDescription className="line-clamp-2 text-xs">{table.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow flex items-end justify-between text-xs text-muted-foreground">
                          <p>{table.columns.length} columns</p>
                          <p>{table.rowCount || 0} rows</p>
                      </CardContent>
                  </Link>
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/tables/${table.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit Schema</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenAddRowSheet(table)}>
                          <Plus className="mr-2 h-4 w-4" />
                          <span>Add Row</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                          onClick={() => handleDeleteTable(table.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete Table</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg h-full">
              <Database className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Tables Found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm ? `No results for "${searchTerm}".` : 'Create your first table to store and manage data.'}
              </p>
              <Button className="mt-4" onClick={() => setIsCreateTableOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Table
              </Button>
            </div>
          )}
        </main>
        <div className="fixed bottom-20 right-6 z-30 md:bottom-6">
          <Button className="rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90" onClick={() => setIsCreateTableOpen(true)}>
              <Plus className="h-6 w-6"/>
          </Button>
        </div>
      </div>
      <AddTableDialog 
        isOpen={isCreateTableOpen}
        onClose={() => setIsCreateTableOpen(false)}
        onConfirm={handleAddTable}
      />
      {selectedTableForAddRow && (
        <AddRowSheet
            isOpen={isAddRowSheetOpen}
            setIsOpen={setIsAddRowSheetOpen}
            columns={selectedTableForAddRow.columns}
            onSave={handleAddRow}
            rowToEdit={null}
        />
      )}
    </>
  );
}
