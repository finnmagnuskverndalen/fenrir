#!/bin/bash

# Fenrir - Network Security Scanner
# Starts both backend and frontend in one terminal

cd "$(dirname "$0")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}"
echo "  ███████╗███████╗███╗   ██╗██████╗ ██╗██████╗ "
echo "  ██╔════╝██╔════╝████╗  ██║██╔══██╗██║██╔══██╗"
echo "  █████╗  █████╗  ██╔██╗ ██║██████╔╝██║██████╔╝"
echo "  ██╔══╝  ██╔══╝  ██║╚██╗██║██╔══██╗██║██╔══██╗"
echo "  ██║     ███████╗██║ ╚████║██║  ██║██║██║  ██║"
echo "  ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "${YELLOW}  Network Security Scanner — starting up...${NC}"
echo ""

# Activate venv
if [ ! -d "venv" ]; then
    echo -e "${RED}✗ venv not found. Run: python3 -m venv venv && pip install -r requirements.txt${NC}"
    exit 1
fi
source venv/bin/activate

# Check scope.txt
if [ ! -f "scope.txt" ] || [ ! -s "scope.txt" ]; then
    echo -e "${YELLOW}⚠ scope.txt is empty. Add your CIDR range:${NC}"
    echo -e "  echo '192.168.x.0/24' > scope.txt"
    exit 1
fi

# Check .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env not found. Copying from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}  Edit .env and add your OPENROUTER_API_KEY${NC}"
fi

# Fix file watcher limit
ulimit -n 65536 2>/dev/null

# Install frontend deps if needed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

echo -e "${GREEN}✓ Starting backend on http://127.0.0.1:8765${NC}"
echo -e "${GREEN}✓ Starting frontend on http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}  Press Ctrl+C to stop both services${NC}"
echo ""

# Trap Ctrl+C to kill both processes
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping Fenrir...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}
trap cleanup INT TERM

# Start backend
python run.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for both
wait $BACKEND_PID $FRONTEND_PID
