import type {JobStatusCommandResult} from '@gosenderr/contracts';

export type AppErrorCategory =
  | 'permission'
  | 'validation'
  | 'conflict'
  | 'network'
  | 'timeout'
  | 'unknown';

export type AppErrorCode =
  | 'E_PERMISSION_DENIED'
  | 'E_VALIDATION'
  | 'E_CONFLICT'
  | 'E_NETWORK'
  | 'E_TIMEOUT'
  | 'E_UNKNOWN';

export type AppError = {
  category: AppErrorCategory;
  code: AppErrorCode;
  retryable: boolean;
  message: string;
  userMessage: string;
  source: string;
  correlationId?: string;
};

export type ErrorResolutionAction = 'retry' | 'open_settings' | 'refresh' | 'none';

export type ErrorResolution = {
  action: ErrorResolutionAction;
  label: string | null;
  escalationMessage: string | null;
};

type ClassifyOptions = {
  fallbackMessage?: string;
  source?: string;
  correlationId?: string;
};

const DEFAULT_USER_MESSAGE_BY_CODE: Record<AppErrorCode, string> = {
  E_PERMISSION_DENIED: 'Permission denied. Open settings and try again.',
  E_VALIDATION: 'Request is invalid. Please review and retry.',
  E_CONFLICT: 'State changed on server. Refresh and try again.',
  E_NETWORK: 'Network issue detected. Check connection and retry.',
  E_TIMEOUT: 'Request timed out. Please retry.',
  E_UNKNOWN: 'Something went wrong. Please try again.',
};

const asLower = (value: string): string => value.toLowerCase();

const getErrorCode = (error: unknown): string => {
  if (error && typeof error === 'object' && 'code' in error && typeof (error as {code?: unknown}).code === 'string') {
    return (error as {code: string}).code;
  }
  return '';
};

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error && typeof (error as {message?: unknown}).message === 'string') {
    return (error as {message: string}).message;
  }
  return fallbackMessage;
};

const classifyByCodeAndMessage = (code: string, message: string): Omit<AppError, 'message' | 'source' | 'correlationId'> => {
  const normalizedCode = asLower(code);
  const normalizedMessage = asLower(message);

  const isTimeoutCode =
    normalizedCode.includes('deadline-exceeded') ||
    normalizedCode.includes('timeout') ||
    normalizedCode.includes('timed-out');
  const isTimeoutMessage = normalizedMessage.includes('timed out');
  if (isTimeoutCode || isTimeoutMessage) {
    return {
      category: 'timeout',
      code: 'E_TIMEOUT',
      retryable: true,
      userMessage: DEFAULT_USER_MESSAGE_BY_CODE.E_TIMEOUT,
    };
  }

  const isPermissionCode =
    normalizedCode.includes('permission-denied') ||
    normalizedCode.includes('unauthenticated') ||
    normalizedCode.includes('unauthorized');
  const isPermissionMessage =
    normalizedMessage.includes('permission denied') ||
    normalizedMessage.includes('not authorized');
  if (isPermissionCode || isPermissionMessage) {
    return {
      category: 'permission',
      code: 'E_PERMISSION_DENIED',
      retryable: false,
      userMessage: DEFAULT_USER_MESSAGE_BY_CODE.E_PERMISSION_DENIED,
    };
  }

  const isConflictCode =
    normalizedCode.includes('failed-precondition') ||
    normalizedCode.includes('already-exists') ||
    normalizedCode.includes('aborted');
  const isConflictMessage =
    normalizedMessage.includes('cannot change job') ||
    normalizedMessage.includes('state mismatch') ||
    normalizedMessage.includes('conflict');
  if (isConflictCode || isConflictMessage) {
    return {
      category: 'conflict',
      code: 'E_CONFLICT',
      retryable: false,
      userMessage: DEFAULT_USER_MESSAGE_BY_CODE.E_CONFLICT,
    };
  }

  const isValidationCode =
    normalizedCode.includes('invalid-argument') ||
    normalizedCode.includes('out-of-range') ||
    normalizedCode.includes('failed-precondition');
  const isValidationMessage =
    normalizedMessage.includes('invalid') ||
    normalizedMessage.includes('required') ||
    normalizedMessage.includes('missing');
  if (isValidationCode || isValidationMessage) {
    return {
      category: 'validation',
      code: 'E_VALIDATION',
      retryable: false,
      userMessage: DEFAULT_USER_MESSAGE_BY_CODE.E_VALIDATION,
    };
  }

  const isNetworkCode =
    normalizedCode.includes('unavailable') ||
    normalizedCode.includes('network') ||
    normalizedCode.includes('cancelled') ||
    normalizedCode.includes('resource-exhausted');
  const isNetworkMessage =
    normalizedMessage.includes('offline') ||
    normalizedMessage.includes('network') ||
    normalizedMessage.includes('connection failed') ||
    normalizedMessage.includes('failed to fetch');
  if (isNetworkCode || isNetworkMessage) {
    return {
      category: 'network',
      code: 'E_NETWORK',
      retryable: true,
      userMessage: DEFAULT_USER_MESSAGE_BY_CODE.E_NETWORK,
    };
  }

  return {
    category: 'unknown',
    code: 'E_UNKNOWN',
    retryable: false,
    userMessage: DEFAULT_USER_MESSAGE_BY_CODE.E_UNKNOWN,
  };
};

export const classifyUnknownError = (
  error: unknown,
  options: ClassifyOptions = {},
): AppError => {
  const fallbackMessage = options.fallbackMessage ?? 'Unexpected error.';
  const source = options.source ?? 'unknown_source';
  const code = getErrorCode(error);
  const message = getErrorMessage(error, fallbackMessage);
  const classified = classifyByCodeAndMessage(code, message);
  const userMessage =
    classified.code === 'E_UNKNOWN' && message && message !== fallbackMessage
      ? message
      : classified.userMessage;
  return {
    ...classified,
    message,
    userMessage,
    source,
    correlationId: options.correlationId,
  };
};

export const classifyCommandResultError = (
  result: Exclude<JobStatusCommandResult, {kind: 'success'}>,
  options: ClassifyOptions = {},
): AppError => {
  if (result.kind === 'conflict') {
    return {
      category: 'conflict',
      code: 'E_CONFLICT',
      retryable: false,
      message: result.message,
      userMessage: result.message || DEFAULT_USER_MESSAGE_BY_CODE.E_CONFLICT,
      source: options.source ?? 'status_command',
      correlationId: result.correlationId,
    };
  }

  if (result.kind === 'retryable_error') {
    const classified = classifyUnknownError(
      {message: result.message},
      {
        fallbackMessage: 'Temporary sync issue.',
        source: options.source ?? 'status_command',
        correlationId: result.correlationId,
      },
    );
    return {
      ...classified,
      retryable: true,
      userMessage: result.message || classified.userMessage,
    };
  }

  const classified = classifyUnknownError(
    {message: result.message},
    {
      fallbackMessage: 'Unable to complete status command.',
      source: options.source ?? 'status_command',
      correlationId: result.correlationId,
    },
  );
  return {
    ...classified,
    retryable: false,
    userMessage: result.message || classified.userMessage,
  };
};

export const formatErrorContext = (scope: string, appError: AppError): string =>
  `${scope}:${appError.code}:${appError.category}`;

export const getErrorResolution = (appError: AppError): ErrorResolution => {
  if (appError.category === 'permission') {
    return {
      action: 'open_settings',
      label: 'Open Settings',
      escalationMessage: 'Enable the required permission and try again.',
    };
  }

  if (appError.category === 'conflict') {
    return {
      action: 'refresh',
      label: 'Refresh',
      escalationMessage: 'Server state changed. Refresh to continue with latest data.',
    };
  }

  if (appError.retryable) {
    return {
      action: 'retry',
      label: 'Retry',
      escalationMessage: null,
    };
  }

  if (appError.category === 'validation') {
    return {
      action: 'none',
      label: null,
      escalationMessage: 'Review the request details and try again.',
    };
  }

  return {
    action: 'none',
    label: null,
    escalationMessage: 'If this keeps happening, restart the app and contact support.',
  };
};
