// Table node execution (TypeScript version for NodeLoader)
export default async function (
  node: any,
  data: any,
  items: any[],
  execution: any,
  $: any,
  $input: any,
  $json: any,
  $node: any,
  helpers: any,
  services: any,
  env: any
): Promise<any> {
  const { db, user } = services || {};
  if (!db || !user?.uid) {
    helpers.error('Missing Firestore or user context');
    return { path: 'error', data: { error: 'Not authenticated or DB unavailable' } };
  }

  const tableId = node.properties.table?.value;
  const operation = node.properties.operation?.value || 'getMultiple';
  const rowId = node.properties.rowId?.value;
  const fetchMode = node.properties.fetchMode?.value || 'specificIds';
  const rowCount = parseInt(node.properties.rowCount?.value) || 10;
  const sortField = node.properties.sortField?.value || 'id';
  const sortDirection = node.properties.sortDirection?.value || 'asc';

  let rowIds: any = node.properties.rowIds?.value;
  let rowData: any = node.properties.data?.value;
  let filters: any = node.properties.filters?.value;

  const parseMaybe = (v: any) => {
    if (typeof v === 'string' && v.trim()) {
      try { return JSON.parse(v); } catch { return v; }
    }
    return v;
  };
  rowIds = parseMaybe(rowIds);
  rowData = parseMaybe(rowData);
  filters = parseMaybe(filters);

  if (!tableId) {
    helpers.error('Table not selected');
    return { path: 'error', data: { error: 'Table not selected.' } };
  }

  // Use nested path used by UI
  const basePath = `users/${user.uid}/tables/${tableId}/rows`;
  const coll = db.collection(basePath);
  const docRef = (id: string) => db.doc(`${basePath}/${id}`);

  async function ensureNextId(): Promise<string> {
    try {
      const q = await coll.orderBy('id', 'desc').limit(1).get();
      if (!q.empty) {
        const last = q.docs[0].get('id');
        const lastNum = parseInt(String(last), 10);
        if (!isNaN(lastNum)) return String(lastNum + 1);
      }
    } catch {}
    return String(Date.now());
  }

  function applySort(query: any, field: string, dir: string) {
    try { return query.orderBy(field, dir === 'desc' ? 'desc' : 'asc'); }
    catch { return query.orderBy('__name__'); }
  }

  function applyFilters(query: any, fs: any): any {
    if (!Array.isArray(fs)) return query;
    let q = query;
    for (const f of fs) {
      const field = f.field; const op = f.operator; const val = f.value;
      try {
        switch (op) {
          case '==': q = q.where(field, '==', val); break;
          case '!=': q = q.where(field, '!=', val); break;
          case '>': q = q.where(field, '>', val); break;
          case '>=': q = q.where(field, '>=', val); break;
          case '<': q = q.where(field, '<', val); break;
          case '<=': q = q.where(field, '<=', val); break;
          case 'array-contains':
          case 'contains': q = q.where(field, 'array-contains', val); break;
          case 'in': q = q.where(field, 'in', Array.isArray(val) ? val : [val]); break;
          case 'between':
            if (val && typeof val === 'object' && val.min !== undefined && val.max !== undefined) {
              q = q.where(field, '>=', val.min).where(field, '<=', val.max);
            }
            break;
          default: break;
        }
      } catch (e: any) {
        helpers.warn(`Filter ignored (operator '${op}') - ${e.message}`);
      }
    }
    return q;
  }

  try {
    switch (operation) {
      case 'insert': {
        if (!rowData) return { path: 'error', data: { error: 'No data provided for insert' } };
        let insertId = (rowData.id !== undefined && rowData.id !== null && rowData.id !== '') ? String(rowData.id) : await ensureNextId();
        const ref = docRef(insertId);
        const fullRow = { ...rowData, id: insertId, tableId, ownerId: user.uid };
        await ref.set(fullRow);
        return { success: true, operation, table: tableId, id: insertId, data: fullRow };
      }
      case 'get': {
        if (!rowId) return { path: 'error', data: { error: 'Row ID is required' } };
        const snap = await docRef(String(rowId)).get();
        if (!snap.exists) return { path: 'error', data: { error: `Row '${rowId}' not found` } };
        return { success: true, operation, table: tableId, id: String(rowId), data: snap.data() };
      }
      case 'getMultiple': {
        if (fetchMode === 'specificIds') {
          if (!Array.isArray(rowIds)) return { path: 'error', data: { error: 'Row IDs must be an array' } };
          const rows: any[] = []; const foundIds: string[] = []; const notFoundIds: string[] = [];
          for (const id of rowIds) {
            try { const s = await docRef(String(id)).get(); if (s.exists) { rows.push(s.data()); foundIds.push(String(id)); } else notFoundIds.push(String(id)); }
            catch { notFoundIds.push(String(id)); }
          }
          return { success: true, operation, table: tableId, fetchMode, count: rows.length, rows, requestedIds: rowIds.map(String), foundIds, notFoundIds };
        }
        let q = coll.where('ownerId', '==', user.uid);
        q = applySort(q, sortField, sortDirection);
        if (fetchMode === 'first') q = q.limit(rowCount);
        if (fetchMode === 'last') { q = applySort(coll.where('ownerId', '==', user.uid), sortField, 'desc').limit(rowCount); }
        let snap = await q.get();
        let rows = snap.docs.map((d: any) => d.data());
        if (rows.length === 0) {
          let q2 = applySort(coll, sortField, sortDirection);
          if (fetchMode === 'first') q2 = q2.limit(rowCount);
          if (fetchMode === 'last') { q2 = applySort(coll, sortField, 'desc').limit(rowCount); }
          snap = await q2.get();
          rows = snap.docs.map((d: any) => d.data());
        }
        if (fetchMode === 'last') rows = rows.reverse();
        return { success: true, operation, table: tableId, fetchMode, count: rows.length, rows };
      }
      case 'query': {
        let q = coll.where('ownerId', '==', user.uid);
        q = applyFilters(q, filters);
        q = applySort(q, sortField, sortDirection);
        let snap = await q.limit(rowCount || 100).get();
        let rows = snap.docs.map((d: any) => d.data());
        if (rows.length === 0) {
          let q2 = applyFilters(coll, filters);
          q2 = applySort(q2, sortField, sortDirection);
          snap = await q2.limit(rowCount || 100).get();
          rows = snap.docs.map((d: any) => d.data());
        }
        return { success: true, operation, table: tableId, count: rows.length, rows };
      }
      case 'update': {
        if (!rowId) return { path: 'error', data: { error: 'Row ID is required for update' } };
        if (!rowData) return { path: 'error', data: { error: 'No data provided for update' } };
        const ref = docRef(String(rowId));
        await ref.update({ ...rowData });
        const snap = await ref.get();
        return { success: true, operation, table: tableId, id: String(rowId), data: snap.data() };
      }
      case 'delete': {
        if (!rowId) return { path: 'error', data: { error: 'Row ID is required for delete' } };
        await docRef(String(rowId)).delete();
        return { success: true, operation, table: tableId, id: String(rowId), deleted: true };
      }
      default:
        return { path: 'error', data: { error: `Unsupported operation: ${operation}` } };
    }
  } catch (e: any) {
    helpers.error('Table node failed:', e.message);
    return { path: 'error', data: { error: e.message } };
  }
}

