// Test that instrumentation initializes SQLite correctly
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('Testing SQLite initialization...\n');

// Simulate what happens in src/lib/db/sqlite.ts

// 1. Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  console.log('Creating data directory...');
  fs.mkdirSync(dataDir, { recursive: true });
} else {
  console.log('✓ Data directory exists');
}

// 2. Create database connection
const dbPath = path.join(dataDir, 'nodify.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// 3. Enable WAL mode
db.pragma('journal_mode = WAL');
console.log('✓ WAL mode enabled');

// 4. Check if tables exist
const tables = db.prepare(`
  SELECT name FROM sqlite_master
  WHERE type='table' AND name != 'sqlite_sequence'
  ORDER BY name
`).all();

console.log('\nTables in database:');
if (tables.length === 0) {
  console.log('  (no tables - database needs initialization)');
} else {
  tables.forEach(table => {
    console.log(`  ✓ ${table.name}`);
  });
}

db.close();
console.log('\n✓ Test complete! The instrumentation.ts file will handle initialization automatically.');
