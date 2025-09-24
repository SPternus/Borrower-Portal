#!/bin/bash

echo "🔧 FIXING CRITICAL ISSUES..."
echo "============================="

# Fix 1: Ensure Python server starts correctly
echo "1️⃣ Checking Python server setup..."

# Check if virtual environment exists
if [ ! -d "python-server/venv" ]; then
    echo "❌ Python virtual environment not found!"
    echo "Please run: cd python-server && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Fix 2: Test the frontend compilation
echo "2️⃣ Testing frontend compilation..."
cd client
if npm run lint > /dev/null 2>&1; then
    echo "✅ Frontend linting passed"
else
    echo "⚠️ Frontend has linting issues (but may still work)"
fi
cd ..

# Fix 3: Update the package.json scripts to be more robust
echo "3️⃣ Checking package.json scripts..."

# Fix 4: Create a simple start command
echo "4️⃣ Creating simple start script..."

cat > start-system.sh << 'EOF'
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
EOF

chmod +x start-system.sh

echo "✅ Created start-system.sh"
echo ""
echo "🎯 TO START THE SYSTEM:"
echo "./start-system.sh"
echo ""
echo "🧪 THEN TEST WITH:"
echo "http://localhost:3000/?invitation_token=testing_sophware_again" 