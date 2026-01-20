"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawnWithCommandString = exports.wrapSpawn = void 0;
const spawn = require("cross-spawn");
const logger_1 = require("../logger");
function wrapSpawn(cmd, args, projectDir, environmentVariables) {
    return new Promise((resolve, reject) => {
        const installer = spawn(cmd, args, {
            cwd: projectDir,
            stdio: "inherit",
            env: Object.assign(Object.assign({}, process.env), environmentVariables),
        });
        installer.on("error", (err) => {
            logger_1.logger.debug(err.stack);
        });
        installer.on("close", (code) => {
            if (code === 0) {
                return resolve();
            }
            return reject();
        });
    });
}
exports.wrapSpawn = wrapSpawn;
function spawnWithCommandString(cmd, projectDir, environmentVariables) {
    return new Promise((resolve, reject) => {
        const installer = spawn(cmd, {
            cwd: projectDir,
            stdio: "inherit",
            shell: true,
            env: Object.assign(Object.assign({}, process.env), environmentVariables),
        });
        installer.on("error", (err) => {
            logger_1.logger.log("DEBUG", err.stack);
        });
        installer.on("close", (code) => {
            if (code === 0) {
                return resolve();
            }
            return reject();
        });
    });
}
exports.spawnWithCommandString = spawnWithCommandString;
