#!/bin/bash

# Kill any existing Python processes
pkill -f "python.*main.py" || true

# Clear Python cache
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

# Wait a moment
sleep 2

# Start the server
source venv/bin/activate
python main.py




