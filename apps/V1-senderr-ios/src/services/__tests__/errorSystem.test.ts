import type {JobStatusCommandResult} from '@gosenderr/contracts';

import {
  classifyCommandResultError,
  classifyUnknownError,
  formatErrorContext,
} from '../errorSystem';

describe('errorSystem', () => {
  it('classifies timeout-like unknown errors as retryable timeout', () => {
    const error = new Error('Status update sync timed out after 15000ms');
    const result = classifyUnknownError(error, {
      source: 'map_shell_status_update',
    });

    expect(result.code).toBe('E_TIMEOUT');
    expect(result.category).toBe('timeout');
    expect(result.retryable).toBe(true);
    expect(result.source).toBe('map_shell_status_update');
  });

  it('classifies permission error code to permission category', () => {
    const error = {code: 'functions/permission-denied', message: 'Permission denied'};
    const result = classifyUnknownError(error, {
      source: 'status_update',
    });

    expect(result.code).toBe('E_PERMISSION_DENIED');
    expect(result.category).toBe('permission');
    expect(result.retryable).toBe(false);
  });

  it('maps retryable command result as retryable error', () => {
    const commandResult: JobStatusCommandResult = {
      kind: 'retryable_error',
      job: {
        id: 'job-1',
        customerName: 'Test',
        pickupAddress: 'Pickup',
        dropoffAddress: 'Dropoff',
        etaMinutes: 12,
        status: 'assigned',
        updatedAt: new Date().toISOString(),
      },
      requestedStatus: 'enroute_pickup',
      message: 'Network request failed while updating job.',
      correlationId: 'corr-123',
    };

    const result = classifyCommandResultError(commandResult, {
      source: 'map_shell_status_update',
    });

    expect(result.retryable).toBe(true);
    expect(result.code).toBe('E_NETWORK');
    expect(result.correlationId).toBe('corr-123');
  });

  it('builds a stable analytics context value', () => {
    const appError = classifyUnknownError(new Error('Permission denied'), {
      source: 'map_shell',
    });

    expect(formatErrorContext('map_shell_status_update', appError)).toBe(
      'map_shell_status_update:E_PERMISSION_DENIED:permission',
    );
  });
});
