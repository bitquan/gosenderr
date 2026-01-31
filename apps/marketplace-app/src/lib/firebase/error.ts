type FirebaseErrorLike = {
  code?: string;
  message?: string;
  name?: string;
  stack?: string;
  customData?: Record<string, unknown>;
};

const FIREBASE_CODE_PREFIX = "firebase/";

const extractRuleDetails = (message?: string) => {
  if (!message) return null;
  const match = message.match(/evaluation error at (L\d+:\d+).*for '([^']+)' @ (L\d+)/i);
  if (!match) return null;
  return {
    ruleLine: match[1],
    action: match[2],
    ruleLocation: match[3],
  };
};

const isFirebaseError = (error: unknown): error is FirebaseErrorLike => {
  return typeof error === "object" && error !== null && "message" in error;
};

export const logFirebaseError = (error: unknown, context?: string) => {
  if (!isFirebaseError(error)) {
    console.error("Unknown error", error);
    return;
  }

  const message = error.message || "Unknown Firebase error";
  const code = error.code || "unknown";
  const ruleDetails = extractRuleDetails(message);

  console.groupCollapsed(`🔥 Firebase Error${context ? ` (${context})` : ""}`);
  console.error("Message:", message);
  console.error("Code:", code);

  if (ruleDetails) {
    console.error("Rules:", ruleDetails);
  }

  if (error.customData) {
    console.error("Custom Data:", error.customData);
  }

  if (error.stack) {
    console.error("Stack:", error.stack);
  }
  console.groupEnd();
};

export const installFirebaseErrorHandlers = () => {
  if (typeof window === "undefined") return;

  window.addEventListener("unhandledrejection", (event) => {
    logFirebaseError(event.reason, "unhandledrejection");
  });

  window.addEventListener("error", (event) => {
    logFirebaseError(event.error || event.message, "window.error");
  });
};
