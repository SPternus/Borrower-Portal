#!/bin/bash

# Ternus Python FastAPI Server Startup Script

echo "🐍 Starting Ternus Python FastAPI Server..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Set environment variables
export PORT=5000
export CLIENT_URL="http://localhost:3000"

# Optional: Set SFDC credentials for production
# export SFDC_USERNAME="your-salesforce-username"
# export SFDC_PASSWORD="your-salesforce-password"
# export SFDC_SECURITY_TOKEN="your-security-token"
# export SFDC_DOMAIN="login"  # or "test" for sandbox

echo "🚀 Starting FastAPI server on port $PORT..."
echo "📖 API Documentation: http://localhost:$PORT/docs"
echo "📊 Health Check: http://localhost:$PORT/health"

# Start the server
python main.py 