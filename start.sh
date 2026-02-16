#!/bin/bash

# TORC MVP Setup and Run Script

echo "================================================"
echo "  TORC MVP - Setup and Launch Script"
echo "================================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v14 or higher."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo ""

# Setup Backend
echo "📦 Setting up Backend..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "   Installing backend dependencies..."
    npm install
else
    echo "   ✓ Backend dependencies already installed"
fi
cd ..
echo ""

# Setup Frontend
echo "📦 Setting up Frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "   Installing frontend dependencies..."
    npm install
else
    echo "   ✓ Frontend dependencies already installed"
fi
cd ..
echo ""

echo "================================================"
echo "  🚀 Starting TORC MVP..."
echo "================================================"
echo ""
echo "Backend will run on: http://localhost:3001"
echo "Frontend will run on: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start Backend (using dev script for nodemon)
cd backend && npm run dev &
BACKEND_PID=$!

# Start Frontend (using dev script for vite)
cd frontend && npm run dev &
FRONTEND_PID=$!

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID