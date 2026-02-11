import { navigateToJob } from "../index";

test("navigateToJob does not throw when navigation undefined", () => {
  expect(() => navigateToJob(undefined as any, "job-1")).not.toThrow();
});
