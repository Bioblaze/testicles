# delete-all-issues.ps1
# Uses GitHub CLI (gh) to delete all issues in the current repo.
# Requires: gh CLI installed and authenticated (gh auth login)

param(
    [string]$Repo,           # Optional: OWNER/REPO format, e.g. "owner/repo"
    [switch]$DryRun,         # List issues without deleting
    [int]$Limit = 1000       # Max issues to fetch (gh default limit)
)

$ErrorActionPreference = "Stop"

# Build gh base args
$ghArgs = @("issue", "list", "--state", "all", "--limit", $Limit, "--json", "number")
if ($Repo) {
    $ghArgs += @("--repo", $Repo)
}

Write-Host "Fetching issues..." -ForegroundColor Cyan
$numbersJson = gh @ghArgs 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "gh issue list failed: $numbersJson"
    exit 1
}

$numbers = $numbersJson | ConvertFrom-Json
$issueNumbers = $numbers | ForEach-Object { $_.number } | Sort-Object -Descending
$count = $issueNumbers.Count

if ($count -eq 0) {
    Write-Host "No issues found." -ForegroundColor Green
    exit 0
}

Write-Host "Found $count issue(s)." -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "Dry run - would delete: $($issueNumbers -join ', ')" -ForegroundColor Gray
    exit 0
}

$deleteArgs = @("issue", "delete")
if ($Repo) { $deleteArgs += @("--repo", $Repo) }
$deleteArgs += "--yes"

$deleted = 0
$failed = 0
foreach ($num in $issueNumbers) {
    $result = gh @deleteArgs $num 2>&1
    if ($LASTEXITCODE -eq 0) {
        $deleted++
        Write-Host "  Deleted #$num" -ForegroundColor Green
    } else {
        $failed++
        Write-Host "  Failed #$num : $result" -ForegroundColor Red
    }
}

Write-Host "`nDone. Deleted: $deleted, Failed: $failed" -ForegroundColor Cyan
if ($failed -gt 0) { exit 1 }
