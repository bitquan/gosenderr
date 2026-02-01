#!/bin/bash
#
# Phase 1 Admin Desktop Development Startup Script
#
# This script starts all required services for admin-desktop development:
# 1. Firebase Emulators (Auth, Firestore, Storage, Functions)
# 2. Vite Dev Server (port 5176)
# 3. Electron App (depends on Vite)
#
# Usage:
#   ./scripts/start-phase1.sh           # Start all services
#   ./scripts/start-phase1.sh --docker  # Use Docker Compose instead
#   ./scripts/start-phase1.sh --stop    # Stop all services
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Stop function
stop_services() {
    log_info "Stopping Phase 1 services..."
    
    # Kill Electron processes
    if pgrep -f "electron.*admin-desktop" > /dev/null; then
        log_info "Stopping Electron..."
        pkill -f "electron.*admin-desktop" || true
        log_success "Electron stopped"
    fi
    
    # Kill Vite dev server (port 5176)
    if lsof -ti:5176 > /dev/null 2>&1; then
        log_info "Stopping Vite dev server (port 5176)..."
        lsof -ti:5176 | xargs kill -9 2>/dev/null || true
        log_success "Vite stopped"
    fi
    
    # Kill Firebase emulators (ports 4000, 8080, 9099, 9199)
    if lsof -ti:4000,8080,9099,9199 > /dev/null 2>&1; then
        log_info "Stopping Firebase emulators..."
        lsof -ti:4000,8080,9099,9199 | xargs kill -9 2>/dev/null || true
        log_success "Firebase emulators stopped"
    fi
    
    # Stop Docker if running
    if docker compose ps | grep -q "Up"; then
        log_info "Stopping Docker services..."
        docker compose down
        log_success "Docker stopped"
    fi
    
    log_success "All Phase 1 services stopped"
    exit 0
}

# Docker mode
start_docker() {
    log_info "Starting Phase 1 services via Docker Compose..."
    
    cd "$PROJECT_ROOT"
    
    # Start firebase-emulator and admin-desktop services
    docker compose up -d firebase-emulator admin-desktop
    
    log_success "Docker services started"
    log_info "Vite dev server: http://localhost:5176"
    log_info "Firebase Emulator UI: http://localhost:4000"
    log_warning "Note: Electron app must be started natively (not in Docker)"
    log_info "Run: cd apps/admin-desktop && pnpm electron"
    
    exit 0
}

# Native mode (default)
start_native() {
    log_info "Starting Phase 1 services natively..."
    
    cd "$PROJECT_ROOT"
    
    # Check if ports are already in use
    if lsof -ti:4000,8080,9099,9199,5176 > /dev/null 2>&1; then
        log_warning "Some ports are already in use. Stop existing services? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            stop_services
            sleep 2
        else
            log_error "Cannot start services with ports in use"
            exit 1
        fi
    fi
    
    # Start Firebase emulators in background
    log_info "Starting Firebase emulators..."
    ./scripts/start-emulators.sh &
    EMULATOR_PID=$!
    
    # Wait for emulators to be ready
    log_info "Waiting for Firebase emulators to start..."
    for i in {1..30}; do
        if curl -s http://localhost:4000 > /dev/null 2>&1; then
            log_success "Firebase emulators ready"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Firebase emulators failed to start"
            exit 1
        fi
        sleep 1
    done
    
    # Start Vite dev server in background
    log_info "Starting Vite dev server..."
    cd "$PROJECT_ROOT/apps/admin-desktop"
    pnpm vite --port 5176 --host 127.0.0.1 > "$PROJECT_ROOT/logs/vite.log" 2>&1 &
    VITE_PID=$!
    
    # Wait for Vite to be ready
    log_info "Waiting for Vite dev server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:5176 > /dev/null 2>&1; then
            log_success "Vite dev server ready"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Vite dev server failed to start"
            kill $EMULATOR_PID 2>/dev/null || true
            exit 1
        fi
        sleep 1
    done
    
    # Give Vite a moment to fully initialize before starting Electron
    sleep 2
    
    # Start Electron app
    log_info "Starting Electron app..."
    cd "$PROJECT_ROOT/apps/admin-desktop"
    pnpm electron &
    ELECTRON_PID=$!
    
    log_success "All Phase 1 services started!"
    echo ""
    log_info "Service URLs:"
    echo "  - Vite Dev Server:      http://localhost:5176"
    echo "  - Firebase Emulator UI: http://localhost:4000"
    echo "  - Firestore:            http://localhost:8080"
    echo "  - Auth:                 http://localhost:9099"
    echo "  - Storage:              http://localhost:9199"
    echo ""
    log_info "Process IDs:"
    echo "  - Emulators: $EMULATOR_PID"
    echo "  - Vite:      $VITE_PID"
    echo "  - Electron:  $ELECTRON_PID"
    echo ""
    log_info "To stop services: ./scripts/start-phase1.sh --stop"
    echo ""
    log_info "Logs:"
    echo "  - Vite: $PROJECT_ROOT/logs/vite.log"
    echo ""
    
    # Keep script running and forward signals to child processes
    trap "log_info 'Stopping services...'; kill $EMULATOR_PID $VITE_PID $ELECTRON_PID 2>/dev/null; exit 0" SIGINT SIGTERM
    
    wait
}

# Main
case "${1:-}" in
    --stop)
        stop_services
        ;;
    --docker)
        start_docker
        ;;
    --help|-h)
        echo "Phase 1 Admin Desktop Development Startup Script"
        echo ""
        echo "Usage:"
        echo "  $0           # Start all services natively"
        echo "  $0 --docker  # Use Docker Compose"
        echo "  $0 --stop    # Stop all services"
        echo "  $0 --help    # Show this message"
        echo ""
        echo "Services started:"
        echo "  - Firebase Emulators (ports 4000, 8080, 9099, 9199)"
        echo "  - Vite Dev Server (port 5176)"
        echo "  - Electron App"
        exit 0
        ;;
    "")
        start_native
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac
