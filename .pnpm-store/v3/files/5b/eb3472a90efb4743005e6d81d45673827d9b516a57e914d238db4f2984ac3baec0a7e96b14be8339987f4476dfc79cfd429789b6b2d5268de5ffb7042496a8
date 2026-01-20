"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = void 0;
const command_1 = require("../command");
const logger_1 = require("../logger");
const projectUtils_1 = require("../projectUtils");
const requireAuth_1 = require("../requireAuth");
const secretManager = require("../gcp/secretManager");
const requirePermissions_1 = require("../requirePermissions");
const config_1 = require("../apphosting/config");
const secrets_1 = require("../apphosting/secrets");
const path_1 = require("path");
const fs = require("../fsutils");
const yaml_1 = require("../apphosting/yaml");
const error_1 = require("../error");
exports.command = new command_1.Command("apphosting:config:export")
    .description("Export App Hosting configurations such as secrets into an apphosting.local.yaml file")
    .option("-s, --secrets <apphosting.yaml or apphosting.<environment>.yaml file to export secrets from>", "This command combines the base apphosting.yaml with the specified environment-specific file (e.g., apphosting.staging.yaml). If keys conflict, the environment-specific file takes precedence.")
    .before(requireAuth_1.requireAuth)
    .before(secretManager.ensureApi)
    .before(requirePermissions_1.requirePermissions, ["secretmanager.versions.access"])
    .action(async (options) => {
    const projectId = (0, projectUtils_1.needProjectId)(options);
    const environmentConfigFile = options.secrets;
    const cwd = process.cwd();
    let localAppHostingConfig = yaml_1.AppHostingYamlConfig.empty();
    const backendRoot = (0, config_1.discoverBackendRoot)(cwd);
    if (!backendRoot) {
        throw new error_1.FirebaseError("Missing apphosting.yaml: This command requires an apphosting.yaml configuration file. Please run 'firebase init apphosting' and try again.");
    }
    const localAppHostingConfigPath = (0, path_1.resolve)(backendRoot, config_1.APPHOSTING_LOCAL_YAML_FILE);
    if (fs.fileExistsSync(localAppHostingConfigPath)) {
        localAppHostingConfig = await yaml_1.AppHostingYamlConfig.loadFromFile(localAppHostingConfigPath);
    }
    const configToExport = await (0, secrets_1.loadConfigToExport)(cwd, environmentConfigFile);
    const secretsToExport = configToExport.secrets;
    if (!secretsToExport) {
        logger_1.logger.warn("No secrets found to export in the chosen App Hosting config files");
        return;
    }
    const secretMaterial = await (0, secrets_1.fetchSecrets)(projectId, secretsToExport);
    for (const [key, value] of secretMaterial) {
        localAppHostingConfig.addEnvironmentVariable({
            variable: key,
            value: value,
            availability: ["RUNTIME"],
        });
    }
    localAppHostingConfig.upsertFile(localAppHostingConfigPath);
    logger_1.logger.info(`Wrote secrets as environment variables to ${config_1.APPHOSTING_LOCAL_YAML_FILE}.`);
});
