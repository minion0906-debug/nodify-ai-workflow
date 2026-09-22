# 📜 Nodify License Instructions

## ⚠️ IMPORTANT: Before Selling

**You MUST customize these placeholders in the LICENSE file:**

1. `[YOUR COMPANY NAME]` - Replace with your company/personal name
2. `[YOUR COUNTRY/STATE]` - Replace with your jurisdiction (e.g., "Delaware, USA" or "Madrid, Spain")
3. `[YOUR-DOMAIN]` - Replace with your support email domain

Example:
```
Copyright (c) 2025 Acme Workflow Solutions LLC
Governed by the laws of Delaware, United States
Email: sales@acmeworkflow.com
```

---

## 📋 License Tier Comparison

| Feature | Basic ($499) | Professional ($999) | Enterprise ($2,499) |
|---------|--------------|---------------------|---------------------|
| **Deployments** | 1 | 3 | Unlimited |
| **Users** | Unlimited | Unlimited | Unlimited |
| **Source Code** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Support Duration** | 30 days | 90 days | Lifetime |
| **Updates** | 6 months | 12 months | Lifetime |
| **Custom Branding** | ❌ No | ✅ Yes | ✅ Yes |
| **Setup Assistance** | ❌ No | ❌ No | ✅ 2 hours |
| **Custom Feature** | ❌ No | ❌ No | ✅ 1 feature |

---

## 🛒 How to Sell Licenses

### Option 1: Manual Process (Simple)

1. **Receive Payment** (PayPal, Stripe, wire transfer)
2. **Send License Key** via email with:
   ```
   License: Professional
   Purchased: 2025-12-09
   Valid until: 2026-12-09 (for updates)
   ```
3. **Provide Download Link** (GitHub private repo, Dropbox, Google Drive)
4. **Send Documentation** (DEPLOYMENT.md, .env.example)

### Option 2: Automated (Recommended for scale)

Use platforms like:
- **Gumroad** - Easiest, takes 10% fee
- **Lemon Squeezy** - Full MOR (Merchant of Record)
- **Paddle** - Handles EU VAT automatically
- **FastSpring** - Enterprise-focused

Upload ZIP file, they handle:
- Payment processing
- VAT/tax collection
- License key generation
- Download delivery

---

## 📦 What to Deliver to Buyer

### Included in Purchase:

1. **Source code ZIP/tarball** containing:
   - All `/src`, `/public`, `/docs` folders
   - `package.json`, `package-lock.json`
   - Configuration files (next.config.ts, tsconfig.json, etc.)
   - `.env.example` (fully documented)
   - `DEPLOYMENT.md` (deployment guide)
   - `LICENSE` file

2. **Documentation**:
   - `README.md` (comprehensive)
   - `DEPLOYMENT.md` (step-by-step setup)
   - `TROUBLESHOOTING.md` (common issues)

3. **Scripts**:
   - `setup.sh` (Linux/Mac setup wizard)
   - `setup.ps1` (Windows setup wizard)
   - `Dockerfile` and `docker-compose.yml`

### NOT Included:
- ❌ Your `.env.local` (contains YOUR secrets)
- ❌ Your Firebase project
- ❌ Your Gemini API key
- ❌ `/node_modules` (buyer runs `npm ci`)
- ❌ `/.next` build folder (buyer runs `npm run build`)
- ❌ `/data` folder (contains YOUR database)

---

## 🔒 Protecting Your Source

### Before Sending:

1. **Remove secrets**:
   ```bash
   # Delete your .env.local
   rm .env.local

   # Delete database files
   rm -rf data/

   # Delete build artifacts
   rm -rf .next node_modules
   ```

2. **Verify no secrets in git**:
   ```bash
   git log --all --full-history -- .env.local
   # Should return nothing
   ```

3. **Create clean archive**:
   ```bash
   git archive --format=zip --output=nodify-v1.0.0.zip HEAD
   ```

### Watermarking (Optional):

Add buyer's email to a comment in `/src/config/license.ts`:
```typescript
/**
 * Licensed to: buyer@email.com
 * Purchase Date: 2025-12-09
 * License Type: Professional
 */
export const LICENSE_INFO = {
  // Buyer can modify this file
}
```

This makes it traceable if they redistribute illegally.

---

## 💰 Pricing Strategy

### Recommended Pricing:

