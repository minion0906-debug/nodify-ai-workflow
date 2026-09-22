#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# NODIFY CODE CLEANUP REPORT
# ═══════════════════════════════════════════════════════════════
#
# This script generates a report of code that should be cleaned up
# before selling the source code.
#
# Run: bash scripts/cleanup-report.sh > CLEANUP-REPORT.txt
#
# ═══════════════════════════════════════════════════════════════

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              NODIFY CODE CLEANUP REPORT                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Generated: $(date)"
echo ""

# ───────────────────────────────────────────────────────────────
# 1. CONSOLE.LOG STATEMENTS
# ───────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "1. CONSOLE.LOG STATEMENTS"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Total console.log statements found:"
grep -r "console\." src --include="*.ts" --include="*.tsx" | wc -l
echo ""
echo "Breakdown by type:"
echo "  console.log:   $(grep -r "console\.log" src --include="*.ts" --include="*.tsx" | wc -l)"
echo "  console.error: $(grep -r "console\.error" src --include="*.ts" --include="*.tsx" | wc -l)"
echo "  console.warn:  $(grep -r "console\.warn" src --include="*.ts" --include="*.tsx" | wc -l)"
echo "  console.info:  $(grep -r "console\.info" src --include="*.ts" --include="*.tsx" | wc -l)"
echo ""
echo "Top 10 files with most console statements:"
grep -r "console\." src --include="*.ts" --include="*.tsx" | cut -d':' -f1 | sort | uniq -c | sort -nr | head -10
echo ""

# ───────────────────────────────────────────────────────────────
# 2. TODO/FIXME COMMENTS
# ───────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "2. TODO/FIXME COMMENTS"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "TODO comments found:"
grep -rn "TODO" src --include="*.ts" --include="*.tsx" | wc -l
echo ""
echo "FIXME comments found:"
grep -rn "FIXME" src --include="*.ts" --include="*.tsx" | wc -l
echo ""
echo "Details:"
grep -rn "TODO\|FIXME" src --include="*.ts" --include="*.tsx"
echo ""

# ───────────────────────────────────────────────────────────────
# 3. COMMENTED CODE BLOCKS
# ───────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "3. COMMENTED CODE BLOCKS (Large blocks >5 lines)"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Files with large commented blocks:"
# This is a simplified check - manually review these files
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "^[[:space:]]*//.*{" | head -20
echo ""

# ───────────────────────────────────────────────────────────────
# 4. UNUSED IMPORTS
# ───────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "4. UNUSED IMPORTS"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Run ESLint to check for unused imports:"
echo "  npm run lint 2>&1 | grep 'is defined but never used'"
echo ""

# ───────────────────────────────────────────────────────────────
# 5. TYPESCRIPT ERRORS
# ───────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "5. TYPESCRIPT ERRORS"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Run type checking:"
echo "  npm run typecheck"
echo ""

# ───────────────────────────────────────────────────────────────
# 6. HARDCODED SECRETS/CREDENTIALS
# ───────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "6. HARDCODED SECRETS/CREDENTIALS (Potential)"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Files containing potential API keys or secrets:"
grep -rn "AIza\|sk_\|pk_\|key.*:" src --include="*.ts" --include="*.tsx" | grep -v "process.env" | head -20
echo ""

# ───────────────────────────────────────────────────────────────
# 7. DEPRECATED DEPENDENCIES
# ───────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "7. DEPRECATED DEPENDENCIES"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Run npm audit:"
echo "  npm audit"
echo ""

# ───────────────────────────────────────────────────────────────
# 8. LARGE FILES (>1000 lines)
# ───────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "8. LARGE FILES (>1000 lines - Consider splitting)"
echo "═══════════════════════════════════════════════════════════════"
echo ""
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -nr | head -10
echo ""

# ───────────────────────────────────────────────────────────────
# 9. PACKAGE.JSON VERSION
# ───────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "9. PACKAGE.JSON INFO"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Current version: $(grep '"version"' package.json | head -1)"
echo "License: $(grep '"license"' package.json | head -1)"
echo ""

# ───────────────────────────────────────────────────────────────
# 10. RECOMMENDATIONS
# ───────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "10. CLEANUP RECOMMENDATIONS"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Before selling source code, ensure:"
echo ""
echo "  1. Replace console.log with structured logging library"
echo "  2. Remove or resolve all TODO/FIXME comments"
echo "  3. Remove large blocks of commented code"
echo "  4. Fix all TypeScript errors (npm run typecheck)"
echo "  5. Fix all ESLint warnings (npm run lint --fix)"
echo "  6. Remove unused imports and dependencies"
echo "  7. Ensure no hardcoded secrets in code"
echo "  8. Update package.json version to 1.0.0"
echo "  9. Add proper LICENSE file"
echo "  10. Review and split files >1000 lines if needed"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "END OF REPORT"
echo "═══════════════════════════════════════════════════════════════"
