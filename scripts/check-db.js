// Quick script to check SQLite database tables
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'nodify.db');
console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);

  // Get all tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    ORDER BY name
  `).all();

  console.log('\nTables in database:');
  tables.forEach(table => {
    console.log(`  - ${table.name}`);

    // Get row count
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`    Rows: ${count.count}`);
  });

  db.close();
  console.log('\nDatabase check complete!');
} catch (error) {
  console.error('Error:', error.message);
}
