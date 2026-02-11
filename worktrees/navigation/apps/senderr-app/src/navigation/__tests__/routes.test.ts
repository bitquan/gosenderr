import ROUTES from "../routes";

test("routes build job detail path", () => {
  expect(ROUTES.JOB_DETAIL("abc")).toBe("/jobs/abc");
});
