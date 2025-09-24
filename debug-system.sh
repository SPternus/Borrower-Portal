#!/bin/bash

echo "🔍 DEBUGGING TERNUS SYSTEM..."
echo "================================"

# Test 1: Check if Python server can start
echo "1️⃣ Testing Python Server..."
cd python-server
source venv/bin/activate

# Try to start Python server briefly 
timeout 10s python main.py &
PYTHON_PID=$!
sleep 5

# Test health endpoint
if curl -s http://localhost:5000/health > /dev/null; then
    echo "✅ Python server: WORKING"
    PYTHON_STATUS="OK"
else
    echo "❌ Python server: FAILED"
    PYTHON_STATUS="FAILED"
fi

# Test invitation token API
if curl -s "http://localhost:5000/api/salesforce/contact?invitation_token=testing_sophware_again" | grep -q "contact"; then
    echo "✅ Token API: WORKING"
    TOKEN_STATUS="OK"
else
    echo "❌ Token API: FAILED"
    TOKEN_STATUS="FAILED"
fi

# Stop Python server
kill $PYTHON_PID 2>/dev/null

cd ..

# Test 2: Check frontend
echo ""
echo "2️⃣ Testing Frontend..."
cd client

# Check for compilation errors
if npm run build --dry-run 2>&1 | grep -q "ERROR"; then
    echo "❌ Frontend: COMPILATION ERRORS"
    FRONTEND_STATUS="COMPILATION_ERROR"
else
    echo "✅ Frontend: COMPILES OK"
    FRONTEND_STATUS="OK"
fi

cd ..

# Summary
echo ""
echo "📊 SUMMARY:"
echo "================================"
echo "Python Server: $PYTHON_STATUS"
echo "Token API: $TOKEN_STATUS"  
echo "Frontend: $FRONTEND_STATUS"

if [[ "$PYTHON_STATUS" == "OK" && "$TOKEN_STATUS" == "OK" && "$FRONTEND_STATUS" == "OK" ]]; then
    echo ""
    echo "🎉 SYSTEM LOOKS GOOD!"
    echo "Try running: ./start-servers.sh"
else
    echo ""
    echo "🚨 ISSUES FOUND - CHECK LOGS ABOVE"
fi 