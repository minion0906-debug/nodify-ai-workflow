
import { Timestamp } from "firebase/firestore";

export type ColumnType = 
    | 'string' 
    | 'number' 
    | 'boolean' 
    | 'datetime' 
    | 'json';

export type Column = {
    id: string;
    name: string;
    type: ColumnType;
    isPrimary?: boolean;
    defaultValue?: any;
};

export type Table = {
    id: string;
    name: string;
    description: string;
    columns: Column[];
    rowCount: number;
    createdAt: Timestamp | string;
};

export type TableRowData = {
    id: string;
    [key: string]: any;
}
