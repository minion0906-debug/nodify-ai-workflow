/**
 * To run this script:
 * 1. Make sure you have ts-node installed (npm install -g ts-node)
 * 2. Set up your Firebase Admin credentials. See https://firebase.google.com/docs/admin/setup
 *    You can do this by setting the GOOGLE_APPLICATION_CREDENTIALS environment variable.
 * 3. Run the script from the root of the project: ts-node scripts/reset-database.ts
 */

import { getFirebaseAdmin } from '../src/firebase/admin';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function deleteAllUsersData() {
  const { auth, db } = getFirebaseAdmin();
  const users = await auth.listUsers();

  for (const user of users.users) {
    console.log(`Deleting data for user ${user.uid}`);
    const tableRowsRef = db.collection(`users/${user.uid}/tableRows`);
    const snapshot = await tableRowsRef.get();
    if (snapshot.empty) {
        console.log(`No rows to delete for user ${user.uid}`);
        continue;
    }
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Deleted ${snapshot.size} rows for user ${user.uid}`);
  }
}

async function deleteAllTables() {
  const { db } = getFirebaseAdmin();
  const tablesRef = db.collection('tables');
  const snapshot = await tablesRef.get();
  if (snapshot.empty) {
    console.log('No tables to delete');
    return;
  }
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log(`Deleted ${snapshot.size} tables`);
}

async function main() {
  console.log('This script will delete all user table data and all table definitions from Firestore.');
  console.log('This is a destructive operation and cannot be undone.');
  
  rl.question('Are you sure you want to continue? (yes/no): ', async (answer) => {
    if (answer.toLowerCase() === 'yes') {
      try {
        console.log('Starting database reset...');
        await deleteAllUsersData();
        await deleteAllTables();
        console.log('Database reset complete.');
      } catch (error) {
        console.error('Error resetting database:', error);
      }
    } else {
      console.log('Database reset cancelled.');
    }
    rl.close();
  });
}

main();
