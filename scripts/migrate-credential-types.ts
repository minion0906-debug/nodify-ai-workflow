/*
 * Migrate credential.type values from human-readable names (e.g., "OpenAI")
 * to canonical IDs (e.g., "openAi"). This ensures nodes filtering by
 * typeOptions.credentialType (ID) find the correct credentials.
 *
 * Usage:
 *   npx tsx scripts/migrate-credential-types.ts [--dry-run]
 *
 * Auth:
 *   - Set FIREBASE_SERVICE_ACCOUNT_BASE64 with a Base64-encoded service account JSON
 *     or place firebasesdk.json at the repo root.
 */

import * as admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const DRY_RUN = process.argv.includes('--dry-run');

function initAdmin() {
  if (admin.apps.length) return;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  try {
    if (b64) {
      const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
      admin.initializeApp({ credential: admin.credential.cert(json) });
      console.log('Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_BASE64');
      return;
    }
    const sdkPath = join(process.cwd(), 'firebasesdk.json');
    if (existsSync(sdkPath)) {
      const raw = readFileSync(sdkPath, 'utf-8');
      const json = JSON.parse(raw);
      if (json.private_key && typeof json.private_key === 'string') {
        json.private_key = json.private_key.replace(/\\n/g, '\n');
      }
      admin.initializeApp({ credential: admin.credential.cert(json) });
      console.log('Firebase Admin initialized from firebasesdk.json');
      return;
    }
    // Fallback
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    console.log('Firebase Admin initialized using applicationDefault credentials');
  } catch (e) {
    console.error('Failed to initialize Firebase Admin SDK:', e);
    process.exit(1);
  }
}

// Map various human-readable names (and synonyms) to canonical IDs
const canonicalBySlug: Record<string, string> = {
  openai: 'openAi',
  'open-ai': 'openAi',
  'open ai': 'openAi',
  github: 'github',
  discord: 'discord',
  slack: 'slack',
  telegram: 'telegram',
  stripe: 'stripe',
  sendgrid: 'sendgrid',
  notion: 'notion',
  twilio: 'twilio',
  airtable: 'airtable',
  oauth2: 'oauth2',
  'oauth-2': 'oauth2',
  'api key': 'apiKey',
  apikey: 'apiKey',
  'api-key': 'apiKey',
  'http auth': 'httpAuth',
  httpauth: 'httpAuth',
  'http-auth': 'httpAuth',
  'google api': 'googleApi',
  googleapi: 'googleApi',
  'google-api': 'googleApi',
  'bearer token': 'bearerToken',
  bearertoken: 'bearerToken',
  'bearer-token': 'bearerToken',
};

function toSlug(s: any): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s/g, '-');
}

async function run() {
  initAdmin();
  const db = admin.firestore();

  console.log(`Scanning credentials via collectionGroup('credentials')${DRY_RUN ? ' [dry-run]' : ''}...`);
  const snap = await db.collectionGroup('credentials').get();
  console.log(`Found ${snap.size} credential docs`);

  let toUpdate = 0;
  let updated = 0;

  for (const doc of snap.docs) {
    const data: any = doc.data() || {};
    const currentType = data.type;
    const slug = toSlug(currentType);
    const canonical = canonicalBySlug[slug];

    if (!canonical) continue; // unknown type
    if (currentType === canonical) continue; // already canonical

    toUpdate++;
    console.log(`- ${doc.ref.path}: type '${currentType}' -> '${canonical}'`);
    if (!DRY_RUN) {
      await doc.ref.update({ type: canonical });
      updated++;
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Candidates: ${toUpdate}`);
  console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'}: ${DRY_RUN ? toUpdate : updated}`);

  if (DRY_RUN) {
    console.log('\nRun without --dry-run to apply changes.');
  }
}

run().then(() => {
  console.log('Done.');
  process.exit(0);
}).catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});