**Basic**: $499 (covers development time, affordable for startups)
**Professional**: $999 (2x value, best seller)
**Enterprise**: $2,499 (premium support justified)

### Optional Add-ons:

- **Extended Updates**: $199/year (after initial period)
- **Priority Support**: $99/month (ongoing)
- **Installation Service**: $299 one-time
- **Custom Feature**: $150/hour
- **White-label Customization**: $500 one-time

### Discounts:

- **Early Bird**: 20% off first 10 customers
- **Lifetime Deal**: $1,999 (one-time, all future updates)
- **Agency License**: $4,999 (can deploy for clients)

---

## 📧 Email Templates

### Purchase Confirmation Email:

```
Subject: Your Nodify License - Download & Setup Instructions

Hi [Name],

Thank you for purchasing Nodify [Basic/Pro/Enterprise] License!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LICENSE DETAILS:

License Type: Professional
Purchase Date: December 9, 2025
Support Until: March 9, 2026
Updates Until: December 9, 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DOWNLOAD:

Source Code: [DOWNLOAD LINK]
Password: [IF ENCRYPTED]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT STEPS:

1. Download and extract the source code
2. Read DEPLOYMENT.md for setup instructions
3. Run setup script: bash setup.sh
4. Contact support@yourcompany.com for assistance

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUPPORT:

Email: support@yourcompany.com
Response time: [30 days/90 days/lifetime]

Best regards,
[Your Name]
[Your Company]
```

### Support Ticket Response Template:

```
Subject: Re: Nodify Setup Issue

Hi [Name],

I reviewed your setup issue. Here's the solution:

[SOLUTION STEPS]

Let me know if this resolves your issue.

Best regards,
[Your Name]
[Your Company]

---
License: Professional #12345
Support valid until: March 9, 2026
```

---

## ⚖️ Legal Disclaimers

### Add to Website/Landing Page:

```
By purchasing Nodify, you agree to our Commercial License Agreement.
This is a source code license, NOT a SaaS subscription.
You are responsible for hosting, maintenance, and compliance.
No refunds after source code is delivered.
```

### Refund Policy (Recommended):

```
7-Day Money-Back Guarantee

If Nodify doesn't meet your needs, request a full refund within 7 days
of purchase. Refunds are only available if you have NOT deployed the
software to production.

After 7 days or production deployment, all sales are final.
```

---

## 📊 Tracking Sales

Create a simple spreadsheet:

| Date | Buyer Email | License Type | Price | Support Until | Updates Until |
|------|-------------|--------------|-------|---------------|---------------|
| 2025-12-09 | buyer@example.com | Pro | $999 | 2026-03-09 | 2026-12-09 |

This helps you:
- Track who to provide support to
- Know when support/updates expire
- Calculate revenue
- Identify popular tiers

---

## 🎯 Marketing Your License

### Where to Sell:

1. **Your Own Website** (best margins)
2. **Gumroad** (easy, 10% fee)
3. **Product Hunt** (launch exposure)
4. **Reddit** r/SaaS, r/entrepreneur (organic)
5. **IndieHackers** (community)
6. **Twitter/X** (build audience first)

### Positioning:

"Deploy your own workflow automation platform like n8n, but with modern UI and AI integration built-in. Own your data, customize everything."

### USPs (Unique Selling Points):

- ✅ Modern React 19 + Next.js 15
- ✅ AI-powered workflows (Gemini integration)
- ✅ 160+ pre-built nodes
- ✅ Custom node creator (Node Labs)
- ✅ Beautiful UI (shadcn/ui)
- ✅ Self-hosted - own your data
- ✅ White-label ready (Pro/Enterprise)

---

## ✅ Pre-Sale Checklist

Before your first sale, ensure:

- [ ] LICENSE file has YOUR company name
- [ ] All placeholders replaced
- [ ] .env.example is complete
- [ ] DEPLOYMENT.md tested on fresh machine
- [ ] README.md has screenshots
- [ ] No secrets in repository
- [ ] Payment method configured (Stripe/PayPal)
- [ ] Support email set up
- [ ] Download hosting ready (Dropbox/Google Drive/S3)
- [ ] Landing page live
- [ ] Refund policy documented

---

## 🚀 Ready to Sell!

Once this checklist is complete, you're ready to sell Nodify source code licenses!

For questions about licensing strategy, email: [YOUR-EMAIL]

---

Good luck with your sales! 🎉
