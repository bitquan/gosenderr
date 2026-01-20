"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppHostingEmulator = void 0;
const types_1 = require("../types");
const serve_1 = require("./serve");
const utils_1 = require("./utils");
class AppHostingEmulator {
    constructor(args) {
        this.args = args;
    }
    async start() {
        const { hostname, port } = await (0, serve_1.start)({
            startCommand: this.args.startCommandOverride,
        });
        this.args.options.host = hostname;
        this.args.options.port = port;
    }
    connect() {
        utils_1.logger.logLabeled("INFO", types_1.Emulators.APPHOSTING, "connecting apphosting emulator");
        return Promise.resolve();
    }
    stop() {
        utils_1.logger.logLabeled("INFO", types_1.Emulators.APPHOSTING, "stopping apphosting emulator");
        return Promise.resolve();
    }
    getInfo() {
        return {
            name: types_1.Emulators.APPHOSTING,
            host: this.args.options.host,
            port: this.args.options.port,
        };
    }
    getName() {
        return types_1.Emulators.APPHOSTING;
    }
}
exports.AppHostingEmulator = AppHostingEmulator;
