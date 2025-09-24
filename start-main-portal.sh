#!/bin/bash

echo "🚀 Starting Main Ternus Portal"
echo "================================"

# Kill any existing processes on our target ports
echo "🛑 Stopping existing processes on ports 3000 and 5000..."
lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
lsof -ti:5000 | xargs -r kill -9 2>/dev/null || true

# Kill any remaining node/npm processes
killall node npm 2>/dev/null || true

# Wait for processes to die
sleep 3

# Clean Next.js cache
echo "🧹 Cleaning client cache..."
rm -rf client/.next
rm -rf client/node_modules/.cache

echo ""
echo "🐍 Starting Python server (port 5000)..."
cd python-server
if [ ! -d "venv" ]; then
    echo "❌ Python virtual environment not found!"
    echo "Please run: cd python-server && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

source venv/bin/activate
python main.py &
PYTHON_PID=$!
cd ..

# Wait for python server to start
echo "⏳ Waiting for Python server to start..."
sleep 8

# Check if python server is running
if curl -s http://localhost:5000/health > /dev/null; then
    echo "✅ Python server is running"
else
    echo "❌ Python server failed to start"
    exit 1
fi

echo ""
echo "⚛️  Starting Client (port 3000)..."
cd client
PORT=3000 npm run dev &
CLIENT_PID=$!
cd ..

# Wait for client to start
echo "⏳ Waiting for client to start..."
sleep 10

# Check if client is running
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Client is running"
else
    echo "❌ Client failed to start"
fi

echo ""
echo "🎉 Ternus Main Portal Started!"
echo "================================"
echo "🐍 Python API: http://localhost:5000"
echo "📊 Health Check: http://localhost:5000/health"
echo "📖 API Docs: http://localhost:5000/docs"
echo "⚛️  Client App: http://localhost:3000"
echo ""
echo "📋 Process IDs:"
echo "   Python: $PYTHON_PID"
echo "   Client: $CLIENT_PID"
echo ""
echo "🛑 To stop services:"
echo "   kill $PYTHON_PID $CLIENT_PID"
echo ""
echo "💡 The portal should now be accessible at http://localhost:3000"

# Keep script running to monitor processes
wait 