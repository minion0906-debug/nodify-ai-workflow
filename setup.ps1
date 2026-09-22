# ═══════════════════════════════════════════════════════════════
# NODIFY SETUP WIZARD (PowerShell)
# ═══════════════════════════════════════════════════════════════
#
# This script helps you configure Nodify for your environment.
# Run: .\setup.ps1
#
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║                 NODIFY SETUP WIZARD                            ║" -ForegroundColor Blue
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# ─────────────────────────────────────────────────────────────────
# 1. Check Prerequisites
# ─────────────────────────────────────────────────────────────────
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

# Check Node.js
try {
    $nodeVersion = (node -v).TrimStart('v').Split('.')[0]
    $requiredVersion = 18

    if ([int]$nodeVersion -lt $requiredVersion) {
        Write-Host "❌ Node.js $requiredVersion+ required. Current: v$nodeVersion" -ForegroundColor Red
        Write-Host "Please upgrade Node.js from https://nodejs.org/" -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Node.js v$nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = (npm -v)
    Write-Host "✅ npm v$npmVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ─────────────────────────────────────────────────────────────────
# 2. Create .env.local
# ─────────────────────────────────────────────────────────────────
Write-Host "[2/6] Configuring environment variables..." -ForegroundColor Yellow
Write-Host ""

$envSkipped = $false

if (Test-Path .env.local) {
    Write-Host "⚠️  .env.local already exists" -ForegroundColor Yellow
    $overwrite = Read-Host "Overwrite? (y/N)"

    if ($overwrite -ne 'y' -and $overwrite -ne 'Y') {
        Write-Host "Skipping .env.local creation"
        $envSkipped = $true
    } else {
        Remove-Item .env.local
    }
}

if (-not $envSkipped) {
    Write-Host "Let's configure your Firebase and API keys."
    Write-Host ""

    # Generate Secrets
    Write-Host "Generating security secrets..." -ForegroundColor Blue
    $webhookSecret = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    $cronSecret = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    Write-Host "✅ Generated webhook and cron secrets" -ForegroundColor Green
    Write-Host ""

    # Firebase Config
    Write-Host "Firebase Configuration" -ForegroundColor Blue
    Write-Host "Get these from: Firebase Console → Project Settings → Your apps → Web app"
    Write-Host ""

    $firebaseApiKey = Read-Host "Firebase API Key"
    $firebaseAuthDomain = Read-Host "Firebase Auth Domain (e.g., project-id.firebaseapp.com)"
    $firebaseProjectId = Read-Host "Firebase Project ID"
    $firebaseStorageBucket = Read-Host "Firebase Storage Bucket (e.g., project-id.appspot.com)"
    $firebaseMessagingSenderId = Read-Host "Firebase Messaging Sender ID"
    $firebaseAppId = Read-Host "Firebase App ID"

    Write-Host ""
    Write-Host "Firebase Admin (Service Account)" -ForegroundColor Blue
    Write-Host "Get from: Firebase Console → Project Settings → Service Accounts → Generate new private key"
    Write-Host ""

    $hasServiceAccount = Read-Host "Have you downloaded the service account JSON file? (y/N)"

    $firebaseServiceAccountBase64 = ""
    if ($hasServiceAccount -eq 'y' -or $hasServiceAccount -eq 'Y') {
        $serviceAccountPath = Read-Host "Path to service account JSON file"

        if (Test-Path $serviceAccountPath) {
            $serviceAccountBytes = [System.IO.File]::ReadAllBytes($serviceAccountPath)
            $firebaseServiceAccountBase64 = [Convert]::ToBase64String($serviceAccountBytes)
            Write-Host "✅ Service account loaded and encoded" -ForegroundColor Green
        } else {
            Write-Host "❌ File not found: $serviceAccountPath" -ForegroundColor Red
            Write-Host "Skipping service account configuration - you'll need to add it manually"
        }
    } else {
        Write-Host "Skipping service account - you'll need to add FIREBASE_SERVICE_ACCOUNT_BASE64 manually"
    }

    Write-Host ""
    Write-Host "Google Gemini AI" -ForegroundColor Blue
    Write-Host "Get API key from: https://makersuite.google.com/app/apikey"
    Write-Host ""
    $geminiApiKey = Read-Host "Gemini API Key (or press Enter to skip)"

    # Create .env.local
    $envContent = @"
# ═══════════════════════════════════════════════════════════════
# NODIFY ENVIRONMENT CONFIGURATION
# Generated by setup.ps1 on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# ═══════════════════════════════════════════════════════════════

# Webhooks & Security
WEBHOOK_SECRET_TOKEN=$webhookSecret
CRON_SECRET=$cronSecret

# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=$firebaseApiKey
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$firebaseAuthDomain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$firebaseProjectId
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$firebaseStorageBucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$firebaseMessagingSenderId
NEXT_PUBLIC_FIREBASE_APP_ID=$firebaseAppId

# Firebase Admin (Server-side)
FIREBASE_STORAGE_BUCKET=$firebaseStorageBucket
FIREBASE_SERVICE_ACCOUNT_BASE64=$firebaseServiceAccountBase64

# Google AI (Gemini)
GEMINI_API_KEY=$geminiApiKey

# ═══════════════════════════════════════════════════════════════
# OPTIONAL CONFIGURATION
# See .env.example for more options (email, analytics, etc.)
# ═══════════════════════════════════════════════════════════════
"@

    $envContent | Out-File -FilePath .env.local -Encoding utf8
    Write-Host "✅ .env.local created successfully" -ForegroundColor Green
    Write-Host ""
}

# ─────────────────────────────────────────────────────────────────
# 3. Install Dependencies
# ─────────────────────────────────────────────────────────────────
Write-Host "[3/6] Installing dependencies..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..."
Write-Host ""

try {
    npm ci
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
Write-Host ""

# ─────────────────────────────────────────────────────────────────
# 4. Firebase Setup Reminder
# ─────────────────────────────────────────────────────────────────
Write-Host "[4/6] Firebase setup checklist..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Make sure you've completed these Firebase steps:"
Write-Host ""
Write-Host "☐ Created Firebase project" -ForegroundColor Blue
Write-Host "☐ Enabled Authentication (Email/Password provider)" -ForegroundColor Blue
Write-Host "☐ Created Firestore database" -ForegroundColor Blue
Write-Host "☐ Enabled Storage" -ForegroundColor Blue
Write-Host "☐ Deployed security rules: firebase deploy --only firestore:rules" -ForegroundColor Blue
Write-Host ""
Read-Host "Press Enter to continue..."
Write-Host ""

# ─────────────────────────────────────────────────────────────────
# 5. Build Application
# ─────────────────────────────────────────────────────────────────
Write-Host "[5/6] Building application..." -ForegroundColor Yellow
Write-Host "This will verify everything is configured correctly..."
Write-Host ""

try {
    npm run build
    Write-Host "✅ Build successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed" -ForegroundColor Red
    Write-Host "Please check the error messages above and fix any issues"
    Write-Host ""
    Write-Host "Common issues:"
    Write-Host "  - Missing environment variables in .env.local"
    Write-Host "  - TypeScript errors in custom code"
    exit 1
}
Write-Host ""

# ─────────────────────────────────────────────────────────────────
# 6. Summary & Next Steps
# ─────────────────────────────────────────────────────────────────
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    SETUP COMPLETE! 🎉                          ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Blue
Write-Host ""
Write-Host "  1. Start development server:" -ForegroundColor Green
Write-Host "     npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "  2. Open your browser:" -ForegroundColor Green
Write-Host "     http://localhost:9003" -ForegroundColor Yellow
Write-Host ""
Write-Host "  3. Create your first user account (will be stored in Firebase)" -ForegroundColor Green
Write-Host ""
Write-Host "  4. (Optional) Make first user admin:" -ForegroundColor Green
Write-Host "     - Go to Firebase Console → Firestore"
Write-Host "     - Find your user document in 'users' collection"
Write-Host "     - Add field: role = super_admin" -ForegroundColor Yellow
Write-Host ""
Write-Host "For production deployment:" -ForegroundColor Blue
Write-Host "  - Read DEPLOYMENT.md for detailed instructions" -ForegroundColor Yellow
Write-Host "  - Run npm start after building" -ForegroundColor Yellow
Write-Host ""
Write-Host "Need help?" -ForegroundColor Blue
Write-Host "  - Documentation: ./docs/" -ForegroundColor Yellow
Write-Host "  - Troubleshooting: DEPLOYMENT.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "Happy automating! 🚀" -ForegroundColor Green
Write-Host ""
