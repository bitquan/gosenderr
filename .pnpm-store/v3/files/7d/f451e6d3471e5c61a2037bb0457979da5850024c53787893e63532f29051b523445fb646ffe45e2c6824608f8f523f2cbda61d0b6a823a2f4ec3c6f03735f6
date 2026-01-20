"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalAppHostingConfiguration = void 0;
const path_1 = require("path");
const config_1 = require("../../apphosting/config");
async function getLocalAppHostingConfiguration(cwd) {
    const appHostingConfigPaths = (0, config_1.discoverConfigsAtBackendRoot)(cwd);
    const fileNameToPathMap = new Map();
    for (const path of appHostingConfigPaths) {
        const fileName = (0, path_1.basename)(path);
        fileNameToPathMap.set(fileName, path);
    }
    const baseFilePath = fileNameToPathMap.get(config_1.APPHOSTING_BASE_YAML_FILE);
    const localFilePath = fileNameToPathMap.get(config_1.APPHOSTING_LOCAL_YAML_FILE);
    return await (0, config_1.loadConfigForEnvironment)(localFilePath !== null && localFilePath !== void 0 ? localFilePath : baseFilePath, baseFilePath);
}
exports.getLocalAppHostingConfiguration = getLocalAppHostingConfiguration;
