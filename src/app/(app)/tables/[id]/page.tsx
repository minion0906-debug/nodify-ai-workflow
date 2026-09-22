
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { notFound, useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, MoreVertical, Plus, Trash2, LoaderCircle, Database, GitBranch, Table as TableIcon } from 'lucide-react';
import type { Column, Table, TableRowData } from '@/lib/tables-types';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AddEditColumnSheet } from '@/components/tables/add-edit-column-sheet';
import { useDoc, useCollection, useFirestore, useUser } from "@/firebase";
import { doc, updateDoc, collection, addDoc, deleteDoc, runTransaction, increment, query, where } from "firebase/firestore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddRowSheet } from '@/components/tables/add-row-sheet';
import { Input } from '@/components/ui/input';

export default function TableSchemaPage() {
  const router = useRouter();
  const params = useParams();
  const tableId = params.id as string;
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const tableRef = useMemo(() => {
    if (!user || !tableId) return null;
    return doc(firestore, 'users', user.uid, 'tables', tableId);
  }, [user, firestore, tableId]);
  const { data: table, isLoading: isTableLoading } = useDoc<Table>(tableRef);
  
  const rowsQuery = useMemo(() => {
    if (!user || !tableId) return null;
    const rowsCollection = collection(firestore, 'users', user.uid, 'tables', tableId, 'rows');
    return query(rowsCollection, where("ownerId", "==", user.uid));
  }, [user, firestore, tableId]);
  const { data: rows, isLoading: areRowsLoading } = useCollection<TableRowData>(rowsQuery);


  const [columns, setColumns] = useState<Column[]>([]);
  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [isRowSheetOpen, setIsRowSheetOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [editingRow, setEditingRow] = useState<TableRowData | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tableName, setTableName] = useState("");
  
  useEffect(() => {
    if (table) {
      setTableName(table.name);
      setColumns(table.columns);
    }
  }, [table]);

  if (isUserLoading || isTableLoading) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-12 h-full">
            <LoaderCircle className="h-12 w-12 text-muted-foreground animate-spin" />
            <h3 className="mt-4 text-lg font-semibold">Loading Table...</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                Just a moment while we fetch your table data.
            </p>
        </div>
    );
  }

  if (!table) {
    notFound();
  }
  
  const getColumnTypeVariant = (type: string) => {
    switch (type) {
      case 'string': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'number': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'boolean': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'datetime': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'json': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      default: return 'secondary';
    }
  }

  const openAddColumnSheet = () => {
    setEditingColumn(null);
    setIsColumnSheetOpen(true);
  };
  
  const openEditColumnSheet = (column: Column) => {
    setEditingColumn(column);
    setIsColumnSheetOpen(true);
  };
  
  const updateColumnsInFirestore = async (newColumns: Column[]) => {
      if (!user || !tableId) return;
      const tableDocRef = doc(firestore, 'users', user.uid, 'tables', tableId);
      await updateDoc(tableDocRef, { columns: newColumns });
  }

  const handleSaveColumn = (columnData: Omit<Column, 'id'> | Column) => {
    let newColumns;
    if ('id' in columnData) {
      // Editing existing column
      newColumns = columns.map(c => c.id === columnData.id ? columnData : c);
    } else {
      // Adding new column
      const newColumn: Column = {
        ...columnData,
        id: `col-${table.id}-${Date.now()}`,
      };
      newColumns = [...columns, newColumn];
    }
    setColumns(newColumns);
    updateColumnsInFirestore(newColumns);
    setIsColumnSheetOpen(false);
  };

  const handleDeleteColumn = (columnId: string) => {
    const newColumns = columns.filter(c => c.id !== columnId);
    setColumns(newColumns);
    updateColumnsInFirestore(newColumns);
  };
  
  const openAddRowSheet = () => {
    setEditingRow(null);
    setIsRowSheetOpen(true);
  };

  const openEditRowSheet = (row: TableRowData) => {
    setEditingRow(row);
    setIsRowSheetOpen(true);
  };

  const handleAddRow = async (newRowData: Omit<TableRowData, 'id'>) => {
    if (!user || !table) return;

    const rowsCollection = collection(firestore, `users/${user.uid}/tables/${table.id}/rows`);
    const tableDocRef = doc(firestore, 'users', user.uid, 'tables', table.id);

    try {
        await runTransaction(firestore, async (transaction) => {
            const newDocRef = doc(rowsCollection); // Let Firestore generate ID
            const fullRowData = { ...newRowData, id: newDocRef.id, tableId: table.id, ownerId: user.uid };
            transaction.set(newDocRef, fullRowData);
            transaction.update(tableDocRef, { rowCount: increment(1) });
        });
    } catch(e) {
        console.error("Error adding row: ", e);
    }

    setIsRowSheetOpen(false);
  };

  const handleEditRow = async (updatedRowData: TableRowData) => {
    if (!user || !table) return;
    const rowDocRef = doc(firestore, `users/${user.uid}/tables/${table.id}/rows`, updatedRowData.id);
    await updateDoc(rowDocRef, updatedRowData);
    setIsRowSheetOpen(false);
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!user || !table) return;
    const rowDocRef = doc(firestore, `users/${user.uid}/tables/${table.id}/rows`, rowId);
    const tableDocRef = doc(firestore, 'users', user.uid, 'tables', table.id);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            transaction.delete(rowDocRef);
            transaction.update(tableDocRef, { rowCount: increment(-1) });
        });
    } catch(e) {
        console.error("Error deleting row: ", e);
    }
  };
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTableName(e.target.value);
  };
  
  const handleTitleBlur = async () => {
      setIsEditingTitle(false);
      if (!user || !table || tableName === table.name) return;

      const tableDocRef = doc(firestore, 'users', user.uid, 'tables', tableId);
      await updateDoc(tableDocRef, { name: tableName });
  };
  
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          handleTitleBlur();
      }
  };


  return (
    <>
      <div className="flex flex-col h-full p-4 md:p-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/tables')}>
            <ArrowLeft />
          </Button>
          <div>
              {isEditingTitle ? (
                  <Input
                    value={tableName}
                    onChange={handleTitleChange}
                    onBlur={handleTitleBlur}
                    onKeyDown={handleTitleKeyDown}
                    autoFocus
                    className="text-2xl font-bold h-10"
                  />
              ) : (
                <h1 className="text-2xl font-bold cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                    {tableName}
                </h1>
              )}
              <p className="text-sm text-muted-foreground">{table.description}</p>
          </div>
        </div>
        
        <Tabs defaultValue="schema" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="schema" className="gap-2"><GitBranch className="h-4 w-4" />Schema</TabsTrigger>
            <TabsTrigger value="data" className="gap-2"><Database className="h-4 w-4" />Data</TabsTrigger>
          </TabsList>
          
          <TabsContent value="schema" className="flex-1 mt-4">
            <Card className="flex-1 flex flex-col h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                      <CardTitle>Table Schema</CardTitle>
                      <CardDescription>Define the structure of your table.</CardDescription>
                  </div>
                  <Button onClick={openAddColumnSheet}>
                      <Plus className="mr-2 h-4 w-4" /> Add Column
                  </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                  <div className="border rounded-lg">
                      <ul className="divide-y divide-border">
                          {columns.map((column) => (
                          <li key={column.id} className="flex items-center justify-between p-4 hover:bg-secondary/50">
                              <div className="flex items-center gap-4">
                                  <div>
                                      <div className="font-semibold flex items-center gap-2">
                                          {column.name}
                                          {column.isPrimary && <Badge variant="outline" className="border-primary/50 text-primary">Primary Key</Badge>}
                                      </div>
                                      <div className="text-sm text-muted-foreground mt-1">
                                          <Badge variant="secondary" className={`capitalize text-xs ${getColumnTypeVariant(column.type)}`}>
                                              {column.type}
                                          </Badge>
                                      </div>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEditColumnSheet(column)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      <span>Edit Column</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                                      onClick={() => handleDeleteColumn(column.id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      <span>Delete Column</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                          </li>
                          ))}
                      </ul>
                  </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="data" className="flex-1 mt-4">
            <Card className="flex-1 flex flex-col h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Table Data</CardTitle>
                  <CardDescription>View and manage the rows in your table.</CardDescription>
                </div>
                <Button onClick={openAddRowSheet}>
                  <Plus className="mr-2 h-4 w-4" /> Add Row
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                <div className="border rounded-lg">
                    {areRowsLoading ? (
                        <div className="text-center p-8 text-muted-foreground">Loading data...</div>
                    ) : (rows || []).length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">No rows yet. Add one to get started!</div>
                    ) : (
                        <UiTable>
                            <TableHeader>
                                <TableRow>
                                    {columns.map(col => <TableHead key={col.id}>{col.name}</TableHead>)}
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows?.map(row => (
                                    <TableRow key={row.id}>
                                        {columns.map(col => (
                                            <TableCell key={`${row.id}-${col.id}`}>
                                                {String(row[col.name]) ?? ''}
                                            </TableCell>
                                        ))}
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEditRowSheet(row)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        <span>Edit Row</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                      className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                                                      onClick={() => handleDeleteRow(row.id)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        <span>Delete Row</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </UiTable>
                    )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sheets */}
      <AddEditColumnSheet
        isOpen={isColumnSheetOpen}
        setIsOpen={setIsColumnSheetOpen}
        onSave={handleSaveColumn}
        columnToEdit={editingColumn}
      />
      <AddRowSheet
        isOpen={isRowSheetOpen}
        setIsOpen={setIsRowSheetOpen}
        columns={columns}
        onSave={editingRow ? handleEditRow : handleAddRow}
        rowToEdit={editingRow}
      />
    </>
  );
}
