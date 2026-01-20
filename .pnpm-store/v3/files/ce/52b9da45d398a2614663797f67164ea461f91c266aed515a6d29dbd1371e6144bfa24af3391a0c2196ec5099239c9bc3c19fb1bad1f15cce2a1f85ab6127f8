"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isExtensionSpec = exports.isResource = exports.isParam = exports.isObject = exports.ParamType = exports.FUNCTIONS_V2_RESOURCE_TYPE = exports.FUNCTIONS_RESOURCE_TYPE = exports.isExtensionInstance = exports.Visibility = exports.RegistryLaunchStage = void 0;
var RegistryLaunchStage;
(function (RegistryLaunchStage) {
    RegistryLaunchStage["EXPERIMENTAL"] = "EXPERIMENTAL";
    RegistryLaunchStage["BETA"] = "BETA";
    RegistryLaunchStage["GA"] = "GA";
    RegistryLaunchStage["DEPRECATED"] = "DEPRECATED";
    RegistryLaunchStage["REGISTRY_LAUNCH_STAGE_UNSPECIFIED"] = "REGISTRY_LAUNCH_STAGE_UNSPECIFIED";
})(RegistryLaunchStage = exports.RegistryLaunchStage || (exports.RegistryLaunchStage = {}));
var Visibility;
(function (Visibility) {
    Visibility["UNLISTED"] = "unlisted";
    Visibility["PUBLIC"] = "public";
})(Visibility = exports.Visibility || (exports.Visibility = {}));
const extensionInstanceState = [
    "STATE_UNSPECIFIED",
    "DEPLOYING",
    "UNINSTALLING",
    "ACTIVE",
    "ERRORED",
    "PAUSED",
];
const isExtensionInstance = (value) => {
    if (!isObject(value) || typeof value.name !== "string") {
        return false;
    }
    return true;
};
exports.isExtensionInstance = isExtensionInstance;
const lifecycleStages = ["STAGE_UNSPECIFIED", "ON_INSTALL", "ON_UPDATE", "ON_CONFIGURE"];
exports.FUNCTIONS_RESOURCE_TYPE = "firebaseextensions.v1beta.function";
exports.FUNCTIONS_V2_RESOURCE_TYPE = "firebaseextensions.v1beta.v2function";
var ParamType;
(function (ParamType) {
    ParamType["STRING"] = "STRING";
    ParamType["SELECT"] = "SELECT";
    ParamType["MULTISELECT"] = "MULTISELECT";
    ParamType["SELECT_RESOURCE"] = "SELECT_RESOURCE";
    ParamType["SECRET"] = "SECRET";
})(ParamType = exports.ParamType || (exports.ParamType = {}));
function isObject(value) {
    return typeof value === "object" && value !== null;
}
exports.isObject = isObject;
const isParam = (param) => {
    return (isObject(param) && typeof param["param"] === "string" && typeof param["label"] === "string");
};
exports.isParam = isParam;
const isResource = (res) => {
    return isObject(res) && typeof res["name"] === "string";
};
exports.isResource = isResource;
const isExtensionSpec = (spec) => {
    if (!isObject(spec) || typeof spec.name !== "string" || typeof spec.version !== "string") {
        return false;
    }
    if (spec.resources && Array.isArray(spec.resources)) {
        for (const res of spec.resources) {
            if (!(0, exports.isResource)(res)) {
                return false;
            }
        }
    }
    else {
        return false;
    }
    if (spec.params && Array.isArray(spec.params)) {
        for (const param of spec.params) {
            if (!(0, exports.isParam)(param)) {
                return false;
            }
        }
    }
    else {
        return false;
    }
    if (spec.systemParams && Array.isArray(spec.systemParams)) {
        for (const param of spec.systemParams) {
            if (!(0, exports.isParam)(param)) {
                return false;
            }
        }
    }
    else {
        return !spec.systemParams;
    }
    return true;
};
exports.isExtensionSpec = isExtensionSpec;
