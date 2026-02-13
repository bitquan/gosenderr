// Integration test skeleton for courier flow scenarios (queued updates, conflicts, preview read-only)
// NOTE: tests are intentionally `test.todo`/skipped here — implementation will follow in the follow-up PR.

describe('courier flow — integration (emulator)', () => {
  test.todo('queued status flush succeeds after offline -> online transition');
  test.todo('concurrent server cancel vs client accept results in conflict resolution UI');
  test.todo('previewing a job does not mutate job status or assignment');
});
