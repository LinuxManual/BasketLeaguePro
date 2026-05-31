# Check if Git is installed
$gitInstalled = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitInstalled) {
    Write-Host "[-] Git is not installed or not in the PATH." -ForegroundColor Red
    Write-Host "Please download and install Git from: https://git-scm.com/downloads" -ForegroundColor Yellow
    Write-Host "Once Git is installed, you can run this script to deploy." -ForegroundColor Yellow
    Exit
}

Write-Host "[+] Git detected!" -ForegroundColor Green

# Ensure it's a git repo
if (-not (Test-Path .git)) {
    Write-Host "[*] Initializing local git repository..." -ForegroundColor Cyan
    git init
    git branch -M main
}

# Add remote if not present
$remoteExists = git remote | Select-String "origin"
if (-not $remoteExists) {
    Write-Host "[*] Adding remote origin..." -ForegroundColor Cyan
    git remote add origin https://github.com/LinuxManual/BasketLeaguePro.git
}

# Stage files
Write-Host "[*] Staging files..." -ForegroundColor Cyan
git add 404.html README.md index.html package.json script.js server.js styles.css data/store.json deploy.ps1

# Commit files
Write-Host "[*] Committing changes..." -ForegroundColor Cyan
git commit -m "Upgrade to v5.0.0 (Premium glassmorphic theme, Live Match Simulator, Roster details)"

# Push to main branch
Write-Host "[*] Pushing to main branch on GitHub..." -ForegroundColor Cyan
git push -u origin main

# Deploy to gh-pages branch (static files deployment)
Write-Host "[*] Deploying static files to gh-pages branch..." -ForegroundColor Cyan

# Create a temp workspace directory for gh-pages clean deployment
$tempDir = "../BasketLeaguePro_gh_pages_temp"
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy static frontend files to temp directory
Copy-Item 404.html -Destination $tempDir
Copy-Item README.md -Destination $tempDir
Copy-Item index.html -Destination $tempDir
Copy-Item script.js -Destination $tempDir
Copy-Item styles.css -Destination $tempDir

# Create sub-directory data and copy store.json
New-Item -ItemType Directory -Path "$tempDir/data" | Out-Null
Copy-Item data/store.json -Destination "$tempDir/data/"

# Create .nojekyll in temp directory to bypass Jekyll parsing on GitHub Pages
New-Item -ItemType File -Path "$tempDir/.nojekyll" | Out-Null

# Push temp directory as gh-pages branch
Push-Location $tempDir
git init
git branch -M gh-pages
git add .
git commit -m "Deploy static client to GitHub Pages"
git remote add origin https://github.com/LinuxManual/BasketLeaguePro.git
git push -f origin gh-pages
Pop-Location

# Clean up temp directory
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "[+] Deployment completed successfully!" -ForegroundColor Green
Write-Host "Main codebase: https://github.com/LinuxManual/BasketLeaguePro" -ForegroundColor Green
Write-Host "GitHub Pages site: https://LinuxManual.github.io/BasketLeaguePro/" -ForegroundColor Green
