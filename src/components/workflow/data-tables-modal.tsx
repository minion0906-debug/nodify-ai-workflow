
'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Table, TableRowData } from '@/lib/tables-types';
import { LoaderCircle, Database } from 'lucide-react';
import {
  Table as UiTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '../ui/scroll-area';

export function DataTablesModal({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  const tablesQuery = useMemo(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'tables');
  }, [user, firestore]);
  const { data: tables, isLoading: isLoadingTables } = useCollection<Table>(tablesQuery);

  const rowsQuery = useMemo(() => {
    if (!user || !selectedTable) return null;
    const rowsCollection = collection(firestore, 'users', user.uid, 'tables', selectedTable.id, 'rows');
    return query(rowsCollection, where("ownerId", "==", user.uid));
  }, [user, firestore, selectedTable]);
  const { data: rows, isLoading: isLoadingRows } = useCollection<TableRowData>(rowsQuery);

  const handleTableSelect = (table: Table) => {
    setSelectedTable(table);
  };

  return (
    <Dialog onOpenChange={(open) => !open && setSelectedTable(null)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Tables
          </DialogTitle>
          <DialogDescription>
            View and manage your data tables without leaving the editor.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden pt-4">
          {/* Table List */}
          <div className="col-span-4 border-r pr-4">
            <h3 className="font-semibold mb-2">Tables</h3>
            {isLoadingTables ? (
              <div className="flex items-center justify-center h-full">
                <LoaderCircle className="animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-1">
                  {tables?.map((table) => (
                    <Button
                      key={table.id}
                      variant={selectedTable?.id === table.id ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => handleTableSelect(table)}
                    >
                      {table.name}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Table Data */}
          <div className="col-span-8">
            {selectedTable ? (
              <div className="flex flex-col h-full">
                <h3 className="font-semibold mb-2">{selectedTable.name} Data</h3>
                <ScrollArea className="flex-1 border rounded-lg">
                  {isLoadingRows ? (
                    <div className="flex items-center justify-center h-full">
                      <LoaderCircle className="animate-spin text-muted-foreground" />
                    </div>
                  ) : (rows && rows.length > 0) ? (
                    <UiTable>
                      <TableHeader className="sticky top-0 bg-muted">
                        <TableRow>
                          {selectedTable.columns.map((col) => (
                            <TableHead key={col.id}>{col.name}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.id}>
                            {selectedTable.columns.map((col) => (
                              <TableCell key={`${row.id}-${col.id}`}>
                                {typeof row[col.name] === 'object' ? JSON.stringify(row[col.name]) : String(row[col.name] ?? '')}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </UiTable>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p>No rows in this table.</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Select a table to view its data.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
