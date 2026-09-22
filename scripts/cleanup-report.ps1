# ═══════════════════════════════════════════════════════════════
# NODIFY CODE CLEANUP REPORT (PowerShell)
# ═══════════════════════════════════════════════════════════════
#
# This script generates a report of code that should be cleaned up
# before selling the source code.
#
# Run: .\scripts\cleanup-report.ps1 > CLEANUP-REPORT.txt
#
# ═══════════════════════════════════════════════════════════════

Write-Host "╔═══════════════════════════════════════════════════════════════╗"
Write-Host "║              NODIFY CODE CLEANUP REPORT                        ║"
Write-Host "╚═══════════════════════════════════════════════════════════════╝"
Write-Host ""
Write-Host "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

# ───────────────────────────────────────────────────────────────
# 1. CONSOLE.LOG STATEMENTS
# ───────────────────────────────────────────────────────────────
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host "1. CONSOLE.LOG STATEMENTS"
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host ""

$consoleFiles = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx
$consoleMatches = $consoleFiles | Select-String -Pattern "console\."

Write-Host "Total console statements found: $($consoleMatches.Count)"
Write-Host ""
Write-Host "Breakdown by type:"
Write-Host "  console.log:   $(($consoleMatches | Where-Object {$_ -match 'console\.log'}).Count)"
Write-Host "  console.error: $(($consoleMatches | Where-Object {$_ -match 'console\.error'}).Count)"
Write-Host "  console.warn:  $(($consoleMatches | Where-Object {$_ -match 'console\.warn'}).Count)"
Write-Host "  console.info:  $(($consoleMatches | Where-Object {$_ -match 'console\.info'}).Count)"
Write-Host ""

Write-Host "Top 10 files with most console statements:"
$consoleMatches | Group-Object -Property Path | Sort-Object -Property Count -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.Count) - $($_.Name)"
}
Write-Host ""

# ───────────────────────────────────────────────────────────────
# 2. TODO/FIXME COMMENTS
# ───────────────────────────────────────────────────────────────
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host "2. TODO/FIXME COMMENTS"
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host ""

$todoMatches = $consoleFiles | Select-String -Pattern "TODO|FIXME"
Write-Host "TODO/FIXME comments found: $($todoMatches.Count)"
Write-Host ""
Write-Host "Details:"
$todoMatches | ForEach-Object {
    Write-Host "  $($_.Path):$($_.LineNumber) - $($_.Line.Trim())"
}
Write-Host ""

# ───────────────────────────────────────────────────────────────
# 3. HARDCODED SECRETS
# ───────────────────────────────────────────────────────────────
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host "3. HARDCODED SECRETS/CREDENTIALS (Potential)"
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host ""

$secretPatterns = "AIza|sk_|pk_|key.*:"
$secretMatches = $consoleFiles | Select-String -Pattern $secretPatterns | Where-Object { $_.Line -notmatch "process\.env" }
Write-Host "Potential hardcoded secrets found: $($secretMatches.Count)"
if ($secretMatches.Count -gt 0) {
    Write-Host "REVIEW THESE FILES:"
    $secretMatches | Select-Object -First 20 | ForEach-Object {
        Write-Host "  $($_.Path):$($_.LineNumber)"
    }
}
Write-Host ""

# ───────────────────────────────────────────────────────────────
# 4. LARGE FILES
# ───────────────────────────────────────────────────────────────
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host "4. LARGE FILES (>1000 lines - Consider splitting)"
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host ""

$largeFiles = $consoleFiles | ForEach-Object {
    $lineCount = (Get-Content $_.FullName | Measure-Object -Line).Lines
    [PSCustomObject]@{
        File = $_.Name
        Path = $_.FullName
        Lines = $lineCount
    }
} | Where-Object { $_.Lines -gt 1000 } | Sort-Object -Property Lines -Descending

if ($largeFiles) {
    $largeFiles | ForEach-Object {
        Write-Host "  $($_.Lines) lines - $($_.Path)"
    }
} else {
    Write-Host "  No files exceed 1000 lines"
}
Write-Host ""

# ───────────────────────────────────────────────────────────────
# 5. PACKAGE.JSON INFO
# ───────────────────────────────────────────────────────────────
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host "5. PACKAGE.JSON INFO"
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host ""

$packageJson = Get-Content package.json | ConvertFrom-Json
Write-Host "Current version: $($packageJson.version)"
Write-Host "License: $($packageJson.license)"
Write-Host ""

# ───────────────────────────────────────────────────────────────
# 6. RECOMMENDATIONS
# ───────────────────────────────────────────────────────────────
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host "6. CLEANUP RECOMMENDATIONS"
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host ""
Write-Host "Before selling source code, ensure:"
Write-Host ""
Write-Host "  1. Replace console.log with structured logging library"
Write-Host "  2. Remove or resolve all TODO/FIXME comments"
Write-Host "  3. Remove large blocks of commented code"
Write-Host "  4. Fix all TypeScript errors: npm run typecheck"
Write-Host "  5. Fix all ESLint warnings: npm run lint --fix"
Write-Host "  6. Remove unused imports and dependencies"
Write-Host "  7. Ensure no hardcoded secrets in code"
Write-Host "  8. Update package.json version to 1.0.0"
Write-Host "  9. Add proper LICENSE file"
Write-Host "  10. Review and split files >1000 lines if needed"
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host "END OF REPORT"
Write-Host "═══════════════════════════════════════════════════════════════"
