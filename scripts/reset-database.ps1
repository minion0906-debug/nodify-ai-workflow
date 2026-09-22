$dbPath = "data/nodify.db"

# Check if database file exists
if (-not (Test-Path $dbPath)) {
    Write-Host "Database file not found at $dbPath"
    exit
}

# Get all table names, excluding sqlite system tables
$tables = sqlite3 $dbPath "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"

# Loop through each table and delete all rows
foreach ($table in $tables) {
    Write-Host "Resetting table: $table"
    sqlite3 $dbPath "DELETE FROM $table;"
    # Reset autoincrement counter for the table
    sqlite3 $dbPath "DELETE FROM sqlite_sequence WHERE name='$table';"
}

Write-Host "All tables have been reset."
Read-Host -Prompt "Press Enter to exit"