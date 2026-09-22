$port = 9003
$foundProcesses = netstat -ano | findstr ":$port"

if ($foundProcesses) {
    $pids = @()

    foreach ($line in $foundProcesses) {
        $fields = $line -split '\s+' | Where-Object { $_ -ne '' }
        $procId = $fields[-1]

        # Asegura que sea numérico y distinto de 0
        if ($procId -match '^\d+$' -and $procId -ne 0 -and ($pids -notcontains $procId)) {
            $pids += $procId
        }
    }

    foreach ($procId in $pids) {
        try {
            Write-Host "Killing process with PID $procId on port $port..."
            taskkill /PID $procId /F | Out-Null
            Write-Host "✅ Process $procId terminated successfully."
        } catch {
            Write-Host ("⚠️ Failed to terminate PID {0}: {1}" -f $procId, $_.Exception.Message)
        }
    }

    Write-Host "✅ All valid processes using port $port have been terminated."
} else {
    Write-Host "ℹ️ No active process found on port $port."
}
