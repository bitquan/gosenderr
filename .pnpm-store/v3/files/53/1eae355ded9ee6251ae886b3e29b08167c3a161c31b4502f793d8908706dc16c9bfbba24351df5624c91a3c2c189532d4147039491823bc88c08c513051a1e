"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NO_PROJECT_ERROR = void 0;
exports.requireGeminiToS = requireGeminiToS;
exports.noProjectDirectory = noProjectDirectory;
exports.mcpAuthError = mcpAuthError;
const util_1 = require("./util");
const ensureApis_1 = require("../dataconnect/ensureApis");
exports.NO_PROJECT_ERROR = (0, util_1.mcpError)("To proceed requires an active project. Use the `firebase_update_environment` tool to set a project ID", "PRECONDITION_FAILED");
const GEMINI_TOS_ERROR = (0, util_1.mcpError)("To proceed requires features from Gemini in Firebase. You can enable the usage of this service and accept its associated terms of service using `firebase_update_environment`.\n" +
    "Learn more about Gemini in Firebase and how it uses your data: https://firebase.google.com/docs/gemini-in-firebase#how-gemini-in-firebase-uses-your-data", "PRECONDITION_FAILED");
async function requireGeminiToS(projectId) {
    if (!projectId) {
        return exports.NO_PROJECT_ERROR;
    }
    if (!(await (0, ensureApis_1.ensureGIFApiTos)(projectId))) {
        return GEMINI_TOS_ERROR;
    }
    return undefined;
}
function noProjectDirectory(projectRoot) {
    return (0, util_1.mcpError)(`The current project directory '${projectRoot || "<NO PROJECT DIRECTORY FOUND>"}' does not exist. Please use the 'update_firebase_environment' tool to target a different project directory.`);
}
function mcpAuthError(skipADC) {
    if (skipADC) {
        return (0, util_1.mcpError)(`The user is not currently logged into the Firebase CLI, which is required to use this tool. Please run the 'firebase_login' tool to log in.`);
    }
    return (0, util_1.mcpError)(`The user is not currently logged into the Firebase CLI, which is required to use this tool. Please run the 'firebase_login' tool to log in, or instruct the user to configure [Application Default Credentials][ADC] on their machine.
[ADC]: https://cloud.google.com/docs/authentication/application-default-credentials`);
}
