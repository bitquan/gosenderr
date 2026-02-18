import { describe, it, expect } from "vitest";
import { DEFAULT_FEATURE_FLAGS } from "@gosenderr/shared";

describe("DEFAULT_FEATURE_FLAGS", () => {
  it("includes delivery.mapShell default value", () => {
    expect(DEFAULT_FEATURE_FLAGS.delivery).toBeDefined();
    expect(
      Object.prototype.hasOwnProperty.call(
        DEFAULT_FEATURE_FLAGS.delivery,
        "mapShell",
      ),
    ).toBe(true);
<<<<<<< HEAD
    expect(typeof (DEFAULT_FEATURE_FLAGS.delivery as any).mapShell).toBe(
      "boolean",
    );
    expect((DEFAULT_FEATURE_FLAGS.delivery as any).mapShell).toBe(false);
=======

    const mapShell = (DEFAULT_FEATURE_FLAGS.delivery as Record<string, unknown>)
      ?.mapShell;
    expect(typeof mapShell).toBe("boolean");
    expect(mapShell).toBe(false);
>>>>>>> senderr_app
  });
});
