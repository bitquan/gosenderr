"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfigForEnvironment = exports.maybeAddSecretToYaml = exports.upsertEnv = exports.findEnv = exports.store = exports.load = exports.discoverConfigsAtBackendRoot = exports.discoverBackendRoot = exports.APPHOSTING_YAML_FILE_REGEX = exports.APPHOSTING_LOCAL_YAML_FILE = exports.APPHOSTING_BASE_YAML_FILE = void 0;
const path_1 = require("path");
const fs_1 = require("fs");
const yaml = require("yaml");
const fs = require("../fsutils");
const prompt = require("../prompt");
const dialogs = require("./secrets/dialogs");
const yaml_1 = require("./yaml");
const error_1 = require("../error");
exports.APPHOSTING_BASE_YAML_FILE = "apphosting.yaml";
exports.APPHOSTING_LOCAL_YAML_FILE = "apphosting.local.yaml";
exports.APPHOSTING_YAML_FILE_REGEX = /^apphosting(\.[a-z0-9_]+)?\.yaml$/;
function discoverBackendRoot(cwd) {
    let dir = cwd;
    while (!fs.fileExistsSync((0, path_1.resolve)(dir, exports.APPHOSTING_BASE_YAML_FILE))) {
        if (fs.fileExistsSync((0, path_1.resolve)(dir, "firebase.json"))) {
            return null;
        }
        const parent = (0, path_1.dirname)(dir);
        if (parent === dir) {
            return null;
        }
        dir = parent;
    }
    return dir;
}
exports.discoverBackendRoot = discoverBackendRoot;
function discoverConfigsAtBackendRoot(cwd) {
    const backendRoot = discoverBackendRoot(cwd);
    if (!backendRoot) {
        throw new error_1.FirebaseError("Unable to find your project's root, ensure the apphosting.yaml config is initialized. Try 'firebase init apphosting'");
    }
    return listAppHostingFilesInPath(backendRoot);
}
exports.discoverConfigsAtBackendRoot = discoverConfigsAtBackendRoot;
function listAppHostingFilesInPath(path) {
    return fs
        .listFiles(path)
        .filter((file) => exports.APPHOSTING_YAML_FILE_REGEX.test(file))
        .map((file) => (0, path_1.join)(path, file));
}
function load(yamlPath) {
    const raw = fs.readFile(yamlPath);
    return yaml.parseDocument(raw);
}
exports.load = load;
function store(yamlPath, document) {
    (0, fs_1.writeFileSync)(yamlPath, document.toString());
}
exports.store = store;
function findEnv(document, variable) {
    if (!document.has("env")) {
        return undefined;
    }
    const envs = document.get("env");
    for (const env of envs.items) {
        if (env.get("variable") === variable) {
            return env.toJSON();
        }
    }
    return undefined;
}
exports.findEnv = findEnv;
function upsertEnv(document, env) {
    if (!document.has("env")) {
        document.set("env", document.createNode([env]));
        return;
    }
    const envs = document.get("env");
    const envYaml = document.createNode(env);
    for (let i = 0; i < envs.items.length; i++) {
        if (envs.items[i].get("variable") === env.variable) {
            envs.set(i, envYaml);
            return;
        }
    }
    envs.add(envYaml);
}
exports.upsertEnv = upsertEnv;
async function maybeAddSecretToYaml(secretName) {
    const dynamicDispatch = exports;
    const backendRoot = dynamicDispatch.discoverBackendRoot(process.cwd());
    let path;
    let projectYaml;
    if (backendRoot) {
        path = (0, path_1.join)(backendRoot, exports.APPHOSTING_BASE_YAML_FILE);
        projectYaml = dynamicDispatch.load(path);
    }
    else {
        projectYaml = new yaml.Document();
    }
    if (dynamicDispatch.findEnv(projectYaml, secretName)) {
        return;
    }
    const addToYaml = await prompt.confirm({
        message: "Would you like to add this secret to apphosting.yaml?",
        default: true,
    });
    if (!addToYaml) {
        return;
    }
    if (!path) {
        path = await prompt.promptOnce({
            message: "It looks like you don't have an apphosting.yaml yet. Where would you like to store it?",
            default: process.cwd(),
        });
        path = (0, path_1.join)(path, exports.APPHOSTING_BASE_YAML_FILE);
    }
    const envName = await dialogs.envVarForSecret(secretName);
    dynamicDispatch.upsertEnv(projectYaml, {
        variable: envName,
        secret: secretName,
    });
    dynamicDispatch.store(path, projectYaml);
}
exports.maybeAddSecretToYaml = maybeAddSecretToYaml;
async function loadConfigForEnvironment(envYamlPath, baseYamlPath) {
    const envYamlConfig = await yaml_1.AppHostingYamlConfig.loadFromFile(envYamlPath);
    if (baseYamlPath) {
        const baseConfig = await yaml_1.AppHostingYamlConfig.loadFromFile(baseYamlPath);
        baseConfig.merge(envYamlConfig);
        return baseConfig;
    }
    return envYamlConfig;
}
exports.loadConfigForEnvironment = loadConfigForEnvironment;
