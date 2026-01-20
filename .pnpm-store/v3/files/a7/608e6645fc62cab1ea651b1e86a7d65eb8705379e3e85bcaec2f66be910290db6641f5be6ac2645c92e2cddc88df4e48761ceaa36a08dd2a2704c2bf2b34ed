"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate_operation = void 0;
const zod_1 = require("zod");
const tool_1 = require("../../tool");
const util_1 = require("../../util");
const fdcExperience_1 = require("../../../gemini/fdcExperience");
const load_1 = require("../../../dataconnect/load");
exports.generate_operation = (0, tool_1.tool)("dataconnect", {
    name: "generate_operation",
    description: "Use this to generate a single Firebase Data Connect query or mutation based on the currently deployed schema and the provided prompt.",
    inputSchema: zod_1.z.object({
        prompt: zod_1.z
            .string()
            .describe("Write the prompt like you're talking to a person, describe the task you're trying to accomplish and give details that are specific to the users request"),
        service_id: zod_1.z
            .string()
            .optional()
            .describe(`Service ID of the Data Connect service to compile. Used to disambiguate when there are multiple Data Connect services in firebase.json.`),
        location_id: zod_1.z
            .string()
            .optional()
            .describe(`Data Connect Service location ID to disambiguate among multiple Data Connect services.`),
    }),
    annotations: {
        title: "Generate Data Connect Operation",
        readOnlyHint: true,
    },
    _meta: {
        requiresProject: true,
        requiresAuth: true,
        requiresGemini: true,
    },
}, async ({ prompt, service_id, location_id }, { projectId, config }) => {
    const serviceInfo = await (0, load_1.pickOneService)(projectId, config, service_id || undefined, location_id || undefined);
    const schema = await (0, fdcExperience_1.generateOperation)(prompt, serviceInfo.serviceName, projectId);
    return (0, util_1.toContent)(schema);
});
