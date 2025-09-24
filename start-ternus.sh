#!/bin/bash

# Ternus Application Startup Script
# This script starts all services: Borrower Portal + Pricing Engine

echo "🚀 Starting Ternus Application Suite..."
echo ""
echo "Services that will start:"
echo "  📱 CLIENT (Next.js)      → http://localhost:3000"
echo "  🐍 PYTHON (FastAPI)      → http://localhost:5000"
echo "  💰 PRICING-BE (FastAPI)  → http://localhost:5001"
echo "  ⚙️  PRICING-FE (React)    → http://localhost:5173"
echo ""
echo "🛠️  Press Ctrl+C to stop all services"
echo "🔄 Services will auto-restart on file changes"
echo ""

# Function to handle cleanup on script exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    # Kill all background processes
    jobs -p | xargs -r kill
    echo "✅ All services stopped"
    exit 0
}

# Set up trap to catch Ctrl+C and cleanup
trap cleanup SIGINT SIGTERM

# Start all services using npm script
npm run dev

# Keep script running
wait 