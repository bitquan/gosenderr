import { writeFileSync } from "fs";

// Emulator seeding is handled by scripts/start-emulators.sh.
export default async function globalSetup() {
  writeFileSync(".e2e_seed_done", "ok");
  console.log("E2E globalSetup: marker written");
}
