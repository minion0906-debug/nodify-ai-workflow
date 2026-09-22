/**
 * Next.js Instrumentation
 * This file runs when the Next.js server starts
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    require('dotenv').config();
  }
}
