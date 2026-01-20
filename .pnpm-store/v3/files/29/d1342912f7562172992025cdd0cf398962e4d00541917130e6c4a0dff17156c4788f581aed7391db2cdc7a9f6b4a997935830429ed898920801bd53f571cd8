"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = void 0;
const net_1 = require("net");
const portUtils_1 = require("../portUtils");
const utils_1 = require("./utils");
const constants_1 = require("../constants");
const spawn_1 = require("../../init/spawn");
const utils_2 = require("./utils");
const types_1 = require("../types");
const config_1 = require("./config");
async function start(options) {
    const hostname = constants_1.DEFAULT_HOST;
    let port = constants_1.DEFAULT_PORTS.apphosting;
    while (!(await availablePort(hostname, port))) {
        port += 1;
    }
    serve(port, options === null || options === void 0 ? void 0 : options.startCommand);
    return { hostname, port };
}
exports.start = start;
async function serve(port, startCommand) {
    const rootDir = process.cwd();
    const apphostingLocalConfig = await (0, config_1.getLocalAppHostingConfiguration)(rootDir);
    const environmentVariablesAsRecord = {};
    for (const env of apphostingLocalConfig.environmentVariables) {
        environmentVariablesAsRecord[env.variable] = env.value;
    }
    const environmentVariablesToInject = Object.assign(Object.assign({}, environmentVariablesAsRecord), { PORT: port.toString() });
    if (startCommand) {
        utils_2.logger.logLabeled("BULLET", types_1.Emulators.APPHOSTING, `running custom start command: '${startCommand}'`);
        await (0, spawn_1.spawnWithCommandString)(startCommand, rootDir, environmentVariablesToInject);
        return;
    }
    const packageManager = await (0, utils_1.discoverPackageManager)(rootDir);
    utils_2.logger.logLabeled("BULLET", types_1.Emulators.APPHOSTING, `starting app with: '${packageManager} run dev'`);
    await (0, spawn_1.wrapSpawn)(packageManager, ["run", "dev"], rootDir, environmentVariablesToInject);
}
function availablePort(host, port) {
    return (0, portUtils_1.checkListenable)({
        address: host,
        port,
        family: (0, net_1.isIPv4)(host) ? "IPv4" : "IPv6",
    });
}
