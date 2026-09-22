import type { Table } from "./tables-types";

export const tables: Table[] = [
    {
        id: 'tbl_1',
        name: 'Users',
        description: 'Stores information about application users.',
        columns: [
            { id: 'col_1_1', name: 'id', type: 'string', isPrimary: true },
            { id: 'col_1_2', name: 'name', type: 'string' },
            { id: 'col_1_3', name: 'email', type: 'string' },
            { id: 'col_1_4', name: 'created_at', type: 'datetime' },
        ],
        rowCount: 125,
    },
    {
        id: 'tbl_2',
        name: 'Products',
        description: 'Contains all available products for the e-commerce store.',
        columns: [
            { id: 'col_2_1', name: 'product_id', type: 'string', isPrimary: true },
            { id: 'col_2_2', name: 'name', type: 'string' },
            { id: 'col_2_3', name: 'price', type: 'number' },
            { id: 'col_2_4', name: 'in_stock', type: 'boolean' },
        ],
        rowCount: 84,
    },
     {
        id: 'tbl_3',
        name: 'Support Tickets',
        description: 'Tracks customer support tickets and their status.',
        columns: [
            { id: 'col_3_1', name: 'ticket_id', type: 'number', isPrimary: true },
            { id: 'col_3_2', name: 'customer_email', type: 'string' },
            { id: 'col_3_3', name: 'subject', type: 'string' },
            { id: 'col_3_4', name: 'status', type: 'string' },
            { id: 'col_3_5', name: 'opened_at', type: 'datetime' },
        ],
        rowCount: 32,
    },
];
