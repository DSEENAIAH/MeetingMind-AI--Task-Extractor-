#!/usr/bin/env pwsh

# Local development script for MeetingMind AI
Write-Host "🚀 Starting MeetingMind AI Local Development..." -ForegroundColor Green

# Check if Node.js is installed
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Navigate to frontend directory
Set-Location "frontend"

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚙️ Creating .env file from example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "📝 Please update the .env file with your Supabase credentials!" -ForegroundColor Yellow
    } else {
        Write-Host "❌ .env.example not found. Please create .env manually." -ForegroundColor Red
    }
}

Write-Host "🌐 Starting development server on http://localhost:5173" -ForegroundColor Green
Write-Host "📱 The app will open in your default browser" -ForegroundColor Cyan
Write-Host "🔄 Press Ctrl+C to stop the server" -ForegroundColor Yellow

# Start the development server
npm run dev