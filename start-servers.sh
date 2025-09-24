#!/bin/bash

echo "🚀 Starting Ternus Borrower Profile System..."

# Function to check if port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
}

# Function to kill processes on port
kill_port() {
    if check_port $1; then
        echo "⚠️  Port $1 is in use, killing existing processes..."
        lsof -ti :$1 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Clean up ports
kill_port 5000  # Python server
kill_port 3000  # Next.js server

echo "🐍 Starting Python server on port 5000..."
cd python-server
source venv/bin/activate
python main.py &
PYTHON_PID=$!

# Wait for Python server to start
sleep 3

# Check if Python server is running
if curl -s http://localhost:5000/health > /dev/null; then
    echo "✅ Python server started successfully"
else
    echo "❌ Python server failed to start"
    kill $PYTHON_PID 2>/dev/null
    exit 1
fi

echo "⚛️  Starting Next.js client on port 3000..."
cd ../client
npm run dev &
NEXTJS_PID=$!

# Wait for Next.js to start
sleep 5

# Check if Next.js server is running
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Next.js client started successfully"
else
    echo "❌ Next.js client failed to start"
    kill $PYTHON_PID $NEXTJS_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 System started successfully!"
echo "📊 Python API: http://localhost:5000"
echo "📊 Health check: http://localhost:5000/health"
echo "🌐 Frontend: http://localhost:3000"
echo "🧪 Test with: http://localhost:3000/?invitation_token=testing_sophware_again"
echo ""
echo "Press Ctrl+C to stop all servers"

# Handle Ctrl+C
trap 'echo "Stopping servers..."; kill $PYTHON_PID $NEXTJS_PID 2>/dev/null; exit 0' INT

# Wait for both processes
wait $PYTHON_PID $NEXTJS_PID 