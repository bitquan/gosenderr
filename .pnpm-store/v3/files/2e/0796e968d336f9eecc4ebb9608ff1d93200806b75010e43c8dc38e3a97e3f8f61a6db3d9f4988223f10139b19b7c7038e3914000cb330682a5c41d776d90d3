"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consult = void 0;
const appUtils_1 = require("../../../appUtils");
const fdcExperience_1 = require("../../../gemini/fdcExperience");
const errors_1 = require("../../errors");
const prompt_1 = require("../../prompt");
exports.consult = (0, prompt_1.prompt)("core", {
    name: "consult",
    description: "Use this command to consult the Firebase Assistant with access to detailed up-to-date documentation for the Firebase platform.",
    arguments: [
        {
            name: "prompt",
            description: "a question to pass to the Gemini in Firebase model",
            required: true,
        },
    ],
    annotations: {
        title: "Consult Firebase Assistant",
    },
}, async ({ prompt }, { config, projectId }) => {
    const gifTosError = await (0, errors_1.requireGeminiToS)(projectId);
    if (gifTosError) {
        return [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Missing required conditions to run this prompt:\n\n${gifTosError.content[0]?.text}\n\nPlease ask the user if they would like to accept these terms of service before proceeding. If they decline, inform them that this operation cannot continue without their acceptance.`,
                },
            },
        ];
    }
    const platforms = await (0, appUtils_1.getPlatformsFromFolder)(config.projectDir);
    const gifPrompt = `I am using a coding agent to build with Firebase and I have a specific question that I would like answered. Provide a robust and detailed response that will help the coding agent act on my behalf in a local workspace.

App Platform(s): ${platforms.join(", ")}

Question: ${prompt}`;
    const result = await (0, fdcExperience_1.chatWithFirebase)(gifPrompt, projectId);
    const outputString = result.output.messages?.[0].content ?? "";
    return [
        {
            role: "user",
            content: {
                type: "text",
                text: `I have consulted a Firebase Assistant agent with the following question: "${prompt}". Its response was as follows:\n\n${outputString}\n\nPlease use the information above to respond to my question. I have not seen the response from the Firebase Assistant, so please include all necessary information in your response. Inform the user that they must run the \`firebase:consult\` prompt again if they have followup questions for the Firebase Assistant.`,
            },
        },
    ];
});
