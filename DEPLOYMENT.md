# 🚀 Nodify Deployment Guide

This guide will help you deploy your own instance of Nodify.

## Prerequisites

- Node.js 18+ (20.x recommended)
- npm 9+
- Firebase account (free tier works)
- Google Cloud account (for Gemini AI)
- Domain name (optional but recommended)

---

## 1. Firebase Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "my-nodify-instance")
4. Enable Google Analytics (optional)
5. Create project

### 1.2 Enable Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. (Optional) Enable other providers (Google, GitHub, etc.)

### 1.3 Create Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Start in **production mode**
3. Choose location (select closest to your users)
4. Click **Enable**

### 1.4 Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

Or manually copy rules from `firestore.rules` to Firebase Console.

### 1.5 Enable Storage

1. Go to **Storage** → **Get started**
2. Start in **production mode**
3. Choose same location as Firestore

### 1.6 Get Firebase Config

1. Go to **Project Settings** (gear icon)
2. Under "Your apps", click **Web** icon (</>)
3. Register app with nickname "Nodify Web"
4. Copy the config object (you'll need these values for .env)

### 1.7 Create Service Account (for server-side)

1. Go to **Project Settings** → **Service accounts**
2. Click **Generate new private key**
3. Download JSON file
4. Convert to base64:
   ```bash
   # Linux/Mac
   cat serviceAccountKey.json | base64 -w 0

   # Windows PowerShell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json"))
   ```
5. Save this base64 string for `FIREBASE_SERVICE_ACCOUNT_BASE64`

---

## 2. Google AI Setup (Gemini)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click **Get API Key**
3. Create API key
4. Copy the key for `GEMINI_API_KEY`

---

## 3. Environment Configuration

### 3.1 Create `.env.local`

```bash
cp .env.example .env.local
```

### 3.2 Fill in Environment Variables

```env
# Webhooks & Security (generate random strings)
WEBHOOK_SECRET_TOKEN=your_random_secret_here
CRON_SECRET=another_random_secret_here

# Firebase Client Configuration (from step 1.6)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc

# Firebase Admin (Server-side)
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_SERVICE_ACCOUNT_BASE64=eyJ0eXBlIjoi... (from step 1.7)

# Google AI (Gemini)
GEMINI_API_KEY=AIza... (from step 2)

# (Optional) Email configuration
# RESEND_API_KEY=re_...
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your@email.com
# SMTP_PASS=your_password
```

---

## 4. Install Dependencies

```bash
npm ci
```

---

## 5. Build Application

```bash
npm run build
```

---

## 6. Deployment Options

### Option A: Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Add environment variables in Vercel dashboard:
   - Go to **Settings** → **Environment Variables**
   - Add all variables from `.env.local`

5. Redeploy:
   ```bash
   vercel --prod
   ```

### Option B: Google Cloud Run

1. Install gcloud CLI

2. Build container:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/nodify
   ```

3. Deploy:
   ```bash
   gcloud run deploy nodify \
     --image gcr.io/YOUR_PROJECT_ID/nodify \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

4. Add environment variables via Cloud Run console

### Option C: Self-Hosted (VPS)

1. Install Node.js on your server

2. Clone repository:
   ```bash
   git clone https://github.com/your-repo/Nodify.git
   cd Nodify
   ```

3. Install dependencies:
   ```bash
   npm ci
   ```

4. Build:
   ```bash
   npm run build
   ```

5. Start with PM2:
   ```bash
   npm i -g pm2
   pm2 start npm --name "nodify" -- start
   pm2 save
   pm2 startup
   ```

6. Configure Nginx reverse proxy:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:9003;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. Enable SSL with Let's Encrypt:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

---

## 7. Post-Deployment Setup

### 7.1 Create Admin User

1. Sign up through the application UI
2. Go to Firebase Console → Firestore
3. Find your user document in `users` collection
4. Add field:
   ```json
   {
     "role": "super_admin"
   }
   ```

### 7.2 Configure Firestore Indexes

Some queries require composite indexes. Firebase will show errors in console if needed.

To create indexes:
1. Go to Firebase Console → Firestore → Indexes
2. Click the error link in your app console
3. It will auto-create the required index

### 7.3 Configure Storage CORS

Create `cors.json`:
```json
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

Apply:
```bash
gsutil cors set cors.json gs://your-project.appspot.com
```

---

## 8. Optional: Stripe Integration

If you want to enable payments:

1. Create Stripe account at [stripe.com](https://stripe.com)

2. Get API keys from Stripe Dashboard

3. Add to `.env.local`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. Configure webhook in Stripe Dashboard:
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events: `customer.subscription.*`, `payment_intent.*`

---

## 9. Monitoring & Maintenance

### 9.1 Enable Sentry (Error Tracking)

1. Create account at [sentry.io](https://sentry.io)
2. Create new project
3. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
   ```

### 9.2 Database Backups

Enable automated Firestore backups:

```bash
gcloud firestore backups schedules create \
  --database='(default)' \
  --recurrence=daily \
  --retention=7d
```

### 9.3 Monitoring

- Firebase Console: Monitor authentication, database usage
- Vercel Analytics: Monitor app performance
- Sentry: Track errors and performance

---

## 10. Troubleshooting

### Build Errors

```bash
# Clear cache
rm -rf .next node_modules
npm ci
npm run build
```

### Firebase Connection Issues

- Verify all environment variables are set correctly
- Check Firebase project is in Blaze (pay-as-you-go) plan
- Verify service account has correct permissions

### Deployment Fails

- Check Node.js version (must be 18+)
- Verify all dependencies installed
- Check build logs for specific errors

---

## 11. Updating Nodify

```bash
git pull origin main
npm ci
npm run build
# Restart your deployment
```

---

## Support

For deployment issues:
- Check Firebase Console for errors
- Review application logs
- Contact support at support@nodify.com

---

## Cost Estimation

**Firebase (Blaze Plan):**
- Firestore: ~$0.06 per 100k document reads
- Storage: ~$0.026 per GB
- Authentication: Free up to 50k MAU

**Vercel:**
- Hobby: Free (personal projects)
- Pro: $20/month (commercial)

**Google AI (Gemini):**
- Free tier: 60 requests/minute
- Paid: Pay per token

**Estimated cost for 1000 users:** $50-150/month
