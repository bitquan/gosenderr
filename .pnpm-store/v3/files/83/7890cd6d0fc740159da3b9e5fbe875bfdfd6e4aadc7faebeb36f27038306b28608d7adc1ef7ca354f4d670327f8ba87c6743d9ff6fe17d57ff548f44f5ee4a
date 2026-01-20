"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverPackageManager = exports.logger = void 0;
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const emulatorLogger_1 = require("../emulatorLogger");
const types_1 = require("../types");
exports.logger = emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.APPHOSTING);
async function discoverPackageManager(rootdir) {
    if (await (0, fs_extra_1.pathExists)((0, path_1.join)(rootdir, "pnpm-lock.yaml"))) {
        return "pnpm";
    }
    if (await (0, fs_extra_1.pathExists)((0, path_1.join)(rootdir, "yarn.lock"))) {
        return "yarn";
    }
    return "npm";
}
exports.discoverPackageManager = discoverPackageManager;
