# Make convenience targets for working with Dockerized Firebase Emulators
.PHONY: emu-up emu-stop emu-status emu-restart

EMU_COMPOSE=docker-compose -f docker-compose.dev.yml

emu-up:
	@echo "📦 Building and starting Firebase emulators in Docker..."
	${EMU_COMPOSE} up -d --build firebase-emulators
	./scripts/wait-for-emulators.sh 120 2
	@echo "🎉 Firebase emulators are running"

emu-stop:
	@echo "🛑 Stopping Firebase emulators and removing containers"
	${EMU_COMPOSE} down --remove-orphans

emu-status:
	@echo "📋 Emulator container status"
	docker ps --filter name=gosenderr_firebase_emulators --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

emu-restart: emu-stop emu-up
	@echo "🔄 Emulators restarted"

emu-check:
	@echo "🔎 Checking emulator endpoints from inside the container"
	./scripts/emu-local-check.sh
