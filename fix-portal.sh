#!/bin/bash

echo "🔧 Fixing Main Portal - Stopping existing processes and restarting on consistent ports"

# Kill any existing processes on ports 3000 and 5000
echo "🛑 Stopping existing processes..."
lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
lsof -ti:5000 | xargs -r kill -9 2>/dev/null || true

# Wait a moment for processes to die
sleep 2

# Clean Next.js cache
echo "🧹 Cleaning Next.js cache..."
rm -rf client/.next
rm -rf client/node_modules/.cache

# Start the python server first (port 5000)
echo "🐍 Starting Python server on port 5000..."
cd python-server && source venv/bin/activate && python main.py &
PYTHON_PID=$!

# Wait for python server to start
sleep 5

# Start the client on port 3000
echo "⚛️  Starting Client on port 3000..."
cd ../client && PORT=3000 npm run dev &
CLIENT_PID=$!

echo "✅ Services started:"
echo "🐍 Python Server: http://localhost:5000 (PID: $PYTHON_PID)"
echo "⚛️  Client: http://localhost:3000 (PID: $CLIENT_PID)"
echo ""
echo "To stop services: kill $PYTHON_PID $CLIENT_PID"

# Keep script running
wait 