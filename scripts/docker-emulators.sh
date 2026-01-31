#!/usr/bin/env bash
# Simple helper to control the Firebase emulator docker service

set -euo pipefail

CMD=${1:-help}

status() {
  docker-compose ps firebase-emulator || true
}

start() {
  echo "Starting firebase emulator container..."
  docker-compose up -d firebase-emulator
  echo "Logs follow (use Ctrl-C to detach):"
  docker-compose logs -f firebase-emulator
}

stop() {
  echo "Stopping firebase emulator container..."
  docker-compose stop firebase-emulator || true
  docker-compose rm -f firebase-emulator || true
  echo "Stopped and removed container"
}

restart() {
  stop
  start
}

logs() {
  docker-compose logs -f firebase-emulator
}

case "$CMD" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    restart
    ;;
  logs)
    logs
    ;;
  status)
    status
    ;;
  help|*)
    cat <<EOF
Usage: $(basename "$0") <command>
Commands:
  start     Start emulator container and tail logs
  stop      Stop and remove the emulator container
  restart   Stop then start
  logs      Tail the emulator container logs
  status    Show container status
  help      Show this message
EOF
    ;;
esac
