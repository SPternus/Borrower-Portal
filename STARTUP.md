# Ternus Application Startup Guide

## 🚀 Quick Start - All Services

### Option 1: Using the Startup Script (Recommended)
```bash
./start-ternus.sh
```

### Option 2: Using NPM
```bash
npm run dev
```

This will start all 4 services:
- **Borrower Portal Client** (Next.js) → http://localhost:3000
- **Borrower Portal API** (Python FastAPI) → http://localhost:5000  
- **Pricing Engine API** (Python FastAPI) → http://localhost:5001
- **Pricing Admin UI** (React) → http://localhost:5173

## 🔧 Individual Service Control

### Start Only Main Application
```bash
npm run dev:main
```
Starts: Client (3000) + Python API (5000)

### Start Only Pricing Engine
```bash
npm run dev:pricing  
```
Starts: Pricing API (5001) + Pricing Admin (5173)

### Individual Services
```bash
npm run client:dev       # Next.js client only
npm run python:dev       # Main Python API only  
npm run pricing:backend  # Pricing API only
npm run pricing:frontend # Pricing Admin UI only
```

## 📦 First Time Setup

### Setup Everything
```bash
npm run setup
```

### Setup Individual Components
```bash
npm run python:setup    # Setup main Python server
npm run pricing:setup   # Setup pricing engine (backend + frontend)
```

## 🛠️ Service Details

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Borrower Portal** | 3000 | http://localhost:3000 | Main borrower interface |
| **Main Python API** | 5000 | http://localhost:5000 | Auth, SFDC, documents |
| **Pricing Engine API** | 5001 | http://localhost:5001 | Loan calculations |
| **Pricing Admin UI** | 5173 | http://localhost:5173 | Pricing management |

## 🔄 Development Workflow

### Hot Reloading
All services support hot reloading:
- **Next.js**: Automatically reloads on file changes
- **FastAPI**: Uses `--reload` flag for auto-restart
- **React**: Vite dev server with hot module replacement

### Stopping Services
- **Ctrl+C** in terminal to stop all services
- Services are managed by `concurrently` with proper cleanup

### Port Conflicts
If ports are in use, services will automatically find available ports:
- Next.js will try 3001, 3002, etc.
- You can manually specify ports in the scripts if needed

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill processes on specific ports
lsof -ti:3000 | xargs kill -9  # Kill port 3000
lsof -ti:5000 | xargs kill -9  # Kill port 5000
lsof -ti:5001 | xargs kill -9  # Kill port 5001
lsof -ti:5173 | xargs kill -9  # Kill port 5173
```

### Python Virtual Environment Issues
```bash
# Recreate virtual environments
npm run python:setup
npm run pricing:setup
```

### Node Modules Issues
```bash
# Reinstall dependencies
rm -rf node_modules client/node_modules pricing-engine/frontend/node_modules
npm install
cd client && npm install
cd ../pricing-engine/frontend && npm install
```

## 🏗️ Architecture

```
Ternus Application Suite
├── client/                 # Next.js borrower portal
├── python-server/          # Main FastAPI backend  
├── pricing-engine/
│   ├── backend/           # Pricing FastAPI service
│   └── frontend/          # Pricing admin React app
└── start-ternus.sh        # Startup script
```

## 🚀 Production Deployment

For production, you'll want to:
1. Build all services: `npm run build`
2. Use process managers like PM2 or Docker
3. Configure reverse proxy (nginx)
4. Set up proper environment variables
5. Use production database connections

---

**Quick Commands:**
- `./start-ternus.sh` - Start everything
- `npm run dev` - Start everything via npm
- `npm run setup` - First time setup
- **Ctrl+C** - Stop all services 