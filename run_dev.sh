#!/bin/bash
#
# run_dev.sh
#
# Purpose: Start both frontend and backend in development mode.
# Usage: ./run_dev.sh (Linux/Mac) or bash run_dev.sh (Windows Git Bash)
#
# Requirements:
# - Node.js installed
# - npm dependencies installed in both frontend/ and backend/
#

echo "=========================================="
echo "🚀 Starting MeetingMind Dev Servers"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
  echo "❌ Error: Must run from project root directory"
  echo "   (should contain both frontend/ and backend/ folders)"
  exit 1
fi

# Install dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  cd frontend && npm install && cd ..
fi

if [ ! -d "backend/node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  cd backend && npm install && cd ..
fi

echo ""
echo "Starting servers..."
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start both servers in parallel
# Use trap to kill both when script exits
trap 'kill $(jobs -p) 2>/dev/null' EXIT

cd backend && npm run dev &
cd frontend && npm run dev &

# Wait for both processes
wait
