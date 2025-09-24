#!/bin/bash

echo "🚀 Starting Ternus System..."

# Kill any existing processes
pkill -f "python main.py" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Start Python server
echo "🐍 Starting Python server..."
cd python-server
source venv/bin/activate
python main.py &
PYTHON_PID=$!
cd ..

# Wait for Python server
sleep 5

# Test Python server
if curl -s http://localhost:5000/health > /dev/null; then
    echo "✅ Python server started successfully"
else
    echo "❌ Python server failed to start"
    kill $PYTHON_PID 2>/dev/null
    exit 1
fi

# Start frontend
echo "⚛️ Starting frontend..."
cd client
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 System starting up..."
echo "📊 Backend: http://localhost:5000"
echo "🌐 Frontend: http://localhost:3000"
echo "🧪 Test URL: http://localhost:3000/?invitation_token=testing_sophware_again"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for user to stop
trap 'echo "Stopping servers..."; kill $PYTHON_PID $FRONTEND_PID 2>/dev/null; exit 0' INT
wait
